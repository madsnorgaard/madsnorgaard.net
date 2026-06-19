<template>
  <article v-if="project">
    <div class="container container--reading" style="padding-top: 4rem;">
      <!-- Back link -->
      <NuxtLink to="/archive" class="text-mono text-mono--sm" style="color: var(--color-muted); display: block; margin-bottom: 2rem;">
        ← All archive
      </NuxtLink>

      <!-- Header (matches writing page style) -->
      <header style="margin-bottom: 3rem; border-bottom: 1px solid var(--color-border); padding-bottom: 2rem;">
        <h1
          class="text-display"
          style="font-size: clamp(2rem, 5vw, 3rem); margin-bottom: 1rem;"
        >{{ project.title }}</h1>

        <div class="post-header__meta">
          <time v-if="project.date" class="text-mono text-mono--sm" style="color: var(--color-muted);" :datetime="project.date">
            {{ formatDate(project.date) }}
          </time>
          <span v-if="project.content" class="post-header__reading-time">· {{ readingTime(project.content) }} min read</span>
          <div v-if="project.categories?.length" style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
            <NuxtLink
              v-for="cat in project.categories"
              :key="cat.slug"
              :to="`/archive?cat=${cat.slug}`"
              class="post-tag-link"
            >#{{ cat.name }}</NuxtLink>
          </div>
        </div>
      </header>

      <!-- Funnel into the interactive photo wall -->
      <NuxtLink
        v-if="route.params.slug === 'cold-turkey-cape-town'"
        to="/photographs/cold-turkey-cape-town"
        class="ctct-cta"
      >
        <span class="ctct-cta__label">Enter the photo wall</span>
        <span class="ctct-cta__sub">Thousands of photographs. Find the night you were there.</span>
        <span class="ctct-cta__arrow" aria-hidden="true">→</span>
      </NuxtLink>
    </div>

    <!-- Content blocks: prose, images, and galleries in document order -->
    <ClientOnly>
      <template v-for="(block, i) in parsed.blocks" :key="i">
        <!-- Prose text -->
        <div
          v-if="block.type === 'prose'"
          class="project-detail__prose post-body"
          v-html="block.html"
        />

        <!-- Single inline image (full text-column width) -->
        <figure
          v-else-if="block.type === 'single-image'"
          class="project-detail__single"
          @click="openLightbox(block.imageIndex)"
        >
          <img
            :src="block.image.src"
            :alt="block.image.alt"
            loading="lazy"
            class="project-detail__single-img"
          />
        </figure>

        <!-- Composite (2-3 images in flex row) -->
        <div
          v-else-if="block.type === 'composite'"
          class="project-detail__composite"
        >
          <div
            v-for="(img, j) in block.images"
            :key="j"
            class="composite__item"
            @click="openLightbox(block.startIndex + j)"
          >
            <img :src="img.src" :alt="img.alt" loading="lazy" class="composite__image" />
          </div>
        </div>

        <!-- Gallery grid (4+ images, full-bleed) -->
        <div
          v-else-if="block.type === 'gallery'"
          class="project-detail__gallery"
        >
          <div
            v-for="(img, j) in block.images"
            :key="j"
            class="gallery__item"
            @click="openLightbox(block.startIndex + j)"
          >
            <img :src="img.src" :alt="img.alt" loading="lazy" class="gallery__image" />
          </div>
        </div>
      </template>
    </ClientOnly>

    <div class="container container--reading" style="padding: 3rem 1rem 4rem;">
      <NuxtLink to="/archive" class="text-mono text-mono--sm" style="color: var(--color-muted);">
        ← All archive
      </NuxtLink>
    </div>

    <!-- Lightbox overlay (shared component) -->
    <PhotoLightbox
      :images="parsed.allImages"
      v-model:index="lightbox.index"
      v-model:active="lightbox.active"
    />
  </article>
</template>

<script setup lang="ts">
import { formatDate, readingTime } from '~/composables/useContentMeta'

const route = useRoute()
const { data: project } = await useFetch<any>(`/api/wp/projects/${route.params.slug}`)

if (!project.value) {
  throw createError({ statusCode: 404, statusMessage: 'Project not found' })
}

// ─── Content types ──────────────────────────────────────────────

interface GalleryImage {
  src: string
  alt: string
  width: string
  height: string
}

type ContentBlock =
  | { type: 'prose'; html: string }
  | { type: 'single-image'; image: GalleryImage; imageIndex: number }
  | { type: 'composite'; images: GalleryImage[]; startIndex: number }
  | { type: 'gallery'; images: GalleryImage[]; startIndex: number }

// ─── Parse content into ordered blocks ──────────────────────────

const parsed = computed<{ blocks: ContentBlock[]; allImages: GalleryImage[] }>(() => {
  if (!project.value?.content || !import.meta.client) {
    return { blocks: [], allImages: [] }
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(project.value.content, 'text/html')
  const blocks: ContentBlock[] = []
  const allImages: GalleryImage[] = []
  let proseBuffer = ''

  function flushProse() {
    if (proseBuffer.trim()) {
      blocks.push({ type: 'prose', html: proseBuffer })
      proseBuffer = ''
    }
  }

  function extractImages(container: Element): GalleryImage[] {
    const imgs: GalleryImage[] = []
    container.querySelectorAll('img').forEach(img => {
      const imgSrc = img.getAttribute('src') || ''
      if (!imgSrc) return
      const link = img.closest('a')
      const linkHref = link?.getAttribute('href') || ''
      const isImageUrl = /\.(jpe?g|png|gif|webp)(\?.*)?$/i.test(linkHref)
      const src = isImageUrl ? linkHref : imgSrc
      const size = link?.getAttribute('data-size') || ''
      const [w, h] = size ? size.split('x') : ['', '']
      imgs.push({ src, alt: img.getAttribute('alt') || '', width: w || '', height: h || '' })
    })
    return imgs
  }

  const proseTags = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'UL', 'OL', 'BLOCKQUOTE'])

  for (const node of Array.from(doc.body.children)) {
    const el = node as Element
    const isFigure = el.tagName === 'FIGURE'
    const isWpImage = isFigure && el.classList.contains('wp-block-image')
    const isWpGallery = isFigure && el.classList.contains('wp-block-gallery')

    if (isWpImage || isWpGallery) {
      flushProse()
      const images = extractImages(el)
      if (images.length === 0) continue
      const startIndex = allImages.length
      allImages.push(...images)

      if (images.length === 1) {
        blocks.push({ type: 'single-image', image: images[0], imageIndex: startIndex })
      } else if (images.length <= 3) {
        blocks.push({ type: 'composite', images, startIndex })
      } else {
        blocks.push({ type: 'gallery', images, startIndex })
      }
    } else if (proseTags.has(el.tagName)) {
      const text = el.textContent?.trim()
      if (text) proseBuffer += el.outerHTML
    } else {
      const innerImages = extractImages(el)
      if (innerImages.length > 0) {
        flushProse()
        const startIndex = allImages.length
        allImages.push(...innerImages)
        if (innerImages.length === 1) {
          blocks.push({ type: 'single-image', image: innerImages[0], imageIndex: startIndex })
        } else if (innerImages.length <= 3) {
          blocks.push({ type: 'composite', images: innerImages, startIndex })
        } else {
          blocks.push({ type: 'gallery', images: innerImages, startIndex })
        }
      } else {
        const text = el.textContent?.trim()
        if (text) proseBuffer += el.outerHTML
      }
    }
  }

  flushProse()
  return { blocks, allImages }
})

// ─── Lightbox ───────────────────────────────────────────────────
// Nav, keyboard handling and scroll-lock live in <PhotoLightbox>.

const lightbox = reactive({
  active: false,
  index: 0,
})

function openLightbox(index: number) {
  lightbox.index = index
  lightbox.active = true
}

// ─── SEO ────────────────────────────────────────────────────────

const _title = project.value?.title || 'Archive'
const _desc = project.value?.excerpt || `${_title} - documentary photography collection`
const _img = project.value?.featuredImage?.src || ''

useHead({
  title: `${_title} | Archive`,
  meta: [
    { name: 'description',         content: _desc },
    { property: 'og:title',        content: _title },
    { property: 'og:description',  content: _desc },
    { property: 'og:image',        content: _img },
    { property: 'og:url',          content: `https://madsnorgaard.net/proj/${route.params.slug}` },
    { property: 'og:type',         content: 'article' },
    { name: 'twitter:card',        content: 'summary_large_image' },
    { name: 'twitter:title',       content: _title },
    { name: 'twitter:description', content: _desc },
    { name: 'twitter:image',       content: _img },
  ],
})
</script>

<style scoped>
/* ─── Cold Turkey: funnel CTA into the photo wall ───────────── */

.ctct-cta {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  padding: 1.25rem 1.5rem;
  border: 1px solid var(--color-accent);
  background: var(--color-accent-dim);
  text-decoration: none;
  transition: background 160ms ease;
}
.ctct-cta:hover { background: rgba(208, 36, 62, 0.22); }

.ctct-cta__label {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-accent);
}
.ctct-cta__sub {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-muted);
}
.ctct-cta__arrow {
  margin-left: auto;
  color: var(--color-accent);
  font-size: 1.2rem;
}

@media (max-width: 560px) {
  .ctct-cta { flex-wrap: wrap; gap: 0.35rem; }
  .ctct-cta__arrow { margin-left: 0; }
}

/* ─── Prose (reading width, matches writing page) ───────────── */

.project-detail__prose {
  max-width: 42rem;
  margin: 0 auto;
  padding: 0 1rem 1.5rem;
  font-size: 1.0625rem;
  line-height: 1.75;
  color: var(--color-muted);
}

.project-detail__prose :deep(h2) {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin-top: 2.5rem;
  margin-bottom: 0.75rem;
}

.project-detail__prose :deep(h3) {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text);
  margin-top: 2rem;
  margin-bottom: 0.5rem;
}

.project-detail__prose :deep(p) {
  margin-bottom: 1.5rem;
}

.project-detail__prose :deep(p:last-child) {
  margin-bottom: 0;
}

.project-detail__prose :deep(a) {
  color: var(--color-accent);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.project-detail__prose :deep(ul),
.project-detail__prose :deep(ol) {
  padding-left: 1.5em;
  margin: 0 0 1em;
}

.project-detail__prose :deep(blockquote) {
  border-left: 3px solid var(--color-accent);
  padding-left: 1.5rem;
  margin-left: 0;
  color: var(--color-muted);
  font-style: italic;
}

/* ─── Single inline image (text-column width) ────────────────── */

.project-detail__single {
  max-width: 42rem;
  margin: 1rem auto 2rem;
  padding: 0 1rem;
  cursor: pointer;
}

.project-detail__single-img {
  width: 100%;
  height: auto;
  object-fit: contain;
  display: block;
  transition: filter 250ms ease;
}

.project-detail__single:hover .project-detail__single-img {
  filter: brightness(1.08);
}

/* ─── Composite (2-3 images, flex row at text width) ─────────── */

.project-detail__composite {
  max-width: 42rem;
  margin: 1rem auto 2rem;
  padding: 0 1rem;
  display: flex;
  gap: 3px;
}

.composite__item {
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
  cursor: pointer;
  aspect-ratio: 3 / 2;
  background: var(--color-surface);
}

.composite__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 400ms ease, filter 250ms ease;
}

.composite__item:hover .composite__image {
  transform: scale(1.04);
  filter: brightness(1.12);
}

/* ─── Gallery (full-bleed grid, 4+ images) ───────────────────── */

.project-detail__gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3px;
  padding: 0;
  width: 100%;
  margin-top: 2rem;
}

@media (max-width: 768px) {
  .project-detail__gallery {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .project-detail__gallery {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}

.gallery__item {
  position: relative;
  overflow: hidden;
  cursor: pointer;
  background: var(--color-surface);
}

.gallery__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 400ms ease, filter 250ms ease;
}

.gallery__item:hover .gallery__image {
  transform: scale(1.04);
  filter: brightness(1.12);
}

@media (max-width: 640px) {
  .project-detail__single,
  .project-detail__composite {
    padding: 0 0.75rem;
  }
}
</style>
