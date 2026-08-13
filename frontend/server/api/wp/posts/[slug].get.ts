// GET /api/wp/posts/:slug
// Returns a single WP standard post by slug with featured image and taxonomy terms.

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''

  if (!isValidSlug(slug)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid slug' })
  }

  const config = useRuntimeConfig(event)
  const base = config.photoSiteUrl

  const posts = await wpFetch<any[]>(
    `${base}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_embed=wp:featuredmedia,wp:term&status=publish`
  )

  const post = posts?.[0]
  if (!post) {
    throw createError({ statusCode: 404, statusMessage: 'Post not found' })
  }

  const media = post._embedded?.['wp:featuredmedia']?.[0]

  return {
    id: post.id,
    title: decodeEntities(post.title?.rendered ?? ''),
    slug: post.slug ?? '',
    date: post.date ?? '',
    content: await hydrateGalleryImages(post.content?.rendered ?? '', base),
    excerpt: stripTags(post.excerpt?.rendered ?? ''),
    featuredImage: extractFeaturedImage(media),
    categories: extractTermGroup(post, 'category'),
    tags: extractTermGroup(post, 'post_tag'),
  }
})

function extractTermGroup(post: any, taxonomy: string) {
  const groups = post._embedded?.['wp:term'] ?? []
  for (const group of groups) {
    if (Array.isArray(group) && group.length > 0 && group[0]?.taxonomy === taxonomy) {
      return group.map((t: any) => ({
        id: t.id,
        name: decodeEntities(t.name ?? ''),
        slug: t.slug ?? '',
      }))
    }
  }
  return []
}
