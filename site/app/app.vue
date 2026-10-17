<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useTemplateRef,
  watch,
} from 'vue'
import {
  AI_THRESHOLD,
  SIGNALS,
  analyzeText,
  locateSignals,
} from '@unveil/interlinked'

type Label = 'ai' | 'human'
type Step = 'loading' | 'done' | 'none' | 'failed'

/** Score bands, lowest first. Each applies to scores below its `max`. */
const bands = [
  { max: 0.35, label: 'Likely human-written', text: 'text-human' },
  { max: 0.65, label: 'Inconclusive', text: 'text-fg' },
  { max: Infinity, label: 'Likely AI-generated', text: 'text-agent' },
]

/** How many signals the analysis checks. */
const signalCount = SIGNALS.filter((signal) => signal.weight !== 0).length

const url = ref('')
const markdown = ref('')
const template = ref('')
const showTemplate = ref(false)
/** Whether the text shows in a field to type into, rather than highlighted. */
const typing = ref(false)
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
const textView = useTemplateRef('textView')

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
const lines = computed(() => markdown.value.split('\n'))
const missed = computed(
  () =>
    !!result.value &&
    !!source.value?.expected &&
    source.value.expected !== result.value.verdict,
)

/** The signal picked to show on its own, if any. */
const focus = ref<string>()
const signalsById = computed(
  () => new Map(result.value?.signals.map((s) => [s.id, s])),
)
const locations = computed(() =>
  result.value
    ? locateSignals(
        markdown.value,
        { template: template.value || undefined },
        result.value.signals.map((s) => s.id),
      )
    : [],
)
/** How many places each signal was found in. */
const occurrences = computed(() => {
  const counts = new Map<string, number>()
  for (const { id } of locations.value) {
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
})

/** The tone of a highlight: by the signals it shows, AI if any leans AI. */
function tone(ids: string[]) {
  return ids.some((id) => (signalsById.value.get(id)?.contribution ?? 0) > 0)
    ? 'agent'
    : 'human'
}

/**
 * Each line cut into segments where the set of signals found there changes,
 * so every segment can be highlighted as a whole.
 */
const rows = computed(() => {
  let start = 0
  return lines.value.map((line) => {
    const end = start + line.length
    const here = locations.value.filter((l) => l.start < end && l.end > start)
    const cuts = new Set([0, line.length])
    for (const l of here) {
      cuts.add(Math.max(l.start - start, 0))
      cuts.add(Math.min(l.end - start, line.length))
    }
    const points = [...cuts].sort((a, b) => a - b)
    const segments = points.slice(0, -1).map((from, i) => {
      const to = points[i + 1]
      const ids = [
        ...new Set(
          here
            .filter((l) => l.start - start <= from && l.end - start >= to)
            .map((l) => l.id),
        ),
      ]
      return { text: line.slice(from, to), ids }
    })
    start = end + 1
    return segments
  })
})

/** The signals under the pointer, in the text or in the list. */
const hovered = ref<string[]>([])
/** The card listing the signals at a clicked highlight, and where it sits. */
const card = ref<{ ids: string[]; top: number; left: number }>()
const cardElement = useTemplateRef('cardElement')

/**
 * The signals to bring forward. Every other highlight fades. While the card is
 * open, what the pointer is on comes first, so each of its signals can be told
 * apart; then the picked signal; then the card's; then what the pointer is on.
 */
const active = computed(() => {
  if (card.value && hovered.value.length) {
    return hovered.value
  }
  if (focus.value) {
    return [focus.value]
  }
  return card.value?.ids ?? hovered.value
})

/** The signals the reader picked: those in the open card, else the one clicked. */
const selected = computed(
  () => card.value?.ids ?? (focus.value ? [focus.value] : []),
)
/** The signal list, with the picked signals in a group of their own on top. */
const signalGroups = computed(() => {
  const signals = result.value?.signals ?? []
  const picked = signals.filter((s) => selected.value.includes(s.id))
  const rest = signals.filter((s) => !selected.value.includes(s.id))
  if (!picked.length) {
    return [{ label: undefined, signals: rest }]
  }
  return [
    { label: 'Selected', signals: picked },
    { label: 'Other signals', signals: rest },
  ].filter((group) => group.signals.length)
})

const sidebar = useTemplateRef('sidebar')
// Bring the picked signals into view, at the top of the list.
watch(selected, (ids) => {
  if (ids.length) {
    sidebar.value?.scrollTo({ top: 0, behavior: 'smooth' })
  }
})

const markClass = {
  agent: {
    plain: 'shadow-[inset_0_-1.5px_0_var(--agent)]',
    strong: 'bg-agent/22 shadow-[inset_0_-2px_0_var(--agent)]',
  },
  human: {
    plain: 'shadow-[inset_0_-1.5px_0_var(--human)]',
    strong: 'bg-human/22 shadow-[inset_0_-2px_0_var(--human)]',
  },
  faded: 'shadow-[inset_0_-1px_0_var(--faded)]',
}

/**
 * Underlined in the signal's color while nothing is picked. Once a signal is
 * picked or hovered, its highlights fill in and every other one goes gray.
 */
function highlight(ids: string[]) {
  if (!active.value.length) {
    return markClass[tone(ids)].plain
  }
  const shown = ids.filter((id) => active.value.includes(id))
  return shown.length ? markClass[tone(shown)].strong : markClass.faded
}

/** Shows one signal on its own and scrolls to it, or shows all again. */
async function pick(id: string) {
  focus.value = focus.value === id ? undefined : id
  card.value = undefined
  if (!focus.value) {
    return
  }
  await nextTick()
  textView.value
    ?.querySelector(`[data-signals~="${id}"]`)
    ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

/** Opens the card for a highlight, under it. A lone signal is picked too. */
function openCard(event: MouseEvent, ids: string[]) {
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const frame = textView.value?.getBoundingClientRect()
  if (!frame) {
    return
  }
  const width = Math.min(320, frame.width - 16)
  card.value = {
    ids,
    top: box.bottom - frame.top + 6,
    left: Math.min(Math.max(box.left - frame.left, 8), frame.width - width - 8),
  }
  focus.value = ids.length === 1 ? ids[0] : undefined
}

/** Closes the card and shows every signal again on a click elsewhere, or on Escape. */
function dismiss(event: Event) {
  if (!card.value) {
    return
  }
  if (event instanceof KeyboardEvent) {
    if (event.key === 'Escape') {
      showAll()
    }
    return
  }
  const target = event.target as Element
  if (!cardElement.value?.contains(target) && !target.closest('mark')) {
    showAll()
  }
}

onMounted(() => {
  document.addEventListener('click', dismiss)
  document.addEventListener('keydown', dismiss)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', dismiss)
  document.removeEventListener('keydown', dismiss)
})

/** Shows every signal again. */
function showAll() {
  focus.value = undefined
  card.value = undefined
}

/** Leaves the field for the highlighted text, once there is text. */
function settle() {
  setTimeout(() => {
    typing.value = !markdown.value.trim()
  })
}

async function load() {
  error.value = ''
  const ref = parseGitHubUrl(url.value)
  if (!ref) {
    error.value = "That isn't a GitHub issue, pull request or comment link."
    return
  }
  // Only fetch when the link changes.
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
    typing.value = false
    showAll()
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
  showTemplate.value = false
  typing.value = false
  showAll()
  loadedUrl = undefined
  history.replaceState(null, '', location.pathname)
  linkInput.value?.focus()
}

const stepIcon: Record<Step, string> = {
  loading:
    'border-1.5 border-line border-t-fg animate-spin animate-duration-700 motion-reduce:animate-duration-2000',
  done: 'bg-ok',
  none: 'border-1.5 border-muted',
  failed: 'bg-agent',
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
  <div class="flex flex-col min-h-dvh bg-panel">
    <h1 class="sr-only">
      interlinked: check a pull request, issue or comment for signs of
      AI-generated text
    </h1>

    <header class="border-b border-line">
      <form
        class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-5"
        @submit.prevent="load"
      >
        <a
          href="/"
          class="flex items-center gap-2 text-14px font-semibold"
          aria-label="interlinked, start over"
        >
          <svg
            viewBox="0 0 20 20"
            class="size-4.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            aria-hidden="true"
          >
            <rect x="2" y="5" width="10" height="10" rx="2" />
            <rect x="8" y="5" width="10" height="10" rx="2" />
          </svg>
          <span>interlinked</span>
        </a>
        <div
          class="flex flex-[999_1_320px] items-center gap-1 min-w-0 h-9 pl-3 pr-1 rounded-md bg-hair focus-within:(bg-panel shadow-[0_0_0_1px_var(--line)])"
        >
          <label for="link" class="sr-only">GitHub link</label>
          <input
            id="link"
            ref="linkInput"
            v-model="url"
            type="url"
            placeholder="Paste a GitHub pull request, issue or comment link"
            spellcheck="false"
            class="flex-1 min-w-0 h-full bg-transparent font-mono text-13px outline-none placeholder:(font-sans text-muted)"
          />
          <button
            v-if="url || markdown"
            type="button"
            aria-label="Clear"
            class="grid place-items-center size-7 rounded text-muted hover:text-fg"
            @click="clear"
          >
            <svg viewBox="0 0 16 16" class="size-3.5" aria-hidden="true">
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
            class="h-7 px-3 rounded bg-fg text-page text-13px font-medium disabled:(bg-transparent text-muted)"
          >
            {{ loading ? 'Fetching…' : 'Analyze' }}
          </button>
        </div>
        <nav aria-label="Links" class="flex gap-4 text-13px text-soft">
          <a
            target="_blank"
            class="hover:text-fg"
            href="https://github.com/MatteoGabriele/interlinked"
            >Install</a
          >
          <a
            target="_blank"
            class="hover:text-fg"
            href="https://github.com/unveil-project/interlinked"
            >Source</a
          >
        </nav>
      </form>
    </header>

    <div class="flex flex-1 flex-wrap">
      <main
        class="flex flex-col flex-[999_1_560px] min-w-0"
        :class="{ 'opacity-50 pointer-events-none': loading }"
      >
        <div
          v-if="progress || error || markdown"
          class="flex flex-wrap items-center gap-x-5 gap-y-1 min-h-10 px-4 py-2 font-mono text-12px text-muted sm:px-6"
          aria-live="polite"
        >
          <template v-if="progress">
            <span
              class="flex items-center gap-2"
              :class="{ 'text-agent': progress.body === 'failed' }"
            >
              <span
                class="flex-none size-1.5 rounded-full"
                :class="stepIcon[progress.body]"
              />
              {{ source?.name ?? progress.noun }}
            </span>
            <span
              class="flex items-center gap-2 min-w-0"
              :class="{ 'text-agent': progress.template === 'failed' }"
            >
              <span
                class="flex-none size-1.5 rounded-full"
                :class="stepIcon[progress.template]"
              />
              <span class="truncate">
                <template v-if="progress.template === 'loading'">
                  checking {{ progress.path }}…
                </template>
                <template v-else-if="progress.template === 'done'">
                  template excluded
                </template>
                <template v-else-if="progress.template === 'none'">
                  {{
                    progress.noun === 'comment'
                      ? 'comments have no template'
                      : 'no template'
                  }}
                </template>
                <template v-else>template failed</template>
              </span>
            </span>
          </template>
          <template v-else-if="markdown">
            <span>pasted text</span>
            <button
              type="button"
              class="hover:text-fg"
              :aria-expanded="showTemplate"
              aria-controls="template-field"
              @click="showTemplate = !showTemplate"
            >
              {{ template ? 'template excluded' : '+ template' }}
            </button>
          </template>
          <span v-if="source?.expected" :class="{ 'text-agent': missed }">
            expected {{ source.expected === 'ai' ? 'AI' : 'human' }}
            {{ missed ? '✕' : '✓' }}
          </span>
          <span v-if="error" class="text-agent font-sans text-13px">
            {{ error }}
          </span>
        </div>

        <div v-if="showTemplate" id="template-field" class="px-4 pb-2 sm:px-6">
          <label for="template" class="sr-only">Template</label>
          <textarea
            id="template"
            v-model="template"
            spellcheck="false"
            placeholder="The repo's PR or issue template. Its headings and checklists won't count toward the score."
            class="block w-full min-h-24 p-3 rounded-md bg-hair font-mono text-12px leading-[1.6] resize-none outline-none [field-sizing:content] placeholder:(font-sans text-muted)"
          />
        </div>

        <div
          v-if="typing || !markdown"
          class="flex flex-col flex-1 px-4 pt-6 pb-10 sm:px-6"
        >
          <label for="text" class="sr-only">Text</label>
          <textarea
            id="text"
            v-model="markdown"
            spellcheck="false"
            placeholder="…or paste the text of a PR description, issue or comment here."
            class="block flex-1 w-full max-w-200 min-h-80 bg-transparent font-mono text-13px leading-[1.8] resize-none outline-none placeholder:(font-sans text-14px text-muted)"
            @focus="typing = true"
            @paste="settle"
            @blur="settle"
          />
        </div>
        <div
          v-else
          ref="textView"
          class="relative flex-1"
          aria-label="Analyzed text"
          role="region"
        >
          <div class="pt-2 pb-10 overflow-x-auto">
            <table
              class="w-full max-w-210 border-collapse font-mono text-13px leading-[1.8]"
            >
              <tbody>
                <tr v-for="(segments, i) in rows" :key="i">
                  <td
                    class="w-12 pl-4 pr-3 align-top text-right text-muted/50 select-none tabular-nums text-11px sm:pl-6"
                  >
                    {{ i + 1 }}
                  </td>
                  <td class="h-[1.8em] pr-6 whitespace-pre-wrap wrap-anywhere">
                    <template v-for="(segment, j) in segments" :key="j">
                      <mark
                        v-if="segment.ids.length"
                        :data-signals="segment.ids.join(' ')"
                        class="cursor-pointer transition-colors duration-150"
                        :class="highlight(segment.ids)"
                        @mouseenter="hovered = segment.ids"
                        @mouseleave="hovered = []"
                        @click="openCard($event, segment.ids)"
                        v-text="segment.text"
                      />
                      <span v-else v-text="segment.text" />
                    </template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            v-if="card"
            ref="cardElement"
            class="absolute z-10 w-80 max-w-[calc(100%-16px)] p-1 rounded-lg border border-line bg-panel shadow-[0_8px_24px_rgb(0_0_0/0.12)]"
            :style="{ top: `${card.top}px`, left: `${card.left}px` }"
          >
            <p class="px-2.5 pt-1.5 pb-1 text-11px text-muted">
              {{
                card.ids.length === 1
                  ? 'Underlined because it'
                  : `Underlined for ${card.ids.length} signals. Pick one to see all its matches.`
              }}
            </p>
            <ul>
              <li v-for="id in card.ids" :key="id">
                <button
                  type="button"
                  class="flex items-baseline gap-2.5 w-full px-2.5 py-2 rounded-md text-left text-13px hover:bg-hair"
                  :class="{ 'bg-hair': focus === id }"
                  :aria-pressed="focus === id"
                  @mouseenter="hovered = [id]"
                  @mouseleave="hovered = []"
                  @click="focus = focus === id ? undefined : id"
                >
                  <span
                    class="flex-none size-1.5 rounded-full -translate-y-0.5"
                    :class="tone([id]) === 'agent' ? 'bg-agent' : 'bg-human'"
                  />
                  <span
                    class="flex-1 min-w-0"
                    :class="{ 'first-letter:uppercase': card.ids.length > 1 }"
                  >
                    {{ signalsById.get(id)?.description }}
                    <span class="block mt-0.5 font-mono text-11px text-muted">
                      found {{ occurrences.get(id) }}× in this text ·
                      <span
                        :class="
                          tone([id]) === 'agent' ? 'text-agent' : 'text-human'
                        "
                        >{{
                          (signalsById.get(id)?.contribution ?? 0) > 0
                            ? '+'
                            : ''
                        }}{{
                          signalsById.get(id)?.contribution.toFixed(2)
                        }}</span
                      >
                    </span>
                  </span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </main>

      <aside
        class="flex-[1_1_320px] min-w-0 bg-subtle border-line max-lg:(order-first border-b) lg:(max-w-90 border-l)"
      >
        <div
          ref="sidebar"
          class="flex flex-col gap-6 px-5 py-5 lg:(sticky top-0 max-h-dvh overflow-y-auto)"
        >
          <template v-if="result">
            <section aria-labelledby="result">
              <div class="flex items-baseline justify-between gap-3">
                <h2
                  id="result"
                  class="text-16px font-semibold"
                  :class="band?.text"
                >
                  {{ band?.label }}
                </h2>
                <span class="font-mono text-12px text-muted tabular-nums">
                  {{ percent }}/100
                </span>
              </div>
              <div
                class="relative mt-3 h-1"
                role="meter"
                aria-label="Score"
                :aria-valuenow="percent"
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <div class="absolute inset-0 flex gap-0.5">
                  <span class="w-[35%] rounded-l-full bg-human/40" />
                  <span class="w-[30%] bg-line" />
                  <span class="w-[35%] rounded-r-full bg-agent/70" />
                </div>
                <span
                  class="absolute -top-1 w-0.5 h-3 rounded-full bg-fg -translate-x-1/2 transition-[left] duration-300"
                  :style="{ left: `${percent}%` }"
                />
              </div>
              <p class="mt-3 text-12px text-muted leading-normal">
                A hint, not proof. About 3% of human-written texts score above
                {{ AI_THRESHOLD * 100 }}.
              </p>
            </section>

            <section aria-labelledby="signals">
              <div class="flex items-baseline justify-between gap-3 mb-1.5">
                <h2 id="signals" class="text-12px font-medium text-soft">
                  Signals
                </h2>
                <span class="flex items-center gap-3 text-12px text-muted">
                  <button
                    v-if="focus || card"
                    type="button"
                    class="hover:text-fg"
                    @click="showAll"
                  >
                    Show all
                  </button>
                  <span>{{ result.signals.length }} of {{ signalCount }}</span>
                </span>
              </div>
              <p v-if="!result.signals.length" class="text-13px text-muted">
                None found.
              </p>
              <p v-else class="mb-2 text-12px text-muted leading-normal">
                Point at a signal or at underlined text to see how they match.
                Click to keep one in view.
              </p>
              <template v-for="group in signalGroups" :key="group.label">
                <h3
                  v-if="group.label"
                  class="mt-3 mb-1 text-11px font-medium uppercase tracking-[0.06em] text-muted"
                >
                  {{ group.label }}
                </h3>
                <ul class="-mx-2">
                  <li v-for="signal in group.signals" :key="signal.id">
                    <button
                      type="button"
                      class="flex items-baseline gap-2.5 w-full px-2 py-1.5 rounded-md text-left text-13px transition-colors duration-150 enabled:hover:bg-hair disabled:cursor-default"
                      :class="{
                        'bg-hair': active.includes(signal.id),
                        'opacity-40':
                          (focus || card) && !active.includes(signal.id),
                      }"
                      :title="signal.id"
                      :aria-pressed="focus === signal.id"
                      :disabled="!occurrences.get(signal.id)"
                      @mouseenter="hovered = [signal.id]"
                      @mouseleave="hovered = []"
                      @click="pick(signal.id)"
                    >
                      <span
                        class="flex-none size-1.5 rounded-full -translate-y-0.5"
                        :class="
                          signal.contribution > 0 ? 'bg-agent' : 'bg-human'
                        "
                      />
                      <span class="flex-1 min-w-0 first-letter:uppercase">
                        {{ signal.description }}
                      </span>
                      <span
                        class="flex-none font-mono text-11px text-muted tabular-nums"
                      >
                        {{
                          occurrences.get(signal.id)
                            ? `×${occurrences.get(signal.id)}`
                            : 'all'
                        }}
                      </span>
                      <span
                        class="flex-none w-10 font-mono text-11px text-right tabular-nums"
                        :class="
                          signal.contribution > 0 ? 'text-agent' : 'text-human'
                        "
                      >
                        {{ signal.contribution > 0 ? '+' : ''
                        }}{{ signal.contribution.toFixed(2) }}
                      </span>
                    </button>
                  </li>
                </ul>
              </template>
            </section>
          </template>
          <p v-else class="text-13px text-soft leading-normal">
            Paste a link or some text. Writing patterns common in text from
            coding agents get underlined, so you can see what the score is based
            on.
          </p>

          <p class="text-12px text-muted leading-normal">
            Checks {{ signalCount }} patterns in wording and markdown structure,
            weighted against PRs and issues written before coding agents. People
            draft with agents, and some people just write this way: use it
            alongside your own judgement.
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>
