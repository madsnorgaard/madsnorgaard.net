<template>
  <button
    class="there-btn"
    :class="{ 'there-btn--on': marked }"
    type="button"
    :aria-pressed="marked"
    :aria-label="marked ? 'You marked you were there' : 'I was there'"
    @click.stop="onClick"
  >
    <span class="there-btn__icon" aria-hidden="true">✋</span>
    <span class="there-btn__label">{{ marked ? 'I was there' : 'I was there' }}</span>
    <span class="there-btn__count">{{ count }}</span>
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{
  id: number
  count: number
}>()

const emit = defineEmits<{ (e: 'update:count', value: number): void }>()

const { hasReacted, react } = useEventReactions()
const marked = ref(false)
const count = ref(props.count)

watch(() => props.count, (v) => { count.value = v })
watch(() => props.id, (id) => {
  marked.value = hasReacted('there', id)
  count.value = props.count
}, { immediate: true })

onMounted(() => { marked.value = hasReacted('there', props.id) })

async function onClick() {
  if (marked.value) return
  marked.value = true
  count.value += 1
  emit('update:count', count.value)

  const authoritative = await react('there', props.id)
  if (authoritative === null) {
    marked.value = hasReacted('there', props.id)
    count.value = Math.max(0, count.value - 1)
    emit('update:count', count.value)
  } else {
    count.value = authoritative
    emit('update:count', count.value)
  }
}
</script>

<style scoped>
.there-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.04em;
  color: var(--color-muted);
  transition: color 150ms ease, border-color 150ms ease, background 150ms ease;
}

.there-btn:hover { color: var(--color-text); border-color: var(--color-muted); }

.there-btn__icon { line-height: 1; }

.there-btn__count {
  color: var(--color-text);
  padding-left: 0.2rem;
  border-left: 1px solid var(--color-border);
}

.there-btn--on {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: var(--color-accent-dim);
}
.there-btn--on .there-btn__count { color: var(--color-accent); border-color: var(--color-accent); }
</style>
