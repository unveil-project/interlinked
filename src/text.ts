const CHECKBOX_LINE = /^\s*[-*] \[[ xX]\]/;

/**
 * Drops text neither the author nor their agent wrote: HTML comments (PR
 * template instructions) and bot summaries such as CodeRabbit's, which would
 * otherwise read as agent prose on a human PR.
 */
export function authoredText(markdown: string) {
	return markdown
		.replace(
			/<!-- This is an auto-generated comment[\s\S]*?end of auto-generated comment[^>]*-->/g,
			"",
		)
		.replace(/<!--[\s\S]*?-->/g, "")
		.trim();
}

/** A line as compared against the template: ticks and strike-through ignored. */
function templateKey(line: string) {
	return line
		.replace(/~~/g, "")
		.replace(/\[[ xX]\]/g, "[ ]")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
}

/**
 * Drops lines copied from the repository's PR template. Its headings and prose
 * are the maintainers' structure, so they are evidence of nothing. Checklist
 * items stay: keeping and ticking them is what `template-checkboxes` measures.
 */
export function withoutTemplate(text: string, template: string) {
	const templateLines = new Set(
		authoredText(template)
			.split("\n")
			.map(templateKey)
			.filter((line) => line.length > 2),
	);
	return text
		.split("\n")
		.filter(
			(line) => CHECKBOX_LINE.test(line) || !templateLines.has(templateKey(line)),
		)
		.join("\n")
		.trim();
}

/** The text with fenced, indented and inline code blanked out. */
export function prose(text: string) {
	return text
		.replace(/```[\s\S]*?```/g, "")
		.replace(/^ {4}.*$/gm, "")
		.replace(/`[^`\n]*`/g, "X");
}
