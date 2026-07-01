<template>
  <span class="share">
    <button class="share__btn" type="button" aria-label="Share this photo" @click.stop="onShare">
      <span class="share__icon" aria-hidden="true">⤴</span>
      <span class="share__label">{{ copied ? 'Link copied' : 'Share' }}</span>
    </button>

    <!-- Desktop fallback menu (no native share sheet available) -->
    <span v-if="menuOpen" class="share__menu" @click.stop>
      <a class="share__link" :href="waUrl" target="_blank" rel="noopener noreferrer">WhatsApp</a>
      <a class="share__link" :href="fbUrl" target="_blank" rel="noopener noreferrer">Facebook</a>
      <a class="share__link" :href="xUrl" target="_blank" rel="noopener noreferrer">X</a>
      <a class="share__link" :href="liUrl" target="_blank" rel="noopener noreferrer">LinkedIn</a>
      <button class="share__link" type="button" @click="copy">Copy link</button>
    </span>
  </span>
</template>

<script setup lang="ts">
const props = defineProps<{
  photoId: number
  setSlug?: string | null
}>()

const config = useRuntimeConfig()
const route = useRoute()

const copied = ref(false)
const menuOpen = ref(false)

const shareUrl = computed(() => {
  const origin = (config.public?.siteUrl as string) || 'https://madsnorgaard.net'
  const params = new URLSearchParams()
  if (props.setSlug) params.set('set', props.setSlug)
  params.set('photo', String(props.photoId))
  return `${origin}${route.path}?${params.toString()}`
})

const shareText = 'Cold Turkey Cape Town: were you there?'

// The branded 1200x630 card for this photo. Same-origin, so the browser can
// fetch it as a Blob for an image-file share (no CORS, unlike the WP photo).
const cardUrl = computed(() => {
  const origin = (config.public?.siteUrl as string) || 'https://madsnorgaard.net'
  return `${origin}/og/ct/${props.photoId}.png`
})

const waUrl = computed(() => `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl.value)}`)
const fbUrl = computed(() => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl.value)}`)
const xUrl = computed(() => `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl.value)}`)
const liUrl = computed(() => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl.value)}`)

// Try to attach the actual card image so image-first apps (Instagram, TikTok,
// WhatsApp, Stories) receive the picture, not just a link.
async function tryShareImage(): Promise<boolean> {
  if (!navigator.canShare) return false
  try {
    const resp = await fetch(cardUrl.value)
    if (!resp.ok) return false
    const blob = await resp.blob()
    const file = new File([blob], `cold-turkey-${props.photoId}.png`, { type: blob.type || 'image/png' })
    if (!navigator.canShare({ files: [file] })) return false
    await navigator.share({ files: [file], title: 'Cold Turkey Cape Town', text: shareText, url: shareUrl.value })
    return true
  } catch {
    return false
  }
}

async function onShare() {
  if (import.meta.client && navigator.share) {
    // 1) share the image itself where supported (TikTok/IG/WhatsApp/Stories)
    if (await tryShareImage()) return
    // 2) otherwise the link (rich card preview on FB/X/LinkedIn/WhatsApp)
    try {
      await navigator.share({ title: 'Cold Turkey Cape Town', text: shareText, url: shareUrl.value })
      return
    } catch {
      // user cancelled or share failed - fall through to the menu
    }
  }
  menuOpen.value = !menuOpen.value
}

async function copy() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
    menuOpen.value = false
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    /* clipboard unavailable - leave menu open with the links */
  }
}
</script>

<style scoped>
.share { position: relative; display: inline-flex; }

.share__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-muted);
  transition: color 150ms ease;
}
.share__btn:hover { color: var(--color-text); }
.share__icon { font-size: 0.95rem; line-height: 1; }

.share__menu {
  position: absolute;
  bottom: calc(100% + 0.5rem);
  right: 0;
  display: flex;
  flex-direction: column;
  min-width: 9rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  z-index: 5;
}

.share__link {
  display: block;
  text-align: left;
  background: none;
  border: none;
  border-bottom: 1px solid var(--color-border);
  padding: 0.5rem 0.75rem;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--color-muted);
  text-decoration: none;
  cursor: pointer;
  transition: color 150ms ease, background 150ms ease;
}
.share__link:last-child { border-bottom: none; }
.share__link:hover { color: var(--color-accent); background: var(--color-accent-dim); }
</style>
