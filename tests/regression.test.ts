import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeText } from "../src/index";

/**
 * Numeric regression tests for the classifier.
 *
 * Fixtures live in `fixtures/ai/` and `fixtures/human/`; the folder is the
 * label. A `<name>.template.md` next to a fixture is the repository's PR
 * template and is passed to the classifier. `baseline.json` records the probability each fixture scored when the
 * baseline was last accepted. A change regresses a fixture when it moves that
 * probability the wrong way: down for `ai`, up for `human`. Moves the right
 * way pass and are reported so the baseline can be tightened.
 *
 * Accept the current numbers with `pnpm test:regression:update`.
 */

type Label = "ai" | "human";

interface BaselineEntry {
	label: Label;
	probability: number;
	/** Contribution per signal id, kept to explain a regression. */
	signals: Record<string, number>;
}

interface Baseline {
	summary: {
		fixtures: number;
		correct: number;
		accuracy: number;
		/** Mean log-loss against the folder labels; lower is better. */
		logLoss: number;
	};
	fixtures: Record<string, BaselineEntry>;
}

/** Probabilities are rounded to 3 decimals, so allow for rounding noise. */
const TOLERANCE = 0.001;
const LABELS: Label[] = ["ai", "human"];
const FIXTURES_DIR = join(import.meta.dirname, "fixtures");
const BASELINE_PATH = join(FIXTURES_DIR, "baseline.json");
const UPDATE = process.env.UPDATE_BASELINE === "1";

function measure(): Record<string, BaselineEntry> {
	const entries: Record<string, BaselineEntry> = {};
	for (const label of LABELS) {
		const dir = join(FIXTURES_DIR, label);
		if (!existsSync(dir)) {
			continue;
		}
		const files = readdirSync(dir).filter(
			(f) => f.endsWith(".md") && !f.endsWith(".template.md"),
		);
		for (const file of files.sort()) {
			const templatePath = join(dir, file.replace(/\.md$/, ".template.md"));
			const result = analyzeText(readFileSync(join(dir, file), "utf-8"), {
				template: existsSync(templatePath)
					? readFileSync(templatePath, "utf-8")
					: undefined,
			});
			entries[`${label}/${file}`] = {
				label,
				probability: result.probability,
				signals: Object.fromEntries(
					result.signals.map((s) => [s.id, s.contribution]),
				),
			};
		}
	}
	return entries;
}

function summarize(entries: Record<string, BaselineEntry>): Baseline["summary"] {
	const values = Object.values(entries);
	const correct = values.filter(
		(e) => (e.probability >= 0.5 ? "ai" : "human") === e.label,
	).length;
	const logLoss =
		values.reduce((sum, e) => {
			const p = Math.min(Math.max(e.probability, 1e-6), 1 - 1e-6);
			return sum - Math.log(e.label === "ai" ? p : 1 - p);
		}, 0) / Math.max(values.length, 1);
	return {
		fixtures: values.length,
		correct,
		accuracy: round(values.length ? correct / values.length : 0),
		logLoss: round(logLoss),
	};
}

function round(n: number) {
	return Math.round(n * 1000) / 1000;
}

/** Signals whose contribution changed, as `id: before -> after`. */
function signalDiff(before: BaselineEntry, after: BaselineEntry) {
	const ids = new Set([
		...Object.keys(before.signals),
		...Object.keys(after.signals),
	]);
	return [...ids]
		.filter((id) => (before.signals[id] ?? 0) !== (after.signals[id] ?? 0))
		.map((id) => `  ${id}: ${before.signals[id] ?? 0} -> ${after.signals[id] ?? 0}`)
		.join("\n");
}

const current = measure();

if (UPDATE) {
	const baseline: Baseline = { summary: summarize(current), fixtures: current };
	writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, "\t")}\n`);
}

const baseline: Baseline = existsSync(BASELINE_PATH)
	? JSON.parse(readFileSync(BASELINE_PATH, "utf-8"))
	: { summary: summarize({}), fixtures: {} };

describe("regression", () => {
	it("baseline lists exactly the fixtures on disk", () => {
		expect(
			Object.keys(current).sort(),
			"fixtures changed; run `pnpm test:regression:update`",
		).toEqual(Object.keys(baseline.fixtures).sort());
	});

	describe.each(Object.keys(current))("%s", (name) => {
		const now = current[name]!;
		const before = baseline.fixtures[name];

		it.runIf(before)("probability does not move away from its label", () => {
			if (!before) {
				return;
			}
			const delta = round(now.probability - before.probability);
			// Positive `drift` means moving away from the label.
			const drift = now.label === "ai" ? -delta : delta;

			if (drift < -TOLERANCE) {
				console.info(
					`improved ${name}: ${before.probability} -> ${now.probability}`,
				);
			}

			expect(
				drift,
				`${name} (${now.label}) regressed: probability ${before.probability} -> ${now.probability}\n${signalDiff(before, now)}`,
			).toBeLessThanOrEqual(TOLERANCE);
		});
	});

	it("aggregate scores do not get worse", () => {
		const now = summarize(current);
		console.table({ baseline: baseline.summary, current: now });
		expect(now.correct).toBeGreaterThanOrEqual(baseline.summary.correct);
		expect(now.logLoss).toBeLessThanOrEqual(baseline.summary.logLoss + TOLERANCE);
	});
});
