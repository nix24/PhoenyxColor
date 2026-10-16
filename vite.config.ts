import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { playwright } from "vite-plus/test/browser-playwright";
import { configDefaults, defineConfig, lazyPlugins } from "vite-plus";
import devtoolsJson from "vite-plugin-devtools-json";

export default defineConfig({
	fmt: {
		ignorePatterns: [
			".agent/**",
			".agents/**",
			".claude/**",
			".codex/**",
			".continue/**",
			".cursor/**",
			".gemini/**",
			".opencode/**",
			".pi/**",
			".roo/**",
			".windsurf/**",
			"tools/oxlint/anti-slop/**",
		],
		trailingComma: "es5",
		useTabs: true,
		printWidth: 100,
		singleQuote: false,
	},
	lint: {
		ignorePatterns: [
			".agent/**",
			".agents/**",
			".claude/**",
			".codex/**",
			".continue/**",
			".cursor/**",
			".gemini/**",
			".opencode/**",
			".pi/**",
			".roo/**",
			".windsurf/**",
			"tools/oxlint/anti-slop/**",
		],
		jsPlugins: [
			{
				name: "anti-slop",
				specifier: "./tools/oxlint/anti-slop/index.ts",
			},
			{
				name: "vite-plus",
				specifier: "vite-plus/oxlint-plugin",
			},
		],
		rules: {
			"anti-slop/no-chained-type-assertions": "error",
			"anti-slop/no-conditional-empty-object-spread": "error",
			"anti-slop/no-known-value-widening": "error",
			"anti-slop/no-module-mocking": "error",
			"anti-slop/no-object-parameters": "error",
			"anti-slop/no-reflect-apply": "error",
			"anti-slop/no-reflect-get": "error",
			"anti-slop/no-runtime-typeof": "error",
			"anti-slop/no-shape-in-symbol-names": "error",
			"anti-slop/no-unknown-parameters": "error",
			"anti-slop/no-unknown-returns": "error",
			"anti-slop/no-unknown-type-aliases": "error",
			"anti-slop/no-unsafe-dictionary-type": "error",
			"anti-slop/no-widen-then-assert": "error",
			"anti-slop/require-safety-comment-for-type-assertion": "error",
			"no-console": [
				"error",
				{
					allow: ["warn", "error"],
				},
			],
			"no-unused-vars": "error",
			"typescript/no-explicit-any": "error",
			"vite-plus/prefer-vite-plus-imports": "error",
		},
		overrides: [
			{
				files: ["**/*.svelte"],
				rules: {
					"no-unassigned-vars": "off",
				},
				globals: {
					$state: "readonly",
					$derived: "readonly",
					$effect: "readonly",
					$props: "readonly",
					$bindable: "readonly",
					$inspect: "readonly",
					$host: "readonly",
				},
			},
		],
		options: {
			typeAware: true,
			typeCheck: true,
		},
	},
	// lazyPlugins returns undefined while vp check/lint/fmt load the config, so no plugin runs there.
	plugins: lazyPlugins(() => [tailwindcss(), sveltekit(), devtoolsJson()]) ?? [],
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
		rolldownOptions: {
			output: {
				// Manual chunks for better caching and parallel loading
				codeSplitting: {
					groups: [
						{
							name: (id) => {
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
								return null;
							},
						},
					],
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
