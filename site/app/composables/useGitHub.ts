/** A GitHub issue, pull request or comment link, parsed. */
export function useGitHubLink(link: MaybeRefOrGetter<string>) {
  const href = computed(() => {
    const value = toValue(link).trim()
    if (!value) {
      return ''
    }
    return /^https?:\/\//.test(value) ? value : `https://${value}`
  })
  const github = computed(() => parseGitHubUrl(href.value))

  return { href, github }
}

/** The text of the issue, pull request or comment. */
export function useGitHubBody(github: Ref<GitHubRef | undefined>) {
  return useAsyncData(
    () => `github-body:${cacheKey(github.value)}`,
    async () => (github.value ? fetchBody(github.value) : null),
    { server: false, enabled: () => !!github.value },
  )
}

/** The repo's template for it, and the path being checked for one. */
export function useGitHubTemplate(github: Ref<GitHubRef | undefined>) {
  const path = useState<string | undefined>('github-template-path')

  const template = useAsyncData(
    () => `github-template:${cacheKey(github.value)}`,
    async () => {
      if (!github.value) {
        return null
      }
      const found = await fetchTemplate(github.value, (tried) => {
        path.value = tried
      })
      return found ?? null
    },
    { server: false, enabled: () => !!github.value },
  )

  return { ...template, path }
}

function cacheKey(github: GitHubRef | undefined) {
  if (!github) {
    return ''
  }
  const { owner, repo, type, number, commentId } = github
  return [owner, repo, type, number, commentId].join('/')
}
