<script lang="ts">
	import { fly } from "svelte/transition";
	import { elasticOut } from "svelte/easing";
	import { onMount } from "svelte";
	import { app } from "$lib/stores/root.svelte";
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";

	interface Props {
		searchTerm?: string;
		onCreateNew?: () => void;
		onExtract?: () => void;
		onDelete?: () => void;
		onSelect?: () => void;
	}

	let { searchTerm = "", onCreateNew, onExtract, onDelete, onSelect }: Props = $props();

	// Initial loading state for skeleton display
	let isLoading = $state(true);

	onMount(() => {
		const timer = setTimeout(() => {
			isLoading = false;
		}, 300);
		return () => clearTimeout(timer);
	});

	let filteredPalettes = $derived(
		app.palettes.palettes.filter(
			(palette) =>
				palette.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				palette.colors.some((color) => color.toLowerCase().includes(searchTerm.toLowerCase()))
		)
	);

	function timeAgo(date: Date) {
		if (!date) return "";
		const now = new Date();
		const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);

		const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

		if (diffInSeconds < 60) return "just now";
		if (diffInSeconds < 3600) return rtf.format(-Math.floor(diffInSeconds / 60), "minute");
		if (diffInSeconds < 86400) return rtf.format(-Math.floor(diffInSeconds / 3600), "hour");
		return rtf.format(-Math.floor(diffInSeconds / 86400), "day");
	}
</script>

<div class="w-full h-full flex flex-col gap-4 p-4">
	<!-- Actions -->
	<div class="space-y-2">
		<button
			class="btn btn-outline border-white/20 hover:border-white/40 hover:bg-white/5 w-full normal-case gap-2 text-white h-11"
			onclick={onCreateNew}
		>
			<Icon icon="material-symbols:add" class="w-5 h-5 text-phoenix-primary" />
			New Palette
		</button>

		<div class="grid grid-cols-2 gap-2">
			<button
				class="h-10 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-text-muted hover:text-white text-xs"
				onclick={onExtract}
			>
				<Icon icon="material-symbols:colorize" class="w-4 h-4 mr-1.5" />
				Extract
			</button>
			<button
				class="h-10 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/50 transition-all text-text-muted hover:text-red-400 text-xs"
				onclick={onDelete}
				disabled={!app.palettes.activePaletteId}
			>
				<Icon icon="material-symbols:delete-outline" class="w-4 h-4 mr-1.5" />
				Delete
			</button>
		</div>
	</div>

	<!-- Workspace List -->
	<div class="flex-1 flex flex-col min-h-0">
		<h3 class="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Workspace</h3>

		<div class="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2 space-y-2">
			{#if isLoading}
				{#each Array(4) as _}
					<div class="h-16 rounded-lg bg-white/5 animate-pulse"></div>
				{/each}
			{:else}
				{#each filteredPalettes as palette, i (palette.id)}
					<button
						in:fly={{ y: 20, duration: 300, delay: i * 30 }}
						class={cn(
							"w-full text-left p-3 rounded-lg transition-all duration-200 group relative border",
							app.palettes.activePaletteId === palette.id
								? "bg-white/10 border-phoenix-primary/50 shadow-[inset_4px_0_0_0_#ff0080]"
								: "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10"
						)}
						onclick={() => {
							app.palettes.setActive(palette.id);
							onSelect?.();
						}}
					>
						{#if app.palettes.activePaletteId === palette.id}
							<div
								class="absolute right-2 top-2 p-1 rounded-full shadow-[0_0_8px_#a3e635] bg-[#a3e635]"
							></div>
						{/if}

						<h4 class="text-sm font-medium text-white mb-2 truncate pr-6">{palette.name}</h4>

						<!-- Color Bar -->
						<div class="h-2 w-full rounded-full flex overflow-hidden bg-black/50 mb-2">
							{#if palette.colors.length > 0}
								{#each palette.colors.slice(0, 5) as color}
									<div class="flex-1 h-full" style:background-color={color}></div>
								{/each}
							{:else}
								<div class="w-full h-full bg-white/10"></div>
							{/if}
							<!-- Empty slot indicator if less than max -->
							{#if palette.colors.length < 5}
								<div class="flex-1 bg-transparent"></div>
							{/if}
						</div>

						<div class="flex justify-between items-center text-[10px] text-text-muted">
							<span>{palette.colors.length} Swatches</span>
							<span>{timeAgo(palette.createdAt)}</span>
						</div>
					</button>
				{/each}

				{#if filteredPalettes.length === 0}
					<div class="text-center py-8 text-text-muted/50">
						<p class="text-sm">No palettes found</p>
					</div>
				{/if}
			{/if}
		</div>
	</div>
</div>
