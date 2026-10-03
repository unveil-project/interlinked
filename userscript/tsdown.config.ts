import { defineConfig } from "tsdown";
import pkg from "../package.json" with { type: "json" };

const header = `// ==UserScript==
// @name         interlinked
// @namespace    https://github.com/unveil-project/interlinked
// @version      ${pkg.version}
// @description  Flags PR descriptions that look agent-written
// @match        https://github.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @connect      api.github.com
// @connect      raw.githubusercontent.com
// @run-at       document-idle
// ==/UserScript==
`;

export default defineConfig({
	entry: { interlinked: "index.ts" },
	outDir: "dist",
	format: "iife",
	platform: "browser",
	dts: false,
	banner: header,
	outputOptions: { entryFileNames: "[name].user.js" },
});
