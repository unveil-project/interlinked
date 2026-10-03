import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { measure } from "../src/measure";
import { SIGNALS, type Signal } from "../src/signals";
import type { CorpusEntry } from "./build-corpus";

const ROOT = join(import.meta.dirname, "..");
const LABEL_SIGNALS = new Set(["agent-attribution", "ai-disclosure"]);
const FOLDS = 5;
const LAMBDAS = [0.001, 0.003, 0.01, 0.03];
const MAX_WEIGHT = 4;
const MIN_SUPPORT = 30;
const TARGET_FPR = 0.03;

const labelSignals = SIGNALS.filter((s) => LABEL_SIGNALS.has(s.id));
const candidates = SIGNALS.filter((s) => !LABEL_SIGNALS.has(s.id));

interface Example {
	repo: string;
	y: 0 | 1;
	/** Strength per candidate signal. */
	all: number[];
	/** Strength per fitted signal. */
	x: number[];
	/** Logit from the hand-weighted signals. */
	offset: number;
}

function discloses(text: string) {
	return labelSignals.some((s) => s.count(text) > 0);
}

function load(): Example[] {
	const entries: CorpusEntry[] = JSON.parse(
		readFileSync(join(ROOT, "corpus", "entries.json"), "utf-8"),
	);
	const templates: Record<string, string> = JSON.parse(
		readFileSync(join(ROOT, "corpus", "templates.json"), "utf-8"),
	);

	const examples: Example[] = [];
	for (const entry of entries) {
		const template = templates[entry.repo];
		// Recheck labels with the current tells and skip mismatches.
		const disclosed = measure(entry.body, template, labelSignals).length > 0;
		if (disclosed !== (entry.label === "ai")) {
			continue;
		}
		const body = entry.body
			.split("\n")
			.filter((line) => !discloses(line))
			.join("\n");
		const strengths = new Map(
			measure(body, template, candidates).map((m) => [m.signal.id, m.strength]),
		);
		examples.push({
			repo: entry.repo,
			y: entry.label === "ai" ? 1 : 0,
			all: candidates.map((s) => strengths.get(s.id) ?? 0),
			x: [],
			offset: 0,
		});
	}
	return examples;
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

function logit(w: number[], bias: number, e: Example) {
	return e.x.reduce((z, xi, j) => z + xi * w[j], bias + e.offset);
}

function score(w: number[], bias: number, e: Example) {
	return sigmoid(logit(w, bias, e));
}

/** Logistic regression with balanced classes, fixed signs and L2 regularization. */
function fitWeights(examples: Example[], lambda: number) {
	const positives = examples.filter((e) => e.y === 1).length;
	const weightOf = (e: Example) =>
		e.y === 1 ? 0.5 / positives : 0.5 / (examples.length - positives);
	const signs = fitted.map((s) => Math.sign(s.weight));

	const w = fitted.map((s) => s.weight);
	let bias = 0;
	// Adam over the full batch.
	const m = new Array(w.length + 1).fill(0);
	const v = new Array(w.length + 1).fill(0);
	for (let t = 1; t <= 3000; t++) {
		const grad = new Array(w.length + 1).fill(0);
		for (const e of examples) {
			const err = (score(w, bias, e) - e.y) * weightOf(e);
			for (let j = 0; j < w.length; j++) {
				grad[j] += err * e.x[j];
			}
			grad[w.length] += err;
		}
		for (let j = 0; j < w.length; j++) {
			grad[j] += 2 * lambda * w[j];
		}
		for (let j = 0; j <= w.length; j++) {
			m[j] = 0.9 * m[j] + 0.1 * grad[j];
			v[j] = 0.999 * v[j] + 0.001 * grad[j] ** 2;
			const step =
				(0.02 * (m[j] / (1 - 0.9 ** t))) /
				(Math.sqrt(v[j] / (1 - 0.999 ** t)) + 1e-8);
			if (j === w.length) {
				bias -= step;
			} else {
				const next = w[j] - step;
				// Keep the original sign and stay within MAX_WEIGHT.
				w[j] =
					signs[j] > 0
						? Math.min(Math.max(next, 0), MAX_WEIGHT)
						: Math.max(Math.min(next, 0), -MAX_WEIGHT);
			}
		}
	}
	return { w, bias };
}

/** One logit per example, same order. */
type Logits = number[];

/** Assigns folds by repo, so all of a repo's PRs share a fold. */
function foldOf(examples: Example[]) {
	const repos = [...new Set(examples.map((e) => e.repo))].sort();
	const folds = new Map(repos.map((r, i) => [r, i % FOLDS]));
	return examples.map((e) => folds.get(e.repo) ?? 0);
}

/** Each example's logit from a model fitted without its repo. */
function outOfFold(examples: Example[], lambda: number): Logits {
	const folds = foldOf(examples);
	const logits: Logits = new Array(examples.length).fill(0);
	for (let k = 0; k < FOLDS; k++) {
		const { w, bias } = fitWeights(
			examples.filter((_, i) => folds[i] !== k),
			lambda,
		);
		examples.forEach((e, i) => {
			if (folds[i] === k) {
				logits[i] = logit(w, bias, e);
			}
		});
	}
	return logits;
}

/** Logits of one class, highest first. */
function logitsOf(examples: Example[], logits: Logits, y: 0 | 1) {
	return logits.filter((_, i) => examples[i].y === y).sort((a, b) => b - a);
}

/** Logit where a share `fpr` of human examples score above. */
function thresholdAt(examples: Example[], logits: Logits, fpr: number) {
	const humans = logitsOf(examples, logits, 0);
	if (humans.length === 0) {
		throw new Error("no human examples to set a threshold on");
	}
	return humans[Math.min(Math.floor(fpr * humans.length), humans.length - 1)];
}

function report(name: string, examples: Example[], logits: Logits) {
	const humans = logitsOf(examples, logits, 0);
	const ais = logitsOf(examples, logits, 1);
	const share = (xs: number[], t: number) =>
		xs.filter((x) => x >= t).length / xs.length;
	// AUC: chance a random agent PR scores above a random human one.
	let wins = 0;
	for (const a of ais) {
		for (const h of humans) {
			wins += a > h ? 1 : a === h ? 0.5 : 0;
		}
	}
	const atFpr = [0.01, 0.03, 0.05]
		.map(
			(f) =>
				`@${f * 100}% FPR ${pct(share(ais, thresholdAt(examples, logits, f)))}`,
		)
		.join("  ");
	console.log(
		`${name.padEnd(16)} AUC ${(wins / (ais.length * humans.length)).toFixed(3)}  at 0.5: FPR ${pct(share(humans, 0))} recall ${pct(share(ais, 0))}  recall ${atFpr}`,
	);
}

function pct(n: number) {
	return `${(n * 100).toFixed(1)}%`;
}

function writeWeights(fitted: Signal[], w: number[], bias: number) {
	const signalsPath = join(ROOT, "src", "signals.ts");
	let source = readFileSync(signalsPath, "utf-8");
	fitted.forEach((signal, j) => {
		const pattern = new RegExp(
			`(id: "${signal.id}",\\n[^]*?weight: )-?[\\d.]+`,
		);
		source = source.replace(pattern, `$1${round(w[j])}`);
	});
	writeFileSync(signalsPath, source);

	const indexPath = join(ROOT, "src", "index.ts");
	writeFileSync(
		indexPath,
		readFileSync(indexPath, "utf-8").replace(
			/const BIAS = -?[\d.]+;/,
			`const BIAS = ${round(bias)};`,
		),
	);
}

function round(n: number) {
	return Math.round(n * 100) / 100;
}

const examples = load();
const support = candidates.map(
	(_, j) => examples.filter((e) => e.all[j] > 0).length,
);
const fitted = candidates.filter((_, j) => support[j] >= MIN_SUPPORT);
const fixed = candidates.filter((_, j) => support[j] < MIN_SUPPORT);
for (const e of examples) {
	e.x = candidates.flatMap((_, j) =>
		support[j] >= MIN_SUPPORT ? [e.all[j]] : [],
	);
	e.offset = candidates.reduce(
		(z, s, j) => (support[j] < MIN_SUPPORT ? z + s.weight * e.all[j] : z),
		0,
	);
}
console.log(
	`${examples.filter((e) => e.y === 0).length} human, ${examples.filter((e) => e.y === 1).length} ai (disclosure removed), ${new Set(examples.map((e) => e.repo)).size} repos`,
);
console.log(
	`hand weights kept (< ${MIN_SUPPORT} PRs): ${fixed.map((s) => s.id).join(", ")}\n`,
);

const biasMatch = readFileSync(join(ROOT, "src", "index.ts"), "utf-8").match(
	/const BIAS = (-?[\d.]+);/,
);
if (!biasMatch) {
	throw new Error("src/index.ts has no `const BIAS = <number>;` to fit");
}
const BIAS = Number(biasMatch[1]);
const currentW = fitted.map((s) => s.weight);
report(
	"current",
	examples,
	examples.map((e) => logit(currentW, BIAS, e)),
);

// Pick the λ with the best out-of-fold recall at TARGET_FPR.
const best = LAMBDAS.map((lambda) => {
	const logits = outOfFold(examples, lambda);
	report(`fit λ=${lambda}`, examples, logits);
	const t = thresholdAt(examples, logits, TARGET_FPR);
	const recall = logitsOf(examples, logits, 1).filter((l) => l >= t).length;
	return { lambda, logits, recall };
}).reduce((a, b) => (b.recall > a.recall ? b : a));

// Fit on all data, then shift the bias so TARGET_FPR lands at 0.5.
const { w, bias: fittedBias } = fitWeights(examples, best.lambda);
const bias = fittedBias - thresholdAt(examples, best.logits, TARGET_FPR);
report(
	"chosen (in-sample)",
	examples,
	examples.map((e) => logit(w, bias, e)),
);
console.log(
	`\nλ=${best.lambda}, bias ${BIAS} -> ${round(bias)} (calibrated to ${pct(TARGET_FPR)} FPR)`,
);
const rows = fitted
	.map((s, j) => {
		const fires = examples.filter((e) => e.x[j] > 0);
		const humans = examples.filter((e) => e.y === 0).length;
		return {
			id: s.id,
			before: s.weight,
			after: round(w[j]),
			"fires human": pct(fires.filter((e) => e.y === 0).length / humans),
			"fires ai": pct(
				fires.filter((e) => e.y === 1).length / (examples.length - humans),
			),
		};
	})
	.sort((a, b) => b.after - a.after);
console.table(rows);

if (process.argv.includes("--write")) {
	writeWeights(fitted, w, bias);
	console.log("wrote src/signals.ts and src/index.ts");
}
