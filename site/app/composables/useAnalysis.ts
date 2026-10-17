import { locateTemplate } from '@unveil/interlinked'

export type Label = 'ai' | 'human'

/** Where the text came from, and the label it should get if it is a fixture. */
export interface Source {
  name: string
  url?: string
  expected?: Label
}

/** Bumped by each fetch and by `reset`, so a stale fetch can tell it was superseded. */
let request = 0
let loadedUrl: string | undefined

/** The text being analyzed and where it came from, shared by every page. */
export function useAnalysis() {
  /** The link in the header field. */
  const url = useState('url', () => '')
  const markdown = useState('markdown', () => '')
  const template = useState('template', () => '')
  const loading = useState('loading', () => false)
  const error = useState('error', () => '')
  /** Per-request status of the last fetch. */
  const progress = useState<FetchProgress | undefined>(
    'progress',
    () => undefined,
  )
  const source = useState<Source | undefined>('source', () => undefined)

  /** The lines copied from the template, which don't count toward the score. */
  const templateLines = computed(() => {
    const found = new Set<number>()
    if (!template.value) {
      return found
    }
    for (const { start, end } of locateTemplate(
      markdown.value,
      template.value,
    )) {
      const first = markdown.value.slice(0, start).split('\n').length - 1
      const last =
        first + markdown.value.slice(start, end).split('\n').length - 1
      for (let i = first; i <= last; i++) {
        found.add(i)
      }
    }
    return found
  })

  /** Analyzes text given as is: pasted, or one of the examples. */
  function show(text: string, from?: Source) {
    request++
    url.value = ''
    error.value = ''
    progress.value = undefined
    source.value = from
    template.value = ''
    markdown.value = text
    loadedUrl = undefined
  }

  /** Fetches the text behind a GitHub link. Resolves whether it is now shown. */
  async function load(link: string) {
    link = /^https?:\/\//.test(link) ? link : `https://${link}`
    url.value = link
    error.value = ''
    const ref = parseGitHubUrl(link)
    if (!ref) {
      error.value = "That isn't a GitHub issue, pull request or comment link."
      return false
    }
    // Only fetch when the link changes.
    if (link === loadedUrl) {
      return true
    }
    const id = ++request
    loading.value = true
    progress.value = {
      body: 'loading',
      // Comments have no template.
      template: ref.commentId ? 'none' : 'loading',
      noun: noun(ref),
    }
    const steps = progress.value
    try {
      const [body, found] = await Promise.all([
        fetchBody(ref).then(
          (text) => {
            steps.body = 'done'
            return text
          },
          (e) => {
            steps.body = 'failed'
            throw e
          },
        ),
        fetchTemplate(ref, (path) => {
          steps.path = path
        }).then(
          (found) => {
            steps.template = found ? 'done' : 'none'
            return found
          },
          () => {
            steps.template = 'failed'
            return undefined
          },
        ),
      ])
      if (id !== request) {
        return false
      }
      markdown.value = body
      template.value = found?.text ?? ''
      source.value = { name: sourceName(ref), url: link }
      loadedUrl = link
      return true
    } catch (e) {
      if (id === request) {
        error.value = (e as Error).message
      }
      return false
    } finally {
      if (id === request) {
        loading.value = false
      }
    }
  }

  /** Drops the text and any fetch still in flight. */
  function reset() {
    request++
    url.value = ''
    markdown.value = ''
    template.value = ''
    error.value = ''
    progress.value = undefined
    source.value = undefined
    loading.value = false
    loadedUrl = undefined
  }

  return {
    url,
    markdown,
    template,
    loading,
    error,
    progress,
    source,
    templateLines,
    show,
    load,
    reset,
  }
}

/** The analysis page for a link, with the link as a readable query value. */
export function analyzePath(link: string) {
  // No scheme, slashes left as they are.
  const param = encodeURIComponent(link.replace(/^https?:\/\//, ''))
  return `/analyze?url=${param.replaceAll('%2F', '/')}`
}

function noun(ref: GitHubRef) {
  if (ref.commentId) {
    return 'comment'
  }
  return ref.type === 'pull' ? 'description' : 'issue'
}

function sourceName({ owner, repo, number, commentId }: GitHubRef) {
  const name = `${owner}/${repo}#${number}`
  return commentId ? `${name}, comment ${commentId}` : name
}
