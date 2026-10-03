import {
	type AnalyzeTextResult,
	analyzeText,
	type SignalHit,
} from "../src/index";

declare function GM_xmlhttpRequest(details: {
	method: "GET";
	url: string;
	headers?: Record<string, string>;
	onload: (response: { status: number; responseText: string }) => void;
	onerror: () => void;
}): void;
declare function GM_getValue<T>(key: string, fallback: T): T;
declare function GM_setValue(key: string, value: unknown): void;
declare function GM_registerMenuCommand(name: string, fn: () => void): void;

interface PullRef {
	owner: string;
	repo: string;
	number: string;
}

const BADGE_ID = "interlinked-badge";

/** Where GitHub looks for a PR template, in order. */
const TEMPLATE_PATHS = [
	".github/pull_request_template.md",
	".github/PULL_REQUEST_TEMPLATE.md",
	"pull_request_template.md",
	"PULL_REQUEST_TEMPLATE.md",
	"docs/pull_request_template.md",
	"docs/PULL_REQUEST_TEMPLATE.md",
];

const results = new Map<string, Promise<AnalyzeTextResult>>();
const templates = new Map<string, Promise<string | undefined>>();

function request(url: string, headers: Record<string, string> = {}) {
	return new Promise<{ status: number; text: string }>((resolve, reject) => {
		GM_xmlhttpRequest({
			method: "GET",
			url,
			headers,
			onload: (response) => {
				resolve({ status: response.status, text: response.responseText });
			},
			onerror: () => {
				reject(new Error(`Request failed: ${url}`));
			},
		});
	});
}

function parsePull(pathname: string): PullRef | undefined {
	const match = pathname.match(/^\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
	if (!match) {
		return undefined;
	}
	return { owner: match[1], repo: match[2], number: match[3] };
}

async function fetchBody({ owner, repo, number }: PullRef) {
	const headers: Record<string, string> = {
		Accept: "application/vnd.github+json",
	};
	const token = GM_getValue("token", "");
	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

	const { status, text } = await request(
		`https://api.github.com/repos/${owner}/${repo}/pulls/${number}`,
		headers,
	);
	if (status !== 200) {
		const hint = status === 403 || status === 429 ? " (rate limited?)" : "";
		throw new Error(`GitHub API ${status}${hint}`);
	}
	return (JSON.parse(text).body as string | null) ?? "";
}

async function fetchTemplate({ owner, repo }: PullRef) {
	for (const path of TEMPLATE_PATHS) {
		const { status, text } = await request(
			`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${path}`,
		);
		if (status === 200) {
			return text;
		}
	}
	return undefined;
}

function analyze(pull: PullRef) {
	const key = `${pull.owner}/${pull.repo}#${pull.number}`;
	let result = results.get(key);
	if (!result) {
		const repoKey = `${pull.owner}/${pull.repo}`;
		let template = templates.get(repoKey);
		if (!template) {
			template = fetchTemplate(pull).catch(() => undefined);
			templates.set(repoKey, template);
		}

		const pending = template;
		result = fetchBody(pull).then(async (body) =>
			analyzeText(body, { template: await pending }),
		);
		// Don't cache failures, so a later visit retries.
		result.catch(() => results.delete(key));
		results.set(key, result);
	}
	return result;
}

/** The PR description card (`#pullrequest-<id>`). */
function descriptionBox() {
	return document.querySelector<HTMLElement>('[id^="pullrequest-"]');
}

/** Bottom-right of the description box. */
const INLINE_STYLE = {
	position: "absolute",
	right: "8px",
	bottom: "8px",
	zIndex: "1",
	boxShadow: "0 1px 3px rgba(0, 0, 0, 0.12)",
};

/** Bottom-right of the window, when there's no description box. */
const FLOATING_STYLE = {
	position: "fixed",
	right: "16px",
	bottom: "16px",
	zIndex: "2147483647",
	boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
};

function badge() {
	let element = document.getElementById(BADGE_ID);
	if (!element) {
		element = document.createElement("div");
		element.id = BADGE_ID;
		Object.assign(element.style, {
			maxWidth: "360px",
			padding: "8px 12px",
			borderRadius: "6px",
			border: "1px solid var(--borderColor-default, #d0d7de)",
			background: "var(--bgColor-default, #fff)",
			color: "var(--fgColor-default, #1f2328)",
			font: "12px/1.5 -apple-system, BlinkMacSystemFont, sans-serif",
			cursor: "pointer",
		});
	}

	const box = descriptionBox();
	const host = box ?? document.body;
	if (element.parentElement !== host) {
		host.append(element);
	}
	if (box && getComputedStyle(box).position === "static") {
		box.style.position = "relative";
	}
	Object.assign(element.style, box ? INLINE_STYLE : FLOATING_STYLE);
	return element;
}

/** Redraws the last state. GitHub can replace <body> and drop the badge. */
let redraw: (() => void) | undefined;

function renderMessage(message: string) {
	redraw = () => renderMessage(message);
	const element = badge();
	element.replaceChildren(message);
	element.onclick = null;
}

/** Signals where the author openly says an agent helped. */
const DISCLOSURES = new Set(["agent-attribution", "ai-disclosure"]);

/** Turns a result into a label. The score isn't a probability, so the label says how the text reads. */
function describe(result: AnalyzeTextResult) {
	if (result.signals.some((s) => DISCLOSURES.has(s.id) && s.contribution > 0)) {
		return {
			label: "🤖 Says an AI tool helped write it",
			color: "var(--fgColor-danger, #d1242f)",
		};
	}
	if (result.probability >= 0.8) {
		return {
			label: "🤖 Reads like an agent wrote it",
			color: "var(--fgColor-danger, #d1242f)",
		};
	}
	if (result.probability >= 0.5) {
		return {
			label: "🤔 Some agent-style writing",
			color: "var(--fgColor-attention, #9a6700)",
		};
	}
	return {
		label: "👤 Reads like a person wrote it",
		color: "var(--fgColor-success, #1a7f37)",
	};
}

/** Signal strength in words. The raw number is in the tooltip. */
function strength(contribution: number) {
	const size = Math.abs(contribution);
	if (size >= 1.5) {
		return "strong";
	}
	if (size >= 0.6) {
		return "moderate";
	}
	return "slight";
}

/** Capitalizes a description and strips markdown. */
function sentence(description: string) {
	const plain = description.replace(/`|\*\*/g, "");
	return plain.charAt(0).toUpperCase() + plain.slice(1);
}

function paragraph(text: string) {
	const element = document.createElement("div");
	element.style.marginTop = "6px";
	element.textContent = text;
	return element;
}

function signalList(heading: string, signals: SignalHit[]) {
	const section = paragraph(heading);
	section.style.fontWeight = "600";

	const list = document.createElement("ul");
	Object.assign(list.style, {
		margin: "2px 0 0",
		paddingLeft: "16px",
		fontWeight: "normal",
	});
	// Strongest first, in either direction.
	const sorted = [...signals].sort(
		(a, b) => Math.abs(b.contribution) - Math.abs(a.contribution),
	);
	for (const signal of sorted) {
		const item = document.createElement("li");
		const muted = document.createElement("span");
		muted.style.color = "var(--fgColor-muted, #59636e)";
		muted.textContent = ` · ${strength(signal.contribution)}`;
		item.append(sentence(signal.description), muted);
		item.title = `${signal.id}: ${signal.contribution > 0 ? "+" : ""}${signal.contribution} (${signal.hits} hits)`;
		list.append(item);
	}
	section.append(list);
	return section;
}

function renderResult(result: AnalyzeTextResult) {
	redraw = () => renderResult(result);
	const element = badge();
	const { label, color } = describe(result);
	const score = Math.round(result.probability * 100);

	const summary = document.createElement("div");
	summary.style.fontWeight = "600";
	summary.style.color = color;
	summary.textContent = label;

	const note = document.createElement("div");
	note.style.color = "var(--fgColor-muted, #59636e)";
	note.textContent = `agent-style score ${score}/100 · click for signals`;
	element.title =
		"How much the description's writing looks like an agent's, not a probability. " +
		"About 3% of PRs from before coding agents score 50 or more.";

	const details = document.createElement("div");
	details.style.display = "none";
	const toAgent = result.signals.filter((s) => s.contribution > 0);
	const toHuman = result.signals.filter((s) => s.contribution < 0);
	if (toAgent.length > 0) {
		details.append(signalList("Sounds like an agent", toAgent));
	}
	if (toHuman.length > 0) {
		details.append(signalList("Sounds like a person", toHuman));
	}
	if (result.signals.length === 0) {
		details.append(
			paragraph("Nothing stood out either way, so it leans on the default."),
		);
	}

	element.replaceChildren(summary, note, details);
	element.onclick = () => {
		details.style.display = details.style.display === "none" ? "block" : "none";
	};
}

let current: string | undefined;

async function update() {
	const pull = parsePull(location.pathname);
	const key = pull && `${pull.owner}/${pull.repo}#${pull.number}`;
	if (key === current) {
		// Same PR. Redraw if GitHub dropped the badge or the box loaded late.
		const element = document.getElementById(BADGE_ID);
		const box = descriptionBox();
		if (key && (!element || (box && !box.contains(element)))) {
			redraw?.();
		}
		return;
	}
	current = key;

	if (!pull) {
		redraw = undefined;
		document.getElementById(BADGE_ID)?.remove();
		return;
	}

	console.info(`[interlinked] analyzing ${key}`);
	renderMessage("interlinked: analyzing…");
	try {
		const result = await analyze(pull);
		console.info(
			`[interlinked] ${key}: ${result.verdict} (${result.probability})`,
		);
		if (current === key) {
			renderResult(result);
		}
	} catch (error) {
		console.warn(`[interlinked] ${key}:`, error);
		if (current === key) {
			renderMessage(`interlinked: ${(error as Error).message}`);
		}
	}
}

GM_registerMenuCommand("Set GitHub token", () => {
	const token = prompt(
		"GitHub token (raises the API rate limit; leave empty to clear)",
		GM_getValue("token", ""),
	);
	if (token !== null) {
		GM_setValue("token", token.trim());
	}
});

console.info(`[interlinked] loaded on ${location.href}`);

// GitHub navigates client-side, so poll the URL.
update();
setInterval(update, 500);
