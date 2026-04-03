<template>
  <div class="story-blocks">
    <template v-for="(block, i) in blocks" :key="i">
      <StoryPhotoEmbed
        v-if="block.type === 'photo-embed' && block.attrs?.photoId"
        :photo="resolvedPhotos[block.attrs.photoId]"
        :show-caption="block.attrs?.showCaption ?? true"
        :alignment="block.attrs?.alignment ?? 'none'"
      />

      <StoryPhotoSequence
        v-else-if="block.type === 'photo-sequence' && block.attrs?.photoIds?.length"
        :photo-ids="block.attrs.photoIds"
        :resolved-photos="resolvedPhotos"
        :caption="block.attrs?.caption ?? ''"
      />

      <StoryPullQuote
        v-else-if="block.type === 'pull-quote' && block.content"
        :content="block.content"
      />

      <StorySectionBreak
        v-else-if="block.type === 'section-break'"
        :number="block.attrs?.number ?? ''"
      />

      <!-- Core content blocks: render sanitised HTML -->
      <div
        v-else-if="block.content"
        class="story-blocks__content"
        v-html="block.content"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { StoryBlock, ResolvedPhoto } from '~/types/photo'

defineProps<{
  blocks: StoryBlock[]
  resolvedPhotos: Record<number, ResolvedPhoto>
}>()
</script>

<style scoped>
.story-blocks {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.story-blocks__content {
  max-width: 42rem;
  margin: 0 auto;
  width: 100%;
  font-family: var(--font-ui);
  line-height: 1.75;
  color: var(--color-text);
}

.story-blocks__content :deep(h2),
.story-blocks__content :deep(h3) {
  font-family: var(--font-display);
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

.story-blocks__content :deep(p) {
  margin: 0 0 1em;
}

.story-blocks__content :deep(a) {
  color: var(--color-accent);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}
</style>
