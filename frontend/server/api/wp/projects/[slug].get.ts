// GET /api/wp/projects/:slug
// Returns a single project by slug with full content (including gallery HTML).

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''

  if (!isValidSlug(slug)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid slug' })
  }

  const config = useRuntimeConfig(event)
  const base = config.photoSiteUrl

  const posts = await wpFetch<any[]>(
    `${base}/wp-json/wp/v2/project?slug=${encodeURIComponent(slug)}&_embed=wp:featuredmedia,wp:term&status=publish`
  )

  const post = posts?.[0]
  if (!post) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }

  const media = post._embedded?.['wp:featuredmedia']?.[0]

  return {
    id: post.id,
    title: decodeEntities(post.title?.rendered ?? ''),
    slug: post.slug ?? '',
    date: post.date ?? '',
    excerpt: stripTags(post.excerpt?.rendered ?? ''),
    content: post.content?.rendered ?? '',
    featuredImage: extractFeaturedImage(media),
    categories: extractProjectCats(post),
  }
})

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
