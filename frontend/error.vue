<template>
  <div class="error-page">
    <!-- Site Header (matches default layout) -->
    <header class="site-header">
      <NuxtLink to="/" class="site-header__logo">
        Mads <span class="accent">Nørgaard</span>
      </NuxtLink>
      <nav>
        <ul class="site-nav">
          <li><NuxtLink to="/cv">CV</NuxtLink></li>
          <li><NuxtLink to="/writing">Writing</NuxtLink></li>
          <li><NuxtLink to="/projects">Projects</NuxtLink></li>
          <li><NuxtLink to="/with">Stack</NuxtLink></li>
        </ul>
      </nav>
    </header>

    <main class="error-page__main">
      <div
        ref="termEl"
        class="error-terminal"
        :class="{ 'error-terminal--glitch': glitching }"
        @click="focusInput"
      >
        <!-- Spectrum stripe -->
        <div class="error-terminal__spectrum" aria-hidden="true" />

        <!-- Title bar -->
        <div class="error-terminal__bar">
          <span class="error-terminal__dot error-terminal__dot--red" />
          <span class="error-terminal__dot error-terminal__dot--yellow" />
          <span class="error-terminal__dot error-terminal__dot--green" />
          <span class="error-terminal__label">diagnostics@madsnorgaard.net: fault</span>
          <span class="error-terminal__code">{{ error?.statusCode || 500 }}</span>
        </div>

        <!-- Boot / diagnostic output -->
        <div ref="outputEl" class="error-terminal__output">
          <div
            v-for="(line, i) in lines"
            :key="i"
            class="error-terminal__line"
            :class="line.type ? `error-terminal__line--${line.type}` : ''"
          >{{ line.text }}</div>

          <!-- Post-boot interactive prompt -->
          <template v-if="booted">
            <div
              v-for="(item, i) in history"
              :key="'h' + i"
              class="error-terminal__history"
            >
              <div class="error-terminal__prompt-line">
                <span class="error-terminal__prompt">visitor@madsnorgaard.net:~$ </span>
                <span>{{ item.cmd }}</span>
              </div>
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div v-if="item.output" class="error-terminal__output-text" v-html="item.output" />
            </div>

            <div class="error-terminal__prompt-line error-terminal__current">
              <span class="error-terminal__prompt">visitor@madsnorgaard.net:~$ </span>
              <span class="error-terminal__input-display">{{ currentInput }}<span class="error-terminal__cursor" /></span>
            </div>
          </template>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="site-footer container">
      <span>Mads Nørgaard, Skanderborg, Denmark</span>
      <span>
        <a href="mailto:mads@madsnorgaard.net">mads@madsnorgaard.net</a>
        ·
        <a href="https://github.com/madsnorgaard" target="_blank" rel="noopener noreferrer">github.com/madsnorgaard</a>
      </span>
    </footer>

    <input
      ref="inputEl"
      v-model="currentInput"
      class="error-terminal__hidden-input"
      type="text"
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
      aria-label="Terminal input"
      :disabled="!booted"
      @keydown="handleKeydown"
    />

    <AppCursor />
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const termEl = ref<HTMLElement | null>(null)
const outputEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)

interface Line { text: string; type?: 'ok' | 'fail' | 'warn' | 'accent' | 'dim' | 'ascii' | 'blank' }
interface HistoryItem { cmd: string; output: string }

const lines = ref<Line[]>([])
const booted = ref(false)
const glitching = ref(false)
const currentInput = ref('')
const history = ref<HistoryItem[]>([])
const cmdHistory = ref<string[]>([])
const historyIndex = ref(-1)

const code = computed(() => props.error?.statusCode || 500)
const path = computed(() => {
  if (import.meta.client) return window.location.pathname
  return '/'
})

const is404 = computed(() => code.value === 404)

function delay(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

function randomHex(len = 4): string {
  return Array.from({ length: len }, () =>
    Math.floor(Math.random() * 16).toString(16).toUpperCase()
  ).join('')
}

// ── ASCII art for error codes ────────────────────────────────────────────────

const ASCII_404 = [
  '  ┌─────────────────────────────────────┐',
  '  │  ██╗  ██╗ ██████╗ ██╗  ██╗         │',
  '  │  ██║  ██║██╔═████╗██║  ██║         │',
  '  │  ███████║██║██╔██║███████║         │',
  '  │  ╚════██║████╔╝██║╚════██║         │',
  '  │       ██║╚██████╔╝     ██║         │',
  '  │       ╚═╝ ╚═════╝      ╚═╝         │',
  '  └─────────────────────────────────────┘',
]

const ASCII_500 = [
  '  ┌─────────────────────────────────────┐',
  '  │  ███████╗ ██████╗  ██████╗         │',
  '  │  ██╔════╝██╔═████╗██╔═████╗        │',
  '  │  ███████╗██║██╔██║██║██╔██║        │',
  '  │  ╚════██║████╔╝██║████╔╝██║        │',
  '  │  ███████║╚██████╔╝╚██████╔╝        │',
  '  │  ╚══════╝ ╚═════╝  ╚═════╝         │',
  '  └─────────────────────────────────────┘',
]

// ── Boot sequence ────────────────────────────────────────────────────────────

async function runDiagnostic() {
  const add = (text: string, type?: Line['type']) => {
    lines.value.push({ text, type })
    scrollToBottom()
  }

  add('╔══════════════════════════════════════════════╗')
  await delay(80)
  add('║  FAULT DIAGNOSTICS  v2.0                     ║')
  await delay(60)
  add(`║  SESSION: ${randomHex(6)}  ·  ${new Date().toISOString().slice(0, 10)}        ║`)
  await delay(60)
  add('╠══════════════════════════════════════════════╣')
  await delay(100)

  add(`  REQUEST: GET ${path.value}`, 'dim')
  await delay(90)
  add(`  PROTOCOL: HTTP/1.1`, 'dim')
  await delay(70)

  add('')
  add('  HANDSHAKE.....................................OK', 'ok')
  await delay(100)
  add('  BACKEND CONNECTION (DRUPAL 11)..............OK', 'ok')
  await delay(90)
  add('  JSONAPI ENDPOINTS...........................OK', 'ok')
  await delay(80)
  add('  NUXT SERVER ROUTES..........................OK', 'ok')
  await delay(70)

  // The failing check — glitch before reveal
  if (is404.value) {
    add('  R̸O̵U̷T̶E̵ ̷R̴E̵S̵O̷L̶U̷T̵I̸O̵N̴.̷.̵.̷.̷.̵.̷.̵.̷.̵.̷.̵.̷.̵.̷.̵.̷.̵.̷', 'fail')
    glitching.value = true
    await delay(600)
    lines.value[lines.value.length - 1] = { text: '  ROUTE RESOLUTION............................FAIL', type: 'fail' }
    glitching.value = false
  } else {
    add('  ROUTE RESOLUTION............................OK', 'ok')
    await delay(80)
    add('  S̸E̵R̷V̶E̵R̸ ̵R̶E̷S̴P̷O̵N̶S̸E̵.̷.̵.̷.̵.̷.̵.̷.̵.̷.̵.̷.̵.̷.̵.̷.̵.̷.̵.̷', 'fail')
    glitching.value = true
    await delay(600)
    lines.value[lines.value.length - 1] = { text: '  SERVER RESPONSE.............................FAIL', type: 'fail' }
    glitching.value = false
  }

  await delay(200)
  add('')
  add('╚══════════════════════════════════════════════╝')
  await delay(250)

  // Glitch in the ASCII error code
  glitching.value = true
  await delay(150)
  add('')
  const asciiArt = is404.value ? ASCII_404 : ASCII_500
  for (const line of asciiArt) {
    add(line, 'ascii')
    await delay(35)
  }
  await delay(100)
  glitching.value = false

  await delay(300)
  add('')

  if (is404.value) {
    add(`  The route ${path.value} does not resolve.`, 'warn')
    add('  This path has no handler — it was never here,', 'dim')
    add('  or it moved and left no forwarding address.', 'dim')
  } else {
    add(`  Status ${code.value}: ${props.error?.statusMessage || 'Internal Server Error'}`, 'warn')
    add('  The server encountered an unexpected condition.', 'dim')
  }

  await delay(200)
  add('')
  add('  Available recovery routes:', 'accent')
  await delay(80)
  add('    home       →  /                         [landing page]', 'dim')
  add('    writing    →  /writing                  [blog archive]', 'dim')
  add('    projects   →  /projects                 [portfolio]', 'dim')
  add('    cv         →  /cv                       [work history]', 'dim')

  await delay(200)
  add('')
  add('  Type a destination or use the nav above.', 'accent')
  add('')

  booted.value = true
  await nextTick()
  inputEl.value?.focus()
}

// ── Commands ─────────────────────────────────────────────────────────────────

const ROUTES: Record<string, string> = {
  home: '/',
  '/': '/',
  writing: '/writing',
  blog: '/writing',
  projects: '/projects',
  cv: '/cv',
  stack: '/with',
  with: '/with',
}

function escapeHtml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function handleCommand(raw: string) {
  const cmd = raw.trim().toLowerCase()
  if (!cmd) return

  cmdHistory.value.push(raw)
  historyIndex.value = -1

  if (cmd === 'help') {
    history.value.push({
      cmd: raw,
      output: [
        '<span style="color: #D0243E;">Available commands:</span>',
        '',
        '  home       Navigate to the landing page',
        '  writing    Browse the blog archive',
        '  projects   View the project portfolio',
        '  cv         Read the work history',
        '  stack      See the tech stack',
        '  help       Show this message',
        '  clear      Clear the terminal',
      ].join('\n'),
    })
  } else if (cmd === 'clear') {
    history.value = []
    return
  } else if (ROUTES[cmd]) {
    history.value.push({
      cmd: raw,
      output: `<span style="color: #8C8680;">Navigating to ${ROUTES[cmd]}...</span>`,
    })
    clearError({ redirect: ROUTES[cmd] })
    return
  } else {
    history.value.push({
      cmd: raw,
      output: `<span style="color: #D0243E;">bash: ${escapeHtml(cmd)}: route not found</span>\n<span style="color: #8C8680;">Type <span style="color: #F0EDE6;">help</span> for available commands.</span>`,
    })
  }

  scrollToBottom()
}

// ── Input handling ───────────────────────────────────────────────────────────

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    handleCommand(currentInput.value)
    currentInput.value = ''
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    navigateHistory(-1)
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    navigateHistory(1)
  } else if (e.key === 'Tab') {
    e.preventDefault()
    tabComplete()
  }
}

function navigateHistory(direction: -1 | 1) {
  const newIndex = historyIndex.value - direction
  if (newIndex < -1 || newIndex >= cmdHistory.value.length) return
  historyIndex.value = newIndex
  currentInput.value = newIndex === -1 ? '' : cmdHistory.value[cmdHistory.value.length - 1 - newIndex]
}

function tabComplete() {
  const partial = currentInput.value.trim().toLowerCase()
  if (!partial) return
  const match = Object.keys(ROUTES).concat('help', 'clear').find(c => c.startsWith(partial))
  if (match) currentInput.value = match
}

function focusInput() {
  if (!booted.value) return
  inputEl.value?.focus()
}

function scrollToBottom() {
  nextTick(() => {
    if (outputEl.value) outputEl.value.scrollTop = outputEl.value.scrollHeight
  })
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(() => {
  runDiagnostic()
})

useHead({
  title: `${code.value} | Mads Nørgaard`,
  meta: [
    { name: 'robots', content: 'noindex' },
  ],
})
</script>

<style scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.error-page__main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
}

/* ── Terminal container ───────────────────────────────────────────────── */

.error-terminal {
  background: #0E0E0E;
  border: 1px solid #2A2A2A;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.8rem;
  color: #F0EDE6;
  cursor: text;
  width: 100%;
  max-width: 700px;
  min-height: 480px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

/* CRT scanlines */
.error-terminal::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0px,
    transparent 2px,
    rgba(0, 0, 0, 0.055) 2px,
    rgba(0, 0, 0, 0.055) 4px
  );
  pointer-events: none;
  z-index: 10;
}

/* ── Spectrum stripe ──────────────────────────────────────────────────── */

.error-terminal__spectrum {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(
    to bottom,
    #ff2020 0%, #ff6600 18%, #ffcc00 34%,
    #00cc44 50%, #0099ff 66%, #7733cc 82%, #ff0066 100%
  );
  opacity: 0.5;
  z-index: 2;
  pointer-events: none;
}

/* ── Title bar ────────────────────────────────────────────────────────── */

.error-terminal__bar {
  background: #1A1A1A;
  padding: 0.6rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border-bottom: 1px solid #2A2A2A;
  flex-shrink: 0;
}

.error-terminal__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
.error-terminal__dot--red    { background: #FF5F57; }
.error-terminal__dot--yellow { background: #FEBC2E; }
.error-terminal__dot--green  { background: #28C840; }

.error-terminal__label {
  margin-left: 0.5rem;
  font-size: 0.75rem;
  color: #6B6763;
  flex: 1;
}

.error-terminal__code {
  font-size: 0.65rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(208, 36, 62, 0.9);
  border: 1px solid rgba(208, 36, 62, 0.4);
  padding: 0.15em 0.6em;
  border-radius: 2px;
  animation: pulse-code 2s ease infinite;
}

/* ── Output area ──────────────────────────────────────────────────────── */

.error-terminal__output {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.25rem;
  line-height: 1.65;
  white-space: pre;
}

.error-terminal__line {
  min-height: 1.2em;
}
.error-terminal__line--ok    { color: #28C840; }
.error-terminal__line--fail  { color: #D0243E; }
.error-terminal__line--warn  { color: #FEBC2E; }
.error-terminal__line--accent { color: #D0243E; }
.error-terminal__line--dim   { color: #6B6763; }
.error-terminal__line--ascii { color: #D0243E; opacity: 0.85; }
.error-terminal__line--blank { height: 0.6em; }

/* ── Interactive prompt ───────────────────────────────────────────────── */

.error-terminal__prompt {
  color: #8C8680;
}

.error-terminal__prompt-line {
  display: flex;
}

.error-terminal__history {
  margin-top: 0.25rem;
}

.error-terminal__output-text {
  color: #8C8680;
  white-space: pre-wrap;
  padding-left: 0;
}

.error-terminal__current {
  margin-top: 0.25rem;
}

.error-terminal__input-display {
  display: inline;
}

.error-terminal__cursor {
  display: inline-block;
  width: 0.55em;
  height: 1.1em;
  background: #F0EDE6;
  vertical-align: text-bottom;
  margin-left: 1px;
  animation: blink-error-cursor 1s steps(1) infinite;
}

.error-terminal__hidden-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 0;
  height: 0;
}

/* ── Glitch effect ────────────────────────────────────────────────────── */

.error-terminal--glitch {
  animation: error-glitch 0.6s steps(1) forwards;
}

.error-terminal--glitch .error-terminal__output {
  animation: error-clip 0.12s steps(1) 4;
  text-shadow: 2px 0 rgba(255, 0, 64, 0.7), -2px 0 rgba(0, 255, 255, 0.6);
}

.error-terminal--glitch .error-terminal__spectrum {
  animation: error-spectrum-flash 0.6s steps(1) forwards;
}

/* ── Keyframes ────────────────────────────────────────────────────────── */

@keyframes blink-error-cursor {
  0%, 100% { background: #F0EDE6; }
  50%      { background: #D0243E; }
}

@keyframes pulse-code {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.5; }
}

@keyframes error-glitch {
  0%   { filter: none; transform: none; }
  8%   { filter: brightness(2) hue-rotate(180deg) saturate(6); transform: translateX(-3px); }
  16%  { filter: none; transform: none; }
  24%  { filter: brightness(0.5) saturate(8) hue-rotate(-90deg); transform: translateX(3px) translateY(1px); }
  32%  { filter: none; transform: none; }
  48%  { filter: invert(0.15) hue-rotate(90deg); transform: translateX(-2px); }
  56%  { filter: none; transform: none; }
  100% { filter: none; transform: none; }
}

@keyframes error-clip {
  0%   { clip-path: inset(40% 0 20% 0); }
  25%  { clip-path: inset(10% 0 60% 0); }
  50%  { clip-path: inset(70% 0 5% 0); }
  75%  { clip-path: inset(25% 0 35% 0); }
  100% { clip-path: inset(0); }
}

@keyframes error-spectrum-flash {
  0%   { opacity: 0.5; filter: none; }
  15%  { opacity: 1; filter: brightness(3) saturate(2); }
  30%  { opacity: 0.2; }
  50%  { opacity: 1; filter: brightness(2); }
  70%  { opacity: 0.3; }
  100% { opacity: 0.5; filter: none; }
}

/* ── Responsive ───────────────────────────────────────────────────────── */

@media (max-width: 768px) {
  .error-terminal {
    font-size: 0.7rem;
    min-height: 400px;
  }

  .error-page__main {
    align-items: flex-start;
    padding-top: 1.5rem;
  }
}
</style>
