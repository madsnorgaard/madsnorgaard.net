<template>
  <div v-if="current" class="ops" @mouseenter="onMouseEnter" @mouseleave="onMouseLeave">
    <!-- Image — click to toggle caption -->
    <button
      class="ops__frame"
      :aria-expanded="captionOpen"
      aria-label="Toggle story caption"
      @click="captionOpen = !captionOpen"
    >
      <img
        v-if="current.image"
        :src="current.image.src"
        :alt="current.image.alt"
        :width="current.image.width ?? undefined"
        :height="current.image.height ?? undefined"
        class="ops__image"
        :class="{ 'ops__image--fading': fading }"
        loading="lazy"
      />

      <!-- Caption overlay -->
      <Transition name="caption">
        <div v-if="captionOpen" class="ops__caption">
          <time class="ops__date" :datetime="current.date">{{ formatDate(current.date) }}</time>
          <p class="ops__title">{{ current.title }}</p>
          <p v-if="current.caption" class="ops__excerpt">{{ current.caption }}</p>
          <NuxtLink
            :to="`/post/${current.slug}`"
            class="ops__link"
            @click.stop
          >Read →</NuxtLink>
        </div>
      </Transition>

      <!-- Hint dot — visible when caption is closed -->
      <span v-if="!captionOpen" class="ops__hint" aria-hidden="true">●</span>
    </button>
  </div>
</template>

<script setup lang="ts">
type Story = {
  id: number
  title: string
  caption: string
  date: string
  slug: string
  url: string
  image: { src: string; alt: string; width: number | null; height: number | null } | null
}

const props = defineProps<{
  stories: Story[] | null
}>()

const captionOpen = ref(false)
const currentIndex = ref(0)
const fading = ref(false)
const shuffled = ref<Story[]>([])

let timer: ReturnType<typeof setInterval> | null = null
let fadeTimer: ReturnType<typeof setTimeout> | null = null

const current = computed(() => shuffled.value[currentIndex.value] ?? null)

function shuffle(arr: Story[]): Story[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function advance() {
  fading.value = true
  fadeTimer = setTimeout(() => {
    currentIndex.value = (currentIndex.value + 1) % shuffled.value.length
    captionOpen.value = false
    fading.value = false
  }, 500)
}

function startRotation() {
  if (shuffled.value.length <= 1) return
  timer = setInterval(advance, 5500)
}

function stopRotation() {
  if (timer)     { clearInterval(timer);  timer = null }
  if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null }
  fading.value = false
}

function onMouseEnter() { stopRotation() }
function onMouseLeave() { startRotation() }

onMounted(() => {
  shuffled.value = shuffle(props.stories ?? [])
  startRotation()
})

onUnmounted(() => stopRotation())

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
  /* fit-content so caption overlay matches the actual image bounds, not full container */
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
  /*
   * Full frame, no cropping. CSS picks the binding constraint:
   *   landscape → max-width hits first  → fills container width
   *   portrait  → max-height hits first → scales down, stays centered
   */
  max-width: 100%;
  max-height: 75vh;
  width: auto;
  height: auto;
  transition: opacity 500ms ease, filter 400ms ease;
}

.ops__image--fading {
  opacity: 0;
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

/* Caption transition */
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
