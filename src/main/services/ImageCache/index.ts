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
import { nativeImage, net, protocol } from 'electron';
import fs from 'fs-extra';

const logger = loggerService.withContext(LOG_MODULE.IMAGE_CACHE);

/** Disk cache directory for poster images */
const CACHE_DIR = join(APP_CACHE_PATH, 'poster');
/** Skip images bigger than this, they are not worth a disk cache entry */
const MAX_FILE_SIZE = 10 * 1024 * 1024;
/** Keep the cache bounded: max entries and max age */
const MAX_FILES = 2000;
const MAX_AGE = 60 * 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT = 20 * 1000;
/** Prune the cache every N writes */
const PRUNE_INTERVAL = 200;
/** How many images may be downloaded at the same time */
const MAX_CONCURRENCY = 6;
/** Retry a failed download once, the poster CDNs drop connections a lot */
const MAX_ATTEMPTS = 2;
/** Posters are never rendered wider than this, so shrink them before caching */
const STORE_WIDTH = 640;
const STORE_QUALITY = 80;
/** Types that must be stored untouched, resizing would break them */
const RAW_TYPES = new Set(['image/gif', 'image/svg+xml']);
/** Entries above this size were stored by an older version and get re-encoded on read */
const LEGACY_SHRINK_THRESHOLD = 150 * 1024;
/** Hot images kept in memory so repeat visits do not touch the disk at all */
const MAX_MEMORY_ENTRIES = 120;
const MAX_MEMORY_BYTES = 48 * 1024 * 1024;

interface ICachedImage {
  body: Buffer;
  type: string;
}

class ImageCache {
  private static instance: ImageCache;
  private pending = new Map<string, Promise<ICachedImage | null>>();
  private memory = new Map<string, ICachedImage>();
  private memoryBytes = 0;
  private active = 0;
  private waiting: Array<() => void> = [];
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
    this.memory.clear();
    this.memoryBytes = 0;
    await clearDir(CACHE_DIR);
  };

  private handle = async (requestUrl: string): Promise<Response> => {
    const target = this.parseTarget(requestUrl);
    if (!target) return new Response(null, { status: 400 });

    const cached = (await this.readMemory(target)) ?? (await this.readCache(target)) ?? (await this.download(target));
    if (cached) {
      return this.buildResponse(cached);
    }

    // cache missed and download failed, fall back to the origin so the image is
    // loaded exactly like before instead of showing a broken poster
    try {
      return Response.redirect(target, 302);
    } catch {
      return new Response(null, { status: 404 });
    }
  };

  private buildResponse = (cached: ICachedImage): Response => {
    return new Response(new Uint8Array(cached.body), {
      status: 200,
      headers: {
        'Content-Type': cached.type,
        'Content-Length': String(cached.body.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
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

  private readMemory = (target: string): ICachedImage | null => {
    const hit = this.memory.get(target);
    if (!hit) return null;

    // refresh recency
    this.memory.delete(target);
    this.memory.set(target, hit);

    return hit;
  };

  private writeMemory = (target: string, entry: ICachedImage): void => {
    if (entry.body.length > MAX_MEMORY_BYTES) return;

    const previous = this.memory.get(target);
    if (previous) {
      this.memoryBytes -= previous.body.length;
      this.memory.delete(target);
    }

    this.memory.set(target, entry);
    this.memoryBytes += entry.body.length;

    while (this.memory.size > MAX_MEMORY_ENTRIES || this.memoryBytes > MAX_MEMORY_BYTES) {
      const oldest = this.memory.keys().next();
      if (oldest.done) break;

      const dropped = this.memory.get(oldest.value);
      if (dropped) this.memoryBytes -= dropped.body.length;
      this.memory.delete(oldest.value);
    }
  };

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

    const entry: ICachedImage = { body, type };
    this.writeMemory(target, entry);

    // entries written by older versions are full size, shrink them lazily so the
    // user does not pay for a full re-download just to get smaller posters
    if (body.length > LEGACY_SHRINK_THRESHOLD) {
      setTimeout(() => {
        const smaller = this.shrink(body, type);
        if (smaller.body.length < body.length) void this.writeCache(target, smaller);
      }, 0);
    }

    return entry;
  };

  private writeCache = async (target: string, entry: ICachedImage): Promise<void> => {
    this.writeMemory(target, entry);

    if (entry.body.length > MAX_FILE_SIZE) return;

    try {
      const hash = this.hashOf(target);
      await saveFile(join(CACHE_DIR, `${hash}.bin`), entry.body);
      await saveFile(join(CACHE_DIR, `${hash}.json`), JSON.stringify({ type: entry.type, size: entry.body.length }));

      this.writeCount += 1;
      if (this.writeCount % PRUNE_INTERVAL === 0) void this.prune();
    } catch (error) {
      logger.warn(`Failed to write image cache: ${target}`, error as Error);
    }
  };

  private download = async (target: string): Promise<ICachedImage | null> => {
    const pending = this.pending.get(target);
    if (pending) return pending;

    const job = this.enqueue(target)
      .then(async (entry) => {
        if (!entry) return null;

        // re-encode outside the download slot, it is pure cpu work
        const shrunk = this.shrink(entry.body, entry.type);
        await this.writeCache(target, shrunk);

        return shrunk;
      })
      .finally(() => this.pending.delete(target));

    this.pending.set(target, job);

    return job;
  };

  private enqueue = async (target: string): Promise<ICachedImage | null> => {
    await this.acquire();
    try {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const entry = await this.request(target);
        if (entry) return entry;

        if (attempt < MAX_ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
      }
      return null;
    } finally {
      this.release();
    }
  };

  private acquire = (): Promise<void> => {
    if (this.active < MAX_CONCURRENCY) {
      this.active += 1;
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.waiting.push(() => {
        this.active += 1;
        resolve();
      });
    });
  };

  private release = (): void => {
    this.active = Math.max(0, this.active - 1);
    this.waiting.shift()?.();
  };

  /**
   * Shrink the poster before it is cached: the list renders it a few hundred
   * pixels wide, storing the untouched 1MB original only costs disk io and
   * decode time on every later view.
   */
  private shrink = (body: Buffer, type: string): ICachedImage => {
    if (RAW_TYPES.has(type)) return { body, type };

    try {
      const image = nativeImage.createFromBuffer(body);
      if (image.isEmpty()) return { body, type };

      const { width } = image.getSize();
      const resized = width > STORE_WIDTH ? image.resize({ width: STORE_WIDTH, quality: 'good' }) : image;
      const jpeg = resized.toJPEG(STORE_QUALITY);

      // keep the original whenever the re-encode does not actually help
      if (jpeg.length === 0 || jpeg.length >= body.length) return { body, type };

      return { body: jpeg, type: 'image/jpeg' };
    } catch (error) {
      logger.warn(`Failed to shrink image: ${(error as Error).message}`);
      return { body, type };
    }
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

      const raw = Buffer.from(await resp.arrayBuffer());
      if (raw.length === 0) throw new Error('Empty image body');

      return { body: raw, type };
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
