import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { playwright } from "@vitest/browser-playwright";
import { configDefaults, defineConfig } from "vitest/config";
import devtoolsJson from "vite-plugin-devtools-json";

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), devtoolsJson()],
	resolve: {
		conditions: ["browser"],
	},
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: "unit",
					environment: "jsdom",
					exclude: [...configDefaults.exclude, "**/*.browser.test.ts"],
				},
			},
			{
				// Real Chromium for what jsdom cannot do: image decoding, OffscreenCanvas, WebGL2.
				extends: true,
				test: {
					name: "browser",
					include: ["src/**/*.browser.test.ts"],
					browser: {
						enabled: true,
						headless: true,
						provider: playwright(),
						instances: [{ browser: "chromium" }],
					},
				},
			},
		],
	},
	optimizeDeps: {
		// Pre-bundle these dependencies for faster dev startup
		include: ["svelte-sonner", "chroma-js", "colord", "culori", "idb"],
	},
	build: {
		// Generate source maps for production debugging (optional, can be disabled)
		sourcemap: false,
		// Increase chunk size warning limit (we're handling chunking manually)
		chunkSizeWarningLimit: 600,
		rollupOptions: {
			output: {
				// Manual chunks for better caching and parallel loading
				manualChunks: (id) => {
					// Vendor chunks for commonly used libraries
					if (id.includes("node_modules")) {
						// Color manipulation libraries - frequently used together
						if (id.includes("chroma-js") || id.includes("colord") || id.includes("culori")) {
							return "vendor-color";
						}
						// Storage libraries
						if (id.includes("idb")) {
							return "vendor-storage";
						}
						// UI components from external packages
						if (id.includes("svelte-sonner") || id.includes("svelte-dnd-action")) {
							return "vendor-ui";
						}
						// Icon library (lazy loaded by Iconify anyway)
						if (id.includes("@iconify")) {
							return "vendor-icons";
						}
						// Zod validation
						if (id.includes("zod")) {
							return "vendor-validation";
						}
					}
				},
			},
		},
	},
	// Improve dev server performance
	server: {
		// Enable faster HMR
		hmr: {
			overlay: true,
		},
		// Warm up frequently used files
		warmup: {
			clientFiles: ["./src/routes/+layout.svelte", "./src/lib/stores/root.svelte.ts"],
		},
	},
});
