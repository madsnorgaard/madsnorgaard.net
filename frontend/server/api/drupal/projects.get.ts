// GET /api/drupal/projects
// Query params: featured=true, category=civic|open-source|personal|professional

import type { DrupalProject } from '~/types/drupal'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const base = config.drupalBaseUrl
  const query = getQuery(event)

  const filters: string[] = ['filter[status]=1']

  if (query.featured === 'true') {
    filters.push('filter[field_featured]=1')
  }
  const VALID_CATEGORIES = ['civic', 'open-source', 'personal', 'professional']
  if (query.category && typeof query.category === 'string' && VALID_CATEGORIES.includes(query.category)) {
    filters.push(`filter[field_project_category]=${encodeURIComponent(query.category)}`)
  }

  const url = [
    `${base}/jsonapi/node/project`,
    '?include=field_cover_image.field_media_image,field_technologies',
    '&sort=field_sort_order',
    '&page[limit]=50',
    `&${filters.join('&')}`,
  ].join('')

  const data = await $fetch<any>(url, {
    headers: { Accept: 'application/vnd.api+json' },
  })

  const included = data?.included ?? []

  return (data?.data ?? []).map((node: any): DrupalProject => ({
    id: node.id,
    title: node.attributes?.title ?? '',
    tagline: node.attributes?.field_tagline ?? '',
    description: node.attributes?.field_description?.value ?? '',
    coverImage: resolveImage(node.relationships?.field_cover_image?.data, included),
    githubUrl: node.attributes?.field_github_url?.uri ?? undefined,
    liveUrl: node.attributes?.field_live_url?.uri ?? undefined,
    technologies: resolveTechnologies(node.relationships?.field_technologies?.data ?? [], included),
    status: node.attributes?.field_project_status ?? 'active',
    category: node.attributes?.field_project_category ?? 'personal',
    featured: node.attributes?.field_featured ?? false,
    sortOrder: node.attributes?.field_sort_order ?? 99,
  }))
})

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
    width: file.attributes?.width,
    height: file.attributes?.height,
  }
}

function resolveTechnologies(refs: any[], included: any[]) {
  return refs.map((ref: any) => {
    const term = included.find((i: any) => i.type === ref.type && i.id === ref.id)
    return {
      id: ref.id,
      name: term?.attributes?.name ?? '',
      slug: slugify(term?.attributes?.name ?? ''),
      url: term?.attributes?.field_technology_url?.uri ?? undefined,
      color: term?.attributes?.field_tech_color ?? undefined,
    }
  })
}

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
