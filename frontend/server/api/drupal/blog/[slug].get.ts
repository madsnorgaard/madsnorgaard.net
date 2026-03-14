// GET /api/drupal/blog/:slug
// Resolves a blog post by slug (path alias) via decoupled_router, then fetches the node

import type { DrupalBlogPost } from '~/types/drupal'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const base = config.drupalBaseUrl
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug is required' })
  }

  // Use decoupled_router to resolve the path alias → node UUID
  const routerPath = `/blog/${slug}`
  const routeData = await $fetch<any>(
    `${base}/router/translate-path?path=${encodeURIComponent(routerPath)}`,
    { headers: { Accept: 'application/json' } }
  ).catch(() => null)

  let nodeId: string | null = null

  if (routeData?.entity?.uuid) {
    nodeId = routeData.entity.uuid
  } else {
    // Fallback: query by path alias directly via JSON:API filter
    const fallback = await $fetch<any>(
      `${base}/jsonapi/node/blog_post?filter[path.alias]=/blog/${encodeURIComponent(slug)}&filter[status]=1&page[limit]=1&include=field_cover_image.field_media_image,field_tags,field_series`,
      { headers: { Accept: 'application/vnd.api+json' } }
    ).catch(() => null)

    if (fallback?.data?.[0]) {
      return transformNode(fallback.data[0], fallback.included ?? [])
    }

    throw createError({ statusCode: 404, statusMessage: 'Post not found' })
  }

  const data = await $fetch<any>(
    `${base}/jsonapi/node/blog_post/${nodeId}?include=field_cover_image.field_media_image,field_tags,field_series`,
    { headers: { Accept: 'application/vnd.api+json' } }
  )

  return transformNode(data.data, data.included ?? [])
})

function transformNode(node: any, included: any[]): DrupalBlogPost {
  return {
    id: node.id,
    title: node.attributes?.title ?? '',
    teaser: node.attributes?.field_teaser ?? node.attributes?.body?.summary ?? '',
    body: node.attributes?.body?.processed ?? '',
    slug: node.attributes?.path?.alias?.replace(/^\/blog\//, '') ?? node.id,
    date: node.attributes?.created ?? '',
    coverImage: resolveImage(node.relationships?.field_cover_image?.data, included),
    tags: resolveTags(node.relationships?.field_tags?.data ?? [], included),
    series: resolveSingleTerm(node.relationships?.field_series?.data, included),
  }
}

function resolveImage(ref: any, included: any[]) {
  if (!ref) return undefined
  const media = included.find((i: any) => i.type === ref.type && i.id === ref.id)
  if (!media) return undefined
  const fileRef = media.relationships?.field_media_image?.data
  if (!fileRef) return undefined
  const file = included.find((i: any) => i.type === fileRef.type && i.id === fileRef.id)
  if (!file) return undefined
  return {
    id: file.id,
    url: file.attributes?.uri?.url ?? '',
    alt: media.attributes?.field_media_image?.meta?.alt ?? '',
  }
}

function resolveTags(refs: any[], included: any[]) {
  return refs.map((ref: any) => {
    const term = included.find((i: any) => i.type === ref.type && i.id === ref.id)
    return {
      id: ref.id,
      name: term?.attributes?.name ?? '',
      slug: ref.id,
    }
  })
}

function resolveSingleTerm(ref: any, included: any[]) {
  if (!ref) return undefined
  const term = included.find((i: any) => i.type === ref.type && i.id === ref.id)
  return term ? { id: ref.id, name: term.attributes?.name ?? '', slug: ref.id } : undefined
}
