<template>
  <div class="sheet">
    <div class="sheet__chrome">
      <div class="sheet__title">
        Contact sheet
        <span class="sheet__sub">Cold Turkey Cape Town · {{ photos.length }} frames</span>
      </div>
      <div class="sheet__actions">
        <button class="sheet__btn" type="button" @click="print">⎙ Print / Save PDF</button>
        <button class="sheet__btn" type="button" @click="$emit('close')">Close</button>
      </div>
    </div>

    <div class="sheet__grid">
      <figure v-for="(photo, i) in photos" :key="photo.id" class="frame">
        <img
          class="frame__img"
          :src="photo.images?.medium || photo.images?.large || ''"
          :alt="photo.images?.alt || ''"
          loading="lazy"
        />
        <figcaption class="frame__no">{{ String(i + 1).padStart(2, '0') }}</figcaption>
      </figure>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EventPhoto } from '~/types/event'

defineProps<{ photos: EventPhoto[] }>()
defineEmits<{ (e: 'close'): void }>()

function print() {
  window.print()
}
</script>

<style scoped>
.sheet {
  position: fixed;
  inset: 0;
  z-index: 9500;
  background: var(--color-bg);
  overflow-y: auto;
  padding: 1.5rem;
}

.sheet__chrome {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  max-width: 64rem;
  margin: 0 auto 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.sheet__title {
  font-family: var(--font-display);
  font-size: 1.4rem;
  color: var(--color-text);
}
.sheet__sub {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--color-muted);
  margin-left: 0.6rem;
}

.sheet__actions { display: flex; gap: 0.5rem; }
.sheet__btn {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text);
  background: none;
  border: 1px solid var(--color-border);
  padding: 0.45rem 0.8rem;
  cursor: pointer;
  transition: border-color 150ms ease, color 150ms ease;
}
.sheet__btn:hover { border-color: var(--color-accent); color: var(--color-accent); }

.sheet__grid {
  max-width: 64rem;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.frame {
  margin: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}
.frame__img {
  width: 100%;
  aspect-ratio: 3 / 2;
  object-fit: cover;
  display: block;
}
.frame__no {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: var(--color-muted);
  padding: 0.25rem 0.4rem;
}

@media (max-width: 700px) {
  .sheet__grid { grid-template-columns: repeat(2, 1fr); }
}

/* Print: drop the dark theme + on-screen chrome, lay it out like a real sheet. */
@media print {
  .sheet {
    position: static;
    background: #fff;
    padding: 0;
  }
  .sheet__chrome { border-color: #ccc; }
  .sheet__actions { display: none; }
  .sheet__title, .sheet__sub, .frame__no { color: #000; }
  .sheet__grid { grid-template-columns: repeat(3, 1fr); gap: 4mm; }
  .frame { border-color: #ccc; background: #fff; break-inside: avoid; }
}
</style>
