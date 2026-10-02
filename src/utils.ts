export function round(n: number, digits = 2) {
	const factor = 10 ** digits;
	return Math.round(n * factor) / factor;
}

export function sigmoid(x: number) {
	return 1 / (1 + Math.exp(-x));
}
