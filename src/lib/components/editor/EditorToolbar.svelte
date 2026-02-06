<script lang="ts">
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";

	export type EditorTool = "adjust" | "filters" | "crop" | "palette" | "effects" | "export" | null;

	let { activeTool = null, onToolSelect } = $props<{
		activeTool: EditorTool;
		onToolSelect: (tool: EditorTool) => void;
	}>();

	const tools = [
		{ id: "adjust" as const, label: "Adjust", icon: "material-symbols:tune", shortcut: "A" },
		{ id: "filters" as const, label: "Filters", icon: "material-symbols:filter-vintage", shortcut: "F" },
		{ id: "crop" as const, label: "Crop", icon: "material-symbols:crop", shortcut: "C" },
		{ id: "palette" as const, label: "Palette", icon: "material-symbols:palette", shortcut: "P" },
		{ id: "effects" as const, label: "Effects", icon: "material-symbols:auto-fix-high", shortcut: "E" },
		{ id: "export" as const, label: "Export", icon: "material-symbols:download", shortcut: "X" },
	];

	function handleToolClick(toolId: EditorTool) {
		if (activeTool === toolId) {
			onToolSelect(null);
		} else {
			onToolSelect(toolId);
		}
	}
</script>

<div
	class="flex items-center justify-around px-1 sm:px-2 py-1.5 sm:py-2 bg-black/70 backdrop-blur-xl border-t border-white/8 shrink-0"
>
	{#each tools as tool}
		<button
			class={cn(
				"flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all duration-200",
				"min-w-[48px] min-h-[48px] px-2 py-1.5 sm:px-3 sm:py-2",
				activeTool === tool.id
					? "bg-phoenix-primary text-white shadow-lg shadow-phoenix-primary/25 scale-105"
					: "text-white/50 hover:text-white hover:bg-white/8 active:bg-white/15 active:scale-95"
			)}
			onclick={() => handleToolClick(tool.id)}
			title="{tool.label} ({tool.shortcut})"
			type="button"
		>
			<Icon icon={tool.icon} class="w-5 h-5 sm:w-[22px] sm:h-[22px]" />
			<span class="text-[10px] sm:text-[11px] font-medium leading-tight">{tool.label}</span>
		</button>
	{/each}
</div>
