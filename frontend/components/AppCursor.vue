<template>
  <ClientOnly>
    <div class="app-cursor">
      <div
        class="app-cursor__ring"
        :class="{
          'app-cursor__ring--hover': isHover,
          'app-cursor__ring--click': isClick,
        }"
        :style="{
          transform: `translate3d(${ringX - 14}px, ${ringY - 14}px, 0)`,
          '--rx': `${ringX - 14}px`,
          '--ry': `${ringY - 14}px`,
        }"
      />
      <div
        class="app-cursor__dot"
        :style="{ transform: `translate3d(${dotX - 3}px, ${dotY - 3}px, 0)` }"
      />
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
const dotX = ref(0)
const dotY = ref(0)
const ringX = ref(0)
const ringY = ref(0)
const isHover = ref(false)
const isClick = ref(false)

let rafId: number
let onMouseMove: (e: MouseEvent) => void
let onMouseOver: (e: MouseEvent) => void
let onMouseDown: () => void

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

onMounted(() => {
  onMouseMove = (e: MouseEvent) => {
    dotX.value = e.clientX
    dotY.value = e.clientY
  }

  onMouseOver = (e: MouseEvent) => {
    const target = e.target as Element
    isHover.value = !!target.closest('a, button, [role=button]')
  }

  onMouseDown = () => {
    isClick.value = true
    setTimeout(() => { isClick.value = false }, 200)
  }

  function loop() {
    ringX.value = lerp(ringX.value, dotX.value, 0.12)
    ringY.value = lerp(ringY.value, dotY.value, 0.12)
    rafId = requestAnimationFrame(loop)
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseover', onMouseOver)
  window.addEventListener('mousedown', onMouseDown)
  rafId = requestAnimationFrame(loop)
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseover', onMouseOver)
  window.removeEventListener('mousedown', onMouseDown)
})
</script>
