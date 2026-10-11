<template>
  <div class="container lab">
    <p class="text-label lab__kicker">
      <NuxtLink to="/lab">Lab</NuxtLink> / 04
    </p>
    <h1 class="text-display text-display--section lab__title">
      Born here, won there
    </h1>
    <p class="lab__intro">
      Every Nobel laureate has two places attached: where they were born and where they were
      working when the prize came. <strong>Draw a line between the two</strong> and you get a map of where
      talent grows and where it ends up. South Africa grows plenty of it. Its scientists mostly did their prize-winning work somewhere else.
    </p>

    <ClientOnly>
      <LabNobelFlows v-if="rows.length && world" :rows="rows" :world="world" />
      <div v-else-if="failed" class="lab-error">
        The Nobel Prize API did not answer just now. Try again in a minute.
      </div>
      <div v-else class="lab-placeholder lab-placeholder--wide" />
      <template #fallback>
        <div class="lab-placeholder lab-placeholder--wide" />
      </template>
    </ClientOnly>

    <section class="nobel-peace">
      <h2 class="text-label">Five Peace Prizes, one country</h2>
      <p class="nobel-peace__lede">
        South Africa's science laureates left. Its Peace laureates are the opposite story: the prize came to South
        Africa because of what happened in South Africa. Five South Africans have won it - more than any
        other country in Africa. Four came out of the fight against apartheid. The fifth, in 2026, came out of
        the courtroom.
      </p>
      <ol class="nobel-peace__line">
        <li v-for="p in peace" :key="p.name">
          <span class="nobel-peace__year">{{ p.year }}</span>
          <div>
            <a :href="p.url" target="_blank" rel="noopener noreferrer" class="nobel-peace__name">{{ p.name }}</a>
            <p>{{ p.note }}</p>
          </div>
        </li>
      </ol>
      <p class="nobel-peace__more">
        More at SAHO:
        <a href="https://www.sahistory.org.za/article/nobel-prizes-and-south-african-laureates" target="_blank" rel="noopener noreferrer">Nobel Prizes and South African laureates</a>
      </p>
    </section>

    <div class="lab__body">
      <section>
        <h2 class="text-label">How it is counted</h2>
        <p>
          One row per prize, not per person, so Marie Curie counts twice. Organisations are left out because
          they were not born anywhere. Countries use <strong>today's borders</strong>: someone born in
          Breslau in 1900 counts as born in Poland.
        </p>
        <p>
          That rule moves one South African off this map. <strong>Albert Luthuli</strong> was born in
          Bulawayo in 1898, so the Nobel Foundation files him under Zimbabwe, and his dot sits there.
          Pick Zimbabwe to find him.
        </p>
        <p>
          "Working in" is the first affiliation the Nobel Foundation lists for the prize. Peace and Literature
          laureates usually have none, so the arcs are mostly science and economics.
        </p>
      </section>
      <section>
        <h2 class="text-label">Try this</h2>
        <p>
          Switch to Denmark. Click the USA on the map and watch the gold lines arrive from everywhere.
          Then pick <strong>Everyone</strong> and find the thickest arc on the map.
        </p>
      </section>
    </div>

    <p class="lab__source">
      Data: the official <a href="https://www.nobelprize.org/about/developer-zone-2/" target="_blank" rel="noopener noreferrer">Nobel Prize API</a>,
      refreshed daily. Map: Natural Earth 1:110m (public domain).
      <a href="https://github.com/madsnorgaard/madsnorgaard.net/tree/main/frontend/components/lab" target="_blank" rel="noopener noreferrer">Source on GitHub</a>
    </p>
  </div>
</template>

<script setup lang="ts">
import type { NobelRow, WorldMap } from '~/types/lab'

useSeoMeta({
  title: 'Born here, won there · Lab',
  description: 'Every Nobel laureate drawn as a line from birth country to the country they won from. South Africa, Denmark and the rest of the world.',
})

const { data: nobel, error } = useFetch<{ rows: NobelRow[] }>('/api/lab/nobel', { server: false })
const { data: world } = useFetch<WorldMap>('/lab-data/world.json', { server: false })

const rows = computed(() => nobel.value?.rows ?? [])
const failed = computed(() => !!error.value)

const peace = [
  {
    year: '1960',
    name: 'Albert Luthuli',
    note: 'President-General of the ANC. The 1960 prize was handed over in December 1961, while he was banned and confined to Groutville.',
    url: 'https://www.sahistory.org.za/archive/albert-john-luthuli-1898-1967',
  },
  {
    year: '1984',
    name: 'Desmond Tutu',
    note: 'Honoured as a unifying figure in the non-violent campaign against apartheid, in the middle of the township uprisings.',
    url: 'https://www.sahistory.org.za/people/archbishop-emeritus-desmond-mpilo-tutu',
  },
  {
    year: '1993',
    name: 'Nelson Mandela',
    note: 'Shared with de Klerk for the work of ending apartheid peacefully and laying the ground for a democratic South Africa.',
    url: 'https://www.sahistory.org.za/people/nelson-rolihlahla-mandela',
  },
  {
    year: '1993',
    name: 'F. W. de Klerk',
    note: 'The last apartheid-era president, who unbanned the liberation movements in 1990 and released Mandela.',
    url: 'https://www.sahistory.org.za/people/frederik-willem-de-klerk',
  },
  {
    year: '2026',
    name: 'Navi Pillay',
    note: 'Born in Durban in 1941. Started out defending anti-apartheid activists, went on to lead the UN tribunal for the Rwandan genocide and serve as UN High Commissioner for Human Rights. Honoured for making sure war crimes and genocide are prosecuted. The first South African woman to win the Peace Prize.',
    url: 'https://www.sahistory.org.za/people/navanethem-navi-pillay',
  },
]
</script>

<style scoped>
.nobel-peace {
  margin-top: 4rem;
  padding-top: 2.5rem;
  border-top: 1px solid var(--color-border);
}
.nobel-peace__lede {
  max-width: 640px;
  color: var(--color-muted);
  line-height: 1.7;
  margin: 1rem 0 2rem;
}
.nobel-peace__line {
  list-style: none;
  margin: 0;
  padding: 0;
  border-left: 1px solid var(--color-border);
}
.nobel-peace__line li {
  display: grid;
  grid-template-columns: 5rem minmax(0, 1fr);
  gap: 1rem;
  padding: 0 0 1.75rem 1.25rem;
  position: relative;
}
.nobel-peace__line li::before {
  content: '';
  position: absolute;
  left: -5px;
  top: 0.55rem;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #E8C26A;
}
.nobel-peace__year {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  padding-top: 0.25rem;
}
.nobel-peace__name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.4rem;
  border-bottom: 1px solid transparent;
}
.nobel-peace__name:hover {
  border-color: var(--color-accent);
}
.nobel-peace__line p {
  margin: 0.25rem 0 0;
  color: var(--color-muted);
  max-width: 560px;
  line-height: 1.6;
}
.nobel-peace__more {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-muted);
}
.nobel-peace__more a {
  border-bottom: 1px solid var(--color-accent);
  color: var(--color-text);
}
.lab-error {
  padding: 3rem 1.5rem;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--color-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}
.lab-placeholder--wide {
  aspect-ratio: 2 / 1;
}
</style>
