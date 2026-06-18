<template>
  <article v-if="post" class="post-page">
    <!-- Hero image (full-bleed) -->
    <div v-if="post.featuredImage?.src" class="post-page__hero">
      <img
        :src="post.featuredImage.src"
        :alt="post.featuredImage.alt"
        :width="post.featuredImage.width ?? undefined"
        :height="post.featuredImage.height ?? undefined"
        class="post-page__image"
        loading="eager"
      />
    </div>

    <!-- Content block -->
    <div class="post-page__body">
      <header class="post-page__header">
        <time v-if="post.date" class="post-page__date text-mono">{{ formatDate(post.date) }}</time>
        <h1 class="post-page__title">{{ post.title }}</h1>
      </header>

      <div
        v-if="post.content"
        class="post-page__content"
        v-html="post.content"
      />

      <!-- Taxonomy pills -->
      <div v-if="post.categories?.length || post.tags?.length" class="post-page__terms">
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

      <!-- Dimensions / meta line -->
      <div v-if="post.featuredImage?.width" class="post-page__meta text-mono">
        <span class="post-page__dim">[{{ post.featuredImage.width }}x{{ post.featuredImage.height }}]</span>
        <span class="post-page__file">{{ filename }}</span>
      </div>
    </div>

    <!-- Related one-picture stories -->
    <section v-if="relatedPosts.length" class="post-page__related container">
      <h2 class="post-page__related-heading">One picture stories</h2>
      <div class="projects-grid">
        <PostCard
          v-for="rp in relatedPosts"
          :key="rp.id"
          :post="rp"
        />
      </div>
    </section>
  </article>
</template>

<script setup lang="ts">
const route = useRoute()
const { data: post } = await useFetch<any>(`/api/wp/posts/${route.params.slug}`)

if (!post.value) {
  throw createError({ statusCode: 404, statusMessage: 'Post not found' })
}

// Fetch related posts from the first category (exclude current post)
const firstCatSlug = post.value?.categories?.[0]?.slug || 'feature'
const { data: catData } = await useFetch<any>(`/api/wp/categories/${firstCatSlug}`, {
  query: { per_page: 4 },
})

const relatedPosts = computed(() =>
  (catData.value?.posts ?? [])
    .filter((p: any) => p.id !== post.value?.id && p.featuredImage?.src)
    .slice(0, 3)
)

function formatDate(dateString: string) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const filename = computed(() => {
  const src = post.value?.featuredImage?.src ?? ''
  const parts = src.split('/')
  return parts[parts.length - 1]?.replace(/\.[^.]+$/, '') ?? ''
})

const _title = post.value?.title || 'Post'
const _desc = post.value?.excerpt || _title
const _img = post.value?.featuredImage?.src || ''

useHead({
  title: _title,
  meta: [
    { name: 'description',         content: _desc },
    { property: 'og:title',        content: _title },
    { property: 'og:description',  content: _desc },
    { property: 'og:image',        content: _img },
    { property: 'og:url',          content: `https://madsnorgaard.net/post/${route.params.slug}` },
    { property: 'og:type',         content: 'article' },
    { name: 'twitter:card',        content: 'summary_large_image' },
    { name: 'twitter:title',       content: _title },
    { name: 'twitter:description', content: _desc },
    { name: 'twitter:image',       content: _img },
  ],
})
</script>

<style scoped>
.post-page__hero {
  display: flex;
  justify-content: center;
  background: var(--color-surface);
}

.post-page__image {
  width: 100%;
  max-height: 85vh;
  object-fit: contain;
}

.post-page__body {
  max-width: 640px;
  margin: 0 auto;
  padding: 2rem 1.5rem 2rem;
}

.post-page__header {
  margin-bottom: 1.5rem;
}

.post-page__date {
  font-size: 0.7rem;
  color: var(--color-muted);
  letter-spacing: 0.04em;
  display: block;
  margin-bottom: 0.5rem;
}

.post-page__title {
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 4vw, 2.25rem);
  font-weight: 700;
  line-height: 1.2;
  margin: 0;
}

.post-page__content {
  color: var(--color-muted);
  font-size: 0.95rem;
  line-height: 1.75;
  margin-bottom: 1.5rem;
}

.post-page__content :deep(p) {
  margin: 0 0 1em;
}

.post-page__content :deep(p:last-child) {
  margin-bottom: 0;
}

.post-page__content :deep(a) {
  color: var(--color-accent);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

/* Body images - full-width within the column, consistent with other post types. */
.post-page__content :deep(img) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 2rem auto;
  border-radius: 6px;
}

.post-page__content :deep(figure) {
  margin: 0;
}

.post-page__content :deep(figcaption) {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--color-muted);
  margin-top: 0.6rem;
  text-align: center;
}

/* Legacy WordPress gallery blocks (Gutenberg + Mauer Stills plugin):
   stack items in a single column. The plugin's flex-grid and absolute-
   positioned-image CSS is absent in the headless frontend, so its
   aspect-ratio padding box would otherwise leave empty gaps. */
.post-page__content :deep(.wp-block-gallery),
.post-page__content :deep(.blocks-gallery-grid) {
  display: block;
  list-style: none;
  margin: 0;
  padding: 0;
}

.post-page__content :deep(.blocks-gallery-item) {
  margin: 0;
}

.post-page__content :deep(.mauer-stills-img-box-wrapper),
.post-page__content :deep(.mauer-stills-img-box) {
  padding: 0 !important;
  width: auto !important;
  height: auto !important;
}

.post-page__terms {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 1.5rem;
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

/* Terminal-style metadata line */
.post-page__meta {
  font-size: 0.65rem;
  color: var(--color-muted);
  opacity: 0.5;
  letter-spacing: 0.04em;
  display: flex;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.post-page__dim {
  color: var(--color-border);
}

.post-page__file {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 30ch;
}

/* Related stories section */
.post-page__related {
  padding-top: 2rem;
  padding-bottom: 3rem;
  border-top: 1px solid var(--color-border);
}

.post-page__related-heading {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 1.5rem;
}
</style>
