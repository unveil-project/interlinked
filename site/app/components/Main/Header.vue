<script setup lang="ts">
const route = useRoute()

/** The link in the field, starting as the one being analyzed. */
const url = ref('')
watch(
  () => route.query.url,
  (link) => {
    url.value = typeof link === 'string' && link ? `https://${link}` : ''
  },
  { immediate: true },
)

function submit() {
  navigateTo(analyzePath(url.value), { replace: true })
}
</script>

<template>
  <header class="border-b border-line">
    <form
      class="flex flex-wrap items-center gap-x-4 gap-y-2 w-full max-w-screen-xl mx-auto px-4 py-2 sm:px-5"
      @submit.prevent="submit"
    >
      <NuxtLink
        to="/"
        class="flex items-center h-9"
        aria-label="AgentScan Text, start over"
      >
        <Logo />
      </NuxtLink>
      <div
        v-if="route.path === '/analyze'"
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
          type="button"
          aria-label="Clear"
          class="grid place-items-center size-7 rounded text-muted hover:text-fg"
          @click="navigateTo('/')"
        >
          <span class="i-lucide-x size-3.5" aria-hidden="true" />
        </button>
        <button
          type="submit"
          :disabled="!url"
          class="h-7 px-3 rounded bg-fg text-page text-13px font-medium disabled:(bg-transparent text-muted)"
        >
          Analyze
        </button>
      </div>
      <nav aria-label="Links" class="flex gap-4 ml-auto text-13px text-soft">
        <a
          target="_blank"
          class="hover:text-fg hover:underline"
          href="https://github.com/MatteoGabriele/agentscan-text-action"
          title="Check every new PR and issue in your repo automatically"
          >GitHub Action</a
        >
        <a
          target="_blank"
          class="hover:text-fg hover:underline"
          href="https://github.com/unveil-project/interlinked"
          >Source</a
        >
      </nav>
    </form>
  </header>
</template>
