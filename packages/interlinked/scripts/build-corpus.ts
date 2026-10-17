import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  type Author,
  graphql,
  HUMAN_WINDOWS,
  isHumanAuthor,
  pool,
  token,
} from './github'

export interface CorpusEntry {
  label: 'ai' | 'human'
  /** What the text is. Missing means "pr", from before issues were collected. */
  kind?: 'pr' | 'issue' | 'comment'
  repo: string
  /** The PR or issue number. A comment has its issue's. */
  number: number
  body: string
  /** The author's login. */
  author?: string
  url?: string
  /**
   * Where an agent label comes from. Missing means an attribution line or
   * disclosure in the text; "agent-account" means a verified agent account
   * wrote it, disclosed or not.
   */
  source?: 'agent-account'
}

const CORPUS_DIR = join(import.meta.dirname, '..', 'corpus')
const HUMAN_PER_WINDOW = 8
const AI_PER_REPO = 20
const PRS_PER_QUERY = 50
const TELLS = new Set(['agent-attribution', 'ai-disclosure'])

async function fetchTemplate(repo: string): Promise<string | undefined> {
  const headers = { authorization: `bearer ${token}` }
  const res = await fetch(
    `https://api.github.com/repos/${repo}/community/profile`,
    { headers },
  )
  if (!res.ok) {
    return undefined
  }
  const profile = (await res.json()) as {
    files?: { pull_request_template?: { url: string } | null }
  }
  const url = profile.files?.pull_request_template?.url
  if (!url) {
    return undefined
  }
  const raw = await fetch(url, {
    headers: { ...headers, accept: 'application/vnd.github.raw+json' },
  })
  return raw.ok ? raw.text() : undefined
}

type PrNode = {
  number: number
  body: string
  author: Author
} | null

async function fetchHuman(repo: string): Promise<CorpusEntry[]> {
  const entries: CorpusEntry[] = []
  for (const window of HUMAN_WINDOWS) {
    const data = await graphql<{ search: { nodes: PrNode[] } }>(
      `query ($q: String!) {
				search(query: $q, type: ISSUE, first: ${HUMAN_PER_WINDOW * 2}) {
					nodes { ... on PullRequest { number body author { __typename login } } }
				}
			}`,
      { q: `repo:${repo} is:pr created:${window} sort:created-desc` },
    )
    entries.push(
      ...data.search.nodes
        .filter(
          (pr): pr is NonNullable<PrNode> =>
            !!pr?.body && isHumanAuthor(pr.author),
        )
        .slice(0, HUMAN_PER_WINDOW)
        .map((pr) => ({
          label: 'human' as const,
          repo,
          number: pr.number,
          body: pr.body,
        })),
    )
  }
  return entries
}

async function fetchAi(
  repo: string,
  numbers: number[],
): Promise<CorpusEntry[]> {
  const [owner, name] = repo.split('/')
  const entries: CorpusEntry[] = []
  for (let i = 0; i < numbers.length; i += PRS_PER_QUERY) {
    const chunk = numbers.slice(i, i + PRS_PER_QUERY)
    const fields = chunk
      .map(
        (n) =>
          `pr${n}: pullRequest(number: ${n}) { number body author { __typename login } }`,
      )
      .join('\n')
    const data = await graphql<{ repository: Record<string, PrNode> }>(
      `query ($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { ${fields} } }`,
      { owner, name },
    )
    for (const pr of Object.values(data.repository ?? {})) {
      if (pr?.body && pr.author?.__typename !== 'Bot') {
        entries.push({ label: 'ai', repo, number: pr.number, body: pr.body })
      }
    }
  }
  return entries
}

async function main() {
  const arg = (name: string) =>
    process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]
  const reposFile = arg('repos')
  const aiFrom = arg('ai-from')
  if (!reposFile || !aiFrom) {
    throw new Error(
      '--repos=<file> and --ai-from=<interlinked-results.json> are required',
    )
  }

  const repos = [
    ...new Set(
      readFileSync(reposFile, 'utf-8').match(/(?<=")[\w.-]+\/[\w.-]+(?=")/g) ??
        [],
    ),
  ]

  // Disclosed agent PRs, capped per repo.
  const disclosed = new Map<string, number[]>()
  for (const r of JSON.parse(readFileSync(aiFrom, 'utf-8'))) {
    if (r.signals.some((s: { id: string }) => TELLS.has(s.id))) {
      const list = disclosed.get(r.repo_name) ?? []
      if (list.length < AI_PER_REPO && !list.includes(r.pr)) {
        list.push(r.pr)
      }
      disclosed.set(r.repo_name, list)
    }
  }

  mkdirSync(CORPUS_DIR, { recursive: true })
  const entries: CorpusEntry[] = []
  const templates: Record<string, string> = {}
  const allRepos = [...new Set([...repos, ...disclosed.keys()])]

  await pool(allRepos, async (repo) => {
    const [template, human, ai] = await Promise.all([
      fetchTemplate(repo),
      repos.includes(repo) ? fetchHuman(repo) : [],
      fetchAi(repo, disclosed.get(repo) ?? []),
    ])
    if (template) {
      templates[repo] = template
    }
    entries.push(...human, ...ai)
    console.log(`${repo}: ${human.length} human, ${ai.length} ai`)
  })

  entries.sort((a, b) => a.repo.localeCompare(b.repo) || a.number - b.number)
  writeFileSync(
    join(CORPUS_DIR, 'entries.json'),
    `${JSON.stringify(entries)}\n`,
  )
  writeFileSync(
    join(CORPUS_DIR, 'templates.json'),
    `${JSON.stringify(templates)}\n`,
  )

  const count = (label: string) =>
    entries.filter((e) => e.label === label).length
  console.log(
    `\n${count('human')} human, ${count('ai')} ai, ${Object.keys(templates).length} templates`,
  )
}

if (!existsSync(CORPUS_DIR) || process.argv.includes('--force')) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
} else {
  console.log('corpus/ exists; pass --force to rebuild')
}
