// Drupal JSON:API type definitions

export interface DrupalImage {
  id: string
  url: string
  alt: string
  width?: number
  height?: number
}

export interface DrupalTag {
  id: string
  name: string
  slug: string
}

export interface DrupalTechnology {
  id: string
  name: string
  slug: string
  url?: string
  color?: string
}

export interface DrupalBlogPost {
  id: string
  title: string
  teaser: string
  body: string
  slug: string
  date: string
  coverImage?: DrupalImage
  tags: DrupalTag[]
  series?: DrupalTag
  // Canonical oEmbed video URL from field_video (media--remote_video). Undefined
  // when the article has no video. See server/api/drupal/blog/[slug].get.ts.
  videoUrl?: string
}

export interface DrupalProject {
  id: string
  title: string
  shortCode?: string
  tagline: string
  description: string
  coverImage?: DrupalImage
  githubUrl?: string
  liveUrl?: string
  technologies: DrupalTechnology[]
  status: 'active' | 'archived' | 'client-work'
  category: 'professional' | 'civic' | 'open-source' | 'personal'
  featured: boolean
  sortOrder: number
}

export interface DrupalWorkEntry {
  id: string
  roleTitle: string
  employer: string
  employerUrl?: string
  startDate: string
  endDate?: string
  isCurrent: boolean
  description: string
  type: 'employed' | 'freelance' | 'contract' | 'volunteer'
  technologies: DrupalTechnology[]
}

export interface DrupalAbout {
  intro: string
  currentFocus: string
  location: string
  profileImage?: DrupalImage
  availability: 'available' | 'busy' | 'not-available'
  availabilityNote?: string
}
