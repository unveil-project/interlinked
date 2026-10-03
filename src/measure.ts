import { SIGNALS, type Signal } from "./signals";
import { authoredText, prose, withoutTemplate } from "./text";

export interface Measurement {
	signal: Signal;
	hits: number;
	/** Hits divided by the signal's cap, 0 to 1. */
	strength: number;
}

/** Runs every signal on a description, before weighting. Used by `analyzeText` and the weight fit. */
export function measure(
	markdown: string,
	template?: string,
	signals: Signal[] = SIGNALS,
): Measurement[] {
	const authored = authoredText(markdown ?? "");
	const text = template ? withoutTemplate(authored, template) : authored;
	const proseText = prose(text);

	const measurements: Measurement[] = [];
	for (const signal of signals) {
		const hits = signal.count(signal.prose ? proseText : text);
		if (hits > 0) {
			measurements.push({
				signal,
				hits,
				strength: Math.min(hits, signal.cap) / signal.cap,
			});
		}
	}
	return measurements;
}
