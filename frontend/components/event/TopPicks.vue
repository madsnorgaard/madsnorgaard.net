<template>
  <section v-if="picks.length" class="toppicks" aria-label="Top picks">
    <div class="toppicks__head">
      <span class="toppicks__title">★ Top picks</span>
      <span class="toppicks__sub">the most-loved shots — tap to view &amp; share</span>
    </div>
    <ul class="toppicks__rail">
      <li v-for="p in picks" :key="p.id" class="toppicks__item">
        <button
          type="button"
          class="toppicks__btn"
          :aria-label="`View photo (${p.likeCount} likes) and share it`"
          @click="emit('open', p.id)"
        >
          <img
            class="toppicks__img"
            :src="p.images?.medium || p.images?.thumbnail || p.images?.large || ''"
            :alt="p.images?.alt || 'Cold Turkey Cape Town photograph'"
            loading="lazy"
            decoding="async"
          />
          <span class="toppicks__likes"><span aria-hidden="true">♥</span> {{ p.likeCount }}</span>
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { EventPhoto } from '~/types/event'

const emit = defineEmits<{ open: [id: number] }>()

const { data } = await useAsyncData('ctct-top', () =>
  $fetch('/api/event/top', { query: { count: 12 } }),
)
const picks = computed<EventPhoto[]>(() => (data.value as any)?.photos ?? [])
</script>

<style scoped>
.toppicks { margin: 0 0 1.5rem; }
.toppicks__head {
  display: flex; align-items: baseline; gap: 0.75rem; flex-wrap: wrap;
  padding: 0 var(--space, 1rem); margin-bottom: 0.6rem;
}
.toppicks__title {
  font-family: var(--font-mono); font-size: 0.8rem; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--color-accent);
}
.toppicks__sub { font-family: var(--font-mono); font-size: 0.7rem; color: var(--color-muted); }

.toppicks__rail {
  display: flex; gap: 0.6rem; list-style: none; margin: 0;
  padding: 0.25rem var(--space, 1rem) 0.6rem;
  overflow-x: auto; scroll-snap-type: x proximity;
  -webkit-overflow-scrolling: touch;
}
.toppicks__item { flex: 0 0 auto; scroll-snap-align: start; }
.toppicks__btn {
  position: relative; display: block; padding: 0; border: 1px solid var(--color-border);
  background: var(--color-surface); cursor: pointer; line-height: 0;
  transition: transform 150ms ease, border-color 150ms ease;
}
.toppicks__btn:hover, .toppicks__btn:focus-visible {
  transform: translateY(-2px); border-color: var(--color-accent); outline: none;
}
.toppicks__img {
  width: 140px; height: 140px; object-fit: cover; display: block;
}
.toppicks__likes {
  position: absolute; bottom: 0; left: 0; right: 0;
  display: flex; align-items: center; gap: 0.3rem; justify-content: flex-end;
  padding: 0.3rem 0.45rem; line-height: 1;
  font-family: var(--font-mono); font-size: 0.68rem; color: #fff;
  background: linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0));
}
@media (max-width: 600px) {
  .toppicks__img { width: 112px; height: 112px; }
}
</style>
