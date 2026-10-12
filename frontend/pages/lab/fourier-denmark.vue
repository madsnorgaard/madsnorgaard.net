<template>
  <div class="container lab">
    <p class="text-label lab__kicker">
      <NuxtLink to="/lab">Lab</NuxtLink> / 02
    </p>
    <h1 class="text-display text-display--section lab__title">
      Denmark needs fifteen machines
    </h1>
    <p class="lab__intro">
      Norway gets one Fourier series. Denmark is a peninsula and a pile of islands, so it gets
      <strong>{{ count }} separate chains of spinning arms</strong>, all hanging off the same hub in the
      Kattegat-ish middle of the country and all drawing at the same time. Jutland does the heavy lifting.
      Anholt does very little, but it does it beautifully.
    </p>

    <ClientOnly>
      <LabEpicycles
        v-if="shapes.length"
        :shapes="shapes"
        :default-n="initialN"
        @update:n="n = $event"
        :max-stat-rows="3"
        aria-label="The outlines of Jutland and fourteen Danish islands being drawn by chains of rotating circles"
      />
      <template #fallback>
        <div class="lab-placeholder" />
      </template>
    </ClientOnly>
    <LabShare
      slug="fourier-denmark"
      title="Denmark needs fifteen machines"
      :text="`Jutland and fourteen Danish islands drawn by ${n} rotating circles each`"
      :state="{ n: n === 80 ? undefined : n }"
    />

    <div class="lab__body">
      <section>
        <h2 class="text-label">One series per landmass</h2>
        <p>
          A Fourier series is a single closed loop, so every island needs its own. Each outline is sampled
          as evenly spaced points, turned into complex numbers, and run through a discrete Fourier transform.
          The coefficients become arms, sorted longest first.
        </p>
        <div class="lab__math">z<sub>island</sub>(t) = Σ c<sub>k</sub> · e<sup>2πikt</sup></div>
        <p>
          The first arm of every chain is the long straight one from the hub to the middle of that island.
          That is why the drawing looks like a starburst before any coast appears. Small islands only have
          64 sample points, so they top out at 64 arms - turn N up and Jutland keeps improving while Fanø is
          already done.
        </p>
      </section>

      <section>
        <h2 class="text-label">Which islands</h2>
        <p>
          This map knows <strong>{{ names }}</strong>.
        </p>
        <p>
          Denmark has more than 400 named islands. The 1:10m world map used here only knows these fifteen -
          Falster is not on it at all, and most of the South Funen archipelago is missing. Which is a nice
          lead-in to the <NuxtLink to="/lab/coastline-paradox">coastline paradox</NuxtLink>: how much
          Denmark there is depends on how closely you look.
        </p>
      </section>
    </div>

    <p class="lab__source">
      Outline data: Natural Earth 1:10m (public domain).
      <a href="https://github.com/madsnorgaard/madsnorgaard.net/tree/main/frontend/components/lab" target="_blank" rel="noopener noreferrer">Source on GitHub</a>
    </p>
  </div>
</template>

<script setup lang="ts">
import { snapN, type Pt } from '~/utils/lab-fourier'

const route = useRoute()
const siteUrl = (useRuntimeConfig().public?.siteUrl as string) || 'https://madsnorgaard.net'

const initialN = snapN(route.query.n, 80)
const n = ref(initialN)
const ogImage = computed(() =>
  `${siteUrl}/og/lab/fourier-denmark.png${route.query.n ? `?n=${snapN(route.query.n, 80)}` : ''}`,
)

useSeoMeta({
  title: 'Denmark needs fifteen machines · Lab',
  description: 'Jutland and fourteen Danish islands redrawn at the same time by fifteen chains of rotating Fourier epicycles.',
  ogImage: () => ogImage.value,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  twitterCard: 'summary_large_image',
  twitterImage: () => ogImage.value,
})

const { data } = useFetch<{ islands: { name: string; pts: Pt[] }[] }>('/lab-data/dk.json', { server: false })

const shapes = computed(() => data.value?.islands.map((i) => ({ name: i.name, pts: i.pts })) ?? [])
const count = computed(() => data.value?.islands.length ?? 15)
const names = computed(() => {
  const list = data.value?.islands.map((i) => i.name) ?? []
  return list.length ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : 'fifteen landmasses'
})
</script>
