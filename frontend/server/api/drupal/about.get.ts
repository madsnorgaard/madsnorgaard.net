// GET /api/drupal/about
// Returns the single 'about' node from Drupal JSON:API

import type { DrupalAbout } from '~/types/drupal'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const base = config.drupalBaseUrl

  const url = `${base}/jsonapi/node/about?include=field_profile_image.field_media_image&filter[status]=1&page[limit]=1`

  const data = await $fetch<any>(url, {
    headers: {
      Accept: 'application/vnd.api+json',
    },
  })

  const node = data?.data?.[0]
  if (!node) {
    throw createError({ statusCode: 404, statusMessage: 'About node not found' })
  }

  const included = data?.included ?? []

  const profileImage = resolveImage(
    node.relationships?.field_profile_image?.data,
    included
  )

  return {
    intro: node.attributes?.body?.value ?? '',
    currentFocus: node.attributes?.field_current_focus ?? '',
    location: node.attributes?.field_location ?? '',
    profileImage,
    availability: node.attributes?.field_availability ?? 'available',
    availabilityNote: node.attributes?.field_availability_note ?? undefined,
  } satisfies DrupalAbout
})

function resolveImage(ref: any, included: any[]): DrupalAbout['profileImage'] {
  if (!ref) return undefined
  // ref is a media entity; find image file within included
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
