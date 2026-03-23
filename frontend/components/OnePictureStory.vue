<template>
  <div v-if="story" class="ops">
    <!-- Image — click to toggle caption -->
    <button
      class="ops__frame"
      :aria-expanded="captionOpen"
      aria-label="Toggle story caption"
      @click="captionOpen = !captionOpen"
    >
      <img
        v-if="story.image"
        :src="story.image.src"
        :alt="story.image.alt"
        :width="story.image.width ?? undefined"
        :height="story.image.height ?? undefined"
        class="ops__image"
        loading="lazy"
      />

      <!-- Caption overlay -->
      <Transition name="caption">
        <div v-if="captionOpen" class="ops__caption">
          <time class="ops__date" :datetime="story.date">{{ formatDate(story.date) }}</time>
          <p class="ops__title">{{ story.title }}</p>
          <p v-if="story.caption" class="ops__excerpt">{{ story.caption }}</p>
          <a
            :href="story.url"
            class="ops__link"
            target="_blank"
            rel="noopener"
            @click.stop
          >Read →</a>
        </div>
      </Transition>

      <!-- Hint dot — visible when caption is closed -->
      <span v-if="!captionOpen" class="ops__hint" aria-hidden="true">●</span>
    </button>
  </div>
</template>

<script setup lang="ts">
const captionOpen = ref(false)

defineProps<{
  story: {
    id: number
    title: string
    caption: string
    date: string
    slug: string
    url: string
    image: { src: string; alt: string; width: number | null; height: number | null } | null
  } | null
}>()

function formatDate(dateString: string) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
</script>

<style scoped>
.ops {
  margin: 0;
  display: flex;
  justify-content: center;
}

/* Frame wraps tightly to the image so caption overlays correctly */
.ops__frame {
  position: relative;
  display: block;
  width: fit-content;
  max-width: 100%;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  overflow: hidden;
}

.ops__image {
  display: block;
  /* Full image visible — no cropping */
  max-width: 100vw;
  max-height: 75vh;
  width: auto;
  height: auto;
  transition: filter 400ms ease;
}

.ops__frame[aria-expanded="true"] .ops__image {
  filter: brightness(0.45);
}

/* Caption overlay — slides up from bottom */
.ops__caption {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 75%;
  overflow-y: auto;
  padding: 3rem 1.5rem 1.5rem;
  text-align: left;
  background: linear-gradient(to top, rgba(0,0,0,0.92) 80%, transparent 100%);
}

.ops__date {
  display: block;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.75rem;
  color: rgba(240, 237, 230, 0.6);
  margin-bottom: 0.4rem;
}

.ops__title {
  font-family: var(--font-serif, 'Playfair Display', serif);
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-text, #F0EDE6);
  margin: 0 0 0.5rem;
  line-height: 1.2;
}

.ops__excerpt {
  font-size: 0.85rem;
  color: rgba(240, 237, 230, 0.75);
  line-height: 1.5;
  margin: 0 0 1rem;
}

.ops__link {
  display: inline-block;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.8rem;
  color: var(--color-accent, #C41E3A);
  text-decoration: none;
  letter-spacing: 0.05em;
}

.ops__link:hover {
  color: var(--color-text, #F0EDE6);
}

/* Pulsing dot hint */
.ops__hint {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  font-size: 0.5rem;
  color: var(--color-accent, #C41E3A);
  animation: pulse 2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.2; }
}

/* Transition */
.caption-enter-active,
.caption-leave-active {
  transition: opacity 300ms ease, transform 300ms ease;
}
.caption-enter-from,
.caption-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
