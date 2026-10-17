<script setup lang="ts">
defineProps<{
  progress: FetchProgress
  /** Where the text came from, once known. */
  name?: string
}>()

const stepIcon: Record<FetchStep, string> = {
  loading:
    'border-1.5 border-line border-t-fg animate-spin animate-duration-700 motion-reduce:animate-duration-2000',
  done: 'bg-ok',
  none: 'border-1.5 border-muted',
  failed: 'bg-agent',
}
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
    {{ name ?? progress.noun }}
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
