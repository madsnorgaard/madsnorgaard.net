<template>
  <div class="lab-share">
    <button class="lab-share__btn" type="button" :disabled="busy" @click="save">
      <span aria-hidden="true">↓</span>
      {{ saved ? 'Saved' : 'Save image' }}
    </button>
    <span class="lab-share__wrap">
      <button class="lab-share__btn" type="button" aria-label="Share this experiment" @click.stop="onShare">
        <span aria-hidden="true">⤴</span>
        {{ copied ? 'Link copied' : 'Share' }}
      </button>
      <span v-if="menuOpen" class="lab-share__menu" @click.stop>
        <a class="lab-share__link" :href="waUrl" target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <a class="lab-share__link" :href="fbUrl" target="_blank" rel="noopener noreferrer">Facebook</a>
        <a class="lab-share__link" :href="xUrl" target="_blank" rel="noopener noreferrer">X</a>
        <a class="lab-share__link" :href="liUrl" target="_blank" rel="noopener noreferrer">LinkedIn</a>
        <button class="lab-share__link" type="button" @click="copy">Copy link</button>
      </span>
    </span>
    <span class="lab-share__hint">1200 × 630 card with the settings you have right now</span>
  </div>
</template>

<script setup lang="ts">
// Save or share a /lab experiment as a picture. The card is rendered by
// /og/lab/<slug>.png from the same data as the page, with the current state
// (arm count, ruler, country) in the query so the picture, the link and the
// link's preview all show the same thing. Same-origin, so the browser can hand
// the PNG to the share sheet as a file for Instagram, WhatsApp and Stories.

const props = defineProps<{
  slug: string
  title: string
  text: string
  state?: Record<string, string | number | undefined>
}>()

const config = useRuntimeConfig()
const siteUrl = (config.public?.siteUrl as string) || 'https://madsnorgaard.net'

const busy = ref(false)
const saved = ref(false)
const copied = ref(false)
const menuOpen = ref(false)

const query = computed(() => {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(props.state ?? {})) if (v !== undefined && v !== '') p.set(k, String(v))
  const s = p.toString()
  return s ? `?${s}` : ''
})
const cardPath = computed(() => `/og/lab/${props.slug}.png${query.value}`)
const shareUrl = computed(() => `${siteUrl}/lab/${props.slug}${query.value}`)
const fileName = computed(() => `${props.slug}${query.value.replace(/[?=]/g, '-').replace(/&/g, '-')}.png`)

const waUrl = computed(() => `https://wa.me/?text=${encodeURIComponent(`${props.text} ${shareUrl.value}`)}`)
const fbUrl = computed(() => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl.value)}`)
const xUrl = computed(() => `https://twitter.com/intent/tweet?text=${encodeURIComponent(props.text)}&url=${encodeURIComponent(shareUrl.value)}`)
const liUrl = computed(() => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl.value)}`)

async function fetchCard(): Promise<File | null> {
  const resp = await fetch(cardPath.value)
  if (!resp.ok) return null
  const blob = await resp.blob()
  return new File([blob], fileName.value, { type: blob.type || 'image/png' })
}

async function save() {
  busy.value = true
  try {
    const file = await fetchCard()
    if (!file) throw new Error('card unavailable')
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    saved.value = true
    setTimeout(() => { saved.value = false }, 2000)
  } catch {
    // No blob download (old browser, blocked fetch): show the picture instead.
    window.open(cardPath.value, '_blank', 'noopener')
  } finally {
    busy.value = false
  }
}

async function tryShareImage(): Promise<boolean> {
  if (!navigator.canShare) return false
  try {
    const file = await fetchCard()
    if (!file || !navigator.canShare({ files: [file] })) return false
    await navigator.share({ files: [file], title: props.title, text: props.text, url: shareUrl.value })
    return true
  } catch {
    return false
  }
}

async function onShare() {
  if (import.meta.client && navigator.share) {
    if (await tryShareImage()) return
    try {
      await navigator.share({ title: props.title, text: props.text, url: shareUrl.value })
      return
    } catch {
      // cancelled or unsupported: fall through to the menu
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
    /* clipboard unavailable: leave the menu open with the links */
  }
}

const close = () => { menuOpen.value = false }
onMounted(() => document.addEventListener('click', close))
onBeforeUnmount(() => document.removeEventListener('click', close))
</script>

<style scoped>
.lab-share {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
  margin-top: 1rem;
}
.lab-share__wrap {
  position: relative;
  display: inline-flex;
}
.lab-share__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  color: var(--color-text);
  background: transparent;
  border: 1px solid var(--color-border);
  padding: 0.4rem 0.75rem;
  cursor: pointer;
}
.lab-share__btn:hover,
.lab-share__btn:focus-visible {
  border-color: var(--color-accent);
}
.lab-share__btn:disabled {
  opacity: 0.6;
  cursor: wait;
}
.lab-share__hint {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--color-muted);
}
.lab-share__menu {
  position: absolute;
  top: calc(100% + 0.4rem);
  left: 0;
  display: flex;
  flex-direction: column;
  min-width: 9rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  z-index: 5;
}
.lab-share__link {
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
.lab-share__link:last-child { border-bottom: none; }
.lab-share__link:hover { color: var(--color-accent); background: var(--color-accent-dim); }
</style>
