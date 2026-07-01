// Loads the OG-card fonts (IBM Plex Mono) from bundled server assets, cached in
// module scope. The fonts ship in server/assets/fonts/ (Nitro exposes that as
// the `assets:server` storage) so we never fetch them at runtime — the previous
// runtime fetch of Google Fonts is what 500'd the OG routes in production.

let _regular: ArrayBuffer | null = null
let _bold: ArrayBuffer | null = null

function toArrayBuffer(input: unknown): ArrayBuffer {
  if (input instanceof ArrayBuffer) return input
  if (input instanceof Uint8Array) {
    return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength)
  }
  // Node Buffer or array-like
  return Uint8Array.from(input as Uint8Array).buffer
}

export async function loadOgFonts(): Promise<{ regular: ArrayBuffer; bold: ArrayBuffer }> {
  if (_regular && _bold) return { regular: _regular, bold: _bold }
  const storage = useStorage('assets:server')
  const [r, b] = await Promise.all([
    storage.getItemRaw('fonts/IBMPlexMono-Regular.ttf'),
    storage.getItemRaw('fonts/IBMPlexMono-Bold.ttf'),
  ])
  if (!r || !b) throw new Error('OG fonts missing from server assets (fonts/IBMPlexMono-*.ttf)')
  _regular = toArrayBuffer(r)
  _bold = toArrayBuffer(b)
  return { regular: _regular, bold: _bold }
}
