// GitHub API type definitions

export interface GitHubRepo {
  id: number
  name: string
  description: string | null
  htmlUrl: string
  homepage: string | null
  language: string | null
  stars: number
  updatedAt: string
  topics: string[]
  isPrivate: boolean
  isFork: boolean
}

export interface GitHubEvent {
  type: string
  repoName: string
  commitMessage?: string
  createdAt: string
}
