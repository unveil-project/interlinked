function round(n: number, rounding = 2) {
	const factor = 10 ** rounding;
	return Math.round(n * factor) / factor;
}

export interface Signal {
	id: string;
	description: string;
	/** Positive leans agent-written, negative leans human-written. */
	weight: number;
	/** Hits at which the signal reaches full strength. */
	cap: number;
	count: (text: string) => number;
}

export interface SignalHit {
	id: string;
	description: string;
	hits: number;
	contribution: number;
}

export interface AnalyzeTextResult {
	verdict: "ai" | "human";
	/** Probability the text is agent-written, 0–1. */
	probability: number;
	/** Confidence in `verdict`, 0.5–1. */
	confidence: number;
	signals: SignalHit[];
}

/**
 * Starting log-odds before any evidence, from the fit. Negative so that plain
 * text leans human; the `short-body` signal pushes further for one-liners.
 */
const BIAS = -0.9;

/** At or above this probability the verdict is "ai". */
export const AI_THRESHOLD = 0.5;

/**
 * Densities are taken over at least this many characters, so one code span in
 * a one-line description doesn't read as a dense one.
 */
const MIN_DENSITY_LENGTH = 300;

function matches(pattern: RegExp) {
	const global = new RegExp(
		pattern.source,
		pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`,
	);
	return (text: string) => text.match(global)?.length ?? 0;
}

/** Occurrences per 1,000 characters. */
function density(pattern: RegExp) {
	const count = matches(pattern);
	return (text: string) =>
		text.length === 0
			? 0
			: (count(text) / Math.max(text.length, MIN_DENSITY_LENGTH)) * 1000;
}

/** The text with fenced, indented and inline code blanked out. */
function prose(text: string) {
	return text
		.replace(/```[\s\S]*?```/g, "")
		.replace(/^ {4}.*$/gm, "")
		.replace(/`[^`\n]*`/g, "X");
}

/** Prose lines of five or more words that don't end in punctuation. */
function unpunctuatedLines(text: string) {
	return prose(text)
		.split("\n")
		.map((line) => line.trim())
		.filter(
			(line) =>
				line.split(/\s+/).length > 4 &&
				!/^[-*#|>\d]/.test(line) &&
				!/[.!?:)`]$/.test(line),
		).length;
}

/**
 * Drops text neither the author nor their agent wrote: HTML comments (PR
 * template instructions) and bot summaries such as CodeRabbit's, which would
 * otherwise read as agent prose on a human PR.
 */
function authoredText(markdown: string) {
	return markdown
		.replace(
			/<!-- This is an auto-generated comment[\s\S]*?end of auto-generated comment[^>]*-->/g,
			"",
		)
		.replace(/<!--[\s\S]*?-->/g, "")
		.trim();
}

export const SIGNALS: Signal[] = [
	// Tells: rare, near-conclusive, hand-weighted.
	{
		id: "agent-attribution",
		description: "names an AI agent or carries its attribution line",
		weight: 4,
		cap: 1,
		count: matches(
			/Generated with \[?Claude|Co-Authored-By: (?:Claude|Copilot|Codex)|Claude-Session:|claude\.ai\/code\/session|chatgpt\.com\/codex\/tasks|\b(?:Codex|Claude|Copilot|Cursor|Devin) (?:autoreview|review|agent)\b|\bautoreview\b/i,
		),
	},
	{
		id: "fails-before-fix",
		description: "claims tests were shown failing on the unfixed code",
		weight: 2.2,
		cap: 2,
		count: matches(
			/\b(?:fail|fails|failed|failing|red)\s+(?:on|against)\s+(?:the\s+)?(?:unfixed|unpatched|unmodified|old|original|prior|pinned|current)?\s*(?:`?main`?|`?dev`?|code|baseline|base|script|regex|file)\b|\bfail(?:s|ed|ing)?\b[^.\n]{0,40}\b(?:before|without) (?:the|this) (?:fix|change|patch)\b|\bpass(?:es|ed)? (?:after|with) (?:the|this) (?:fix|change|patch)\b|\bverified by reverting\b|\b(?:identically )?on (?:unmodified|unfixed|unpatched) `?(?:main|dev)`?|\ball red on\b|\bfresh-base-red\b/i,
		),
	},
	{
		id: "git-diff-check",
		description: "reports running `git diff --check`",
		weight: 2.5,
		cap: 1,
		count: matches(/git diff --check/),
	},
	{
		id: "lint-clean",
		description: "reports a linter or type check as clean",
		weight: 1,
		cap: 2,
		count: matches(
			/\b(?:ruff check|tsgo|tsc --noEmit|oxlint|oxfmt|biome check|eslint)\b[^\n]{0,80}?\b(?:clean|pass(?:es|ed)?)\b|All checks passed!/i,
		),
	},
	{
		id: "review-severity",
		description: "uses P0/P1/P2 review-severity wording",
		weight: 2,
		cap: 1,
		count: matches(
			/\b(?:clean|findings?) (?:through|at) P[0-3]\b|\bat P[0-3](?:\/P[0-3])?\b|\bscoped-clean\b/,
		),
	},
	{
		id: "epistemic-hedge",
		description: 'pre-empts over-reading its own evidence ("X, not Y")',
		weight: 1.5,
		cap: 2,
		count: matches(
			/\bnot (?:a |an )?(?:controlled|claimed|unmodified)\b|\b(?:no|not) (?:root cause|fix) (?:or fix )?is claimed\b|\bevidence, not a\b|\bnot a claim\b|\brather than a (?:harness error|fragile workaround)\b|\bfail for the reported reason\b/i,
		),
	},
	{
		id: "maintainer-deference",
		description: "defers decisions to a maintainer",
		weight: 1.3,
		cap: 2,
		count: matches(
			/\bfor a maintainer\b|\bsay the word\b|\bmaintainer[- ]requested\b|\bmaintainer'?s? (?:explicit|work order|decision)\b|\bif you would rather\b|\bjudgement call worth surfacing\b/i,
		),
	},
	{
		id: "plan-reference",
		description: "points to a plan file or the commit message for detail",
		weight: 2.2,
		cap: 2,
		count: matches(
			/\b(?:SPEC|BUILD_PLAN|PLAN|TODO|CHANGES)\.md\b|\bsee (?:the )?commit message\b|\bfull (?:design rationale|details)\b/i,
		),
	},
	{
		id: "live-verification",
		description: "describes a live or end-to-end proof run",
		weight: 1.2,
		cap: 1,
		count: matches(
			/\blive end-to-end\b|\bconfirmed directly\b|\blive (?:run|registry|proof|CLI proof)\b|\bdry run against\b|\b(?:existing|full unit) suite\b[^\n]{0,40}\b(?:green|passed)\b/i,
		),
	},
	{
		id: "stacked-pr",
		description: "says it is stacked on or supersedes another PR",
		weight: 0.8,
		cap: 1,
		count: matches(/\bstacked on #\d+|\bsupersedes #\d+/i),
	},
	{
		id: "commit-shas",
		description: "cites commit SHAs, CI run or job IDs",
		weight: 0.5,
		cap: 4,
		count: matches(
			/\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{12,40}\b|\b(?:run|job) `?\d{9,}\b/,
		),
	},

	// Style leaning agent-written: fitted weights.
	{
		id: "semicolons",
		description: "joins clauses with semicolons",
		weight: 1.8,
		cap: 5,
		count: density(/; /),
	},
	{
		id: "code-span-density",
		description: "dense inline `code` spans",
		weight: 1.4,
		cap: 15,
		count: density(/`[^`\n]+`/),
	},
	{
		id: "bold-lead-bullets",
		description: "starts bullets or paragraphs with a **bold lead**",
		weight: 1.1,
		cap: 12,
		count: matches(
			/^\s*(?:[-*]|\d+\.) \*\*[^*\n]+\*\*|^\*\*[^*\n]{2,60}\*\*[:.]? \S/m,
		),
	},
	{
		id: "em-dash",
		description: "dense em-dash use",
		weight: 0.8,
		cap: 4,
		count: density(/—/),
	},
	{
		id: "template-headings",
		description: "uses the headings agent PR templates favour",
		weight: 1,
		cap: 2,
		count: matches(
			/^#{1,4}\s*(?:Summary|Overview|TL;?DR|Verification|Validation|How (?:it was|this was|I) tested|Testing|Test plan|Tests|Evidence|Checks)\s*$/im,
		),
	},
	{
		id: "colon-bullets",
		description: "bullets shaped as `- label: explanation`",
		weight: 0.7,
		cap: 8,
		count: matches(/^\s*[-*] [^:\n]{2,40}: \S/m),
	},
	{
		id: "arrows",
		description: "uses → or -> in prose",
		weight: 0.5,
		cap: 8,
		count: matches(/→| -> /),
	},
	{
		id: "file-paths",
		description: "names source files by path",
		weight: 0.5,
		cap: 5,
		count: matches(
			/\b[\w.-]+\/[\w./-]+\.(?:ts|tsx|js|py|rs|go|java|cs|rb|md|json|yml|yaml|toml|swift|kt|cpp|h|c)\b/,
		),
	},
	{
		id: "scope-disclaimer",
		description: "lists what the change deliberately did not touch",
		weight: 1.2,
		cap: 3,
		count: matches(
			/^#{1,4}\s*(?:out of scope|not in (?:this|scope)|non-goals|known limitations)\b|\b(?:are|is|remains?|stays?) (?:unaffected|unchanged|untouched)\b|\bno (?:behaviou?r|functional|user-visible|api) changes?\b|\bnothing else (?:is )?(?:touched|changed)\b|\bno (?:other|unrelated) (?:changes|files|tool)\b|\bout of scope\b|\bnot in scope\b|\bintentionally (?:not|left|kept)\b|\bdeliberately\b|\bunrelated to this change\b/im,
		),
	},
	{
		id: "test-tally",
		description: "quotes exact pass/skip/fail counts",
		weight: 1.2,
		cap: 3,
		count: matches(
			/\b\d[\d,]*\s*(?:tests?\s+)?(?:passed|pass(?:ing)?)\b(?:,\s*\d[\d,]*\s+(?:skipped|failed|xfailed))*|\b\d+\/\d+\s+(?:pass|passed|cases|tests)\b/i,
		),
	},
	{
		id: "agent-vocabulary",
		description: "uses words agents overuse (idempotent, surfaces, invariant…)",
		weight: 0.5,
		cap: 4,
		count: matches(
			/\bload-bearing\b|\bcanonical (?:owner|\w+ normalizer)\b|\b(?:existing|durable|single|shared|leaf) owner\b|\bcustody\b|\bfenc(?:e|ed|ing)\b|\binvariants?\b|\bbyte-for-byte\b|\bbyte-identical\b|\bregression controls?\b|\bpin (?:the|a) bug\b|\bidempotent\b|\bdeterministic(?:ally)?\b|\bsurfaced?\b|\bsurfaces\b|\bguards? against\b|\bverbatim\b|\bleverag(?:e|es|ing)\b|\bseamless(?:ly)?\b/i,
		),
	},
	{
		id: "tables",
		description: "lays information out in markdown tables",
		weight: 0.3,
		cap: 20,
		count: matches(/^\|.*\|\s*$/m),
	},

	// Style leaning human-written: fitted weights.
	{
		id: "first-person",
		description: "writes in the first person (I, my, me)",
		weight: -1,
		cap: 7,
		count: density(/\b(?:I|I'm|I've|I'd|I'll|my|me)\b/),
	},
	{
		id: "screenshots",
		description: "attaches screenshots or images",
		weight: -0.9,
		cap: 8,
		count: matches(
			/!\[[^\]]*\]\(|<img\s|user-images\.githubusercontent|github\.com\/user-attachments/i,
		),
	},
	{
		id: "this-pr",
		description: 'refers to the change as "this PR"',
		weight: -0.8,
		cap: 3,
		count: matches(/\bthis (?:PR|pull request)\b/i),
	},
	{
		id: "contractions",
		description: "uses contractions (don't, it's, we'll)",
		weight: -0.8,
		cap: 6,
		count: density(
			/\b\w+(?:n't|'re|'ll|'ve|'d)\b|\b(?:it's|that's|there's|let's|what's)\b/i,
		),
	},
	{
		id: "template-checkboxes",
		description: "keeps a PR template's checkbox list",
		weight: -1.2,
		cap: 8,
		count: matches(/^\s*[-*] \[[ x]\]/im),
	},
	{
		id: "unpunctuated-lines",
		description: "leaves sentences without final punctuation",
		weight: -0.5,
		cap: 5,
		count: unpunctuatedLines,
	},
	{
		id: "bare-urls",
		description: "pastes bare URLs instead of markdown links",
		weight: -0.3,
		cap: 4,
		count: matches(/(?<![(<])https?:\/\/\S+/),
	},
	{
		id: "questions",
		description: "asks the reviewer questions",
		weight: -0.3,
		cap: 4,
		count: matches(/\?(?:\s|$)/m),
	},
	{
		id: "tentative",
		description: 'is tentative or informal ("not sure", "WIP", "let me know")',
		weight: -0.3,
		cap: 3,
		count: matches(
			/\b(?:WIP|not sure|I think|I guess|maybe|probably|let me know|feel free)\b/i,
		),
	},
	{
		id: "short-body",
		description: "is too short to carry agent structure",
		weight: -1.5,
		cap: 1,
		count: (text) => (text.length < 150 ? 1 : 0),
	},
];

function sigmoid(x: number) {
	return 1 / (1 + Math.exp(-x));
}

/**
 * Guesses whether a PR description (raw markdown) was written by an AI agent.
 *
 * @example
 * const { verdict, confidence } = analyzeText(pr.body ?? "");
 * // verdict: "ai" | "human", confidence: 0.5–1
 */
export function analyzeText(markdown: string): AnalyzeTextResult {
	const text = authoredText(markdown ?? "");
	let logit = BIAS;
	const signals: SignalHit[] = [];

	for (const signal of SIGNALS) {
		const hits = signal.count(text);
		if (hits <= 0) continue;
		const contribution =
			signal.weight * (Math.min(hits, signal.cap) / signal.cap);
		logit += contribution;
		signals.push({
			id: signal.id,
			description: signal.description,
			hits: round(hits),
			contribution: round(contribution),
		});
	}

	signals.sort((a, b) => b.contribution - a.contribution);

	const probability = sigmoid(logit);
	const verdict = probability >= AI_THRESHOLD ? "ai" : "human";

	return {
		verdict,
		probability: round(probability, 3),
		confidence: round(verdict === "ai" ? probability : 1 - probability, 3),
		signals,
	};
}
