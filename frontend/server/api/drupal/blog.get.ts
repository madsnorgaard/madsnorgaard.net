// GET /api/drupal/blog
// Query params: page (1-indexed), limit (default 10), tag

import type { DrupalBlogPost } from '~/types/drupal'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const base = config.drupalBaseUrl
  const query = getQuery(event)

  const page = Number(query.page ?? 1)
  const limit = Number(query.limit ?? 10)
  const offset = (page - 1) * limit

  const filters: string[] = ['filter[status]=1']
  if (query.tag) {
    filters.push(`filter[field_tags.name]=${query.tag}`)
  }

  const url = [
    `${base}/jsonapi/node/blog_post`,
    '?include=field_cover_image.field_media_image,field_tags,field_series',
    '&sort=-created',
    `&page[limit]=${limit}`,
    `&page[offset]=${offset}`,
    `&${filters.join('&')}`,
  ].join('')

  const data = await $fetch<any>(url, {
    headers: { Accept: 'application/vnd.api+json' },
  })

  const included = data?.included ?? []
  const total = data?.meta?.count ?? 0

  const posts = (data?.data ?? []).map((node: any): DrupalBlogPost => ({
    id: node.id,
    title: node.attributes?.title ?? '',
    teaser: node.attributes?.field_teaser ?? node.attributes?.body?.summary ?? '',
    body: node.attributes?.body?.processed ?? '',
    slug: extractSlug(node.attributes?.path?.alias ?? node.id),
    date: node.attributes?.created ?? '',
    coverImage: resolveImage(node.relationships?.field_cover_image?.data, included),
    tags: resolveTags(node.relationships?.field_tags?.data ?? [], included),
    series: resolveSingleTerm(node.relationships?.field_series?.data, included),
  }))

  return { posts, total, page, limit }
})

function extractSlug(alias: string) {
  return alias.replace(/^\/blog\//, '') || alias
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
      slug: term?.attributes?.path?.alias?.replace(/^\/tags\//, '') ?? ref.id,
    }
  })
}

function resolveSingleTerm(ref: any, included: any[]) {
  if (!ref) return undefined
  const term = included.find((i: any) => i.type === ref.type && i.id === ref.id)
  if (!term) return undefined
  return {
    id: ref.id,
    name: term.attributes?.name ?? '',
    slug: term.attributes?.path?.alias?.replace(/^\/series\//, '') ?? ref.id,
  }
}
