<script lang="ts">
	import { app } from "$lib/stores/root.svelte";
	import Icon from "@iconify/svelte";
	import GlassPanel from "$lib/components/ui/GlassPanel.svelte";
	import { cn } from "$lib/utils/cn";
	import { generateCSSGradient } from "./gradient-utils";
	import type { ValidatedGradient } from "$lib/schemas/validation";
	import { toast } from "svelte-sonner";

	interface Props {
		searchTerm?: string;
		onCreateNew?: () => void;
		onGenerate?: () => void;
		onFromImage?: () => void;
		onFromPalette?: () => void;
	}

	let {
		searchTerm = $bindable(""),
		onCreateNew,
		onGenerate,
		onFromImage,
		onFromPalette,
	} = $props();

	let filteredGradients = $derived(
		app.gradients.gradients.filter((gradient) =>
			(gradient.name || "Untitled").toLowerCase().includes((searchTerm || "").toLowerCase())
		)
	);
</script>

<div class="flex flex-col h-full gap-4 w-full">
	<!-- Quick Actions -->
	<div class="grid grid-cols-2 gap-3 h-24">
		<button
			class="glass-panel p-0 flex flex-col items-center justify-center gap-2 bg-black/30 hover:bg-white/5 transition-all group border-white/5 hover:border-phoenix-primary/30 shadow-lg"
			onclick={onFromImage}
		>
			<Icon
				icon="material-symbols:image-outline"
				class="text-2xl text-phoenix-primary group-hover:scale-110 transition-transform"
			/>
			<span class="text-xs font-semibold text-text-muted group-hover:text-white transition-colors"
				>From Image</span
			>
		</button>
		<button
			class="glass-panel p-0 flex flex-col items-center justify-center gap-2 bg-black/30 hover:bg-white/5 transition-all group border-white/5 hover:border-phoenix-violet/30 shadow-lg"
			onclick={() => onFromPalette?.()}
		>
			<Icon
				icon="material-symbols:palette-outline"
				class="text-2xl text-phoenix-violet group-hover:scale-110 transition-transform"
			/>
			<span class="text-xs font-semibold text-text-muted group-hover:text-white transition-colors"
				>From Palette</span
			>
		</button>
	</div>

	<!-- Library -->
	<div class="flex flex-col flex-1 min-h-0">
		<div class="flex items-center justify-between mb-3 px-1">
			<span class="text-xs font-bold text-text-muted uppercase tracking-wider">Library</span>
			<div class="flex gap-2">
				<button class="hover:text-white text-text-muted transition-colors">
					<Icon icon="material-symbols:grid-view" />
				</button>
				<button class="hover:text-white text-text-muted transition-colors">
					<Icon icon="material-symbols:list" />
				</button>
			</div>
		</div>

		<div class="grid grid-cols-2 gap-3 overflow-y-auto pr-2 custom-scrollbar content-start">
			<!-- New Gradient Card -->
			<button
				class="aspect-square rounded-xl border-2 border-dashed border-white/10 hover:border-phoenix-primary/50 flex flex-col items-center justify-center gap-2 group transition-all"
				onclick={onCreateNew}
			>
				<div
					class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-phoenix-primary/20 transition-colors"
				>
					<Icon icon="material-symbols:add" class="text-white ml-0.5" />
				</div>
			</button>

			{#each filteredGradients as gradient (gradient.id)}
				<button
					class={cn(
						"aspect-square rounded-xl p-1 relative group transition-all border",
						app.gradients.activeGradientId === gradient.id
							? "border-phoenix-primary ring-1 ring-phoenix-primary shadow-lg shadow-phoenix-primary/20"
							: "border-white/5 hover:border-white/20"
					)}
					onclick={() => app.gradients.setActive(gradient.id)}
				>
					<div
						class="w-full h-full rounded-lg"
						style:background={generateCSSGradient(gradient)}
					></div>

					<div
						class="absolute inset-x-0 bottom-0 p-2 bg-linear-to-t from-black/80 to-transparent rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-end"
					>
						<span class="text-[10px] font-medium text-white truncate max-w-[70%]"
							>{gradient.name}</span
						>
						{#if app.gradients.activeGradientId === gradient.id}
							<div
								class="w-4 h-4 rounded-full bg-white text-phoenix-primary flex items-center justify-center"
							>
								<Icon icon="material-symbols:check" class="text-xs" />
							</div>
						{/if}
					</div>
				</button>
			{/each}
		</div>
	</div>
</div>
