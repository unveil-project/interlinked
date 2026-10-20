<script setup lang="ts">
import {
  SIGNALS,
  type TextClassification,
  analyzeText,
  locateSignals,
} from '@unveil/interlinked'

/** How each classification shows, in AgentScan's words for text. */
const looks: Record<TextClassification, { label: string; text: string }> = {
  automation: { label: 'Automation signals', text: 'text-automation' },
  mixed: { label: 'Mixed signals', text: 'text-fg' },
  organic: { label: 'Organic writing', text: 'text-organic' },
  'insufficient-data': { label: 'Insufficient data', text: 'text-muted' },
}

/** How many signals the analysis checks. */
const signalCount = SIGNALS.filter((signal) => signal.weight !== 0).length

const route = useRoute()

const {
  markdown,
  template,
  loading,
  error,
  progress,
  source,
  templateRanges,
  templateLines,
} = useAnalysis(() =>
  typeof route.query.url === 'string' ? route.query.url : '',
)
/**
 * The link shared in `?url=`, for the page title and preview image. Only with
 * names GitHub allows, so a made-up link can't put any text it likes there.
 */
const sharedLink = computed(() => {
  const ref =
    typeof route.query.url === 'string'
      ? parseGitHubUrl(route.query.url)
      : undefined
  if (
    ref?.owner &&
    ref.repo &&
    ref.number &&
    /^[\w-]{1,39}$/.test(ref.owner) &&
    /^[\w.-]{1,100}$/.test(ref.repo)
  ) {
    return { ...ref, owner: ref.owner, repo: ref.repo, number: ref.number }
  }
  return undefined
})

useSeoMeta({
  title: () =>
    sharedLink.value
      ? `${sharedLink.value.owner}/${sharedLink.value.repo}#${sharedLink.value.number} · AgentScan · Text`
      : 'AgentScan · Text',
})

// A shared link's preview names what was shared.
if (sharedLink.value) {
  const { owner, repo, number, type, commentId } = sharedLink.value
  defineOgImage('Site', { owner, repo, number, type, comment: !!commentId })
} else {
  defineOgImage('Site')
}

const showTemplate = ref(false)
const textView = useTemplateRef('textView')

const result = computed(() =>
  markdown.value.trim()
    ? analyzeText(markdown.value, {
        template: template.value || undefined,
      })
    : undefined,
)
/** The score to show. None for insufficient data, where it's just the default. */
const percent = computed(() =>
  result.value && result.value.classification !== 'insufficient-data'
    ? Math.round(result.value.score)
    : undefined,
)
const look = computed(() => looks[result.value?.classification ?? 'organic'])
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
    ? 'automation'
    : 'organic'
}

/**
 * Each line cut into segments where the set of signals found there changes,
 * or where template text starts or ends, so every segment can be highlighted
 * as a whole.
 */
const rows = computed(() => {
  let start = 0
  return lines.value.map((line) => {
    const end = start + line.length
    const here = locations.value.filter((l) => l.start < end && l.end > start)
    const templateHere = templateRanges.value.filter(
      (r) => r.start < end && r.end > start,
    )
    const cuts = new Set([0, line.length])
    for (const l of [...here, ...templateHere]) {
      cuts.add(Math.max(l.start - start, 0))
      cuts.add(Math.min(l.end - start, line.length))
    }
    const points = [...cuts].sort((a, b) => a - b)
    const segments = points.slice(0, -1).map((from, i) => {
      const to = points[i + 1]
      const covers = (l: { start: number; end: number }) =>
        l.start - start <= from && l.end - start >= to
      const ids = [...new Set(here.filter(covers).map((l) => l.id))]
      return {
        text: line.slice(from, to),
        ids,
        template: templateHere.some(covers),
      }
    })
    start = end + 1
    return segments
  })
})

/**
 * The first line of each run of lines with template text, where its label
 * goes. Partly scored rows and blank lines don't end a run, so a filled-in
 * table gets one label rather than one per answer.
 */
const templateStarts = computed(() => {
  const starts = new Set<number>()
  let inRun = false
  rows.value.forEach((segments, i) => {
    if (!lines.value[i]?.trim()) {
      return
    }
    const template = segments.some((segment) => segment.template)
    if (template && !inRun) {
      starts.add(i)
    }
    inRun = template
  })
  return starts
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
/**
 * On small screens the sidebar sits above the text, so it shows just the score
 * until the reader asks for the rest.
 */
const expanded = ref(false)
const collapsible = computed(() => (expanded.value ? '' : 'max-lg:hidden'))
// Bring the picked signals into view, at the top of the list.
watch(selected, (ids) => {
  if (ids.length) {
    sidebar.value?.scrollTo({ top: 0, behavior: 'smooth' })
  }
})

// Organic underlines are dotted, so the two tones tell apart without color.
const markClass = {
  automation: {
    plain: 'underline underline-offset-3 decoration-1.5 decoration-automation',
    strong:
      'bg-automation/22 underline underline-offset-3 decoration-2 decoration-automation',
  },
  organic: {
    plain:
      'underline underline-offset-3 decoration-2 decoration-dotted decoration-organic',
    strong:
      'bg-organic/22 underline underline-offset-3 decoration-2 decoration-dotted decoration-organic',
  },
  faded: 'underline underline-offset-3 decoration-1 decoration-[var(--faded)]',
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

onMounted(() => {
  if (!route.query.url && !markdown.value.trim()) {
    // Pasted text doesn't survive a reload.
    navigateTo('/', { replace: true })
  }
})
</script>

<template>
  <!-- Side by side from lg. Below, the sidebar is a bar on top that collapses to the score, so the breakpoint here and on `collapsible` must match. -->
  <div class="flex flex-1 flex-col lg:flex-row">
    <main
      class="flex flex-col flex-1 min-w-0 lg:flex-[999_1_560px]"
      :class="{ 'opacity-50 pointer-events-none': loading }"
    >
      <div
        class="flex flex-wrap items-center gap-x-5 gap-y-1 w-full max-w-210 mx-auto min-h-10 px-4 py-2 font-mono text-12px text-muted sm:px-6"
        aria-live="polite"
      >
        <!-- Which template path is being checked is only known here. -->
        <ClientOnly>
          <FetchStatus
            v-if="progress"
            :progress
            :name="source?.name"
            :href="source?.url"
            :skipped="templateLines.size"
            :expanded="showTemplate"
            @toggle="showTemplate = !showTemplate"
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
                  ? `${templateLines.size} template ${templateLines.size === 1 ? 'line' : 'lines'} left out of the score`
                  : '+ add PR or issue template'
              }}
            </button>
          </template>
          <span v-if="source?.expected" :class="{ 'text-error': missed }">
            expected {{ source.expected === 'ai' ? 'AI' : 'human' }}
            <span
              class="size-3.5"
              :class="missed ? 'i-lucide-x' : 'i-lucide-check'"
              :aria-label="missed ? 'missed' : 'matched'"
              role="img"
            />
          </span>
          <span v-if="error" class="text-error font-sans text-13px">
            {{ error }}
          </span>
        </ClientOnly>
      </div>

      <div
        v-if="showTemplate"
        id="template-field"
        class="w-full max-w-210 mx-auto px-4 pb-2 sm:px-6"
      >
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
        class="relative flex-1 w-full max-w-210 mx-auto"
        aria-label="Analyzed text"
        role="region"
      >
        <div class="pt-2 pb-10 overflow-x-auto">
          <table
            class="w-full border-collapse font-mono text-13px leading-[1.8]"
          >
            <tbody>
              <tr
                v-for="(segments, i) in rows"
                :key="i"
                :class="{ 'bg-hair text-muted/60': templateLines.has(i) }"
                :title="
                  templateLines.has(i)
                    ? 'Part of the template, so it doesn’t count'
                    : undefined
                "
              >
                <td
                  class="w-12 pl-4 pr-3 align-top text-right text-muted/50 select-none tabular-nums text-11px sm:pl-6"
                >
                  {{ i + 1 }}
                </td>
                <td class="h-[1.8em] pr-6 whitespace-pre-wrap wrap-anywhere">
                  <!-- Shading alone reads as styling, so each run of template lines says what it is. Below, as the text view clips anything above its first line. -->
                  <Tooltip
                    v-if="templateStarts.has(i)"
                    label="Part of the template, so it doesn’t count"
                    position="bottom"
                    align="end"
                    class="float-right ml-3 select-none"
                  >
                    <span
                      tabindex="0"
                      class="flex items-center h-[1.8em] text-muted rounded-sm outline-none focus-visible:(ring-1 ring-line)"
                    >
                      <span
                        class="i-lucide-eye-off size-3.5"
                        aria-hidden="true"
                      />
                      <span class="sr-only"
                        >Part of the template, so it doesn’t count</span
                      >
                    </span>
                  </Tooltip>
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
                    <!-- Template text on a line that's partly scored, like a table row with its answer filled in. -->
                    <span
                      v-else-if="segment.template && !templateLines.has(i)"
                      class="rounded-sm bg-hair text-muted/60"
                      title="Part of the template, so it doesn’t count"
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
                  :class="
                    tone([id]) === 'automation' ? 'bg-automation' : 'bg-organic'
                  "
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
                        tone([id]) === 'automation'
                          ? 'text-automation'
                          : 'text-organic'
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
      class="min-w-0 bg-subtle border-line max-lg:(order-first border-b) lg:(flex-[1_1_320px] max-w-90 border-l)"
    >
      <div
        ref="sidebar"
        class="flex flex-col gap-6 px-4 py-3 lg:(sticky top-0 max-h-dvh overflow-y-auto px-5 py-5)"
      >
        <template v-if="result">
          <section aria-labelledby="result">
            <div class="flex items-center justify-between gap-3">
              <h2
                id="result"
                class="font-display text-18px font-bold"
                :class="look.text"
              >
                {{ look.label }}
              </h2>
              <span class="flex items-center gap-3">
                <span class="font-mono text-12px text-muted tabular-nums">
                  {{ percent ?? '—' }}/100
                </span>
                <button
                  type="button"
                  class="flex items-center gap-1 -mr-2 px-2 py-1.5 rounded-md text-12px text-muted hover:(text-fg bg-hair) lg:hidden"
                  :aria-expanded="expanded"
                  aria-controls="result-details signals"
                  @click="expanded = !expanded"
                >
                  {{ result.signals.length }}
                  {{ result.signals.length === 1 ? 'signal' : 'signals' }}
                  <span
                    class="i-lucide-chevron-down size-3.5 transition-transform duration-150"
                    :class="{ 'rotate-180': expanded }"
                    aria-hidden="true"
                  />
                </button>
              </span>
            </div>
            <div id="result-details" :class="collapsible">
              <p
                v-if="result.classification === 'insufficient-data'"
                class="mt-4 text-12px text-soft leading-normal text-pretty"
              >
                Nothing in it leans either way, so there's nothing to score.
              </p>
              <p class="mt-4 text-12px text-muted leading-normal text-pretty">
                Checks {{ signalCount }} patterns in wording and markdown
                structure, weighted against PRs and issues written before coding
                agents.
              </p>
              <p class="mt-2 text-12px text-muted leading-normal text-pretty">
                <template v-if="templateLines.size">
                  Left out {{ templateLines.size }}
                  {{ templateLines.size === 1 ? 'line' : 'lines' }} that match
                  the repo's {{ progress?.templateKind ?? 'PR or issue' }}
                  template, since template text isn't the author's writing.
                </template>
                <template v-else>
                  Lines from the repo's PR or issue template are left out, since
                  template text isn't the author's writing.
                </template>
              </p>
            </div>
          </section>

          <section
            id="signals"
            aria-labelledby="signals-heading"
            :class="collapsible"
          >
            <div class="flex items-baseline justify-between gap-3 mb-1.5">
              <h2 id="signals-heading" class="text-12px font-medium text-soft">
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
                      :class="
                        signal.contribution > 0 ? 'bg-automation' : 'bg-organic'
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
                          : 'whole text'
                      }}
                    </span>
                    <span
                      class="flex-none w-10 font-mono text-11px text-right tabular-nums"
                      :class="
                        signal.contribution > 0
                          ? 'text-automation'
                          : 'text-organic'
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
          <ScoreCaution :class="collapsible" />
        </template>
      </div>
    </aside>
  </div>
</template>
