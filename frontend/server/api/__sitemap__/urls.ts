// Dynamic sitemap source: fetches all published content slugs from Drupal + WP
// Includes image entries for Google Image indexing
import { defineSitemapEventHandler } from '#imports'

interface SitemapImage {
  loc: string
  title?: string
}

interface SitemapUrl {
  loc: string
  lastmod?: string
  changefreq?: string
  priority?: number
  images?: SitemapImage[]
}

export default defineSitemapEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const drupalBase = config.drupalBaseUrl
  // drupalBase is the internal Docker host (http://drupal:80) used for JSON:API;
  // image <loc> entries must use the PUBLIC host or they are invalid in the sitemap.
  const drupalPublic = process.env.DRUPAL_PUBLIC_URL || 'https://drupal.madsnorgaard.net'
  const photoBase = config.photoSiteUrl
  const urls: SitemapUrl[] = []

  // Blog posts from Drupal (with cover images)
  try {
    const blogData = await $fetch<any>(
      `${drupalBase}/jsonapi/node/article?filter[status]=1&sort=-created&page[limit]=100&include=field_image&fields[node--article]=title,created,changed,path&fields[file--file]=uri`,
      { headers: { Accept: 'application/vnd.api+json' } },
    )
    const included = blogData?.included ?? []
    for (const node of blogData?.data ?? []) {
      const alias = node.attributes?.path?.alias
      const slug = alias?.replace(/^\/(blog|article)\//, '') || node.id
      const images: SitemapImage[] = []
      const imageRef = node.relationships?.field_image?.data
      if (imageRef) {
        const file = included.find((i: any) => i.type === imageRef.type && i.id === imageRef.id)
        const uri = file?.attributes?.uri?.url
        if (uri) images.push({ loc: `${drupalPublic}${uri}`, title: node.attributes?.title })
      }
      urls.push({
        loc: `/writing/${slug}`,
        lastmod: node.attributes?.changed || node.attributes?.created,
        changefreq: 'monthly',
        priority: 0.7,
        ...(images.length && { images }),
      })
    }
  }
  catch { /* Drupal unavailable - static routes still indexed */ }

  // Photography projects from WP (with featured images)
  try {
    const projData = await $fetch<any[]>(
      `${photoBase}/wp-json/wp/v2/project?per_page=100&status=publish&_embed=wp:featuredmedia&_fields=slug,modified,title,_links,_embedded`,
    )
    for (const post of projData ?? []) {
      const media = post._embedded?.['wp:featuredmedia']?.[0]
      const images: SitemapImage[] = []
      if (media?.source_url) {
        images.push({ loc: media.source_url, title: decodeEntities(post.title?.rendered ?? '') })
      }
      urls.push({
        loc: `/proj/${post.slug}`,
        lastmod: post.modified,
        changefreq: 'monthly',
        priority: 0.7,
        ...(images.length && { images }),
      })
    }
  }
  catch { /* WP unavailable */ }

  // Photo stories from WP (with featured images)
  try {
    const storyData = await $fetch<any[]>(
      `${photoBase}/wp-json/wp/v2/stories?per_page=100&status=publish&_embed=wp:featuredmedia&_fields=slug,modified,title,_links,_embedded`,
    )
    for (const post of storyData ?? []) {
      const media = post._embedded?.['wp:featuredmedia']?.[0]
      const images: SitemapImage[] = []
      if (media?.source_url) {
        images.push({ loc: media.source_url, title: decodeEntities(post.title?.rendered ?? '') })
      }
      urls.push({
        loc: `/stories/${post.slug}`,
        lastmod: post.modified,
        changefreq: 'monthly',
        priority: 0.6,
        ...(images.length && { images }),
      })
    }
  }
  catch { /* WP unavailable */ }

  // Photo archive items from WP (with featured images)
  try {
    const photoData = await $fetch<any[]>(
      `${photoBase}/wp-json/wp/v2/photos?per_page=100&status=publish&_embed=wp:featuredmedia&_fields=slug,modified,title,_links,_embedded`,
    )
    for (const post of photoData ?? []) {
      const media = post._embedded?.['wp:featuredmedia']?.[0]
      const images: SitemapImage[] = []
      if (media?.source_url) {
        images.push({ loc: media.source_url, title: decodeEntities(post.title?.rendered ?? '') })
      }
      urls.push({
        loc: `/archive/${post.slug}`,
        lastmod: post.modified,
        changefreq: 'yearly',
        priority: 0.5,
        ...(images.length && { images }),
      })
    }
  }
  catch { /* WP unavailable */ }

  return urls
})

function decodeEntities(str: string) {
  return str.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
}
