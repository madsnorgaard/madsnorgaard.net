<template>
  <div class="container" style="padding-top: 4rem;">
    <h1 class="text-display text-display--section" style="margin-bottom: 1rem;">Portfolio</h1>
    <p class="text-mono" style="color: var(--color-muted); margin-bottom: 2rem;">
      Photography projects
    </p>

    <!-- Category filter -->
    <div v-if="categories.length" style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 2rem;">
      <NuxtLink
        to="/proj"
        class="filter-pill"
        :class="{ 'filter-pill--active': !currentCat }"
      >All</NuxtLink>
      <NuxtLink
        v-for="cat in categories"
        :key="cat.slug"
        :to="`/proj?cat=${cat.slug}`"
        class="filter-pill"
        :class="{ 'filter-pill--active': currentCat === cat.slug }"
      >{{ cat.name }}</NuxtLink>
    </div>

    <!-- Project grid -->
    <div v-if="data?.projects?.length" class="project-grid">
      <NuxtLink
        v-for="project in data.projects"
        :key="project.id"
        :to="`/proj/${project.slug}`"
        class="project-grid__item"
      >
        <div v-if="project.featuredImage?.src" class="project-grid__image-wrap">
          <img
            :src="project.featuredImage.src"
            :alt="project.featuredImage.alt"
            loading="lazy"
            class="project-grid__image"
          />
        </div>
        <div class="project-grid__info">
          <h2 class="project-grid__title">{{ project.title }}</h2>
          <p v-if="project.excerpt" class="project-grid__excerpt">{{ project.excerpt }}</p>
        </div>
      </NuxtLink>
    </div>
    <p v-else class="text-mono" style="color: var(--color-muted); padding: 3rem 0;">
      No projects yet.
    </p>

    <!-- Pagination -->
    <div v-if="data && data.totalPages > 1" class="pagination">
      <NuxtLink
        v-if="currentPage > 1"
        :to="pageLink(currentPage - 1)"
        class="pagination__link"
      >Previous</NuxtLink>
      <span class="pagination__info text-mono">
        Page {{ currentPage }} of {{ data.totalPages }}
      </span>
      <NuxtLink
        v-if="currentPage < data.totalPages"
        :to="pageLink(currentPage + 1)"
        class="pagination__link"
      >Next</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

const currentPage = computed(() => Number(route.query.page) || 1)
const currentCat = computed(() => route.query.cat as string | undefined)

const { data } = await useFetch<any>('/api/wp/projects', {
  query: computed(() => ({
    page: currentPage.value,
    per_page: 12,
    ...(currentCat.value ? { project_cat: currentCat.value } : {}),
  })),
})

// Collect unique categories from fetched projects
const categories = computed(() => {
  const map = new Map<string, { name: string; slug: string }>()
  data.value?.projects?.forEach((p: any) =>
    p.categories?.forEach((c: any) => map.set(c.slug, c))
  )
  return [...map.values()]
})

function pageLink(page: number) {
  const q: Record<string, string> = { page: String(page) }
  if (currentCat.value) q.cat = currentCat.value
  return { path: '/proj', query: q }
}

const firstImage = computed(() => data.value?.projects?.[0]?.featuredImage?.src || '')

useHead({
  title: 'Portfolio | Mads Nørgaard',
  meta: [
    { name: 'description',         content: 'Documentary photography portfolio by Mads Nørgaard' },
    { property: 'og:title',        content: 'Portfolio | Mads Nørgaard' },
    { property: 'og:description',  content: 'Documentary photography portfolio - assignments, editorial and personal work' },
    { property: 'og:image',        content: firstImage },
    { property: 'og:url',          content: 'https://madsnorgaard.net/proj' },
    { property: 'og:type',         content: 'website' },
    { name: 'twitter:card',        content: 'summary_large_image' },
    { name: 'twitter:title',       content: 'Portfolio | Mads Nørgaard' },
    { name: 'twitter:description', content: 'Documentary photography portfolio' },
    { name: 'twitter:image',       content: firstImage },
  ],
})
</script>

<style scoped>
.filter-pill {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  padding: 0.25em 0.75em;
  border: 1px solid var(--color-border);
  color: var(--color-muted);
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  transition: all 150ms;
}

.filter-pill:hover,
.filter-pill--active {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
  gap: 1.5rem;
}

.project-grid__item {
  text-decoration: none;
  transition: opacity 150ms;
}

.project-grid__item:hover {
  opacity: 0.85;
}

.project-grid__image-wrap {
  aspect-ratio: 3/2;
  overflow: hidden;
  background: var(--color-surface);
  margin-bottom: 0.75rem;
}

.project-grid__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 300ms ease;
}

.project-grid__item:hover .project-grid__image {
  transform: scale(1.03);
}

.project-grid__title {
  font-family: var(--font-display);
  font-size: 1.125rem;
  margin: 0 0 0.25rem;
}

.project-grid__excerpt {
  color: var(--color-muted);
  font-size: 0.85rem;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 3rem 0;
}

.pagination__link {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--color-accent);
  text-decoration: none;
}

.pagination__link:hover { opacity: 0.7; }

.pagination__info {
  font-size: 0.8rem;
  color: var(--color-muted);
}
</style>
