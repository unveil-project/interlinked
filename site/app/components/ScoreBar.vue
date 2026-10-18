<script setup lang="ts">
import { AUTOMATION_THRESHOLD } from '@unveil/interlinked'

defineProps<{
  /** The score, 0 to 100. 100 is human. Left out, the bar stays empty. */
  score?: number
  /** The fill's background class. */
  fill: string
}>()

const threshold = AUTOMATION_THRESHOLD
</script>

<template>
  <div>
    <div
      class="relative h-1.5 rounded-full bg-line"
      role="meter"
      aria-label="Score"
      :aria-valuenow="score"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div
        class="h-full rounded-full transition-[width] duration-300"
        :class="fill"
        :style="{ width: `${score ?? 0}%` }"
      />
      <span
        class="absolute -top-1 w-0.5 h-3.5 rounded-full bg-fg/60 -translate-x-1/2"
        :style="{ left: `${threshold}%` }"
      />
    </div>
    <div
      class="relative h-3.5 mt-1.5 font-mono text-10px leading-none text-muted"
      aria-hidden="true"
    >
      <span class="absolute left-0">0</span>
      <span
        class="absolute whitespace-nowrap -translate-x-1/2"
        :style="{ left: `${threshold}%` }"
      >
        below {{ threshold }} is automation
      </span>
      <span class="absolute right-0">100</span>
    </div>
  </div>
</template>
