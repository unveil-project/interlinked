<script setup lang="ts">
const route = useRoute()
/** The interlinked release doing the analysis, since scores change between them. */
const { interlinkedVersion } = useRuntimeConfig().public
</script>

<template>
  <div class="flex flex-col min-h-dvh bg-panel">
    <h1 class="sr-only">
      Check a pull request, issue or comment for signs of AI-written text
    </h1>

    <MainHeader />

    <NuxtPage />

    <footer
      class="px-4 text-12px text-muted"
      :class="
        route.path === '/'
          ? 'pb-6 sm:px-6'
          : 'py-3 border-t border-line sm:px-5'
      "
    >
      <div
        class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1"
        :class="{ 'mx-auto max-w-180': route.path === '/' }"
      >
        <p>
          <span>interlinked v{{ interlinkedVersion }}</span>
          <span class="mx-1.5" aria-hidden="true">·</span>
          An experimental
          <a
            target="_blank"
            rel="noopener"
            class="underline underline-offset-2 hover:text-fg"
            href="https://github.com/unveil-project/interlinked"
            >open source</a
          >
          project made with love.
        </p>
        <p>
          Also check out
          <a
            class="underline underline-offset-2 hover:text-fg"
            href="https://agentscan.tools"
            title="Check GitHub accounts for signs of automation"
            >AgentScan</a
          >
        </p>
      </div>
    </footer>
  </div>
</template>
