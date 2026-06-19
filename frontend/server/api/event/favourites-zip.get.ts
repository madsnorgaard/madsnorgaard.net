// GET /api/event/favourites-zip?ids=1,2,3
// Streams a ZIP of the favourite photos at web resolution (the `large` size,
// never the masters). Built server-side because the image files aren't
// CORS-readable from the browser, and so we can assemble one download in a
// single request with no client-side dependency.

const MAX = 100

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const base = config.photoSiteUrl
  const query = getQuery(event)

  const ids =
    typeof query.ids === 'string'
      ? query.ids
          .split(',')
          .map((s) => parseInt(s, 10))
          .filter((n) => Number.isFinite(n) && n > 0)
          .slice(0, MAX)
      : []

  if (!ids.length) {
    throw createError({ statusCode: 400, statusMessage: 'No photo ids' })
  }

  // Resolve each photo to its web-res image URL (large, fall back to full).
  const posts = await wpFetch<any[]>(
    `${base}/wp-json/wp/v2/event-photos?include=${ids.join(',')}&per_page=${ids.length}&orderby=include&_embed=wp:featuredmedia`
  )

  const files: { name: string; data: Buffer }[] = []
  let seq = 0
  for (const post of Array.isArray(posts) ? posts : []) {
    const media = post?._embedded?.['wp:featuredmedia']?.[0]
    const url =
      media?.media_details?.sizes?.large?.source_url ?? media?.source_url ?? null
    if (!url) continue
    const data = await fetchImage(url)
    if (!data) continue
    seq++
    files.push({ name: `cold-turkey-${String(seq).padStart(3, '0')}-${post.id}.jpg`, data })
  }

  if (!files.length) {
    throw createError({ statusCode: 502, statusMessage: 'No images could be fetched' })
  }

  const zip = zipStore(files)

  setResponseHeader(event, 'Content-Type', 'application/zip')
  setResponseHeader(
    event,
    'Content-Disposition',
    'attachment; filename="cold-turkey-favourites.zip"'
  )
  setResponseHeader(event, 'Content-Length', String(zip.length))
  return zip
})

/** Fetch image bytes (handles https URLs and data: URIs for local mocks). */
async function fetchImage(url: string): Promise<Buffer | null> {
  try {
    if (url.startsWith('data:')) {
      const comma = url.indexOf(',')
      const meta = url.slice(5, comma)
      const body = url.slice(comma + 1)
      return meta.includes('base64')
        ? Buffer.from(body, 'base64')
        : Buffer.from(decodeURIComponent(body), 'utf8')
    }
    const resp = await fetch(url)
    if (!resp.ok) return null
    return Buffer.from(await resp.arrayBuffer())
  } catch {
    return null
  }
}

/** Minimal store-only (no compression) ZIP writer. JPEGs are already compressed. */
function zipStore(files: { name: string; data: Buffer }[]): Buffer {
  const local: Buffer[] = []
  const central: Buffer[] = []
  let offset = 0

  for (const f of files) {
    const nameBuf = Buffer.from(f.name, 'utf8')
    const crc = crc32(f.data)
    const size = f.data.length

    const lh = Buffer.alloc(30)
    lh.writeUInt32LE(0x04034b50, 0) // local file header signature
    lh.writeUInt16LE(20, 4) // version needed
    lh.writeUInt16LE(0, 6) // flags
    lh.writeUInt16LE(0, 8) // method = store
    lh.writeUInt16LE(0, 10) // mod time
    lh.writeUInt16LE(0, 12) // mod date
    lh.writeUInt32LE(crc, 14)
    lh.writeUInt32LE(size, 18) // compressed size
    lh.writeUInt32LE(size, 22) // uncompressed size
    lh.writeUInt16LE(nameBuf.length, 26)
    lh.writeUInt16LE(0, 28) // extra length
    local.push(lh, nameBuf, f.data)

    const ch = Buffer.alloc(46)
    ch.writeUInt32LE(0x02014b50, 0) // central dir header signature
    ch.writeUInt16LE(20, 4) // version made by
    ch.writeUInt16LE(20, 6) // version needed
    ch.writeUInt16LE(0, 8) // flags
    ch.writeUInt16LE(0, 10) // method
    ch.writeUInt16LE(0, 12) // mod time
    ch.writeUInt16LE(0, 14) // mod date
    ch.writeUInt32LE(crc, 16)
    ch.writeUInt32LE(size, 20)
    ch.writeUInt32LE(size, 24)
    ch.writeUInt16LE(nameBuf.length, 28)
    ch.writeUInt16LE(0, 30) // extra
    ch.writeUInt16LE(0, 32) // comment
    ch.writeUInt16LE(0, 34) // disk number
    ch.writeUInt16LE(0, 36) // internal attrs
    ch.writeUInt32LE(0, 38) // external attrs
    ch.writeUInt32LE(offset, 42) // local header offset
    central.push(ch, nameBuf)

    offset += 30 + nameBuf.length + size
  }

  const centralBuf = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0) // end of central dir signature
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(centralBuf.length, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20)

  return Buffer.concat([...local, centralBuf, end])
}

function crc32(buf: Buffer): number {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return (~c) >>> 0
}
