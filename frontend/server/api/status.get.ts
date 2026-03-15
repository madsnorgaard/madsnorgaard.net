// GET /api/status
// Aggregated live status block: GitHub last commit + languages + availability + last photo

import type { StatusBlock } from '~/types/status'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  const githubHeaders: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (config.githubToken) {
    githubHeaders['Authorization'] = `Bearer ${config.githubToken}`
  }

  // Run all fetches in parallel
  const [eventsRaw, reposRaw, aboutRaw, photoRaw] = await Promise.allSettled([
    $fetch<any[]>('https://api.github.com/users/madsnorgaard/events/public?per_page=30', {
      headers: githubHeaders,
    }),
    $fetch<any[]>('https://api.github.com/users/madsnorgaard/repos?sort=pushed&per_page=20', {
      headers: githubHeaders,
    }),
    $fetch<any>(`${config.drupalBaseUrl}/jsonapi/node/about?filter[status]=1&page[limit]=1`, {
      headers: { Accept: 'application/vnd.api+json' },
    }),
    $fetch<any>(`${config.photoSiteUrl}/wp-json/wp/v2/photos?per_page=1&orderby=date&order=desc&_fields=id,title,slug,link,meta`, {
      headers: { Accept: 'application/json' },
    }).catch(() => null),
  ])

  // Last commit
  let lastCommit: StatusBlock['lastCommit'] = null
  if (eventsRaw.status === 'fulfilled') {
    const pushEvent = eventsRaw.value.find((e: any) => e.type === 'PushEvent')
    if (pushEvent) {
      const commit = pushEvent.payload?.commits?.at(-1)
      lastCommit = {
        message: commit?.message?.split('\n')[0] ?? '',
        repo: pushEvent.repo?.name?.replace('madsnorgaard/', '') ?? '',
        timeAgo: timeAgo(new Date(pushEvent.created_at)),
      }
    }
  }

  // Active languages (top 3 from recent non-fork repos)
  let activeLanguages: string[] = []
  if (reposRaw.status === 'fulfilled') {
    const langs = reposRaw.value
      .filter((r: any) => !r.fork && r.language)
      .slice(0, 10)
      .map((r: any) => r.language as string)
    // Deduplicate, preserve order
    activeLanguages = [...new Set(langs)].slice(0, 3)
  }

  // Availability from Drupal about node
  let availability: StatusBlock['availability'] = 'available'
  let availabilityNote: string | undefined
  let location = 'Skanderborg, Denmark'
  let employer = 'Eksponent'
  if (aboutRaw.status === 'fulfilled') {
    const node = aboutRaw.value?.data?.[0]
    if (node) {
      availability = node.attributes?.field_availability ?? 'available'
      availabilityNote = node.attributes?.field_availability_note ?? undefined
      location = node.attributes?.field_location ?? location
      employer = node.attributes?.field_employer ?? employer
    }
  }

  // Last photo
  let lastPhoto: StatusBlock['lastPhoto'] = null
  if (photoRaw.status === 'fulfilled' && photoRaw.value) {
    const photos = Array.isArray(photoRaw.value) ? photoRaw.value : [photoRaw.value]
    const p = photos[0]
    if (p) {
      const num = p.meta?.archive_number
      lastPhoto = {
        title: p.title?.rendered ?? '',
        archiveNumber: num ? String(num).padStart(3, '0') : '',
        url: p.link ?? `https://photo.madsnorgaard.net/archive/${p.slug}`,
      }
    }
  }

  return {
    lastCommit,
    activeLanguages,
    lastPhoto,
    availability,
    availabilityNote,
    location,
    employer,
  } satisfies StatusBlock
})

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`
  const months = Math.floor(days / 30)
  return `${months} month${months > 1 ? 's' : ''} ago`
}
