// Photographer credit for the ImageObject schema on photo pages.
// Google Images reads creator, creditText and copyrightNotice for its image
// metadata panel, and the bare name is shared with a fashion brand, so every
// photo carries the person with a link back to the site-level Person node.
// Used by pages/proj/[slug].vue and pages/archive/[slug].vue.

export const PHOTOGRAPHER = {
  '@type': 'Person',
  '@id': 'https://madsnorgaard.net/#identity',
  name: 'Mads Nørgaard',
  url: 'https://madsnorgaard.net',
} as const

export function photoCredit() {
  return {
    creator: PHOTOGRAPHER,
    copyrightHolder: PHOTOGRAPHER,
    creditText: 'Mads Nørgaard',
    copyrightNotice: 'Mads Nørgaard',
  }
}

/** Four-digit year out of a date string, or undefined. */
export function yearOf(date: string | null | undefined): string | undefined {
  return date?.match(/\b(19|20)\d{2}\b/)?.[0]
}

/** An ISO-ish date only when it actually parses; schema.org dateCreated is a Date. */
export function isoDateOrUndefined(date: string | null | undefined): string | undefined {
  if (!date) return undefined
  return Number.isNaN(Date.parse(date)) ? undefined : date
}

export interface ContentImage {
  url: string
  alt: string
}

const IMAGE_URL = /\.(jpe?g|png|gif|webp|avif)(\?.*)?$/i

/**
 * Image candidates out of WordPress block HTML, on the server. The gallery
 * component parses the same HTML with DOMParser, which only exists in the
 * browser; this is the regex equivalent for the SSR schema. An <img> wrapped in
 * a link to an image file reports the link target (the full-size original),
 * otherwise its src.
 */
export function extractContentImages(html: string, seed: ContentImage[] = [], limit = 50): ContentImage[] {
  const out: ContentImage[] = []
  const seen = new Set<string>()
  const push = (img: ContentImage) => {
    if (!img.url || seen.has(img.url) || out.length >= limit) return
    seen.add(img.url)
    out.push(img)
  }
  seed.forEach(push)
  const re = /(?:<a\b[^>]*\bhref="([^"]*)"[^>]*>\s*)?<img\b([^>]*)>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const attrs = m[2]
    const src = attrs.match(/\bsrc="([^"]*)"/i)?.[1] ?? ''
    const alt = attrs.match(/\balt="([^"]*)"/i)?.[1] ?? ''
    const href = m[1] ?? ''
    push({ url: IMAGE_URL.test(href) ? href : src, alt })
  }
  return out
}
