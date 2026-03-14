// GET /api/drupal/work
// Returns work experience nodes sorted by start_date descending

import type { DrupalWorkEntry } from '~/types/drupal'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const base = config.drupalBaseUrl

  const url = [
    `${base}/jsonapi/node/work_experience`,
    '?include=field_key_technologies',
    '&filter[status]=1',
    '&sort=-field_start_date',
    '&page[limit]=20',
  ].join('')

  const data = await $fetch<any>(url, {
    headers: { Accept: 'application/vnd.api+json' },
  })

  const included = data?.included ?? []

  return (data?.data ?? []).map((node: any): DrupalWorkEntry => ({
    id: node.id,
    roleTitle: node.attributes?.title ?? '',
    employer: node.attributes?.field_employer ?? '',
    employerUrl: node.attributes?.field_employer_url?.uri ?? undefined,
    startDate: node.attributes?.field_start_date ?? '',
    endDate: node.attributes?.field_end_date ?? undefined,
    isCurrent: node.attributes?.field_is_current ?? false,
    description: node.attributes?.body?.value ?? '',
    type: node.attributes?.field_employment_type ?? 'employed',
    technologies: resolveTechnologies(node.relationships?.field_key_technologies?.data ?? [], included),
  }))
})

function resolveTechnologies(refs: any[], included: any[]) {
  return refs.map((ref: any) => {
    const term = included.find((i: any) => i.type === ref.type && i.id === ref.id)
    return {
      id: ref.id,
      name: term?.attributes?.name ?? '',
      slug: term?.attributes?.field_machine_name ?? slugify(term?.attributes?.name ?? ''),
      url: term?.attributes?.field_technology_url?.uri ?? undefined,
      color: term?.attributes?.field_tech_color ?? undefined,
    }
  })
}

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
