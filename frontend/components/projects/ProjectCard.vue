<template>
  <div
    class="project-card"
    :class="{ 'is-flipped': flipped }"
    @click="flipped = !flipped"
    @keydown.enter="flipped = !flipped"
    @keydown.space.prevent="flipped = !flipped"
    tabindex="0"
    role="button"
    :aria-label="`${project.title}: click for details`"
    :aria-expanded="flipped"
  >
    <!-- Front face -->
    <div class="project-card__face project-card__front">
      <div v-if="project.coverImage" class="project-card__image">
        <img :src="project.coverImage.url" :alt="project.coverImage.alt || project.title" loading="lazy" />
      </div>
      <div v-else class="project-card__image project-card__image--placeholder">
        <svg :id="`proj-bg-${project.id}`" viewBox="0 0 300 200"
             xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <pattern :id="`dots-${project.id}`" x="0" y="0" width="18" height="18"
                     patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="#252525"/>
            </pattern>
          </defs>
          <rect width="300" height="200" fill="#141414"/>
          <rect width="300" height="200" :fill="`url(#dots-${project.id})`"/>
          <text x="150" y="95" font-family="IBM Plex Mono, monospace" font-size="44"
                font-weight="500" fill="#C41E3A" text-anchor="middle"
                opacity="0.55">{{ initials }}</text>
          <text x="150" y="128" font-family="IBM Plex Mono, monospace" font-size="9"
                fill="#4A4A4A" text-anchor="middle" letter-spacing="2">
            {{ project.category.toUpperCase() }}
          </text>
        </svg>
      </div>

      <div class="project-card__body">
        <span
          class="project-card__badge"
          :class="`project-card__badge--${project.category}`"
        >{{ categoryLabel }}</span>
        <h3 class="project-card__title">{{ project.title }}</h3>
        <p class="project-card__tagline">{{ project.tagline }}</p>
        <span class="project-card__hint">click for details</span>
      </div>
    </div>

    <!-- Back face -->
    <div class="project-card__face project-card__back">
      <div class="project-card__back-body">
        <h3 class="project-card__title">{{ project.title }}</h3>

        <div class="project-card__tech-tags">
          <span
            v-for="tech in project.technologies"
            :key="tech.id"
            class="project-card__tech-tag"
          >{{ tech.name }}</span>
        </div>

        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="project-card__description" v-html="project.description" />

        <div class="project-card__links">
          <a
            v-if="project.githubUrl"
            :href="project.githubUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="project-card__link"
            @click.stop
          >GitHub →</a>
          <a
            v-if="project.liveUrl"
            :href="project.liveUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="project-card__link"
            @click.stop
          >Live site →</a>
        </div>

        <span class="project-card__status" :class="`project-card__status--${project.status}`">
          {{ project.status }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DrupalProject } from '~/types/drupal'

const props = defineProps<{
  project: DrupalProject
}>()

const flipped = ref(false)

const initials = computed(() =>
  props.project.title
    .split(/[\s\-_\.]+/)
    .filter(Boolean)
    .slice(0, 3)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
)

const categoryLabel = computed(() => {
  const map: Record<string, string> = {
    civic: 'Civic',
    professional: 'Professional',
    'open-source': 'Open source',
    personal: 'Personal',
  }
  return map[props.project.category] ?? props.project.category
})
</script>

<style scoped>
.project-card {
  perspective: 1000px;
  cursor: pointer;
  height: 400px;
  position: relative;
}

.project-card__face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transition: transform 500ms cubic-bezier(0.23, 1, 0.32, 1);
  border: 1px solid var(--color-border, #2A2A2A);
  background: var(--color-surface, #161616);
  overflow: hidden;
}

.project-card__front {
  transform: rotateY(0deg);
}

.project-card__back {
  transform: rotateY(180deg);
  display: flex;
  flex-direction: column;
}

.project-card.is-flipped .project-card__front {
  transform: rotateY(-180deg);
}

.project-card.is-flipped .project-card__back {
  transform: rotateY(0deg);
}

/* Front */
.project-card__image {
  height: 200px;
  overflow: hidden;
  background: var(--color-border, #2A2A2A);
}

.project-card__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.project-card__image--placeholder {
  background: #141414;
  display: flex;
  align-items: center;
  justify-content: center;
}

.project-card__image--placeholder svg {
  width: 100%;
  height: 100%;
}

.project-card__body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.project-card__badge {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.2em 0.6em;
  border: 1px solid currentColor;
  width: fit-content;
}

.project-card__badge--civic {
  color: var(--color-accent, #C41E3A);
  border-color: var(--color-accent, #C41E3A);
}

.project-card__badge--professional { color: var(--color-muted); }
.project-card__badge--personal     { color: var(--color-muted); }
.project-card__badge--open-source  { color: var(--color-muted); }

.project-card__title {
  font-family: var(--font-display, 'Playfair Display', serif);
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
  color: var(--color-text, #F0EDE6);
}

.project-card__tagline {
  font-size: 0.875rem;
  color: var(--color-muted, #6B6763);
  margin: 0;
  line-height: 1.4;
}

.project-card__hint {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.7rem;
  color: #6C6864;  /* 3.3:1 on surface — intentionally ghostly but legible */
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: auto;
}

/* Back */
.project-card__back-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  height: 100%;
  overflow-y: auto;
}

.project-card__tech-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.project-card__tech-tag {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.7rem;
  padding: 0.15em 0.5em;
  background: rgba(196, 30, 58, 0.1);
  color: var(--color-accent, #C41E3A);
  border-radius: 2px;
}

.project-card__description {
  font-size: 0.875rem;
  color: var(--color-muted, #6B6763);
  line-height: 1.6;
  flex: 1;
}

.project-card__description :deep(p) { margin: 0; }

.project-card__links {
  display: flex;
  gap: 1rem;
}

.project-card__link {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.8rem;
  color: var(--color-accent, #C41E3A);
  text-decoration: none;
}

.project-card__link:hover {
  text-decoration: underline;
}

.project-card__status {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-muted, #6B6763);
  margin-top: auto;
  align-self: flex-end;
}
</style>
