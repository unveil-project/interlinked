import {
	density,
	densityOutsideChecklists,
	longParagraphs,
	matches,
	matchesOutsideChecklists,
	unpunctuatedLines,
} from "./counters";

export interface Signal {
	id: string;
	description: string;
	/** Positive leans agent-written, negative leans human-written. */
	weight: number;
	/** Hits at which the signal reaches full strength. */
	cap: number;
	count: (text: string) => number;
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
		id: "ai-disclosure",
		description: "discloses that an AI tool wrote or assisted the change",
		weight: 3,
		cap: 1,
		count: matchesOutsideChecklists(
			/\b(?:generated|authored|prepared|written|built|created|translated|drafted|produced|implemented)\b[^.\n]{0,30}\b(?:with|by|using|via)\b[^.\n]{0,25}\b(?:AI|LLM|Claude|Codex|Copilot|Cursor|ChatGPT|GPT-?\d|Gemini|an? (?:AI|coding) (?:assistant|agent))\b|\bAI[- ]assist(?:ed|ance)\b|\bagent-assisted\b|\bwith (?:the help of )?an? AI\b|\bI used (?:Claude|Codex|Copilot|Cursor|ChatGPT|an AI)\b|\bused an AI assistant\b|^\s*(?:\*\*)?(?:Agent|AI tools? (?:and models )?used|Autonomy|Contribution source)(?:\*\*)?\s*:/im,
		),
	},
	{
		id: "fails-before-fix",
		description: "claims tests were shown failing on the unfixed code",
		weight: 2.2,
		cap: 2,
		count: matches(
			/\b(?:fail|fails|failed|failing|red)\s+(?:on|against)\s+(?:the\s+)?(?:unfixed|unpatched|unmodified|old|original|prior|pinned|current)?\s*(?:`?main`?|`?master`?|`?dev`?|code|baseline|base|script|regex|file)\b|\bfail(?:s|ed|ing)?\b[^.\n]{0,40}\b(?:before|without) (?:the|this) (?:fix|change|patch)\b|\b(?:fail|fails|failed|times out)\b[^.\n]{0,60}\bwithout the \w+ (?:fix|change|patch)\b|\bwithout the fix\b|\bfails? before\b|\bpass(?:es)? after\b|\bpass(?:es|ed)? (?:after|with) (?:the|this) (?:fix|change|patch)\b|\bverified by reverting\b|\b(?:identically )?on (?:unmodified|unfixed|unpatched) `?(?:main|dev)`?|\ball red on\b|\bfresh-base-red\b/i,
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
			/\bnot (?:a |an )?(?:controlled|claimed|unmodified)\b|\b(?:no|not) (?:root cause|fix) (?:or fix )?is claimed\b|\bevidence, not a\b|\bnot a claim\b|\brather than a (?:harness error|fragile workaround)\b|\bfail for the reported reason\b|\b(?:was|were) not run\b|\bnot run locally\b|\bdid not run\b/i,
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
	{
		id: "validation-line",
		description: "has a Validation: or Tested: line with test commands",
		weight: 2,
		cap: 1,
		count: matches(/(?:Validation|Tested|Verified|Tests?):\s*(?:go test|test |bun bd test|npm test|yarn test|pnpm test|make test|\w+ test)/i),
	},
	{
		id: "verification-label",
		description: "opens a line with a Validation:, Root cause: or Fix: label",
		weight: 1,
		cap: 2,
		count: matches(
			/^(?:\*\*)?(?:Validation|Verification|Local checks|How I (?:checked|verified|tested)|How verified|Test plan|Testing|Tests?|Tested|Root cause|Fix|Benchmarks?)(?:\*\*)?(?: \([^)\n]*\))?(?:\*\*)?:(?:\s*$|(?:\s+\S+){8})/m,
		),
	},
	{
		id: "test-reference",
		description: "mentions test or regression test",
		weight: 0.7,
		cap: 3,
		count: matches(/\bregression (?:tests?|coverage)\b|\btest case\b|\brun test\b|\bunit test\b|\btests? cover\b|\bregressions cover\b|\bcoverage for\b|\bcovers? (?:both|the|every)\b/i),
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
			/^#{1,4}\s*(?:out of scope|not in (?:this|scope)|non-goals|known limitations)\b|\b(?:are|is|remains?|stays?) (?:unaffected|unchanged|untouched)\b|\bno (?:behaviou?r|functional|user-visible|api) changes?\b|\bnothing else (?:is )?(?:touched|changed)\b|\bno (?:other|unrelated) (?:changes|files|tool)\b|\bout of scope\b|\bnot in scope\b|\bintentionally (?:not|left|kept)\b|\bdeliberately\b|\bunrelated to this change\b|\b(?:nothing|no) (?:[\w-]+ ){0,3}changes\b|\bstays? the same\b|\bas before\b|\bleft (?:unchanged|untouched)\b|\bkeeps? (?:its|their) existing\b/im,
		),
	},
	{
		id: "test-tally",
		description: "quotes exact pass/skip/fail counts",
		weight: 1.2,
		cap: 3,
		count: matches(
			/\b\d[\d,]*\s*(?:tests?\s+)?(?:passed|pass(?:ing)?)\b(?:,\s*\d[\d,]*\s+(?:skipped|failed|xfailed))*|\b\d+\/\d+\s+(?:pass|passed|cases|tests)\b|\ball \d+ (?:[\w`.-]+ ){0,3}tests?\b|\b\d+ (?:[\w`.-]+ ){0,3}tests? (?:now )?pass(?:es|ed)?\b/i,
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
		id: "long-paragraphs",
		description: "explains in long unbroken paragraphs",
		weight: 0.6,
		cap: 2,
		count: longParagraphs,
	},
	{
		id: "so-chains",
		description: 'chains consequences with ", so" more than once',
		weight: 1,
		cap: 3,
		count: (text) => Math.max(0, matches(/, so (?!that)\w+/i)(text) - 1),
	},
	{
		id: "existing-precedent",
		description: "justifies the change by code that already does the same",
		weight: 0.8,
		cap: 2,
		count: matches(
			/\balready (?:uses|does|has|had|takes|handles|covers|sends|emits|exists?)\b|\bthe same (?:\w+ ){1,4}(?:already|as)\b/i,
		),
	},
	{
		id: "now-verbs",
		description: 'states what the code "now does" after the change',
		weight: 0.6,
		cap: 3,
		count: matches(/\bnow \w+s\b/i),
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
		count: densityOutsideChecklists(/\b(?:I|I'm|I've|I'd|I'll|my|me)\b/),
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
