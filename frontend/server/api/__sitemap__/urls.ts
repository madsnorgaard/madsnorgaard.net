// Dynamic sitemap source: fetches all published content slugs from Drupal + WP
import { defineSitemapEventHandler } from '#imports'

export default defineSitemapEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const drupalBase = config.drupalBaseUrl
  const photoBase = config.photoSiteUrl
  const urls: { loc: string; lastmod?: string; changefreq?: string; priority?: number }[] = []

  // Blog posts from Drupal
  try {
    const blogData = await $fetch<any>(
      `${drupalBase}/jsonapi/node/article?filter[status]=1&sort=-created&page[limit]=100&fields[node--article]=title,created,changed,path`,
      { headers: { Accept: 'application/vnd.api+json' } },
    )
    for (const node of blogData?.data ?? []) {
      const alias = node.attributes?.path?.alias
      const slug = alias?.replace(/^\/(blog|article)\//, '') || node.id
      urls.push({
        loc: `/writing/${slug}`,
        lastmod: node.attributes?.changed || node.attributes?.created,
        changefreq: 'monthly',
        priority: 0.7,
      })
    }
  }
  catch { /* Drupal unavailable - static routes still indexed */ }

  // Photography projects from WP
  try {
    const projData = await $fetch<any[]>(
      `${photoBase}/wp-json/wp/v2/project?per_page=100&status=publish&_fields=slug,modified`,
    )
    for (const post of projData ?? []) {
      urls.push({
        loc: `/proj/${post.slug}`,
        lastmod: post.modified,
        changefreq: 'monthly',
        priority: 0.7,
      })
    }
  }
  catch { /* WP unavailable */ }

  // Photo stories from WP
  try {
    const storyData = await $fetch<any[]>(
      `${photoBase}/wp-json/wp/v2/stories?per_page=100&status=publish&_fields=slug,modified`,
    )
    for (const post of storyData ?? []) {
      urls.push({
        loc: `/stories/${post.slug}`,
        lastmod: post.modified,
        changefreq: 'monthly',
        priority: 0.6,
      })
    }
  }
  catch { /* WP unavailable */ }

  // Photo archive items from WP
  try {
    const photoData = await $fetch<any[]>(
      `${photoBase}/wp-json/wp/v2/photos?per_page=100&status=publish&_fields=slug,modified`,
    )
    for (const post of photoData ?? []) {
      urls.push({
        loc: `/archive/${post.slug}`,
        lastmod: post.modified,
        changefreq: 'yearly',
        priority: 0.5,
      })
    }
  }
  catch { /* WP unavailable */ }

  return urls
})
