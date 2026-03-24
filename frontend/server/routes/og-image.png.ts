// GET /og-image.png
// Renders the terminal-style OG image using Satori + resvg.
// Query: ?availability=busy&note=On+vacation

import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'

// Fetch IBM Plex Mono from Google Fonts as ArrayBuffer (cached in closure)
let fontRegular: ArrayBuffer | null = null
let fontBold: ArrayBuffer | null = null

async function loadFonts() {
  if (fontRegular && fontBold) return

  const [r, b] = await Promise.all([
    fetch('https://fonts.gstatic.com/s/ibmplexmono/v19/-F6qfjptAgt5VM-kVkqdyU8n3pQP.woff')
      .then(r => r.arrayBuffer()),
    fetch('https://fonts.gstatic.com/s/ibmplexmono/v19/-F6pfjptAgt5VM-kVkqdyU8n3uQ69lls.woff')
      .then(r => r.arrayBuffer()),
  ])

  fontRegular = r
  fontBold = b
}

const C = {
  bg:     '#0A0908',
  text:   '#F0EDE6',
  muted:  '#6B6763',
  accent: '#C41E3A',
  border: '#1E1C1A',
  green:  '#28C840',
  yellow: '#FEBC2E',
  red:    '#FF5F57',
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const availability = (query.availability as string) || 'available'
  const note = (query.note as string) || undefined

  const statusLabel =
    availability === 'busy'         ? (note ?? 'busy')
    : availability === 'not-available' ? 'not available'
    : 'available'

  const dotColor =
    availability === 'busy'         ? C.yellow
    : availability === 'not-available' ? C.red
    : C.green

  await loadFonts()

  const divider = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          width: '1200px',
          height: '630px',
          background: C.bg,
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '"IBM Plex Mono", monospace',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                border: `1px solid ${C.border}`,
                padding: '60px 70px',
                width: '1060px',
              },
              children: [
                // Name
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      fontSize: 72,
                      fontWeight: 700,
                      color: C.text,
                      letterSpacing: '3px',
                      marginBottom: '32px',
                      lineHeight: 1,
                    },
                    children: 'MADS NØRGAARD',
                  },
                },
                // Top divider
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', color: C.accent, fontSize: 18, marginBottom: '28px' },
                    children: divider,
                  },
                },
                // Rows
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' },
                    children: [
                      row('role',     'Senior Developer + DevOps', C),
                      row('location', 'Skanderborg, Denmark', C),
                      statusRow(dotColor, statusLabel, C),
                    ],
                  },
                },
                // Bottom divider
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', color: C.accent, fontSize: 18, marginBottom: '28px' },
                    children: divider,
                  },
                },
                // URL
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', color: C.accent, fontSize: 28, letterSpacing: '1px' },
                    children: 'madsnorgaard.net',
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
        { name: 'IBM Plex Mono', data: fontRegular!, weight: 400, style: 'normal' },
        { name: 'IBM Plex Mono', data: fontBold!,    weight: 700, style: 'normal' },
      ],
    },
  )

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } })
  const png = resvg.render().asPng()

  setHeader(event, 'Content-Type', 'image/png')
  setHeader(event, 'Cache-Control', 'public, max-age=3600')
  return png
})

function row(label: string, value: string, C: Record<string, string>) {
  return {
    type: 'div',
    props: {
      style: { display: 'flex', alignItems: 'center' },
      children: [
        { type: 'span', props: { style: { display: 'flex', color: C.muted, fontSize: 24, width: '200px' }, children: label } },
        { type: 'span', props: { style: { display: 'flex', color: C.text,  fontSize: 24 },         children: value } },
      ],
    },
  }
}

function statusRow(dotColor: string, label: string, C: Record<string, string>) {
  return {
    type: 'div',
    props: {
      style: { display: 'flex', alignItems: 'center' },
      children: [
        { type: 'span', props: { style: { display: 'flex', color: C.muted,   fontSize: 24, width: '200px' }, children: 'status' } },
        { type: 'span', props: { style: { display: 'flex', color: dotColor,  fontSize: 18, marginRight: '10px' }, children: '●' } },
        { type: 'span', props: { style: { display: 'flex', color: C.text,    fontSize: 24 }, children: label } },
      ],
    },
  }
}
