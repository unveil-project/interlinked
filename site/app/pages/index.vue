<script setup lang="ts">
import agentExample from '../examples/ajeetdsouza-zoxide-1314.md?raw'
import humanExample from '../examples/godotengine-godot-32448.md?raw'

/** Texts from the test corpus to try without fetching anything. */
const examples: {
  title: string
  name: string
  url: string
  expected: Label
  text: string
}[] = [
  {
    title: 'Automation',
    name: 'ajeetdsouza/zoxide#1314',
    url: 'https://github.com/ajeetdsouza/zoxide/pull/1314',
    expected: 'ai',
    text: agentExample,
  },
  {
    title: 'Organic',
    name: 'godotengine/godot#32448',
    url: 'https://github.com/godotengine/godot/pull/32448',
    expected: 'human',
    text: humanExample,
  },
]

const pasted = usePastedText()

/** The link being fetched. Shown here until it's in, so feedback is immediate. */
const link = ref('')
const { loading, error, progress, source, templateLines, refresh } =
  useAnalysis(link)

/** What is typed or pasted: a link or the text itself. */
const draft = ref('')
const draftField = useTemplateRef('draftField')

/** Whether the draft is meant as a link rather than text: one word, starting like a URL. */
const draftIsLink = computed(() =>
  /^(https?:\/\/|github\.com\/)\S*$/.test(draft.value.trim()),
)
/** A line under the field saying what the draft was read as. */
const draftHint = computed(() => {
  const text = draft.value.trim()
  if (!text) {
    return ''
  }
  if (draftIsLink.value) {
    const ref = parseGitHubUrl(text)
    if (!ref) {
      return 'Not a GitHub pull request, issue or comment link yet'
    }
    const kind = ref.commentId
      ? 'Comment'
      : ref.type === 'pull'
        ? 'Pull request'
        : 'Issue'
    return `${kind} · ${ref.owner}/${ref.repo}#${ref.number}`
  }
  const words = text.split(/\s+/).length
  return `Text · ${words} ${words === 1 ? 'word' : 'words'} · ⌘↵ to analyze`
})

/** Analyzes the draft: fetches it if it is a link, else takes it as the text. */
async function submit() {
  const text = draft.value.trim()
  if (!text) {
    return
  }
  if (draftIsLink.value) {
    link.value = text
    await refresh()
    if (!error.value) {
      await navigateTo(analyzePath(text))
    }
    return
  }
  pasted.value = { markdown: draft.value, template: '' }
  await navigateTo('/analyze')
}

/** A paste into the empty field is analyzed right away. */
function submitPaste() {
  if (draft.value.trim()) {
    return
  }
  // Wait for the pasted text to land in the field.
  setTimeout(submit)
}

/** Enter submits a link, and ⌘ or Ctrl+Enter submits anything. */
function submitKey(event: KeyboardEvent) {
  if (
    event.metaKey ||
    event.ctrlKey ||
    (draftIsLink.value && !event.shiftKey)
  ) {
    event.preventDefault()
    submit()
  }
}

function tryExample(example: (typeof examples)[number]) {
  pasted.value = {
    markdown: example.text,
    template: '',
    source: {
      name: example.name,
      url: example.url,
      expected: example.expected,
    },
  }
  navigateTo('/analyze')
}

defineOgImage('Site')

const router = useRouter()

// Coming back here starts over. On mount, so the prerendered page hydrates
// first.
onMounted(() => {
  pasted.value = undefined
  // Links shared before the analysis had a page of its own.
  const shared = router.currentRoute.value.query.url
  if (typeof shared === 'string' && shared) {
    navigateTo(analyzePath(shared), { replace: true })
    return
  }
  draftField.value?.focus()
})
</script>

<template>
  <main class="flex-1 px-4 pt-[min(6vh,80px)] pb-6 sm:px-6">
    <div class="mx-auto max-w-180">
      <h2
        class="font-display text-[clamp(30px,5.5vw,44px)] font-medium leading-[1.1] tracking-[-0.025em] text-balance"
      >
        Find signs of
        <mark
          class="px-[0.1em] whitespace-nowrap font-mono text-[0.86em] font-medium tracking-normal bg-automation/22 shadow-[inset_0_-0.07em_0_var(--automation)]"
          >AI-written</mark
        >
        text in open source contributions
      </h2>
      <p class="mt-3 text-15px text-soft leading-relaxed text-pretty">
        Paste a GitHub PR, issue or comment link, or any text, to check it for
        AI traits.
      </p>

      <form
        class="mt-8 rounded-xl border border-line bg-panel shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-16px_rgb(0_0_0/0.18)] transition-colors focus-within:border-muted/50"
        @submit.prevent="submit"
      >
        <label for="draft" class="sr-only">GitHub link or text</label>
        <textarea
          id="draft"
          ref="draftField"
          v-model="draft"
          rows="1"
          autofocus
          spellcheck="false"
          :readonly="loading"
          placeholder="https://github.com/owner/repo/pull/1"
          class="block w-full min-h-15 max-h-[45vh] px-4 pt-4 pb-1 bg-transparent font-mono text-13px leading-[1.7] resize-none outline-none [field-sizing:content] placeholder:text-muted"
          @paste="submitPaste"
          @keydown.enter="submitKey"
        />
        <div
          class="flex items-center justify-between gap-3 pt-1 pr-2 pb-2 pl-4"
        >
          <span class="min-w-0 text-12px text-muted truncate">
            {{ draftHint }}
          </span>
          <button
            type="submit"
            :disabled="loading || !draft.trim()"
            class="flex-none h-8 px-3.5 rounded-md bg-fg text-page text-13px font-medium transition-colors disabled:(bg-hair text-muted)"
          >
            {{ loading ? 'Fetching…' : 'Analyze' }}
          </button>
        </div>
      </form>

      <div
        v-if="progress || error"
        class="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 px-1 font-mono text-12px text-muted"
        aria-live="polite"
      >
        <FetchStatus
          v-if="progress"
          :progress
          :name="source?.name"
          :href="source?.url"
          :skipped="templateLines.size"
        />
        <span v-if="error" class="text-error font-sans text-13px">
          {{ error }}
        </span>
      </div>

      <div class="flex flex-wrap items-center gap-2 mt-6 text-13px">
        <span class="mr-1 text-muted max-sm:w-full">Or try one</span>
        <button
          v-for="example in examples"
          :key="example.name"
          type="button"
          class="flex items-center gap-2 h-8 pr-3 pl-2.5 rounded-full border border-line bg-panel text-soft transition-colors hover:(border-muted/50 text-fg)"
          @click="tryExample(example)"
        >
          <span
            class="flex-none size-1.5 rounded-full"
            :class="example.expected === 'ai' ? 'bg-automation' : 'bg-organic'"
          />
          {{ example.title }}
          <span class="font-mono text-11px text-muted max-sm:hidden">
            {{ example.name.split('/')[1] }}
          </span>
        </button>
      </div>

      <section aria-labelledby="how" class="mt-8 pt-6 border-t border-line">
        <h2
          id="how"
          class="text-11px font-medium uppercase tracking-[0.06em] text-muted"
        >
          How to read it
        </h2>
        <div class="grid gap-x-8 gap-y-10 mt-5 sm:grid-cols-2">
          <div>
            <div
              class="flex flex-col justify-center gap-1.5 h-26 px-5 rounded-lg border border-line bg-subtle font-mono text-12px leading-[1.8] text-soft"
              aria-hidden="true"
            >
              <span>
                Thanks @alice
                <mark
                  class="font-sans underline underline-offset-3 decoration-1.5 decoration-automation"
                  >—</mark
                >
                <mark
                  class="underline underline-offset-3 decoration-1.5 decoration-automation"
                >
                  great catch</mark
                >!
              </span>
              <span class="truncate">
                <mark
                  class="underline underline-offset-3 decoration-2 decoration-dotted decoration-organic"
                  >Not sure</mark
                >
                it's the right fix
                <mark
                  class="underline underline-offset-3 decoration-2 decoration-dotted decoration-organic"
                  >lol</mark
                >
              </span>
            </div>
            <h3 class="mt-4 font-display text-15px font-medium">
              Underlined phrases
            </h3>
            <p class="mt-1.5 text-13px text-muted leading-relaxed text-pretty">
              <span
                class="underline underline-offset-3 decoration-1.5 decoration-automation"
                >Solid red</span
              >
              leans agent,
              <span
                class="underline underline-offset-3 decoration-2 decoration-dotted decoration-organic"
                >dotted green</span
              >
              leans human. Click one to see why it counts.
            </p>
          </div>

          <div>
            <div
              class="flex flex-col justify-center h-26 px-5 rounded-lg border border-line bg-subtle"
              aria-hidden="true"
            >
              <div class="flex items-baseline justify-between gap-2">
                <span class="text-12px font-medium text-automation">
                  Automation signals
                </span>
                <span class="font-mono text-11px text-muted"
                  >82% confident</span
                >
              </div>
              <ul class="flex flex-col gap-1 mt-2.5 text-12px text-soft">
                <li class="flex items-baseline gap-2.5">
                  <span
                    class="flex-none size-1.5 rounded-full bg-automation -translate-y-0.5"
                  />
                  <span class="flex-1 min-w-0 truncate">
                    Uses em-dashes heavily
                  </span>
                </li>
                <li class="flex items-baseline gap-2.5">
                  <span
                    class="flex-none size-1.5 rounded-full bg-organic -translate-y-0.5"
                  />
                  <span class="flex-1 min-w-0 truncate">
                    Uses contractions (don't, it's, we'll)
                  </span>
                </li>
              </ul>
            </div>
            <h3 class="mt-4 font-display text-15px font-medium">
              A label and how confident it is
            </h3>
            <p class="mt-1.5 text-13px text-muted leading-relaxed text-pretty">
              Red signals lean agent, green ones lean human. An automation label
              is a reason to look closer, not to accuse.
            </p>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>
