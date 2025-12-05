<script lang="ts">
	import { cn } from "$lib/utils/cn";

	type SkeletonVariant = "text" | "text-sm" | "circle" | "card" | "rect" | "palette" | "gradient";

	interface Props {
		variant?: SkeletonVariant;
		class?: string;
		width?: string;
		height?: string;
		count?: number;
		gap?: string;
		glass?: boolean;
	}

	let {
		variant = "rect",
		class: className = "",
		width,
		height,
		count = 1,
		gap = "0.5rem",
		glass = true,
	}: Props = $props();

	const variantClasses: Record<SkeletonVariant, string> = {
		text: "skeleton-text h-4 w-full",
		"text-sm": "skeleton-text-sm h-3",
		circle: "skeleton-circle",
		card: "skeleton-card",
		rect: "skeleton-rect",
		palette: "skeleton-rect h-3 rounded-full",
		gradient: "skeleton-rect h-12 rounded-lg",
	};
</script>

{#if count > 1}
	<div class="flex flex-col" style:gap>
		{#each Array(count) as _, i}
			<div
				class={cn("skeleton", variantClasses[variant], glass && "skeleton-glass", className)}
				style:width
				style:height
				style:animation-delay="{i * 100}ms"
			></div>
		{/each}
	</div>
{:else}
	<div
		class={cn("skeleton", variantClasses[variant], glass && "skeleton-glass", className)}
		style:width
		style:height
	></div>
{/if}
