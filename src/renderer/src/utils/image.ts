/**
 * Poster image cache helper.
 *
 * Images are served through the `zyimg://` protocol handled by the main process,
 * which keeps a local disk cache so the same poster is downloaded only once.
 * Non-http(s) sources (local files, data urls, ...) are returned untouched.
 */
import { buildImageCacheUrl } from '@shared/config/image';

/** How many warmed image elements we keep around before starting over */
const PREFETCH_LIMIT = 240;

/** Holding a reference keeps the request alive, the browser drops detached images */
const prefetching = new Map<string, HTMLImageElement>();

export const cacheImageUrl = (src?: string | null): string => {
  if (!src) return '';
  if (!/^https?:\/\//i.test(src)) return src;

  return buildImageCacheUrl(src);
};

/**
 * Warm posters ahead of the scroll position, so they are already on disk (and
 * in the main process memory cache) by the time they enter the viewport.
 */
export const prefetchPosters = (sources: Array<string | null | undefined>, limit = 16): void => {
  let started = 0;

  for (const src of sources) {
    if (started >= limit) break;

    const url = cacheImageUrl(src);
    if (!url || prefetching.has(url)) continue;

    if (prefetching.size >= PREFETCH_LIMIT) prefetching.clear();

    const image = new Image();
    image.decoding = 'async';
    image.onerror = () => prefetching.delete(url);
    image.src = url;

    prefetching.set(url, image);
    started += 1;
  }
};
