const CONCURRENCY = 6

/** Before ChatGPT and agent tooling. */
export const HUMAN_WINDOWS = [
  '2021-03-01..2021-08-31',
  '2022-01-01..2022-08-31',
]
/** ChatGPT's release. Human text must be older. */
export const HUMAN_BEFORE = '2022-11-30'

export const token = process.env.GITHUB_TOKEN ?? process.env.NUXT_GITHUB_TOKEN
if (!token) {
  throw new Error('GITHUB_TOKEN is not set')
}

export async function graphql<T>(
  query: string,
  variables: object = {},
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { authorization: `bearer ${token}` },
      body: JSON.stringify({ query, variables }),
    })
    const json = (await res.json()) as { data?: T; errors?: unknown }
    // A deleted PR errors, but the rest of the data still comes back.
    if (json.data) {
      return json.data
    }
    if (attempt >= 2) {
      throw new Error(`${res.status} ${JSON.stringify(json.errors)}`)
    }
    await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)))
  }
}

export async function pool<T>(items: T[], run: (item: T) => Promise<void>) {
  const queue = [...items]
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
        try {
          await run(item)
        } catch (error) {
          console.warn(
            `  skipped ${JSON.stringify(item)}: ${(error as Error).message}`,
          )
        }
      }
    }),
  )
}

export type Author = { __typename: string; login: string } | null

export function isHumanAuthor(author: Author) {
  return author?.__typename === 'User' && !/bot\b/i.test(author.login)
}

/** Most letters are Latin. The human corpus is English, so other scripts would read as a tell. */
export function isLatin(text: string) {
  const letters = text.match(/\p{L}/gu)?.length ?? 0
  const latin = text.match(/\p{Script=Latin}/gu)?.length ?? 0
  return letters > 0 && latin / letters >= 0.9
}
