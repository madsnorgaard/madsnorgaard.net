<template>
  <div class="container" style="padding-top: 4rem;">
    <h1 class="text-display text-display--section" style="margin-bottom: 1rem;">Archive</h1>
    <p class="text-mono" style="color: var(--color-muted); margin-bottom: 2rem;">
      Documentary photography collections
    </p>

    <!-- Category filter -->
    <div v-if="categories.length" style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 2rem;">
      <NuxtLink
        to="/archive"
        class="filter-pill"
        :class="{ 'filter-pill--active': !currentCat }"
      >All</NuxtLink>
      <NuxtLink
        v-for="cat in categories"
        :key="cat.slug"
        :to="`/archive?cat=${cat.slug}`"
        class="filter-pill"
        :class="{ 'filter-pill--active': currentCat === cat.slug }"
      >{{ cat.name }}</NuxtLink>
    </div>

    <!-- Project collections grid -->
    <div v-if="data?.projects?.length" class="collection-grid">
      <NuxtLink
        v-for="project in data.projects"
        :key="project.id"
        :to="`/proj/${project.slug}`"
        class="collection-grid__item"
      >
        <div class="collection-grid__image-wrap">
          <img
            v-if="project.featuredImage?.src"
            :src="project.featuredImage.src"
            :alt="project.featuredImage.alt"
            loading="lazy"
            class="collection-grid__image"
          />
        </div>
        <div class="collection-grid__overlay">
          <span class="collection-grid__title">{{ project.title }}</span>
          <span v-if="project.categories?.length" class="collection-grid__cat">{{ project.categories[0].name }}</span>
        </div>
      </NuxtLink>
    </div>
    <p v-else class="text-mono" style="color: var(--color-muted); padding: 3rem 0;">
      No collections in the archive yet.
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
  return { path: '/archive', query: q }
}

const firstImage = computed(() => data.value?.projects?.[0]?.featuredImage?.src || '')

useHead({
  title: 'Archive | Mads Nørgaard',
  meta: [
    { name: 'description',         content: 'Documentary photography archive by Mads Nørgaard. Cape Town, Johannesburg, Denmark and beyond.' },
    { property: 'og:title',        content: 'Archive | Mads Nørgaard' },
    { property: 'og:description',  content: 'Documentary photography collections from South Africa, Denmark and beyond' },
    { property: 'og:image',        content: firstImage },
    { property: 'og:url',          content: 'https://madsnorgaard.net/archive' },
    { property: 'og:type',         content: 'website' },
    { name: 'twitter:card',        content: 'summary_large_image' },
    { name: 'twitter:title',       content: 'Archive | Mads Nørgaard' },
    { name: 'twitter:description', content: 'Documentary photography collections' },
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

.collection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.collection-grid__item {
  position: relative;
  overflow: hidden;
  background: var(--color-surface);
  text-decoration: none;
}

.collection-grid__image-wrap {
  aspect-ratio: 3/2;
  overflow: hidden;
}

.collection-grid__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 400ms ease;
}

.collection-grid__item:hover .collection-grid__image {
  transform: scale(1.04);
}

.collection-grid__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 1rem;
  background: linear-gradient(transparent 40%, rgba(0, 0, 0, 0.75));
}

.collection-grid__title {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.3;
}

.collection-grid__cat {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 0.25rem;
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
  transition: opacity 150ms;
}

.pagination__link:hover {
  opacity: 0.7;
}

.pagination__info {
  font-size: 0.8rem;
  color: var(--color-muted);
}
</style>
