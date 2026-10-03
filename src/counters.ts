import { prose } from "./text";

/** Minimum length for densities, so one code span in a short text isn't dense. */
const MIN_DENSITY_LENGTH = 300;

export function matches(pattern: RegExp) {
	const flags = pattern.flags.includes("g")
		? pattern.flags
		: `${pattern.flags}g`;
	const globalPattern = new RegExp(pattern.source, flags);
	return (text: string) => text.match(globalPattern)?.length ?? 0;
}

/** Like `matches`, but skips checklist items (template wording, not the author's). */
export function matchesOutsideChecklists(pattern: RegExp) {
	const count = matches(pattern);
	return (text: string) => count(text.replace(/^\s*[-*] \[[ xX]\].*$/gm, ""));
}

/** Like `matchesOutsideChecklists`, but also skips questions and "no" answers. */
export function matchesInStatements(pattern: RegExp) {
	const count = matches(pattern);
	return (text: string) =>
		text
			.split("\n")
			.filter(
				(line) =>
					!/^\s*[-*] \[[ xX]\]/.test(line) &&
					!/\?\s*(?:\*\*)?\s*$/.test(line) &&
					!/:\s*(?:\*\*)?\s*(?:no|none|n\/a)\b/i.test(line),
			)
			.reduce((sum, line) => sum + count(line), 0);
}

/** Matches per 1,000 characters. */
export function density(pattern: RegExp, count = matches(pattern)) {
	return (text: string) => {
		if (text.length === 0) {
			return 0;
		}
		return (count(text) / Math.max(text.length, MIN_DENSITY_LENGTH)) * 1000;
	};
}

/** Like `density`, but skips checklist items. */
export function densityOutsideChecklists(pattern: RegExp) {
	return density(pattern, matchesOutsideChecklists(pattern));
}

/** Prose lines of 5 or more words with no final punctuation. */
export function unpunctuatedLines(text: string) {
	const isSentence = (line: string) =>
		line.split(/\s+/).length >= 5 && !/^[-*#|>\d]/.test(line);
	const isPunctuated = (line: string) => /[.!?:)`]$/.test(line);

	return prose(text)
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => isSentence(line) && !isPunctuated(line)).length;
}

/** Prose paragraphs of 50 or more words. */
export function longParagraphs(text: string) {
	return prose(text)
		.split("\n")
		.filter(
			(line) =>
				!/^\s*(?:[-*#|>]|\d+\.)/.test(line) &&
				line.trim().split(/\s+/).length >= 50,
		).length;
}
