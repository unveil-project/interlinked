import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CorpusEntry } from './build-corpus'
import { graphql, isLatin, token } from './github'

/**
 * Builds `corpus/policy.json`: recent human text, from the members of projects
 * that ban LLM-written contributions.
 *
 * The rest of the human corpus predates ChatGPT, so on its own it teaches the
 * model the era as much as the author: careful, structured writing from today
 * reads as agent-written. Only org members count, since outside contributors
 * don't all follow the policy, and members are the ones enforcing it.
 *
 * The projects come from `policy-projects.json`, or `--projects=<file>`. A
 * `holdout` project is never fitted on, only reported, so its false-positive
 * rate is an honest estimate for recent human text.
 */

const CORPUS_DIR = join(import.meta.dirname, '..', 'corpus')
const PROJECTS_FILE = join(import.meta.dirname, 'policy-projects.json')
/** Per author and kind, so the most prolific members don't dominate. */
const PER_AUTHOR = 120
const FORGEJO_PAGE = 50
const GITHUB_PAGE = 100
/** GitHub's REST listings end at page 300. */
const GITHUB_MAX_PAGES = 300

/** A project that bans LLM-written contributions. */
interface Project {
  forge: 'forgejo' | 'github'
  /** API root for Forgejo. */
  host?: string
  repo: string
  /** The org whose members' text counts. */
  org: string
  /** Where the policy is written down. */
  policy: string
  /** Texts older than this may predate the policy. */
  since: string
  /** Only reported, never fitted on. */
  holdout?: boolean
}

export interface PolicyEntry extends CorpusEntry {
  createdAt: string
  holdout?: boolean
}

/** A repo's PR template and issue templates, as `fit-weights` takes them. */
export interface PolicyTemplates {
  pr?: string
  issues: string[]
}

interface Text {
  kind: 'pr' | 'issue' | 'comment'
  number: number
  body: string
  author: string
  url: string
  createdAt: string
}

class NotFound extends Error {}

/**
 * The body of a GET, retrying dropped connections and server errors. A missing
 * resource throws `NotFound` right away.
 */
async function get(url: string, headers: Record<string, string> = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { headers })
      if (res.status === 404) {
        throw new NotFound(url)
      }
      if (res.ok) {
        return await res.text()
      }
      throw new Error(`${res.status} ${url}`)
    } catch (error) {
      if (error instanceof NotFound || attempt >= 4) {
        throw error
      }
      await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)))
    }
  }
}

async function json<T>(url: string, headers: Record<string, string> = {}) {
  return JSON.parse(await get(url, headers)) as T
}

/** A file's text, or undefined when it doesn't exist. */
async function text(url: string, headers: Record<string, string> = {}) {
  return get(url, headers).catch((error) => {
    if (error instanceof NotFound) {
      return undefined
    }
    throw error
  })
}

/** Every page of a list endpoint, until one comes back short. */
async function* pages<T>(url: (page: number) => string, size: number) {
  for (let page = 1; ; page++) {
    const items = await json<T[]>(url(page))
    yield* items
    if (items.length < size) {
      return
    }
  }
}

type ForgejoUser = { login: string }
type ForgejoIssue = {
  number: number
  body: string | null
  html_url: string
  created_at: string
  user: ForgejoUser | null
  pull_request: unknown
}
type ForgejoComment = {
  body: string | null
  html_url: string
  issue_url: string
  created_at: string
  user: ForgejoUser | null
}
type ForgejoFile = { name: string; type: string; download_url: string }

async function fetchForgejo(project: Project) {
  const api = `${project.host}/repos/${project.repo}`
  const members = new Set(
    (
      await json<ForgejoUser[]>(
        `${project.host}/orgs/${project.org}/public_members?limit=${FORGEJO_PAGE}`,
      )
    ).map((u) => u.login),
  )

  const texts: Text[] = []
  for (const type of ['pulls', 'issues'] as const) {
    for await (const issue of pages<ForgejoIssue>(
      (page) =>
        `${api}/issues?state=all&type=${type}&since=${project.since}T00:00:00Z&limit=${FORGEJO_PAGE}&page=${page}`,
      FORGEJO_PAGE,
    )) {
      texts.push({
        kind: type === 'pulls' ? 'pr' : 'issue',
        number: issue.number,
        body: issue.body ?? '',
        author: issue.user?.login ?? '',
        url: issue.html_url,
        createdAt: issue.created_at,
      })
    }
  }
  for await (const comment of pages<ForgejoComment>(
    (page) =>
      `${api}/issues/comments?since=${project.since}T00:00:00Z&limit=${FORGEJO_PAGE}&page=${page}`,
    FORGEJO_PAGE,
  )) {
    texts.push({
      kind: 'comment',
      number: Number(comment.issue_url.match(/(\d+)$/)?.[1] ?? 0),
      body: comment.body ?? '',
      author: comment.user?.login ?? '',
      url: comment.html_url,
      createdAt: comment.created_at,
    })
  }

  const templates: PolicyTemplates = { issues: [] }
  for (const dir of ['.forgejo', '.gitea', '.github']) {
    const files =
      (await text(`${api}/contents/${dir}/ISSUE_TEMPLATE`).then(
        (body) => body && (JSON.parse(body) as ForgejoFile[]),
      )) || []
    for (const file of files) {
      if (/\.(?:md|ya?ml)$/i.test(file.name) && !/^config\./i.test(file.name)) {
        const body = await text(file.download_url)
        if (body) {
          templates.issues.push(body)
        }
      }
    }
    templates.pr ??= await text(`${api}/raw/${dir}/PULL_REQUEST_TEMPLATE.md`)
  }
  return { members, texts, templates }
}

type GithubUser = { login: string; type: string }
type GithubComment = {
  body: string | null
  html_url: string
  issue_url: string
  created_at: string
  updated_at: string
  user: GithubUser | null
}
type SearchNode = {
  __typename: 'PullRequest' | 'Issue'
  number: number
  body: string
  url: string
  createdAt: string
  author: { login: string } | null
} | null

async function fetchGithub(project: Project) {
  const api = `https://api.github.com/repos/${project.repo}`
  const headers = { authorization: `bearer ${token}` }
  const rest = <T>(url: string) => json<T>(url, headers)
  const members = new Set<string>()
  for (let page = 1; ; page++) {
    const users = await rest<GithubUser[]>(
      `https://api.github.com/orgs/${project.org}/members?per_page=${GITHUB_PAGE}&page=${page}`,
    )
    for (const user of users) {
      if (user.type === 'User' && !/bot\b/i.test(user.login)) {
        members.add(user.login)
      }
    }
    if (users.length < GITHUB_PAGE) {
      break
    }
  }

  const texts: Text[] = []
  for (const login of members) {
    let after: string | null = null
    do {
      const data: {
        search: {
          nodes: SearchNode[]
          pageInfo: { hasNextPage: boolean; endCursor: string }
        }
      } = await graphql(
        `
          query ($q: String!, $after: String) {
            search(query: $q, type: ISSUE, first: 100, after: $after) {
              nodes {
                __typename
                ... on PullRequest {
                  number
                  body
                  url
                  createdAt
                  author {
                    login
                  }
                }
                ... on Issue {
                  number
                  body
                  url
                  createdAt
                  author {
                    login
                  }
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        `,
        {
          q: `repo:${project.repo} author:${login} created:>=${project.since}`,
          after,
        },
      )
      for (const node of data.search.nodes) {
        if (node) {
          texts.push({
            kind: node.__typename === 'PullRequest' ? 'pr' : 'issue',
            number: node.number,
            body: node.body,
            author: node.author?.login ?? '',
            url: node.url,
            createdAt: node.createdAt,
          })
        }
      }
      after = data.search.pageInfo.hasNextPage
        ? data.search.pageInfo.endCursor
        : null
    } while (after)
  }
  // A listing stops at page 300, so each run of pages starts where the last
  // one's updates ended.
  const seen = new Set<string>()
  let since = `${project.since}T00:00:00Z`
  for (let done = false; !done;) {
    for (let page = 1; page <= GITHUB_MAX_PAGES; page++) {
      const comments = await rest<GithubComment[]>(
        `${api}/issues/comments?since=${since}&sort=updated&direction=asc&per_page=${GITHUB_PAGE}&page=${page}`,
      )
      for (const comment of comments) {
        if (seen.has(comment.html_url)) {
          continue
        }
        seen.add(comment.html_url)
        texts.push({
          kind: 'comment',
          number: Number(comment.issue_url.match(/(\d+)$/)?.[1] ?? 0),
          body: comment.body ?? '',
          author: comment.user?.login ?? '',
          url: comment.html_url,
          createdAt: comment.created_at,
        })
      }
      if (comments.length < GITHUB_PAGE) {
        done = true
        break
      }
      if (page === GITHUB_MAX_PAGES) {
        since = comments[comments.length - 1].updated_at
      }
    }
  }

  const raw = { ...headers, accept: 'application/vnd.github.raw+json' }
  const templates: PolicyTemplates = { issues: [] }
  const files =
    (await text(`${api}/contents/.github/ISSUE_TEMPLATE`, headers).then(
      (body) => body && (JSON.parse(body) as { name: string; path: string }[]),
    )) || []
  for (const file of files) {
    if (/\.(?:md|ya?ml)$/i.test(file.name) && !/^config\./i.test(file.name)) {
      const body = await text(`${api}/contents/${file.path}`, raw)
      if (body) {
        templates.issues.push(body)
      }
    }
  }
  templates.pr = await text(
    `${api}/contents/.github/PULL_REQUEST_TEMPLATE.md`,
    raw,
  )
  return { members, texts, templates }
}

async function main() {
  const file =
    process.argv.find((a) => a.startsWith('--projects='))?.split('=')[1] ??
    PROJECTS_FILE
  const projects: Project[] = JSON.parse(readFileSync(file, 'utf-8'))
  const entries: PolicyEntry[] = []
  const templates: Record<string, PolicyTemplates> = {}
  for (const project of projects) {
    const fetched =
      project.forge === 'forgejo'
        ? await fetchForgejo(project)
        : await fetchGithub(project)
    templates[project.repo] = fetched.templates

    const seen = new Set<string>()
    const counts = new Map<string, number>()
    let kept = 0
    for (const t of fetched.texts.sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    )) {
      const body = t.body.trim()
      const key = `${t.kind} ${t.author}`
      const count = counts.get(key) ?? 0
      if (
        !fetched.members.has(t.author) ||
        t.createdAt < project.since ||
        !body ||
        !isLatin(body) ||
        seen.has(body) ||
        count >= PER_AUTHOR
      ) {
        continue
      }
      seen.add(body)
      counts.set(key, count + 1)
      kept++
      entries.push({
        label: 'human',
        kind: t.kind,
        repo: project.repo,
        number: t.number,
        body: t.body,
        author: t.author,
        url: t.url,
        createdAt: t.createdAt,
        ...(project.holdout && { holdout: true }),
      })
    }
    const authors = new Set(
      entries.filter((e) => e.repo === project.repo).map((e) => e.author),
    )
    console.log(
      `${project.repo}${project.holdout ? ' (holdout)' : ''}: ${kept} texts by ${authors.size} of ${fetched.members.size} members, from ${fetched.texts.length}; ${fetched.templates.issues.length} issue templates${fetched.templates.pr ? ', PR template' : ''}`,
    )
  }

  writeFileSync(join(CORPUS_DIR, 'policy.json'), `${JSON.stringify(entries)}\n`)
  writeFileSync(
    join(CORPUS_DIR, 'policy-templates.json'),
    `${JSON.stringify(templates)}\n`,
  )
}

if (
  !existsSync(join(CORPUS_DIR, 'policy.json')) ||
  process.argv.includes('--force')
) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
} else {
  console.log('corpus/policy.json exists; pass --force to rebuild')
}
