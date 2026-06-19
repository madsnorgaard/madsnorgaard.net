<template>
  <button
    class="like-btn"
    :class="{ 'like-btn--on': liked }"
    type="button"
    :aria-pressed="liked"
    :aria-label="liked ? 'Liked' : 'Like this photo'"
    @click.stop="onClick"
  >
    <span class="like-btn__heart" aria-hidden="true">{{ liked ? '♥' : '♡' }}</span>
    <span class="like-btn__count">{{ count }}</span>
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{
  id: number
  count: number
}>()

const emit = defineEmits<{ (e: 'update:count', value: number): void }>()

const { hasReacted, react } = useEventReactions()
const liked = ref(false)
const count = ref(props.count)

watch(() => props.count, (v) => { count.value = v })
watch(() => props.id, (id) => {
  liked.value = hasReacted('liked', id)
  count.value = props.count
}, { immediate: true })

onMounted(() => { liked.value = hasReacted('liked', props.id) })

async function onClick() {
  if (liked.value) return
  liked.value = true
  count.value += 1 // optimistic
  emit('update:count', count.value)

  const authoritative = await react('liked', props.id)
  if (authoritative === null) {
    // failed - roll back
    liked.value = hasReacted('liked', props.id)
    count.value = Math.max(0, count.value - 1)
    emit('update:count', count.value)
  } else {
    count.value = authoritative
    emit('update:count', count.value)
  }
}
</script>

<style scoped>
.like-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-muted);
  transition: color 150ms ease;
}

.like-btn:hover { color: var(--color-text); }

.like-btn__heart {
  font-size: 1rem;
  line-height: 1;
  transition: transform 200ms ease, color 150ms ease;
}

.like-btn--on { color: var(--color-accent); }
.like-btn--on .like-btn__heart {
  color: var(--color-accent);
  animation: like-pop 320ms ease;
}

@keyframes like-pop {
  0% { transform: scale(1); }
  40% { transform: scale(1.45); }
  100% { transform: scale(1); }
}
</style>
