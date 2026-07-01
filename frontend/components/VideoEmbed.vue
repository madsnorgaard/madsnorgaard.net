<script setup lang="ts">
import { ref, computed } from 'vue'
import { youTubeId } from '~/utils/youtube'

// Click-to-load video embed. On page load nothing is requested from YouTube:
// only a poster image (from i.ytimg.com) is shown behind a play button. The
// nocookie player iframe is injected on the first click, so no third-party
// player code runs until the visitor asks for it.
const props = defineProps<{
  url: string
  title?: string
}>()

const playing = ref(false)
const id = computed(() => youTubeId(props.url))

// maxresdefault does not exist for every video; fall back to hqdefault on error.
const poster = ref(id.value ? `https://i.ytimg.com/vi/${id.value}/maxresdefault.jpg` : '')
const embed = computed(() =>
  id.value ? `https://www.youtube-nocookie.com/embed/${id.value}?autoplay=1&rel=0` : '',
)

function posterFallback() {
  if (id.value) poster.value = `https://i.ytimg.com/vi/${id.value}/hqdefault.jpg`
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
        @click="playing = true"
      >
        <img
          class="video-embed__poster"
          :src="poster"
          :alt="title ?? ''"
          loading="lazy"
          @error="posterFallback"
        >
        <span class="video-embed__play" aria-hidden="true" />
      </button>
      <iframe
        v-else
        class="video-embed__iframe"
        :src="embed"
        :title="title ?? 'Embedded video player'"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerpolicy="strict-origin-when-cross-origin"
        allowfullscreen
        loading="lazy"
      />
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
  display: grid;
  place-items: center;
  background: #000;
}

.video-embed__poster {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-embed__play {
  position: absolute;
  width: 4.5rem;
  height: 4.5rem;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  display: grid;
  place-items: center;
  transition: transform 0.15s ease, background 0.15s ease;
}

.video-embed__play::before {
  content: "";
  border-style: solid;
  border-width: 0.75rem 0 0.75rem 1.25rem;
  border-color: transparent transparent transparent #fff;
  margin-left: 0.25rem;
}

.video-embed__facade:hover .video-embed__play,
.video-embed__facade:focus-visible .video-embed__play {
  transform: scale(1.08);
  background: var(--color-accent);
}

.video-embed__facade:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
}

.video-embed__fallback {
  margin: 2rem 0;
}

.video-embed__fallback a {
  color: var(--color-accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>
