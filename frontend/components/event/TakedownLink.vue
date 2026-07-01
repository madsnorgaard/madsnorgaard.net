<template>
  <a class="takedown" :href="mailto" @click.stop>
    Request removal
  </a>
</template>

<script setup lang="ts">
// A quiet consent-withdrawal path for crowd photos: opens a prefilled email to
// the site owner with the photo ID, so anyone who'd rather not appear can ask.
const props = defineProps<{ photoId: number }>()

const mailto = computed(() => {
  const subject = `Cold Turkey: removal request for photo #${props.photoId}`
  const body =
    `Hi Mads,\n\nPlease remove the photo with ID #${props.photoId} from the Cold Turkey Cape Town wall.\n\n` +
    `(Optional) A bit about which photo / why:\n`
  return `mailto:mads@madsnorgaard.net?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
})
</script>

<style scoped>
.takedown {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.04em;
  color: var(--color-muted);
  text-decoration: none;
  opacity: 0.55;
  transition: opacity 150ms ease, color 150ms ease;
}
.takedown:hover { opacity: 1; color: var(--color-accent); }
</style>
