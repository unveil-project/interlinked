<script setup lang="ts">
import { SIGNALS, analyzeText, locateSignals } from '@unveil/interlinked'

/** Score bands, lowest first. Each applies to scores below its `max`. */
const bands = [
  {
    max: 0.35,
    label: 'Likely human-written',
    text: 'text-human',
    fill: 'bg-human',
  },
  { max: 0.65, label: 'Inconclusive', text: 'text-fg', fill: 'bg-muted' },
  {
    max: Infinity,
    label: 'Likely AI-generated',
    text: 'text-agent',
    fill: 'bg-agent',
  },
]

/** How many signals the analysis checks. */
const signalCount = SIGNALS.filter((signal) => signal.weight !== 0).length

const {
  markdown,
  template,
  loading,
  error,
  progress,
  source,
  templateLines,
  load,
} = useAnalysis()
const showTemplate = ref(false)
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
let unhoverTimer: ReturnType<typeof setTimeout> | undefined

function hover(ids: string[]) {
  clearTimeout(unhoverTimer)
  hovered.value = ids
}

/**
 * Lets go of the hovered signals a moment later, so crossing the gap between
 * two highlighted lines doesn't flash every highlight off and on again.
 */
function unhover() {
  clearTimeout(unhoverTimer)
  unhoverTimer = setTimeout(() => {
    hovered.value = []
  }, 100)
}

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
  clearTimeout(unhoverTimer)
})

/** Shows every signal again. */
function showAll() {
  focus.value = undefined
  card.value = undefined
}

// A new text shows every signal again.
watch(markdown, showAll)

const router = useRouter()
// Analyze the link shared in `?url=`. On mount, so the prerendered page
// hydrates first.
onMounted(() => {
  const shared = router.currentRoute.value.query.url
  if (typeof shared === 'string' && shared) {
    load(shared)
  } else if (!markdown.value.trim()) {
    // Pasted text doesn't survive a reload.
    navigateTo('/', { replace: true })
  }
})
</script>

<template>
  <div class="flex flex-1 flex-wrap">
    <main
      class="flex flex-col flex-[999_1_560px] min-w-0"
      :class="{ 'opacity-50 pointer-events-none': loading }"
    >
      <div
        class="flex flex-wrap items-center gap-x-5 gap-y-1 min-h-10 px-4 py-2 font-mono text-12px text-muted sm:px-6"
        aria-live="polite"
      >
        <FetchStatus
          v-if="progress"
          :progress
          :name="source?.name"
          :href="source?.url"
          :skipped="templateLines.size"
        />
        <template v-else>
          <a
            v-if="source?.url"
            :href="source.url"
            target="_blank"
            rel="noopener"
            class="hover:text-fg underline-offset-2 hover:underline"
            >{{ source.name }}</a
          >
          <span v-else>{{ source?.name ?? 'pasted text' }}</span>
          <button
            type="button"
            class="hover:text-fg"
            :aria-expanded="showTemplate"
            aria-controls="template-field"
            @click="showTemplate = !showTemplate"
          >
            {{
              template
                ? `${templateLines.size} template ${templateLines.size === 1 ? 'line' : 'lines'} not scored`
                : '+ add PR or issue template'
            }}
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
              <tr
                v-for="(segments, i) in rows"
                :key="i"
                :class="{ 'text-muted/60': templateLines.has(i) }"
                :title="
                  templateLines.has(i)
                    ? 'From the template, not scored'
                    : undefined
                "
              >
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
                      @mouseenter="hover(segment.ids)"
                      @mouseleave="unhover"
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
                @mouseenter="hover([id])"
                @mouseleave="unhover"
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
                        (signalsById.get(id)?.contribution ?? 0) > 0 ? '+' : ''
                      }}{{ signalsById.get(id)?.contribution.toFixed(2) }}</span
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
                class="font-display text-18px font-bold"
                :class="band?.text"
              >
                {{ band?.label }}
              </h2>
              <span class="font-mono text-12px text-muted tabular-nums">
                {{ percent }}/100
              </span>
            </div>
            <ScoreBar :score="percent" :fill="band.fill" class="mt-3" />
            <ScoreCaution class="mt-4" />
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
                  <!-- Signals about the text as a whole have nothing to point to, so they aren't buttons. -->
                  <component
                    :is="occurrences.get(signal.id) ? 'button' : 'div'"
                    v-bind="
                      occurrences.get(signal.id)
                        ? {
                            type: 'button',
                            'aria-pressed': focus === signal.id,
                          }
                        : {}
                    "
                    class="flex items-baseline gap-2.5 w-full px-2 py-1.5 rounded-md text-left text-13px transition-colors duration-150"
                    :class="{
                      'hover:bg-hair': occurrences.get(signal.id),
                      'bg-hair': active.includes(signal.id),
                      'opacity-40':
                        (focus || card) && !active.includes(signal.id),
                    }"
                    :title="signal.id"
                    @mouseenter="
                      occurrences.get(signal.id) && hover([signal.id])
                    "
                    @mouseleave="unhover"
                    @click="occurrences.get(signal.id) && pick(signal.id)"
                  >
                    <span
                      class="flex-none size-1.5 rounded-full -translate-y-0.5"
                      :class="signal.contribution > 0 ? 'bg-agent' : 'bg-human'"
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
                          : 'whole text'
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
                  </component>
                </li>
              </ul>
            </template>
          </section>
        </template>
        <p class="text-12px text-muted leading-normal">
          Checks {{ signalCount }} patterns in wording and markdown structure,
          weighted against PRs and issues written before coding agents.
        </p>
      </div>
    </aside>
  </div>
</template>
