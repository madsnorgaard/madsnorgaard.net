<template>
  <div ref="termEl" class="terminal"
       :class="[{ 'terminal--glitch': glitching }, glitching ? `terminal--glitch-${glitchLevel}` : '']"
       @click="focusInput">
    <!-- Arc Raiders–inspired spectrum stripe -->
    <div class="terminal__spectrum" aria-hidden="true" />

    <!-- Title bar -->
    <div class="terminal__bar">
      <span class="terminal__dot terminal__dot--red" />
      <span class="terminal__dot terminal__dot--yellow" />
      <span class="terminal__dot terminal__dot--green" />
      <span class="terminal__label">visitor@madsnorgaard.net: bash</span>
      <span v-if="achievementCount > 0" class="terminal__found-badge">{{ achievementCount }} / {{ ACHIEVEMENT_DEFS.length }}</span>
    </div>

    <!-- Boot sequence -->
    <div v-if="!booted" class="terminal__boot" aria-live="polite">
      <div
        v-for="(line, i) in bootLines"
        :key="i"
        class="terminal__boot-line"
      >{{ line }}</div>
    </div>

    <!-- Main output (after boot) -->
    <template v-else>
      <div ref="outputEl" class="terminal__output">
        <div class="terminal__welcome">
          <p>Welcome. Type <span class="terminal__cmd-hint">help</span> to see available commands.</p>
        </div>

        <div
          v-for="(item, i) in history"
          :key="i"
          class="terminal__history-item"
        >
          <div class="terminal__prompt-line">
            <span class="terminal__prompt">visitor@madsnorgaard.net:~$ </span>
            <span>{{ item.cmd }}</span>
          </div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-if="item.output" class="terminal__output-text" v-html="item.output" />
        </div>

        <!-- Ghost bleed-through — fades in then out, no interaction needed -->
        <Transition name="ghost">
          <div v-if="ghostMessage" class="terminal__ghost-line" aria-hidden="true">
            {{ ghostMessage }}
          </div>
        </Transition>

        <!-- Current prompt -->
        <div class="terminal__prompt-line terminal__current">
          <span class="terminal__prompt">visitor@madsnorgaard.net:~$ </span>
          <span class="terminal__input-display">{{ currentInput }}<span class="terminal__cursor" /></span>
        </div>
      </div>

      <!-- Rotating hint strip -->
      <div class="terminal__hint-bar" aria-hidden="true">
        <span class="terminal__hint-text" :key="hintIndex">{{ HINTS[hintIndex % HINTS.length] }}</span>
      </div>
    </template>

    <input
      ref="inputEl"
      v-model="currentInput"
      class="terminal__hidden-input"
      type="text"
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
      aria-label="Terminal input"
      :disabled="!booted"
      @keydown="handleKeydown"
    />
  </div>
</template>

<script setup lang="ts">
interface HistoryItem {
  cmd: string
  output: string
}

// ── State ─────────────────────────────────────────────────────────────────────

const termEl   = ref<HTMLElement | null>(null)
const outputEl = ref<HTMLElement | null>(null)
const inputEl  = ref<HTMLInputElement | null>(null)

const currentInput = ref('')
const history      = ref<HistoryItem[]>([])
const cmdHistory   = ref<string[]>([])
const historyIndex = ref(-1)
const cmdCount          = ref(0)
const vimOpen           = ref(false)
const glitching         = ref(false)
const booted            = ref(false)
const bootLines         = ref<string[]>([])
const hintIndex         = ref(0)
const glitchQuestStage  = ref(0)   // 0=not started 1=glitch run 2=trace run 3=locate run 4=complete
const glitchFragment    = ref('')
const glitchLevel       = ref(1)   // 1–4, drives CSS intensity class
const ghostMessage      = ref('')  // bleeds through output, fades out
let ghostTimer: ReturnType<typeof setTimeout> | null = null

function showGhost() {
  if (glitchQuestStage.value > 0) return  // quest already found, no more hints
  ghostMessage.value = `// ${randomHex(4)}-${randomHex(4)} · carrier detected`
  if (ghostTimer) clearTimeout(ghostTimer)
  ghostTimer = setTimeout(() => { ghostMessage.value = '' }, 5000)
}

function randomHex(len = 4): string {
  return Array.from({ length: len }, () =>
    Math.floor(Math.random() * 16).toString(16).toUpperCase()
  ).join('')
}

// Returns { ms, display } scaled to quest level (1–4)
function glitchTime(level: number): { ms: number; display: string } {
  const ranges: [number, number][] = [[650, 1100], [1200, 1900], [2000, 3000], [3500, 5000]]
  const [lo, hi] = ranges[Math.min(level - 1, 3)]
  const ms = Math.floor(Math.random() * (hi - lo) + lo)
  return { ms, display: (ms / 1000).toFixed(1) }
}

const HINTS = [
  '[ TAB ] autocomplete  ·  [ ↑↓ ] command history',
  '[ ops ] pull live intel from Drupal backend',
  '[ neofetch ] system info  ·  [ fortune ] developer wisdom',
  '[ map ] infrastructure topology  ·  [ decode ] ???',
  '[ achievements ] track your progress  ·  [ man mads ] RTFM',
]

// ── Boot sequence ─────────────────────────────────────────────────────────────

const BOOT_SEQUENCE = [
  '╔══════════════════════════════════════════════╗',
  '║  VISITOR TERMINAL  v2.0                      ║',
  `║  SESSION: ${Date.now().toString(16).slice(-6).toUpperCase()}  ·  ${new Date().toISOString().slice(0, 10)}        ║`,
  '╠══════════════════════════════════════════════╣',
  '  HANDSHAKE.....................................OK',
  '  BACKEND CONNECTION (DRUPAL 11)..............OK',
  '  JSONAPI ENDPOINTS...........................OK',
  '  NUXT SERVER ROUTES..........................OK',
  '  VISITOR AUTHENTICATION...............BYPASSED',
  '',
  '  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 100%',
  '',
  '╚══════════════════════════════════════════════╝',
  '',
  '  ACCESS GRANTED — welcome, visitor.',
]

function delay(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

async function runBootSequence() {
  for (let i = 0; i < BOOT_SEQUENCE.length; i++) {
    const wait = i === 0 ? 150 : i < 4 ? 55 : i < 11 ? 75 : 130
    await delay(wait)
    // Auth line glitches briefly before resolving — first hint something is leaking
    if (i === 8) {
      bootLines.value.push('  V̵I̶S̷I̸T̵O̷R̶ ̵A̴U̶T̴H̷E̸N̴T̷I̶C̵A̸T̶I̷O̵N̴.̶.̷.̵B̸Y̷P̶A̴S̶S̷E̸D̴')
      await delay(320)
      bootLines.value[bootLines.value.length - 1] = BOOT_SEQUENCE[i]
    } else {
      bootLines.value.push(BOOT_SEQUENCE[i])
    }
  }
  await delay(520)
  booted.value = true
  await nextTick()
  inputEl.value?.focus()
  termEl.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

// ── Scroll helpers ─────────────────────────────────────────────────────────────

function focusInput() {
  if (!booted.value) return
  inputEl.value?.focus()
  nextTick(() => {
    if (!termEl.value) return
    const rect = termEl.value.getBoundingClientRect()
    if (rect.bottom > window.innerHeight || rect.top < 56) {
      termEl.value.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  })
}

function scrollToBottom() {
  nextTick(() => {
    if (outputEl.value) outputEl.value.scrollTop = outputEl.value.scrollHeight
    if (termEl.value) {
      const rect = termEl.value.getBoundingClientRect()
      if (rect.bottom > window.innerHeight)
        termEl.value.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  })
}

// ── Keyboard / input ───────────────────────────────────────────────────────────

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault(); submitCommand()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault(); navigateHistory(-1)
  } else if (e.key === 'ArrowDown') {
    e.preventDefault(); navigateHistory(1)
  } else if (e.key === 'Tab') {
    e.preventDefault(); tabComplete()
  }
}

function navigateHistory(direction: -1 | 1) {
  const newIndex = historyIndex.value - direction
  if (newIndex < -1 || newIndex >= cmdHistory.value.length) return
  historyIndex.value = newIndex
  currentInput.value = newIndex === -1 ? '' : cmdHistory.value[cmdHistory.value.length - 1 - newIndex]
}

const ALL_COMMANDS = [
  'help', 'whoami', 'skills', 'work', 'contact', 'ls', 'clear', 'man', 'sudo', 'rm',
  'git', 'curl', 'exit', 'pwd', 'uname', 'docker', 'ssh', 'vim', 'cat', 'history',
  'date', 'uptime', 'neofetch', 'achievements', 'fortune', 'ping', 'top', 'cowsay',
  'ops', 'map', 'decode', 'glitch', 'trace', 'locate', 'transmit', 'sahistory',
  // aurora is intentionally NOT listed — tab-complete reveals it to the very curious
  'aurora',
]

function tabComplete() {
  const partial = currentInput.value.trim()
  if (!partial) return
  const matches = ALL_COMMANDS.filter(c => c.startsWith(partial))
  if (matches.length === 1) {
    currentInput.value = matches[0]
  } else if (matches.length > 1) {
    addOutput('', matches.join('  '))
  }
}

// ── Security ──────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

// ── Achievement system ─────────────────────────────────────────────────────────

const ACHIEVEMENT_DEFS = [
  { id: 'first_blood',      name: 'first blood',      desc: 'ran your first command' },
  { id: 'who_am_i',         name: 'identity crisis',  desc: 'asked whoami' },
  { id: 'not_root',         name: 'not root',         desc: 'tried sudo' },
  { id: 'no_exit',          name: 'no exit',          desc: 'tried to leave' },
  { id: 'vim_survivor',     name: 'vim survivor',     desc: 'escaped vim (most cannot)' },
  { id: 'points_fingers',   name: 'points fingers',   desc: 'ran git blame' },
  { id: 'container_ship',   name: 'container ship',   desc: 'inspected docker ps' },
  { id: 'locked_out',       name: 'locked out',       desc: 'tried to SSH in' },
  { id: 'dotfile_fan',      name: 'dotfile fan',      desc: 'read ~/.bashrc' },
  { id: 'nice_try',         name: 'nice try',         desc: 'attempted rm -rf' },
  { id: 'rice_inspector',   name: 'rice inspector',   desc: 'ran neofetch' },
  { id: 'intel_officer',    name: 'intel officer',    desc: 'pulled live Drupal data' },
  { id: 'cartographer',     name: 'cartographer',     desc: 'mapped the infrastructure' },
  { id: 'signal_lost',      name: 'signal lost',      desc: 'initiated the glitch' },
  { id: 'signal_traced',    name: 'signal traced',    desc: 'followed the corrupted carrier wave' },
  { id: 'source_located',   name: 'source located',   desc: 'found where the signal came from' },
  { id: 'ghost_in_machine', name: 'ghost in machine', desc: 'received the full transmission' },
  { id: 'explorer',         name: 'explorer',         desc: 'ran 5+ commands' },
  { id: 'archaeologist',    name: 'archaeologist',    desc: 'ran 10+ commands' },
  { id: 'found_designer',   name: 'found the designer', desc: '???' },
]

const unlockedAchievements = ref(new Set<string>())
const achievementCount = computed(() => unlockedAchievements.value.size)

function unlock(id: string): string {
  if (unlockedAchievements.value.has(id)) return ''
  unlockedAchievements.value.add(id)
  return ACHIEVEMENT_DEFS.find(a => a.id === id)?.name ?? id
}

function checkAchievements(cmd: string, output: string): string[] {
  const c = cmd.toLowerCase().trim()
  const found: string[] = []
  const add = (id: string) => { const n = unlock(id); if (n) found.push(n) }

  if (cmdCount.value === 1)                                          add('first_blood')
  if (c === 'whoami')                                                add('who_am_i')
  if (c === 'exit')                                                  add('no_exit')
  if (c.startsWith('sudo'))                                          add('not_root')
  if ((c === ':q!' || c === 'vim') && output.includes('escaped'))   add('vim_survivor')
  if (c.startsWith('git blame'))                                     add('points_fingers')
  if (c.startsWith('docker ps'))                                     add('container_ship')
  if (c === 'ssh')                                                   add('locked_out')
  if (c === 'cat .bashrc' || c === 'cat ~/.bashrc')                 add('dotfile_fan')
  if (c.startsWith('rm') && c.includes('-rf'))                      add('nice_try')
  if (c === 'neofetch')                                              add('rice_inspector')
  if (c === 'ops')                                                   add('intel_officer')
  if (c === 'map')                                                   add('cartographer')
  if (c === 'glitch')                                                add('signal_lost')
  if (c === 'trace' && glitchQuestStage.value >= 2)                 add('signal_traced')
  if (c === 'locate' && glitchQuestStage.value >= 3)                add('source_located')
  if (c === 'transmit' && glitchQuestStage.value >= 4)              add('ghost_in_machine')
  if (c === 'aurora')                                                add('found_designer')
  if (cmdCount.value >= 5)                                           add('explorer')
  if (cmdCount.value >= 10)                                          add('archaeologist')

  return found
}

// ── Async commands ─────────────────────────────────────────────────────────────

async function runLsWriting(): Promise<string> {
  try {
    const data = await $fetch<{ posts: any[]; total: number }>('/api/drupal/blog?page=1&limit=5')
    const posts = data.posts ?? []
    if (!posts.length) return '<pre>writing/  (no published posts)</pre>'
    const lines = posts.map((p) => {
      const date = p.date ? new Date(p.date).toISOString().slice(0, 10) : '????-??-??'
      const raw = p.title ?? 'untitled'
      const title = escapeHtml(raw.length > 46 ? raw.slice(0, 45) + '…' : raw)
      const slug = p.slug ?? ''
      return `  ${date}  ${title}\n             /writing/${escapeHtml(slug)}`
    }).join('\n')
    const total = data.total > 0 ? data.total : posts.length
    return `<pre>writing/  [${posts.length} of ${total}]\n\n${lines}</pre>`
  } catch {
    return '<pre>writing/  (could not reach backend)</pre>'
  }
}

async function runOps(): Promise<string> {
  try {
    const data = await $fetch<{ posts: any[]; total: number }>('/api/drupal/blog?page=1&limit=3')
    const posts = data.posts ?? []
    const total = data.total ?? 0
    const hr = '─'.repeat(47)

    const postLines = posts.length
      ? posts.map((p, i) => {
          const date = p.date ? new Date(p.date).toISOString().slice(0, 10) : '????-??-??'
          const rawTitle = p.title ?? 'UNKNOWN'
          const title = escapeHtml(rawTitle.length > 43 ? rawTitle.slice(0, 42) + '…' : rawTitle)
          const tags = (p.tags ?? []).map((t: any) => escapeHtml(t.name)).join(', ') || 'untagged'
          return `\n  ${i + 1}. ${title}\n     ${date}  ·  ${tags}`
        }).join('')
      : '\n  (no published posts found)'

    const archiveLine = total > 0
      ? `ARCHIVE TOTAL  : ${total} entries`
      : `RETRIEVED      : ${posts.length} posts (total count unavailable)`

    return `<pre class="terminal__ops">OPERATIONS INTEL  ─  madsnorgaard.net\n${hr}\nLATEST TRANSMISSIONS FROM DRUPAL BACKEND${postLines}\n\n${hr}\n${archiveLine}\nBACKEND        : Drupal 11 JSON:API\nPROXY          : Nuxt 3 server route\nSTATUS         : ${posts.length > 0 ? '█ NOMINAL' : '░ NO DATA'}\n${hr}</pre>`
  } catch {
    return '<pre>OPS: failed to reach backend\nCheck that Drupal is reachable from the server.</pre>'
  }
}

async function runDecode(): Promise<string> {
  await delay(700)
  return `<pre>DECODING TRANSMISSION...
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 100%

  _   _   _____  _      _       ___
 | | | | | ____|| |    | |     / _ \\
 | |_| | |  _|  | |    | |    | | | |
 |  _  | | |___ | |___ | |___ | |_| |
 |_| |_| |_____||_____||_____| \\___/

  Origin    : Skanderborg, Denmark
  Timestamp : ${new Date().toISOString()}
  Payload   : "Build with intention. Ship with care."

  transmission ends.</pre>`
}

// ── Command execution ──────────────────────────────────────────────────────────

async function submitCommand() {
  const cmd = currentInput.value.trim()
  if (!cmd || !booted.value) return

  cmdHistory.value.push(cmd)
  historyIndex.value = -1
  cmdCount.value++
  currentInput.value = ''

  // After 3rd command, bleed a ghost fragment through — hints something is transmitting
  if (cmdCount.value === 3) {
    setTimeout(showGhost, 800)
  }

  const rawOutput = runCommand(cmd)

  if (rawOutput instanceof Promise) {
    const histItem: HistoryItem = { cmd, output: '<pre class="terminal__loading">⠸ fetching intel…</pre>' }
    history.value.push(histItem)
    scrollToBottom()
    try {
      const resolved = await rawOutput
      const newAchievements = checkAchievements(cmd, resolved)
      histItem.output = resolved + newAchievements
        .map(a => `\n<span class="terminal__achievement">// unlocked: "${a}"</span>`)
        .join('')
    } catch {
      histItem.output = '<pre>error: command failed</pre>'
    }
    scrollToBottom()
  } else {
    let output = rawOutput
    const newAchievements = checkAchievements(cmd, output)
    if (newAchievements.length > 0) {
      output += newAchievements
        .map(a => `\n<span class="terminal__achievement">// unlocked: "${a}"</span>`)
        .join('')
    }
    if (cmd === 'clear') {
      history.value = []
    } else {
      history.value.push({ cmd, output })
    }
    scrollToBottom()
  }
}

function addOutput(cmd: string, output: string) {
  history.value.push({ cmd, output })
  scrollToBottom()
}

function runCommand(input: string): string | Promise<string> {
  const [cmd, ...args] = input.split(/\s+/)
  const arg = args.join(' ')

  switch (cmd.toLowerCase()) {

    case 'help':
      return `<pre>AVAILABLE COMMANDS
──────────────────────────────────────────────
  whoami        who is this person
  skills        technologies and proficiency
  work          work history
  contact       how to reach me
  ls            list things
  neofetch      system info + ascii art
  ops           live intel from Drupal backend ★
  map           infrastructure topology
  fortune       developer wisdom
  achievements  what you have found  [${achievementCount.value}/${ACHIEVEMENT_DEFS.length}]
  sahistory     South African History Online
  clear         clear terminal
  man mads      manual page
──────────────────────────────────────────────
Some commands have surprises. Explore.
Try: cat about.txt  ·  ls writing/  ·  ls -la

<span class="terminal__static">░░ ${randomHex(4)}-${randomHex(4)} ░░</span></pre>`

    case 'whoami':
      return `<pre>Mads Nørgaard.

Senior developer and DevOps engineer based in Skanderborg, Denmark.
Self-taught. 15 years building on Drupal, PHP, Docker, Linux.
Currently at Eksponent, Danish development agency.
Volunteering for South African History Online since 2010.
Documentary photographer.</pre>`

    case 'skills':
      return `<pre>Daily
  Drupal 11      primary craft (15+ years)
  PHP 8          still here, still fast
  Docker         everything lives in a container
  GitHub Actions automated the boring parts
  Vue / Nuxt 3   this site runs on it

Regularly
  Traefik  MariaDB  Redis  Solr  Linux

Occasionally
  TypeScript  Bash  Python

Currently learning
  Rust (for fun)  GraphQL

Retired
  WordPress       not gone, just less interesting now
  Symfony         2019–2021</pre>`

    case 'work':
      return `<pre>Senior Developer + DevOps
  Eksponent, 2024-present (employed)
  Drupal multisite management, production server admin.
  DDoS investigation and mitigation.
  AI crawler mitigation (Rudersdal Kommune, Skoletjenesten).
  ÅbenForms: headless Drupal 11 + Nuxt 3 for Danish municipalities.

Volunteer
  South African History Online, 2010-present
  25-year archival commitment. One of South Africa's most significant
  documentary history archives.
  Solr infrastructure on AlmaLinux.
  AI-assisted metadata system for 45,000+ history entries.</pre>`

    case 'contact':
      return `<pre>Email   mads@madsnorgaard.net
GitHub  github.com/madsnorgaard
CV      madsnorgaard.net/cv

──────────────────────────────────
I'm available for new work.
Drupal, DevOps, infrastructure, headless CMS.
Based in Denmark — work remotely across Europe.

If you're building something that matters,
I want to hear about it.</pre>`

    case 'ls': {
      if (arg === 'photos' || arg === '-la photos' || arg.includes('photo')) {
        return '<pre>ls: photos: Permission denied\n\nTry: photo.madsnorgaard.net</pre>'
      }
      if (arg === 'projects' || arg === 'projects/' || arg.includes('project')) {
        return `<pre>ÅbenForms/         headless Drupal 11 + Nuxt 3, civic tech
MitID-mocks/       serviceplatformen mock services
madsnorgaard.net/  this site (you are here)
sahistory-web/     South African History Online</pre>`
      }
      if (arg === 'writing' || arg === 'writing/') {
        return runLsWriting()
      }
      if (arg === '-la' || arg === '-al' || arg === '-l') {
        return `<pre>total 48
drwxr-xr-x  mads  staff   160  .
drwxr-xr-x  mads  staff   480  ..
-rw-r--r--  mads  staff  1.2K  about.txt
-rw-r--r--  mads  staff   640  cv.md
drwxr-xr-x  mads  staff   320  projects/
lrwxrwxrwx  mads  staff     -  photos -> photo.madsnorgaard.net
drwxr-xr-x  mads  staff     -  writing/</pre>`
      }
      return `<pre>about.txt  cv.md  projects/  photos -> photo.madsnorgaard.net  writing/</pre>`
    }

    case 'man':
      if (arg === 'mads') {
        return `<pre>MADS(1)                   User Commands                   MADS(1)

NAME
       mads - Mads Nørgaard, developer and DevOps engineer

SYNOPSIS
       mads [--drupal] [--docker] [--linux] [--camera] [--coffee]

DESCRIPTION
       Self-taught since 2009. Started with WordPress because he
       needed a website. Graduated to Drupal and never looked back.

       Builds systems for organisations that can't afford agencies:
       archives, municipalities, NGOs, communities.

       Believes infrastructure should outlast the trends that built it.

OPTIONS
       --drupal      15+ years, primary craft
       --docker       everything lives in a container
       --linux        comfortable in the dark
       --camera       documentary photographer
       --coffee       necessary dependency

ENVIRONMENT
       Located in Skanderborg, Denmark.
       Available remotely across Europe.

SEE ALSO
       whoami(1), work(1), contact(1), cat(about.txt)

BUGS
       Occasionally SSHes into production to test things.
       Known issue. Will not fix.</pre>`
      }
      return `<pre>No manual entry for ${escapeHtml(arg) || '(nothing)'}.</pre>`

    case 'clear':
      return ''

    case 'sudo':
      return '<pre>sudo: you are not in the sudoers file. This incident will be reported.</pre>'

    case 'rm':
      if (input.includes('-rf') && (input.includes('/') || input.includes('*'))) {
        return '<pre>Nice try.</pre>'
      }
      if (!arg || arg.startsWith('-')) {
        return '<pre>rm: missing operand</pre>'
      }
      return `<pre>rm: ${escapeHtml(arg)}: No such file or directory</pre>`

    case 'git':
      if (arg.startsWith('log')) {
        return '<pre>fatal: not a git repository (or any of the parent directories): .git</pre>'
      }
      if (arg.startsWith('status')) {
        return `<pre>On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean</pre>`
      }
      if (arg.startsWith('blame')) {
        return '<pre>This entire site is your fault.</pre>'
      }
      if (arg.startsWith('push')) {
        return '<pre>Everything is up to date.\n\nTo github.com:madsnorgaard/madsnorgaard.net\n   73fda80..main -> main</pre>'
      }
      if (arg.startsWith('pull')) {
        return '<pre>Already up to date.</pre>'
      }
      if (!arg) return `<pre>usage: git [--version] [--help] [-C &lt;path&gt;] &lt;command&gt; [&lt;args&gt;]

Common commands: status  log  diff  add  commit  push  pull  blame</pre>`
      return `<pre>git: '${escapeHtml(arg)}' is not a git command. See 'git --help'.</pre>`

    case 'curl':
      return `<pre>curl: (6) Could not resolve host: your-expectations</pre>`

    case 'exit':
      return '<pre>You cannot leave. You are already here.</pre>'

    case 'pwd':
      return '<pre>/home/visitor/madsnorgaard.net</pre>'

    case 'uname':
      if (arg.includes('-a') || arg === 'a') {
        return '<pre>Nuxt 3 madsnorgaard.net 3.14.0 Linux (Kontabo VPS2, Traefik, Docker) x86_64</pre>'
      }
      return '<pre>Nuxt</pre>'

    case 'docker':
      if (arg.startsWith('ps')) {
        return `<pre>CONTAINER ID   IMAGE                    STATUS        NAMES
a1b2c3d4e5f6   nuxt:latest              Up 2 days     madsnorgaard_nuxt
b2c3d4e5f6a1   drupal:11                Up 2 days     madsnorgaard_drupal
c3d4e5f6a1b2   wordpress:php8.4         Up 8 days     theazanianprepper_wordpress
d4e5f6a1b2c3   traefik:v2.2             Up 200 days   traefik
e5f6a1b2c3d4   portainer/portainer      Up 200 days   portainer
…and 33 more containers</pre>`
      }
      return arg
        ? `<pre>docker: '${escapeHtml(arg)}' is not a docker command.\nTry: docker ps</pre>`
        : `<pre>Usage: docker [OPTIONS] COMMAND\n\nTry: docker ps</pre>`

    case 'ssh':
      return '<pre>Permission denied (publickey).</pre>'

    case 'vim': {
      if (!vimOpen.value) {
        vimOpen.value = true
        return `<pre>

  VIM - Vi IMproved


  ~
  ~
  ~
  ~                      [No Name]
  ~
  "visitor" [New File]
                                                [NORMAL]

Type :q! to exit (if you dare)</pre>`
      }
      vimOpen.value = false
      return '<pre>You have escaped vim. Most people cannot say the same.</pre>'
    }

    case ':q!':
      if (!vimOpen.value) return '<pre>E492: Not an editor command: :q!</pre>'
      vimOpen.value = false
      return '<pre>You have escaped vim. Most people cannot say the same.</pre>'

    case 'cat':
      if (arg === '.bashrc' || arg === '~/.bashrc') {
        return `<pre># ~/.bashrc

alias gs='git status'
alias gp='git push'
alias ll='ls -la'
alias dps='docker ps --format "table {{.Names}}\t{{.Status}}"'

# Note to self: stop SSHing into prod to test things
export EDITOR=vim  # yes, vim</pre>`
      }
      if (arg === 'about.txt') {
        return `<pre>Self-taught developer since 2009.
Started with WordPress because I needed a website.
Discovered Drupal and haven't fully escaped since.

I build things for organisations that can't afford
to hire agencies: archives, communities, NGOs.
I believe infrastructure should last longer than trends.

Based in Skanderborg, Denmark.
Documentary photographer in my other life.
Parent. Reader. Occasional sleeper.

──────────────────────────────────
  This terminal was built together with Aurora,
  my daughter, on an afternoon in March 2026.
  She suggested the glitch quest.
  She was right.
──────────────────────────────────</pre>`
      }
      if (arg === 'cv.md') {
        return `<pre># Mads Nørgaard — CV

Senior Developer + DevOps
  Eksponent · 2024–present · employed

Technical Lead (volunteer)
  South African History Online · 2010–present

Freelance / independent
  2009–2024 · Drupal, WordPress, PHP, infrastructure

Education
  Self-taught.
  15 years.
  Still learning.

──────────────────────────────────
Full version: madsnorgaard.net/cv</pre>`
      }
      return `<pre>cat: ${escapeHtml(arg)}: No such file or directory</pre>`

    case 'history':
      return '<pre>(your secrets are safe here)</pre>'

    case 'date':
      return `<pre>${new Date().toDateString()} ${new Date().toLocaleTimeString()}</pre>`

    case 'uptime':
      return '<pre> 14:32:17 up 247 days, 3:44,  1 user,  load average: 0.12, 0.09, 0.07</pre>'

    case 'neofetch':
      return `<pre>  |\\  /|  |\\  |   visitor@madsnorgaard.net
  | \\/ |  |  \\ |   ─────────────────────────────────
  |    |  |   \\|   OS       Nuxt 3 / Linux x86_64
                   Host     Contabo VPS2 · Ubuntu 20.04
  madsnorgaard     Stack    Drupal 11 → Nuxt 3 → You
  .net             Shell    bash · IBM Plex Mono
                   Uptime   247 days, 3 hours
                   Memory   12.1 GiB / 30 GiB
                   Disk     892 GiB / 1.2 TiB
                   Boxes    38 containers running</pre>`

    case 'achievements': {
      const count = unlockedAchievements.value.size
      const total = ACHIEVEMENT_DEFS.length
      const rows = ACHIEVEMENT_DEFS.map(a => {
        const u = unlockedAchievements.value.has(a.id)
        const check = u ? '[+]' : '[ ]'
        const name  = u ? a.name.padEnd(16) : '???             '
        const desc  = u ? a.desc : '???'
        return `  ${check} ${name} ${desc}`
      }).join('\n')
      return `<pre>Achievements [${count}/${total} unlocked]\n\n${rows}</pre>`
    }

    case 'fortune': {
      const quotes = [
        '"Talk is cheap. Show me the code." — Linus Torvalds',
        '"Any fool can write code a computer can understand.\nGood programmers write code humans can understand." — Fowler',
        '"First, solve the problem. Then, write the code." — John Johnson',
        '"Code is like humor. When you have to explain it, it\'s bad." — Cory House',
        '"The best programs are written when the programmer\nshould be working on something else." — Melinda Varian',
        '"In theory, theory and practice are the same.\nIn practice, they are not." — unknown',
        '"Docker: because it works on my machine." — everyone, always',
        '"Self-taught. 15 years. Still Googling." — Mads Nørgaard',
        '"Weeks of coding can save you hours of planning." — unknown',
        '"rm -rf / is just aggressive housekeeping." — someone who got fired',
      ]
      return `<pre>${quotes[Math.floor(Math.random() * quotes.length)]}</pre>`
    }

    case 'ping': {
      const target = arg || 'madsnorgaard.net'
      const safeTarget = escapeHtml(target)
      if (!arg || target.includes('madsnorgaard') || target === 'localhost') {
        return `<pre>PING ${safeTarget}: you are already here.

Round-trip: 0ms (you cannot be closer)
0% packet loss. 100% existential certainty.</pre>`
      }
      return `<pre>ping: ${safeTarget}: Name or service not known</pre>`
    }

    case 'top':
      return `<pre>top - ${new Date().toLocaleTimeString()}  up 247 days
Tasks:  38 total,   1 running,  37 sleeping
%Cpu(s):  2.1 us,  0.3 sy,  97.4 id
MiB Mem: 30720.0 total  18432.1 free  8204.3 used
MiB Swap:     0.0 total      0.0 free     0.0 used  ← no swap (known issue)

  PID  COMMAND           %CPU  %MEM  TIME+
    1  traefik:v2.2       0.1   0.2  247:03.21
    2  drupal:11          1.2   4.1  247:18.44
    3  nuxt:latest        0.8   2.3   15:09.12
    4  rocketchat         2.1   8.4  247:00.01  ← MongoDB 4.2 EOL (TODO)
    5  portainer          0.0   0.4  247:00.03</pre>`

    case 'cowsay': {
      const msg = escapeHtml((arg || 'Moo from Skanderborg').slice(0, 38))
      const pad = msg.length + 2
      const top    = ' ' + '_'.repeat(pad)
      const bottom = ' ' + '-'.repeat(pad)
      return `<pre>${top}\n< ${msg} >\n${bottom}\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||</pre>`
    }

    case 'ops':
      return runOps()

    case 'map':
      return `<pre>INFRASTRUCTURE TOPOLOGY  ─  madsnorgaard.net
──────────────────────────────────────────────────
        ┌──────────────────────┐
        │       INTERNET       │
        └──────────┬───────────┘
                   │
        ┌──────────┴───────────┐
        │    CLOUDFLARE DNS    │  DDoS · SSL · CDN
        └──────────┬───────────┘
                   │
        ┌──────────┴───────────┐
        │    TRAEFIK  v2.2     │  VPS2 · Contabo
        └──┬────────┬──────────┘  Ubuntu 20.04
           │        │
    ┌──────┴──┐  ┌──┴──────┐  ┌──────────┐
    │  Nuxt 3 │  │Drupal 11│  │ +36 more │
    │  :3000  │  │  :80    │  │  ctrs    │
    └────┬────┘  └────┬────┘  └──────────┘
         │            │
   [YOU ARE]     [JSON:API]
   [  HERE ]     [→ this data]
──────────────────────────────────────────────────
Jump host : VPS1 (GitLab CI · GitHub Runners)
Monitoring: Grafana · Prometheus · Loki · cAdvisor</pre>`

    case 'decode':
      return runDecode()

    case 'sahistory':
      return `<pre>SOUTH AFRICAN HISTORY ONLINE
──────────────────────────────────────────────
  sahistory.org.za

  One of South Africa's most significant
  documentary history archives.
  Free. Open. Permanent.

  45,000+ articles.
  Millions of monthly readers.
  25 years of history online.

  Volunteer since 2010.
  Volunteer. No salary.

  Started because someone asked.
  Stayed because it matters.

  Some commitments don't have exit conditions.
──────────────────────────────────────────────
  → run: map  to see where it lives in the stack</pre>`

    case 'aurora':
      return `<pre>aurora: permission denied.

  ...

  actually, no. she has full permissions here.

──────────────────────────────────────────────
  SIGNAL DESIGNER : Aurora
  DATE            : March 2026

  "what if it's like a glitch quest?"
  — Aurora

  she suggested the whole thing.
  the glitch. the trail. the transmission.
  she was right about every part of it.

  this terminal exists partly because
  of an afternoon conversation with
  a person who sees things clearly.
──────────────────────────────────────────────</pre>`

    case 'glitch': {
      const level = Math.min(Math.max(glitchQuestStage.value, 1), 4)
      glitchLevel.value = level
      const { ms, display } = glitchTime(level)
      glitching.value = true
      setTimeout(() => { glitching.value = false }, ms)

      // Quest complete — signal is at rest
      if (glitchQuestStage.value >= 4) {
        return `<pre>G̷L̶I̸T̵C̷H̴ — signal quiet.

  transmission received.
  origin confirmed: Skanderborg, Denmark.

  you know where it came from now.

  disruption duration : ${display} seconds
  data corrupted      : 0 bytes
  status              : at rest

  (probably.)</pre>`
      }

      const frag = `${randomHex(4)}-${randomHex(4)}`
      glitchFragment.value = frag
      const corruptPct = (Math.random() * 2.8 + 0.1).toFixed(1)
      const nodes = Math.floor(Math.random() * 4) + 3
      const noiseAddr = randomHex(8)
      if (glitchQuestStage.value < 1) glitchQuestStage.value = 1
      return `<pre>G̸̤͋L̷̰͝I̸̛̻T̵͓̀C̵̞͌H̸̩͝ ̷̨͑I̸̢͒N̴͕̿I̵̫̐T̴̠͒I̶̜͛A̵͎͝T̷̩̚E̷̘̚D̸̝̓

  signal disrupted for ${display} seconds
  corruption   : ${corruptPct}%  (non-critical)
  no data was corrupted
  probably

  ░░▓████ CARRIER WAVE DETECTED ████▓░░

  fragment id  : ${frag}
  origin       : [SIGNAL CORRUPTED — ${noiseAddr}]
  bounced      : ${nodes} nodes

  something is transmitting on this frequency.
  run: trace

  (this was intentional)</pre>`
    }

    case 'trace': {
      if (glitchQuestStage.value < 1) {
        return '<pre>trace: no active signal\nrun: glitch</pre>'
      }
      if (glitchQuestStage.value < 2) glitchQuestStage.value = 2
      const frag = glitchFragment.value || `${randomHex(4)}-${randomHex(4)}`
      return (async () => {
        await delay(600)
        return `<pre>TRACING SIGNAL...
  fragment: ${frag}
──────────────────────────────────────────────
  NODE 01  ████████████████████  cleared
  NODE 02  ██████████████░░░░░░  degraded
  NODE 03  ████████░░░░░░░░░░░░  [CORRUPTED]
  NODE 04  [BLOCKED] ←─── origin
──────────────────────────────────────────────
  partial coordinates extracted from header:

    5̷6̴.̵0̶░░°N   9̸.̵9̴░°E

  signal is point-source.
  not automated.
  someone is there.

  run: locate</pre>`
      })()
    }

    case 'locate': {
      if (glitchQuestStage.value < 2) {
        return '<pre>locate: no coordinates to resolve\nrun trace first</pre>'
      }
      if (glitchQuestStage.value < 3) glitchQuestStage.value = 3
      return (async () => {
        await delay(800)
        return `<pre>RESOLVING COORDINATES...

  56.04°N   9.92°E
  ┌─────────────────────────────────────┐
  │                                     │
  │     SKANDERBORG, DENMARK            │
  │                                     │
  │     population  : ~17,000           │
  │     elevation   : 72m               │
  │     timezone    : CET  (UTC+1)      │
  │                                     │
  │     signal source confirmed.        │
  │     1 transmission pending.         │
  │                                     │
  └─────────────────────────────────────┘

  run: transmit</pre>`
      })()
    }

    case 'transmit': {
      if (glitchQuestStage.value < 3) {
        return '<pre>transmit: no active transmission\ncomplete the signal trace first</pre>'
      }
      if (glitchQuestStage.value < 4) glitchQuestStage.value = 4
      return (async () => {
        await delay(1200)
        return `<pre>RECEIVING TRANSMISSION...

  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  100%

  FROM : mads@madsnorgaard.net
  TO   : visitor
  DATE : ${new Date().toISOString().slice(0, 10)}
──────────────────────────────────────────────

  "you found me.

   i build things because it matters —
   not because it's clever,
   not because the tools are cool.

   because somewhere, someone
   reads the archive,
   submits the form,
   finds the answer they needed.

   that's why the signal is always on."

──────────────────────────────────────────────
  transmission ends.
  quest complete.</pre>`
      })()
    }

    default:
      return `<pre>bash: ${escapeHtml(cmd)}: command not found\n\nType 'help' to see available commands.</pre>`
  }
}

// ── Lifecycle ──────────────────────────────────────────────────────────────────

let hintTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  hintTimer = setInterval(() => { hintIndex.value++ }, 5000)

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !booted.value) {
        runBootSequence()
      }
    },
    { threshold: 0.5 }
  )
  if (termEl.value) observer.observe(termEl.value)
})

onUnmounted(() => {
  if (hintTimer) clearInterval(hintTimer)
  if (ghostTimer) clearTimeout(ghostTimer)
})
</script>

<style scoped>
.terminal {
  background: #0E0E0E;
  border: 1px solid #2A2A2A;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.875rem;
  color: #F0EDE6;
  cursor: text;
  min-height: 420px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative; /* needed for spectrum + scanlines */
}

/* ── Arc Raiders–style spectrum stripe ──────────────────────────────── */

.terminal__spectrum {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(
    to bottom,
    #ff2020 0%,
    #ff6600 18%,
    #ffcc00 34%,
    #00cc44 50%,
    #0099ff 66%,
    #7733cc 82%,
    #ff0066 100%
  );
  opacity: 0.5;
  z-index: 2;
  pointer-events: none;
}

/* ── CRT scanline overlay ────────────────────────────────────────────── */

.terminal::after {
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

/* ── Title bar ───────────────────────────────────────────────────────── */

.terminal__bar {
  background: #1A1A1A;
  padding: 0.6rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border-bottom: 1px solid #2A2A2A;
  flex-shrink: 0;
}

.terminal__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
.terminal__dot--red    { background: #FF5F57; }
.terminal__dot--yellow { background: #FEBC2E; }
.terminal__dot--green  { background: #28C840; }

.terminal__label {
  margin-left: 0.5rem;
  font-size: 0.75rem;
  color: #6B6763;
  flex: 1;
}

.terminal__found-badge {
  font-size: 0.65rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(208, 36, 62, 0.7);
  border: 1px solid rgba(208, 36, 62, 0.3);
  padding: 0.1em 0.5em;
  border-radius: 2px;
}

/* ── Boot sequence ───────────────────────────────────────────────────── */

.terminal__boot {
  flex: 1;
  padding: 1.25rem;
  overflow-y: auto;
  color: #5A5654;
  font-size: 0.8rem;
  line-height: 1.65;
}

.terminal__boot-line {
  animation: boot-in 0.12s ease-out;
  white-space: pre;
}

@keyframes boot-in {
  from { opacity: 0; transform: translateX(-6px); }
  to   { opacity: 1; transform: none; }
}

/* ── Main output ─────────────────────────────────────────────────────── */

.terminal__output {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
  scroll-behavior: smooth;
}

.terminal__welcome p {
  color: #6B6763;
  margin: 0 0 1rem;
}

.terminal__cmd-hint {
  color: #D0243E;
}

.terminal__history-item {
  margin-bottom: 0.75rem;
}

.terminal__prompt-line {
  display: flex;
  gap: 0.25rem;
  white-space: pre-wrap;
  word-break: break-all;
}

.terminal__prompt {
  color: #D0243E;
  flex-shrink: 0;
}

.terminal__output-text {
  margin: 0.25rem 0 0 0;
  color: #D0CDC6;
  line-height: 1.5;
}

.terminal__output-text :deep(pre) {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
}

.terminal__output-text :deep(.terminal__ops) {
  color: #B8B4AE;
}

.terminal__output-text :deep(.terminal__loading) {
  color: #6B6763;
  animation: pulse 1.1s ease infinite;
}

/* v-html injected spans — must use :deep() to pierce scoped boundary */
.terminal__output-text :deep(.terminal__achievement) {
  display: block;
  color: rgba(208, 36, 62, 0.5);
  font-size: 0.75rem;
  margin-top: 0.35rem;
  font-style: italic;
}

.terminal__current {
  margin-top: 0.5rem;
}

.terminal__input-display {
  white-space: pre-wrap;
}

.terminal__cursor {
  display: inline-block;
  width: 0.5em;
  height: 1em;
  background: #F0EDE6;
  vertical-align: text-bottom;
  animation: blink-invert 1s step-end infinite;
}

/* ── Hint strip ──────────────────────────────────────────────────────── */

.terminal__hint-bar {
  border-top: 1px solid #191919;
  background: #080808;
  padding: 0.3rem 1.25rem;
  flex-shrink: 0;
}

.terminal__hint-text {
  font-size: 0.64rem;
  color: #383634;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  animation: hint-in 0.35s ease;
}

/* ── Glitch ──────────────────────────────────────────────────────────── */

@keyframes glitch-clip {
  0%   { clip-path: inset(5% 0 90% 0);  transform: translate(-4px, 0); }
  15%  { clip-path: inset(40% 0 40% 0); transform: translate(4px, 0);  }
  30%  { clip-path: inset(70% 0 10% 0); transform: translate(-2px, 0); }
  45%  { clip-path: inset(20% 0 60% 0); transform: translate(3px, 0);  }
  60%  { clip-path: none;               transform: none;                }
  100% { clip-path: none;               transform: none;                }
}

@keyframes spectrum-strobe {
  0%   { opacity: 0.5; width: 3px; }
  10%  { opacity: 1;   width: 8px; }
  20%  { opacity: 0.1; width: 3px; }
  35%  { opacity: 1;   width: 12px; }
  50%  { opacity: 0.3; width: 3px; }
  65%  { opacity: 0.9; width: 6px; }
  80%  { opacity: 0.4; width: 3px; }
  100% { opacity: 0.5; width: 3px; }
}

/* ── Level 1 — mild (first contact) ─────────────────────────────────── */

.terminal--glitch-1 {
  animation: glitch-l1 0.9s steps(1) forwards;
}
@keyframes glitch-l1 {
  0%   { filter: none; }
  8%   { filter: brightness(1.4) hue-rotate(180deg); }
  14%  { filter: none; }
  22%  { filter: brightness(0.7) saturate(4) hue-rotate(-90deg); }
  28%  { filter: none; }
  38%  { filter: brightness(1.2) hue-rotate(60deg); }
  44%  { filter: none; }
  100% { filter: none; }
}
.terminal--glitch-1 .terminal__output {
  animation: glitch-clip 0.14s steps(1) 4;
  text-shadow: 1px 0 rgba(255, 0, 64, 0.55), -1px 0 rgba(0, 255, 255, 0.45);
}
.terminal--glitch-1 .terminal__spectrum {
  animation: spectrum-strobe 0.9s steps(1) forwards;
}

/* ── Level 2 — medium (signal traced) ───────────────────────────────── */

.terminal--glitch-2 {
  animation: glitch-l2 1.4s steps(1) forwards;
}
@keyframes glitch-l2 {
  0%   { filter: none;  transform: none; }
  6%   { filter: brightness(1.6) hue-rotate(200deg);  transform: translateX(-3px); }
  12%  { filter: none;  transform: none; }
  20%  { filter: brightness(0.6) saturate(6) hue-rotate(-180deg); transform: translateX(3px); }
  26%  { filter: none;  transform: none; }
  34%  { filter: hue-rotate(90deg); transform: translateX(-2px) translateY(1px); }
  40%  { filter: none;  transform: none; }
  52%  { filter: brightness(1.3) hue-rotate(45deg); transform: translateX(2px); }
  58%  { filter: none;  transform: none; }
  100% { filter: none;  transform: none; }
}
.terminal--glitch-2 .terminal__output {
  animation: glitch-clip 0.15s steps(1) 6;
  text-shadow: 2px 0 rgba(255, 0, 64, 0.75), -2px 0 rgba(0, 255, 255, 0.65);
}
.terminal--glitch-2 .terminal__spectrum {
  animation: spectrum-strobe 1.4s steps(1) forwards;
}

/* ── Level 3 — intense (source located) ─────────────────────────────── */

.terminal--glitch-3 {
  animation: glitch-l3 2.1s steps(1) forwards;
}
@keyframes glitch-l3 {
  0%   { filter: none;  transform: none; }
  4%   { filter: brightness(2) hue-rotate(270deg) saturate(8); transform: translateX(-5px) translateY(-2px); }
  8%   { filter: none;  transform: none; }
  14%  { filter: brightness(0.4) saturate(8) hue-rotate(-270deg); transform: translateX(5px) translateY(2px); }
  20%  { filter: none;  transform: none; }
  26%  { filter: hue-rotate(180deg) brightness(1.8); transform: translateX(-3px) translateY(3px); }
  32%  { filter: none;  transform: none; }
  40%  { filter: invert(0.15) hue-rotate(90deg); transform: translateX(4px) translateY(-2px); }
  46%  { filter: none;  transform: none; }
  55%  { filter: brightness(1.5) saturate(5) hue-rotate(-90deg); transform: translateX(-2px); }
  60%  { filter: none;  transform: none; }
  70%  { filter: brightness(0.8) hue-rotate(30deg); transform: none; }
  76%  { filter: none;  transform: none; }
  100% { filter: none;  transform: none; }
}
.terminal--glitch-3 .terminal__output {
  animation: glitch-clip 0.16s steps(1) 8;
  text-shadow: 3px 0 rgba(255, 0, 64, 0.9), -3px 0 rgba(0, 255, 255, 0.8),
               0 2px rgba(255, 220, 0, 0.25);
}
.terminal--glitch-3 .terminal__spectrum {
  animation: spectrum-strobe 2.1s steps(1) forwards;
}

/* ── Level 4 — maximum (quest complete) ─────────────────────────────── */

.terminal--glitch-4 {
  animation: glitch-l4 4s steps(1) forwards;
}
@keyframes glitch-l4 {
  0%   { filter: none;  transform: none; }
  3%   { filter: invert(1) hue-rotate(180deg); transform: translateX(-6px) translateY(-3px) skewX(-2deg); }
  6%   { filter: none;  transform: none; }
  10%  { filter: brightness(3) saturate(10) hue-rotate(360deg); transform: translateX(6px) translateY(3px); }
  14%  { filter: none;  transform: none; }
  18%  { filter: invert(0.8) hue-rotate(-180deg) saturate(8); transform: translateX(-4px) skewX(3deg); }
  22%  { filter: none;  transform: none; }
  26%  { filter: brightness(0.2) hue-rotate(90deg); transform: translateX(5px) translateY(-3px); }
  30%  { filter: none;  transform: none; }
  36%  { filter: invert(0.5) hue-rotate(270deg) saturate(6); transform: translateX(-3px) translateY(2px) skewX(-1deg); }
  40%  { filter: none;  transform: none; }
  46%  { filter: brightness(2.5) hue-rotate(-90deg); transform: translateX(4px); }
  50%  { filter: none;  transform: none; }
  56%  { filter: invert(0.3) saturate(8); transform: translateX(-5px) translateY(1px); }
  62%  { filter: none;  transform: none; }
  68%  { filter: brightness(1.8) hue-rotate(45deg); transform: translateX(2px); }
  74%  { filter: none;  transform: none; }
  80%  { filter: hue-rotate(20deg); transform: none; }
  86%  { filter: none;  transform: none; }
  100% { filter: none;  transform: none; }
}
.terminal--glitch-4 .terminal__output {
  animation: glitch-clip 0.18s steps(1) 12;
  text-shadow: 4px 0 rgba(255, 0, 64, 1), -4px 0 rgba(0, 255, 255, 0.95),
               0 3px rgba(255, 220, 0, 0.4), 0 -3px rgba(180, 0, 255, 0.35);
}
.terminal--glitch-4 .terminal__spectrum {
  animation: spectrum-strobe 4s steps(1) forwards;
  filter: brightness(3) saturate(2);
}

/* ── Ghost bleed-through ─────────────────────────────────────────────── */

.terminal__ghost-line {
  font-size: 0.72rem;
  color: rgba(196, 30, 58, 0.35);
  padding: 0.15rem 0 0.4rem;
  letter-spacing: 0.04em;
}

/* Vue <Transition name="ghost"> */
.ghost-enter-active {
  animation: ghost-flicker 5s ease forwards;
}
.ghost-leave-active {
  transition: opacity 0.4s ease;
}
.ghost-leave-to {
  opacity: 0;
}

@keyframes ghost-flicker {
  0%   { opacity: 0; }
  8%   { opacity: 0.9; }
  12%  { opacity: 0.2; }
  16%  { opacity: 0.8; }
  20%  { opacity: 1; }
  75%  { opacity: 1; }
  90%  { opacity: 0.4; }
  100% { opacity: 0; }
}

/* ── Help static artifact ────────────────────────────────────────────── */

.terminal__output-text :deep(.terminal__static) {
  display: block;
  margin-top: 0.5rem;
  color: rgba(255, 255, 255, 0.07);
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  user-select: none;
}

/* ── Hidden input ────────────────────────────────────────────────────── */

.terminal__hidden-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 0;
  height: 0;
}

/* ── Keyframes ───────────────────────────────────────────────────────── */

@keyframes blink-invert {
  0%, 100% { background: #F0EDE6; }
  50%       { background: #D0243E; }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.35; }
}

@keyframes hint-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
</style>
