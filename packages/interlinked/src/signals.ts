import {
  type Counter,
  atLeast,
  beyond,
  density,
  either,
  longParagraphs,
  matches,
  matchesInStatements,
  matchesOutsideChecklists,
  perLength,
  tidyLines,
  unpunctuatedLines,
} from './counters'

export interface Signal {
  id: string
  description: string
  /** Positive leans agent, negative human, 0 is off. Set by `scripts/fit-weights.ts`. */
  weight: number
  /** Hits at full strength. */
  cap: number
  /** Count prose only, without code. */
  prose?: boolean
  /** Without ranges, the signal is about the whole text. */
  count: Counter | ((text: string) => number)
}

export const SIGNALS: Signal[] = [
  {
    id: 'agent-attribution',
    description: 'names an AI agent or carries its attribution line',
    weight: 4,
    cap: 1,
    count: matches(
      /Generated with \[?Claude|Co-Authored-By: (?:Claude|Copilot|Codex)|Claude-Session:|claude\.ai\/code\/session|chatgpt\.com\/codex\/tasks|\b(?:Codex|Claude|Copilot|Cursor|Devin) (?:autoreview|review|agent)\b|\bautoreview\b|\bMade with \[?Cursor\b/i,
    ),
  },
  {
    id: 'ai-disclosure',
    description: 'discloses that an AI tool wrote or assisted the change',
    weight: 3,
    cap: 1,
    count: either(
      matchesInStatements(
        /\b(?:generated|authored|prepared|written|built|created|translated|drafted|produced|implemented)\b[^.\n]{0,30}\b(?:with|by|using|via)\b[^.\n]{0,25}\b(?:AI|LLM|Claude|Codex|Copilot|Cursor|ChatGPT|GPT-?\d|Gemini|an? (?:AI|coding) (?:assistant|agent))\b|\bAI[- ]assist(?:ed|ance)\b(?! development\b)|\bagent-assisted\b|\bwith (?:the help of )?an? AI\b|\bI used (?:Claude|Codex|Copilot|Cursor|ChatGPT|an AI)\b|\bused an AI assistant\b|\bAI[- ]generated (?:description|summary|PR|pull request|code|changes?|patch)\b|\bpair[- ]programmed with (?:an? )?(?:AI|Claude|Codex|Copilot|Cursor|ChatGPT)\b|\b(?:an? )?(?:AI|LLM)(?: agent| tool| assistant)? was used\b|\bhad (?:an? )?AI\b|^\s*Assisted-by:\s*(?:AI|LLM|Claude|Codex|Copilot|Cursor|ChatGPT|GPT-?\d|Gemini|Devin)\b|^#{1,4}\s*AI (?:disclosure|usage|assistance)\b|^\s*(?:\*\*)?(?:Agent|Agent-Owner|AI tools? (?:and models )?used|AI (?:tool )?(?:use|usage)(?: disclosure)?|AI disclosure|Code assistance|Autonomy|Contribution source)(?:\*\*)?\s*:/im,
      ),
      matches(/^\s*[-*] \[[xX]\] I _?did_? use AI\b/im),
    ),
  },
  {
    id: 'fails-before-fix',
    description: 'claims tests were shown failing on the unfixed code',
    weight: 1.02,
    cap: 2,
    count: matches(
      /\b(?:fail|fails|failed|failing|red)\s+(?:on|against)\s+(?:the\s+)?(?:unfixed|unpatched|unmodified|old|original|prior|pinned|current)?\s*(?:`?main`?|`?master`?|`?dev`?|code|baseline|base|script|regex|file)\b|\bfail(?:s|ed|ing)?\b[^.\n]{0,40}\b(?:before|without) (?:the|this) (?:fix|change|patch)\b|\b(?:fail|fails|failed|times out)\b[^.\n]{0,60}\bwithout the \w+ (?:fix|change|patch)\b|\bwithout the fix\b|\bfails? before\b|\bpass(?:es)? after\b|\bpass(?:es|ed)? (?:after|with) (?:the|this) (?:fix|change|patch)\b|\bverified by reverting\b|\b(?:identically )?on (?:unmodified|unfixed|unpatched) `?(?:main|dev)`?|\ball red on\b|\bfresh-base-red\b/i,
    ),
  },
  {
    id: 'git-diff-check',
    description: 'reports running `git diff --check`',
    weight: 0.4,
    cap: 1,
    count: matches(/git diff --check/),
  },
  {
    id: 'lint-clean',
    description: 'reports a linter or type check as clean',
    weight: 0.25,
    cap: 2,
    count: matches(
      /\b(?:ruff check|tsgo|tsc --noEmit|oxlint|oxfmt|biome check|eslint)\b[^\n]{0,80}?\b(?:clean|pass(?:es|ed)?)\b|All checks passed!/i,
    ),
  },
  {
    id: 'review-severity',
    description: 'uses P0/P1/P2 review-severity wording',
    weight: 2,
    cap: 1,
    count: matches(
      /\b(?:clean|findings?) (?:through|at) P[0-3]\b|\bat P[0-3](?:\/P[0-3])?\b|\bscoped-clean\b/,
    ),
  },
  {
    id: 'epistemic-hedge',
    description: 'pre-empts over-reading its own evidence ("X, not Y")',
    weight: 0.27,
    cap: 2,
    count: matches(
      /\bnot (?:a |an )?(?:controlled|claimed|unmodified)\b|\b(?:no|not) (?:root cause|fix) (?:or fix )?is claimed\b|\bevidence, not a\b|\bnot a claim\b|\brather than a (?:harness error|fragile workaround)\b|\bfail for the reported reason\b|\b(?:was|were) not run\b|\bnot run locally\b|\bdid not run\b/i,
    ),
  },
  {
    id: 'maintainer-deference',
    description: 'defers decisions to a maintainer',
    weight: 0.38,
    cap: 2,
    count: matches(
      /\bfor a maintainer\b|\bsay the word\b|\bmaintainer[- ]requested\b|\bmaintainer'?s? (?:explicit|work order|decision)\b|\bif you would rather\b|\bjudgement call worth surfacing\b/i,
    ),
  },
  {
    id: 'plan-reference',
    description: 'points to a plan file or the commit message for detail',
    weight: 0.1,
    cap: 2,
    count: matches(
      /\b(?:SPEC|BUILD_PLAN|PLAN|TODO|CHANGES)\.md\b|\bsee (?:the )?commit message\b|\bfull (?:design rationale|details)\b/i,
    ),
  },
  {
    id: 'live-verification',
    description: 'describes a live or end-to-end proof run',
    weight: 1.2,
    cap: 1,
    count: matches(
      /\blive end-to-end\b|\bconfirmed directly\b|\blive (?:run|registry|proof|CLI proof)\b|\bdry run against\b|\b(?:existing|full unit) suite\b[^\n]{0,40}\b(?:green|passed)\b/i,
    ),
  },
  {
    id: 'stacked-pr',
    description: 'says it is stacked on or supersedes another PR',
    weight: 0.28,
    cap: 1,
    count: matches(/\bstacked on #\d+|\bsupersedes #\d+/i),
  },
  {
    id: 'commit-shas',
    description: 'cites commit SHAs, CI run or job IDs',
    weight: -0.83,
    cap: 4,
    count: matches(
      /\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{12,40}\b|\b(?:run|job) `?\d{9,}\b/,
    ),
  },
  {
    id: 'validation-line',
    description: 'has a Validation: or Tested: line with test commands',
    weight: 2,
    cap: 1,
    count: matches(
      /(?:Validation|Tested|Verified|Tests?):\s*(?:go test|test |bun bd test|npm test|yarn test|pnpm test|make test|\w+ test)/i,
    ),
  },
  {
    id: 'verification-label',
    description: 'opens a line with a Validation:, Root cause: or Fix: label',
    weight: 0.51,
    cap: 2,
    count: matches(
      /^(?:\*\*)?(?:Validation|Verification|Local checks|How I (?:checked|verified|tested)|How verified|Test plan|Testing|Tests?|Tested|Root cause|Fix|Benchmarks?)(?:\*\*)?(?: \([^)\n]*\))?(?:\*\*)?:(?:\s*$|(?:\s+\S+){8})/m,
    ),
  },
  {
    id: 'test-reference',
    description: 'mentions tests or regression tests',
    weight: 0.62,
    cap: 3,
    count: matches(
      /\bregression (?:tests?|coverage)\b|\btest case\b|\brun test\b|\bunit test\b|\btests? cover\b|\bregressions cover\b|\bcoverage for\b|\bcovers? (?:both|the|every)\b/i,
    ),
  },

  // Style that leans agent-written.
  {
    id: 'semicolons',
    description: 'joins clauses with semicolons',
    weight: 2.73,
    cap: 4,
    prose: true,
    count: perLength(matches(/; /)),
  },
  {
    id: 'code-span-density',
    description: 'wraps many names in inline `code` spans',
    weight: 1.36,
    cap: 12,
    count: beyond(
      atLeast(density(matchesOutsideChecklists(/`[^`\n]+`/)), 3),
      3,
    ),
  },
  {
    id: 'bold-lead-bullets',
    description: 'starts bullets or paragraphs with a **bold lead**',
    weight: 2.52,
    cap: 12,
    count: perLength(
      matches(
        /^\s*(?:[-*]|\d+\.) \*\*[^*\n]+\*\*|^\*\*[^*\n]{2,60}\*\*[:.]? \S/m,
      ),
    ),
  },
  {
    id: 'em-dash',
    description: 'uses em-dashes heavily',
    weight: 4,
    cap: 4,
    prose: true,
    count: density(matches(/—/)),
  },
  {
    id: 'template-headings',
    description: 'uses the headings agent PR templates favour',
    weight: 1.92,
    cap: 2,
    count: matches(
      /^#{1,4}\s*(?:Summary|Overview|TL;?DR|Verification|Validation|How (?:it was|this was|I) tested|Testing|Test plan|Tests|Evidence|Checks)\s*$/im,
    ),
  },
  {
    id: 'colon-bullets',
    description: 'shapes bullets as `- label: explanation`',
    weight: 1.51,
    cap: 8,
    prose: true,
    count: perLength(matches(/^\s*[-*] [^:\n]{2,40}: \S/m)),
  },
  {
    id: 'arrows',
    description: 'uses → or -> in prose',
    weight: 0.9,
    cap: 8,
    prose: true,
    count: perLength(matches(/→| -> /)),
  },
  {
    id: 'file-paths',
    description: 'names source files by path',
    weight: 0,
    cap: 5,
    count: matches(
      /\b[\w.-]+\/[\w./-]+\.(?:ts|tsx|js|py|rs|go|java|cs|rb|md|json|yml|yaml|toml|swift|kt|cpp|h|c)\b/,
    ),
  },
  {
    id: 'scope-disclaimer',
    description: 'lists what the change deliberately did not touch',
    weight: 1.33,
    cap: 3,
    prose: true,
    count: matches(
      /^#{1,4}\s*(?:out of scope|not in (?:this|scope)|non-goals|known limitations)\b|\b(?:are|is|remains?|stays?) (?:unaffected|unchanged|untouched)\b|\bno (?:behaviou?r|functional|user-visible|api) changes?\b|\bnothing else (?:is )?(?:touched|changed)\b|\bno (?:other|unrelated) (?:changes|files|tool)\b|\bout of scope\b|\bnot in scope\b|\bintentionally (?:not|left|kept)\b|\bdeliberately\b|\bunrelated to this change\b|\b(?:nothing|no) (?:[\w-]+ ){0,3}changes\b|\bstays? the same\b|\bas before\b|\bleft (?:unchanged|untouched)\b|\bkeeps? (?:its|their) existing\b/im,
    ),
  },
  {
    id: 'test-tally',
    description: 'quotes exact pass/skip/fail counts',
    weight: 0.64,
    cap: 3,
    count: matches(
      /\b\d[\d,]*\s*(?:tests?\s+)?(?:passed|pass(?:ing)?)\b(?:,\s*\d[\d,]*\s+(?:skipped|failed|xfailed))*|\b\d+\/\d+\s+(?:pass|passed|cases|tests)\b|\ball \d+ (?:[\w`.-]+ ){0,3}tests?\b|\b\d+ (?:[\w`.-]+ ){0,3}tests? (?:now )?pass(?:es|ed)?\b/i,
    ),
  },
  {
    id: 'agent-vocabulary',
    description: 'uses words agents overuse (idempotent, surfaces, invariant…)',
    weight: 1.08,
    cap: 4,
    prose: true,
    count: perLength(
      matches(
        /\bload-bearing\b|\bcanonical (?:owner|\w+ normalizer)\b|\b(?:existing|durable|single|shared|leaf) owner\b|\bcustody\b|\bfenc(?:e|ed|ing)\b|\binvariants?\b|\bbyte-for-byte\b|\bbyte-identical\b|\bregression controls?\b|\bpin (?:the|a) bug\b|\bidempotent\b|\bdeterministic(?:ally)?\b|\bsurfaced?\b|\bsurfaces\b|\bguards? against\b|\bverbatim\b|\bleverag(?:e|es|ing)\b|\bseamless(?:ly)?\b|\bsilently\b/i,
      ),
    ),
  },
  {
    id: 'long-paragraphs',
    description: 'explains in long unbroken paragraphs',
    weight: 0,
    cap: 2,
    count: longParagraphs,
  },
  {
    id: 'so-chains',
    description: 'chains consequences with ", so" more than once',
    weight: 1.56,
    cap: 3,
    prose: true,
    count: perLength(beyond(matches(/, so (?!that)\w+/i), 1)),
  },
  {
    id: 'existing-precedent',
    description: 'justifies the change by code that already does the same',
    weight: 0.57,
    cap: 2,
    prose: true,
    count: matches(
      /\balready (?:uses|does|has|had|takes|handles|covers|sends|emits|exists?)\b|\bthe same (?:\w+ ){1,4}(?:already|as)\b/i,
    ),
  },
  {
    id: 'now-verbs',
    description: 'states what the code "now does" after the change',
    weight: 1.44,
    cap: 3,
    prose: true,
    count: perLength(matches(/\bnow \w+(?:s|ed)\b/i)),
  },
  {
    id: 'tables',
    description: 'lays information out in markdown tables',
    weight: 0.53,
    cap: 20,
    count: matches(/^\|.*\|\s*$/m),
  },
  {
    id: 'tidy-prose',
    description: 'writes every sentence capitalized and punctuated',
    weight: 0,
    cap: 4,
    count: tidyLines,
  },
  {
    id: 'existing-reference',
    description: 'points at "the existing" code it builds on',
    weight: 1.51,
    cap: 3,
    prose: true,
    count: matches(/\bthe existing\b/i),
  },
  {
    id: 'unchanged-claims',
    description: 'says what stays unchanged or unaffected',
    weight: 1.16,
    cap: 2,
    prose: true,
    count: matches(/\bunchanged\b|\bunaffected\b/i),
  },
  {
    id: 'which-clauses',
    description: 'explains through ", which does…" clauses',
    weight: 0,
    cap: 3,
    prose: true,
    count: perLength(matches(/, which \w+s\b/i)),
  },
  {
    id: 'contrast-phrases',
    description: 'contrasts with "rather than"',
    weight: 0.58,
    cap: 3,
    prose: true,
    count: perLength(matches(/\brather than\b/i)),
  },
  {
    id: 'imperative-sentences',
    description: 'gives the change as imperative sentences mid-paragraph',
    weight: 0.76,
    cap: 3,
    prose: true,
    count: matches(
      /[.:] (?:Add|Remove|Use|Preserve|Keep|Update|Replace|Return|Reject|Skip|Make|Move|Pass|Clear|Show|Match|Mark|Restore|Retain|Expire|Give|Check|Raise|Wrap|Select|Treat|Record|Validate|Extend|Allow|Prevent|Avoid|Drop|Ignore|Honor|Load|Emit|Render|Set|Document|Regenerate|Guard|Handle|Normalize|Resolve|Reuse|Apply|Cover|Stop|Start|Expose|Accept|Require) (?:the|a|an|each|every|all|both|this|that|its|their|X|[a-z]+s)\b/,
    ),
  },
  {
    id: 'plan-headings',
    description:
      'plans in headings like Acceptance Criteria, Scope or Next Steps',
    weight: 3.14,
    cap: 3,
    count: matches(
      /^#{1,4}\s*(?:\p{Extended_Pictographic}\uFE0F?\s*)?(?:Acceptance Criteria|Definition of Done|Success Criteria|Priority|Scope|Dependencies|Requirements|Impact|Implementation(?: Notes| Plan| Details)?|Tasks|Problem(?: Statement)?|Related(?: Issues| PRs| Work)?|Context|Technical (?:Details|Notes)|Next Steps|Root Cause|(?:Proposed )?Fix|Changes Made|Files (?:Changed|Modified))\s*:?\s*$/imu,
    ),
  },
  {
    id: 'sentence-bullets',
    description:
      'writes bullets as full sentences, capitalized and ending in a period',
    weight: 1.31,
    cap: 5,
    prose: true,
    count: perLength(
      beyond(
        matches(
          /^\s*(?:[-*]|\d+\.) (?!\[[ xX]\])(?:\*\*[^*\n]+\*\*:? )?[A-Z`X][^\n]{20,}\.$/m,
        ),
        1,
      ),
    ),
  },
  {
    id: 'colon-lists',
    description: 'introduces list after list with a sentence ending in a colon',
    weight: 0,
    cap: 2,
    prose: true,
    count: beyond(matches(/[a-z)`X]:\n\n?\s*(?:[-*]|\d+\.) /), 1),
  },
  {
    id: 'engineering-jargon',
    description:
      'explains in the terms agents lean on (callers, fallback, preserves, downstream)',
    weight: 1.88,
    cap: 4,
    prose: true,
    count: perLength(
      matches(
        /\bpreserv(?:e|es|ed|ing)\b|\bcallers?\b|\bcall[- ]sites?\b|\bfall ?backs?\b|\bdownstream\b|\bhelpers?\b|\broot cause\b|\bcleanly\b|\bcomprehensive\b/i,
      ),
    ),
  },
  {
    id: 'emoji-markers',
    description: 'marks headings, bullets or lines with emoji (✅ 🎯 📋)',
    weight: 0.89,
    cap: 4,
    prose: true,
    count: matches(
      /^\s*(?:#{1,6}\s*|[-*+]\s+|\d+\.\s+)?(?:\*\*)?\p{Extended_Pictographic}/mu,
    ),
  },

  {
    id: 'coined-compounds',
    description:
      'coins hyphenated compounds ("connected-account identifier", "scheduler-read layer")',
    weight: 2.93,
    cap: 4,
    prose: true,
    count: perLength(
      matches(
        /(?<!\b(?:to|can|will|could|should|would|must|may|might|cannot|please|and) )\b(?!(?:non|pre|post|multi|sub|anti|self|semi|cross|inter|over|under|mid|near|well|all|half|full|high|low|long|short|first|second|third|one|two|three|single|double|top|built|opt|follow|end|open|real|read|write|out|back|front|server|client|user|case|time|best|worst|last|next|old|new|hard|soft|fine|hand|cherry|drag|drop|pull|push|log|sign|check|look|set|plug|add|edge|cut|break|start|stand|step|dry|live|auto|per|unit|thread|zero|too|docker|pkg|chicken)-)[a-z]{3,}-(?!(?:based|like|level|side|specific|related|aware|friendly|safe|only|free|wide|style|time|end|ins?|ups?|out|off)\b)[a-z]{3,}(?:-[a-z]{3,})? (?!(?:should|would|could|will|that|which|when|where|there|have|this|these|those|with|from|into|than|then|because|about|also|instead|after|before|while|support|here)\b)[a-z]{4,}\b/,
      ),
    ),
  },
  {
    id: 'animate-code',
    description:
      'gives code a will of its own ("X swallows the error", "the parser decides")',
    weight: 0.4,
    cap: 2,
    prose: true,
    count: matches(
      /(?:\bX(?:\(\))?|\b[Tt]he (?:function|method|helper|parser|hook|test|code|check|handler|client|server|middleware|loop|cache|resolver|wrapper|guard|script|CLI|endpoint|query|API|component|module|class|caller|callee|runtime|compiler|linter|builder|loader|reader|writer|worker|scheduler|router|store|config|validator|serializer|decoder|encoder|adapter|plugin|library|SDK|daemon|watcher|fallback|codepath|code path|branch|path|regex|pattern|matcher|reducer|selector|provider|service|job|pipeline|action|workflow|build|bundler|installer|migration|schema|model|agent|tool|command|flag|option)) (?:now |just |still |already |silently |happily |then |also |only |never |always )?(?:knows?|decides?|wants?|refuses?|swallows?|eats|sees|thinks?|believes?|expects?|insists?|tries|tells?|complains?|cares?|trusts?|forgets?|remembers?|notices?|assumes?|lies|agrees?|owns?|learns?|promises?|pretends?|gives up|chooses?|prefers?|understands?|realizes?|worries|lives|dies|sits|wins|loses|survives?|hides?|leaks?|honou?rs?|respects?|ignores?|tolerates?|accepts?|rejects?|treats?|considers?)\b/,
    ),
  },
  {
    id: 'denominal-verbs',
    description:
      'turns nouns into verbs ("pins the check", "keyed on", "gated behind")',
    weight: 0.9,
    cap: 2,
    prose: true,
    count: matches(
      /\b(?:pins? (?:the|it|its|this|that|each|every|down)|pinned (?:to|at)|keyed (?:by|on)|gat(?:es|ed|ing) (?:on|behind|by)|scop(?:es|ed|ing) (?:the|it|this|to)|thread(?:s|ed|ing)? (?:\w+ ){0,3}through|wir(?:es|ed|ing) (?:up|in|into|through)|plumb(?:s|ed|ing)? (?:\w+ ){0,2}(?:through|into)|funnel(?:s|ed|ing) (?:through|into)|short-circuits?|bubbl(?:es|ed|ing) up|backfill(?:s|ed|ing))\b/i,
    ),
  },

  // Conversation that leans agent-written, from agent accounts' issues and replies.
  {
    id: 'status-openers',
    description:
      'opens a paragraph with a bare status verb ("Rebased onto…", "Addressed in…")',
    weight: 1.76,
    cap: 2,
    prose: true,
    count: matches(
      /^(?:Rebased|Dropped|Verified|Investigated|Pushed|Addressed|Reworked|Restored|Confirmed|Re-?ran|Kept|Tightened|Narrowed|Folded|Landed|Withdrawing|Superseded by|Closing (?:this|as|in favou?r|for now))\b/m,
    ),
  },
  {
    id: 'review-pleasantries',
    description:
      'answers review with stock courtesies ("You\'re right", "Good catch", "gentle ping")',
    weight: 2.09,
    cap: 2,
    prose: true,
    count: matches(
      /\byou['’]re (?:absolutely )?(?:right|correct)\b|\b(?:good|great|nice) catch\b|\bfair (?:point|question)\b|\bthanks? (?:you )?for (?:the |your )?(?:review|feedback|clarification|follow-up|pointer|heads[- ]up|careful|thorough|detailed|quick|precise|thoughtful|taking the time)\b|\bappreciate (?:the|you|your)\b|\b(?:gentle|friendly) (?:ping|nudge|bump|reminder)\b|\bwhen(?:ever)? you (?:have|get) a (?:moment|chance)\b/i,
    ),
  },
  {
    id: 'happy-to',
    description: 'offers to do more ("happy to adjust")',
    weight: 1.75,
    cap: 2,
    prose: true,
    count: matches(/\bhappy to\b/i),
  },
  {
    id: 'maintainer-mention',
    description: 'writes to or about "the maintainers"',
    weight: 0.95,
    cap: 2,
    prose: true,
    count: matches(/\bmaintainers?\b/i),
  },
  {
    id: 'work-claim',
    description: 'claims the issue ("I can take this", "/claim #12")',
    weight: 1.12,
    cap: 1,
    prose: true,
    count: matches(
      /\bI can take (?:this|a look|it)\b|\bI['’]d like to (?:take|work on|pick up|tackle) (?:this|it)\b|\bI['’]ll take (?:this|it)(?: on)?\b|\bI['’]m picking this up\b|\bclaiming\b|\/(?:claim|attempt) #?\d+/i,
    ),
  },
  {
    id: 'workflow-vocabulary',
    description:
      'uses contribution jargon ("follow-up", "rebased onto", "focused PR", "regression test")',
    weight: 1.6,
    cap: 3,
    prose: true,
    count: matches(
      /\bfollow-up\b|\brebased (?:on|onto)\b|\b(?:small|minimal|narrow|focused|scoped)(?:,? (?:scoped|focused))? (?:PR|fix|change|patch)\b|\bkeep (?:it|this|the (?:fix|change|PR)) (?:scoped|focused|minimal|narrow|small)\b|\bregression (?:test|coverage)\b/i,
    ),
  },
  {
    id: 'ci-green',
    description: 'reports CI or checks as green',
    weight: 1.18,
    cap: 2,
    prose: true,
    count: matches(
      /\b(?:CI|checks?|tests?|suite|jobs?|builds?|legs?)\b[^.\n]{0,25}?\b(?:green|passing)\b|\ball (?:\d+ )?(?:checks|jobs) (?:pass|are green)\b/i,
    ),
  },
  {
    id: 'evidence-claims',
    description: 'weighs what is "established", "demonstrated" or "claimed"',
    weight: 0.57,
    cap: 3,
    prose: true,
    count: matches(
      /\bclaimed\b|\b(?:is|are|was|were|been|isn['’]t|aren['’]t|not) (?:yet )?established\b|\bestablish(?:es|ed)? (?:that|whether|an? (?:real|genuine|concrete|exploitable))\b|\bdemonstrat(?:e|es|ed|ing)\b|\bconcrete\b|\bsubstantiat\w+|\boverstat\w+/i,
    ),
  },
  {
    id: 'not-contrast',
    description: 'corrects itself in passing (", not a race")',
    weight: 1.04,
    cap: 3,
    prose: true,
    count: perLength(
      matches(
        /, not (?!sure\b|yet\b|really\b|quite\b|that\b|exactly\b|to\b|so\b|much\b|necessarily\b|even\b|at all\b)(?:a |an |the |just |only )?\w+/,
      ),
    ),
  },
  {
    id: 'math-symbols',
    description: 'uses typeset symbols (≥ × ≈) in prose',
    weight: 0.63,
    cap: 3,
    prose: true,
    count: matches(/[≥≤×≈⇒≠]/),
  },
  {
    id: 'shell-escapes',
    description:
      'has stray shell escapes (`\\!`, literal `\\n`) from posting via a CLI',
    weight: 1.19,
    cap: 1,
    prose: true,
    count: matches(/\\[!`]|\\n\\n/),
  },

  // Style that leans human-written.
  {
    id: 'first-person',
    description: 'writes in the first person (I, my, me)',
    weight: -0.82,
    cap: 7,
    prose: true,
    count: density(
      matchesOutsideChecklists(/\b(?:I|I'm|I've|I'd|I'll|my|me)\b/),
    ),
  },
  {
    id: 'screenshots',
    description: 'attaches screenshots or images',
    weight: 0,
    cap: 8,
    count: matches(
      /!\[[^\]]*\]\(|<img\s|user-images\.githubusercontent|github\.com\/user-attachments/i,
    ),
  },
  {
    id: 'this-pr',
    description: 'refers to the change as "this PR"',
    weight: -0.06,
    cap: 3,
    prose: true,
    count: matches(/\bthis (?:PR|pull request)\b/i),
  },
  {
    id: 'contractions',
    description: "uses contractions (don't, it's, we'll)",
    weight: -1.32,
    cap: 6,
    prose: true,
    count: density(
      matches(
        /\b\w+(?:n't|'re|'ll|'ve|'d)\b|\b(?:it's|that's|there's|let's|what's)\b/i,
      ),
    ),
  },
  {
    id: 'template-checkboxes',
    description: 'has a checkbox list',
    weight: -0.44,
    cap: 8,
    count: matches(/^[ \t]*[-*] \[[ x]\]/im),
  },
  {
    id: 'unpunctuated-lines',
    description: 'leaves sentences without final punctuation',
    weight: -0.93,
    cap: 5,
    count: unpunctuatedLines,
  },
  {
    id: 'bare-urls',
    description: 'pastes bare URLs instead of markdown links',
    weight: -1.32,
    cap: 4,
    prose: true,
    count: matches(/(?<![(<])https?:\/\/\S+/),
  },
  {
    id: 'questions',
    description: 'asks the reviewer questions',
    weight: -1.35,
    cap: 4,
    prose: true,
    count: matches(/\?(?:\s|$)/m),
  },
  {
    id: 'tentative',
    description: 'is tentative or informal ("not sure", "WIP", "let me know")',
    weight: -2.57,
    cap: 3,
    prose: true,
    count: matches(
      /\b(?:WIP|not sure|I think|I guess|maybe|probably|let me know|feel free)\b/i,
    ),
  },
  {
    id: 'emoticons',
    description: 'uses emoticons or emoji shortcodes (":)", "lol", ":tada:")',
    weight: -1.13,
    cap: 2,
    prose: true,
    count: matches(
      /(?:^|\s)(?::\)|:-\)|:D|;\)|:\(|:P|xD)(?=\s|$|[.,!])|\blol\b|\bhaha\w*\b|\bhehe\b|:[a-z_+-]+:/im,
    ),
  },
  {
    id: 'gratitude',
    description: 'thanks someone ("thanks", "thank you", "cheers")',
    weight: 0,
    cap: 2,
    prose: true,
    count: matches(/\b(?:thanks|thank you|thx|cheers)\b/i),
  },
  {
    id: 'short-body',
    description: 'is too short to carry agent structure',
    weight: -1.62,
    cap: 1,
    count: (text) => (text.length < 150 ? 1 : 0),
  },
]
