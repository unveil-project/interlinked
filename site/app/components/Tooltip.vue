<script setup lang="ts">
const { position = 'top', align = 'center' } = defineProps<{
  label: string
  position?: 'top' | 'bottom'
  /** `end` lines it up with the right edge, for things at the edge of the page. */
  align?: 'center' | 'end'
}>()

const positionClasses = computed(() => {
  if (position === 'top') {
    return 'bottom-full mb-1.5'
  }

  return 'top-full mt-1.5'
})

const alignClasses = computed(() => {
  if (align === 'end') {
    return 'right-0'
  }

  return 'left-1/2 -translate-x-1/2'
})
</script>

<template>
  <span class="relative inline-flex group/tooltip">
    <slot />

    <span
      v-if="label"
      role="tooltip"
      class="absolute z-20 pointer-events-none whitespace-nowrap rounded-md border border-line bg-panel px-2 py-1 font-sans text-11px leading-normal text-fg shadow-[0_4px_12px_rgb(0_0_0/0.08)] opacity-0 transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100"
      :class="[positionClasses, alignClasses]"
    >
      {{ label }}
    </span>
  </span>
</template>
