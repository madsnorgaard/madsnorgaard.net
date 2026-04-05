<template>
  <article v-if="project">
    <!-- Header -->
    <header class="project-detail__header container">
      <div v-if="project.categories?.length" class="project-detail__cats">
        <span
          v-for="cat in project.categories"
          :key="cat.slug"
          class="filter-pill"
        >{{ cat.name }}</span>
      </div>
      <h1 class="project-detail__title">{{ project.title }}</h1>
    </header>

    <!-- Content blocks: prose, images, and galleries in document order -->
    <ClientOnly>
      <template v-for="(block, i) in parsed.blocks" :key="i">
        <!-- Prose text -->
        <div
          v-if="block.type === 'prose'"
          class="project-detail__prose"
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

    <div class="container" style="padding: 2rem 1.5rem;">
      <NuxtLink to="/archive" class="text-mono" style="color: var(--color-accent); font-size: 0.85rem;">
        &lt;- back to archive
      </NuxtLink>
    </div>

    <!-- Lightbox overlay (navigates ALL images) -->
    <Teleport to="body">
      <Transition name="lightbox">
        <div
          v-if="lightbox.active"
          class="lightbox"
          @click="closeLightbox"
          @keydown.escape="closeLightbox"
          tabindex="0"
          ref="lightboxEl"
        >
          <!-- Scanline noise -->
          <div class="lightbox__noise" />

          <!-- Navigation -->
          <button
            v-if="parsed.allImages.length > 1"
            class="lightbox__nav lightbox__nav--prev"
            @click.stop="prevImage"
            aria-label="Previous image"
          >&lt;</button>
          <button
            v-if="parsed.allImages.length > 1"
            class="lightbox__nav lightbox__nav--next"
            @click.stop="nextImage"
            aria-label="Next image"
          >&gt;</button>

          <!-- Image -->
          <div class="lightbox__frame" @click.stop>
            <img
              :src="parsed.allImages[lightbox.index]?.src ?? ''"
              :alt="parsed.allImages[lightbox.index]?.alt ?? ''"
              class="lightbox__image"
              @click.stop="nextImage"
            />
            <!-- HUD bar -->
            <div class="lightbox__hud">
              <span class="lightbox__counter">
                <span class="lightbox__counter-current">{{ String(lightbox.index + 1).padStart(2, '0') }}</span>
                <span class="lightbox__counter-sep">/</span>
                <span class="lightbox__counter-total">{{ String(parsed.allImages.length).padStart(2, '0') }}</span>
              </span>
              <span v-if="currentDimensions" class="lightbox__dimensions">{{ currentDimensions }}</span>
              <span class="lightbox__filename">{{ currentFilename }}</span>
            </div>
          </div>

          <!-- Close -->
          <button class="lightbox__close" @click.stop="closeLightbox" aria-label="Close">
            <span class="lightbox__close-key">esc</span>
          </button>
        </div>
      </Transition>
    </Teleport>
  </article>
</template>

<script setup lang="ts">
const route = useRoute()
const { data: project } = await useFetch<any>(`/api/wp/projects/${route.params.slug}`)

if (!project.value) {
  throw createError({ statusCode: 404, statusMessage: 'Project not found' })
}

const lightboxEl = ref<HTMLElement | null>(null)

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
      // Other elements (divs, sections, etc.) - check for images
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
        // Treat as prose
        const text = el.textContent?.trim()
        if (text) proseBuffer += el.outerHTML
      }
    }
  }

  flushProse()
  return { blocks, allImages }
})

// ─── Lightbox ───────────────────────────────────────────────────

const lightbox = reactive({
  active: false,
  index: 0,
})

const currentFilename = computed(() => {
  const src = parsed.value.allImages[lightbox.index]?.src ?? ''
  const parts = src.split('/')
  return parts[parts.length - 1]?.replace(/\.[^.]+$/, '') ?? ''
})

const currentDimensions = computed(() => {
  const img = parsed.value.allImages[lightbox.index]
  if (!img?.width || !img?.height) return ''
  return `${img.width}x${img.height}`
})

function openLightbox(index: number) {
  lightbox.index = index
  lightbox.active = true
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
  document.body.style.position = 'fixed'
  document.body.style.width = '100%'
  document.body.style.top = `-${window.scrollY}px`
  nextTick(() => lightboxEl.value?.focus())
}

function closeLightbox() {
  const scrollY = document.body.style.top
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
  document.body.style.position = ''
  document.body.style.width = ''
  document.body.style.top = ''
  window.scrollTo(0, parseInt(scrollY || '0') * -1)
  lightbox.active = false
}

function nextImage() {
  if (parsed.value.allImages.length <= 1) return
  lightbox.index = (lightbox.index + 1) % parsed.value.allImages.length
}

function prevImage() {
  if (parsed.value.allImages.length <= 1) return
  lightbox.index = (lightbox.index - 1 + parsed.value.allImages.length) % parsed.value.allImages.length
}

function onKeydown(e: KeyboardEvent) {
  if (!lightbox.active) return
  if (e.key === 'Escape') closeLightbox()
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextImage() }
  if (e.key === 'ArrowLeft') { e.preventDefault(); prevImage() }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

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
/* ─── Header ─────────────────────────────────────────────────── */

.project-detail__header {
  padding-top: 3rem;
  padding-bottom: 1.5rem;
}

.project-detail__title {
  font-family: var(--font-display);
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 700;
  margin: 0;
  line-height: 1.15;
}

.project-detail__cats {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.filter-pill {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  padding: 0.2em 0.6em;
  border: 1px solid var(--color-border);
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* ─── Prose ──────────────────────────────────────────────────── */

.project-detail__prose {
  max-width: 640px;
  margin: 0 auto;
  padding: 0 1.5rem 1.5rem;
  line-height: 1.75;
  color: var(--color-muted);
  font-size: 0.95rem;
}

.project-detail__prose :deep(p) {
  margin: 0 0 1em;
}

.project-detail__prose :deep(p:last-child) {
  margin-bottom: 0;
}

.project-detail__prose :deep(h2),
.project-detail__prose :deep(h3),
.project-detail__prose :deep(h4) {
  font-family: var(--font-display);
  color: var(--color-text);
  margin-top: 1.5em;
  margin-bottom: 0.5em;
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

/* ─── Single inline image (text-column width) ────────────────── */

.project-detail__single {
  max-width: 640px;
  margin: 1rem auto 2rem;
  padding: 0 1.5rem;
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
  max-width: 640px;
  margin: 1rem auto 2rem;
  padding: 0 1.5rem;
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

/* ─── Lightbox ───────────────────────────────────────────────── */

.lightbox {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(8, 8, 8, 0.98);
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  overscroll-behavior: contain;
  overflow: hidden;
  touch-action: none;
}

/* CRT scanline texture */
.lightbox__noise {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(255, 255, 255, 0.008) 2px,
    rgba(255, 255, 255, 0.008) 4px
  );
  z-index: 1;
}

.lightbox__frame {
  position: relative;
  max-width: 92vw;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 2;
}

.lightbox__image {
  max-width: 92vw;
  max-height: 82vh;
  object-fit: contain;
  cursor: pointer;
  user-select: none;
  animation: lightbox-in 250ms ease-out;
}

@keyframes lightbox-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
}

/* Terminal-style HUD bar */
.lightbox__hud {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.625rem 0;
  margin-top: 0.75rem;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--color-muted);
  letter-spacing: 0.04em;
  width: 100%;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.lightbox__counter {
  color: var(--color-text);
}

.lightbox__counter-current {
  color: var(--color-accent);
}

.lightbox__counter-sep {
  color: var(--color-border);
  margin: 0 0.15em;
}

.lightbox__counter-total {
  color: var(--color-muted);
}

.lightbox__dimensions {
  color: var(--color-muted);
}

.lightbox__dimensions::before {
  content: '[';
  color: var(--color-border);
}

.lightbox__dimensions::after {
  content: ']';
  color: var(--color-border);
}

.lightbox__filename {
  color: var(--color-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 30ch;
  opacity: 0.5;
}

/* Navigation arrows */
.lightbox__nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 3;
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: 1.25rem;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 150ms;
}

.lightbox__nav:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-accent-dim);
}

.lightbox__nav--prev {
  left: 1rem;
}

.lightbox__nav--next {
  right: 1rem;
}

/* Close button */
.lightbox__close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 3;
  background: none;
  border: 1px solid var(--color-border);
  padding: 0.3rem 0.6rem;
  cursor: pointer;
  transition: all 150ms;
}

.lightbox__close:hover {
  border-color: var(--color-accent);
}

.lightbox__close-key {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.lightbox__close:hover .lightbox__close-key {
  color: var(--color-accent);
}

/* Transition */
.lightbox-enter-active {
  transition: opacity 200ms ease;
}

.lightbox-enter-active .lightbox__image {
  animation: lightbox-in 250ms ease-out;
}

.lightbox-leave-active {
  transition: opacity 150ms ease;
}

.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}

/* Mobile lightbox */
@media (max-width: 640px) {
  .lightbox {
    background: rgb(8, 8, 8);
  }

  .lightbox__frame {
    max-width: 100vw;
    max-height: 100vh;
    padding: 0 0.5rem;
  }

  .lightbox__image {
    max-width: 100vw;
    max-height: 75vh;
  }

  .lightbox__nav {
    width: 2.25rem;
    height: 2.25rem;
    font-size: 1rem;
    background: rgba(8, 8, 8, 0.6);
  }

  .lightbox__nav--prev { left: 0.25rem; }
  .lightbox__nav--next { right: 0.25rem; }

  .lightbox__hud {
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.5rem;
    font-size: 0.6rem;
  }

  .lightbox__filename {
    max-width: 16ch;
  }

  .lightbox__close {
    top: 0.5rem;
    right: 0.5rem;
  }

  /* Single + composite: reduce side padding on mobile */
  .project-detail__single,
  .project-detail__composite {
    padding: 0 0.75rem;
  }
}
</style>
