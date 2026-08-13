import type { PhotoImages, FeaturedImage, WpImageVariant } from '~/types/photo'

/**
 * Proportional (uncropped) WP sizes, ascending. `thumbnail` (150x150 crop) and
 * the custom mauer_stills_thumb_* sizes are crops — never valid srcset
 * candidates for the original aspect ratio.
 */
const SRCSET_SIZES = ['medium', 'medium_large', 'large', '1536x1536', '2048x2048']

/**
 * Build the list of renderable variants from whatever sizes actually exist on
 * this media item (2018-era uploads lack 1536/2048), ending with the original.
 */
export function extractVariants(media: any): WpImageVariant[] {
  const details = media?.media_details ?? {}
  const sizes = details.sizes ?? {}
  const out: WpImageVariant[] = []
  for (const name of SRCSET_SIZES) {
    const s = sizes[name]
    if (s?.source_url && Number(s.width) > 0) {
      out.push({ url: s.source_url, width: Number(s.width), height: Number(s.height) || 0 })
    }
  }
  if (media?.source_url && Number(details.width) > 0) {
    out.push({ url: media.source_url, width: Number(details.width), height: Number(details.height) || 0 })
  }
  out.sort((a, b) => a.width - b.width)
  // The original can share a width with the largest named size on small uploads.
  return out.filter((v, i) => i === 0 || v.width !== out[i - 1].width)
}

/** Canonical `images` object for photo/event endpoints. */
export function extractWpImages(media: any): PhotoImages | null {
  if (!media) return null
  const sizes = media.media_details?.sizes ?? {}
  return {
    thumbnail: sizes.thumbnail?.source_url ?? null,
    medium: sizes.medium?.source_url ?? sizes.medium_large?.source_url ?? null,
    large: sizes.large?.source_url ?? null,
    full: media.source_url ?? null,
    width: media.media_details?.width ?? null,
    height: media.media_details?.height ?? null,
    alt: media.alt_text || '',
    variants: extractVariants(media),
  }
}

/**
 * Canonical `featuredImage` object for post/story/project endpoints. `src` is a
 * display default (large-first), not the multi-megabyte original; retina reach
 * comes from `variants`.
 */
export function extractFeaturedImage(media: any): FeaturedImage | null {
  if (!media) return null
  const sizes = media.media_details?.sizes ?? {}
  return {
    src: sizes.large?.source_url ?? sizes.medium_large?.source_url ?? media.source_url ?? null,
    alt: media.alt_text || '',
    width: media.media_details?.width ?? null,
    height: media.media_details?.height ?? null,
    variants: extractVariants(media),
  }
}
