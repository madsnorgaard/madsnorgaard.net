// GET /api/github/repos
// Returns public GitHub repos sorted by pushed_at

import type { GitHubRepo } from '~/types/github'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (config.githubToken) {
    headers['Authorization'] = `Bearer ${config.githubToken}`
  }

  const raw = await $fetch<any[]>(
    'https://api.github.com/users/madsnorgaard/repos?sort=pushed&per_page=30&type=public',
    { headers }
  )

  return raw
    .filter((r) => !r.fork)
    .map((r): GitHubRepo => ({
      id: r.id,
      name: r.name,
      description: r.description,
      htmlUrl: r.html_url,
      homepage: r.homepage,
      language: r.language,
      stars: r.stargazers_count,
      updatedAt: r.pushed_at,
      topics: r.topics ?? [],
      isPrivate: r.private,
      isFork: r.fork,
    }))
})
