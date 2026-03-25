<template>
  <div>
    <!-- ─── Hero ─────────────────────────────────────────────────────── -->
    <section class="hero container">
      <h1 class="hero__name">
        <ScrambleText text="Mads Nørgaard" :delay="200" />
      </h1>
      <p class="hero__role">
        <RoleRotation />
      </p>
      <p class="hero__intro">{{ about?.intro ?? 'Self-taught senior developer and DevOps engineer. 15 years building on Drupal, PHP, Docker, and Linux. Currently at Eksponent as technical lead. Also technical lead for South African History Online since 2010. Documentary photographer.' }}</p>
    </section>

    <!-- ─── Status block ─────────────────────────────────────────────── -->
    <div class="container">
      <StatusBlock :status="status" />
    </div>

    <!-- ─── 01 Recent writing ─────────────────────────────────────────── -->
    <section class="section container">
      <div class="section__header">
        <h2 class="section__title">
          <span class="section__number">01</span>
          Recent writing
        </h2>
        <NuxtLink to="/writing" class="section__all-link">All writing →</NuxtLink>
      </div>

      <div v-if="posts?.posts?.length">
        <article
          v-for="post in posts.posts.slice(0, 3)"
          :key="post.id"
          class="post-card"
        >
          <div>
            <h3 class="post-card__title">
              <NuxtLink :to="`/writing/${post.slug}`">{{ post.title }}</NuxtLink>
            </h3>
            <p class="post-card__teaser">{{ post.teaser }}</p>
          </div>
          <time class="post-card__date" :datetime="post.date">
            {{ formatDate(post.date) }}
          </time>
        </article>
      </div>
      <p v-else class="text-mono" style="color: var(--color-muted)">No posts yet.</p>
    </section>

    <!-- ─── One picture story ────────────────────────────────────────── -->
    <div v-if="story" class="container" style="margin: 3rem auto;">
      <OnePictureStory :story="story" />
    </div>

    <!-- ─── 02 Selected work ─────────────────────────────────────────── -->
    <section class="section container">
      <div class="section__header">
        <h2 class="section__title">
          <span class="section__number">02</span>
          Selected work
        </h2>
        <NuxtLink to="/projects" class="section__all-link">All projects →</NuxtLink>
      </div>

      <div v-if="projects?.length" class="projects-grid">
        <ProjectsProjectCard
          v-for="project in projects"
          :key="project.id"
          :project="project"
        />
      </div>
      <p v-else class="text-mono" style="color: var(--color-muted)">No projects yet.</p>
    </section>

    <!-- ─── 03 Terminal ───────────────────────────────────────────────── -->
    <section class="section container">
      <div class="section__header">
        <h2 class="section__title">
          <span class="section__number">03</span>
          Interactive
        </h2>
      </div>
      <Terminal />
    </section>
  </div>
</template>

<script setup lang="ts">
import type { DrupalAbout } from '~/types/drupal'
import type { StatusBlock as StatusBlockType } from '~/types/status'

// Parallel data fetching
const [{ data: about }, { data: posts }, { data: projects }, { data: status }, { data: story }] = await Promise.all([
  useFetch<DrupalAbout>('/api/drupal/about').catch(() => ({ data: ref(null) })),
  useFetch<any>('/api/drupal/blog', { query: { page: 1, limit: 3 } }).catch(() => ({ data: ref(null) })),
  useFetch<any[]>('/api/drupal/projects', { query: { featured: 'true' } }).catch(() => ({ data: ref([]) })),
  useFetch<StatusBlockType>('/api/status').catch(() => ({ data: ref(null) })),
  useFetch<any>('/api/wp/story').catch(() => ({ data: ref(null) })),
])

function formatDate(dateString: string) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const ogAvailability = status.value?.availability ?? 'available'
const ogNote = status.value?.availabilityNote ?? ''
const ogImageUrl = `https://madsnorgaard.net/og-image.png?availability=${ogAvailability}${ogNote ? `&note=${encodeURIComponent(ogNote)}` : ''}`

useHead({
  title: 'Mads Nørgaard: Developer + DevOps',
  meta: [
    { property: 'og:image',        content: ogImageUrl },
    { property: 'og:image:type',   content: 'image/png' },
    { property: 'og:image:width',  content: '1200' },
    { property: 'og:image:height', content: '630' },
    { name:     'twitter:card',    content: 'summary_large_image' },
    { name:     'twitter:image',   content: ogImageUrl },
  ],
})
</script>
