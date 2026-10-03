import { defineConfig } from "tsdown";

export default defineConfig({
	entry: { index: "index.ts" },
	outDir: "dist",
	format: "esm",
	platform: "node",
	dts: false,
});
