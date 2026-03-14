<template>
  <div class="terminal" @click="focusInput">
    <div class="terminal__bar">
      <span class="terminal__dot terminal__dot--red" />
      <span class="terminal__dot terminal__dot--yellow" />
      <span class="terminal__dot terminal__dot--green" />
      <span class="terminal__label">visitor@madsnorgaard.net — bash</span>
    </div>

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

      <!-- Current prompt -->
      <div class="terminal__prompt-line terminal__current">
        <span class="terminal__prompt">visitor@madsnorgaard.net:~$ </span>
        <span class="terminal__input-display">{{ currentInput }}<span class="terminal__cursor" /></span>
      </div>
    </div>

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
      @keydown="handleKeydown"
    />
  </div>
</template>

<script setup lang="ts">
interface HistoryItem {
  cmd: string
  output: string
}

const outputEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)
const currentInput = ref('')
const history = ref<HistoryItem[]>([])
const cmdHistory = ref<string[]>([])
const historyIndex = ref(-1)

function focusInput() {
  inputEl.value?.focus()
}

function scrollToBottom() {
  nextTick(() => {
    if (outputEl.value) {
      outputEl.value.scrollTop = outputEl.value.scrollHeight
    }
  })
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    submitCommand()
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

const ALL_COMMANDS = ['help', 'whoami', 'skills', 'work', 'contact', 'ls', 'clear', 'man', 'sudo', 'rm', 'git', 'curl', 'exit', 'pwd', 'uname', 'docker', 'ssh', 'vim', 'cat', 'history', 'date', 'uptime']

function tabComplete() {
  const partial = currentInput.value.trim()
  if (!partial) return
  const matches = ALL_COMMANDS.filter((c) => c.startsWith(partial))
  if (matches.length === 1) {
    currentInput.value = matches[0]
  } else if (matches.length > 1) {
    addOutput('', matches.join('  '))
  }
}

function submitCommand() {
  const cmd = currentInput.value.trim()
  if (!cmd) return

  cmdHistory.value.push(cmd)
  historyIndex.value = -1

  const output = runCommand(cmd)

  if (cmd === 'clear') {
    history.value = []
  } else {
    history.value.push({ cmd, output })
  }

  currentInput.value = ''
  scrollToBottom()
}

function addOutput(cmd: string, output: string) {
  history.value.push({ cmd, output })
  scrollToBottom()
}

function runCommand(input: string): string {
  const [cmd, ...args] = input.split(/\s+/)
  const arg = args.join(' ')

  switch (cmd.toLowerCase()) {
    case 'help':
      return `<pre>Available commands:

  whoami      — who is this person
  skills      — technologies and proficiency
  work        — work history
  contact     — how to reach me
  ls          — list things
  clear       — clear terminal
  man mads    — manual page

…or just explore. Some commands have surprises.</pre>`

    case 'whoami':
      return `<pre>Mads Nørgaard.

Senior developer and DevOps engineer based in Skanderborg, Denmark.
Self-taught. 15 years building on Drupal, PHP, Docker, Linux.
Currently at Eksponent — Danish development agency.
Technical lead for South African History Online since 2010.
Documentary photographer.</pre>`

    case 'skills':
      return `<pre>Daily
  Drupal 11      primary craft — 15+ years
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
  Eksponent — 2024–present (employed)
  Drupal multisite management, production server admin.
  DDoS investigation and mitigation.
  AI crawler mitigation (Rudersdal Kommune, Skoletjenesten).
  ÅbenForms — headless Drupal 11 + Nuxt 3 for Danish municipalities.

Technical Lead
  South African History Online — 2010–present (volunteer)
  15-year archival commitment. One of South Africa's most significant
  documentary photography archives.
  Solr infrastructure on AlmaLinux.
  AI-assisted metadata system for 14,000+ history entries.</pre>`

    case 'contact':
      return '<pre>mads@madsnorgaard.net\n\ngithub.com/madsnorgaard</pre>'

    case 'ls':
      if (arg === 'photos' || arg === '-la photos' || arg.includes('photo')) {
        return '<pre>ls: photos: Permission denied\n\nTry: photo.madsnorgaard.net</pre>'
      }
      if (arg === 'projects' || arg.includes('project')) {
        return `<pre>ÅbenForms/         headless Drupal 11 + Nuxt 3, civic tech
MitID-mocks/       serviceplatformen mock services
madsnorgaard.net/  this site (you are here)
sahistory-web/     South African History Online</pre>`
      }
      return `<pre>about.txt  cv.md  projects/  photos -> photo.madsnorgaard.net  writing/</pre>`

    case 'man':
      if (arg === 'mads') {
        return '<pre>No manual entry for mads.\n\nTry: /about or just say hello.</pre>'
      }
      return `<pre>No manual entry for ${arg || '(nothing)'}.</pre>`

    case 'clear':
      return ''

    case 'sudo':
      return '<pre>sudo: you are not in the sudoers file. This incident will be reported.</pre>'

    case 'rm':
      if (input.includes('-rf') && (input.includes('/') || input.includes('*'))) {
        return '<pre>Nice try.</pre>'
      }
      return `<pre>rm: ${arg || 'missing operand'}</pre>`

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
      return `<pre>git: '${arg}' is not a git command. See 'git --help'.</pre>`

    case 'curl':
      return `<pre>curl: (6) Could not resolve host: your-expectations</pre>`

    case 'exit':
      return '<pre>You cannot leave. You are already here.</pre>'

    case 'pwd':
      return '<pre>/home/visitor/madsnorgaard.net</pre>'

    case 'uname':
      if (arg.includes('-a') || arg.includes('a')) {
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
      return `<pre>docker: '${arg}' requires a command.</pre>`

    case 'ssh':
      return '<pre>Permission denied (publickey).</pre>'

    case 'vim': {
      // Fun two-phase easter egg
      const vimOpen = history.value.some((h) => h.cmd === 'vim' && h.output.includes('NORMAL'))
      if (!vimOpen) {
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
      return '<pre>You have escaped vim. Most people cannot say the same.</pre>'
    }

    case ':q!':
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
      return `<pre>cat: ${arg}: No such file or directory</pre>`

    case 'history':
      return '<pre>(your secrets are safe here)</pre>'

    case 'date':
      return `<pre>${new Date().toDateString()} ${new Date().toLocaleTimeString()}</pre>`

    case 'uptime':
      return '<pre> 14:32:17 up 247 days, 3:44,  1 user,  load average: 0.12, 0.09, 0.07</pre>'

    default:
      return `<pre>bash: ${cmd}: command not found\n\nType 'help' to see available commands.</pre>`
  }
}

onMounted(() => {
  // Auto-focus when visible
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        inputEl.value?.focus()
      }
    },
    { threshold: 0.5 }
  )
  if (outputEl.value) observer.observe(outputEl.value)
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
}

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
}

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
  color: #C41E3A;
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
  color: #C41E3A;
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
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}

.terminal__hidden-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 0;
  height: 0;
}
</style>
