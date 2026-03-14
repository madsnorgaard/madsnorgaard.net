// Composable for GitHub public repos

import type { GitHubRepo } from '~/types/github'

export function useGitHub() {
  async function getRepos() {
    return await $fetch<GitHubRepo[]>('/api/github/repos')
  }

  return { getRepos }
}
