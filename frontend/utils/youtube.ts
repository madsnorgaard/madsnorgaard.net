// Extract the 11-character YouTube video id from any common URL shape:
// watch?v=, youtu.be/, embed/, youtube-nocookie.com/embed/. Stray query
// params (for example ?si=, &t=) are ignored. Returns null for anything that
// is not a recognised YouTube URL, so callers can degrade gracefully.
export function youTubeId(url: string): string | null {
  if (!url) return null
  const patterns = [
    /youtube\.com\/watch\?v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})/,
  ]
  for (const re of patterns) {
    const m = url.match(re)
    if (m) return m[1]
  }
  return null
}
