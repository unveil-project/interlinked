import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
export const CORPUS_DIR = join(ROOT, 'corpus')

export interface CorpusEntry {
  label: 'ai' | 'human'
  /** Missing means "pr", from before issues were collected. */
  kind?: 'pr' | 'issue' | 'comment'
  repo: string
  /** The PR or issue number. A comment has its issue's. */
  number: number
  body: string
  author?: string
  url?: string
  /** By a known agent account, so labelled ai even without a disclosure. */
  fromAgentAccount?: boolean
}

/** Human text by a member of a project that bans LLM-written contributions. */
export interface PolicyEntry extends CorpusEntry {
  createdAt: string
  /** Only reported, never fitted on. */
  holdout?: boolean
}

export interface PolicyTemplates {
  pr?: string
  issues: string[]
}

export function readCorpus<T>(file: string, fallback: T): T {
  const path = join(CORPUS_DIR, file)
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf-8')) : fallback
}

export function writeCorpus(file: string, data: unknown) {
  writeFileSync(join(CORPUS_DIR, file), `${JSON.stringify(data)}\n`)
}

/** The value of a `--name=value` argument. */
export function arg(name: string) {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]
}

/** Every quoted `owner/name` in a file. */
export function readRepos(file: string) {
  const repos = readFileSync(file, 'utf-8').match(
    /(?<=")[\w.-]+\/[\w.-]+(?=")/g,
  )
  return [...new Set(repos ?? [])]
}

/** Runs `main` unless `output` exists, or `--force` is passed. */
export function buildUnlessExists(output: string, main: () => Promise<void>) {
  if (existsSync(join(ROOT, output)) && !process.argv.includes('--force')) {
    console.log(`${output} exists; pass --force to rebuild`)
    return
  }
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
