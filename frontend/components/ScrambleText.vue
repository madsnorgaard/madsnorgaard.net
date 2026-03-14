<template>
  <span ref="el" class="scramble-text" :aria-label="text">{{ displayText }}</span>
</template>

<script setup lang="ts">
const props = defineProps<{
  text: string
  delay?: number
  trigger?: boolean
}>()

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
const TICK_MS = 30
const CHARS_PER_TICK = 0.4

const el = ref<HTMLElement | null>(null)
const displayText = ref(props.text)
let animFrame: ReturnType<typeof setTimeout> | null = null
let observer: IntersectionObserver | null = null
let hasAnimated = false

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)]
}

function scramble() {
  if (hasAnimated) return
  hasAnimated = true

  const target = props.text
  let progress = 0

  function tick() {
    progress += CHARS_PER_TICK
    const resolved = Math.floor(progress)

    displayText.value =
      target.slice(0, resolved) +
      target.slice(resolved).split('').map(randomChar).join('')

    if (resolved < target.length) {
      animFrame = setTimeout(tick, TICK_MS)
    } else {
      displayText.value = target
    }
  }

  setTimeout(tick, props.delay ?? 0)
}

onMounted(() => {
  if (props.trigger !== undefined) {
    // Controlled externally
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        scramble()
        observer?.disconnect()
      }
    },
    { threshold: 0.1 }
  )

  if (el.value) observer.observe(el.value)
})

watch(
  () => props.trigger,
  (val) => {
    if (val) scramble()
  }
)

onBeforeUnmount(() => {
  if (animFrame) clearTimeout(animFrame)
  observer?.disconnect()
})
</script>

<style scoped>
.scramble-text {
  display: inline;
}
</style>
