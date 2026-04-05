<template>
  <div v-if="data" class="container" style="padding-top: 4rem;">
    <p class="text-mono" style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-muted); margin-bottom: 0.5rem;">
      Tag
    </p>
    <h1 class="text-display text-display--section" style="margin-bottom: 0.5rem;">{{ data.term.name }}</h1>
    <p v-if="data.term.description" class="text-mono" style="color: var(--color-muted); font-size: 0.85rem; margin-bottom: 2rem;">
      {{ data.term.description }}
    </p>

    <!-- Posts -->
    <section v-if="data.posts?.length" class="posts-list">
      <article v-for="post in data.posts" :key="post.id" class="post-card">
        <div v-if="post.featuredImage?.src" class="post-card__thumb">
          <img :src="post.featuredImage.src" :alt="post.featuredImage.alt" loading="lazy" class="post-card__image" />
        </div>
        <div class="post-card__body">
          <h2 class="post-card__title">{{ post.title }}</h2>
          <time v-if="post.date" class="post-card__date text-mono">{{ formatDate(post.date) }}</time>
          <p v-if="post.excerpt" class="post-card__excerpt">{{ post.excerpt }}</p>
          <div v-if="post.categories?.length || post.tags?.length" class="post-card__terms">
            <NuxtLink
              v-for="cat in post.categories"
              :key="'c' + cat.id"
              :to="`/category/${cat.slug}`"
              class="term-pill"
            >{{ cat.name }}</NuxtLink>
            <NuxtLink
              v-for="tag in post.tags"
              :key="'t' + tag.id"
              :to="`/tag/${tag.slug}`"
              class="term-pill term-pill--tag"
            >{{ tag.name }}</NuxtLink>
          </div>
        </div>
      </article>
    </section>

    <p v-else class="text-mono" style="color: var(--color-muted); font-size: 0.85rem;">
      No posts with this tag.
    </p>

    <div style="padding: 2rem 0;">
      <NuxtLink to="/archive" class="text-mono" style="color: var(--color-accent); font-size: 0.85rem;">
        Back to archive
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { data } = await useFetch<any>(`/api/wp/tags/${route.params.slug}`)

if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Tag not found' })
}

function formatDate(dateString: string) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const termName = data.value?.term?.name || 'Tag'
const firstImage = data.value?.posts?.[0]?.featuredImage?.src || ''

useHead({
  title: `${termName} | Tag`,
  meta: [
    { name: 'description',         content: data.value?.term?.description || `Posts tagged ${termName}` },
    { property: 'og:title',        content: `${termName} | Tag` },
    { property: 'og:description',  content: data.value?.term?.description || `Posts tagged ${termName}` },
    { property: 'og:image',        content: firstImage },
    { property: 'og:url',          content: `https://madsnorgaard.net/tag/${data.value?.term?.slug}` },
    { property: 'og:type',         content: 'website' },
    { name: 'twitter:card',        content: firstImage ? 'summary_large_image' : 'summary' },
    { name: 'twitter:title',       content: `${termName} | Mads Nørgaard` },
    { name: 'twitter:description', content: data.value?.term?.description || `${termName} tag` },
    { name: 'twitter:image',       content: firstImage },
  ],
})
</script>

<style scoped>
.posts-list {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  max-width: 720px;
}

.post-card {
  display: flex;
  gap: 1.25rem;
}

.post-card__thumb {
  flex: 0 0 200px;
  aspect-ratio: 3/2;
  overflow: hidden;
  background: var(--color-surface);
}

.post-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 300ms ease;
}

.post-card:hover .post-card__image {
  transform: scale(1.03);
}

.post-card__body {
  flex: 1;
  min-width: 0;
}

.post-card__title {
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
  line-height: 1.3;
}

.post-card__date {
  font-size: 0.7rem;
  color: var(--color-muted);
  display: block;
  margin-bottom: 0.5rem;
}

.post-card__excerpt {
  color: var(--color-muted);
  font-size: 0.85rem;
  line-height: 1.6;
  margin: 0 0 0.75rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-card__terms {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.term-pill {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  padding: 0.15em 0.5em;
  border: 1px solid var(--color-border);
  color: var(--color-muted);
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  transition: all 150ms;
}

.term-pill:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.term-pill--tag {
  border-style: dashed;
}

@media (max-width: 640px) {
  .post-card {
    flex-direction: column;
    gap: 0.75rem;
  }

  .post-card__thumb {
    flex: none;
    width: 100%;
    aspect-ratio: 16/9;
  }
}
</style>
