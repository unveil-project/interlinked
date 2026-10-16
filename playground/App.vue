<script setup lang="ts">
import { computed, ref } from "vue";
import { AI_THRESHOLD, analyzeText } from "../src/index";
import {
	fetchBody,
	fetchTemplate,
	type GitHubRef,
	parseGitHubUrl,
} from "./github";

type Label = "ai" | "human";
type Step = "loading" | "done" | "none" | "failed";

/** Score bands, lowest first. Each applies to scores below its `max`. */
const bands = [
	{ max: 0.2, label: "likely human-written", text: "text-human", bar: "bg-human" },
	{ max: 0.35, label: "few agent traits", text: "text-human", bar: "bg-human" },
	{ max: 0.65, label: "inconclusive", text: "text-fg", bar: "bg-muted" },
	{ max: Infinity, label: "strong agent traits", text: "text-agent", bar: "bg-agent" },
];

const url = ref("");
const markdown = ref("");
const template = ref("");
const showTemplate = ref(false);
const loading = ref(false);
const error = ref("");
/** Per-request status of the last fetch. `path` is the template path being checked, or the one found. */
const progress = ref<{
	body: Step;
	template: Step;
	path?: string;
	/** What the body is: "description", "issue" or "comment". */
	noun: string;
}>();
/** Where the description came from, and the label it should get if it is a fixture. */
const source = ref<{ name: string; expected?: Label }>();
let loadedUrl: string | undefined;

const result = computed(() =>
	markdown.value.trim()
		? analyzeText(markdown.value, {
				template: template.value || undefined,
			})
		: undefined,
);
const percent = computed(() =>
	result.value ? Math.round(result.value.probability * 100) : 0,
);
const band = computed(() => {
	const probability = result.value?.probability ?? 0;
	return bands.find((b) => probability < b.max) ?? bands[bands.length - 1];
});
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
	const ref = parseGitHubUrl(url.value);
	if (!ref) {
		error.value = "That isn't a GitHub issue, pull request or comment link.";
		return;
	}
	// Only fetch when the link changes, so edits to the fields stick.
	if (url.value === loadedUrl) {
		return;
	}
	loading.value = true;
	progress.value = {
		body: "loading",
		// Comments have no template.
		template: ref.commentId ? "none" : "loading",
		noun: noun(ref),
	};
	const steps = progress.value;
	try {
		const [body, found] = await Promise.all([
			fetchBody(ref).then(
				(text) => {
					steps.body = "done";
					return text;
				},
				(e) => {
					steps.body = "failed";
					throw e;
				},
			),
			fetchTemplate(ref, (path) => {
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
		source.value = { name: sourceName(ref) };
		loadedUrl = url.value;
	} catch (e) {
		error.value = (e as Error).message;
	} finally {
		loading.value = false;
	}
}

function noun(ref: GitHubRef) {
	if (ref.commentId) {
		return "comment";
	}
	return ref.type === "pull" ? "description" : "issue";
}

function sourceName({ owner, repo, number, commentId }: GitHubRef) {
	const name = `${owner}/${repo}#${number}`;
	return commentId ? `${name}, comment ${commentId}` : name;
}

function edited() {
	if (source.value) {
		source.value = { name: `${source.value.name}, edited` };
	}
}

const stepIcon: Record<Step, string> = {
	loading:
		"border-1.5 border-line border-t-fg animate-spin animate-duration-700 motion-reduce:animate-duration-2000",
	done: "bg-human",
	none: "border-1.5 border-muted",
	failed: "bg-agent",
};

function barStyle(contribution: number) {
	const width = `${(Math.abs(contribution) / largest.value) * 50}%`;
	return contribution >= 0 ? { left: "50%", width } : { right: "50%", width };
}
</script>

<template>
	<main class="max-w-180 mx-auto px-4 pt-12 pb-24">
		<header class="flex items-baseline justify-between mb-10 font-mono text-13px">
			<span
				class="font-semibold tracking-[-0.01em] before:(content-empty inline-block size-7px mr-2 rounded-full bg-agent align-[1px])"
			>
				interlinked
			</span>

			<nav>
				<ul class="flex gap-2 text-xs">
					<li>
						<a target="_blank" class="hover:underline" href="https://github.com/MatteoGabriele/interlinked">Install</a>
					</li>
				</ul>
			</nav>
		</header>

		<form
			class="flex gap-2 border-b border-line transition-colors duration-150 focus-within:border-fg"
			@submit.prevent="load"
		>
			<input
				v-model="url"
				type="url"
				placeholder="github.com/owner/repo/pull/123 or …/issues/123"
				spellcheck="false"
				aria-label="Issue, pull request or comment link"
				class="flex-1 min-w-0 py-2.5 font-mono text-14px outline-none"
			/>
			<button
				type="submit"
				:disabled="loading || !url"
				class="px-1 font-mono text-13px disabled:text-muted"
			>
				{{ loading ? "Fetching…" : "Fetch" }}
			</button>
		</form>
		<ul v-if="progress" class="mt-3 font-mono text-12px text-muted" aria-live="polite">
			<li
				class="flex items-center gap-2 py-0.5"
				:class="{ 'text-agent': progress.body === 'failed' }"
			>
				<span class="flex-none size-10px rounded-full" :class="stepIcon[progress.body]" />
				{{ progress.noun }}
				<span class="min-w-0 truncate">
					{{
						{ loading: "fetching…", done: "fetched", none: "", failed: "failed" }[
							progress.body
						]
					}}
				</span>
			</li>
			<li
				class="flex items-center gap-2 py-0.5"
				:class="{ 'text-agent': progress.template === 'failed' }"
			>
				<span class="flex-none size-10px rounded-full" :class="stepIcon[progress.template]" />
				template
				<span class="min-w-0 truncate">
					<template v-if="progress.template === 'loading'">
						checking {{ progress.path }}…
					</template>
					<template v-else-if="progress.template === 'done'">
						{{ progress.path }}
					</template>
					<template v-else-if="progress.template === 'none'">
						{{ progress.noun === "comment" ? "not used for comments" : "none found" }}
					</template>
					<template v-else>failed</template>
				</span>
			</li>
		</ul>
		<p v-if="error" class="mt-2 text-agent text-13px">{{ error }}</p>

		<section
			class="mt-6 transition-opacity duration-150"
			:class="{ 'opacity-40 pointer-events-none': loading }"
		>
			<textarea
				v-model="markdown"
				placeholder="Or paste a PR description, issue or comment."
				spellcheck="false"
				aria-label="Text to analyze"
				class="field"
				@input="edited"
			/>
			<div class="mt-2 font-mono text-12px text-muted">
				<button
					type="button"
					class="hover:text-fg"
					:aria-expanded="showTemplate"
					@click="showTemplate = !showTemplate"
				>
					{{ showTemplate ? "−" : "+" }} template{{ template ? " (loaded)" : "" }}
				</button>
			</div>
			<textarea
				v-if="showTemplate"
				v-model="template"
				placeholder="The repo's PR or issue template, so its headings and checklists don't count."
				spellcheck="false"
				aria-label="Template"
				class="field min-h-30 mt-2"
			/>
		</section>

		<section v-if="result" class="mt-14">
			<div class="flex items-end justify-between gap-4">
				<span
					class="font-mono font-light text-[length:clamp(72px,18vw,120px)] leading-[0.85] tracking-[-0.06em] tabular-nums"
				>
					{{ percent }}<small class="text-[0.35em] tracking-normal text-muted">%</small>
				</span>
				<div class="flex flex-col items-end gap-0.5 font-mono text-13px text-muted">
					<strong
						class="text-15px font-semibold tracking-[0.12em] uppercase"
						:class="band.text"
					>
						{{ band.label }}
					</strong>
					<span>agent-style score</span>
				</div>
			</div>

			<div
				class="relative h-1 mt-6 rounded-full bg-line"
				role="meter"
				:aria-valuenow="percent"
				aria-valuemin="0"
				aria-valuemax="100"
			>
				<span
					class="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300"
					:class="band.bar"
					:style="{ width: `${percent}%` }"
				/>
				<span
					class="absolute -inset-y-1 w-px bg-fg opacity-40"
					:style="{ left: `${AI_THRESHOLD * 100}%` }"
				/>
			</div>

			<p class="mt-4 text-muted text-13px leading-normal">
				A heuristic score of how much this reads like text written by a coding
				agent. Treat it as a hint, not proof: people draft with agents, and some
				people just write this way.
			</p>

			<p
				v-if="source"
				class="mt-3 font-mono text-12px wrap-anywhere"
				:class="missed ? 'text-agent' : 'text-muted'"
			>
				{{ source.name }}
				<template v-if="source.expected">
					· expected {{ source.expected === "ai" ? "agent" : "human" }}
					{{ missed ? "✕" : "✓" }}
				</template>
			</p>

			<ol v-if="result.signals.length" class="mt-10">
				<li
					v-for="signal in result.signals"
					:key="signal.id"
					class="grid grid-cols-[minmax(0,1fr)_72px_44px] items-center gap-2.5 py-2.5 border-t border-line min-[521px]:(grid-cols-[minmax(0,1fr)_140px_48px] gap-4)"
				>
					<div class="flex flex-col min-w-0">
						<code class="font-mono text-13px">{{ signal.id }}</code>
						<span class="truncate text-muted text-13px">{{ signal.description }}</span>
					</div>
					<div
						class="relative h-1.5 before:(content-empty absolute -inset-y-1 left-1/2 w-px bg-line)"
					>
						<span
							class="absolute inset-y-0 rounded-full"
							:class="signal.contribution >= 0 ? 'bg-agent' : 'bg-human'"
							:style="barStyle(signal.contribution)"
						/>
					</div>
					<span class="font-mono text-13px tabular-nums text-right">
						{{ signal.contribution > 0 ? "+" : "" }}{{ signal.contribution.toFixed(2) }}
					</span>
				</li>
			</ol>
			<p v-else class="text-muted">No signals fired.</p>
		</section>
	</main>
</template>
