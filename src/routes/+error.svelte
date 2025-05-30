<script lang="ts">
	import { page } from "$app/stores";
</script>

<div class="min-h-screen bg-base-200 flex items-center justify-center">
	<div class="text-center">
		<h1 class="text-4xl font-bold text-error mb-4">
			{$page.status || "Error"}
		</h1>
		<p class="text-lg text-base-content/70 mb-6">
			{$page.error?.message || "Something went wrong"}
		</p>
		<div class="space-x-4">
			<a href="/" class="btn btn-primary">Go Home</a>
			<button class="btn btn-outline" onclick={() => window.location.reload()}>
				Reload Page
			</button>
		</div>

		{#if $page.error}
			<details class="mt-6 max-w-2xl mx-auto">
				<summary class="cursor-pointer text-sm text-base-content/50"> Technical Details </summary>
				<pre class="text-left text-xs bg-base-300 p-4 rounded mt-2 overflow-auto">
{JSON.stringify($page.error, null, 2)}
				</pre>
			</details>
		{/if}
	</div>
</div>
