<template>
  <span class="role-rotation" aria-live="polite" :aria-label="currentRole">{{ displayed }}<span class="role-rotation__cursor" /></span>
</template>

<script setup lang="ts">
const ROLES = [
  'Senior Developer + DevOps.',
  'Drupal architect.',
  'Infrastructure thinker.',
  'Photographer.',
  'Civic technologist.',
  'Sometimes breaks production.',
  'Self-taught, 15 years in.',
]

// Timing in ms
const TYPE_SPEED  = 60
const DELETE_SPEED = 35
const PAUSE_AFTER_TYPE = 2400
const PAUSE_BEFORE_NEXT = 300
const LONG_PAUSE_INDEX = 5 // "Sometimes breaks production"

const roleIndex = ref(0)
const displayed = ref('')
const currentRole = computed(() => ROLES[roleIndex.value])
let timeout: ReturnType<typeof setTimeout>

function type(target: string, done: () => void) {
  if (displayed.value.length < target.length) {
    displayed.value = target.slice(0, displayed.value.length + 1)
    timeout = setTimeout(() => type(target, done), TYPE_SPEED)
  } else {
    done()
  }
}

function erase(done: () => void) {
  if (displayed.value.length > 0) {
    displayed.value = displayed.value.slice(0, -1)
    timeout = setTimeout(() => erase(done), DELETE_SPEED)
  } else {
    done()
  }
}

function cycle() {
  const role = ROLES[roleIndex.value]
  const pauseDuration = roleIndex.value === LONG_PAUSE_INDEX
    ? PAUSE_AFTER_TYPE * 2
    : PAUSE_AFTER_TYPE

  type(role, () => {
    timeout = setTimeout(() => {
      erase(() => {
        roleIndex.value = (roleIndex.value + 1) % ROLES.length
        timeout = setTimeout(cycle, PAUSE_BEFORE_NEXT)
      })
    }, pauseDuration)
  })
}

onMounted(() => {
  timeout = setTimeout(cycle, 600)
})

onBeforeUnmount(() => {
  clearTimeout(timeout)
})
</script>

<style scoped>
.role-rotation {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: inherit;
  color: var(--color-muted, #6B6763);
  display: inline;
}

.role-rotation__cursor {
  display: inline-block;
  width: 0.5em;
  height: 1em;
  background: var(--color-accent, #C41E3A);
  vertical-align: text-bottom;
  margin-left: 1px;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
</style>
