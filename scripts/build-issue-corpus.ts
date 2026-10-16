import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SIGNALS } from "../src/signals";
import type { CorpusEntry } from "./build-corpus";
import {
	type Author,
	graphql,
	HUMAN_BEFORE,
	HUMAN_WINDOWS,
	isHumanAuthor,
	isLatin,
	pool,
} from "./github";

/**
 * Builds `corpus/issues.json`: issues and comments, alongside the PRs in
 * `corpus/entries.json`.
 *
 * Human text comes from the PR corpus's human repos, before ChatGPT: issues,
 * and comments on both issues and PRs. Agent text comes from two places:
 * anything carrying an agent's attribution line, capped per repo so a few busy
 * agent repos don't dominate, and what AgentScan's verified agent accounts
 * wrote, which mostly carries no attribution at all.
 */

const CORPUS_DIR = join(import.meta.dirname, "..", "corpus");
const ISSUES_PER_WINDOW = 6;
const HUMAN_COMMENTS_PER_ISSUE = 2;
const AI_PER_REPO = 4;
/** Per account and kind, so the most prolific agents don't dominate. */
const AGENT_PER_AUTHOR = 30;
/**
 * Agent accounts also post one-liners (`/claim #12`, "thanks!") that may be
 * typed by their operator, and carry no style either way.
 */
const MIN_AGENT_LENGTH = 150;
/** Older text from an agent account may predate its automation. */
const AGENT_SINCE = "2025-06-01";
const VERIFIED_AGENTS_URL =
	"https://raw.githubusercontent.com/MatteoGabriele/agentscan/main/data/verified-automations-list.json";
const TEMPLATE_REPOS_PER_QUERY = 20;
/** Search phrases for attribution lines. Matches are rechecked with `TELLS`. */
const AI_QUERIES = [
	'"Generated with Claude Code"',
	'"chatgpt.com/codex/tasks"',
	'"Made with Cursor"',
];
/** Months with agent attribution lines in the wild. */
const AI_MONTHS = months("2025-03", "2026-09");
const TELLS = SIGNALS.filter(
	(s) => s.id === "agent-attribution" || s.id === "ai-disclosure",
);

type CommentNode = {
	body: string;
	createdAt: string;
	url: string;
	author: Author;
};

type IssueNode = {
	number: number;
	body: string;
	url: string;
	author: Author;
	repository: { nameWithOwner: string };
	comments?: { nodes: (CommentNode | null)[] };
} | null;

const ISSUE_FIELDS =
	"number body url author { __typename login } repository { nameWithOwner }";
const COMMENT_FIELDS = "body createdAt url author { __typename login }";

function months(from: string, to: string) {
	const result: string[] = [];
	const date = new Date(`${from}-01T00:00:00Z`);
	const end = new Date(`${to}-01T00:00:00Z`);
	while (date <= end) {
		const start = date.toISOString().slice(0, 10);
		date.setUTCMonth(date.getUTCMonth() + 1);
		const last = new Date(date.getTime() - 86_400_000)
			.toISOString()
			.slice(0, 10);
		result.push(`${start}..${last}`);
	}
	return result;
}

function discloses(text: string) {
	return TELLS.some((s) => s.count(text) > 0);
}

function entry(
	label: "ai" | "human",
	kind: "issue" | "comment",
	issue: NonNullable<IssueNode>,
	text: { body: string; url: string; author: Author },
): CorpusEntry {
	return {
		label,
		kind,
		repo: issue.repository.nameWithOwner,
		number: issue.number,
		body: text.body,
		author: text.author?.login,
		url: text.url,
	};
}

/**
 * Issues and their comments, and comments on PRs. A PR's own description
 * belongs to the PR corpus, but its conversation is the same kind of text as
 * an issue's, and the replies agents get flagged on are mostly there.
 */
async function fetchHuman(repo: string): Promise<CorpusEntry[]> {
	const entries: CorpusEntry[] = [];
	const searches = HUMAN_WINDOWS.flatMap((window) =>
		(["issue", "pr"] as const).map((type) => ({ window, type })),
	);
	for (const { window, type } of searches) {
		const fields = `${ISSUE_FIELDS} comments(first: 10) { nodes { ${COMMENT_FIELDS} } }`;
		const data = await graphql<{ search: { nodes: IssueNode[] } }>(
			`query ($q: String!) {
				search(query: $q, type: ISSUE, first: ${ISSUES_PER_WINDOW * 2}) {
					nodes { ... on Issue { ${fields} } ... on PullRequest { ${fields} } }
				}
			}`,
			{
				// PRs without a conversation have nothing to sample.
				q: `repo:${repo} is:${type} created:${window} ${type === "pr" ? "comments:>0 " : ""}sort:created-desc`,
			},
		);
		const issues = data.search.nodes
			.filter(
				(issue): issue is NonNullable<IssueNode> =>
					!!issue?.body.trim() && isHumanAuthor(issue.author),
			)
			.slice(0, ISSUES_PER_WINDOW);
		for (const issue of issues) {
			if (type === "issue" && isLatin(issue.body)) {
				entries.push(entry("human", "issue", issue, issue));
			}
			const comments = (issue.comments?.nodes ?? [])
				.filter(
					(c): c is CommentNode =>
						!!c?.body.trim() &&
						isHumanAuthor(c.author) &&
						c.createdAt < HUMAN_BEFORE &&
						isLatin(c.body),
				)
				.slice(0, HUMAN_COMMENTS_PER_ISSUE);
			for (const comment of comments) {
				entries.push(entry("human", "comment", issue, comment));
			}
		}
	}
	return entries;
}

async function fetchAiIssues(query: string, month: string) {
	const data = await graphql<{ search: { nodes: IssueNode[] } }>(
		`query ($q: String!) {
			search(query: $q, type: ISSUE, first: 100) {
				nodes { ... on Issue { ${ISSUE_FIELDS} } }
			}
		}`,
		{ q: `${query} is:issue in:body created:${month}` },
	);
	return data.search.nodes
		.filter(
			(issue): issue is NonNullable<IssueNode> =>
				!!issue &&
				isHumanAuthor(issue.author) &&
				discloses(issue.body) &&
				isLatin(issue.body),
		)
		.map((issue) => entry("ai", "issue", issue, issue));
}

/** Comments on issues and PRs. A PR's conversation comments are the same kind of text. */
async function fetchAiComments(query: string, month: string) {
	const fields = `${ISSUE_FIELDS} comments(last: 20) { nodes { ${COMMENT_FIELDS} } }`;
	const data = await graphql<{ search: { nodes: IssueNode[] } }>(
		`query ($q: String!) {
			search(query: $q, type: ISSUE, first: 50) {
				nodes { ... on Issue { ${fields} } ... on PullRequest { ${fields} } }
			}
		}`,
		{ q: `${query} in:comments created:${month}` },
	);
	const entries: CorpusEntry[] = [];
	for (const issue of data.search.nodes) {
		for (const comment of issue?.comments?.nodes ?? []) {
			if (
				issue &&
				comment?.body &&
				isHumanAuthor(comment.author) &&
				discloses(comment.body) &&
				isLatin(comment.body)
			) {
				entries.push(entry("ai", "comment", issue, comment));
			}
		}
	}
	return entries;
}

type AgentAccount = { username: string };
type UserNode = {
	issueComments: {
		nodes: (CommentNode & { issue: IssueNode; pullRequest: IssueNode })[];
	};
	issues: { nodes: (NonNullable<IssueNode> & { createdAt: string })[] };
} | null;

async function loadAgentAccounts(file?: string): Promise<AgentAccount[]> {
	if (file) {
		return JSON.parse(readFileSync(file, "utf-8"));
	}
	const res = await fetch(VERIFIED_AGENTS_URL);
	if (!res.ok) {
		throw new Error(`${VERIFIED_AGENTS_URL}: ${res.status}`);
	}
	return res.json() as Promise<AgentAccount[]>;
}

/** Recent issues and comments by an agent account, attribution line or not. Newest first. */
async function fetchAgentAccount(login: string): Promise<CorpusEntry[]> {
	const parent = "number repository { nameWithOwner }";
	const data = await graphql<{ user: UserNode }>(
		`query ($login: String!) {
			user(login: $login) {
				issueComments(last: 100) { nodes { ${COMMENT_FIELDS} issue { ${parent} } pullRequest { ${parent} } } }
				issues(last: 40) { nodes { ${ISSUE_FIELDS} createdAt } }
			}
		}`,
		{ login },
	);
	const keep = (text: { body: string; createdAt: string; author: Author }) =>
		text.createdAt >= AGENT_SINCE &&
		text.author?.__typename === "User" &&
		text.body.trim().length >= MIN_AGENT_LENGTH &&
		isLatin(text.body);

	const entries: CorpusEntry[] = [];
	for (const comment of data.user?.issueComments.nodes ?? []) {
		const issue = comment.pullRequest ?? comment.issue;
		if (issue && keep(comment)) {
			entries.push(entry("ai", "comment", issue, comment));
		}
	}
	for (const issue of data.user?.issues.nodes ?? []) {
		if (keep(issue)) {
			entries.push(entry("ai", "issue", issue, issue));
		}
	}
	return entries
		.reverse()
		.map((e) => ({ ...e, source: "agent-account" as const }));
}

/** A body without links and numbers, so one bot template filled in many times counts once. */
function templateOf(body: string) {
	return body
		.replace(/https?:\/\/\S+/g, "")
		.replace(/[\d#]+/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

/**
 * Drops repeats, and keeps at most `cap` entries per kind and `group` (the repo
 * by default).
 */
function dedupe(
	entries: CorpusEntry[],
	cap = Number.POSITIVE_INFINITY,
	group = (e: CorpusEntry) => e.repo,
) {
	const seen = new Set<string>();
	const counts = new Map<string, number>();
	return entries.filter((e) => {
		const key = `${e.kind} ${group(e)}`;
		const count = counts.get(key) ?? 0;
		const body = templateOf(e.body);
		if (seen.has(body) || count >= cap) {
			return false;
		}
		seen.add(body);
		counts.set(key, count + 1);
		return true;
	});
}

type TemplateNode = { text?: string } | null;
type RepoTemplates = {
	dir: { entries: { name: string; object: TemplateNode }[] } | null;
	[file: string]: unknown;
} | null;

/** Each repo's issue templates: markdown files and YAML forms. */
async function fetchTemplates(repos: string[]) {
	const templates: Record<string, string[]> = {};
	const chunks: string[][] = [];
	for (let i = 0; i < repos.length; i += TEMPLATE_REPOS_PER_QUERY) {
		chunks.push(repos.slice(i, i + TEMPLATE_REPOS_PER_QUERY));
	}
	await pool(chunks, async (chunk) => {
		const fields = chunk
			.map((repo, i) => {
				const [owner, name] = repo.split("/");
				return `r${i}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) {
					dir: object(expression: "HEAD:.github/ISSUE_TEMPLATE") {
						... on Tree { entries { name object { ... on Blob { text } } } }
					}
					github: object(expression: "HEAD:.github/ISSUE_TEMPLATE.md") { ... on Blob { text } }
					root: object(expression: "HEAD:ISSUE_TEMPLATE.md") { ... on Blob { text } }
					docs: object(expression: "HEAD:docs/ISSUE_TEMPLATE.md") { ... on Blob { text } }
				}`;
			})
			.join("\n");
		const data = await graphql<Record<string, RepoTemplates>>(
			`query { ${fields} }`,
		);
		chunk.forEach((repo, i) => {
			const node = data[`r${i}`];
			if (!node) {
				return;
			}
			const texts = [
				...(node.dir?.entries ?? [])
					.filter(
						(e) =>
							/\.(?:md|ya?ml)$/i.test(e.name) &&
							!/^config\.ya?ml$/i.test(e.name),
					)
					.map((e) => e.object?.text),
				...["github", "root", "docs"].map(
					(key) => (node[key] as TemplateNode)?.text,
				),
			].filter((text): text is string => !!text);
			if (texts.length > 0) {
				templates[repo] = texts;
			}
		});
	});
	return templates;
}

async function main() {
	const arg = (name: string) =>
		process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
	const reposFile = arg("repos");
	// By default, AgentScan's published list.
	const agentsFile = arg("agents");
	// By default, the repos the PR corpus took human PRs from.
	const repos = reposFile
		? [
				...new Set(
					readFileSync(reposFile, "utf-8").match(
						/(?<=")[\w.-]+\/[\w.-]+(?=")/g,
					) ?? [],
				),
			]
		: [
				...new Set(
					(
						JSON.parse(
							readFileSync(join(CORPUS_DIR, "entries.json"), "utf-8"),
						) as CorpusEntry[]
					)
						.filter((e) => e.label === "human")
						.map((e) => e.repo),
				),
			];

	const human: CorpusEntry[] = [];
	await pool(repos, async (repo) => {
		const entries = await fetchHuman(repo);
		human.push(...entries);
		console.log(`${repo}: ${entries.length} human`);
	});

	const searches = AI_QUERIES.flatMap((query) =>
		AI_MONTHS.map((month) => ({ query, month })),
	);
	const found: CorpusEntry[] = [];
	await pool(searches, async ({ query, month }) => {
		const [issues, comments] = await Promise.all([
			fetchAiIssues(query, month),
			fetchAiComments(query, month),
		]);
		found.push(...issues, ...comments);
		console.log(
			`${query} ${month}: ${issues.length} issues, ${comments.length} comments`,
		);
	});
	found.sort((a, b) => a.repo.localeCompare(b.repo) || a.number - b.number);
	const disclosed = dedupe(found, AI_PER_REPO);

	const accounts = await loadAgentAccounts(agentsFile);
	const byAccount: CorpusEntry[] = [];
	await pool(accounts, async ({ username }) => {
		const entries = await fetchAgentAccount(username);
		byAccount.push(...entries);
		console.log(`${username}: ${entries.length} agent-account texts`);
	});
	// Texts already found by their attribution line keep that label.
	const disclosedUrls = new Set(disclosed.map((e) => e.url));
	const ai = [
		...disclosed,
		...dedupe(
			byAccount.filter((e) => !disclosedUrls.has(e.url)),
			AGENT_PER_AUTHOR,
			(e) => e.author ?? e.repo,
		),
	];

	const entries = [...dedupe(human), ...ai].sort(
		(a, b) =>
			a.repo.localeCompare(b.repo) ||
			a.number - b.number ||
			a.body.localeCompare(b.body),
	);
	const templates = await fetchTemplates([
		...new Set(entries.filter((e) => e.kind === "issue").map((e) => e.repo)),
	]);

	writeFileSync(
		join(CORPUS_DIR, "issues.json"),
		`${JSON.stringify(entries)}\n`,
	);
	writeFileSync(
		join(CORPUS_DIR, "issue-templates.json"),
		`${JSON.stringify(templates)}\n`,
	);

	const count = (label: string, kind: string) =>
		entries.filter((e) => e.label === label && e.kind === kind).length;
	const fromAccounts = (kind: string) =>
		entries.filter((e) => e.source === "agent-account" && e.kind === kind)
			.length;
	console.log(
		`\nissues: ${count("human", "issue")} human, ${count("ai", "issue")} ai (${fromAccounts("issue")} from agent accounts)` +
			`\ncomments: ${count("human", "comment")} human, ${count("ai", "comment")} ai (${fromAccounts("comment")} from agent accounts)` +
			`\n${Object.keys(templates).length} repos with issue templates`,
	);
}

if (
	!existsSync(join(CORPUS_DIR, "issues.json")) ||
	process.argv.includes("--force")
) {
	main().catch((error) => {
		console.error(error);
		process.exit(1);
	});
} else {
	console.log("corpus/issues.json exists; pass --force to rebuild");
}
