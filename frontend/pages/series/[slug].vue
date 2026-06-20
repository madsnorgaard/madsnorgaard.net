<template>
  <div v-if="data" class="container" style="padding-top: 4rem;">
    <h1 class="text-display text-display--section" style="margin-bottom: 0.5rem;">{{ data.term.name }}</h1>
    <p v-if="data.term.description" class="text-mono" style="color: var(--color-muted); margin-bottom: 2rem;">
      {{ data.term.description }}
    </p>

    <!-- Stories in this series -->
    <section v-if="data.stories?.length" style="margin-bottom: 3rem;">
      <h2 class="text-mono" style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-muted); margin-bottom: 1rem;">
        Stories
      </h2>
      <div class="stories-list">
        <article v-for="story in data.stories" :key="story.id" class="story-card">
          <NuxtLink :to="`/stories/${story.slug}`" class="story-card__link">
            <div v-if="story.featuredImage?.src" class="story-card__thumb">
              <img :src="story.featuredImage.src" :alt="story.featuredImage.alt" loading="lazy" class="story-card__image" />
            </div>
            <div>
              <h3 class="story-card__title">{{ story.title }}</h3>
              <p class="story-card__excerpt">{{ story.excerpt }}</p>
            </div>
          </NuxtLink>
        </article>
      </div>
    </section>

    <!-- Photos in this series -->
    <section v-if="data.photos?.length">
      <h2 class="text-mono" style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-muted); margin-bottom: 1rem;">
        Photos
      </h2>
      <div class="photo-grid">
        <NuxtLink
          v-for="photo in data.photos"
          :key="photo.id"
          :to="`/archive/${photo.slug}`"
          class="photo-grid__item"
        >
          <img
            v-if="photo.images?.medium || photo.images?.large"
            :src="(photo.images.medium || photo.images.large)!"
            :alt="photo.title"
            loading="lazy"
            class="photo-grid__image"
          />
          <div class="photo-grid__overlay">
            <span v-if="photo.archiveNumber" class="photo-grid__number">{{ photo.archiveNumber }}</span>
            <span class="photo-grid__title">{{ photo.title }}</span>
          </div>
        </NuxtLink>
      </div>
    </section>

    <div style="padding: 2rem 0;">
      <NuxtLink to="/archive" class="text-mono" style="color: var(--color-accent); font-size: 0.85rem;">
        Back to archive
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TaxonomyPageResponse } from '~/types/photo'

const route = useRoute()
const { data } = await useFetch<TaxonomyPageResponse>(`/api/wp/series/${route.params.slug}`)

if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Series not found' })
}

const termName = data.value?.term?.name || 'Series'
const firstImage = computed(() => data.value?.photos?.[0]?.images?.large || data.value?.photos?.[0]?.images?.medium || '')

useHead({
  title: `${termName} | Series`,
  meta: [
    { name: 'description',         content: data.value?.term?.description || `${termName} - documentary photography series` },
    { property: 'og:title',        content: `${termName} | Series` },
    { property: 'og:description',  content: data.value?.term?.description || `Photos and stories from the ${termName} series` },
    { property: 'og:image',        content: firstImage },
    { property: 'og:url',          content: `https://madsnorgaard.net/series/${data.value?.term?.slug}` },
    { property: 'og:type',         content: 'website' },
    { name: 'twitter:card',        content: 'summary_large_image' },
    { name: 'twitter:title',       content: `${termName} | Mads Nørgaard` },
    { name: 'twitter:description', content: data.value?.term?.description || `${termName} series` },
    { name: 'twitter:image',       content: firstImage },
  ],
})
</script>

<style scoped>
.stories-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.story-card__link {
  display: flex;
  gap: 1rem;
  text-decoration: none;
  transition: opacity 150ms;
}

.story-card__link:hover { opacity: 0.85; }

.story-card__thumb {
  flex: 0 0 120px;
  aspect-ratio: 3/2;
  overflow: hidden;
  background: var(--color-surface);
}

.story-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.story-card__title {
  font-family: var(--font-display);
  font-size: 1.125rem;
  margin: 0 0 0.25rem;
}

.story-card__excerpt {
  color: var(--color-muted);
  font-size: 0.85rem;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(200px, 100%), 1fr));
  gap: 0.5rem;
}

.photo-grid__item {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--color-surface);
}

.photo-grid__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 300ms ease;
}

.photo-grid__item:hover .photo-grid__image { transform: scale(1.03); }

.photo-grid__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 0.5rem;
  background: linear-gradient(transparent 50%, rgba(0, 0, 0, 0.7));
  opacity: 0;
  transition: opacity 250ms ease;
}

.photo-grid__item:hover .photo-grid__overlay { opacity: 1; }

.photo-grid__number {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--color-accent);
}

.photo-grid__title {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-text);
}
</style>
