<script lang="ts">
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";

	export type EditorTool = "adjust" | "filters" | "crop" | "palette" | "effects" | "export" | null;

	let { activeTool = null, onToolSelect } = $props<{
		activeTool: EditorTool;
		onToolSelect: (tool: EditorTool) => void;
	}>();

	const tools = [
		{ id: "adjust" as const, label: "Adjust", icon: "material-symbols:tune" },
		{ id: "filters" as const, label: "Filters", icon: "material-symbols:filter-vintage" },
		{ id: "crop" as const, label: "Crop", icon: "material-symbols:crop" },
		{ id: "palette" as const, label: "Palette", icon: "material-symbols:palette" },
		{ id: "effects" as const, label: "Effects", icon: "material-symbols:auto-fix-high" },
		{ id: "export" as const, label: "Export", icon: "material-symbols:download" },
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
	class="flex items-center justify-around gap-1 px-2 py-2 bg-void-deep/90 backdrop-blur-xl border-t border-white/10"
>
	{#each tools as tool}
		<button
			class={cn(
				"flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[60px]",
				activeTool === tool.id
					? "bg-phoenix-primary text-white shadow-lg shadow-phoenix-primary/30 scale-105"
					: "text-white/60 hover:text-white hover:bg-white/10"
			)}
			onclick={() => handleToolClick(tool.id)}
		>
			<Icon icon={tool.icon} class="w-6 h-6" />
			<span class="text-[10px] font-medium uppercase tracking-wider">{tool.label}</span>
		</button>
	{/each}
</div>
