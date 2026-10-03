import { appendFileSync, readFileSync } from "node:fs";
//#region ../src/text.ts
const CHECKBOX_LINE = /^\s*[-*] \[[ xX]\]/;
/** Removes text the author didn't write: HTML comments and bot summaries. */
function authoredText(markdown) {
	return markdown.replace(/<!-- This is an auto-generated comment[\s\S]*?end of auto-generated comment[^>]*-->/g, "").replace(/<!--[\s\S]*?-->/g, "").trim();
}
/** Normalizes a line for template matching, ignoring ticks and strike-through. */
function templateKey(line) {
	return line.replace(/~~/g, "").replace(/\[[ xX]\]/g, "[ ]").replace(/\s+/g, " ").trim().toLowerCase();
}
/** Removes lines copied from the PR template. Checklist items stay for `template-checkboxes`. */
function withoutTemplate(text, template) {
	const templateLines = new Set(authoredText(template).split("\n").map(templateKey).filter((line) => line.length > 2));
	return text.split("\n").filter((line) => CHECKBOX_LINE.test(line) || !templateLines.has(templateKey(line))).join("\n").trim();
}
/** Blanks out code blocks and inline code. Indented list items stay. */
function prose(text) {
	return text.replace(/```[\s\S]*?```/g, "").replace(/^ {4,}(?![-*+] |\d+\. ).*$/gm, "").replace(/`[^`\n]*`/g, "X");
}
//#endregion
//#region ../src/counters.ts
/** Minimum length for densities, so one code span in a short text isn't dense. */
const MIN_DENSITY_LENGTH = 300;
function matches(pattern) {
	const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
	const globalPattern = new RegExp(pattern.source, flags);
	return (text) => text.match(globalPattern)?.length ?? 0;
}
/** Like `matches`, but skips checklist items (template wording, not the author's). */
function matchesOutsideChecklists(pattern) {
	const count = matches(pattern);
	return (text) => count(text.replace(/^\s*[-*] \[[ xX]\].*$/gm, ""));
}
/** Like `matchesOutsideChecklists`, but also skips questions and "no" answers. */
function matchesInStatements(pattern) {
	const count = matches(pattern);
	return (text) => text.split("\n").filter((line) => !/^\s*[-*] \[[ xX]\]/.test(line) && !/\?\s*(?:\*\*)?\s*$/.test(line) && !/:\s*(?:\*\*)?\s*(?:no|none|n\/a)\b/i.test(line)).reduce((sum, line) => sum + count(line), 0);
}
/** Matches per 1,000 characters. */
function density(pattern, count = matches(pattern)) {
	return (text) => {
		if (text.length === 0) return 0;
		return count(text) / Math.max(text.length, MIN_DENSITY_LENGTH) * 1e3;
	};
}
/** Like `density`, but skips checklist items. */
function densityOutsideChecklists(pattern) {
	return density(pattern, matchesOutsideChecklists(pattern));
}
/** Prose lines of 5 or more words with no final punctuation. */
function unpunctuatedLines(text) {
	const isSentence = (line) => line.split(/\s+/).length >= 5 && !/^[-*#|>\d]/.test(line);
	const isPunctuated = (line) => /[.!?:)`]$/.test(line);
	return prose(text).split("\n").map((line) => line.trim()).filter((line) => isSentence(line) && !isPunctuated(line)).length;
}
/** Prose paragraphs of 50 or more words. */
function longParagraphs(text) {
	return prose(text).split("\n").filter((line) => !/^\s*(?:[-*#|>]|\d+\.)/.test(line) && line.trim().split(/\s+/).length >= 50).length;
}
//#endregion
//#region ../src/signals.ts
const SIGNALS = [
	{
		id: "agent-attribution",
		description: "names an AI agent or carries its attribution line",
		weight: 4,
		cap: 1,
		count: matches(/Generated with \[?Claude|Co-Authored-By: (?:Claude|Copilot|Codex)|Claude-Session:|claude\.ai\/code\/session|chatgpt\.com\/codex\/tasks|\b(?:Codex|Claude|Copilot|Cursor|Devin) (?:autoreview|review|agent)\b|\bautoreview\b/i)
	},
	{
		id: "ai-disclosure",
		description: "discloses that an AI tool wrote or assisted the change",
		weight: 3,
		cap: 1,
		count: matchesInStatements(/\b(?:generated|authored|prepared|written|built|created|translated|drafted|produced|implemented)\b[^.\n]{0,30}\b(?:with|by|using|via)\b[^.\n]{0,25}\b(?:AI|LLM|Claude|Codex|Copilot|Cursor|ChatGPT|GPT-?\d|Gemini|an? (?:AI|coding) (?:assistant|agent))\b|\bAI[- ]assist(?:ed|ance)\b(?! development\b)|\bagent-assisted\b|\bwith (?:the help of )?an? AI\b|\bI used (?:Claude|Codex|Copilot|Cursor|ChatGPT|an AI)\b|\bused an AI assistant\b|^\s*(?:\*\*)?(?:Agent|AI tools? (?:and models )?used|Autonomy|Contribution source)(?:\*\*)?\s*:/im)
	},
	{
		id: "fails-before-fix",
		description: "claims tests were shown failing on the unfixed code",
		weight: .88,
		cap: 2,
		count: matches(/\b(?:fail|fails|failed|failing|red)\s+(?:on|against)\s+(?:the\s+)?(?:unfixed|unpatched|unmodified|old|original|prior|pinned|current)?\s*(?:`?main`?|`?master`?|`?dev`?|code|baseline|base|script|regex|file)\b|\bfail(?:s|ed|ing)?\b[^.\n]{0,40}\b(?:before|without) (?:the|this) (?:fix|change|patch)\b|\b(?:fail|fails|failed|times out)\b[^.\n]{0,60}\bwithout the \w+ (?:fix|change|patch)\b|\bwithout the fix\b|\bfails? before\b|\bpass(?:es)? after\b|\bpass(?:es|ed)? (?:after|with) (?:the|this) (?:fix|change|patch)\b|\bverified by reverting\b|\b(?:identically )?on (?:unmodified|unfixed|unpatched) `?(?:main|dev)`?|\ball red on\b|\bfresh-base-red\b/i)
	},
	{
		id: "git-diff-check",
		description: "reports running `git diff --check`",
		weight: 1.04,
		cap: 1,
		count: matches(/git diff --check/)
	},
	{
		id: "lint-clean",
		description: "reports a linter or type check as clean",
		weight: .4,
		cap: 2,
		count: matches(/\b(?:ruff check|tsgo|tsc --noEmit|oxlint|oxfmt|biome check|eslint)\b[^\n]{0,80}?\b(?:clean|pass(?:es|ed)?)\b|All checks passed!/i)
	},
	{
		id: "review-severity",
		description: "uses P0/P1/P2 review-severity wording",
		weight: 2,
		cap: 1,
		count: matches(/\b(?:clean|findings?) (?:through|at) P[0-3]\b|\bat P[0-3](?:\/P[0-3])?\b|\bscoped-clean\b/)
	},
	{
		id: "epistemic-hedge",
		description: "pre-empts over-reading its own evidence (\"X, not Y\")",
		weight: .5,
		cap: 2,
		count: matches(/\bnot (?:a |an )?(?:controlled|claimed|unmodified)\b|\b(?:no|not) (?:root cause|fix) (?:or fix )?is claimed\b|\bevidence, not a\b|\bnot a claim\b|\brather than a (?:harness error|fragile workaround)\b|\bfail for the reported reason\b|\b(?:was|were) not run\b|\bnot run locally\b|\bdid not run\b/i)
	},
	{
		id: "maintainer-deference",
		description: "defers decisions to a maintainer",
		weight: 1.3,
		cap: 2,
		count: matches(/\bfor a maintainer\b|\bsay the word\b|\bmaintainer[- ]requested\b|\bmaintainer'?s? (?:explicit|work order|decision)\b|\bif you would rather\b|\bjudgement call worth surfacing\b/i)
	},
	{
		id: "plan-reference",
		description: "points to a plan file or the commit message for detail",
		weight: 2.2,
		cap: 2,
		count: matches(/\b(?:SPEC|BUILD_PLAN|PLAN|TODO|CHANGES)\.md\b|\bsee (?:the )?commit message\b|\bfull (?:design rationale|details)\b/i)
	},
	{
		id: "live-verification",
		description: "describes a live or end-to-end proof run",
		weight: 1.2,
		cap: 1,
		count: matches(/\blive end-to-end\b|\bconfirmed directly\b|\blive (?:run|registry|proof|CLI proof)\b|\bdry run against\b|\b(?:existing|full unit) suite\b[^\n]{0,40}\b(?:green|passed)\b/i)
	},
	{
		id: "stacked-pr",
		description: "says it is stacked on or supersedes another PR",
		weight: .47,
		cap: 1,
		count: matches(/\bstacked on #\d+|\bsupersedes #\d+/i)
	},
	{
		id: "commit-shas",
		description: "cites commit SHAs, CI run or job IDs",
		weight: 0,
		cap: 4,
		count: matches(/\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{12,40}\b|\b(?:run|job) `?\d{9,}\b/)
	},
	{
		id: "validation-line",
		description: "has a Validation: or Tested: line with test commands",
		weight: 2,
		cap: 1,
		count: matches(/(?:Validation|Tested|Verified|Tests?):\s*(?:go test|test |bun bd test|npm test|yarn test|pnpm test|make test|\w+ test)/i)
	},
	{
		id: "verification-label",
		description: "opens a line with a Validation:, Root cause: or Fix: label",
		weight: .71,
		cap: 2,
		count: matches(/^(?:\*\*)?(?:Validation|Verification|Local checks|How I (?:checked|verified|tested)|How verified|Test plan|Testing|Tests?|Tested|Root cause|Fix|Benchmarks?)(?:\*\*)?(?: \([^)\n]*\))?(?:\*\*)?:(?:\s*$|(?:\s+\S+){8})/m)
	},
	{
		id: "test-reference",
		description: "mentions tests or regression tests",
		weight: .87,
		cap: 3,
		count: matches(/\bregression (?:tests?|coverage)\b|\btest case\b|\brun test\b|\bunit test\b|\btests? cover\b|\bregressions cover\b|\bcoverage for\b|\bcovers? (?:both|the|every)\b/i)
	},
	{
		id: "semicolons",
		description: "joins clauses with semicolons",
		weight: 2.52,
		cap: 5,
		prose: true,
		count: density(/; /)
	},
	{
		id: "code-span-density",
		description: "wraps many names in inline `code` spans",
		weight: 2.1,
		cap: 15,
		count: density(/`[^`\n]+`/)
	},
	{
		id: "bold-lead-bullets",
		description: "starts bullets or paragraphs with a **bold lead**",
		weight: .95,
		cap: 12,
		count: matches(/^\s*(?:[-*]|\d+\.) \*\*[^*\n]+\*\*|^\*\*[^*\n]{2,60}\*\*[:.]? \S/m)
	},
	{
		id: "em-dash",
		description: "uses em-dashes heavily",
		weight: 1.17,
		cap: 4,
		prose: true,
		count: density(/—/)
	},
	{
		id: "template-headings",
		description: "uses the headings agent PR templates favour",
		weight: 1.1,
		cap: 2,
		count: matches(/^#{1,4}\s*(?:Summary|Overview|TL;?DR|Verification|Validation|How (?:it was|this was|I) tested|Testing|Test plan|Tests|Evidence|Checks)\s*$/im)
	},
	{
		id: "colon-bullets",
		description: "shapes bullets as `- label: explanation`",
		weight: 1.54,
		cap: 8,
		prose: true,
		count: matches(/^\s*[-*] [^:\n]{2,40}: \S/m)
	},
	{
		id: "arrows",
		description: "uses → or -> in prose",
		weight: .77,
		cap: 8,
		prose: true,
		count: matches(/→| -> /)
	},
	{
		id: "file-paths",
		description: "names source files by path",
		weight: .79,
		cap: 5,
		count: matches(/\b[\w.-]+\/[\w./-]+\.(?:ts|tsx|js|py|rs|go|java|cs|rb|md|json|yml|yaml|toml|swift|kt|cpp|h|c)\b/)
	},
	{
		id: "scope-disclaimer",
		description: "lists what the change deliberately did not touch",
		weight: 1.86,
		cap: 3,
		prose: true,
		count: matches(/^#{1,4}\s*(?:out of scope|not in (?:this|scope)|non-goals|known limitations)\b|\b(?:are|is|remains?|stays?) (?:unaffected|unchanged|untouched)\b|\bno (?:behaviou?r|functional|user-visible|api) changes?\b|\bnothing else (?:is )?(?:touched|changed)\b|\bno (?:other|unrelated) (?:changes|files|tool)\b|\bout of scope\b|\bnot in scope\b|\bintentionally (?:not|left|kept)\b|\bdeliberately\b|\bunrelated to this change\b|\b(?:nothing|no) (?:[\w-]+ ){0,3}changes\b|\bstays? the same\b|\bas before\b|\bleft (?:unchanged|untouched)\b|\bkeeps? (?:its|their) existing\b/im)
	},
	{
		id: "test-tally",
		description: "quotes exact pass/skip/fail counts",
		weight: 1.51,
		cap: 3,
		count: matches(/\b\d[\d,]*\s*(?:tests?\s+)?(?:passed|pass(?:ing)?)\b(?:,\s*\d[\d,]*\s+(?:skipped|failed|xfailed))*|\b\d+\/\d+\s+(?:pass|passed|cases|tests)\b|\ball \d+ (?:[\w`.-]+ ){0,3}tests?\b|\b\d+ (?:[\w`.-]+ ){0,3}tests? (?:now )?pass(?:es|ed)?\b/i)
	},
	{
		id: "agent-vocabulary",
		description: "uses words agents overuse (idempotent, surfaces, invariant…)",
		weight: .51,
		cap: 4,
		prose: true,
		count: matches(/\bload-bearing\b|\bcanonical (?:owner|\w+ normalizer)\b|\b(?:existing|durable|single|shared|leaf) owner\b|\bcustody\b|\bfenc(?:e|ed|ing)\b|\binvariants?\b|\bbyte-for-byte\b|\bbyte-identical\b|\bregression controls?\b|\bpin (?:the|a) bug\b|\bidempotent\b|\bdeterministic(?:ally)?\b|\bsurfaced?\b|\bsurfaces\b|\bguards? against\b|\bverbatim\b|\bleverag(?:e|es|ing)\b|\bseamless(?:ly)?\b/i)
	},
	{
		id: "long-paragraphs",
		description: "explains in long unbroken paragraphs",
		weight: 1.44,
		cap: 2,
		count: longParagraphs
	},
	{
		id: "so-chains",
		description: "chains consequences with \", so\" more than once",
		weight: 2.04,
		cap: 3,
		prose: true,
		count: (text) => Math.max(0, matches(/, so (?!that)\w+/i)(text) - 1)
	},
	{
		id: "existing-precedent",
		description: "justifies the change by code that already does the same",
		weight: 1.2,
		cap: 2,
		prose: true,
		count: matches(/\balready (?:uses|does|has|had|takes|handles|covers|sends|emits|exists?)\b|\bthe same (?:\w+ ){1,4}(?:already|as)\b/i)
	},
	{
		id: "now-verbs",
		description: "states what the code \"now does\" after the change",
		weight: 1.86,
		cap: 3,
		prose: true,
		count: matches(/\bnow \w+s\b/i)
	},
	{
		id: "tables",
		description: "lays information out in markdown tables",
		weight: .95,
		cap: 20,
		count: matches(/^\|.*\|\s*$/m)
	},
	{
		id: "first-person",
		description: "writes in the first person (I, my, me)",
		weight: -1.01,
		cap: 7,
		prose: true,
		count: densityOutsideChecklists(/\b(?:I|I'm|I've|I'd|I'll|my|me)\b/)
	},
	{
		id: "screenshots",
		description: "attaches screenshots or images",
		weight: 0,
		cap: 8,
		count: matches(/!\[[^\]]*\]\(|<img\s|user-images\.githubusercontent|github\.com\/user-attachments/i)
	},
	{
		id: "this-pr",
		description: "refers to the change as \"this PR\"",
		weight: -.04,
		cap: 3,
		prose: true,
		count: matches(/\bthis (?:PR|pull request)\b/i)
	},
	{
		id: "contractions",
		description: "uses contractions (don't, it's, we'll)",
		weight: -1.45,
		cap: 6,
		prose: true,
		count: density(/\b\w+(?:n't|'re|'ll|'ve|'d)\b|\b(?:it's|that's|there's|let's|what's)\b/i)
	},
	{
		id: "template-checkboxes",
		description: "keeps a PR template's checkbox list",
		weight: 0,
		cap: 8,
		count: matches(/^\s*[-*] \[[ x]\]/im)
	},
	{
		id: "unpunctuated-lines",
		description: "leaves sentences without final punctuation",
		weight: -.12,
		cap: 5,
		count: unpunctuatedLines
	},
	{
		id: "bare-urls",
		description: "pastes bare URLs instead of markdown links",
		weight: 0,
		cap: 4,
		prose: true,
		count: matches(/(?<![(<])https?:\/\/\S+/)
	},
	{
		id: "questions",
		description: "asks the reviewer questions",
		weight: -.23,
		cap: 4,
		prose: true,
		count: matches(/\?(?:\s|$)/m)
	},
	{
		id: "tentative",
		description: "is tentative or informal (\"not sure\", \"WIP\", \"let me know\")",
		weight: -.98,
		cap: 3,
		prose: true,
		count: matches(/\b(?:WIP|not sure|I think|I guess|maybe|probably|let me know|feel free)\b/i)
	},
	{
		id: "short-body",
		description: "is too short to carry agent structure",
		weight: -1.44,
		cap: 1,
		count: (text) => text.length < 150 ? 1 : 0
	}
];
//#endregion
//#region ../src/measure.ts
/** Runs every signal on a description, before weighting. Used by `analyzeText` and the weight fit. */
function measure(markdown, template, signals = SIGNALS) {
	const authored = authoredText(markdown ?? "");
	const text = template ? withoutTemplate(authored, template) : authored;
	const proseText = prose(text);
	const measurements = [];
	for (const signal of signals) {
		const hits = signal.count(signal.prose ? proseText : text);
		if (hits > 0) measurements.push({
			signal,
			hits,
			strength: Math.min(hits, signal.cap) / signal.cap
		});
	}
	return measurements;
}
//#endregion
//#region ../src/utils.ts
function round(n, digits = 2) {
	const factor = 10 ** digits;
	return Math.round(n * factor) / factor;
}
function sigmoid(x) {
	return 1 / (1 + Math.exp(-x));
}
//#endregion
//#region ../src/index.ts
/**
* Starting log-odds. Set so about 3% of pre-agent PRs score as AI, because a
* false accusation is worse than a miss.
*/
const BIAS = -1.99;
/**
* Guesses whether a PR description was written by an AI agent.
*
* Pass the repo's PR template if you have it, so its headings and checklists
* don't count against the author.
*
* @example
* const { verdict, confidence } = analyzeText(pr.body ?? "", { template });
*/
function analyzeText(markdown, options = {}) {
	let logit = BIAS;
	const signals = [];
	const active = SIGNALS.filter((signal) => signal.weight !== 0);
	for (const { signal, hits, strength } of measure(markdown, options.template, active)) {
		const contribution = signal.weight * strength;
		logit += contribution;
		signals.push({
			id: signal.id,
			description: signal.description,
			hits: round(hits),
			contribution: round(contribution)
		});
	}
	signals.sort((a, b) => b.contribution - a.contribution);
	const probability = sigmoid(logit);
	const verdict = probability >= .5 ? "ai" : "human";
	return {
		verdict,
		probability: round(probability, 3),
		confidence: round(verdict === "ai" ? probability : 1 - probability, 3),
		signals
	};
}
//#endregion
//#region index.ts
/** Where GitHub looks for a PR template, in order. */
const TEMPLATE_PATHS = [
	".github/pull_request_template.md",
	".github/PULL_REQUEST_TEMPLATE.md",
	"pull_request_template.md",
	"PULL_REQUEST_TEMPLATE.md",
	"docs/pull_request_template.md",
	"docs/PULL_REQUEST_TEMPLATE.md"
];
/** Reads an input the way the runner passes it: `INPUT_<NAME>` with spaces as underscores. */
function input(name) {
	return (process.env[`INPUT_${name.replace(/ /g, "_").toUpperCase()}`] ?? "").trim();
}
function setOutput(name, value) {
	const file = process.env.GITHUB_OUTPUT;
	if (!file) return;
	const delimiter = `interlinked_${Math.random().toString(36).slice(2)}`;
	appendFileSync(file, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
}
function summary(markdown) {
	const file = process.env.GITHUB_STEP_SUMMARY;
	if (file) appendFileSync(file, `${markdown}\n`);
}
const API = process.env.GITHUB_API_URL ?? "https://api.github.com";
function api(path, init = {}) {
	const token = input("github-token");
	return fetch(`${API}${path}`, {
		...init,
		headers: {
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28",
			...token ? { Authorization: `Bearer ${token}` } : {},
			...init.headers
		}
	});
}
/** The template as of the PR's base, so a PR can't edit it to dodge signals. */
async function fetchTemplate(repo, ref) {
	for (const path of TEMPLATE_PATHS) {
		const response = await api(`/repos/${repo}/contents/${path}?ref=${ref}`, { headers: { Accept: "application/vnd.github.raw+json" } });
		if (response.ok) return response.text();
	}
}
async function syncLabel(repo, number, isAi) {
	const label = input("label");
	if (!label) return;
	const path = `/repos/${repo}/issues/${number}/labels`;
	const response = isAi ? await api(path, {
		method: "POST",
		body: JSON.stringify({ labels: [label] })
	}) : await api(`${path}/${encodeURIComponent(label)}`, { method: "DELETE" });
	if (!response.ok && response.status !== 404) console.log(`::warning::Couldn't update label "${label}": ${response.status} ${await response.text()}`);
}
/** Wraps the analysis in the PR body so reruns replace it instead of stacking. */
const START = "<!-- interlinked:start -->";
const END = "<!-- interlinked:end -->";
const BLOCK = new RegExp(`\\n*${START}[\\s\\S]*?${END}\\n*`, "g");
/** The body without our block, so it never counts toward the score. */
function stripBlock(body) {
	return body.replace(BLOCK, "\n").trimEnd();
}
function render(result) {
	const score = Math.round(result.probability * 100);
	const lines = [`**interlinked:** ${result.verdict === "ai" ? "🤖 Reads like an agent wrote it" : "👤 Reads like a person wrote it"} · agent-style score ${score}/100`];
	if (result.signals.length > 0) {
		lines.push("", "<details><summary>Signals</summary>", "", "| Signal | Hits | Contribution |", "| --- | --- | --- |");
		for (const signal of result.signals) lines.push(`| ${signal.description} | ${signal.hits} | ${signal.contribution > 0 ? "+" : ""}${signal.contribution} |`);
		lines.push("", "</details>");
	}
	return lines.join("\n");
}
async function injectIntoBody(repo, pull, description, analysis) {
	const body = `${description}\n\n${START}\n---\n\n${analysis}\n${END}\n`;
	if (body === pull.body) return;
	const response = await api(`/repos/${repo}/pulls/${pull.number}`, {
		method: "PATCH",
		body: JSON.stringify({ body })
	});
	if (!response.ok) console.log(`::warning::Couldn't update the PR description: ${response.status} ${await response.text()}`);
}
/** Writing back is best effort. The outputs and summary still stand. */
function warn(error) {
	console.log(`::warning::${error.message}`);
}
async function run() {
	const eventPath = process.env.GITHUB_EVENT_PATH;
	if (!eventPath) throw new Error("GITHUB_EVENT_PATH is not set. Is this running in Actions?");
	const event = JSON.parse(readFileSync(eventPath, "utf8"));
	const pull = event.pull_request;
	if (!pull) {
		console.log("::warning::No pull request in this event. Run on pull_request or pull_request_target.");
		return;
	}
	const repo = event.repository.full_name;
	const template = await fetchTemplate(repo, pull.base.sha).catch(() => void 0);
	const description = stripBlock(pull.body ?? "");
	const result = analyzeText(description, { template });
	console.log(`#${pull.number}: ${result.verdict} (probability ${result.probability})`);
	setOutput("verdict", result.verdict);
	setOutput("probability", String(result.probability));
	setOutput("confidence", String(result.confidence));
	setOutput("signals", JSON.stringify(result.signals));
	const analysis = render(result);
	summary(analysis);
	if (input("update-description") !== "false") await injectIntoBody(repo, pull, description, analysis).catch(warn);
	await syncLabel(repo, pull.number, result.verdict === "ai").catch(warn);
	if (result.verdict === "ai" && input("fail-on-ai") === "true") {
		console.log("::error::The PR description reads as agent-written.");
		process.exitCode = 1;
	}
}
run().catch((error) => {
	console.log(`::error::${error.message}`);
	process.exitCode = 1;
});
//#endregion
export {};
