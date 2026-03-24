// GET /api/status
// Aggregated live status block: GitHub last commit + languages + availability + last photo

import type { StatusBlock } from '~/types/status'

async function fetchLatestPhoto(photoBase: string): Promise<any> {
  for (const cpt of ['photos', 'posts']) {
    const data = await $fetch<any[]>(
      `${photoBase}/wp-json/wp/v2/${cpt}?per_page=1&orderby=date&order=desc&_fields=id,title,slug,link,meta`,
      { headers: { Accept: 'application/json' } }
    ).catch(() => null)
    if (Array.isArray(data) && data.length) return data[0]
  }
  return null
}

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
  const [eventsRaw, reposRaw, aboutRaw, photoRaw, ghStatusRaw] = await Promise.allSettled([
    $fetch<any[]>('https://api.github.com/users/madsnorgaard/events/public?per_page=30', {
      headers: githubHeaders,
    }),
    $fetch<any[]>('https://api.github.com/users/madsnorgaard/repos?sort=pushed&per_page=20', {
      headers: githubHeaders,
    }),
    $fetch<any>(`${config.drupalBaseUrl}/jsonapi/node/about?filter[status]=1&page[limit]=1`, {
      headers: { Accept: 'application/vnd.api+json' },
    }),
    fetchLatestPhoto(config.photoSiteUrl),
    $fetch<any>('https://api.github.com/graphql', {
      method: 'POST',
      headers: githubHeaders,
      body: JSON.stringify({
        query: `{ user(login:"madsnorgaard") { status { message indicatesLimitedAvailability } } }`,
      }),
    }),
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

  // Availability — GitHub profile status is source of truth; Drupal is fallback
  let availability: StatusBlock['availability'] = 'available'
  let availabilityNote: string | undefined
  let location = 'Skanderborg, Denmark'
  let employer = 'Eksponent'

  // Drupal provides location + employer (availability overridden below)
  if (aboutRaw.status === 'fulfilled') {
    const node = aboutRaw.value?.data?.[0]
    if (node) {
      location = node.attributes?.field_location ?? location
      employer = node.attributes?.field_employer ?? employer
      // Use Drupal availability only as last resort
      availability = node.attributes?.field_availability ?? availability
      availabilityNote = node.attributes?.field_availability_note ?? undefined
    }
  }

  // GitHub status is source of truth for availability.
  // isHireable is ignored — it means "job hunting" which is unrelated.
  // Only the busy/limited-availability flag matters; otherwise always available.
  if (ghStatusRaw.status === 'fulfilled') {
    const status = ghStatusRaw.value?.data?.user?.status
    if (status?.indicatesLimitedAvailability) {
      availability = 'busy'
      availabilityNote = status.message ?? undefined
    } else {
      availability = 'available'
      availabilityNote = undefined
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
