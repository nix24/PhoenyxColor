<script lang="ts">
import Icon from "@iconify/svelte";
import { cn } from "$lib/utils/cn";

/**
 * The editor's inspector. It sits in the layout next to the canvas (beside it from `md` up,
 * below it on phones), so the canvas shrinks and refits instead of being covered.
 */
let {
	title,
	icon,
	onClose,
	children,
	size = "md",
} = $props<{
	title: string;
	icon?: string;
	onClose: () => void;
	children: import("svelte").Snippet;
	size?: "md" | "lg";
}>();
</script>

<aside
	class={cn(
		"flex min-h-0 flex-col bg-void-deep/97 backdrop-blur-2xl",
		// Phone: a short sheet under the canvas; the toolbar stays below it.
		"max-h-[42dvh] w-full shrink-0 rounded-t-2xl border-t border-white/8",
		// Tablet and up: a column beside the canvas.
		"md:max-h-none md:rounded-none md:border-t-0 md:border-l md:w-80",
		size === "lg" ? "lg:w-104" : "lg:w-88"
	)}
	aria-labelledby="editor-panel-title"
>
	<div class="flex items-center justify-between border-b border-white/5 px-4 py-2 shrink-0">
		<div class="flex items-center gap-2.5">
			{#if icon}
				<div class="w-7 h-7 rounded-lg bg-phoenix-primary/15 flex items-center justify-center">
					<Icon {icon} class="w-4 h-4 text-phoenix-primary" />
				</div>
			{/if}
			<h3 id="editor-panel-title" class="text-sm font-bold text-white tracking-wide">{title}</h3>
		</div>
		<button
			class="w-11 h-11 -mr-2 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-phoenix-primary"
			onclick={onClose}
			aria-label={`Close ${title} (Esc)`}
			type="button"
		>
			<Icon icon="material-symbols:close" class="w-5 h-5" />
		</button>
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
		<div class="p-4 pb-6">
			{@render children()}
		</div>
	</div>
</aside>
