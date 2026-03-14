<template>
  <div class="status-block">
    <div class="status-block__rule" aria-hidden="true">━━━━━━━━━━━━━━━━━━━━━</div>
    <div class="status-block__label">status</div>
    <div class="status-block__rule" aria-hidden="true">━━━━━━━━━━━━━━━━━━━━━</div>

    <dl class="status-block__grid">
      <div class="status-block__row">
        <dt>location</dt>
        <dd>{{ status?.location ?? 'Skanderborg, Denmark' }}</dd>
      </div>

      <div class="status-block__row">
        <dt>employer</dt>
        <dd>{{ status?.employer ?? 'Eksponent' }}</dd>
      </div>

      <div class="status-block__row">
        <dt>availability</dt>
        <dd>
          <span
            class="status-block__dot"
            :class="`status-block__dot--${status?.availability ?? 'available'}`"
            aria-hidden="true"
          />
          {{ availabilityLabel }}
          <span v-if="status?.availabilityNote" class="status-block__note"> ({{ status.availabilityNote }})</span>
        </dd>
      </div>

      <div v-if="status?.lastCommit" class="status-block__row">
        <dt>last commit</dt>
        <dd>{{ status.lastCommit.timeAgo }} · {{ status.lastCommit.repo }}</dd>
      </div>

      <div v-if="status?.activeLanguages?.length" class="status-block__row">
        <dt>active in</dt>
        <dd>{{ status.activeLanguages.join(', ') }}</dd>
      </div>

      <div v-if="status?.lastPhoto" class="status-block__row">
        <dt>last photo</dt>
        <dd>
          <a :href="status.lastPhoto.url" class="status-block__photo-link">
            {{ status.lastPhoto.archiveNumber }} {{ status.lastPhoto.title }} →
          </a>
        </dd>
      </div>
    </dl>

    <div class="status-block__rule" aria-hidden="true">━━━━━━━━━━━━━━━━━━━━━</div>
  </div>
</template>

<script setup lang="ts">
import type { StatusBlock as StatusBlockType } from '~/types/status'

const props = defineProps<{
  status: StatusBlockType | null
}>()

const availabilityLabel = computed(() => {
  switch (props.status?.availability) {
    case 'available':    return 'available'
    case 'busy':         return 'busy'
    case 'not-available': return 'not available'
    default:             return 'available'
  }
})
</script>

<style scoped>
.status-block {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.875rem;
  line-height: 1.6;
  padding: 1.5rem 0;
}

.status-block__rule {
  color: var(--color-border, #2A2A2A);
  user-select: none;
  margin: 0.25rem 0;
}

.status-block__label {
  padding: 0.4rem 0;
  color: var(--color-muted, #6B6763);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.status-block__grid {
  margin: 0;
  padding: 0.5rem 0;
}

.status-block__row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 1rem;
  padding: 0.2rem 0;
}

.status-block__row dt {
  color: var(--color-muted, #6B6763);
  font-weight: 400;
}

.status-block__row dd {
  margin: 0;
  color: var(--color-text, #F0EDE6);
}

.status-block__dot {
  display: inline-block;
  width: 0.5em;
  height: 0.5em;
  border-radius: 50%;
  vertical-align: middle;
  margin-right: 0.3em;
}

.status-block__dot--available {
  background: #28C840;
  animation: pulse 2s ease-in-out infinite;
}

.status-block__dot--busy {
  background: #FEBC2E;
}

.status-block__dot--not-available {
  background: #FF5F57;
}

@keyframes pulse {
  0%, 100% { opacity: 1;   box-shadow: 0 0 0 0 rgba(40, 200, 64, 0.4); }
  50%       { opacity: 0.8; box-shadow: 0 0 0 4px rgba(40, 200, 64, 0);  }
}

.status-block__note {
  color: var(--color-muted, #6B6763);
}

.status-block__photo-link {
  color: var(--color-accent, #C41E3A);
  text-decoration: none;
}

.status-block__photo-link:hover {
  text-decoration: underline;
}
</style>
