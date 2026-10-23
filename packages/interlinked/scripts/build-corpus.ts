import { mkdirSync, readFileSync } from 'node:fs'
import {
  arg,
  buildUnlessExists,
  CORPUS_DIR,
  type CorpusEntry,
  readRepos,
  writeCorpus,
} from './corpus'
import {
  type Author,
  graphql,
  HUMAN_WINDOWS,
  isHumanAuthor,
  pool,
  token,
} from './github'

const HUMAN_PER_WINDOW = 8
const AI_PER_REPO = 20
const PRS_PER_QUERY = 50
const TELLS = new Set(['agent-attribution', 'ai-disclosure'])

type PrNode = {
  number: number
  body: string
  author: Author
} | null

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
    const prs = data.search.nodes
      .filter(
        (pr): pr is NonNullable<PrNode> =>
          !!pr?.body && isHumanAuthor(pr.author),
      )
      .slice(0, HUMAN_PER_WINDOW)
    for (const pr of prs) {
      entries.push({ label: 'human', repo, number: pr.number, body: pr.body })
    }
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
    const fields = numbers
      .slice(i, i + PRS_PER_QUERY)
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

/** PRs that disclosed an agent, per repo, from an interlinked results file. */
function readDisclosed(file: string) {
  const disclosed = new Map<string, number[]>()
  for (const r of JSON.parse(readFileSync(file, 'utf-8'))) {
    if (r.signals.some((s: { id: string }) => TELLS.has(s.id))) {
      const prs = disclosed.get(r.repo_name) ?? []
      if (prs.length < AI_PER_REPO && !prs.includes(r.pr)) {
        prs.push(r.pr)
      }
      disclosed.set(r.repo_name, prs)
    }
  }
  return disclosed
}

async function main() {
  const reposFile = arg('repos')
  const aiFrom = arg('ai-from')
  if (!reposFile || !aiFrom) {
    throw new Error(
      '--repos=<file> and --ai-from=<interlinked-results.json> are required',
    )
  }
  const repos = readRepos(reposFile)
  const disclosed = readDisclosed(aiFrom)

  mkdirSync(CORPUS_DIR, { recursive: true })
  const entries: CorpusEntry[] = []
  const templates: Record<string, string> = {}

  await pool([...new Set([...repos, ...disclosed.keys()])], async (repo) => {
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
  writeCorpus('entries.json', entries)
  writeCorpus('templates.json', templates)

  const count = (label: string) =>
    entries.filter((e) => e.label === label).length
  console.log(
    `\n${count('human')} human, ${count('ai')} ai, ${Object.keys(templates).length} templates`,
  )
}

buildUnlessExists('corpus/', main)
