// Live status block type

export interface StatusBlock {
  lastCommit: {
    message: string
    repo: string
    timeAgo: string
  } | null
  activeLanguages: string[]
  lastPhoto: {
    title: string
    archiveNumber: string
    url: string
  } | null
  availability: 'available' | 'busy' | 'not-available'
  availabilityNote?: string
  location: string
  employer: string
}
