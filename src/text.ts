/** Removes text the author didn't write: HTML comments and bot summaries. */
export function authoredText(markdown: string) {
	return markdown
		.replace(
			/<!-- This is an auto-generated comment[\s\S]*?end of auto-generated comment[^>]*-->/g,
			"",
		)
		.replace(/<!--[\s\S]*?-->/g, "")
		.trim();
}

/** Normalizes a line for template matching, ignoring ticks, strike-through and list markers. */
function templateKey(line: string) {
	return line
		.replace(/~~/g, "")
		.replace(/^\s*[-*+]\s+(?=\[[ xX]\])/, "")
		.replace(/\[[ xX]\]/g, "[ ]")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
}

/** Removes lines copied from the PR template, ticked checklist items included. */
export function withoutTemplate(text: string, template: string) {
	const templateLines = new Set(
		authoredText(template)
			.split("\n")
			.map(templateKey)
			.filter((line) => line.length > 2),
	);
	return text
		.split("\n")
		.filter((line) => !templateLines.has(templateKey(line)))
		.join("\n")
		.trim();
}

/** Blanks out code blocks and inline code. Indented list items stay. */
export function prose(text: string) {
	return text
		.replace(/```[\s\S]*?```/g, "")
		.replace(/^ {4,}(?![-*+] |\d+\. ).*$/gm, "")
		.replace(/`[^`\n]*`/g, "X");
}
