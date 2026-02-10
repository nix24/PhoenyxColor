<script lang="ts">
	import Icon from "@iconify/svelte";
	import { toast } from "svelte-sonner";
	import { cn } from "$lib/utils/cn";
	import type { ValidatedGradient } from "$lib/schemas/validation";
	import {
		generateCSSGradient,
		generateTailwindGradient,
		generateCSSVariables,
		gradientToSVG,
		type InterpolationMode,
	} from "../gradient-utils";
	import pkg from "file-saver";
	const { saveAs } = pkg;

	interface Props {
		open: boolean;
		gradient: ValidatedGradient | null;
		interpolationMode: InterpolationMode;
		onClose: () => void;
	}

	let { open, gradient, interpolationMode, onClose } = $props();

	let exportFormat = $state<"css" | "tailwind" | "variables" | "png" | "svg" | "json">("css");

	const exportOptions = [
		{ id: "css", label: "CSS", icon: "material-symbols:code", desc: "Copy CSS background property" },
		{ id: "tailwind", label: "Tailwind CSS", icon: "simple-icons:tailwindcss", desc: "Copy Tailwind gradient classes" },
		{ id: "variables", label: "CSS Variables", icon: "material-symbols:variable-add", desc: "Export as CSS custom properties" },
		{ id: "svg", label: "SVG File", icon: "material-symbols:shapes", desc: "Download as SVG vector" },
		{ id: "json", label: "JSON", icon: "material-symbols:data-object", desc: "Download gradient data" },
	] as const;

	async function handleExport() {
		if (!gradient) {
			toast.error("No gradient selected");
			return;
		}

		try {
			switch (exportFormat) {
				case "css": {
					const css = `background: ${generateCSSGradient(gradient, interpolationMode)};`;
					await navigator.clipboard.writeText(css);
					toast.success("CSS copied to clipboard!");
					break;
				}
				case "tailwind": {
					const tailwind = generateTailwindGradient(gradient);
					await navigator.clipboard.writeText(tailwind);
					toast.success("Tailwind classes copied!");
					break;
				}
				case "variables": {
					const vars = generateCSSVariables(gradient);
					await navigator.clipboard.writeText(vars);
					toast.success("CSS Variables copied!");
					break;
				}
				case "svg": {
					const svg = gradientToSVG(gradient, 800, 400);
					const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
					saveAs(blob, `${gradient.name}.svg`);
					toast.success("SVG file saved!");
					break;
				}
				case "json": {
					const json = JSON.stringify(gradient, null, 2);
					const blob = new Blob([json], { type: "application/json;charset=utf-8" });
					saveAs(blob, `${gradient.name}.json`);
					toast.success("JSON file saved!");
					break;
				}
			}
			onClose();
		} catch (error) {
			console.error("Export error:", error);
			toast.error("Export failed");
		}
	}
</script>

{#if open}
	<div
		class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
		role="dialog"
		tabindex="-1"
		onclick={(e) => e.target === e.currentTarget && onClose()}
		onkeydown={(e) => e.key === "Escape" && onClose()}
	>
		<div class="bg-base-100/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-white/10">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-lg font-bold">Export Gradient</h3>
				<button class="btn btn-sm btn-circle btn-ghost" onclick={onClose}>
					<Icon icon="material-symbols:close" class="w-4 h-4" />
				</button>
			</div>
			<div class="space-y-3 mb-6">
				{#each exportOptions as option}
					<button
						class={cn(
							"w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3",
							exportFormat === option.id
								? "bg-phoenix-primary/20 border-phoenix-primary"
								: "bg-base-200 border-base-300 hover:border-phoenix-primary/50"
						)}
						onclick={() => (exportFormat = option.id as typeof exportFormat)}
					>
						<Icon icon={option.icon} class="w-5 h-5 text-phoenix-primary" />
						<div>
							<div class="font-medium">{option.label}</div>
							<div class="text-xs text-base-content/60">{option.desc}</div>
						</div>
					</button>
				{/each}
			</div>
			<div class="flex justify-end gap-2">
				<button class="btn btn-ghost" onclick={onClose}>Cancel</button>
				<button class="btn btn-primary" onclick={handleExport}>
					<Icon icon="material-symbols:download" class="w-4 h-4" />
					Export
				</button>
			</div>
		</div>
	</div>
{/if}
