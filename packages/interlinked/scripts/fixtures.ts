import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export const FIXTURES_DIR = join(import.meta.dirname, '..', 'tests', 'fixtures')

export type Label = 'ai' | 'human'

export interface Fixture {
  label: Label
  /** The file name without `.md`. */
  name: string
  body: string
  template?: string
}

function readIfExists(path: string) {
  return existsSync(path) ? readFileSync(path, 'utf-8') : undefined
}

/** Hand-labelled texts, each with its `.template.md` if any. */
export function readFixtures(): Fixture[] {
  return (['ai', 'human'] as const).flatMap((label) => {
    const dir = join(FIXTURES_DIR, label)
    if (!existsSync(dir)) {
      return []
    }
    return readdirSync(dir)
      .filter((file) => file.endsWith('.md') && !file.endsWith('.template.md'))
      .sort()
      .map((file) => {
        const name = file.replace(/\.md$/, '')
        return {
          label,
          name,
          body: readFileSync(join(dir, file), 'utf-8'),
          template: readIfExists(join(dir, `${name}.template.md`)),
        }
      })
  })
}
