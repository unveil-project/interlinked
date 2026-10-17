<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue'
import { AI_THRESHOLD, analyzeText } from '@unveil/interlinked'

type Label = 'ai' | 'human'
type Step = 'loading' | 'done' | 'none' | 'failed'

/** Score bands, lowest first. Each applies to scores below its `max`. */
const bands = [
  {
    max: 0.35,
    label: 'likely human-written',
    text: 'text-human',
    bar: 'bg-human',
  },
  { max: 0.65, label: 'inconclusive', text: 'text-fg', bar: 'bg-muted' },
  {
    max: Infinity,
    label: 'likely agent-written',
    text: 'text-agent',
    bar: 'bg-agent',
  },
]

const url = ref('')
const markdown = ref('')
const template = ref('')
const showPaste = ref(false)
const loading = ref(false)
const error = ref('')
/** Per-request status of the last fetch. `path` is the template path being checked, or the one found. */
const progress = ref<{
  body: Step
  template: Step
  path?: string
  /** What the body is: "description", "issue" or "comment". */
  noun: string
}>()
/** Where the description came from, and the label it should get if it is a fixture. */
const source = ref<{ name: string; expected?: Label }>()
let loadedUrl: string | undefined
/** Bumped by each fetch and by `clear`, so a stale fetch can tell it was superseded. */
let request = 0
const linkInput = useTemplateRef('linkInput')

const result = computed(() =>
  markdown.value.trim()
    ? analyzeText(markdown.value, {
        template: template.value || undefined,
      })
    : undefined,
)
const percent = computed(() =>
  result.value ? Math.round(result.value.probability * 100) : 0,
)
const band = computed(() => {
  const probability = result.value?.probability ?? 0
  return bands.find((b) => probability < b.max) ?? bands[bands.length - 1]
})
const largest = computed(() =>
  Math.max(
    1,
    ...(result.value?.signals.map((s) => Math.abs(s.contribution)) ?? []),
  ),
)
const missed = computed(
  () =>
    !!result.value &&
    !!source.value?.expected &&
    source.value.expected !== result.value.verdict,
)

async function load() {
  error.value = ''
  const ref = parseGitHubUrl(url.value)
  if (!ref) {
    error.value = "That isn't a GitHub issue, pull request or comment link."
    return
  }
  // Only fetch when the link changes, so edits to the fields stick.
  if (url.value === loadedUrl) {
    return
  }
  const id = ++request
  loading.value = true
  progress.value = {
    body: 'loading',
    // Comments have no template.
    template: ref.commentId ? 'none' : 'loading',
    noun: noun(ref),
  }
  const steps = progress.value
  try {
    const [body, found] = await Promise.all([
      fetchBody(ref).then(
        (text) => {
          steps.body = 'done'
          return text
        },
        (e) => {
          steps.body = 'failed'
          throw e
        },
      ),
      fetchTemplate(ref, (path) => {
        steps.path = path
      }).then(
        (found) => {
          steps.template = found ? 'done' : 'none'
          return found
        },
        () => {
          steps.template = 'failed'
          return undefined
        },
      ),
    ])
    if (id !== request) {
      return
    }
    markdown.value = body
    template.value = found?.text ?? ''
    source.value = { name: sourceName(ref) }
    loadedUrl = url.value
    history.replaceState(null, '', `?url=${shareParam(url.value)}`)
  } catch (e) {
    if (id === request) {
      error.value = (e as Error).message
    }
  } finally {
    if (id === request) {
      loading.value = false
    }
  }
}

function noun(ref: GitHubRef) {
  if (ref.commentId) {
    return 'comment'
  }
  return ref.type === 'pull' ? 'description' : 'issue'
}

function sourceName({ owner, repo, number, commentId }: GitHubRef) {
  const name = `${owner}/${repo}#${number}`
  return commentId ? `${name}, comment ${commentId}` : name
}

function edited() {
  if (source.value) {
    source.value = { name: `${source.value.name}, edited` }
  }
}

/** Reset to an empty page, dropping any fetch still in flight. */
function clear() {
  request++
  url.value = ''
  markdown.value = ''
  template.value = ''
  error.value = ''
  progress.value = undefined
  source.value = undefined
  loading.value = false
  loadedUrl = undefined
  history.replaceState(null, '', location.pathname)
  linkInput.value?.focus()
}

const stepIcon: Record<Step, string> = {
  loading:
    'border-1.5 border-line border-t-fg animate-spin animate-duration-700 motion-reduce:animate-duration-2000',
  done: 'bg-human',
  none: 'border-1.5 border-muted',
  failed: 'bg-agent',
}

function barStyle(contribution: number) {
  const width = `${(Math.abs(contribution) / largest.value) * 50}%`
  return contribution >= 0 ? { left: '50%', width } : { right: '50%', width }
}

/** The link as a readable query value: no scheme, slashes left as they are. */
function shareParam(link: string) {
  return encodeURIComponent(link.replace(/^https?:\/\//, '')).replaceAll(
    '%2F',
    '/',
  )
}

// Analyze the link shared in `?url=`, if there is one. On mount, so the
// prerendered page hydrates before the field changes.
const shared = useRoute().query.url
onMounted(() => {
  if (typeof shared === 'string' && shared) {
    url.value = /^https?:\/\//.test(shared) ? shared : `https://${shared}`
    load()
  }
})
</script>

<template>
  <main class="flex flex-col min-h-dvh max-w-180 mx-auto px-4 pt-12 pb-8">
    <header
      class="flex items-baseline justify-between mb-10 font-mono text-13px"
    >
      <div class="flex flex-col gap-1">
        <a href="/" class="font-semibold tracking-[-0.01em]"> Interlinked </a>
        <span class="font-sans text-13px text-muted">
          Analyze PRs, issues and comments for signs of AI writing.
        </span>
      </div>

      <nav>
        <ul class="flex gap-2 text-xs">
          <li>
            <a
              target="_blank"
              class="hover:underline"
              href="https://github.com/MatteoGabriele/interlinked"
              >Install</a
            >
          </li>
        </ul>
      </nav>
    </header>

    <form @submit.prevent="load">
      <label for="link" class="block text-19px leading-snug tracking-[-0.01em]">
        Paste a link to a GitHub pull request, issue or comment.
      </label>
      <div
        class="flex items-center gap-2 h-14 mt-4 pl-4 pr-2 border border-line rounded-xl bg-field transition-colors duration-150 focus-within:border-muted"
      >
        <input
          id="link"
          ref="linkInput"
          v-model="url"
          type="url"
          placeholder="https://github.com/owner/repo/pull/123"
          spellcheck="false"
          class="flex-1 min-w-0 h-full bg-transparent font-mono text-14px outline-none placeholder:text-muted"
        />
        <button
          v-if="url || markdown || template"
          type="button"
          aria-label="Clear"
          class="flex-none grid place-items-center size-8 rounded-md text-muted transition-colors duration-150 hover:(bg-line text-fg)"
          @click="clear"
        >
          <svg viewBox="0 0 16 16" class="size-4" aria-hidden="true">
            <path
              d="M4 4l8 8M12 4l-8 8"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </button>
        <button
          type="submit"
          :disabled="loading || !url"
          class="flex-none h-10 px-4 rounded-lg bg-fg text-page text-14px font-medium transition-opacity duration-150 hover:opacity-85 disabled:(bg-line text-muted hover:opacity-100)"
        >
          {{ loading ? 'Fetching…' : 'Analyze' }}
        </button>
      </div>
    </form>
    <ul
      v-if="progress"
      class="mt-3 font-mono text-12px text-muted"
      aria-live="polite"
    >
      <li
        class="flex items-center gap-2 py-0.5"
        :class="{ 'text-agent': progress.body === 'failed' }"
      >
        <span
          class="flex-none size-10px rounded-full"
          :class="stepIcon[progress.body]"
        />
        {{ progress.noun }}
        <span class="min-w-0 truncate">
          {{
            {
              loading: 'fetching…',
              done: 'fetched',
              none: '',
              failed: 'failed',
            }[progress.body]
          }}
        </span>
      </li>
      <li
        class="flex items-center gap-2 py-0.5"
        :class="{ 'text-agent': progress.template === 'failed' }"
      >
        <span
          class="flex-none size-10px rounded-full"
          :class="stepIcon[progress.template]"
        />
        template
        <span class="min-w-0 truncate">
          <template v-if="progress.template === 'loading'">
            checking {{ progress.path }}…
          </template>
          <template v-else-if="progress.template === 'done'">
            {{ progress.path }}
          </template>
          <template v-else-if="progress.template === 'none'">
            {{
              progress.noun === 'comment'
                ? 'not used for comments'
                : 'none found'
            }}
          </template>
          <template v-else>failed</template>
        </span>
      </li>
    </ul>
    <p v-if="error" class="mt-2 text-agent text-13px">{{ error }}</p>

    <section
      class="mt-8 transition-opacity duration-150"
      :class="{ 'opacity-40 pointer-events-none': loading }"
    >
      <button
        type="button"
        class="flex items-center gap-1.5 text-14px text-muted hover:text-fg"
        :aria-expanded="showPaste"
        aria-controls="paste"
        @click="showPaste = !showPaste"
      >
        <svg
          viewBox="0 0 16 16"
          class="size-3.5 transition-transform duration-150"
          :class="{ 'rotate-90': showPaste }"
          aria-hidden="true"
        >
          <path
            d="M6 4l4 4-4 4"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        {{
          source
            ? 'Fetched text and template'
            : 'No link? Paste the text instead'
        }}
      </button>

      <div v-if="showPaste" id="paste" class="flex flex-col gap-6 mt-4">
        <div>
          <label for="text" class="block mb-2 text-14px">Text</label>
          <textarea
            id="text"
            v-model="markdown"
            placeholder="A PR description, issue or comment"
            spellcheck="false"
            class="field min-h-60"
            @input="edited"
          />
        </div>
        <div>
          <label for="template" class="flex items-baseline gap-2 text-14px">
            Template
            <span class="text-13px text-muted">optional</span>
          </label>
          <p
            id="template-hint"
            class="mt-1 mb-2 text-13px text-muted leading-normal"
          >
            If the repo uses a PR or issue template, paste it here so its
            headings and checklists don't count toward the score. Links fill
            this in for you.
          </p>
          <textarea
            id="template"
            v-model="template"
            spellcheck="false"
            aria-describedby="template-hint"
            class="field min-h-28"
          />
        </div>
      </div>
    </section>

    <section v-if="result" class="mt-14">
      <div class="flex items-end justify-between gap-4">
        <span
          class="font-mono font-light text-[length:clamp(72px,18vw,120px)] leading-[0.85] tracking-[-0.06em] tabular-nums"
        >
          {{ percent
          }}<small class="text-[0.35em] tracking-normal text-muted">%</small>
        </span>
        <div
          class="flex flex-col items-end gap-0.5 font-mono text-13px text-muted"
        >
          <strong
            class="font-sans text-17px font-medium first-letter:uppercase"
            :class="band?.text"
          >
            {{ band?.label }}
          </strong>
          <span>agent-style score</span>
        </div>
      </div>

      <div
        class="relative h-1 mt-6 rounded-full bg-line"
        role="meter"
        :aria-valuenow="percent"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span
          class="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300"
          :class="band?.bar"
          :style="{ width: `${percent}%` }"
        />
        <span
          class="absolute -inset-y-1 w-px bg-fg opacity-40"
          :style="{ left: `${AI_THRESHOLD * 100}%` }"
        />
      </div>

      <p class="mt-4 text-muted text-13px leading-normal">
        A heuristic score of how much this reads like text written by a coding
        agent. Treat it as a hint, not proof: people draft with agents, and some
        people just write this way.
      </p>

      <p
        v-if="source"
        class="mt-3 font-mono text-12px wrap-anywhere"
        :class="missed ? 'text-agent' : 'text-muted'"
      >
        {{ source.name }}
        <template v-if="source.expected">
          · expected {{ source.expected === 'ai' ? 'agent' : 'human' }}
          {{ missed ? '✕' : '✓' }}
        </template>
      </p>

      <ol v-if="result.signals.length" class="mt-10">
        <li
          v-for="signal in result.signals"
          :key="signal.id"
          class="grid grid-cols-[minmax(0,1fr)_72px_44px] items-center gap-2.5 py-2.5 border-t border-line min-[521px]:(grid-cols-[minmax(0,1fr)_140px_48px] gap-4)"
        >
          <div class="flex flex-col min-w-0">
            <code class="font-mono text-13px">{{ signal.id }}</code>
            <span class="truncate text-muted text-13px">{{
              signal.description
            }}</span>
          </div>
          <div
            class="relative h-1.5 before:(content-empty absolute -inset-y-1 left-1/2 w-px bg-line)"
          >
            <span
              class="absolute inset-y-0 rounded-full"
              :class="signal.contribution >= 0 ? 'bg-agent' : 'bg-human'"
              :style="barStyle(signal.contribution)"
            />
          </div>
          <span class="font-mono text-13px tabular-nums text-right">
            {{ signal.contribution > 0 ? '+' : ''
            }}{{ signal.contribution.toFixed(2) }}
          </span>
        </li>
      </ol>
      <p v-else class="text-muted">No signals fired.</p>
    </section>

    <footer class="mt-auto pt-20">
      <p class="pt-4 border-t border-line font-mono text-12px text-muted">
        An ongoing experiment, open source under the MIT license.
        <a
          target="_blank"
          class="text-fg hover:underline"
          href="https://github.com/unveil-project/interlinked"
          >Source on GitHub</a
        >
      </p>
    </footer>
  </main>
</template>
