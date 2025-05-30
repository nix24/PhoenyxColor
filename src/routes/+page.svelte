<script lang="ts">
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";

	// Redirect to references page on load
	onMount(() => {
		goto("/references");
	});
</script>

<div class="h-full flex items-center justify-center">
	<div class="text-center">
		<div class="loading loading-spinner loading-lg text-primary"></div>
		<p class="mt-4 text-base-content/70">Loading PhoenyxColor...</p>
	</div>
</div>
