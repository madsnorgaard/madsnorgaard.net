import type { PhotoImages, FeaturedImage } from '~/types/photo'
import { buildSrcset } from '~/utils/wp-srcset'

/**
 * Preload the LCP hero image with the same srcset the <img> uses, so the
 * browser starts fetching the right candidate before render.
 */
export function useHeroPreload(
  image: PhotoImages | FeaturedImage | null | undefined,
  sizes = '100vw',
) {
  const built = buildSrcset((image as any)?.variants)
  if (!built?.src) return
  useHead({
    link: [
      {
        rel: 'preload',
        as: 'image',
        href: built.src,
        imagesrcset: built.srcset,
        imagesizes: built.srcset ? sizes : undefined,
        fetchpriority: 'high',
      },
    ],
  })
}
