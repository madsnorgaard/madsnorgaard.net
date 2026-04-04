<template>
  <div v-if="photo" class="container" style="padding-top: 4rem;">
    <!-- Hero image -->
    <div class="photo-detail__hero">
      <img
        v-if="photo.images?.full || photo.images?.large"
        :src="(photo.images.full || photo.images.large)!"
        :alt="photo.title"
        :width="photo.images?.width ?? undefined"
        :height="photo.images?.height ?? undefined"
        class="photo-detail__image"
        loading="eager"
      />
    </div>

    <!-- Metadata -->
    <div class="photo-detail__meta">
      <div class="photo-detail__header">
        <span v-if="photo.archiveNumber" class="photo-detail__number">{{ photo.archiveNumber }}</span>
        <h1 class="photo-detail__title">{{ photo.title }}</h1>
      </div>

      <dl class="photo-detail__fields">
        <template v-if="photo.location">
          <dt>Location</dt>
          <dd>{{ photo.location }}</dd>
        </template>
        <template v-if="photo.dateTaken">
          <dt>Date</dt>
          <dd>{{ formatDate(photo.dateTaken) }}</dd>
        </template>
        <template v-if="photo.camera">
          <dt>Camera</dt>
          <dd>{{ photo.camera }}</dd>
        </template>
      </dl>

      <p v-if="photo.excerpt" class="photo-detail__excerpt">{{ photo.excerpt }}</p>

      <!-- Taxonomy links -->
      <div v-if="photo.series?.length || photo.subjects?.length" class="photo-detail__tags">
        <NuxtLink
          v-for="s in photo.series"
          :key="s.slug"
          :to="`/series/${s.slug}`"
          class="filter-pill"
        >{{ s.name }}</NuxtLink>
        <NuxtLink
          v-for="s in photo.subjects"
          :key="s.slug"
          :to="`/subject/${s.slug}`"
          class="filter-pill"
        >{{ s.name }}</NuxtLink>
      </div>
    </div>

    <div style="padding: 2rem 0;">
      <NuxtLink to="/archive" class="text-mono" style="color: var(--color-accent); font-size: 0.85rem;">
        Back to archive
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Photo } from '~/types/photo'

const route = useRoute()
const { data: photo } = await useFetch<Photo>(`/api/photo/${route.params.slug}`)

if (!photo.value) {
  throw createError({ statusCode: 404, statusMessage: 'Photo not found' })
}

function formatDate(dateString: string) {
  if (!dateString) return ''
  const d = new Date(dateString)
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
}

const pageTitle = photo.value ? `${photo.value.archiveNumber ?? ''} ${photo.value.title}`.trim() : 'Archive'
const pageDesc = photo.value?.excerpt || `${photo.value?.title} - ${photo.value?.location || 'documentary photography'}`
const pageImage = photo.value?.images?.full || photo.value?.images?.large || ''
const pageUrl = `https://madsnorgaard.net/archive/${route.params.slug}`

useHead({
  title: `${pageTitle} | Archive`,
  meta: [
    { name: 'description',         content: pageDesc },
    { property: 'og:title',        content: pageTitle },
    { property: 'og:description',  content: pageDesc },
    { property: 'og:image',        content: pageImage },
    { property: 'og:url',          content: pageUrl },
    { property: 'og:type',         content: 'article' },
    { name: 'twitter:card',        content: 'summary_large_image' },
    { name: 'twitter:title',       content: pageTitle },
    { name: 'twitter:description', content: pageDesc },
    { name: 'twitter:image',       content: pageImage },
  ],
})
</script>

<style scoped>
.photo-detail__hero {
  margin: 0 -1rem;
}

@media (min-width: 768px) {
  .photo-detail__hero {
    margin: 0;
  }
}

.photo-detail__image {
  width: 100%;
  max-height: 80vh;
  object-fit: contain;
}

.photo-detail__meta {
  max-width: 42rem;
  margin: 2rem auto 0;
}

.photo-detail__header {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.photo-detail__number {
  font-family: var(--font-mono);
  font-size: 1.25rem;
  color: var(--color-accent);
  flex-shrink: 0;
}

.photo-detail__title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
}

.photo-detail__fields {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 1.5rem;
  margin: 0 0 1.5rem;
}

.photo-detail__fields dt {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-muted);
}

.photo-detail__fields dd {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.85rem;
}

.photo-detail__excerpt {
  color: var(--color-muted);
  line-height: 1.6;
  margin: 0 0 1.5rem;
}

.photo-detail__tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filter-pill {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  padding: 0.25em 0.75em;
  border: 1px solid var(--color-border);
  color: var(--color-muted);
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  transition: all 150ms;
}

.filter-pill:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
</style>
