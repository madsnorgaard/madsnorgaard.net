import type { PhotoImages, FeaturedImage, WpImageVariant } from '~/types/photo'

export interface SrcsetAttrs {
  src: string
  srcset?: string
  width?: number
  height?: number
}

/**
 * Build img attributes from WP size variants, optionally capped at maxWidth
 * (grids don't need the original). Always keeps at least the smallest
 * candidate; `src` is the largest allowed one as the no-srcset fallback.
 */
export function buildSrcset(
  variants: WpImageVariant[] | undefined,
  maxWidth?: number,
): SrcsetAttrs | null {
  if (!variants?.length) return null
  let list = maxWidth ? variants.filter((v) => v.width <= maxWidth) : variants
  if (!list.length) list = [variants[0]]
  const largest = list[list.length - 1]
  return {
    src: largest.url,
    srcset: list.length > 1 ? list.map((v) => `${v.url} ${v.width}w`).join(', ') : undefined,
    width: largest.width,
    height: largest.height || undefined,
  }
}

/**
 * Adapter for ResolvedPhoto.images (a Record of WP size name -> file), as
 * produced WP-side by _resolve_photos. Drops cropped sizes (thumbnail,
 * mauer_stills_thumb_*) which would lie about the aspect ratio.
 */
export function variantsFromResolved(
  images: Record<string, { url: string; width: number; height: number }> | undefined,
): WpImageVariant[] {
  if (!images) return []
  return Object.entries(images)
    .filter(([name]) => name !== 'thumbnail' && !name.startsWith('mauer_'))
    .map(([, v]) => v)
    .filter((v) => !!v?.url && v.width > 0)
    .sort((a, b) => a.width - b.width)
    .filter((v, i, arr) => i === 0 || v.width !== arr[i - 1].width)
}

/**
 * Degrade path for API payloads cached before `variants` existed: pick a
 * single flat-field URL. No widths known, so no srcset.
 */
export function fallbackSrc(
  img: PhotoImages | FeaturedImage | null | undefined,
  prefer: 'small' | 'large' = 'small',
): string {
  if (!img) return ''
  const p = img as any
  return prefer === 'small'
    ? (p.medium ?? p.large ?? p.src ?? p.full ?? '')
    : (p.large ?? p.full ?? p.src ?? p.medium ?? '')
}
