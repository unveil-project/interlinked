import {
	density,
	densityOutsideChecklists,
	longParagraphs,
	matches,
	matchesInStatements,
	tidyLines,
	unpunctuatedLines,
} from "./counters";

export interface Signal {
	id: string;
	description: string;
	/** Positive means agent, negative means human, 0 turns it off. Set by `scripts/fit-weights.ts`. */
	weight: number;
	/** Hits at which the signal reaches full strength. */
	cap: number;
	/** Count prose only. Code syntax isn't the author's style. */
	prose?: boolean;
	count: (text: string) => number;
}

const disclosureStatements = matchesInStatements(
	/\b(?:generated|authored|prepared|written|built|created|translated|drafted|produced|implemented)\b[^.\n]{0,30}\b(?:with|by|using|via)\b[^.\n]{0,25}\b(?:AI|LLM|Claude|Codex|Copilot|Cursor|ChatGPT|GPT-?\d|Gemini|an? (?:AI|coding) (?:assistant|agent))\b|\bAI[- ]assist(?:ed|ance)\b(?! development\b)|\bagent-assisted\b|\bwith (?:the help of )?an? AI\b|\bI used (?:Claude|Codex|Copilot|Cursor|ChatGPT|an AI)\b|\bused an AI assistant\b|\bAI[- ]generated (?:description|summary|PR|pull request|code|changes?|patch)\b|\bpair[- ]programmed with (?:an? )?(?:AI|Claude|Codex|Copilot|Cursor|ChatGPT)\b|\b(?:an? )?(?:AI|LLM)(?: agent| tool| assistant)? was used\b|\bhad (?:an? )?AI\b|^#{1,4}\s*AI (?:disclosure|usage|assistance)\b|^\s*(?:\*\*)?(?:Agent|Agent-Owner|AI tools? (?:and models )?used|AI (?:tool )?(?:use|usage)(?: disclosure)?|AI disclosure|Code assistance|Autonomy|Contribution source)(?:\*\*)?\s*:/im,
);

/** A ticked checklist item saying AI was used. Unticked ones are template text. */
const disclosureCheckboxes = matches(/^\s*[-*] \[[xX]\] I _?did_? use AI\b/im);

export const SIGNALS: Signal[] = [
	{
		id: "agent-attribution",
		description: "names an AI agent or carries its attribution line",
		weight: 4,
		cap: 1,
		count: matches(
			/Generated with \[?Claude|Co-Authored-By: (?:Claude|Copilot|Codex)|Claude-Session:|claude\.ai\/code\/session|chatgpt\.com\/codex\/tasks|\b(?:Codex|Claude|Copilot|Cursor|Devin) (?:autoreview|review|agent)\b|\bautoreview\b|\bMade with \[?Cursor\b/i,
		),
	},
	{
		id: "ai-disclosure",
		description: "discloses that an AI tool wrote or assisted the change",
		weight: 3,
		cap: 1,
		count: (text) => disclosureStatements(text) + disclosureCheckboxes(text),
	},
	{
		id: "fails-before-fix",
		description: "claims tests were shown failing on the unfixed code",
		weight: 0.87,
		cap: 2,
		count: matches(
			/\b(?:fail|fails|failed|failing|red)\s+(?:on|against)\s+(?:the\s+)?(?:unfixed|unpatched|unmodified|old|original|prior|pinned|current)?\s*(?:`?main`?|`?master`?|`?dev`?|code|baseline|base|script|regex|file)\b|\bfail(?:s|ed|ing)?\b[^.\n]{0,40}\b(?:before|without) (?:the|this) (?:fix|change|patch)\b|\b(?:fail|fails|failed|times out)\b[^.\n]{0,60}\bwithout the \w+ (?:fix|change|patch)\b|\bwithout the fix\b|\bfails? before\b|\bpass(?:es)? after\b|\bpass(?:es|ed)? (?:after|with) (?:the|this) (?:fix|change|patch)\b|\bverified by reverting\b|\b(?:identically )?on (?:unmodified|unfixed|unpatched) `?(?:main|dev)`?|\ball red on\b|\bfresh-base-red\b/i,
		),
	},
	{
		id: "git-diff-check",
		description: "reports running `git diff --check`",
		weight: 0.89,
		cap: 1,
		count: matches(/git diff --check/),
	},
	{
		id: "lint-clean",
		description: "reports a linter or type check as clean",
		weight: 0.4,
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
		weight: 0.39,
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
		weight: 0.41,
		cap: 1,
		count: matches(/\bstacked on #\d+|\bsupersedes #\d+/i),
	},
	{
		id: "commit-shas",
		description: "cites commit SHAs, CI run or job IDs",
		weight: 0,
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
		count: matches(
			/(?:Validation|Tested|Verified|Tests?):\s*(?:go test|test |bun bd test|npm test|yarn test|pnpm test|make test|\w+ test)/i,
		),
	},
	{
		id: "verification-label",
		description: "opens a line with a Validation:, Root cause: or Fix: label",
		weight: 0.62,
		cap: 2,
		count: matches(
			/^(?:\*\*)?(?:Validation|Verification|Local checks|How I (?:checked|verified|tested)|How verified|Test plan|Testing|Tests?|Tested|Root cause|Fix|Benchmarks?)(?:\*\*)?(?: \([^)\n]*\))?(?:\*\*)?:(?:\s*$|(?:\s+\S+){8})/m,
		),
	},
	{
		id: "test-reference",
		description: "mentions tests or regression tests",
		weight: 1.17,
		cap: 3,
		count: matches(
			/\bregression (?:tests?|coverage)\b|\btest case\b|\brun test\b|\bunit test\b|\btests? cover\b|\bregressions cover\b|\bcoverage for\b|\bcovers? (?:both|the|every)\b/i,
		),
	},

	// Style that leans agent-written.
	{
		id: "semicolons",
		description: "joins clauses with semicolons",
		weight: 2.18,
		cap: 5,
		prose: true,
		count: density(/; /),
	},
	{
		id: "code-span-density",
		description: "wraps many names in inline `code` spans",
		weight: 1.99,
		cap: 15,
		count: densityOutsideChecklists(/`[^`\n]+`/),
	},
	{
		id: "bold-lead-bullets",
		description: "starts bullets or paragraphs with a **bold lead**",
		weight: 0.75,
		cap: 12,
		count: matches(
			/^\s*(?:[-*]|\d+\.) \*\*[^*\n]+\*\*|^\*\*[^*\n]{2,60}\*\*[:.]? \S/m,
		),
	},
	{
		id: "em-dash",
		description: "uses em-dashes heavily",
		weight: 1.13,
		cap: 4,
		prose: true,
		count: density(/—/),
	},
	{
		id: "template-headings",
		description: "uses the headings agent PR templates favour",
		weight: 1.23,
		cap: 2,
		count: matches(
			/^#{1,4}\s*(?:Summary|Overview|TL;?DR|Verification|Validation|How (?:it was|this was|I) tested|Testing|Test plan|Tests|Evidence|Checks)\s*$/im,
		),
	},
	{
		id: "colon-bullets",
		description: "shapes bullets as `- label: explanation`",
		weight: 1.38,
		cap: 8,
		prose: true,
		count: matches(/^\s*[-*] [^:\n]{2,40}: \S/m),
	},
	{
		id: "arrows",
		description: "uses → or -> in prose",
		weight: 0.57,
		cap: 8,
		prose: true,
		count: matches(/→| -> /),
	},
	{
		id: "file-paths",
		description: "names source files by path",
		weight: 0.59,
		cap: 5,
		count: matches(
			/\b[\w.-]+\/[\w./-]+\.(?:ts|tsx|js|py|rs|go|java|cs|rb|md|json|yml|yaml|toml|swift|kt|cpp|h|c)\b/,
		),
	},
	{
		id: "scope-disclaimer",
		description: "lists what the change deliberately did not touch",
		weight: 1.52,
		cap: 3,
		prose: true,
		count: matches(
			/^#{1,4}\s*(?:out of scope|not in (?:this|scope)|non-goals|known limitations)\b|\b(?:are|is|remains?|stays?) (?:unaffected|unchanged|untouched)\b|\bno (?:behaviou?r|functional|user-visible|api) changes?\b|\bnothing else (?:is )?(?:touched|changed)\b|\bno (?:other|unrelated) (?:changes|files|tool)\b|\bout of scope\b|\bnot in scope\b|\bintentionally (?:not|left|kept)\b|\bdeliberately\b|\bunrelated to this change\b|\b(?:nothing|no) (?:[\w-]+ ){0,3}changes\b|\bstays? the same\b|\bas before\b|\bleft (?:unchanged|untouched)\b|\bkeeps? (?:its|their) existing\b/im,
		),
	},
	{
		id: "test-tally",
		description: "quotes exact pass/skip/fail counts",
		weight: 1.34,
		cap: 3,
		count: matches(
			/\b\d[\d,]*\s*(?:tests?\s+)?(?:passed|pass(?:ing)?)\b(?:,\s*\d[\d,]*\s+(?:skipped|failed|xfailed))*|\b\d+\/\d+\s+(?:pass|passed|cases|tests)\b|\ball \d+ (?:[\w`.-]+ ){0,3}tests?\b|\b\d+ (?:[\w`.-]+ ){0,3}tests? (?:now )?pass(?:es|ed)?\b/i,
		),
	},
	{
		id: "agent-vocabulary",
		description: "uses words agents overuse (idempotent, surfaces, invariant…)",
		weight: 0.61,
		cap: 4,
		prose: true,
		count: matches(
			/\bload-bearing\b|\bcanonical (?:owner|\w+ normalizer)\b|\b(?:existing|durable|single|shared|leaf) owner\b|\bcustody\b|\bfenc(?:e|ed|ing)\b|\binvariants?\b|\bbyte-for-byte\b|\bbyte-identical\b|\bregression controls?\b|\bpin (?:the|a) bug\b|\bidempotent\b|\bdeterministic(?:ally)?\b|\bsurfaced?\b|\bsurfaces\b|\bguards? against\b|\bverbatim\b|\bleverag(?:e|es|ing)\b|\bseamless(?:ly)?\b|\bsilently\b/i,
		),
	},
	{
		id: "long-paragraphs",
		description: "explains in long unbroken paragraphs",
		weight: 0.97,
		cap: 2,
		count: longParagraphs,
	},
	{
		id: "so-chains",
		description: 'chains consequences with ", so" more than once',
		weight: 1.63,
		cap: 3,
		prose: true,
		count: (text) => Math.max(0, matches(/, so (?!that)\w+/i)(text) - 1),
	},
	{
		id: "existing-precedent",
		description: "justifies the change by code that already does the same",
		weight: 0.95,
		cap: 2,
		prose: true,
		count: matches(
			/\balready (?:uses|does|has|had|takes|handles|covers|sends|emits|exists?)\b|\bthe same (?:\w+ ){1,4}(?:already|as)\b/i,
		),
	},
	{
		id: "now-verbs",
		description: 'states what the code "now does" after the change',
		weight: 1.55,
		cap: 3,
		prose: true,
		count: matches(/\bnow \w+(?:s|ed)\b/i),
	},
	{
		id: "tables",
		description: "lays information out in markdown tables",
		weight: 0.62,
		cap: 20,
		count: matches(/^\|.*\|\s*$/m),
	},
	{
		id: "tidy-prose",
		description: "writes every sentence capitalized and punctuated",
		weight: 1.18,
		cap: 4,
		count: tidyLines,
	},
	{
		id: "existing-reference",
		description: 'points at "the existing" code it builds on',
		weight: 1.19,
		cap: 3,
		prose: true,
		count: matches(/\bthe existing\b/i),
	},
	{
		id: "unchanged-claims",
		description: "says what stays unchanged or unaffected",
		weight: 1.45,
		cap: 2,
		prose: true,
		count: matches(/\bunchanged\b|\bunaffected\b/i),
	},
	{
		id: "which-clauses",
		description: 'explains through ", which does…" clauses',
		weight: 0.8,
		cap: 3,
		prose: true,
		count: matches(/, which \w+s\b/i),
	},
	{
		id: "contrast-phrases",
		description: 'contrasts with "rather than" or "instead of"',
		weight: 0.64,
		cap: 3,
		prose: true,
		count: matches(/\b(?:rather than|instead of)\b/i),
	},
	{
		id: "imperative-sentences",
		description: "gives the change as imperative sentences mid-paragraph",
		weight: 0.84,
		cap: 3,
		prose: true,
		count: matches(
			/[.:] (?:Add|Remove|Use|Preserve|Keep|Update|Replace|Return|Reject|Skip|Make|Move|Pass|Clear|Show|Match|Mark|Restore|Retain|Expire|Give|Check|Raise|Wrap|Select|Treat|Record|Validate|Extend|Allow|Prevent|Avoid|Drop|Ignore|Honor|Load|Emit|Render|Set|Document|Regenerate|Guard|Handle|Normalize|Resolve|Reuse|Apply|Cover|Stop|Start|Expose|Accept|Require) (?:the|a|an|each|every|all|both|this|that|its|their|X|[a-z]+s)\b/,
		),
	},

	// Style that leans human-written.
	{
		id: "first-person",
		description: "writes in the first person (I, my, me)",
		weight: -1.18,
		cap: 7,
		prose: true,
		count: densityOutsideChecklists(/\b(?:I|I'm|I've|I'd|I'll|my|me)\b/),
	},
	{
		id: "screenshots",
		description: "attaches screenshots or images",
		weight: 0,
		cap: 8,
		count: matches(
			/!\[[^\]]*\]\(|<img\s|user-images\.githubusercontent|github\.com\/user-attachments/i,
		),
	},
	{
		id: "this-pr",
		description: 'refers to the change as "this PR"',
		weight: -0.82,
		cap: 3,
		prose: true,
		count: matches(/\bthis (?:PR|pull request)\b/i),
	},
	{
		id: "contractions",
		description: "uses contractions (don't, it's, we'll)",
		weight: -1.37,
		cap: 6,
		prose: true,
		count: density(
			/\b\w+(?:n't|'re|'ll|'ve|'d)\b|\b(?:it's|that's|there's|let's|what's)\b/i,
		),
	},
	{
		id: "template-checkboxes",
		description: "has a checkbox list",
		weight: -0.91,
		cap: 8,
		count: matches(/^\s*[-*] \[[ x]\]/im),
	},
	{
		id: "unpunctuated-lines",
		description: "leaves sentences without final punctuation",
		weight: 0,
		cap: 5,
		count: unpunctuatedLines,
	},
	{
		id: "bare-urls",
		description: "pastes bare URLs instead of markdown links",
		weight: 0,
		cap: 4,
		prose: true,
		count: matches(/(?<![(<])https?:\/\/\S+/),
	},
	{
		id: "questions",
		description: "asks the reviewer questions",
		weight: -0.31,
		cap: 4,
		prose: true,
		count: matches(/\?(?:\s|$)/m),
	},
	{
		id: "tentative",
		description: 'is tentative or informal ("not sure", "WIP", "let me know")',
		weight: -0.94,
		cap: 3,
		prose: true,
		count: matches(
			/\b(?:WIP|not sure|I think|I guess|maybe|probably|let me know|feel free)\b/i,
		),
	},
	{
		id: "short-body",
		description: "is too short to carry agent structure",
		weight: -1.42,
		cap: 1,
		count: (text) => (text.length < 150 ? 1 : 0),
	},
];
