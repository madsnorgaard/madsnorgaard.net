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
    `${base}/jsonapi/node/article`,
    '?include=field_tags,field_image',
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
    teaser: node.attributes?.body?.summary || truncate(node.attributes?.body?.value ?? '', 200),
    body: node.attributes?.body?.processed ?? '',
    slug: extractSlug(node.attributes?.path?.alias ?? node.id),
    date: node.attributes?.created ?? '',
    coverImage: undefined,
    tags: resolveTags(node.relationships?.field_tags?.data ?? [], included),
    series: undefined,
  }))

  return { posts, total, page, limit }
})

function extractSlug(alias: string) {
  return alias.replace(/^\/(blog|article)\//, '') || alias
}

function truncate(str: string, len: number) {
  const plain = str.replace(/<[^>]+>/g, '')
  return plain.length <= len ? plain : plain.slice(0, len).replace(/\s+\S*$/, '') + '…'
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
