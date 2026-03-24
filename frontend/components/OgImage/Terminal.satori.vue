<script setup lang="ts">
defineProps<{
  availability?: 'available' | 'busy' | 'not-available'
  availabilityNote?: string
}>()

// Satori can't use CSS vars — hardcode site palette
const C = {
  bg:     '#0A0908',
  text:   '#F0EDE6',
  muted:  '#6B6763',
  accent: '#C41E3A',
  border: '#1E1C1A',
  green:  '#28C840',
  yellow: '#FEBC2E',
  red:    '#FF5F57',
}
</script>

<template>
  <!-- 1200×630 — standard OG image size -->
  <div
    :style="{
      display: 'flex',
      width: '1200px',
      height: '630px',
      background: C.bg,
      fontFamily: '\'IBM Plex Mono\', monospace',
      color: C.text,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0',
    }"
  >
    <!-- Inner card with subtle border -->
    <div
      :style="{
        display: 'flex',
        flexDirection: 'column',
        border: `1px solid ${C.border}`,
        padding: '60px 70px',
        width: '1060px',
      }"
    >

      <!-- Name -->
      <div
        :style="{
          display: 'flex',
          fontSize: '72px',
          fontWeight: '700',
          color: C.text,
          letterSpacing: '3px',
          marginBottom: '32px',
          lineHeight: '1',
        }"
      >
        MADS NØRGAARD
      </div>

      <!-- Top divider -->
      <div :style="{ display: 'flex', color: C.accent, fontSize: '18px', marginBottom: '28px' }">
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      </div>

      <!-- Rows -->
      <div :style="{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }">

        <div :style="{ display: 'flex', gap: '0', alignItems: 'center' }">
          <span :style="{ display: 'flex', color: C.muted, fontSize: '24px', width: '200px' }">role</span>
          <span :style="{ display: 'flex', color: C.text, fontSize: '24px' }">Senior Developer + DevOps</span>
        </div>

        <div :style="{ display: 'flex', gap: '0', alignItems: 'center' }">
          <span :style="{ display: 'flex', color: C.muted, fontSize: '24px', width: '200px' }">location</span>
          <span :style="{ display: 'flex', color: C.text, fontSize: '24px' }">Skanderborg, Denmark</span>
        </div>

        <div :style="{ display: 'flex', gap: '0', alignItems: 'center' }">
          <span :style="{ display: 'flex', color: C.muted, fontSize: '24px', width: '200px' }">status</span>
          <span
            :style="{
              display: 'flex',
              color: availability === 'busy' ? C.yellow : availability === 'not-available' ? C.red : C.green,
              fontSize: '18px',
              marginRight: '10px',
            }"
          >●</span>
          <span :style="{ display: 'flex', color: C.text, fontSize: '24px' }">
            {{ availability === 'busy' ? (availabilityNote ?? 'busy') : availability === 'not-available' ? 'not available' : 'available' }}
          </span>
        </div>

      </div>

      <!-- Bottom divider -->
      <div :style="{ display: 'flex', color: C.accent, fontSize: '18px', marginBottom: '28px' }">
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      </div>

      <!-- URL -->
      <div :style="{ display: 'flex', color: C.accent, fontSize: '28px', letterSpacing: '1px' }">
        madsnorgaard.net
      </div>

    </div>
  </div>
</template>
