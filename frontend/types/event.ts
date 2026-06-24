// Types for the event-photo wall (Cold Turkey Cape Town and future events).
// Sourced from the event-archive WordPress plugin via the Nuxt BFF.

import type { PhotoImages, TaxonomyTerm } from './photo'

export interface EventPhoto {
  id: number
  images: PhotoImages | null
  likeCount: number
  thereCount: number
  captureDate: string | null
  setSlug: string | null
}

/** One justified row of the photo wall: tiles share a height and span full width. */
export interface WallRow {
  height: number
  items: { photo: EventPhoto; index: number; width: number }[]
}

export interface EventPhotoListResponse {
  photos: EventPhoto[]
  total: number
  totalPages: number
  page: number
  perPage: number
}

// A "night" - a child term under the event's parent term.
export interface EventSet extends TaxonomyTerm {
  parent: number
}

// A moderated guestbook memory left on a night.
export interface EventNote {
  id: number
  name: string
  message: string
  date: string | null
}
