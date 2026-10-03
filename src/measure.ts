import { SIGNALS, type Signal } from "./signals";
import { authoredText, prose, withoutTemplate } from "./text";

export interface Measurement {
	signal: Signal;
	hits: number;
	/** Hits as a share of the signal's cap, 0–1; the weight scales this. */
	strength: number;
}

/**
 * Every signal that fires on a description, before weighting. Shared by
 * `analyzeText` and the weight fit, so both read a description the same way.
 */
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
