/**
 * Image cache protocol shared between main and renderer.
 * Renderer loads images as `zyimg://image/<encodeURIComponent(origin)>`,
 * the main process serves them from the local disk cache.
 */
export const IMAGE_CACHE_SCHEME = 'zyimg';
export const IMAGE_CACHE_HOST = 'image';

export const buildImageCacheUrl = (src: string): string => {
  return `${IMAGE_CACHE_SCHEME}://${IMAGE_CACHE_HOST}/${encodeURIComponent(src)}`;
};
