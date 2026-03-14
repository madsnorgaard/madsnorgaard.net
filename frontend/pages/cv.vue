<template>
  <div>
    <div class="container" style="padding-top: 4rem;">
      <h1 class="text-display text-display--section" style="margin-bottom: 0.5rem;">
        Curriculum Vitae
      </h1>
      <p class="text-mono" style="color: var(--color-muted); margin-bottom: 3rem;">
        Mads Nørgaard · Skanderborg, Denmark · <a href="mailto:mads@madsnorgaard.net">mads@madsnorgaard.net</a>
      </p>

      <!-- ─── Work history ──────────────────────────────────────────── -->
      <section style="margin-bottom: 4rem;">
        <h2 class="text-display" style="font-size: 1.5rem; margin-bottom: 0; border-bottom: 1px solid var(--color-border); padding-bottom: 0.75rem;">
          Experience
        </h2>

        <div v-if="work?.length">
          <article
            v-for="entry in work"
            :key="entry.id"
            class="work-entry"
          >
            <div class="work-entry__meta">
              <div class="work-entry__dates">
                {{ formatYear(entry.startDate) }}–{{ entry.isCurrent ? 'present' : formatYear(entry.endDate) }}
              </div>
              <div class="work-entry__type-badge">{{ entry.type }}</div>
            </div>

            <div>
              <h3 class="work-entry__role">{{ entry.roleTitle }}</h3>
              <p class="work-entry__employer">
                <a v-if="entry.employerUrl" :href="entry.employerUrl" target="_blank" rel="noopener noreferrer">
                  {{ entry.employer }}
                </a>
                <span v-else>{{ entry.employer }}</span>
              </p>
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div class="work-entry__description" v-html="entry.description" />

              <div v-if="entry.technologies?.length" class="work-entry__tech-tags">
                <span
                  v-for="tech in entry.technologies"
                  :key="tech.id"
                  class="work-entry__tech-tag"
                >{{ tech.name }}</span>
              </div>
            </div>
          </article>
        </div>
        <p v-else class="text-mono" style="color: var(--color-muted); padding: 2rem 0;">
          Work history not available.
        </p>
      </section>

      <!-- ─── What I work with ──────────────────────────────────────── -->
      <section style="margin-bottom: 4rem;">
        <h2 class="text-display" style="font-size: 1.5rem; margin-bottom: 0; border-bottom: 1px solid var(--color-border); padding-bottom: 0.75rem;">
          What I work with
        </h2>
        <NuxtLink
          to="/with"
          class="text-mono"
          style="display: block; padding: 1.5rem 0; color: var(--color-muted);"
        >
          See full stack → /with
        </NuxtLink>
      </section>

      <!-- ─── Print note ─────────────────────────────────────────────── -->
      <p class="text-mono" style="color: var(--color-muted); font-size: 0.75rem; print-only: hidden;">
        This page prints cleanly. <button @click="window.print()" style="background:none;border:none;color:var(--color-accent);font-family:var(--font-mono);font-size:0.75rem;cursor:pointer;padding:0;">Print PDF →</button>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DrupalWorkEntry } from '~/types/drupal'

const { data: work } = await useFetch<DrupalWorkEntry[]>('/api/drupal/work').catch(() => ({ data: ref([]) }))

function formatYear(dateString?: string) {
  if (!dateString) return ''
  return new Date(dateString).getFullYear()
}

const window = process.client ? globalThis.window : null

useHead({
  title: 'CV | Mads Nørgaard',
})
</script>
