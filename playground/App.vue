<script setup lang="ts">
import { computed, ref } from "vue";
import { AI_THRESHOLD, analyzeText } from "../src/index";
import { fetchBody, fetchTemplate, parsePullUrl } from "./github";

type Label = "ai" | "human";
type Step = "loading" | "done" | "none" | "failed";

const url = ref("");
const markdown = ref("");
const template = ref("");
const showTemplate = ref(false);
const loading = ref(false);
const error = ref("");
/** Per-request status of the last fetch. `path` is the template path being checked, or the one found. */
const progress = ref<{ body: Step; template: Step; path?: string }>();
/** Where the description came from, and the label it should get if it is a fixture. */
const source = ref<{ name: string; expected?: Label }>();
let loadedUrl: string | undefined;

const result = computed(() =>
	markdown.value.trim()
		? analyzeText(markdown.value, { template: template.value || undefined })
		: undefined,
);
const percent = computed(() =>
	result.value ? Math.round(result.value.probability * 100) : 0,
);
const largest = computed(() =>
	Math.max(
		1,
		...(result.value?.signals.map((s) => Math.abs(s.contribution)) ?? []),
	),
);
const missed = computed(
	() =>
		!!result.value &&
		!!source.value?.expected &&
		source.value.expected !== result.value.verdict,
);

async function load() {
	error.value = "";
	const pull = parsePullUrl(url.value);
	if (!pull) {
		error.value = "That isn't a GitHub pull request link.";
		return;
	}
	// Only fetch when the link changes, so edits to the fields stick.
	if (url.value === loadedUrl) {
		return;
	}
	loading.value = true;
	progress.value = { body: "loading", template: "loading" };
	const steps = progress.value;
	try {
		const [body, found] = await Promise.all([
			fetchBody(pull).then(
				(text) => {
					steps.body = "done";
					return text;
				},
				(e) => {
					steps.body = "failed";
					throw e;
				},
			),
			fetchTemplate(pull, (path) => {
				steps.path = path;
			}).then(
				(found) => {
					steps.template = found ? "done" : "none";
					return found;
				},
				() => {
					steps.template = "failed";
					return undefined;
				},
			),
		]);
		markdown.value = body;
		template.value = found?.text ?? "";
		source.value = { name: `${pull.owner}/${pull.repo}#${pull.number}` };
		loadedUrl = url.value;
	} catch (e) {
		error.value = (e as Error).message;
	} finally {
		loading.value = false;
	}
}

function edited() {
	if (source.value) {
		source.value = { name: `${source.value.name}, edited` };
	}
}

function barStyle(contribution: number) {
	const width = `${(Math.abs(contribution) / largest.value) * 50}%`;
	return contribution >= 0 ? { left: "50%", width } : { right: "50%", width };
}
</script>

<template>
	<main>
		<header>
			<span class="mark">interlinked</span>
		</header>

		<form class="url" @submit.prevent="load">
			<input
				v-model="url"
				type="url"
				placeholder="github.com/owner/repo/pull/123"
				spellcheck="false"
				aria-label="Pull request link"
			/>
			<button type="submit" :disabled="loading || !url">
				{{ loading ? "Fetching…" : "Fetch" }}
			</button>
		</form>
		<ul v-if="progress" class="progress" aria-live="polite">
			<li :class="progress.body">
				<span class="icon" />
				description
				<span class="detail">
					{{
						{ loading: "fetching…", done: "fetched", none: "", failed: "failed" }[
							progress.body
						]
					}}
				</span>
			</li>
			<li :class="progress.template">
				<span class="icon" />
				template
				<span class="detail">
					<template v-if="progress.template === 'loading'">
						checking {{ progress.path }}…
					</template>
					<template v-else-if="progress.template === 'done'">
						{{ progress.path }}
					</template>
					<template v-else-if="progress.template === 'none'">
						none found
					</template>
					<template v-else>failed</template>
				</span>
			</li>
		</ul>
		<p v-if="error" class="error">{{ error }}</p>

		<section class="input" :class="{ busy: loading }">
			<textarea
				v-model="markdown"
				placeholder="Or paste a PR description."
				spellcheck="false"
				aria-label="PR description"
				@input="edited"
			/>
			<div class="input-bar">
				<button
					type="button"
					class="link"
					:aria-expanded="showTemplate"
					@click="showTemplate = !showTemplate"
				>
					{{ showTemplate ? "−" : "+" }} template{{ template ? " (loaded)" : "" }}
				</button>
			</div>
			<textarea
				v-if="showTemplate"
				v-model="template"
				class="template"
				placeholder="The repo's PR template, so its headings and checklists don't count."
				spellcheck="false"
				aria-label="PR template"
			/>
		</section>

		<section v-if="result" class="result" :class="result.verdict">
			<div class="score">
				<span class="number">{{ percent }}<small>%</small></span>
				<div class="verdict">
					<strong>{{ result.verdict === "ai" ? "agent" : "human" }}</strong>
					<span>{{ Math.round(result.confidence * 100) }}% confident</span>
				</div>
			</div>

			<div class="meter" role="meter" :aria-valuenow="percent" aria-valuemin="0" aria-valuemax="100">
				<span class="fill" :style="{ width: `${percent}%` }" />
				<span class="tick" :style="{ left: `${AI_THRESHOLD * 100}%` }" />
			</div>

			<p v-if="source" class="source" :class="{ missed }">
				{{ source.name }}
				<template v-if="source.expected">
					· expected {{ source.expected === "ai" ? "agent" : "human" }}
					{{ missed ? "✕" : "✓" }}
				</template>
			</p>

			<ol v-if="result.signals.length" class="signals">
				<li v-for="signal in result.signals" :key="signal.id">
					<div class="label">
						<code>{{ signal.id }}</code>
						<span>{{ signal.description }}</span>
					</div>
					<div class="bar">
						<span
							:class="signal.contribution >= 0 ? 'agent' : 'human'"
							:style="barStyle(signal.contribution)"
						/>
					</div>
					<span class="value">
						{{ signal.contribution > 0 ? "+" : "" }}{{ signal.contribution.toFixed(2) }}
					</span>
				</li>
			</ol>
			<p v-else class="muted">No signals fired.</p>
		</section>
	</main>
</template>

<style>
:root {
	--bg: #f7f7f5;
	--fg: #111110;
	--muted: #8a8884;
	--line: #e4e3df;
	--field: #ffffff;
	--agent: #ff5b1f;
	--human: #1f9e8f;
	--mono: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace;
	color-scheme: light dark;
}

@media (prefers-color-scheme: dark) {
	:root {
		--bg: #0c0c0d;
		--fg: #ecebe8;
		--muted: #7d7c79;
		--line: #232325;
		--field: #131315;
		--agent: #ff7a45;
		--human: #45cbb8;
	}
}

* {
	box-sizing: border-box;
}

body {
	margin: 0;
	background: var(--bg);
	color: var(--fg);
	font:
		15px/1.5 system-ui,
		-apple-system,
		sans-serif;
	-webkit-font-smoothing: antialiased;
}

button {
	font: inherit;
	color: inherit;
	cursor: pointer;
}
</style>

<style scoped>
main {
	max-width: 720px;
	margin: 0 auto;
	padding: 48px 16px 96px;
}

header {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	margin-bottom: 40px;
	font-family: var(--mono);
	font-size: 13px;
}

.mark {
	font-weight: 600;
	letter-spacing: -0.01em;
}

.mark::before {
	content: "";
	display: inline-block;
	width: 7px;
	height: 7px;
	margin-right: 8px;
	border-radius: 50%;
	background: var(--agent);
	vertical-align: 1px;
}

.tagline,
.muted {
	color: var(--muted);
}

.url {
	display: flex;
	gap: 8px;
	border-bottom: 1px solid var(--line);
	transition: border-color 0.15s;
}

.url:focus-within {
	border-color: var(--fg);
}

.url input {
	flex: 1;
	min-width: 0;
	padding: 10px 0;
	border: 0;
	background: none;
	color: inherit;
	font: 14px var(--mono);
	outline: none;
}

.url button {
	padding: 0 4px;
	border: 0;
	background: none;
	font: 13px var(--mono);
}

.url button:disabled {
	color: var(--muted);
	cursor: default;
}

.error {
	margin: 8px 0 0;
	color: var(--agent);
	font-size: 13px;
}

.progress {
	margin: 12px 0 0;
	padding: 0;
	list-style: none;
	font: 12px var(--mono);
	color: var(--muted);
}

.progress li {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 2px 0;
}

.progress .detail {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.progress .icon {
	flex: none;
	width: 10px;
	height: 10px;
	border-radius: 50%;
}

.progress .loading .icon {
	border: 1.5px solid var(--line);
	border-top-color: var(--fg);
	animation: spin 0.7s linear infinite;
}

.progress .done .icon {
	background: var(--human);
}

.progress .none .icon {
	border: 1.5px solid var(--muted);
}

.progress .failed {
	color: var(--agent);
}

.progress .failed .icon {
	background: var(--agent);
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}

@media (prefers-reduced-motion: reduce) {
	.progress .loading .icon {
		animation-duration: 2s;
	}
}

.input {
	margin-top: 24px;
	transition: opacity 0.15s;
}

.input.busy {
	opacity: 0.4;
	pointer-events: none;
}

textarea {
	display: block;
	width: 100%;
	height: 280px;
	padding: 16px;
	border: 1px solid var(--line);
	border-radius: 10px;
	background: var(--field);
	color: inherit;
	font: 13px/1.6 var(--mono);
	resize:none;
	outline: none;
	field-sizing: content;
	transition: border-color 0.15s;
}

textarea:focus {
	border-color: var(--muted);
}

textarea.template {
	min-height: 120px;
	margin-top: 8px;
}

.input-bar {
	display: flex;
	justify-content: space-between;
	margin-top: 8px;
	font: 12px var(--mono);
	color: var(--muted);
}

.link {
	padding: 0;
	border: 0;
	background: none;
	color: var(--muted);
	font: 12px var(--mono);
}

.link:hover {
	color: var(--fg);
}

.try .link {
	margin-left: 8px;
	text-decoration: underline;
	text-underline-offset: 3px;
}

.result {
	--tone: var(--human);
	margin-top: 56px;
}

.result.ai {
	--tone: var(--agent);
}

.score {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: 16px;
}

.number {
	font: 300 clamp(72px, 18vw, 120px) / 0.85 var(--mono);
	letter-spacing: -0.06em;
	font-variant-numeric: tabular-nums;
}

.number small {
	font-size: 0.35em;
	letter-spacing: 0;
	color: var(--muted);
}

.verdict {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 2px;
	font-family: var(--mono);
	font-size: 13px;
	color: var(--muted);
}

.verdict strong {
	color: var(--tone);
	font-size: 15px;
	font-weight: 600;
	letter-spacing: 0.12em;
	text-transform: uppercase;
}

.meter {
	position: relative;
	height: 4px;
	margin-top: 24px;
	border-radius: 2px;
	background: var(--line);
}

.meter .fill {
	position: absolute;
	inset: 0 auto 0 0;
	border-radius: 2px;
	background: var(--tone);
	transition: width 0.3s ease;
}

.meter .tick {
	position: absolute;
	top: -4px;
	bottom: -4px;
	width: 1px;
	background: var(--fg);
	opacity: 0.4;
}

.source {
	margin: 12px 0 0;
	font: 12px var(--mono);
	color: var(--muted);
	overflow-wrap: anywhere;
}

.source.missed {
	color: var(--agent);
}

.signals {
	margin: 40px 0 0;
	padding: 0;
	list-style: none;
}

.signals li {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 140px 48px;
	align-items: center;
	gap: 16px;
	padding: 10px 0;
	border-top: 1px solid var(--line);
}

.label {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.label code {
	font: 13px var(--mono);
}

.label span {
	overflow: hidden;
	color: var(--muted);
	font-size: 13px;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.bar {
	position: relative;
	height: 6px;
}

.bar::before {
	content: "";
	position: absolute;
	top: -4px;
	bottom: -4px;
	left: 50%;
	width: 1px;
	background: var(--line);
}

.bar span {
	position: absolute;
	top: 0;
	bottom: 0;
	border-radius: 3px;
}

.bar .agent {
	background: var(--agent);
}

.bar .human {
	background: var(--human);
}

.value {
	font: 13px var(--mono);
	font-variant-numeric: tabular-nums;
	text-align: right;
}

@media (max-width: 520px) {
	.signals li {
		grid-template-columns: minmax(0, 1fr) 72px 44px;
		gap: 10px;
	}
}
</style>
