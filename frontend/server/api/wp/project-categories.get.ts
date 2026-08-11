// GET /api/wp/project-categories
// Returns all non-empty project categories (project_cat taxonomy) used for
// the filter pills on /archive and /proj. The taxonomy's REST base on the
// WP side is "project-categories".

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const base = config.photoSiteUrl

  const terms = await wpFetch<any[]>(
    `${base}/wp-json/wp/v2/project-categories?per_page=50&hide_empty=true&orderby=count&order=desc&_fields=id,name,slug,count`
  )

  const categories = (Array.isArray(terms) ? terms : []).map((t) => ({
    id: t.id,
    name: decodeEntities(t.name ?? ''),
    slug: t.slug ?? '',
    count: t.count ?? 0,
  }))

  return { categories }
})
