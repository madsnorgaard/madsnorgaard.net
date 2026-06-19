<template>
  <section class="gb" aria-labelledby="gb-heading">
    <h2 id="gb-heading" class="gb__heading">Memories from this night</h2>

    <!-- Approved notes -->
    <ul v-if="notes.length" class="gb__list">
      <li v-for="note in notes" :key="note.id" class="gb__note">
        <p class="gb__msg">{{ note.message }}</p>
        <p class="gb__by">
          <span class="gb__name">{{ note.name }}</span>
          <span v-if="note.date" class="gb__date">· {{ formatDate(note.date) }}</span>
        </p>
      </li>
    </ul>
    <p v-else class="gb__empty">No memories yet. Be the first to leave one.</p>

    <!-- Leave a memory -->
    <form class="gb__form" @submit.prevent="submit">
      <p v-if="state === 'done'" class="gb__thanks">
        Thanks, {{ lastName || 'friend' }} - your memory appears once it's approved.
      </p>
      <template v-else>
        <label class="gb__label">
          <span class="gb__label-txt">Your name</span>
          <input
            v-model="name"
            class="gb__input"
            type="text"
            maxlength="60"
            required
            autocomplete="name"
          />
        </label>
        <label class="gb__label">
          <span class="gb__label-txt">Your memory of this night</span>
          <textarea
            v-model="message"
            class="gb__input gb__textarea"
            rows="3"
            maxlength="600"
            required
          />
        </label>
        <!-- honeypot: hidden from humans, catches bots -->
        <input
          v-model="hp"
          class="gb__hp"
          type="text"
          tabindex="-1"
          autocomplete="off"
          aria-hidden="true"
        />
        <div class="gb__actions">
          <button class="gb__submit" type="submit" :disabled="state === 'sending' || !canSubmit">
            {{ state === 'sending' ? 'Sending…' : 'Leave a memory' }}
          </button>
          <span v-if="state === 'error'" class="gb__err">Could not send - try again.</span>
        </div>
      </template>
    </form>
  </section>
</template>

<script setup lang="ts">
import type { EventNote } from '~/types/event'
import { formatDate } from '~/composables/useContentMeta'

const props = defineProps<{ setSlug: string }>()

// Plain fetch (not async setup) so the component can mount/unmount under v-if
// when a night is selected without suspense surprises.
const notes = ref<EventNote[]>([])

async function loadNotes() {
  const res = await $fetch<{ notes: EventNote[] }>('/api/event/notes', {
    query: { set: props.setSlug },
  }).catch(() => null)
  notes.value = res?.notes ?? []
}

onMounted(loadNotes)
watch(() => props.setSlug, loadNotes)

const name = ref('')
const message = ref('')
const hp = ref('')
const lastName = ref('')
const state = ref<'idle' | 'sending' | 'done' | 'error'>('idle')

const canSubmit = computed(() => name.value.trim().length > 0 && message.value.trim().length > 0)

async function submit() {
  if (!canSubmit.value || state.value === 'sending') return
  state.value = 'sending'
  lastName.value = name.value.trim()
  try {
    await $fetch('/api/event/notes', {
      method: 'POST',
      body: { set: props.setSlug, name: name.value, message: message.value, hp: hp.value },
    })
    state.value = 'done'
    name.value = ''
    message.value = ''
  } catch {
    state.value = 'error'
  }
}
</script>

<style scoped>
.gb {
  max-width: 42rem;
  margin: 1rem auto 4rem;
  padding: 2rem 1rem 0;
  border-top: 1px solid var(--color-border);
}

.gb__heading {
  font-family: var(--font-display);
  font-size: 1.4rem;
  color: var(--color-text);
  margin-bottom: 1.25rem;
}

.gb__list { list-style: none; padding: 0; margin: 0 0 2rem; display: grid; gap: 1.1rem; }

.gb__note {
  border-left: 2px solid var(--color-border);
  padding-left: 1rem;
}
.gb__msg {
  font-family: var(--font-mono);
  font-size: 0.92rem;
  line-height: 1.6;
  color: var(--color-text);
  margin: 0 0 0.35rem;
}
.gb__by { font-family: var(--font-mono); font-size: 0.68rem; color: var(--color-muted); margin: 0; }
.gb__name { color: var(--color-accent); }
.gb__date { opacity: 0.7; }

.gb__empty {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-muted);
  margin-bottom: 2rem;
}

.gb__form { display: grid; gap: 0.75rem; }
.gb__label { display: grid; gap: 0.3rem; }
.gb__label-txt {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-muted);
}
.gb__input {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 0.55rem 0.7rem;
  width: 100%;
}
.gb__input:focus { outline: none; border-color: var(--color-accent); }
.gb__textarea { resize: vertical; line-height: 1.5; }

/* honeypot - visually + AT hidden, still submitted */
.gb__hp {
  position: absolute !important;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.gb__actions { display: flex; align-items: center; gap: 1rem; }
.gb__submit {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-accent);
  background: none;
  border: 1px solid var(--color-accent);
  padding: 0.55rem 1.1rem;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease;
}
.gb__submit:hover:not(:disabled) { background: var(--color-accent); color: var(--color-bg); }
.gb__submit:disabled { opacity: 0.5; cursor: not-allowed; }

.gb__err { font-family: var(--font-mono); font-size: 0.7rem; color: var(--color-accent); }
.gb__thanks {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--color-text);
  padding: 0.5rem 0;
}
</style>
