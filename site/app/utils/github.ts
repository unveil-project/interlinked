import { issueFormLines } from '@unveil/interlinked'

/** Where GitHub looks for a PR template, in order. */
const PR_TEMPLATE_PATHS = [
  '.github/pull_request_template.md',
  '.github/PULL_REQUEST_TEMPLATE.md',
  'pull_request_template.md',
  'PULL_REQUEST_TEMPLATE.md',
  'docs/pull_request_template.md',
  'docs/PULL_REQUEST_TEMPLATE.md',
]

/** Single-file issue templates, for repos without an `ISSUE_TEMPLATE/` folder. */
const ISSUE_TEMPLATE_PATHS = [
  '.github/ISSUE_TEMPLATE.md',
  'ISSUE_TEMPLATE.md',
  'docs/ISSUE_TEMPLATE.md',
]

export interface GitHubRef {
  owner: string | undefined
  repo: string | undefined
  number: string | undefined
  type: 'pull' | 'issue'
  /** Set when the link points at a comment (`#issuecomment-<id>`). */
  commentId?: string
}

export function parseGitHubUrl(url: string): GitHubRef | undefined {
  const match = url.match(
    /github\.com\/([^/]+)\/([^/]+)\/(pull|issues)\/(\d+)[^#]*(?:#issuecomment-(\d+))?/,
  )
  if (!match) {
    return undefined
  }

  const [, owner, repo, kind, number, commentId] = match
  return {
    owner,
    repo,
    number,
    type: kind === 'pull' ? 'pull' : 'issue',
    commentId,
  }
}

async function api<T = unknown>(path: string) {
  return $fetch<T>(`https://api.github.com/repos/${path}`).catch(
    (e: { status?: number }) => {
      if (e.status === 403 || e.status === 429) {
        throw new Error('GitHub rate limit hit. Paste the text instead.')
      }
      throw e.status ? new Error(`GitHub API ${e.status}`) : e
    },
  )
}

/** The comment's text if the link has one, otherwise the PR description or issue body. */
export async function fetchBody({ owner, repo, number, commentId }: GitHubRef) {
  const url: string = commentId
    ? `${owner}/${repo}/issues/comments/${commentId}`
    : `${owner}/${repo}/issues/${number}`

  const { body } = await api<{ body: string | null }>(url)
  return body ?? ''
}

async function raw({ owner, repo }: GitHubRef, path: string) {
  return $fetch<string>(
    `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${path}`,
    { responseType: 'text' },
  ).catch(() => undefined)
}

/** Markdown as is, and YAML issue forms as the lines they leave in an issue. */
function templateText(path: string, text: string) {
  return /\.ya?ml$/i.test(path) ? issueFormLines(text).join('\n') : text
}

/** The repo's issue templates, from `.github/ISSUE_TEMPLATE/` or a single file. */
async function fetchIssueTemplate(
  ref: GitHubRef,
  onTry: (path: string) => void,
) {
  const folder = '.github/ISSUE_TEMPLATE'

  onTry(`${folder}/`)

  const files = await api(`${ref.owner}/${ref.repo}/contents/${folder}`).catch(
    () => [],
  )

  const names = (Array.isArray(files) ? files : [])
    .map((file: { name: string }) => file.name)
    .filter(
      (name: string) =>
        /\.(?:md|ya?ml)$/i.test(name) && !/^config\.ya?ml$/i.test(name),
    )

  const texts = await Promise.all(
    names.map(async (name: string) => {
      const text = await raw(ref, `${folder}/${name}`)
      return text && templateText(name, text)
    }),
  )

  const found = texts.filter((text): text is string => !!text)
  if (found.length > 0) {
    return {
      path: `${folder}/ (${found.length} file${found.length > 1 ? 's' : ''})`,
      text: found.join('\n\n'),
    }
  }

  for (const path of ISSUE_TEMPLATE_PATHS) {
    onTry(path)

    const text = await raw(ref, path)

    if (text) {
      return { path, text }
    }
  }

  return undefined
}

/**
 * The repo's current PR or issue template. Comments have none. `onTry` hears
 * each path before it is checked.
 */
export async function fetchTemplate(
  ref: GitHubRef,
  onTry: (path: string) => void = () => {},
) {
  if (ref.commentId) {
    return undefined
  }

  if (ref.type === 'issue') {
    return fetchIssueTemplate(ref, onTry)
  }

  for (const path of PR_TEMPLATE_PATHS) {
    onTry(path)
    const text = await raw(ref, path)

    if (text) {
      return { path, text }
    }
  }

  return undefined
}

export type FetchStep = 'loading' | 'done' | 'none' | 'failed'

/** Per-request status of a fetch. `path` is the template path being checked, or the one found. */
export interface FetchProgress {
  body: FetchStep
  /** None for comments, which have no template. */
  template?: FetchStep
  path?: string
  /** The kind of template, as GitHub calls it. */
  templateKind: 'PR' | 'issue'
}
