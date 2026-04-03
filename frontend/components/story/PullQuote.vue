<template>
  <blockquote class="pull-quote" v-html="content" />
</template>

<script setup lang="ts">
defineProps<{
  content: string
}>()
</script>

<style scoped>
.pull-quote {
  max-width: 42rem;
  margin: 2.5rem auto;
  padding: 1.5rem 0;
  border-top: 2px solid var(--color-accent);
  border-bottom: 2px solid var(--color-accent);
}

.pull-quote :deep(p) {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  font-style: italic;
  line-height: 1.4;
  color: var(--color-text);
  margin: 0 0 0.5em;
}

.pull-quote :deep(p:last-child) {
  margin-bottom: 0;
}

.pull-quote :deep(cite) {
  display: block;
  margin-top: 0.75rem;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-style: normal;
  color: var(--color-muted);
}
</style>
