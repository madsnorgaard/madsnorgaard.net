<template>
  <div class="mix" :class="{ 'mix--open': open }">
    <!-- The SoundCloud player bar. Mounted only while playing so closing it
         actually stops the audio (no Widget API needed). Auto-plays on open
         because the toggle is a user gesture. -->
    <div v-if="open" class="mix__bar">
      <iframe
        class="mix__frame"
        title="Cold Turkey Cape Town mix"
        scrolling="no"
        frameborder="no"
        allow="autoplay; encrypted-media"
        :src="embedSrc"
      />
      <a class="mix__source" :href="profileUrl" target="_blank" rel="noopener noreferrer">
        soundcloud.com/coldturkeysa ↗
      </a>
    </div>

    <button class="mix__toggle" type="button" @click="open = !open">
      <span class="mix__eq" :class="{ 'mix__eq--on': open }" aria-hidden="true">
        <i></i><i></i><i></i>
      </span>
      <span class="mix__label">{{ open ? 'Stop the mix' : 'Play the mix' }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
// A nostalgia button: streams the Cold Turkey SoundCloud while you wander the
// wall. Uses the public SoundCloud widget iframe (no account, no API key).
const profileUrl = 'https://soundcloud.com/coldturkeysa'

// Two-way so the page can start the mix (e.g. when the memory reel begins).
const open = defineModel<boolean>('open', { default: false })

const embedSrc = computed(() => {
  const params = new URLSearchParams({
    url: profileUrl,
    color: '#d0243e',
    auto_play: 'true',
    hide_related: 'true',
    show_comments: 'false',
    show_user: 'true',
    show_reposts: 'false',
    show_teaser: 'false',
    visual: 'false',
  })
  return `https://w.soundcloud.com/player/?${params.toString()}`
})
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

/* Little equaliser glyph: three bars, animated only while playing. */
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
