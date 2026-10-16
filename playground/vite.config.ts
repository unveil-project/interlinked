import vue from "@vitejs/plugin-vue";
import UnoCSS from "unocss/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [vue(), UnoCSS()],
	server: {
		// The examples are read from tests/fixtures, outside this folder.
		fs: { allow: [".."] },
	},
});
