import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

import { loggerService } from '@logger';
import { configManager } from '@main/services/ConfigManager';
import { clearDir, ensureDir, readFile, saveFile } from '@main/utils/file';
import { APP_CACHE_PATH } from '@main/utils/path';
import { IMAGE_CACHE_SCHEME } from '@shared/config/image';
import { LOG_MODULE } from '@shared/config/logger';
import { isHttp } from '@shared/modules/validate';
import { net, protocol } from 'electron';
import fs from 'fs-extra';

const logger = loggerService.withContext(LOG_MODULE.IMAGE_CACHE);

/** Disk cache directory for poster images */
const CACHE_DIR = join(APP_CACHE_PATH, 'poster');
/** Skip images bigger than this, they are not worth a disk cache entry */
const MAX_FILE_SIZE = 10 * 1024 * 1024;
/** Keep the cache bounded: max entries and max age */
const MAX_FILES = 2000;
const MAX_AGE = 60 * 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT = 15 * 1000;
/** Prune the cache every N writes */
const PRUNE_INTERVAL = 200;

interface ICachedImage {
  body: Buffer;
  type: string;
}

class ImageCache {
  private static instance: ImageCache;
  private pending = new Map<string, Promise<ICachedImage | null>>();
  private writeCount = 0;

  constructor() {}

  public static getInstance(): ImageCache {
    if (!ImageCache.instance) {
      ImageCache.instance = new ImageCache();
    }
    return ImageCache.instance;
  }

  /**
   * Must be called before app is ready
   */
  public registerScheme = (): void => {
    protocol.registerSchemesAsPrivileged([
      {
        scheme: IMAGE_CACHE_SCHEME,
        privileges: {
          standard: true,
          secure: true,
          supportFetchAPI: true,
          bypassCSP: true,
          corsEnabled: true,
          stream: true,
        },
      },
    ]);
  };

  /**
   * Must be called after app is ready
   */
  public init = async (): Promise<void> => {
    await ensureDir(CACHE_DIR);

    protocol.handle(IMAGE_CACHE_SCHEME, (request) => this.handle(request.url));

    void this.prune();
  };

  public clear = async (): Promise<void> => {
    this.pending.clear();
    await clearDir(CACHE_DIR);
  };

  private handle = async (requestUrl: string): Promise<Response> => {
    const target = this.parseTarget(requestUrl);
    if (!target) return new Response(null, { status: 400 });

    const cached = (await this.readCache(target)) ?? (await this.download(target));
    if (cached) {
      return new Response(new Uint8Array(cached.body), {
        status: 200,
        headers: {
          'Content-Type': cached.type,
          'Content-Length': String(cached.body.length),
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // cache missed and download failed, fall back to the origin so the image is
    // loaded exactly like before instead of showing a broken poster
    try {
      return Response.redirect(target, 302);
    } catch {
      return new Response(null, { status: 404 });
    }
  };

  private parseTarget = (requestUrl: string): string => {
    try {
      const url = new URL(requestUrl);
      const target = decodeURIComponent(url.pathname.replace(/^\//, ''));
      return isHttp(target) ? target : '';
    } catch {
      return '';
    }
  };

  private hashOf = (target: string): string => createHash('sha256').update(target).digest('hex');

  private readCache = async (target: string): Promise<ICachedImage | null> => {
    const hash = this.hashOf(target);
    const body = await readFile(join(CACHE_DIR, `${hash}.bin`), null);
    if (!body) return null;

    let type = 'image/jpeg';
    const meta = await readFile(join(CACHE_DIR, `${hash}.json`));
    if (meta) {
      try {
        type = JSON.parse(meta).type || type;
      } catch {
        // keep default type for broken meta
      }
    }

    return { body, type };
  };

  private writeCache = async (target: string, body: Buffer, type: string): Promise<void> => {
    try {
      const hash = this.hashOf(target);
      await saveFile(join(CACHE_DIR, `${hash}.bin`), body);
      await saveFile(join(CACHE_DIR, `${hash}.json`), JSON.stringify({ type, size: body.length }));

      this.writeCount += 1;
      if (this.writeCount % PRUNE_INTERVAL === 0) void this.prune();
    } catch (error) {
      logger.warn(`Failed to write image cache: ${target}`, error as Error);
    }
  };

  private download = async (target: string): Promise<ICachedImage | null> => {
    const pending = this.pending.get(target);
    if (pending) return pending;

    const job = this.request(target).finally(() => this.pending.delete(target));
    this.pending.set(target, job);

    return job;
  };

  private request = async (target: string): Promise<ICachedImage | null> => {
    try {
      const resp = await net.fetch(target, {
        headers: {
          'User-Agent': configManager.ua,
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const type = resp.headers.get('content-type')?.split(';')[0].trim() || 'image/jpeg';
      if (!type.startsWith('image/')) throw new Error(`Unexpected content type: ${type}`);

      const body = Buffer.from(await resp.arrayBuffer());
      if (body.length === 0) throw new Error('Empty image body');

      // write in background so the response is not blocked by disk io
      if (body.length <= MAX_FILE_SIZE) void this.writeCache(target, body, type);

      return { body, type };
    } catch (error) {
      logger.warn(`Failed to fetch image: ${target}`, error as Error);
      return null;
    }
  };

  private prune = async (): Promise<void> => {
    try {
      const files = await fs.readdir(CACHE_DIR);
      const entries: { path: string; mtime: number }[] = [];
      const now = Date.now();

      for (const file of files) {
        if (!file.endsWith('.bin')) continue;

        const filePath = join(CACHE_DIR, file);
        const stat = await fs.stat(filePath).catch(() => null);
        if (!stat) continue;

        if (now - stat.mtimeMs > MAX_AGE) {
          await this.remove(filePath);
          continue;
        }

        entries.push({ path: filePath, mtime: stat.mtimeMs });
      }

      if (entries.length <= MAX_FILES) return;

      entries.sort((a, b) => a.mtime - b.mtime);
      for (const entry of entries.slice(0, entries.length - MAX_FILES)) {
        await this.remove(entry.path);
      }
    } catch (error) {
      logger.warn('Failed to prune image cache', error as Error);
    }
  };

  private remove = async (binPath: string): Promise<void> => {
    await fs.remove(binPath);
    await fs.remove(binPath.replace(/\.bin$/, '.json'));
  };
}

export const imageCache = ImageCache.getInstance();
