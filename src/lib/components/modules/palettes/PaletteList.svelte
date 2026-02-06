<script lang="ts">
	import { fly } from "svelte/transition";
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
		<h3 class="text-[10px] font-semibold text-text-muted/60 uppercase tracking-widest mb-3">Workspace</h3>

		<div class="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2 space-y-1.5">
			{#if isLoading}
				{#each Array(4) as _}
					<div class="h-16 rounded-lg bg-white/5 animate-pulse"></div>
				{/each}
			{:else}
				{#each filteredPalettes as palette, i (palette.id)}
					{@const isActive = app.palettes.activePaletteId === palette.id}
					<button
						in:fly={{ y: 20, duration: 300, delay: i * 30 }}
						class={cn(
							"w-full text-left p-3 rounded-lg transition-all duration-200 group relative border",
							isActive
								? "bg-white/8 border-white/12"
								: "bg-transparent border-transparent hover:bg-white/4 hover:border-white/6"
						)}
						onclick={() => {
							app.palettes.setActive(palette.id);
							onSelect?.();
						}}
					>
						<!-- Active indicator line -->
						{#if isActive}
							<div
								class="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-phoenix-primary"
							></div>
						{/if}

						<div class="flex items-center justify-between mb-2">
							<h4 class="text-sm font-medium text-white truncate pr-4">{palette.name}</h4>
							{#if isActive}
								<div class="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
							{/if}
						</div>

						<!-- Full-spectrum Color Bar -->
						<div class="h-2.5 w-full rounded-full flex overflow-hidden bg-black/40 mb-2">
							{#if palette.colors.length > 0}
								{#each palette.colors as color}
									<div class="h-full transition-all duration-300" style:background-color={color} style:flex="1 1 0%"></div>
								{/each}
							{:else}
								<div class="w-full h-full bg-white/8"></div>
							{/if}
						</div>

						<div class="flex justify-between items-center text-[10px] text-text-muted/50">
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
