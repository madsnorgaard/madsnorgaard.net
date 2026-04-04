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

    <!-- Prose text (contained width) -->
    <ClientOnly>
      <div
        v-if="proseContent"
        class="project-detail__prose container--narrow"
        v-html="proseContent"
      />
    </ClientOnly>

    <!-- Gallery (full-bleed) -->
    <div
      v-if="galleryImages.length"
      ref="contentEl"
      class="project-detail__gallery"
      @click="handleGalleryClick"
    >
      <div
        v-for="(img, i) in galleryImages"
        :key="i"
        class="gallery__item"
        @click="openLightbox(i)"
      >
        <img
          :src="img.src"
          :alt="img.alt"
          loading="lazy"
          class="gallery__image"
        />
      </div>
    </div>

    <div class="container" style="padding: 2rem 1.5rem;">
      <NuxtLink to="/archive" class="text-mono" style="color: var(--color-accent); font-size: 0.85rem;">
        &lt;- back to archive
      </NuxtLink>
    </div>

    <!-- Lightbox overlay -->
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
            v-if="galleryImages.length > 1"
            class="lightbox__nav lightbox__nav--prev"
            @click.stop="prevImage"
            aria-label="Previous image"
          >&lt;</button>
          <button
            v-if="galleryImages.length > 1"
            class="lightbox__nav lightbox__nav--next"
            @click.stop="nextImage"
            aria-label="Next image"
          >&gt;</button>

          <!-- Image -->
          <div class="lightbox__frame" @click.stop>
            <img
              :src="galleryImages[lightbox.index]?.src ?? ''"
              :alt="galleryImages[lightbox.index]?.alt ?? ''"
              class="lightbox__image"
              @click.stop="nextImage"
            />
            <!-- HUD bar -->
            <div class="lightbox__hud">
              <span class="lightbox__counter">
                <span class="lightbox__counter-current">{{ String(lightbox.index + 1).padStart(2, '0') }}</span>
                <span class="lightbox__counter-sep">/</span>
                <span class="lightbox__counter-total">{{ String(galleryImages.length).padStart(2, '0') }}</span>
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

const contentEl = ref<HTMLElement | null>(null)
const lightboxEl = ref<HTMLElement | null>(null)

// Split content: prose paragraphs vs gallery images
interface GalleryImage {
  src: string
  alt: string
  width: string
  height: string
}

// Extract prose text (paragraphs + headings, no gallery markup)
const proseContent = computed(() => {
  if (!project.value?.content || !import.meta.client) return ''
  const parser = new DOMParser()
  const doc = parser.parseFromString(project.value.content, 'text/html')
  const elements: string[] = []
  doc.querySelectorAll('p, h1, h2, h3, h4').forEach(el => {
    const text = el.textContent?.trim()
    if (text) elements.push(el.outerHTML)
  })
  return elements.join('')
})

// Extract all gallery images from every source
const galleryImages = computed<GalleryImage[]>(() => {
  if (!project.value?.content || !import.meta.client) return []
  const parser = new DOMParser()
  const doc = parser.parseFromString(project.value.content, 'text/html')
  const images: GalleryImage[] = []

  // Collect from all image sources
  doc.querySelectorAll('img').forEach(img => {
    const imgSrc = img.getAttribute('src') || ''
    if (!imgSrc) return

    // Check if parent <a> has a direct image URL (mauer-stills pattern)
    // vs an attachment page permalink (WP block gallery pattern)
    const link = img.closest('a')
    const linkHref = link?.getAttribute('href') || ''
    const isImageUrl = /\.(jpe?g|png|gif|webp)(\?.*)?$/i.test(linkHref)
    const src = isImageUrl ? linkHref : imgSrc

    // Get dimensions from data-size on the link (mauer-stills pattern)
    const size = link?.getAttribute('data-size') || ''
    const [w, h] = size ? size.split('x') : ['', '']
    images.push({ src, alt: img.getAttribute('alt') || '', width: w || '', height: h || '' })
  })

  return images
})

const lightbox = reactive({
  active: false,
  index: 0,
})

const currentFilename = computed(() => {
  const src = galleryImages.value[lightbox.index]?.src ?? ''
  const parts = src.split('/')
  return parts[parts.length - 1]?.replace(/\.[^.]+$/, '') ?? ''
})

const currentDimensions = computed(() => {
  const img = galleryImages.value[lightbox.index]
  if (!img?.width || !img?.height) return ''
  return `${img.width}x${img.height}`
})

function handleGalleryClick(e: MouseEvent) {
  e.preventDefault()
}

function openLightbox(index: number) {
  lightbox.index = index
  lightbox.active = true
  // Lock scroll on both html and body (iOS needs both)
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
  document.body.style.position = 'fixed'
  document.body.style.width = '100%'
  document.body.style.top = `-${window.scrollY}px`
  nextTick(() => lightboxEl.value?.focus())
}

function closeLightbox() {
  // Restore scroll position
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
  if (galleryImages.value.length <= 1) return
  lightbox.index = (lightbox.index + 1) % galleryImages.value.length
}

function prevImage() {
  if (galleryImages.value.length <= 1) return
  lightbox.index = (lightbox.index - 1 + galleryImages.value.length) % galleryImages.value.length
}

// Keyboard navigation
function onKeydown(e: KeyboardEvent) {
  if (!lightbox.active) return
  if (e.key === 'Escape') closeLightbox()
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextImage() }
  if (e.key === 'ArrowLeft') { e.preventDefault(); prevImage() }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

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
  padding: 0 1.5rem 2rem;
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

/* ─── Gallery (full-bleed, images are the hero) ──────────────── */

.project-detail__gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3px;
  padding: 0;
  width: 100%;
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

/* ─── Lightbox ───────────────────────────────────────────────────── */

.lightbox {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(8, 8, 8, 0.98);
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  /* Prevent iOS rubber-band scroll on the overlay */
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
}
</style>
