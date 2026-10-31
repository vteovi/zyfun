/**
 * Poster image cache helper.
 *
 * Images are served through the `zyimg://` protocol handled by the main process,
 * which keeps a local disk cache so the same poster is downloaded only once.
 * Non-http(s) sources (local files, data urls, ...) are returned untouched.
 */
import { buildImageCacheUrl } from '@shared/config/image';

export const cacheImageUrl = (src?: string | null): string => {
  if (!src) return '';
  if (!/^https?:\/\//i.test(src)) return src;

  return buildImageCacheUrl(src);
};
