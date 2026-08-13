<template>
  <img
    v-if="resolved.src"
    :src="resolved.src"
    :srcset="resolved.srcset"
    :sizes="resolved.srcset ? sizes : undefined"
    :alt="alt ?? imageAlt"
    :width="resolved.width"
    :height="resolved.height"
    :loading="eager ? 'eager' : 'lazy'"
    :fetchpriority="eager ? 'high' : undefined"
    decoding="async"
  />
</template>

<script setup lang="ts">
// Renders a WP image from its API `images`/`featuredImage` object with a
// srcset built from the size variants that actually exist for that upload.
// Degrades to a single flat-field src when `variants` is absent (payloads
// cached before the field existed).
import type { PhotoImages, FeaturedImage } from '~/types/photo'
import { buildSrcset, fallbackSrc } from '~/utils/wp-srcset'

const props = withDefaults(
  defineProps<{
    image: PhotoImages | FeaturedImage | null | undefined
    /** Rendered slot width, e.g. "(max-width: 640px) 100vw, 33vw". */
    sizes?: string
    /** Cap srcset candidates (grids: 1024/768); omit for heroes/lightbox. */
    maxWidth?: number
    /** Above-the-fold: eager + fetchpriority=high. */
    eager?: boolean
    alt?: string
  }>(),
  { sizes: '100vw' },
)

const imageAlt = computed(() => (props.image as any)?.alt ?? '')

const resolved = computed(() => {
  const built = buildSrcset((props.image as any)?.variants, props.maxWidth)
  if (built) return built
  const p = props.image as any
  return {
    src: fallbackSrc(props.image, props.maxWidth && props.maxWidth <= 1024 ? 'small' : 'large'),
    srcset: undefined as string | undefined,
    width: p?.width ?? undefined,
    height: p?.height ?? undefined,
  }
})
</script>
