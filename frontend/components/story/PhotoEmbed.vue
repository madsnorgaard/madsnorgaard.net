<template>
  <figure v-if="photo" :class="['photo-embed', alignClass]">
    <NuxtLink :to="`/archive/${photo.slug}`" class="photo-embed__link">
      <img
        v-if="imageAttrs"
        :src="imageAttrs.src"
        :srcset="imageAttrs.srcset"
        :sizes="imageAttrs.srcset ? sizesAttr : undefined"
        :alt="photo.title"
        :width="imageAttrs.width"
        :height="imageAttrs.height"
        loading="lazy"
        decoding="async"
        class="photo-embed__image"
      />
    </NuxtLink>
    <figcaption v-if="showCaption" class="photo-embed__caption">
      <span v-if="photo.archiveNumber" class="photo-embed__number">{{ photo.archiveNumber }}</span>
      {{ photo.title }}
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
import type { ResolvedPhoto } from '~/types/photo'

const props = defineProps<{
  photo: ResolvedPhoto | undefined
  showCaption: boolean
  alignment: string
}>()

const alignClass = computed(() =>
  props.alignment !== 'none' ? `photo-embed--${props.alignment}` : ''
)

const imageAttrs = computed(() =>
  buildSrcset(variantsFromResolved(props.photo?.images), 2048)
)

// Wide/full alignments break out of the 42rem reading column.
const sizesAttr = computed(() =>
  props.alignment === 'wide' || props.alignment === 'full'
    ? '100vw'
    : props.alignment === 'left' || props.alignment === 'right'
      ? '(max-width: 719px) 100vw, 320px'
      : '(max-width: 719px) 100vw, 672px'
)
</script>

<style scoped>
.photo-embed {
  margin: 1.5rem auto;
  max-width: 42rem;
  width: 100%;
}

.photo-embed--wide {
  max-width: 64rem;
}

.photo-embed--full {
  max-width: none;
}

.photo-embed--left,
.photo-embed--right {
  max-width: 20rem;
}

.photo-embed--left {
  float: left;
  margin-right: 2rem;
  margin-bottom: 1rem;
}

.photo-embed--right {
  float: right;
  margin-left: 2rem;
  margin-bottom: 1rem;
}

.photo-embed__link {
  display: block;
}

.photo-embed__image {
  width: 100%;
  height: auto;
  object-fit: contain;
}

.photo-embed__caption {
  margin-top: 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-muted);
}

.photo-embed__number {
  color: var(--color-accent);
  margin-right: 0.5em;
}
</style>
