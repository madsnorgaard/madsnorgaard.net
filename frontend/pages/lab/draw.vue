<template>
  <div class="container lab">
    <p class="text-label lab__kicker">
      <NuxtLink to="/lab">Lab</NuxtLink> / 05
    </p>
    <h1 class="text-display text-display--section lab__title">
      Draw it, then let the circles draw it
    </h1>
    <p class="lab__intro">
      The maps in this lab were drawn by chains of spinning arms. Now it is your turn.
      <strong>Draw any closed shape in one stroke</strong>, or start from a heart or a star, and the
      machine turns it into {{ SKETCH_POINTS }} rotating circles that trace it back. Start with one arm and
      add more until it looks like yours. Save it or share it when it does.
    </p>

    <ClientOnly>
      <div class="draw__grid" :class="{ 'draw__grid--two': outline.length }">
        <LabSketchPad ref="pad" @stroke="onStroke" @preset="onPreset" @clear="onClear" />
        <div v-if="outline.length" class="draw__machine">
          <LabEpicycles
            :key="outlineKey"
            page="105"
            label="Lab · Circles"
            :shapes="[{ name: 'Your drawing', pts: outline }]"
            :steps="DRAW_STEPS"
            :default-n="initialN"
            :period="8"
            aria-label="Your drawing being traced by chains of rotating circles"
            @update:n="n = $event"
          />
          <LabShare
            slug="draw"
            title="Drawn by circles"
            :text="`My drawing, redrawn by ${n} spinning circles`"
            :state="{ d: outlineKey, n: n === 8 ? undefined : n }"
          />
        </div>
      </div>
      <template #fallback>
        <div class="lab-placeholder" />
      </template>
    </ClientOnly>

    <div class="lab__body">
      <section>
        <h2 class="text-label">What happens to your stroke</h2>
        <p>
          The line you draw is resampled into {{ SKETCH_POINTS }} evenly spaced points and closed back on
          itself. Each point becomes a complex number, the discrete Fourier transform turns the list into
          {{ SKETCH_POINTS }} coefficients, and each coefficient is one arm: a circle of a fixed radius turning
          at a fixed speed. Sorted biggest first, so the first few arms catch the rough shape and the last
          ones add the wobbles.
        </p>
        <div class="lab__math">z(t) = Σ c<sub>k</sub> · e<sup>2πikt</sup></div>
        <p>
          With all {{ SKETCH_POINTS }} arms the machine passes through every one of your points, so the
          error reads <strong>exact</strong>. The interesting part is how few it needs to be recognisable.
        </p>
      </section>
      <section>
        <h2 class="text-label">Sharing a drawing</h2>
        <p>
          The share link carries the drawing itself, packed into about 500 characters, not a picture of it.
          Whoever opens it gets the same machine and can turn the arms up and down. The saved image is
          rendered on the server from the same points.
        </p>
        <p>
          Try a letter, a cat, or something with a hole in it and watch what one single loop can and
          cannot do. Then see <NuxtLink to="/lab/fourier-south-africa">why South Africa needs two chains</NuxtLink>.
        </p>
      </section>
    </div>

    <p class="lab__source">
      Maths: the same <a href="https://github.com/madsnorgaard/madsnorgaard.net/tree/main/frontend/utils" target="_blank" rel="noopener noreferrer">discrete Fourier transform</a> as the map experiments.
      <a href="https://github.com/madsnorgaard/madsnorgaard.net/tree/main/frontend/components/lab" target="_blank" rel="noopener noreferrer">Source on GitHub</a>
    </p>
  </div>
</template>

<script setup lang="ts">
import { snapN, type Pt } from '~/utils/lab-fourier'
import { DRAW_STEPS, PRESETS, SKETCH_POINTS, decodeOutline, encodeOutline, strokeToOutline } from '~/utils/lab-sketch'

const route = useRoute()
const siteUrl = (useRuntimeConfig().public?.siteUrl as string) || 'https://madsnorgaard.net'

// A shared link carries the outline in ?d= and optionally the arm count in ?n=.
const shared = decodeOutline(route.query.d)
const outline = ref<Pt[]>(shared ?? [])
const outlineKey = computed(() => (outline.value.length ? encodeOutline(outline.value) : ''))
const initialN = snapN(route.query.n, 8, DRAW_STEPS)
const n = ref(initialN)

const pad = ref<{ show: (o: Pt[]) => void; clear: () => void } | null>(null)

function onStroke(pts: Pt[]) {
  const o = strokeToOutline(pts)
  if (o.length) outline.value = o
}
function onPreset(key: string) {
  const p = PRESETS[key]
  if (!p) return
  outline.value = p.pts()
  pad.value?.show(outline.value)
}
function onClear() {
  outline.value = []
}
onMounted(() => {
  if (shared) nextTick(() => pad.value?.show(shared))
})

const ogImage = computed(() => {
  const p = new URLSearchParams()
  if (shared && typeof route.query.d === 'string') p.set('d', route.query.d)
  if (route.query.n) p.set('n', String(initialN))
  const s = p.toString()
  return `${siteUrl}/og/lab/draw.png${s ? `?${s}` : ''}`
})

useSeoMeta({
  title: 'Draw it, then let the circles draw it · Lab',
  description: 'Draw any closed shape and watch a chain of rotating Fourier circles trace it back. Share the drawing as a link or save it as a picture.',
  ogImage: () => ogImage.value,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  twitterCard: 'summary_large_image',
  twitterImage: () => ogImage.value,
})
</script>

<style scoped>
.draw__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 2rem;
  align-items: start;
}
/* Pad and machine side by side once there is a machine and room for it. */
@media (min-width: 960px) {
  .draw__grid--two {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  }
}
</style>
