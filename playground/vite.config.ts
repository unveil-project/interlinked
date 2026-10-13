import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [vue()],
	server: {
		// The examples are read from tests/fixtures, outside this folder.
		fs: { allow: [".."] },
	},
});
