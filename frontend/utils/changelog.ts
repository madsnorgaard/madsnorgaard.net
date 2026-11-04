// Posts tagged "changelog" in Drupal are commit-log summaries. They stay
// published and linked but are noindexed and left out of the sitemap, so the
// writing section ranks on the real articles. Used by pages/writing/[slug].vue
// and server/api/__sitemap__/urls.ts.
export const CHANGELOG_TAG = 'changelog'

export function isChangelogTag(name: string | undefined | null): boolean {
  return (name ?? '').trim().toLowerCase() === CHANGELOG_TAG
}

export function isChangelogPost(post: { tags?: { name: string }[] } | null | undefined): boolean {
  return post?.tags?.some(t => isChangelogTag(t.name)) ?? false
}
