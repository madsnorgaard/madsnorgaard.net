// GET /api/wp/projects
// Returns a paginated list of WP project CPT posts (photography portfolio).
// These are the legacy portfolio items from the mauer-stills-portfolio plugin.
//
// Query params:
//   page       - Page number (default 1)
//   per_page   - Items per page (1-24, default 12)
//   project_cat - Filter by project category slug

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const base = config.photoSiteUrl
  const query = getQuery(event)

  const page = clampInt(query.page, 1, 100, 1)
  const perPage = clampInt(query.per_page, 1, 24, 12)

  const params = new URLSearchParams({
    per_page: String(perPage),
    page: String(page),
    status: 'publish',
    orderby: 'date',
    order: 'desc',
    _embed: 'wp:featuredmedia,wp:term',
  })

  // WP filters taxonomies by rest_base ("project-categories") and term ID,
  // not by taxonomy name/slug - resolve the slug to its term ID first.
  if (query.project_cat && typeof query.project_cat === 'string' && isValidSlug(query.project_cat)) {
    const termId = await resolveProjectCat(base, query.project_cat)
    if (!termId) {
      return { projects: [], total: 0, totalPages: 0, page, perPage }
    }
    params.set('project-categories', String(termId))
  }

  const url = `${base}/wp-json/wp/v2/project?${params.toString()}`
  const { data: posts, total, totalPages } = await wpFetchWithHeaders<any[]>(url)

  const projects = (Array.isArray(posts) ? posts : []).map(toProject)

  return { projects, total, totalPages, page, perPage }
})

// slug -> term ID cache; terms are effectively static, avoid a WP roundtrip
// on every filtered request.
const catIdCache = new Map<string, number>()

async function resolveProjectCat(base: string, slug: string): Promise<number | null> {
  const cached = catIdCache.get(slug)
  if (cached) return cached
  const terms = await wpFetch<any[]>(
    `${base}/wp-json/wp/v2/project-categories?slug=${encodeURIComponent(slug)}&_fields=id`
  )
  const id = Array.isArray(terms) && terms[0]?.id ? Number(terms[0].id) : null
  if (id) catIdCache.set(slug, id)
  return id
}

function toProject(post: any) {
  const media = post._embedded?.['wp:featuredmedia']?.[0]
  return {
    id: post.id,
    title: decodeEntities(post.title?.rendered ?? ''),
    slug: post.slug ?? '',
    date: post.date ?? '',
    excerpt: stripTags(post.excerpt?.rendered ?? ''),
    featuredImage: media ? {
      src: media.source_url ?? null,
      alt: media.alt_text || '',
      width: media.media_details?.width ?? null,
      height: media.media_details?.height ?? null,
    } : null,
    categories: extractProjectCats(post),
  }
}

function extractProjectCats(post: any) {
  const terms = post._embedded?.['wp:term'] ?? []
  for (const group of terms) {
    if (Array.isArray(group) && group.length > 0 && group[0]?.taxonomy === 'project_cat') {
      return group.map((t: any) => ({
        id: t.id,
        name: decodeEntities(t.name ?? ''),
        slug: t.slug ?? '',
      }))
    }
  }
  return []
}
