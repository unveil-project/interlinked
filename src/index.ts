import { SIGNALS } from "./signals";
import { authoredText, withoutTemplate } from "./text";
import { round, sigmoid } from "./utils";

export { SIGNALS };
export type { Signal } from "./signals";

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

export interface AnalyzeTextOptions {
	/** The repository's PR template, raw markdown. */
	template?: string;
}

/**
 * Starting log-odds before any evidence, from the fit. Negative so that plain
 * text leans human; the `short-body` signal pushes further for one-liners.
 */
const BIAS = -0.9;

/** At or above this probability the verdict is "ai". */
export const AI_THRESHOLD = 0.5;

/**
 * Guesses whether a PR description (raw markdown) was written by an AI agent.
 *
 * Pass the repository's PR template (`.github/pull_request_template.md`) when
 * you have it, so its headings and checklists aren't read as agent structure.
 *
 * @example
 * const { verdict, confidence } = analyzeText(pr.body ?? "", { template });
 * // verdict: "ai" | "human", confidence: 0.5–1
 */
export function analyzeText(
	markdown: string,
	options: AnalyzeTextOptions = {},
): AnalyzeTextResult {
	const authored = authoredText(markdown ?? "");
	const text = options.template
		? withoutTemplate(authored, options.template)
		: authored;

	let logit = BIAS;
	const signals: SignalHit[] = [];

	for (const signal of SIGNALS) {
		const hits = signal.count(text);
		if (hits <= 0) {
			continue;
		}

		const strength = Math.min(hits, signal.cap) / signal.cap;
		const contribution = signal.weight * strength;
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
