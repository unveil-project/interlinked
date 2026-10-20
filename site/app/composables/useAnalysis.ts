import type { AsyncDataRequestStatus } from '#app'
import { locateTemplate } from '@unveil/interlinked'

export type Label = 'ai' | 'human'

/** Where the text came from, and the label it should get if it is a fixture. */
export interface Source {
  name: string
  url?: string
  expected?: Label
}

/** The text behind a GitHub link, or the pasted text when there is none. */
export function useAnalysis(link: MaybeRefOrGetter<string>) {
  const pasted = usePastedText()
  const { href, github } = useGitHubLink(link)
  const body = useGitHubBody(github)
  const repoTemplate = useGitHubTemplate(github)

  const markdown = computed(() => {
    return href.value ? (body.data.value ?? '') : (pasted.value?.markdown ?? '')
  })

  const source = computed(() => {
    if (!href.value) {
      return pasted.value?.source
    }

    return github.value && { name: sourceName(github.value), url: href.value }
  })

  // Idle counts too: on the server, the fetch is still to come.
  const loading = computed(() => {
    if (!github.value) {
      return false
    }

    return [body.status.value, repoTemplate.status.value].some(
      (status) => status === 'pending' || status === 'idle',
    )
  })

  const error = computed(() => {
    if (href.value && !github.value) {
      return "That isn't a GitHub issue, pull request or comment link."
    }

    return body.error.value?.message
  })

  /** Each step of the fetch, read from the status of its request. */
  const progress = computed<FetchProgress | undefined>(() => {
    if (!github.value) {
      return undefined
    }

    return {
      body: step(body.status.value, true),
      // Comments have no template.
      template: github.value.commentId
        ? undefined
        : step(repoTemplate.status.value, !!repoTemplate.data.value),
      path: repoTemplate.path.value,
      templateKind: github.value.type === 'pull' ? 'PR' : 'issue',
    }
  })

  // Editable, so a template can be added by hand.
  const template = ref('')
  watch(
    () => (href.value ? repoTemplate.data.value?.text : pasted.value?.template),
    (value) => {
      template.value = value ?? ''
    },
    { immediate: true },
  )

  /** Where the text copied from the template is, left out of the score. */
  const templateRanges = computed(() => {
    if (!template.value) {
      return []
    }

    return locateTemplate(markdown.value, template.value)
  })

  /**
   * The lines with nothing scored on them: template text and, besides it, only
   * blanks and HTML comments, which aren't scored either. A table row with a
   * filled-in answer isn't one, as the answer is scored.
   */
  const templateLines = computed(() => {
    const found = new Set<number>()
    const text = markdown.value
    const unscored = new Uint8Array(text.length)
    for (const { start, end } of templateRanges.value) {
      unscored.fill(1, start, end)
    }
    for (const comment of text.matchAll(/<!--[\s\S]*?-->/g)) {
      unscored.fill(1, comment.index, comment.index + comment[0].length)
    }

    let start = 0
    text.split('\n').forEach((line, i) => {
      const end = start + line.length
      const hasTemplate = templateRanges.value.some(
        (range) => range.start < end && range.end > start,
      )
      let scored = false
      for (let k = start; k < end; k++) {
        if (!unscored[k] && /\S/.test(text.charAt(k))) {
          scored = true
          break
        }
      }
      if (hasTemplate && !scored) {
        found.add(i)
      }
      start = end + 1
    })
    return found
  })

  /** Fetches the link again, or waits for the fetch already running. */
  async function refresh() {
    await Promise.all([
      body.refresh({ dedupe: 'defer' }),
      repoTemplate.refresh({ dedupe: 'defer' }),
    ])
  }

  return {
    markdown,
    template,
    loading,
    error,
    progress,
    source,
    templateRanges,
    templateLines,
    refresh,
  }
}

/** The analysis page for a link, with the link as a readable query value. */
export function analyzePath(link: string) {
  // No scheme, slashes left as they are.
  const param = encodeURIComponent(link.replace(/^https?:\/\//, ''))
  return `/analyze?url=${param.replaceAll('%2F', '/')}`
}

function step(status: AsyncDataRequestStatus, found: boolean): FetchStep {
  if (status === 'error') {
    return 'failed'
  }

  if (status === 'success') {
    return found ? 'done' : 'none'
  }

  return 'loading'
}

function sourceName({ owner, repo, number, commentId }: GitHubRef) {
  const name = `${owner}/${repo}#${number}`
  return commentId ? `${name}, comment ${commentId}` : name
}
