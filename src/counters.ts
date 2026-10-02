import { prose } from "./text";

/**
 * Densities are taken over at least this many characters, so one code span in
 * a one-line description doesn't read as a dense one.
 */
const MIN_DENSITY_LENGTH = 300;

export function matches(pattern: RegExp) {
	const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
	const globalPattern = new RegExp(pattern.source, flags);
	return (text: string) => text.match(globalPattern)?.length ?? 0;
}

/** Occurrences per 1,000 characters. */
export function density(pattern: RegExp) {
	const count = matches(pattern);
	return (text: string) => {
		if (text.length === 0) {
			return 0;
		}
		return (count(text) / Math.max(text.length, MIN_DENSITY_LENGTH)) * 1000;
	};
}

/** Prose lines of five or more words that don't end in punctuation. */
export function unpunctuatedLines(text: string) {
	const isSentence = (line: string) =>
		line.split(/\s+/).length >= 5 && !/^[-*#|>\d]/.test(line);
	const isPunctuated = (line: string) => /[.!?:)`]$/.test(line);

	return prose(text)
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => isSentence(line) && !isPunctuated(line)).length;
}
