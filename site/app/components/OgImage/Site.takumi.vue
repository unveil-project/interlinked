<script setup lang="ts">
const {
  score = 18,
  owner = '',
  repo = '',
  number = '',
  type = 'pull',
  comment = false,
} = defineProps<{
  /** The score shown on the meter, 0 to 100. 100 is human. */
  score?: number
  /** With `repo` and `number`, the shared link the image is for. */
  owner?: string
  repo?: string
  number?: string
  type?: 'pull' | 'issue'
  /** Whether the link points at a comment rather than the post itself. */
  comment?: boolean
}>()

const siteName = 'agentscan · text'
const site = useSiteConfig()
const host = site.url ? new URL(site.url).host : ''

const kind = type === 'pull' ? 'pull request' : 'issue'
const heading = comment
  ? `Comment on #${number}`
  : `${type === 'pull' ? 'Pull request' : 'Issue'} #${number}`
</script>

<template>
  <div
    class="h-full w-full flex flex-col justify-between bg-[#0d0f12] px-20 py-18 text-[#e6e8eb]"
    style="font-family: 'IBM Plex Sans'"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4 text-8 font-medium">
        <svg
          width="44"
          height="44"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          stroke-width="1"
        >
          <rect x="2" y="5" width="10" height="10" rx="2" />
          <rect x="8" y="5" width="10" height="10" rx="2" />
        </svg>
        {{ siteName }}
      </div>
      <div
        v-if="host"
        class="text-6.5 text-[#8a919b]"
        style="font-family: 'IBM Plex Mono'"
      >
        {{ host }}
      </div>
    </div>

    <template v-if="owner && repo && number">
      <div class="flex flex-col">
        <div class="flex items-center gap-5">
          <img
            :src="`https://github.com/${owner}.png?size=128`"
            width="64"
            height="64"
            class="rounded-full"
          />
          <div
            class="text-9 text-[#b4bac3] truncate"
            style="font-family: 'IBM Plex Mono'"
          >
            {{ owner }}/{{ repo }}
          </div>
        </div>
        <div
          class="mt-6 text-24 font-medium leading-none tracking-[-0.025em]"
          style="font-family: Satoshi"
        >
          {{ heading }}
        </div>
      </div>

      <div class="block text-8 leading-snug text-[#8a919b]">
        Check this {{ comment ? 'comment' : kind }} for signs of
        <span
          class="mx-[0.25em] px-[0.1em] text-[#e6e8eb] bg-[#f0883e]/22"
          style="
            font-family: 'IBM Plex Mono';
            border-bottom: 0.07em solid #f0883e;
          "
          >AI-written</span
        >
        text
      </div>
    </template>

    <template v-else>
      <div
        class="block text-19 font-medium leading-[1.1] tracking-[-0.025em]"
        style="font-family: Satoshi"
      >
        Find signs of
        <span
          class="mx-[0.25em] px-[0.1em] text-[0.86em] font-medium tracking-normal bg-[#f0883e]/22"
          style="
            font-family: 'IBM Plex Mono';
            border-bottom: 0.07em solid #f0883e;
          "
          >AI-written</span
        >
        text in open source contributions
      </div>

      <div class="flex items-end justify-between gap-12">
        <div class="flex flex-col text-7 leading-snug text-[#8a919b]">
          <span>Pull requests, issues and comments,</span>
          <span>checked against a human baseline.</span>
        </div>
        <div class="flex flex-col w-80" style="font-family: 'IBM Plex Mono'">
          <div class="flex justify-between text-5.5 text-[#8a919b]">
            <span>Score</span>
            <span class="text-[#f0883e]">{{ score }}</span>
          </div>
          <div class="flex mt-3 h-2.5 rounded-full bg-[#262a30]">
            <div
              class="h-full rounded-full bg-[#f0883e]"
              :style="{ width: `${score}%` }"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
