<template>
  <div class="container" style="padding-top: 4rem;">
    <h1 class="text-display text-display--section" style="margin-bottom: 1rem;">Stories</h1>
    <p class="text-mono" style="color: var(--color-muted); margin-bottom: 2rem;">
      Documentary photo essays
    </p>

    <div v-if="data?.stories?.length" class="stories-list">
      <article
        v-for="story in data.stories"
        :key="story.id"
        class="story-card"
      >
        <NuxtLink :to="`/stories/${story.slug}`" class="story-card__link">
          <div v-if="story.featuredImage?.src" class="story-card__image-wrap">
            <img
              :src="story.featuredImage.src"
              :alt="story.featuredImage.alt"
              loading="lazy"
              class="story-card__image"
            />
          </div>
          <div class="story-card__content">
            <h2 class="story-card__title">{{ story.title }}</h2>
            <p class="story-card__excerpt">{{ story.excerpt }}</p>
            <div class="story-card__footer">
              <time v-if="story.date" class="story-card__date text-mono">{{ formatDate(story.date) }}</time>
              <div v-if="story.series?.length" class="story-card__tags">
                <span
                  v-for="s in story.series"
                  :key="s.slug"
                  class="text-mono text-mono--sm"
                  style="color: var(--color-muted);"
                >{{ s.name }}</span>
              </div>
            </div>
          </div>
        </NuxtLink>
      </article>
    </div>
    <p v-else class="text-mono" style="color: var(--color-muted); padding: 3rem 0;">
      No stories published yet.
    </p>

    <!-- Pagination -->
    <div v-if="data && data.totalPages > 1" class="pagination">
      <NuxtLink
        v-if="currentPage > 1"
        :to="{ path: '/stories', query: { page: currentPage - 1 } }"
        class="pagination__link"
      >Previous</NuxtLink>
      <span class="pagination__info text-mono">
        Page {{ currentPage }} of {{ data.totalPages }}
      </span>
      <NuxtLink
        v-if="currentPage < data.totalPages"
        :to="{ path: '/stories', query: { page: currentPage + 1 } }"
        class="pagination__link"
      >Next</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StoryListResponse } from '~/types/photo'

const route = useRoute()
const currentPage = computed(() => Number(route.query.page) || 1)

const { data } = await useFetch<StoryListResponse>('/api/wp/stories/', {
  query: computed(() => ({
    page: currentPage.value,
    per_page: 12,
  })),
})

function formatDate(dateString: string) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

useHead({
  title: 'Stories | Mads Nørgaard',
  meta: [
    { name: 'description', content: 'Documentary photo essays by Mads Nørgaard' },
  ],
})
</script>

<style scoped>
.stories-list {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.story-card__link {
  display: flex;
  gap: 1.5rem;
  text-decoration: none;
  transition: opacity 150ms;
}

.story-card__link:hover {
  opacity: 0.85;
}

.story-card__image-wrap {
  flex: 0 0 200px;
  aspect-ratio: 3/2;
  overflow: hidden;
  background: var(--color-surface);
}

@media (max-width: 640px) {
  .story-card__link {
    flex-direction: column;
  }

  .story-card__image-wrap {
    flex: none;
    width: 100%;
  }
}

.story-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.story-card__content {
  flex: 1;
  min-width: 0;
}

.story-card__title {
  font-family: var(--font-display);
  font-size: 1.375rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  line-height: 1.3;
}

.story-card__excerpt {
  color: var(--color-muted);
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0 0 0.75rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.story-card__footer {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.story-card__date {
  font-size: 0.75rem;
  color: var(--color-muted);
}

.story-card__tags {
  display: flex;
  gap: 0.5rem;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 3rem 0;
}

.pagination__link {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--color-accent);
  text-decoration: none;
  transition: opacity 150ms;
}

.pagination__link:hover {
  opacity: 0.7;
}

.pagination__info {
  font-size: 0.8rem;
  color: var(--color-muted);
}
</style>
