<script lang="ts">
	import { cn } from "$lib/utils/cn";

	type CardType = "palette" | "gradient" | "image" | "generic";

	interface Props {
		type?: CardType;
		class?: string;
	}

	let { type = "generic", class: className = "" }: Props = $props();
</script>

{#if type === "palette"}
	<!-- Palette Card Skeleton -->
	<div class={cn("skeleton skeleton-glass p-3 rounded-xl border border-white/5", className)}>
		<!-- Header -->
		<div class="flex items-center justify-between mb-2">
			<div class="flex-1">
				<div class="skeleton skeleton-glass h-4 w-24 rounded mb-1"></div>
				<div class="skeleton skeleton-glass h-2 w-16 rounded"></div>
			</div>
		</div>
		<!-- Color swatches -->
		<div class="flex gap-1 h-3 mt-2">
			{#each Array(5) as _, i}
				<div
					class="skeleton skeleton-glass flex-1 rounded-full"
					style:animation-delay="{i * 50}ms"
				></div>
			{/each}
		</div>
	</div>
{:else if type === "gradient"}
	<!-- Gradient Card Skeleton -->
	<div class={cn("skeleton skeleton-glass p-3 rounded-xl border border-white/5", className)}>
		<!-- Header -->
		<div class="flex items-center justify-between mb-2">
			<div class="flex-1">
				<div class="skeleton skeleton-glass h-4 w-28 rounded mb-1"></div>
				<div class="skeleton skeleton-glass h-2 w-20 rounded"></div>
			</div>
		</div>
		<!-- Gradient preview -->
		<div class="skeleton skeleton-glass h-12 rounded-lg mt-2"></div>
	</div>
{:else if type === "image"}
	<!-- Image Card Skeleton -->
	<div
		class={cn(
			"skeleton skeleton-glass rounded-xl border border-white/5 overflow-hidden",
			className
		)}
	>
		<!-- Image area -->
		<div class="skeleton skeleton-glass aspect-square"></div>
		<!-- Caption -->
		<div class="p-2 border-t border-white/5 bg-black/20">
			<div class="skeleton skeleton-glass h-3 w-16 mx-auto rounded"></div>
		</div>
	</div>
{:else}
	<!-- Generic Card Skeleton -->
	<div class={cn("skeleton skeleton-glass p-4 rounded-xl border border-white/5", className)}>
		<div class="skeleton skeleton-glass h-4 w-3/4 rounded mb-2"></div>
		<div class="skeleton skeleton-glass h-3 w-1/2 rounded mb-4"></div>
		<div class="skeleton skeleton-glass h-20 rounded"></div>
	</div>
{/if}
