<script setup lang="ts">
import { ref, computed } from 'vue'
import { youTubeId } from '~/utils/youtube'

// Click-to-load video embed with a privacy facade. On page load nothing is
// requested from YouTube: only a poster image (i.ytimg.com) is shown behind a
// play button. The nocookie player iframe is injected on the first click, so no
// third-party player code runs until the visitor asks for it. The little
// "privacy mode" badge makes that visible - it is the article's own argument
// (own your infrastructure, nothing leaks until you consent) expressed in the UI.
const props = defineProps<{
  url: string
  title?: string
}>()

const playing = ref(false)
const connecting = ref(false)
const id = computed(() => youTubeId(props.url))

// maxresdefault does not exist for every video; fall back to hqdefault on error.
const poster = ref(id.value ? `https://i.ytimg.com/vi/${id.value}/maxresdefault.jpg` : '')
const embed = computed(() =>
  id.value ? `https://www.youtube-nocookie.com/embed/${id.value}?autoplay=1&rel=0` : '',
)

function posterFallback() {
  if (id.value) poster.value = `https://i.ytimg.com/vi/${id.value}/hqdefault.jpg`
}

function play() {
  // Show an honest "handing off" flash while the nocookie player loads.
  connecting.value = true
  playing.value = true
}
</script>

<template>
  <!-- Recognised YouTube URL: privacy facade + click-to-load nocookie player. -->
  <figure v-if="id" class="video-embed">
    <div class="video-embed__frame">
      <button
        v-if="!playing"
        class="video-embed__facade"
        type="button"
        :aria-label="`Play video${title ? ': ' + title : ''}`"
        @click="play"
      >
        <img
          class="video-embed__poster"
          :src="poster"
          :alt="title ?? ''"
          loading="lazy"
          @error="posterFallback"
        >
        <span class="video-embed__vignette" aria-hidden="true" />

        <span class="video-embed__badge" aria-hidden="true">
          <span class="video-embed__badge-dot" />
          Privacy mode: nothing loads from YouTube until you press play
        </span>

        <span class="video-embed__play" aria-hidden="true">
          <span class="video-embed__play-ring" />
        </span>

        <span v-if="title" class="video-embed__caption" aria-hidden="true">{{ title }}</span>
      </button>

      <template v-else>
        <iframe
          class="video-embed__iframe"
          :src="embed"
          :title="title ?? 'Embedded video player'"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen
          loading="lazy"
          @load="connecting = false"
        />
        <span v-if="connecting" class="video-embed__connecting" aria-hidden="true">
          Handing off to youtube-nocookie.com
        </span>
      </template>
    </div>
  </figure>

  <!-- Any other provider: no facade, just a clear link so nothing breaks. -->
  <p v-else-if="url" class="video-embed__fallback">
    <a :href="url" target="_blank" rel="noopener noreferrer">
      {{ title ? `Watch: ${title}` : 'Watch the video' }}
    </a>
  </p>
</template>

<style scoped>
.video-embed {
  margin: 2rem 0;
}

.video-embed__frame {
  position: relative;
  aspect-ratio: 16 / 9;
  width: 100%;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: #000;
}

.video-embed__iframe,
.video-embed__facade {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

.video-embed__facade {
  padding: 0;
  cursor: pointer;
  display: block;
  background: #000;
}

/* Darkroom poster: dimmed + slightly desaturated at rest, comes up to full on
   hover/focus, echoing the photo wall's darkroom treatment. */
.video-embed__poster {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.72) saturate(0.85) contrast(1.02);
  transform: scale(1.01);
  transition: filter 0.35s ease, transform 0.5s ease;
}

.video-embed__facade:hover .video-embed__poster,
.video-embed__facade:focus-visible .video-embed__poster {
  filter: brightness(0.9) saturate(1) contrast(1);
  transform: scale(1.03);
}

.video-embed__vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(120% 120% at 50% 42%, transparent 45%, rgba(0, 0, 0, 0.55) 100%),
    linear-gradient(to top, rgba(0, 0, 0, 0.55), transparent 38%);
}

/* Privacy badge: the snack. Mono, understated, brightens the meaning on hover. */
.video-embed__badge {
  position: absolute;
  top: 0.85rem;
  left: 0.85rem;
  max-width: min(70%, 26rem);
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.6rem;
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.04em;
  line-height: 1.3;
  text-align: left;
  color: var(--color-text);
  background: rgba(14, 14, 14, 0.66);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 6px;
  backdrop-filter: blur(3px);
  opacity: 0.72;
  transition: opacity 0.2s ease, border-color 0.2s ease;
}

.video-embed__facade:hover .video-embed__badge,
.video-embed__facade:focus-visible .video-embed__badge {
  opacity: 1;
  border-color: rgba(208, 36, 62, 0.5);
}

.video-embed__badge-dot {
  flex: none;
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 50%;
  background: var(--color-accent);
  box-shadow: 0 0 0 0 rgba(208, 36, 62, 0.55);
  animation: video-embed-pulse 2.4s ease-out infinite;
}

.video-embed__play {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 4.5rem;
  height: 4.5rem;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  display: grid;
  place-items: center;
  transition: transform 0.18s ease, background 0.18s ease;
}

.video-embed__play::before {
  content: "";
  border-style: solid;
  border-width: 0.72rem 0 0.72rem 1.2rem;
  border-color: transparent transparent transparent #fff;
  margin-left: 0.28rem;
}

/* Expanding ring on hover - a small, deliberate flourish. */
.video-embed__play-ring {
  position: absolute;
  inset: -0.4rem;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.35);
  opacity: 0;
  transition: opacity 0.2s ease, transform 0.4s ease;
}

.video-embed__facade:hover .video-embed__play,
.video-embed__facade:focus-visible .video-embed__play {
  transform: translate(-50%, -50%) scale(1.06);
  background: var(--color-accent);
}

.video-embed__facade:hover .video-embed__play-ring,
.video-embed__facade:focus-visible .video-embed__play-ring {
  opacity: 1;
  transform: scale(1.12);
}

.video-embed__caption {
  position: absolute;
  left: 0.95rem;
  right: 0.95rem;
  bottom: 0.85rem;
  font-family: var(--font-display);
  font-size: clamp(0.95rem, 1.6vw, 1.15rem);
  line-height: 1.25;
  color: #fff;
  text-shadow: 0 1px 12px rgba(0, 0, 0, 0.6);
  text-align: left;
  pointer-events: none;
}

.video-embed__facade:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
}

.video-embed__connecting {
  position: absolute;
  left: 0.85rem;
  bottom: 0.85rem;
  padding: 0.3rem 0.55rem;
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.04em;
  color: var(--color-text);
  background: rgba(14, 14, 14, 0.72);
  border: 1px solid rgba(208, 36, 62, 0.5);
  border-radius: 6px;
  animation: video-embed-fade 0.25s ease both;
}

.video-embed__fallback {
  margin: 2rem 0;
}

.video-embed__fallback a {
  color: var(--color-accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

@keyframes video-embed-pulse {
  0% { box-shadow: 0 0 0 0 rgba(208, 36, 62, 0.5); }
  70% { box-shadow: 0 0 0 0.5rem rgba(208, 36, 62, 0); }
  100% { box-shadow: 0 0 0 0 rgba(208, 36, 62, 0); }
}

@keyframes video-embed-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .video-embed__poster,
  .video-embed__play,
  .video-embed__play-ring { transition: none; }
  .video-embed__badge-dot { animation: none; }
  .video-embed__facade:hover .video-embed__poster,
  .video-embed__facade:focus-visible .video-embed__poster { transform: none; }
}
</style>
