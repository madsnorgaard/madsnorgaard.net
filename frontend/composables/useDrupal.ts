// Composables for consuming the Drupal proxy API routes

import type { DrupalAbout, DrupalBlogPost, DrupalProject, DrupalWorkEntry } from '~/types/drupal'

export function useDrupal() {
  async function getBlogPosts(options?: { page?: number; limit?: number; tag?: string }) {
    return await $fetch<{ posts: DrupalBlogPost[]; total: number; page: number; limit: number }>(
      '/api/drupal/blog',
      {
        query: {
          page: options?.page ?? 1,
          limit: options?.limit ?? 10,
          ...(options?.tag ? { tag: options.tag } : {}),
        },
      }
    )
  }

  async function getBlogPost(slug: string) {
    return await $fetch<DrupalBlogPost>(`/api/drupal/blog/${slug}`)
  }

  async function getProjects(options?: { featured?: boolean; category?: string }) {
    return await $fetch<DrupalProject[]>('/api/drupal/projects', {
      query: {
        ...(options?.featured !== undefined ? { featured: String(options.featured) } : {}),
        ...(options?.category ? { category: options.category } : {}),
      },
    })
  }

  async function getWorkHistory() {
    return await $fetch<DrupalWorkEntry[]>('/api/drupal/work')
  }

  async function getAbout() {
    return await $fetch<DrupalAbout>('/api/drupal/about')
  }

  return { getBlogPosts, getBlogPost, getProjects, getWorkHistory, getAbout }
}
