// Anonymous, no-login reactions (like + "I was there") for event photos.
//
// Device-level dedupe lives in localStorage so a returning visitor sees their
// own taps reflected and can't trivially spam from the UI. The server adds a
// second hashed-IP dedupe layer. Counts are optimistic: we bump the number
// immediately, POST to the BFF, then reconcile with the authoritative count
// (rolling back on failure).

type Kind = 'liked' | 'there'

const STORAGE_PREFIX = 'ctct'

function storageKey(kind: Kind, id: number): string {
  return `${STORAGE_PREFIX}_${kind}_${id}`
}

export function useEventReactions() {
  function hasReacted(kind: Kind, id: number): boolean {
    if (!import.meta.client) return false
    try {
      return localStorage.getItem(storageKey(kind, id)) === '1'
    } catch {
      return false
    }
  }

  function remember(kind: Kind, id: number) {
    try {
      localStorage.setItem(storageKey(kind, id), '1')
    } catch {
      /* private mode / disabled storage - ignore */
    }
  }

  function forget(kind: Kind, id: number) {
    try {
      localStorage.removeItem(storageKey(kind, id))
    } catch {
      /* ignore */
    }
  }

  /**
   * Send a reaction. Returns the authoritative new count, or null on failure.
   * No-ops (returns null) if the device already reacted.
   */
  async function react(kind: Kind, id: number): Promise<number | null> {
    if (hasReacted(kind, id)) return null
    remember(kind, id)

    const endpoint = kind === 'liked' ? '/api/event/like' : '/api/event/there'
    const field = kind === 'liked' ? 'likeCount' : 'thereCount'
    try {
      const res = await $fetch<Record<string, number>>(endpoint, {
        method: 'POST',
        body: { id },
      })
      return Number(res?.[field] ?? 0)
    } catch {
      forget(kind, id) // let them try again
      return null
    }
  }

  /**
   * The photo IDs this device has hearted, newest-first is not tracked, so we
   * just return them in localStorage order. This is the "favourites" list -
   * device-local, no account. Derived from the existing ctct_liked_<id> keys.
   */
  function favouriteIds(): number[] {
    if (!import.meta.client) return []
    const ids: number[] = []
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        const m = key && key.match(/^ctct_liked_(\d+)$/)
        if (m) ids.push(Number(m[1]))
      }
    } catch {
      /* storage disabled */
    }
    return ids
  }

  return { hasReacted, react, favouriteIds }
}
