/** Where GitHub looks for a PR template, in order. */
const TEMPLATE_PATHS = [
	".github/pull_request_template.md",
	".github/PULL_REQUEST_TEMPLATE.md",
	"pull_request_template.md",
	"PULL_REQUEST_TEMPLATE.md",
	"docs/pull_request_template.md",
	"docs/PULL_REQUEST_TEMPLATE.md",
];

export interface PullRef {
	owner: string;
	repo: string;
	number: string;
}

export function parsePullUrl(url: string): PullRef | undefined {
	const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
	if (!match) {
		return undefined;
	}

	const [, owner, repo, number] = match;
	return { owner, repo, number };
}

export async function fetchBody({ owner, repo, number }: PullRef) {
	const response = await fetch(
		`https://api.github.com/repos/${owner}/${repo}/pulls/${number}`,
	);

	if (response.status === 403 || response.status === 429) {
		throw new Error("GitHub rate limit hit. Paste the description instead.");
	}

	if (!response.ok) {
		throw new Error(`GitHub API ${response.status}`);
	}

	return ((await response.json()).body as string | null) ?? "";
}

/** The repo's current PR template. `onTry` hears each path before it is checked. */
export async function fetchTemplate(
	{ owner, repo }: PullRef,
	onTry: (path: string) => void = () => {},
) {
	for (const path of TEMPLATE_PATHS) {
		onTry(path);
		const response = await fetch(
			`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${path}`,
		);

		if (response.ok) {
			return { path, text: await response.text() };
		}
	}

	return undefined;
}
