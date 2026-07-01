<template>
  <div class="mix" :class="{ 'mix--open': open }">
    <!-- The SoundCloud player bar. The iframe is created on first play and then
         kept alive (we pause/resume via the Widget API rather than remounting),
         so there's no autoplay race from injecting a fresh iframe after the
         click. Shown while open so a manual tap is always possible. -->
    <div v-show="loaded && open" class="mix__bar">
      <iframe
        v-if="loaded"
        ref="frame"
        class="mix__frame"
        title="Cold Turkey Cape Town mix"
        scrolling="no"
        frameborder="no"
        allow="autoplay; encrypted-media"
        :src="embedSrc"
      />
      <p v-if="blocked" class="mix__hint">
        Your browser blocked autoplay, tap ► in the player to start.
      </p>
      <a class="mix__source" :href="profileUrl" target="_blank" rel="noopener noreferrer">
        soundcloud.com/coldturkeysa ↗
      </a>
    </div>

    <button class="mix__toggle" type="button" @click="toggle">
      <span class="mix__eq" :class="{ 'mix__eq--on': playing }" aria-hidden="true">
        <i></i><i></i><i></i>
      </span>
      <span class="mix__label">{{ label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
// A nostalgia button: streams the Cold Turkey SoundCloud while you wander the
// wall. Uses the public SoundCloud Widget API (no account, no key) so we can
// drive play/pause from the user's actual gesture and reflect the *real*
// playing state, rather than trusting an auto_play iframe param that browsers
// (Safari/iOS especially) silently block.
const profileUrl = 'https://soundcloud.com/coldturkeysa' // friendly link shown to humans

// The widget resolves the canonical (pre-resolved) numeric user URL rather than
// the vanity slug; the slug occasionally fails with "we couldn't find that
// profile" because the widget's vanity lookup flakes. This is the exact form
// SoundCloud's own Share-embed uses, so it never mis-resolves.
const widgetUser = 'https://api.soundcloud.com/users/12417503'

// Two-way so the page can start the mix (e.g. when the memory reel begins).
const open = defineModel<boolean>('open', { default: false })

const loaded = ref(false)   // iframe has been created (lazy, on first play)
const ready = ref(false)    // Widget API is bound and the player is ready
const playing = ref(false)  // REAL playback state, from the widget's events
const blocked = ref(false)  // autoplay was denied; the user must tap play

const frame = ref<HTMLIFrameElement | null>(null)
let widget: any = null
let blockTimer: ReturnType<typeof setTimeout> | null = null

// auto_play stays false: we call .play() ourselves inside the gesture so the
// browser ties playback to the real user activation.
const embedSrc = computed(() => {
  const params = new URLSearchParams({
    url: widgetUser,
    color: '#d0243e',
    auto_play: 'false',
    hide_related: 'true',
    show_comments: 'false',
    show_user: 'true',
    show_reposts: 'false',
    show_teaser: 'false',
    visual: 'false',
  })
  return `https://w.soundcloud.com/player/?${params.toString()}`
})

const label = computed(() => {
  if (playing.value) return 'Stop the mix'
  if (blocked.value) return 'Tap play below'
  if (open.value) return 'Starting…'
  return 'Play the mix'
})

// Load the SoundCloud Widget API script once.
let apiPromise: Promise<any> | null = null
function loadApi(): Promise<any> {
  if (!import.meta.client) return Promise.reject(new Error('client only'))
  if ((window as any).SC?.Widget) return Promise.resolve((window as any).SC)
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://w.soundcloud.com/player/api.js'
    s.async = true
    s.onload = () => resolve((window as any).SC)
    s.onerror = () => reject(new Error('SoundCloud API failed to load'))
    document.head.appendChild(s)
  })
  return apiPromise
}

function clearBlockTimer() {
  if (blockTimer) { clearTimeout(blockTimer); blockTimer = null }
}

// Create the iframe + bind the Widget API the first time we need to play.
async function ensureWidget(): Promise<void> {
  if (widget) return
  loaded.value = true
  await nextTick() // let the iframe render so SC.Widget can attach to it
  const SC = await loadApi()
  if (!frame.value) return
  widget = SC.Widget(frame.value)
  widget.bind(SC.Widget.Events.READY, () => {
    ready.value = true
    if (open.value) requestPlay() // resume any intent expressed before ready
  })
  widget.bind(SC.Widget.Events.PLAY, () => {
    playing.value = true
    blocked.value = false
    clearBlockTimer()
  })
  widget.bind(SC.Widget.Events.PAUSE, () => { playing.value = false })
  widget.bind(SC.Widget.Events.FINISH, () => { playing.value = false })
  widget.bind(SC.Widget.Events.ERROR, () => { blocked.value = true })
}

// Ask the widget to play, and arm a short timer: if no PLAY event arrives, the
// browser blocked autoplay, so reveal the player and prompt a manual tap.
function requestPlay() {
  if (!widget || !ready.value) return
  widget.play()
  clearBlockTimer()
  blockTimer = setTimeout(() => {
    if (!playing.value) blocked.value = true
  }, 1800)
}

async function play() {
  blocked.value = false
  await ensureWidget()
  if (ready.value) requestPlay()
  // else: the READY handler will call requestPlay() once bound.
}

function pause() {
  clearBlockTimer()
  widget?.pause()
  playing.value = false
}

function toggle() {
  open.value = !open.value
}

// `open` is the source of truth for intent; the page can flip it (e.g. the reel
// starting) and we react the same as a direct toggle.
watch(open, (v) => { v ? play() : pause() })

onMounted(() => { if (open.value) play() })
onBeforeUnmount(clearBlockTimer)
</script>

<style scoped>
.mix {
  position: fixed;
  left: 1rem;
  bottom: 1rem;
  z-index: 200; /* under the lightbox (9000); audio persists regardless */
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: min(420px, calc(100vw - 2rem));
}

.mix__bar {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 0.5rem 0.5rem 0.35rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.mix__frame {
  display: block;
  width: 100%;
  height: 120px;
  border: 0;
}

.mix__hint {
  margin: 0.4rem 0 0.1rem;
  font-family: var(--font-mono);
  font-size: 0.62rem;
  line-height: 1.4;
  letter-spacing: 0.03em;
  color: var(--color-accent);
}

.mix__source {
  display: block;
  margin-top: 0.3rem;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.04em;
  color: var(--color-muted);
  text-decoration: none;
  opacity: 0.7;
}
.mix__source:hover { color: var(--color-accent); opacity: 1; }

.mix__toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  align-self: flex-start;
  background: var(--color-surface);
  border: 1px solid var(--color-accent);
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.5rem 0.85rem;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease;
}
.mix__toggle:hover { background: var(--color-accent-dim); }
.mix--open .mix__toggle { border-color: var(--color-accent); color: var(--color-accent); }

/* Little equaliser glyph: three bars, animated only while actually playing. */
.mix__eq {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 0.85rem;
}
.mix__eq i {
  width: 3px;
  height: 40%;
  background: var(--color-accent);
  display: block;
}
.mix__eq--on i { animation: eq 900ms ease-in-out infinite; }
.mix__eq--on i:nth-child(2) { animation-delay: 150ms; }
.mix__eq--on i:nth-child(3) { animation-delay: 300ms; }

@keyframes eq {
  0%, 100% { height: 30%; }
  50% { height: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .mix__eq--on i { animation: none; height: 70%; }
}

@media (max-width: 640px) {
  .mix { left: 0.5rem; bottom: 0.5rem; }
  .mix__label { display: none; } /* keep just the equaliser on small screens */
  .mix__toggle { padding: 0.5rem; }
}
</style>
