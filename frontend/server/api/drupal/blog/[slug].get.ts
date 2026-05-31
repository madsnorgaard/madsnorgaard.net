// GET /api/drupal/blog/:slug
// Resolves a blog post by slug by scanning path aliases, then fetches full node by UUID

import type { DrupalBlogPost } from '~/types/drupal'

// Internal SSR host (config.drupalBaseUrl, e.g. http://drupal:80) is used to fetch
// JSON:API. Asset URLs returned to the browser must use the PUBLIC host instead.
const DRUPAL_PUBLIC_URL = process.env.DRUPAL_PUBLIC_URL || 'https://drupal.madsnorgaard.net'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const base = config.drupalBaseUrl
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug is required' })
  }

  // Resolve slug → UUID by scanning path aliases with pagination (Drupal default max is 50)
  let match: any = null
  let offset = 0
  const pageSize = 50

  while (!match) {
    const scan = await $fetch<any>(
      `${base}/jsonapi/node/article?filter[status]=1&page[limit]=${pageSize}&page[offset]=${offset}&fields[node--article]=id,path`,
      { headers: { Accept: 'application/vnd.api+json' } }
    ).catch(() => null)

    if (!scan?.data?.length) break

    match = scan.data.find((node: any) => {
      const alias = node.attributes?.path?.alias ?? ''
      return alias === `/article/${slug}` || alias === `/blog/${slug}`
    })

    if (scan.data.length < pageSize) break
    offset += pageSize
  }

  if (!match) {
    throw createError({ statusCode: 404, statusMessage: 'Post not found' })
  }

  const nodeId = match.id

  const data = await $fetch<any>(
    `${base}/jsonapi/node/article/${nodeId}?include=field_tags,field_image`,
    { headers: { Accept: 'application/vnd.api+json' } }
  ).catch(() => null)

  if (!data?.data) {
    throw createError({ statusCode: 404, statusMessage: 'Post not found' })
  }

  return transformNode(data.data, data.included ?? [])
})

function transformNode(node: any, included: any[]): DrupalBlogPost {
  const rawImg = resolveImage(node.relationships?.field_image, included)
  const coverImage = rawImg
    ? { ...rawImg, url: rawImg.url.startsWith('http') ? rawImg.url : `${DRUPAL_PUBLIC_URL}${rawImg.url}` }
    : undefined
  return {
    id: node.id,
    title: node.attributes?.title ?? '',
    teaser: node.attributes?.field_teaser ?? node.attributes?.body?.summary ?? '',
    body: node.attributes?.body?.processed ?? '',
    slug: node.attributes?.path?.alias?.replace(/^\/(blog|article)\//, '') ?? node.id,
    date: node.attributes?.created ?? '',
    coverImage,
    tags: resolveTags(node.relationships?.field_tags?.data ?? [], included),
    series: resolveSingleTerm(node.relationships?.field_series?.data, included),
  }
}

function resolveImage(rel: any, included: any[]) {
  // field_image on article is a direct file reference (not media entity)
  const ref = rel?.data
  if (!ref) return undefined
  const file = included.find((i: any) => i.type === ref.type && i.id === ref.id)
  if (!file) return undefined
  return {
    id: file.id,
    url: file.attributes?.uri?.url ?? '',
    alt: ref.meta?.alt ?? '',
    width: ref.meta?.width,
    height: ref.meta?.height,
  }
}

function resolveTags(refs: any[], included: any[]) {
  return refs.map((ref: any) => {
    const term = included.find((i: any) => i.type === ref.type && i.id === ref.id)
    return {
      id: ref.id,
      name: term?.attributes?.name ?? '',
      slug: term?.attributes?.path?.alias?.replace(/^\/tags\//, '') ?? term?.attributes?.name ?? ref.id,
    }
  })
}

function resolveSingleTerm(ref: any, included: any[]) {
  if (!ref) return undefined
  const term = included.find((i: any) => i.type === ref.type && i.id === ref.id)
  return term ? {
    id: ref.id,
    name: term.attributes?.name ?? '',
    slug: term.attributes?.path?.alias?.replace(/^\/series\//, '') ?? term.attributes?.name ?? ref.id,
  } : undefined
}
