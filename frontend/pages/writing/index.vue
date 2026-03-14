<template>
  <div class="container" style="padding-top: 4rem;">
    <h1 class="text-display text-display--section" style="margin-bottom: 3rem;">Writing</h1>

    <!-- Tag filter -->
    <div v-if="allTags.length" style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 2rem;">
      <NuxtLink
        to="/writing"
        class="filter-pill"
        :class="{ 'filter-pill--active': !currentTag }"
      >All</NuxtLink>
      <NuxtLink
        v-for="tag in allTags"
        :key="tag.slug"
        :to="`/writing?tag=${tag.slug}`"
        class="filter-pill"
        :class="{ 'filter-pill--active': currentTag === tag.slug }"
      >{{ tag.name }}</NuxtLink>
    </div>

    <!-- Post list -->
    <div v-if="posts?.posts?.length">
      <article
        v-for="post in posts.posts"
        :key="post.id"
        class="post-card"
      >
        <div>
          <h2 class="post-card__title" style="font-size: 1.375rem;">
            <NuxtLink :to="`/writing/${post.slug}`">{{ post.title }}</NuxtLink>
          </h2>
          <p class="post-card__teaser">{{ post.teaser }}</p>
          <div v-if="post.tags?.length" style="display: flex; gap: 0.4rem; margin-top: 0.5rem; flex-wrap: wrap;">
            <span
              v-for="tag in post.tags"
              :key="tag.id"
              class="text-mono text-mono--sm"
              style="color: var(--color-muted);"
            >#{{ tag.name }}</span>
          </div>
        </div>
        <time class="post-card__date" :datetime="post.date">
          {{ formatDate(post.date) }}
        </time>
      </article>
    </div>
    <p v-else class="text-mono" style="color: var(--color-muted); padding: 3rem 0;">
      No posts yet.
    </p>
  </div>
</template>

<script setup lang="ts">
import type { DrupalBlogPost, DrupalTag } from '~/types/drupal'

const route = useRoute()
const currentTag = computed(() => route.query.tag as string | undefined)

const { data: posts } = await useFetch<{ posts: DrupalBlogPost[]; total: number }>('/api/drupal/blog', {
  query: computed(() => ({
    page: 1,
    limit: 20,
    ...(currentTag.value ? { tag: currentTag.value } : {}),
  })),
})

// Collect unique tags from fetched posts
const allTags = computed<DrupalTag[]>(() => {
  const map = new Map<string, DrupalTag>()
  posts.value?.posts?.forEach((p) =>
    p.tags?.forEach((t) => map.set(t.id, t))
  )
  return [...map.values()]
})

function formatDate(dateString: string) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

useHead({ title: 'Writing | Mads Nørgaard' })
</script>

<style scoped>
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

.filter-pill:hover,
.filter-pill--active {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
</style>
