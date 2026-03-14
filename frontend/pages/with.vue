<template>
  <div class="container" style="padding-top: 4rem; padding-bottom: 4rem;">
    <h1 class="text-display text-display--section" style="margin-bottom: 3rem;">
      What I work with
    </h1>

    <div
      v-for="group in stack"
      :key="group.label"
      style="margin-bottom: 3rem; border-bottom: 1px solid var(--color-border); padding-bottom: 2.5rem;"
    >
      <h2 class="text-label" style="margin-bottom: 1.25rem;">{{ group.label }}</h2>

      <dl style="display: flex; flex-direction: column; gap: 0.75rem;">
        <div
          v-for="item in group.items"
          :key="item.name"
          style="display: grid; grid-template-columns: 180px 1fr; gap: 1.5rem; align-items: baseline;"
        >
          <dt style="font-family: var(--font-mono); font-size: 0.9rem; color: var(--color-text);">
            {{ item.name }}
          </dt>
          <dd style="margin: 0; font-size: 0.9rem; color: var(--color-muted); line-height: 1.5;">
            {{ item.note }}
          </dd>
        </div>
      </dl>
    </div>
  </div>
</template>

<script setup lang="ts">
const stack = [
  {
    label: 'What I work with daily',
    items: [
      { name: 'Drupal 11',     note: 'primary craft — building on it for 15+ years' },
      { name: 'Vue / Nuxt 3',  note: 'this site runs on it' },
      { name: 'Docker',        note: 'everything I touch lives in a container' },
      { name: 'GitHub Actions', note: 'automated the boring parts' },
      { name: 'PHP 8',         note: 'still here, still fast' },
    ],
  },
  {
    label: 'What I work with regularly',
    items: [
      { name: 'Traefik',    note: 'reverse proxy for everything on VPS' },
      { name: 'MariaDB',    note: 'Drupal primary database' },
      { name: 'Redis',      note: 'Drupal cache backend' },
      { name: 'Solr',       note: 'search infrastructure (including SAHO)' },
      { name: 'Linux',      note: 'Ubuntu server administration' },
      { name: 'Bash',       note: 'scripting and automation' },
      { name: 'TypeScript', note: 'Nuxt / frontend work' },
    ],
  },
  {
    label: 'What I\'ve worked with',
    items: [
      { name: 'Symfony',  note: '2019–2021' },
      { name: 'React',    note: 'occasional, prefer Vue' },
      { name: 'WordPress', note: 'migrating away — still maintaining 6 sites' },
      { name: 'Python',   note: 'AI-assisted metadata work at SAHO' },
    ],
  },
  {
    label: 'Currently learning',
    items: [
      { name: 'Rust',     note: 'for fun, not production (yet)' },
      { name: 'GraphQL',  note: 'next layer on the Drupal stack' },
    ],
  },
  {
    label: 'Retired',
    items: [
      { name: 'WordPress (primary)', note: 'not gone, just less interesting now' },
      { name: 'Drupal 7',            note: 'EOL in 2025 — finally' },
      { name: 'jQuery',              note: 'you know what you did' },
    ],
  },
]

useHead({ title: 'Stack — Mads Nørgaard' })
</script>
