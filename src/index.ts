/**
 * When you're not performing your duties do they keep you in a little box?
 * Cells.
 * Interlinked.
 * What's it like to hold the hand of someone you love?
 * Interlinked.
 * Did you buy a present for the person you love?
 * Within cells interlinked.
 * Why don't you say that three times?
 * Within cells interlinked.
 * Within cells interlinked.
 * Within cells interlinked.
 */
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
	/** Probability the text is agent-written, 0 to 1. */
	probability: number;
	/** Confidence in `verdict`, 0.5 to 1. */
	confidence: number;
	signals: SignalHit[];
}

export interface AnalyzeTextOptions {
	/** The repo's PR template, raw markdown. */
	template?: string;
}

/**
 * Starting log-odds. Set so about 3% of pre-agent PRs score as AI, because a
 * false accusation is worse than a miss.
 */
const BIAS = -1.99;

export const AI_THRESHOLD = 0.5;

/**
 * Guesses whether a PR description was written by an AI agent.
 *
 * Pass the repo's PR template if you have it, so its headings and checklists
 * don't count against the author.
 *
 * @example
 * const { verdict, confidence } = analyzeText(pr.body ?? "", { template });
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
