<template>
  <div class="container" style="padding-top: 4rem; padding-bottom: 4rem;">
    <h1 class="text-display text-display--section" style="margin-bottom: 4rem;">Projects</h1>

    <!-- ─── Project grid with sphere filter ──────────────────────────── -->
    <section v-if="allProjects?.length" style="margin-bottom: 4rem;">
      <ProjectsSphereFilter v-model="selectedSphere" :options="sphereOptions" />
      <div v-if="filteredProjects.length" class="projects-grid">
        <ProjectsProjectCard
          v-for="project in filteredProjects"
          :key="project.id"
          :project="project"
        />
      </div>
      <p v-else class="text-mono" style="color: var(--color-muted)">
        No projects in this sphere yet.
      </p>
    </section>

    <!-- ─── Open source / GitHub ─────────────────────────────────────── -->
    <section v-if="repos?.length">
      <h2 class="text-label" style="margin-bottom: 1.5rem;">Open source / GitHub</h2>
      <div style="display: flex; flex-direction: column; gap: 0;">
        <a
          v-for="repo in repos"
          :key="repo.id"
          :href="repo.htmlUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="repo-row"
        >
          <div>
            <span class="repo-row__name">{{ repo.name }}</span>
            <span v-if="repo.description" class="repo-row__desc">: {{ repo.description }}</span>
          </div>
          <div class="repo-row__meta">
            <span v-if="repo.language" class="repo-row__lang">{{ repo.language }}</span>
            <span v-if="repo.stars > 0" class="repo-row__stars">★ {{ repo.stars }}</span>
          </div>
        </a>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { DrupalProject } from '~/types/drupal'
import type { GitHubRepo } from '~/types/github'
import type { SphereValue } from '~/types/sphere'

const [{ data: allProjects }, { data: repos }] = await Promise.all([
  useFetch<DrupalProject[]>('/api/drupal/projects'),
  useFetch<GitHubRepo[]>('/api/github/repos'),
])

const selectedSphere = ref<SphereValue>('all')

const filteredProjects = computed(() => {
  const list = allProjects.value ?? []
  if (selectedSphere.value === 'all') return list
  return list.filter((p) => p.category === selectedSphere.value)
})

const sphereOptions = computed(() => {
  const list = allProjects.value ?? []
  const countBy = (cat: string) => list.filter((p) => p.category === cat).length
  return [
    { value: 'all' as const,           label: 'All',         count: list.length },
    { value: 'civic' as const,         label: 'Civic',       count: countBy('civic') },
    { value: 'professional' as const,  label: 'Professional', count: countBy('professional') },
    { value: 'open-source' as const,   label: 'Open source', count: countBy('open-source') },
    { value: 'personal' as const,      label: 'Personal',    count: countBy('personal') },
  ]
})

useHead({ title: 'Projects | Mads Nørgaard' })
</script>

<style scoped>
.repo-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 1rem 0;
  border-bottom: 1px solid var(--color-border);
  text-decoration: none;
  font-size: 0.9rem;
  transition: background 150ms;
  gap: 1rem;
}

.repo-row:hover {
  color: var(--color-accent);
}

.repo-row__name {
  font-family: var(--font-mono);
  font-weight: 500;
  color: var(--color-text);
}

.repo-row__desc {
  color: var(--color-muted);
}

.repo-row__meta {
  display: flex;
  gap: 0.75rem;
  flex-shrink: 0;
}

.repo-row__lang,
.repo-row__stars {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-muted);
}
</style>
