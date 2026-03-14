<template>
  <div v-if="photo" class="photo-collision">
    <img
      :src="photo.thumbnail ?? ''"
      :alt="photo.title"
      class="photo-collision__image"
      loading="lazy"
    />
    <div class="photo-collision__caption">
      <span class="photo-collision__number">{{ photo.archiveNumber }}</span>
      <span class="photo-collision__title">{{ photo.title }}</span>
    </div>
    <a href="https://photo.madsnorgaard.net" class="photo-collision__link">
      — photo.madsnorgaard.net →
    </a>
  </div>
</template>

<script setup lang="ts">
const { data: photo } = await useLazyFetch<{
  id: number
  title: string
  archiveNumber: string | null
  url: string
  thumbnail: string | null
} | null>('/api/photo/random')
</script>

<style scoped>
.photo-collision {
  margin: 0;
  padding: 0;
}

.photo-collision__image {
  width: 100%;
  height: auto;
  display: block;
}

.photo-collision__caption {
  margin-top: 0.75rem;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.875rem;
  display: flex;
  gap: 0.75rem;
  align-items: baseline;
}

.photo-collision__number {
  color: var(--color-accent, #C41E3A);
  font-weight: 500;
  flex-shrink: 0;
}

.photo-collision__title {
  color: var(--color-text, #F0EDE6);
}

.photo-collision__link {
  display: block;
  margin-top: 0.4rem;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.8rem;
  color: var(--color-muted, #6B6763);
  text-decoration: none;
  transition: color 150ms;
}

.photo-collision__link:hover {
  color: var(--color-text, #F0EDE6);
}
</style>
