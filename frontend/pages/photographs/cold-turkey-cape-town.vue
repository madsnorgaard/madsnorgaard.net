<template>
  <div class="ctct">
    <EventHero :thumbs="heroThumbs" @enter="scrollToWall" />

    <div ref="wallTop" class="ctct__wall">
      <div class="ctct__bar">
        <EventSetFilterChips
          v-if="!showFavourites"
          :sets="sets"
          :active-slug="activeSet"
          @select="selectSet"
        />
        <div v-else class="ctct__favhead">
          <span class="ctct__favhead-title">
            {{ sharedView ? 'Shared favourites' : 'Your favourites' }}
            <span class="ctct__favhead-count">{{ favPhotos.length }}</span>
          </span>
          <span v-if="favPhotos.length" class="ctct__favtools">
            <a class="ctct-tool" :href="zipUrl"><span aria-hidden="true">⤓</span> Download</a>
            <button class="ctct-tool" type="button" @click="shareFavourites">
              <span aria-hidden="true">⤴</span> {{ favShareCopied ? 'Link copied' : 'Share' }}
            </button>
            <button class="ctct-tool" type="button" @click="contactSheet = true">
              <span aria-hidden="true">▦</span> Contact sheet
            </button>
          </span>
        </div>

        <div class="ctct__tools">
          <button class="ctct-tool" type="button" @click="startReel">
            <span aria-hidden="true">▶</span> Play the night
          </button>
          <ClientOnly>
            <button
              class="ctct-tool"
              :class="{ 'ctct-tool--on': showFavourites }"
              type="button"
              @click="toggleFavourites"
            >
              <span aria-hidden="true">★</span> Favourites
              <span v-if="favCount" class="ctct-tool__badge">{{ favCount }}</span>
            </button>
            <button
              class="ctct-tool"
              :class="{ 'ctct-tool--on': darkroom }"
              type="button"
              @click="darkroom = !darkroom"
            >
              <span aria-hidden="true">◐</span> Darkroom
            </button>
          </ClientOnly>
        </div>
      </div>

      <EventTopPicks v-if="!showFavourites" @open="openPick" />

      <EventEraScrubber
        v-if="!showFavourites && sets.length"
        :sets="sets"
        :active-slug="activeSet"
        @select="selectSet"
      />

      <EventPhotoWall
        :photos="activeList"
        :has-more="showFavourites ? false : hasMore"
        :loading="loading"
        :morph-id="morphId"
        @open="openIndex"
        @load-more="loadMore"
      />

      <p v-if="showFavourites && !favPhotos.length" class="ctct__empty">
        No favourites yet. Tap the heart on photos you love, then come back.
      </p>

      <!-- Per-night guestbook (moderated) -->
      <EventNightGuestbook
        v-if="activeSet && !showFavourites"
        :key="activeSet"
        :set-slug="activeSet"
      />
    </div>

    <!-- Mood layers + the SoundCloud mix -->
    <ClientOnly>
      <EventWallAtmosphere :spotlight="darkroom" />
      <EventMixPlayer v-model:open="mixOpen" />
      <EventFavContactSheet
        v-if="contactSheet"
        :photos="favPhotos"
        @close="contactSheet = false"
      />
    </ClientOnly>

    <!-- Lightbox with the social + takedown controls in its HUD -->
    <PhotoLightbox
      :images="lightboxImages"
      v-model:index="lbIndex"
      :active="lbActive"
      :show-filename="false"
      :morph-name="morphName"
      :reel="reelActive"
      @update:index="onLightboxNav"
      @close="closeLightbox"
    >
      <template #actions="{ image }">
        <ClientOnly>
          <EventLikeButton
            v-if="currentPhoto"
            :id="currentPhoto.id"
            :count="currentPhoto.likeCount"
            @update:count="(n) => updateCount(currentPhoto, 'likeCount', n)"
          />
          <EventThereButton
            v-if="currentPhoto"
            :id="currentPhoto.id"
            :count="currentPhoto.thereCount"
            @update:count="(n) => updateCount(currentPhoto, 'thereCount', n)"
          />
          <EventShareControl
            v-if="image?.id"
            :photo-id="image.id"
            :set-slug="activeSet"
          />
          <EventTakedownLink v-if="image?.id" :photo-id="image.id" />
        </ClientOnly>
      </template>
    </PhotoLightbox>
  </div>
</template>

<script setup lang="ts">
import type { EventPhoto, EventSet } from '~/types/event'
import type { LightboxImage } from '~/components/photo/PhotoLightbox.vue'

const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()

const activeSet = computed(() =>
  typeof route.query.set === 'string' && route.query.set ? route.query.set : null
)

// ─── Data: first page (SSR) + the night chips ───────────────────

const { data: initial } = await useAsyncData(
  () => `ctct-photos-${activeSet.value ?? 'all'}`,
  () => $fetch('/api/event/photos', {
    query: { ...(activeSet.value ? { set: activeSet.value } : {}), page: 1 },
  }),
  { watch: [activeSet] }
)

const { data: setsData } = await useAsyncData('ctct-sets', () => $fetch('/api/event/sets'))
const sets = computed<EventSet[]>(() => (setsData.value as any)?.sets ?? [])

// Accumulated, append-on-scroll list. Resets whenever the set (initial) changes.
const photos = ref<EventPhoto[]>([])
const page = ref(1)
const totalPages = ref(1)
const loading = ref(false)

watchEffect(() => {
  const d: any = initial.value
  if (d) {
    photos.value = d.photos ?? []
    page.value = d.page ?? 1
    totalPages.value = d.totalPages ?? 1
  }
})

const hasMore = computed(() => page.value < totalPages.value)

// ─── Favourites (device-local, derived from the hearts) ─────────
const { favouriteIds } = useEventReactions()
const showFavourites = ref(false)
const favPhotos = ref<EventPhoto[]>([])
const favCount = ref(0)

const contactSheet = ref(false)
const favShareCopied = ref(false)

function refreshFavCount() { favCount.value = favouriteIds().length }

function parseIds(v: unknown): number[] {
  return typeof v === 'string'
    ? v.split(',').map(Number).filter((n) => Number.isFinite(n) && n > 0).slice(0, 100)
    : []
}

// A shared link (?favs=…) shows someone else's curated set instead of this
// device's own hearts.
const urlFavs = computed(() => parseIds(route.query.favs))
const sharedView = computed(() => urlFavs.value.length > 0)

const favIds = computed(() => favPhotos.value.map((p) => p.id))
const zipUrl = computed(() => `/api/event/favourites-zip?ids=${favIds.value.join(',')}`)
const favShareUrl = computed(
  () => `${siteUrl}${route.path}?favs=${favIds.value.join(',')}`
)

async function loadFavourites(ids: number[]) {
  showFavourites.value = true
  if (!ids.length) { favPhotos.value = []; return }
  const res: any = await $fetch('/api/event/photos', { query: { ids: ids.join(',') } }).catch(() => null)
  favPhotos.value = res?.photos ?? []
}

async function toggleFavourites() {
  if (showFavourites.value) { showFavourites.value = false; return }
  await loadFavourites(favouriteIds())
}

async function shareFavourites() {
  const url = favShareUrl.value
  if (import.meta.client && navigator.share) {
    try { await navigator.share({ title: 'My Cold Turkey favourites', url }); return } catch { /* cancelled */ }
  }
  try {
    await navigator.clipboard.writeText(url)
    favShareCopied.value = true
    setTimeout(() => { favShareCopied.value = false }, 2000)
  } catch { /* clipboard blocked */ }
}

// ─── Mood toggles + reel + morph state ──────────────────────────
const darkroom = ref(false)
const mixOpen = ref(false)
const reelActive = ref(false)
const morphId = ref<number | null>(null)
const supportsMorph = ref(false)
const morphName = computed(() => (supportsMorph.value ? 'ct-hero-photo' : undefined))

// The list currently shown on the wall + driven by the lightbox.
const activeList = computed<EventPhoto[]>(() =>
  showFavourites.value ? favPhotos.value : photos.value
)

const heroThumbs = computed(() =>
  photos.value.slice(0, 20).map((p) => p.images?.medium || p.images?.large || '').filter(Boolean)
)

async function loadMore() {
  if (loading.value || !hasMore.value) return
  loading.value = true
  try {
    const next = page.value + 1
    const res: any = await $fetch('/api/event/photos', {
      query: { ...(activeSet.value ? { set: activeSet.value } : {}), page: next },
    })
    if (res?.photos?.length) {
      photos.value.push(...res.photos)
      page.value = res.page
      totalPages.value = res.totalPages
    } else {
      totalPages.value = page.value // stop
    }
  } finally {
    loading.value = false
  }
}

function selectSet(slug: string | null) {
  // Drop ?photo when switching nights.
  router.push({ query: slug ? { set: slug } : {} })
}

const wallTop = ref<HTMLElement | null>(null)
function scrollToWall() {
  wallTop.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ─── Lightbox (URL-driven via ?photo=) ──────────────────────────

const lbActive = ref(false)
const lbIndex = ref(0)
// A deep-linked photo that isn't in the loaded list yet (shared link landing
// deep in the archive) is shown on its own rather than forcing 30 page loads.
const deepPhoto = ref<EventPhoto | null>(null)

const lightboxPhotos = computed<EventPhoto[]>(() =>
  deepPhoto.value ? [deepPhoto.value] : activeList.value
)

const lightboxImages = computed<LightboxImage[]>(() =>
  lightboxPhotos.value.map((p) => ({
    src: p.images?.large || p.images?.full || p.images?.medium || '',
    alt: p.images?.alt || '',
    width: p.images?.width ?? null,
    height: p.images?.height ?? null,
    id: p.id,
  }))
)

const currentPhoto = computed<EventPhoto | null>(
  () => lightboxPhotos.value[lbIndex.value] ?? null
)

function applyOpen(i: number) {
  deepPhoto.value = null
  lbIndex.value = i
  lbActive.value = true
}

function syncPhotoUrl(id: number, replace = false) {
  if (route.query.photo === String(id)) return
  const q = { ...route.query, photo: String(id) }
  replace ? router.replace({ query: q }) : router.push({ query: q })
}

// Wrap a DOM-mutating callback in a View Transition when supported, so the
// browser morphs the shared `ct-hero-photo` element (tile <-> lightbox image).
function withMorph(id: number, mutate: () => void) {
  if (!supportsMorph.value) { mutate(); return }
  morphId.value = id
  nextTick(() => {
    const vt = (document as any).startViewTransition(async () => { mutate(); await nextTick() })
    vt.finished.finally(() => { morphId.value = null })
  })
}

function openIndex(i: number) {
  const photo = activeList.value[i]
  if (!photo) return
  // Mutate + URL change happen together inside the transition so the "before"
  // snapshot is the closed wall (otherwise the route watcher opens it early).
  withMorph(photo.id, () => { applyOpen(i); syncPhotoUrl(photo.id) })
}

function onLightboxNav(newIndex: number) {
  const photo = lightboxPhotos.value[newIndex]
  if (photo) syncPhotoUrl(photo.id, true)
}

function closeLightbox() {
  reelActive.value = false
  const cur = currentPhoto.value
  const tileExists = !!cur && !deepPhoto.value && activeList.value.some((p) => p.id === cur.id)
  const doClose = () => {
    lbActive.value = false
    if (route.query.photo) {
      const q = { ...route.query }
      delete q.photo
      router.replace({ query: q })
    }
  }

  if (tileExists && supportsMorph.value) withMorph(cur!.id, doClose)
  else doClose()
}

// "Play the night": full-screen Ken Burns reel from the start, mix playing.
function startReel() {
  if (!activeList.value.length) return
  reelActive.value = true
  mixOpen.value = true
  deepPhoto.value = null
  applyOpen(0)
  syncPhotoUrl(activeList.value[0].id, true)
}

// A Top-picks tap deep-links to the photo; the route.query.photo watcher opens
// the lightbox (fetching the photo if it isn't in the loaded wall yet).
function openPick(id: number) {
  router.push({ query: { ...route.query, photo: String(id) } })
}

function updateCount(photo: EventPhoto | null, field: 'likeCount' | 'thereCount', n: number) {
  if (!photo) return
  photo[field] = n
  if (field === 'likeCount') refreshFavCount() // a like just changed favourites
}

// The og-photo fetch (SSR) doubles as the deep-link source on the client.
const { data: ogPhoto } = await useAsyncData(
  () => `ctct-og-${route.query.photo ?? 'none'}`,
  async () => {
    const pid = route.query.photo
    // Return {} (never null) so Nuxt doesn't flag it / duplicate the request.
    if (!pid) return {}
    return await $fetch(`/api/event/photo/${pid}`).catch(() => ({}))
  },
  { watch: [() => route.query.photo] }
)

function openByQuery(pidStr: string) {
  const pid = Number(pidStr)
  if (!Number.isFinite(pid)) return
  const idx = activeList.value.findIndex((p) => p.id === pid)
  if (idx >= 0) {
    deepPhoto.value = null
    lbIndex.value = idx
  } else if ((ogPhoto.value as any)?.id === pid) {
    deepPhoto.value = ogPhoto.value as any
    lbIndex.value = 0
  } else {
    $fetch(`/api/event/photo/${pid}`)
      .then((p: any) => { deepPhoto.value = p; lbIndex.value = 0 })
      .catch(() => {
        // Shared link to a photo that no longer exists: close cleanly.
        lbActive.value = false
        if (route.query.photo) {
          const q = { ...route.query }
          delete q.photo
          router.replace({ query: q })
        }
      })
  }
  lbActive.value = true
}

// URL is the source of truth for lightbox open/close (so Back closes it).
// Client-only: the lightbox is interactive and teleported, so SSR-rendering it
// for a deep link would hydrate-mismatch. OG meta is handled separately below.
watch(
  () => route.query.photo,
  (pid) => {
    if (pid) {
      openByQuery(String(pid))
    } else {
      lbActive.value = false
      deepPhoto.value = null
    }
  }
)

onMounted(() => {
  supportsMorph.value =
    typeof (document as any).startViewTransition === 'function' &&
    !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  refreshFavCount()
  if (urlFavs.value.length) loadFavourites(urlFavs.value)
  if (route.query.photo) openByQuery(String(route.query.photo))
})

// React to a shared ?favs= link changing (back/forward, pasted link).
watch(urlFavs, (ids) => {
  if (ids.length) loadFavourites(ids)
})

// ─── SEO / Open Graph ───────────────────────────────────────────

const siteUrl = (config.public?.siteUrl as string) || 'https://madsnorgaard.net'

// The photo whose branded card becomes the share preview: the deep-linked
// photo when ?photo=<id> is set, otherwise the article's lead photo.
const ogPhotoId = computed<number | null>(() => {
  const og: any = ogPhoto.value
  return og?.id ?? photos.value[0]?.id ?? null
})

// A per-photo 1200x630 branded card (server route), so every shared photo gets
// its own correctly-sized social image. Falls back to the site default card.
const ogImage = computed(() =>
  ogPhotoId.value ? `${siteUrl}/og/ct/${ogPhotoId.value}.png` : `${siteUrl}/og-image.png`
)

// og:url MUST carry the ?photo deep-link so Facebook/LinkedIn cache each photo
// share separately (they key their cache by og:url) instead of collapsing every
// share onto the base page.
const ogUrl = computed(() => {
  const base = `${siteUrl}${route.path}`
  return route.query.photo ? `${base}?photo=${route.query.photo}` : base
})

const ogTitle = computed(() => {
  const og: any = ogPhoto.value
  if (og?.setName) return `Cold Turkey Cape Town: ${og.setName}`
  return 'Cold Turkey Cape Town: the photographs'
})

const ogDescription = computed(() => {
  const og: any = ogPhoto.value
  if (og?.setName) return `A photograph from ${og.setName} — Cold Turkey Cape Town. Were you there?`
  return 'Thousands of photographs from Cold Turkey Cape Town. Find the night you were there, and relive it.'
})

useSeoMeta({
  title: () => ogTitle.value,
  description:
    'Thousands of photographs from Cold Turkey Cape Town, the bi-weekly electronic music event. Find the night you were there.',
  ogTitle: () => ogTitle.value,
  ogDescription: () => ogDescription.value,
  ogUrl: () => ogUrl.value,
  ogImage: () => ogImage.value,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterImage: () => ogImage.value,
})
</script>

<style scoped>
.ctct {
  background: var(--color-bg);
  min-height: 100vh;
}

.ctct__wall {
  scroll-margin-top: 0;
}

.ctct__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1rem;
  max-width: 70rem;
  margin: 0 auto;
  padding: 0 1rem;
}

.ctct__tools {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-left: auto;
}

.ctct-tool {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-decoration: none;
  padding: 0.4rem 0.7rem;
  cursor: pointer;
  transition: color 150ms ease, border-color 150ms ease, background 150ms ease;
}
.ctct-tool:hover { color: var(--color-text); border-color: var(--color-muted); }
.ctct-tool--on {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: var(--color-accent-dim);
}
.ctct-tool__badge {
  font-size: 0.6rem;
  color: var(--color-text);
  padding-left: 0.3rem;
  border-left: 1px solid var(--color-border);
}

.ctct__favhead {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.25rem;
  padding: 1rem 0;
}
.ctct__favhead-title {
  font-family: var(--font-display);
  font-size: 1.4rem;
  color: var(--color-text);
}
.ctct__favhead-count {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-accent);
  margin-left: 0.5rem;
}
.ctct__favtools {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.ctct__empty {
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--color-muted);
  padding: 4rem 1rem;
}
</style>

<!-- Global: tune the tile <-> lightbox View Transition morph. -->
<style>
::view-transition-group(ct-hero-photo) {
  animation-duration: 360ms;
  animation-timing-function: cubic-bezier(0.2, 0, 0, 1);
}
::view-transition-image-pair(ct-hero-photo) {
  isolation: auto;
}
::view-transition-old(ct-hero-photo),
::view-transition-new(ct-hero-photo) {
  /* Morph by size/position; avoid a muddy double-fade on the image itself. */
  mix-blend-mode: normal;
  animation-duration: 360ms;
}
</style>
