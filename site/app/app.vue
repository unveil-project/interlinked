<script setup lang="ts">
const { url, markdown, loading, load } = useAnalysis()
const route = useRoute()

/** Analyzes the link in the field, and keeps it in the address to share. */
async function submit() {
  if (await load(url.value)) {
    await navigateTo(analyzePath(url.value), { replace: true })
  }
}
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
        @submit.prevent="submit"
      >
        <NuxtLink
          to="/"
          class="flex items-center gap-2 h-9 font-display text-15px font-bold"
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
        </NuxtLink>
        <div
          v-if="route.name === 'analyze'"
          class="flex flex-[999_1_320px] items-center gap-1 min-w-0 h-9 pl-3 pr-1 rounded-md bg-hair focus-within:(bg-panel shadow-[0_0_0_1px_var(--line)])"
        >
          <label for="link" class="sr-only">GitHub link</label>
          <input
            id="link"
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
            @click="navigateTo('/')"
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
        <nav aria-label="Links" class="flex gap-4 ml-auto text-13px text-soft">
          <a
            target="_blank"
            class="hover:text-fg"
            href="https://github.com/MatteoGabriele/interlinked"
            title="Check every new PR and issue in your repo automatically"
            >GitHub Action</a
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

    <NuxtPage />
  </div>
</template>
