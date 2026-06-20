// GET /og/ct/<id>.png
// Branded 1200x630 social-share card for a single Cold Turkey photo: the photo
// fills the frame, with a COLD TURKEY CAPE TOWN wordmark + night/date strip.
// Reused as og:image/twitter:image for ?photo=<id> shares, and shared directly
// as an image file via the Web Share API (same-origin, so no CORS).

import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { loadOgFonts } from '../../../utils/og-fonts'

const C = {
  bg: '#0A0908',
  text: '#F0EDE6',
  muted: '#C9C4BB',
  accent: '#C41E3A',
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default defineEventHandler(async (event) => {
  const id =
    getRouterParam(event, 'id')?.replace(/\.png$/, '') ||
    event.path?.match(/\/og\/ct\/(\d+)/)?.[1] ||
    ''

  // Pull the photo straight from WordPress (same source the photo endpoint
  // uses) — calling our own BFF over an internal $fetch is unreliable here.
  const base = useRuntimeConfig(event).photoSiteUrl
  const post: any = id
    ? await wpFetch(`${base}/wp-json/wp/v2/event-photos/${id}?_embed=wp:featuredmedia,wp:term`).catch(() => null)
    : null
  const media = post?._embedded?.['wp:featuredmedia']?.[0]
  const sizes = media?.media_details?.sizes ?? {}
  const imageUrl: string | null =
    sizes.large?.source_url || media?.source_url || sizes.medium?.source_url || null

  // No image to build a card from — fall back to the site default card.
  if (!imageUrl) {
    console.warn('[og/ct] no image', { id, hasPost: !!post, embedded: !!post?._embedded, base })
    return sendRedirect(event, '/og-image.png', 302)
  }

  try {
    const { regular, bold } = await loadOgFonts()
    const terms = post?._embedded?.['wp:term']?.flat?.() ?? []
    const nightTerm = terms.find((t: any) => t?.taxonomy === 'event_set' && t?.parent)
      ?? terms.find((t: any) => t?.taxonomy === 'event_set')
    const rawNight = nightTerm ? decodeEntities(nightTerm.name ?? '') : 'Cold Turkey Cape Town'
    // Night names carry a redundant ISO-date prefix ("2012-05-27 - …"); drop it
    // since the strip already shows the formatted date.
    const night = rawNight.replace(/^\d{4}-\d{2}-\d{2}\s*[-–]\s*/, '').trim() || rawNight
    const date = formatDate(post?.meta?.capture_date ?? null)
    const strip = [date, night].filter(Boolean).join('  ·  ')

    const svg = await satori(
      {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            position: 'relative',
            width: '1200px',
            height: '630px',
            background: C.bg,
            fontFamily: '"IBM Plex Mono", monospace',
          },
          children: [
            // The photo, cover-filling the frame.
            {
              type: 'img',
              props: {
                src: imageUrl,
                width: 1200,
                height: 630,
                style: {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '1200px',
                  height: '630px',
                  objectFit: 'cover',
                },
              },
            },
            // Bottom gradient + caption strip.
            {
              type: 'div',
              props: {
                style: {
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: '1200px',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '120px 56px 44px',
                  background:
                    'linear-gradient(to top, rgba(10,9,8,0.92) 0%, rgba(10,9,8,0.55) 55%, rgba(10,9,8,0) 100%)',
                },
                children: [
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        fontSize: 46,
                        fontWeight: 700,
                        color: C.text,
                        letterSpacing: '4px',
                        lineHeight: 1,
                      },
                      children: 'COLD TURKEY CAPE TOWN',
                    },
                  },
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        alignItems: 'center',
                        marginTop: '18px',
                        fontSize: 26,
                        color: C.muted,
                        letterSpacing: '1px',
                      },
                      children: [
                        { type: 'span', props: { style: { display: 'flex', color: C.accent, marginRight: '14px' }, children: '●' } },
                        { type: 'span', props: { style: { display: 'flex' }, children: strip } },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      {
        width: 1200,
        height: 630,
        fonts: [
          { name: 'IBM Plex Mono', data: regular, weight: 400, style: 'normal' },
          { name: 'IBM Plex Mono', data: bold, weight: 700, style: 'normal' },
        ],
      },
    )

    const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng()
    setHeader(event, 'Content-Type', 'image/png')
    setHeader(event, 'Cache-Control', 'public, max-age=86400')
    return png
  }
  catch (err) {
    // Satori/resvg failure must never break sharing — fall back to the raw photo.
    console.error('[og/ct] card render failed, redirecting to raw image', err)
    return sendRedirect(event, imageUrl, 302)
  }
})
