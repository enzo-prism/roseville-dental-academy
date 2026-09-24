// Helpers for routing raw <img> markup (snapshot HTML and server-rendered HTML
// strings that cannot use next/image) through the Next.js image optimizer, so
// mirrored academy photos are served as AVIF/WebP at a width that matches the
// layout instead of multi-megabyte originals.
//
// Every width listed here must exist in `images.deviceSizes` / `images.imageSizes`
// (Next.js defaults) and the quality must be listed in `images.qualities`
// (see next.config.ts), otherwise /_next/image rejects the request with a 400.

export const OPTIMIZED_IMAGE_QUALITY = 75;
export const OPTIMIZED_IMAGE_WIDTHS = [640, 828, 1200, 1920] as const;
export const OPTIMIZED_CARD_IMAGE_WIDTHS = [384, 640, 828, 1200] as const;

const OPTIMIZABLE_LOCAL_IMAGE_PATTERN = /^\/(?:__live|assets)\/[^?#]+\.(?:jpe?g|png|webp)$/i;

export function isOptimizableLocalImage(src: string) {
  return OPTIMIZABLE_LOCAL_IMAGE_PATTERN.test(src);
}

export function optimizedImageUrl(src: string, width: number, quality = OPTIMIZED_IMAGE_QUALITY) {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}

export function optimizedImageSrcSet(
  src: string,
  widths: readonly number[] = OPTIMIZED_IMAGE_WIDTHS,
) {
  return widths.map((width) => `${optimizedImageUrl(src, width)} ${width}w`).join(", ");
}

/**
 * The `src` fallback for browsers without srcset support; mirrors next/image,
 * which points `src` at the largest candidate.
 */
export function optimizedImageFallbackSrc(
  src: string,
  widths: readonly number[] = OPTIMIZED_IMAGE_WIDTHS,
) {
  return optimizedImageUrl(src, widths[widths.length - 1] ?? OPTIMIZED_IMAGE_WIDTHS[0]);
}
