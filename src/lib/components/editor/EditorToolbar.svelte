<script lang="ts">
import Icon from "@iconify/svelte";
import { cn } from "$lib/utils/cn";
import { EDITOR_TOOLS, shortcutHint, type EditorTool } from "./editor-shortcuts";

let { activeTool = null, onToolSelect } = $props<{
	activeTool: EditorTool | null;
	/** `null` closes the open tool (its button pressed again). */
	onToolSelect: (tool: EditorTool | null) => void;
}>();
</script>

<nav
	class="flex shrink-0 items-center justify-between gap-0.5 border-t border-white/8 bg-black/70 px-1 py-1.5 backdrop-blur-xl sm:justify-center sm:gap-1 sm:px-2 sm:py-2"
	aria-label="Editor tools"
>
	{#each EDITOR_TOOLS as tool (tool.id)}
		{@const isActive = activeTool === tool.id}
		<button
			class={cn(
				"flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1.5 transition-colors duration-150 sm:flex-none sm:px-3 sm:py-2",
				"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phoenix-primary",
				isActive
					? "bg-phoenix-primary text-white shadow-lg shadow-phoenix-primary/25"
					: "text-white/60 hover:text-white hover:bg-white/8 active:bg-white/15"
			)}
			onclick={() => onToolSelect(isActive ? null : tool.id)}
			title={shortcutHint(`tool:${tool.id}`)}
			aria-pressed={isActive}
			type="button"
		>
			<Icon icon={tool.icon} class="h-5 w-5 sm:h-5.5 sm:w-5.5" />
			<span class="text-[10px] font-medium leading-tight sm:text-[11px]">{tool.label}</span>
		</button>
	{/each}
</nav>
