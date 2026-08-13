/** One renderable size of a WP image (uncropped, proportional). */
export interface WpImageVariant {
  url: string
  width: number
  height: number
}

/** Image data from WP featured media. */
export interface PhotoImages {
  thumbnail: string | null
  medium: string | null
  large: string | null
  full: string | null
  width: number | null
  height: number | null
  alt: string
  /**
   * Proportional size variants ascending by width, ending with the original.
   * Absent in SWR-cached responses that predate this field — consumers must
   * degrade to the flat fields above.
   */
  variants?: WpImageVariant[]
}

/** Shared featured-image shape for posts/stories/projects. */
export interface FeaturedImage {
  src: string | null
  alt: string
  width?: number | null
  height?: number | null
  variants?: WpImageVariant[]
}

/** A taxonomy term (series or subject). */
export interface TaxonomyTerm {
  id: number
  name: string
  slug: string
  count: number
  description?: string
  parent?: number
}

/** A single photo from the archive. */
export interface Photo {
  id: number
  title: string
  slug: string
  archiveNumber: string | null
  location: string | null
  dateTaken: string | null
  camera: string | null
  excerpt: string
  content?: string
  images: PhotoImages | null
  series: TaxonomyTerm[]
  subjects: TaxonomyTerm[]
}

/** Paginated photo list response. */
export interface PhotoListResponse {
  photos: Photo[]
  total: number
  totalPages: number
  page: number
  perPage: number
}

/** A resolved photo reference used inside stories. */
export interface ResolvedPhoto {
  id: number
  title: string
  slug: string
  archiveNumber: string | null
  location: string | null
  dateTaken: string | null
  camera: string | null
  excerpt: string
  images: Record<string, { url: string; width: number; height: number }>
}

/** A single block from a story's blocks_data. */
export interface StoryBlock {
  type:
    | 'photo-embed'
    | 'photo-sequence'
    | 'pull-quote'
    | 'section-break'
    | 'paragraph'
    | 'heading'
    | 'list'
    | 'list-item'
    | 'image'
    | 'quote'
  attrs?: Record<string, any>
  content?: string
}

/** A single story (documentary essay). */
export interface Story {
  id: number
  title: string
  slug: string
  date: string
  excerpt: string
  featuredImage: FeaturedImage | null
  blocks: StoryBlock[]
  resolvedPhotos: Record<number, ResolvedPhoto>
  contentRendered: string
  series: TaxonomyTerm[]
  subjects: TaxonomyTerm[]
}

/** Story summary for list pages. */
export interface StorySummary {
  id: number
  title: string
  slug: string
  date: string
  excerpt: string
  featuredImage: FeaturedImage | null
  series: TaxonomyTerm[]
  subjects: TaxonomyTerm[]
}

/** Paginated story list response. */
export interface StoryListResponse {
  stories: StorySummary[]
  total: number
  totalPages: number
  page: number
  perPage: number
}

/** Series/subject detail page response. */
export interface TaxonomyPageResponse {
  term: TaxonomyTerm
  photos: Array<{
    id: number
    title: string
    slug: string
    archiveNumber: string | null
    images: PhotoImages | null
  }>
  photosTotal: number
  photosTotalPages: number
  stories: StorySummary[]
}
