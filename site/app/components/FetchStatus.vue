<script setup lang="ts">
const props = defineProps<{
  progress: FetchProgress
  /** Where the text came from, once known. */
  name?: string
  /** The page the text came from, once known. */
  href?: string
  /** How many lines of the text came from the template. */
  skipped: number
  /** Whether the template is shown. */
  expanded: boolean
}>()

defineEmits<{ toggle: [] }>()

const stepIcon: Record<FetchStep, string> = {
  loading:
    'border-1.5 border-line border-t-fg animate-spin animate-duration-700 motion-reduce:animate-duration-2000',
  done: 'bg-ok',
  none: 'border-1.5 border-muted',
  failed: 'bg-error',
}

/** What the template did to the score, so it's clear templates are looked for at all. */
const templateText = computed(() => {
  const kind = props.progress.templateKind
  switch (props.progress.template) {
    case 'loading':
      return `checking ${props.progress.path}…`
    case 'done':
      return props.skipped > 0
        ? `${props.skipped} ${props.skipped === 1 ? 'line' : 'lines'} from the ${kind} template left out of the score`
        : `${kind} template found, none of it in this text`
    case 'none':
      return `no ${kind} template found, every line scored`
    default:
      return `couldn't load the ${kind} template, every line scored`
  }
})
</script>

<template>
  <span
    class="flex items-center gap-2"
    :class="{ 'text-error': progress.body === 'failed' }"
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
    <template v-else>{{ name }}</template>
  </span>
  <span
    v-if="progress.template"
    class="flex items-center gap-2 min-w-0"
    :class="{ 'text-error': progress.template === 'failed' }"
  >
    <span
      class="flex-none size-1.5 rounded-full"
      :class="stepIcon[progress.template]"
    />
    <span v-if="progress.template === 'loading'" class="truncate">
      {{ templateText }}
    </span>
    <!-- Opens the template, to see what was left out or add one by hand. -->
    <button
      v-else
      type="button"
      class="truncate hover:text-fg"
      :aria-expanded="expanded"
      aria-controls="template-field"
      @click="$emit('toggle')"
    >
      {{ templateText }}
    </button>
  </span>
</template>
