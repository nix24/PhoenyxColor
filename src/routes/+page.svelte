<script lang="ts">
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";
	import Icon from "@iconify/svelte";

	// Redirect to references page on load
	onMount(() => {
		// Small delay for visual feedback
		const timer = setTimeout(() => {
			goto("/references");
		}, 400);
		return () => clearTimeout(timer);
	});
</script>

<!-- Skeleton-style loading state instead of spinner -->
<div class="h-full flex items-center justify-center">
	<div class="text-center">
		<!-- Animated logo skeleton -->
		<div class="relative w-20 h-20 mx-auto mb-6">
			<div
				class="absolute inset-0 bg-linear-to-br from-phoenix-primary to-phoenix-violet rounded-2xl animate-pulse opacity-30"
			></div>
			<div class="absolute inset-0 flex items-center justify-center">
				<Icon icon="material-symbols:brush" class="w-10 h-10 text-white/80" />
			</div>
		</div>

		<!-- Text skeleton -->
		<div class="space-y-3">
			<div class="skeleton skeleton-glass h-6 w-40 mx-auto rounded-lg"></div>
			<div class="skeleton skeleton-glass h-3 w-32 mx-auto rounded"></div>
		</div>

		<!-- Loading dots -->
		<div class="flex justify-center gap-1.5 mt-6">
			{#each [0, 1, 2] as i}
				<div
					class="w-2 h-2 rounded-full bg-phoenix-primary/60 animate-bounce"
					style:animation-delay="{i * 150}ms"
				></div>
			{/each}
		</div>
	</div>
</div>
