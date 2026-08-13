<template>
  <div v-if="photos.length" class="photo-sequence">
    <div class="photo-sequence__strip">
      <figure
        v-for="photo in photos"
        :key="photo.id"
        class="photo-sequence__item"
      >
        <NuxtLink :to="`/archive/${photo.slug}`" class="photo-sequence__link">
          <img
            v-if="getImageAttrs(photo)"
            :src="getImageAttrs(photo)!.src"
            :srcset="getImageAttrs(photo)!.srcset"
            :sizes="getImageAttrs(photo)!.srcset ? '(max-width: 500px) 80vw, 400px' : undefined"
            :alt="photo.title"
            :width="getImageAttrs(photo)!.width"
            :height="getImageAttrs(photo)!.height"
            loading="lazy"
            decoding="async"
            class="photo-sequence__image"
          />
        </NuxtLink>
        <figcaption class="photo-sequence__title">
          <span v-if="photo.archiveNumber" class="photo-sequence__number">{{ photo.archiveNumber }}</span>
          {{ photo.title }}
        </figcaption>
      </figure>
    </div>
    <p v-if="caption" class="photo-sequence__caption">{{ caption }}</p>
  </div>
</template>

<script setup lang="ts">
import type { ResolvedPhoto } from '~/types/photo'

const props = defineProps<{
  photoIds: number[]
  resolvedPhotos: Record<number, ResolvedPhoto>
  caption: string
}>()

const photos = computed(() =>
  props.photoIds
    .map(id => props.resolvedPhotos[id])
    .filter((p): p is ResolvedPhoto => !!p)
)

function getImageAttrs(photo: ResolvedPhoto) {
  return buildSrcset(variantsFromResolved(photo.images), 1024)
}
</script>

<style scoped>
.photo-sequence {
  width: 100%;
  max-width: none;
  margin: 2rem 0;
}

.photo-sequence__strip {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 1rem;
}

.photo-sequence__strip::-webkit-scrollbar {
  height: 4px;
}

.photo-sequence__strip::-webkit-scrollbar-track {
  background: var(--color-surface);
}

.photo-sequence__strip::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}

.photo-sequence__item {
  flex: 0 0 auto;
  scroll-snap-align: start;
  width: min(400px, 80vw);
}

.photo-sequence__link {
  display: block;
}

.photo-sequence__image {
  width: 100%;
  height: auto;
  object-fit: contain;
}

.photo-sequence__title {
  margin-top: 0.4rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-muted);
}

.photo-sequence__number {
  color: var(--color-accent);
  margin-right: 0.4em;
}

.photo-sequence__caption {
  margin-top: 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-muted);
  font-style: italic;
}
</style>
