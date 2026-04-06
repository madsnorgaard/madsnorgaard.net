export function formatDate(dateString: string): string {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function readingTime(html: string): number {
  if (!html) return 1
  const words = html.replace(/<[^>]+>/g, '').trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}
