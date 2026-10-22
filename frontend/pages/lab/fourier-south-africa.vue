<template>
  <div class="container lab">
    <p class="text-label lab__kicker">
      <NuxtLink to="/lab">Lab</NuxtLink> / 01
    </p>
    <h1 class="text-display text-display--section lab__title">
      South Africa, drawn by circles
    </h1>
    <p class="lab__intro">
      The border of South Africa redrawn by <strong>two chains of spinning arms</strong> - one for the
      outer border and one for the hole in the middle where Lesotho sits. Every arm is a circle turning at a
      fixed whole-number speed. Put them tip to tail and the last one traces the country. Drag the slider to
      see how many circles it takes before the Cape Peninsula shows up.
    </p>

    <ClientOnly>
      <LabEpicycles
        page="101"
        label="Lab · Fourier / ZA"
        v-if="shapes.length"
        :shapes="shapes"
        :default-n="initialN"
        @update:n="n = $event"
        aria-label="The outline of South Africa and Lesotho being drawn by chains of rotating circles"
      />
      <template #fallback>
        <div class="lab-placeholder" />
      </template>
    </ClientOnly>
    <LabShare
      slug="fourier-south-africa"
      title="South Africa, drawn by circles"
      :text="`South Africa and Lesotho drawn by ${n} rotating circles each`"
      :state="{ n: n === 150 ? undefined : n }"
    />

    <div class="lab__body">
      <section>
        <h2 class="text-label">The maths</h2>
        <div class="lab__math">
          <div>z(t) = Σ c<sub>k</sub> · e<sup>2πikt</sup>, t ∈ [0, 1)</div>
          <div>c<sub>k</sub> = (1/M) Σ z<sub>n</sub> · e<sup>−2πikn/M</sup></div>
        </div>
        <p>
          The border is sampled as M evenly spaced points and each point is read as a complex number,
          <strong>z = x + iy</strong>. The discrete Fourier transform turns that list into M coefficients.
          Each coefficient c<sub>k</sub> is one arm: its length is |c<sub>k</sub>|, it turns k times per
          drawing, and it starts at angle arg(c<sub>k</sub>).
        </p>
        <p>
          The arms are sorted longest first. N = 1 is a single arm pointing from the hub to the middle of the
          country. N = 2 adds a circle. Somewhere around 20 it starts to look like a map, and by 150 you get
          False Bay.
        </p>
      </section>

      <section>
        <h2 class="text-label">Why two chains</h2>
        <p>
          One Fourier series draws exactly one closed loop. South Africa is not one loop - it is a country with
          another country inside it. <strong>Lesotho</strong> is one of only three countries in the world
          entirely surrounded by a single other country (the other two are San Marino and Vatican City, both
          inside Italy).
        </p>
        <p>
          So the drawing runs two independent series from the same hub: a long one for the outer border
          ({{ outerCount }} sample points) and a shorter one for Lesotho ({{ lesothoCount }} points). The RMS
          error is the average distance between the drawn line and the real border, as a share of the
          outline's size.
        </p>
      </section>
    </div>

    <p class="lab__source">
      Border data: Natural Earth 1:10m (public domain). Prince Edward Islands left out.
      <a href="https://github.com/madsnorgaard/madsnorgaard.net/tree/main/frontend/components/lab" target="_blank" rel="noopener noreferrer">Source on GitHub</a>
    </p>
  </div>
</template>

<script setup lang="ts">
import { snapN, type Pt } from '~/utils/lab-fourier'

const route = useRoute()
const siteUrl = (useRuntimeConfig().public?.siteUrl as string) || 'https://madsnorgaard.net'

// ?n=<arms> comes from a shared link: open at that position and preview it.
const initialN = snapN(route.query.n, 150)
const n = ref(initialN)
const ogImage = computed(() =>
  `${siteUrl}/og/lab/fourier-south-africa.png${route.query.n ? `?n=${snapN(route.query.n, 150)}` : ''}`,
)

useSeoMeta({
  title: 'South Africa, drawn by circles · Lab',
  description: 'The border of South Africa and Lesotho redrawn with rotating Fourier epicycles. Drag the slider to add circles.',
  ogImage: () => ogImage.value,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  twitterCard: 'summary_large_image',
  twitterImage: () => ogImage.value,
})

const { data } = useFetch<{ outer: Pt[]; lesotho: Pt[] }>('/lab-data/za.json', { server: false })

const shapes = computed(() =>
  data.value
    ? [
        { name: 'South Africa', pts: data.value.outer },
        { name: 'Lesotho', pts: data.value.lesotho, color: '#E8C26A' },
      ]
    : [],
)
const outerCount = computed(() => data.value?.outer.length ?? 1400)
const lesothoCount = computed(() => data.value?.lesotho.length ?? 360)
</script>
