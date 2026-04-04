<template>
  <article v-if="story" class="story-page">
    <!-- Hero -->
    <header class="story-page__header container">
      <h1 class="story-page__title">{{ story.title }}</h1>
      <div class="story-page__meta">
        <time v-if="story.date" class="text-mono">{{ formatDate(story.date) }}</time>
        <template v-if="story.series?.length">
          <span class="story-page__sep">/</span>
          <NuxtLink
            v-for="s in story.series"
            :key="s.slug"
            :to="`/series/${s.slug}`"
            class="text-mono story-page__tag"
          >{{ s.name }}</NuxtLink>
        </template>
      </div>
    </header>

    <!-- Featured image (full-bleed) -->
    <div v-if="story.featuredImage?.src" class="story-page__featured">
      <img
        :src="story.featuredImage.src"
        :alt="story.featuredImage.alt"
        :width="story.featuredImage.width ?? undefined"
        :height="story.featuredImage.height ?? undefined"
        class="story-page__featured-image"
        loading="eager"
      />
    </div>

    <!-- Block content -->
    <div class="story-page__body container--reading">
      <StoryStoryBlockRenderer
        v-if="story.blocks?.length"
        :blocks="story.blocks"
        :resolved-photos="story.resolvedPhotos"
      />
      <!-- Fallback: rendered HTML if no structured blocks -->
      <div v-else-if="story.contentRendered" v-html="story.contentRendered" />
    </div>

    <!-- Footer with taxonomy links -->
    <footer class="story-page__footer container--reading">
      <div v-if="story.subjects?.length" class="story-page__subjects">
        <span class="text-mono" style="color: var(--color-muted); font-size: 0.75rem; text-transform: uppercase;">Subjects:</span>
        <NuxtLink
          v-for="s in story.subjects"
          :key="s.slug"
          :to="`/subject/${s.slug}`"
          class="filter-pill"
        >{{ s.name }}</NuxtLink>
      </div>

      <div style="padding-top: 2rem;">
        <NuxtLink to="/stories" class="text-mono" style="color: var(--color-accent); font-size: 0.85rem;">
          Back to stories
        </NuxtLink>
      </div>
    </footer>
  </article>
</template>

<script setup lang="ts">
import type { Story } from '~/types/photo'

const route = useRoute()
const { data: story } = await useFetch<Story>(`/api/wp/stories/${route.params.slug}`)

if (!story.value) {
  throw createError({ statusCode: 404, statusMessage: 'Story not found' })
}

function formatDate(dateString: string) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const pageTitle = story.value?.title || 'Stories'
const pageDesc = story.value?.excerpt || `${pageTitle} - a documentary photo essay`
const pageImage = story.value?.featuredImage?.src || ''
const pageUrl = `https://madsnorgaard.net/stories/${route.params.slug}`

useHead({ title: `${pageTitle} | Stories` })
useSeoMeta({
  description: pageDesc,
  ogTitle: pageTitle,
  ogDescription: pageDesc,
  ogImage: pageImage,
  ogUrl: pageUrl,
  ogType: 'article',
  twitterCard: 'summary_large_image',
  twitterTitle: pageTitle,
  twitterDescription: pageDesc,
  twitterImage: pageImage,
})
</script>

<style scoped>
.story-page__header {
  padding-top: 4rem;
  padding-bottom: 2rem;
  text-align: center;
}

.story-page__title {
  font-family: var(--font-display);
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 700;
  line-height: 1.15;
  margin: 0 0 1rem;
}

.story-page__meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-muted);
}

.story-page__sep {
  color: var(--color-border);
}

.story-page__tag {
  color: var(--color-accent);
  text-decoration: none;
}

.story-page__tag:hover {
  opacity: 0.7;
}

.story-page__featured {
  margin: 0 0 3rem;
}

.story-page__featured-image {
  width: 100%;
  max-height: 75vh;
  object-fit: contain;
}

.story-page__body {
  padding-bottom: 3rem;
}

.story-page__footer {
  padding-bottom: 4rem;
  border-top: 1px solid var(--color-border);
  padding-top: 2rem;
}

.story-page__subjects {
  display: flex;
  align-items: center;
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

/* Reading-width container for prose content */
:global(.container--reading) {
  max-width: 42rem;
  margin-left: auto;
  margin-right: auto;
  padding-left: 1rem;
  padding-right: 1rem;
}
</style>
