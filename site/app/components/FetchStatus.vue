<script setup lang="ts">
const props = defineProps<{
  progress: FetchProgress
  /** Where the text came from, once known. */
  name?: string
  /** The page the text came from, once known. */
  href?: string
  /** How many lines of the text came from the template. */
  skipped: number
}>()

const stepIcon: Record<FetchStep, string> = {
  loading:
    'border-1.5 border-line border-t-fg animate-spin animate-duration-700 motion-reduce:animate-duration-2000',
  done: 'bg-ok',
  none: 'border-1.5 border-muted',
  failed: 'bg-agent',
}

/** The template's kind, as GitHub calls it. */
const kind = computed(() =>
  props.progress.noun === 'description' ? 'PR' : props.progress.noun,
)

/** Whether a template exists isn't news; only show what it changed. */
const showTemplate = computed(() => {
  if (props.progress.template === 'none') {
    return false
  }
  if (props.progress.template === 'done') {
    return props.skipped > 0
  }
  return true
})
</script>

<template>
  <span
    class="flex items-center gap-2"
    :class="{ 'text-agent': progress.body === 'failed' }"
  >
    <span
      class="flex-none size-1.5 rounded-full"
      :class="stepIcon[progress.body]"
    />
    <a
      v-if="name && href"
      :href
      target="_blank"
      rel="noopener"
      class="hover:text-fg underline-offset-2 hover:underline"
      >{{ name }}</a
    >
    <template v-else>{{ name ?? progress.noun }}</template>
  </span>
  <span
    v-if="showTemplate"
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
        {{ skipped }} {{ skipped === 1 ? 'line' : 'lines' }} from the
        {{ kind }} template not scored
      </template>
      <template v-else>couldn't load the {{ kind }} template</template>
    </span>
  </span>
</template>
