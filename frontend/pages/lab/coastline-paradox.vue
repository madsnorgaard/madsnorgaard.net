<template>
  <div class="container lab">
    <p class="text-label lab__kicker">
      <NuxtLink to="/lab">Lab</NuxtLink> / 03
    </p>
    <h1 class="text-display text-display--section lab__title">
      How long is Denmark?
    </h1>
    <p class="lab__intro">
      In 2014 Denmark's coastline grew by about 1,400 km overnight. Nothing moved. The Danish Geodata
      Agency just measured it again on a more detailed map. That is the <strong>coastline paradox</strong>:
      the shorter your ruler, the longer the coast. Drag the ruler below and watch Denmark shrink much
      faster than South Africa.
    </p>

    <ClientOnly>
      <LabCoastline v-if="countries.length" :countries="countries" />
      <template #fallback>
        <div class="lab-placeholder" />
      </template>
    </ClientOnly>

    <div class="lab__body">
      <section>
        <h2 class="text-label">The divider method</h2>
        <p>
          Open a pair of dividers to a fixed width, put one leg on the coast, swing the other until it
          touches the coast again, and repeat. Count the steps and multiply by the width. Lewis Fry
          Richardson did this by hand in the 1950s and noticed the answer never settles. It keeps growing
          as the dividers close.
        </p>
        <div class="lab__math">
          <div>L(r) ≈ F · r<sup>1 − D</sup></div>
          <div>log L = log F + (1 − D) · log r</div>
        </div>
        <p>
          Plot it on log-log axes and you get a roughly straight line. The slope gives
          <strong>D</strong>, the fractal dimension. A perfectly smooth line has D = 1. The rougher the coast,
          the higher D. Richardson's own estimate for South Africa was about 1.02, one of the smoothest he
          measured. With the same map data, Denmark is much rougher.
        </p>
      </section>

      <section>
        <h2 class="text-label">Why Denmark falls off a cliff</h2>
        <p>
          South Africa is one long, fairly straight coast from the Orange River to Kosi Bay. Big ruler or
          small, it mostly follows the same line. Denmark is fjords, peninsulas and islands. Long rulers jump
          straight across Limfjorden, and once the ruler is longer than an island, that island stops counting
          at all. At 80 km most of Denmark has fallen through the gaps.
        </p>
        <p>
          The official numbers tell the same story. The old figure for Denmark was
          <strong>7,314 km</strong>, measured at 1:100,000. Remeasured at 1:10,000 it became
          <strong>8,750 km</strong>. The map used here is 1:10,000,000, so it bottoms out around
          {{ dkMin }} km - the map itself is a ruler, and a long one.
        </p>
      </section>
    </div>

    <p class="lab__source">
      Coastlines: Natural Earth 1:10m (public domain), land borders removed. Official figures:
      <a href="https://www.thelocal.dk/20141219/denmarks-coastline-suddenly-much-longer" target="_blank" rel="noopener noreferrer">The Local, 2014</a>.
      <a href="https://github.com/madsnorgaard/madsnorgaard.net/tree/main/frontend/components/lab" target="_blank" rel="noopener noreferrer">Source on GitHub</a>
    </p>
  </div>
</template>

<script setup lang="ts">
import type { Pt } from '~/utils/lab-fourier'

useSeoMeta({
  title: 'How long is Denmark? · Lab',
  description: 'The coastline paradox, interactive: measure Denmark and South Africa with a shrinking ruler and watch the length change.',
})

const { data: dk } = useFetch<{ coast: Pt[][] }>('/lab/dk.json', { server: false })
const { data: za } = useFetch<{ coast: Pt[][] }>('/lab/za.json', { server: false })

const countries = computed(() =>
  dk.value && za.value
    ? [
        { name: 'Denmark', color: '#D0243E', lines: dk.value.coast },
        { name: 'South Africa', color: '#E8C26A', lines: za.value.coast },
      ]
    : [],
)

const dkMin = computed(() => {
  if (!dk.value) return '4,300'
  let L = 0
  for (const l of dk.value.coast) for (let i = 1; i < l.length; i++) L += Math.hypot(l[i][0] - l[i - 1][0], l[i][1] - l[i - 1][1])
  return Math.round(L / 100) * 100 >= 1000 ? (Math.round(L / 100) * 100).toLocaleString('en-GB') : String(Math.round(L))
})
</script>
