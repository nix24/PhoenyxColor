import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const config = {
	preprocess: vitePreprocess(),
	// Local-first SPA: every route renders on the client; the fallback page serves deep links.
	kit: { adapter: adapter({ fallback: "index.html" }) },
};

export default config;
