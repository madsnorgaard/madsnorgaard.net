<template>
  <div>
    <div class="container container--reading" style="padding-top: 4rem; padding-bottom: 4rem;">
      <!-- Back link -->
      <NuxtLink to="/writing" class="text-mono text-mono--sm" style="color: var(--color-muted); display: block; margin-bottom: 2rem;">
        ← All writing
      </NuxtLink>

      <!-- Post header -->
      <header style="margin-bottom: 3rem; border-bottom: 1px solid var(--color-border); padding-bottom: 2rem;">
        <div v-if="post.series" class="post-header__series">{{ post.series.name }}</div>

        <h1
          class="text-display"
          style="font-size: clamp(2rem, 5vw, 3rem); margin-bottom: 1rem;"
        >{{ post.title }}</h1>

        <div class="post-header__meta">
          <time class="text-mono text-mono--sm" style="color: var(--color-muted);" :datetime="post.date">
            {{ formatDate(post.date) }}
          </time>
          <span class="post-header__reading-time">· {{ readingTime(post.body) }} min read</span>
          <div v-if="post.tags?.length" style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
            <NuxtLink
              v-for="tag in post.tags"
              :key="tag.id"
              :to="`/writing?tag=${tag.slug}`"
              class="post-tag-link"
            >#{{ tag.name }}</NuxtLink>
          </div>
        </div>
      </header>

      <!-- Featured image from Drupal (field_image), breaks out wider than the text -->
      <figure v-if="post.coverImage?.url" class="post-hero">
        <img :src="post.coverImage.url" :alt="post.coverImage.alt || post.title" loading="eager" fetchpriority="high" decoding="async">
      </figure>

      <!-- Video from Drupal (field_video), near the top, breaks out to match the hero -->
      <div v-if="post.videoUrl" class="post-video">
        <VideoEmbed :url="post.videoUrl" :title="post.title" />
      </div>

      <!-- Post body: Drupal provides sanitized HTML -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <article ref="bodyEl" class="post-body" v-html="post.body" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DrupalBlogPost } from '~/types/drupal'
import { formatDate, readingTime } from '~/composables/useContentMeta'
import { youTubeId } from '~/utils/youtube'

const route = useRoute()

const { data: post, error } = await useFetch<DrupalBlogPost>(`/api/drupal/blog/${route.params.slug}`)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Post not found' })
}

// Progressive enhancement: add a copy button to each code block in the
// Drupal-rendered body. Client-side only, so it never affects SSR output.
const bodyEl = ref<HTMLElement | null>(null)

onMounted(() => {
  const root = bodyEl.value
  if (!root) return

  root.querySelectorAll('pre').forEach((pre) => {
    const host = (pre.closest('figure.code') as HTMLElement) || pre
    if (host.querySelector(':scope > .code-copy')) return

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'code-copy'
    btn.textContent = 'Copy'

    btn.addEventListener('click', async () => {
      const code = pre.querySelector('code')
      const text = (code?.textContent ?? pre.textContent ?? '').replace(/\s+$/, '')
      try {
        await navigator.clipboard.writeText(text)
        btn.textContent = 'Copied'
        btn.classList.add('is-copied')
      }
      catch {
        btn.textContent = 'Error'
      }
      setTimeout(() => {
        btn.textContent = 'Copy'
        btn.classList.remove('is-copied')
      }, 1600)
    })

    host.appendChild(btn)
  })
})

useHead(() => ({
  title: `${post.value!.title} | Mads Nørgaard`,
  meta: [
    { name: 'description', content: post.value!.teaser },
    { property: 'og:url',              content: `https://madsnorgaard.net/writing/${route.params.slug}` },
    { property: 'og:title',            content: post.value!.title },
    { property: 'og:description',      content: post.value!.teaser },
    { property: 'og:type',             content: 'article' },
    { property: 'article:published_time', content: post.value!.date },
  ],
}))

// Structured data: Article + breadcrumb, plus a VideoObject when the post has a
// video so it is eligible for Google video rich results. nuxt-schema-org ships
// with @nuxtjs/seo; author is linked to the site-level Person identity.
const videoId = post.value?.videoUrl ? youTubeId(post.value.videoUrl) : null

useSchemaOrg([
  defineArticle({
    headline: post.value!.title,
    description: post.value!.teaser,
    datePublished: post.value!.date,
    dateModified: post.value!.date,
    ...(post.value!.coverImage?.url ? { image: post.value!.coverImage.url } : {}),
  }),
  defineBreadcrumb({
    itemListElement: [
      { name: 'Writing', item: '/writing' },
      { name: post.value!.title },
    ],
  }),
  ...(videoId
    ? [defineVideo({
        name: post.value!.title,
        description: post.value!.teaser,
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
        uploadDate: post.value!.date,
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
      })]
    : []),
])
</script>

<style scoped>
/* Featured image breaks out wider than the 640px reading column */
.post-hero {
  position: relative;
  left: 50%;
  transform: translateX(-50%);
  width: min(1080px, 92vw);
  margin: 0 0 3rem;
}

.post-hero img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

/* Video breaks out to the same width as the featured image */
.post-video {
  position: relative;
  left: 50%;
  transform: translateX(-50%);
  width: min(1080px, 92vw);
  margin: 0 0 3rem;
}

.post-video :deep(.video-embed) {
  margin: 0;
}

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
  text-underline-offset: 2px;
}

.post-body :deep(ul),
.post-body :deep(ol) {
  margin-bottom: 1.5rem;
  padding-left: 1.5rem;
}

.post-body :deep(li) {
  margin-bottom: 0.4rem;
}

.post-body :deep(blockquote) {
  border-left: 3px solid var(--color-accent);
  padding-left: 1.5rem;
  margin-left: 0;
  color: var(--color-muted);
  font-style: italic;
}

/* --- Inline code --- */
.post-body :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.875em;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 0.12em 0.4em;
  border-radius: 4px;
  color: var(--color-text);
}

/* ============================================================
   Wide code blocks: break out of the 640px reading column so
   commands and config are comfortable to read. Centred on the
   viewport via left:50% + translateX(-50%).
   ============================================================ */
.post-body :deep(pre) {
  position: relative;
  left: 50%;
  transform: translateX(-50%);
  width: min(1080px, 92vw);
  margin: 2rem 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.15rem 1.3rem;
  overflow-x: auto;
}

.post-body :deep(pre code) {
  background: none;
  border: 0;
  padding: 0;
  font-size: 0.82rem;
  line-height: 1.65;
  color: var(--color-text);
}

/* Captioned code card: <figure class="code"><figcaption>file</figcaption><pre>… */
.post-body :deep(figure.code) {
  position: relative;
  left: 50%;
  transform: translateX(-50%);
  width: min(1080px, 92vw);
  margin: 2rem 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.post-body :deep(figure.code figcaption) {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-muted);
  padding: 0.6rem 1rem;
  border-bottom: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.02);
}

/* A pre inside a figure must not break out (or restyle) a second time */
.post-body :deep(figure.code pre),
.post-body :deep(figure.diagram pre) {
  position: static;
  left: auto;
  transform: none;
  width: auto;
  margin: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}

/* ASCII diagrams: <figure class="diagram"><pre>… */
.post-body :deep(figure.diagram) {
  position: relative;
  left: 50%;
  transform: translateX(-50%);
  width: min(1080px, 92vw);
  margin: 2rem 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.25rem;
  overflow-x: auto;
}

.post-body :deep(figure.diagram pre) {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--color-muted);
}

/* Copy-to-clipboard button (injected on mount) */
.post-body :deep(.code-copy) {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 2;
  font-family: var(--font-mono);
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
  background: rgba(14, 14, 14, 0.8);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 0.25rem 0.55rem;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.post-body :deep(pre:hover) .code-copy,
.post-body :deep(figure.code:hover) .code-copy,
.post-body :deep(.code-copy:focus-visible) {
  opacity: 1;
}

.post-body :deep(.code-copy:hover) {
  color: var(--color-text);
  border-color: var(--color-muted);
}

.post-body :deep(.code-copy.is-copied) {
  color: var(--color-accent);
  border-color: var(--color-accent);
  opacity: 1;
}

@media (hover: none) {
  .post-body :deep(.code-copy) {
    opacity: 0.7;
  }
}

/* ============================================================
   In-body images and generic figures: break out a little, never
   upscale past their natural size, and centre.
   ============================================================ */
.post-body :deep(figure:not(.code):not(.diagram)) {
  position: relative;
  left: 50%;
  transform: translateX(-50%);
  width: min(900px, 92vw);
  margin: 2.5rem auto;
  text-align: center;
}

.post-body :deep(img) {
  max-width: 100%;
  height: auto;
  margin: 2rem auto;
  border-radius: 6px;
}

.post-body :deep(figure img) {
  margin: 0 auto;
}

.post-body :deep(figure figcaption) {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--color-muted);
  margin-top: 0.6rem;
}

/* Callout / note box */
.post-body :deep(.note) {
  background: var(--color-accent-dim);
  border: 1px solid rgba(208, 36, 62, 0.3);
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin: 2rem 0;
  font-size: 0.97rem;
  color: var(--color-text);
}

.post-body :deep(.note b) {
  color: var(--color-accent);
}

/* Tables (component/version listings) scroll on narrow screens */
.post-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 2rem 0;
  font-size: 0.95rem;
}

.post-body :deep(th),
.post-body :deep(td) {
  text-align: left;
  padding: 0.6rem 0.9rem;
  border-bottom: 1px solid var(--color-border);
}

.post-body :deep(th) {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
}

.post-body :deep(td:first-child) {
  color: var(--color-text);
}
</style>
