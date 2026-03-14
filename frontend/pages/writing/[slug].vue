<template>
  <div>
    <div v-if="post" class="container container--reading" style="padding-top: 4rem; padding-bottom: 4rem;">
      <!-- Back link -->
      <NuxtLink to="/writing" class="text-mono text-mono--sm" style="color: var(--color-muted); display: block; margin-bottom: 2rem;">
        ← All writing
      </NuxtLink>

      <!-- Post header -->
      <header style="margin-bottom: 3rem; border-bottom: 1px solid var(--color-border); padding-bottom: 2rem;">
        <h1
          class="text-display"
          style="font-size: clamp(2rem, 5vw, 3rem); margin-bottom: 1rem;"
        >{{ post.title }}</h1>

        <div style="display: flex; gap: 1.5rem; align-items: center; flex-wrap: wrap;">
          <time class="text-mono text-mono--sm" style="color: var(--color-muted);" :datetime="post.date">
            {{ formatDate(post.date) }}
          </time>
          <div v-if="post.tags?.length" style="display: flex; gap: 0.4rem;">
            <span
              v-for="tag in post.tags"
              :key="tag.id"
              class="text-mono text-mono--sm"
              style="color: var(--color-muted);"
            >#{{ tag.name }}</span>
          </div>
        </div>
      </header>

      <!-- Post body: Drupal provides sanitized HTML -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="post-body" v-html="post.body" />
    </div>

    <div v-else class="container" style="padding-top: 4rem;">
      <p class="text-mono" style="color: var(--color-muted);">Post not found.</p>
      <NuxtLink to="/writing">← Back to writing</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DrupalBlogPost } from '~/types/drupal'

const route = useRoute()

const { data: post } = await useFetch<DrupalBlogPost>(`/api/drupal/blog/${route.params.slug}`)

function formatDate(dateString: string) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

useHead(() => ({
  title: post.value ? `${post.value.title} | Mads Nørgaard` : 'Writing | Mads Nørgaard',
}))
</script>

<style scoped>
.post-body {
  font-size: 1.0625rem;
  line-height: 1.75;
  color: var(--color-muted);
}

.post-body :deep(h2) {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin-top: 2.5rem;
  margin-bottom: 0.75rem;
}

.post-body :deep(h3) {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text);
  margin-top: 2rem;
  margin-bottom: 0.5rem;
}

.post-body :deep(p) {
  margin-bottom: 1.5rem;
}

.post-body :deep(a) {
  color: var(--color-accent);
  text-decoration: underline;
}

.post-body :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.875em;
  background: var(--color-surface);
  padding: 0.15em 0.4em;
  border-radius: 2px;
}

.post-body :deep(pre) {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 1.25rem;
  overflow-x: auto;
  margin-bottom: 1.5rem;
}

.post-body :deep(pre code) {
  background: none;
  padding: 0;
  font-size: 0.8rem;
}

.post-body :deep(blockquote) {
  border-left: 3px solid var(--color-accent);
  padding-left: 1.5rem;
  margin-left: 0;
  color: var(--color-muted);
  font-style: italic;
}
</style>
