<template>
  <figure v-if="photo" :class="['photo-embed', alignClass]">
    <NuxtLink :to="`/archive/${photo.slug}`" class="photo-embed__link">
      <img
        v-if="imageSrc"
        :src="imageSrc"
        :alt="photo.title"
        :width="imageWidth"
        :height="imageHeight"
        loading="lazy"
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

const imageSrc = computed(() => {
  if (!props.photo?.images) return null
  return props.photo.images.large?.url
    ?? props.photo.images.full?.url
    ?? props.photo.images.medium?.url
    ?? null
})

const imageWidth = computed(() =>
  props.photo?.images?.large?.width ?? props.photo?.images?.full?.width ?? undefined
)

const imageHeight = computed(() =>
  props.photo?.images?.large?.height ?? props.photo?.images?.full?.height ?? undefined
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
