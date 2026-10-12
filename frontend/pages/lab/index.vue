<template>
  <div class="container lab">
    <p class="text-label lab__kicker">Lab</p>
    <h1 class="text-display text-display--section lab__title">
      Maps, maths and other nerdy things
    </h1>
    <p class="lab__intro">
      Small experiments with South Africa and Denmark as the data. Mostly geometry, some history,
      all of it running in the browser.
    </p>

    <ul class="lab-list">
      <li v-for="e in experiments" :key="e.to">
        <NuxtLink :to="e.to" class="lab-list__item">
          <span class="text-label">{{ e.n }}</span>
          <span class="lab-list__title">{{ e.title }}</span>
          <span class="lab-list__desc">{{ e.desc }}</span>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
const siteUrl = (useRuntimeConfig().public?.siteUrl as string) || 'https://madsnorgaard.net'
const ogImage = `${siteUrl}/og/lab/fourier-south-africa.png`

useSeoMeta({
  title: 'Lab · Mads Nørgaard',
  description: 'Interactive maths and map experiments using South Africa and Denmark: Fourier epicycles, the coastline paradox and more.',
  ogImage,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  twitterCard: 'summary_large_image',
  twitterImage: ogImage,
})

const experiments = [
  {
    n: '01',
    to: '/lab/fourier-south-africa',
    title: 'South Africa, drawn by circles',
    desc: 'Fourier epicycles with a hole in the middle. Two chains of spinning arms, one for the border and one for Lesotho.',
  },
  {
    n: '02',
    to: '/lab/fourier-denmark',
    title: 'Denmark needs fifteen machines',
    desc: 'One Fourier series per landmass, all drawing at once from a single hub.',
  },
  {
    n: '03',
    to: '/lab/coastline-paradox',
    title: 'How long is Denmark?',
    desc: 'The coastline paradox with an adjustable ruler. Denmark shrinks fast. South Africa barely notices.',
  },
  {
    n: '04',
    to: '/lab/nobel-brain-drain',
    title: 'Born here, won there',
    desc: 'Every Nobel laureate as a line from birth country to the country they won from. Plus five Peace Prizes, one country.',
  },
]
</script>

<style scoped>
.lab-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: 1px solid var(--color-border);
}
.lab-list__item {
  display: grid;
  grid-template-columns: 3rem minmax(0, 1fr);
  gap: 0.25rem 1rem;
  padding: 1.75rem 0;
  border-bottom: 1px solid var(--color-border);
}
.lab-list__item .text-label {
  grid-row: span 2;
  padding-top: 0.6rem;
}
.lab-list__title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(1.25rem, 3vw, 1.75rem);
  line-height: 1.2;
  transition: color 0.15s;
}
.lab-list__item:hover .lab-list__title,
.lab-list__item:focus-visible .lab-list__title {
  color: var(--color-accent);
}
.lab-list__desc {
  color: var(--color-muted);
  max-width: 600px;
}
</style>
