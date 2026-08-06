// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightTypeDoc, { typeDocSidebarGroup } from 'starlight-typedoc';

// https://astro.build/config
export default defineConfig({
	site: 'https://phoenyxcolor.app',
	integrations: [
		starlight({
			title: 'PhoenyxColor Docs',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/withastro/starlight' }],
			plugins: [
				// Generate TypeDoc documentation from all TypeScript files in src/lib
				starlightTypeDoc({
					entryPoints: [
						'../src/lib/schemas/**/*.ts',
						'../src/lib/services/**/*.ts',
						'../src/lib/stores/**/*.svelte.ts',
						'../src/lib/utils/**/*.ts',
					],
					tsconfig: '../tsconfig.json',
					output: 'reference/api',
					typeDoc: {
						excludePrivate: true,
						excludeInternal: true,
						excludeExternals: true,
					},
				}),
			],
			sidebar: [
				{
					label: 'Guides',
					items: [
						{ label: 'Getting Started', slug: 'guides/example' },
						{ label: 'Architecture', slug: 'guides/architecture' },
						{ label: 'WASM & Effects', slug: 'guides/wasm-effects' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'Type Definitions', slug: 'reference/example' },
						// Add the auto-generated TypeDoc sidebar group
						typeDocSidebarGroup,
					],
				},
			],
		}),
	],
});
