import { measure } from "./measure";
import { SIGNALS } from "./signals";
import { round, sigmoid } from "./utils";

export type { Signal } from "./signals";
export { SIGNALS };

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
 * Starting log-odds before any evidence, from the fit, set so about 3% of
 * pre-agent PR descriptions read as agent-written: a false accusation costs
 * more than a miss.
 */
const BIAS = -1.99;

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
	let logit = BIAS;
	const signals: SignalHit[] = [];

	const active = SIGNALS.filter((signal) => signal.weight !== 0);
	for (const { signal, hits, strength } of measure(
		markdown,
		options.template,
		active,
	)) {
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
