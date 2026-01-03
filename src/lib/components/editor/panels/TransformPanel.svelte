<script lang="ts">
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";
	import type { ImageEditorState } from "../EditorHistory.svelte.ts";

	let { editorState, onUpdate } = $props<{
		editorState: ImageEditorState;
		onUpdate: (updates: Partial<ImageEditorState>) => void;
	}>();
</script>

<div class="space-y-6">
	<!-- Flip Controls -->
	<div class="space-y-3">
		<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider">Flip</h4>
		<div class="grid grid-cols-2 gap-2">
			<button
				class={cn(
					"btn btn-sm gap-2 transition-all",
					editorState.flipX
						? "btn-primary"
						: "bg-white/5 border-white/10 text-white hover:bg-white/10"
				)}
				onclick={() => onUpdate({ flipX: !editorState.flipX })}
			>
				<Icon icon="material-symbols:swap-horiz" class="w-5 h-5" />
				Horizontal
			</button>
			<button
				class={cn(
					"btn btn-sm gap-2 transition-all",
					editorState.flipY
						? "btn-primary"
						: "bg-white/5 border-white/10 text-white hover:bg-white/10"
				)}
				onclick={() => onUpdate({ flipY: !editorState.flipY })}
			>
				<Icon icon="material-symbols:swap-vert" class="w-5 h-5" />
				Vertical
			</button>
		</div>
	</div>

	<!-- Rotation -->
	<div class="space-y-3">
		<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider">Rotation</h4>

		<!-- Quick Rotation Buttons -->
		<div class="grid grid-cols-4 gap-2">
			<button
				class="btn btn-sm bg-white/5 border-white/10 text-white hover:bg-white/10"
				onclick={() => onUpdate({ rotation: (editorState.rotation - 90 + 360) % 360 })}
			>
				<Icon icon="material-symbols:rotate-left" class="w-5 h-5" />
			</button>
			<button
				class="btn btn-sm bg-white/5 border-white/10 text-white hover:bg-white/10"
				onclick={() => onUpdate({ rotation: (editorState.rotation + 90) % 360 })}
			>
				<Icon icon="material-symbols:rotate-right" class="w-5 h-5" />
			</button>
			<button
				class="btn btn-sm bg-white/5 border-white/10 text-white hover:bg-white/10 col-span-2"
				onclick={() => onUpdate({ rotation: 0 })}
			>
				Reset
			</button>
		</div>

		<!-- Fine Rotation Slider -->
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<span class="text-sm text-white">Fine Rotation</span>
				<span class="text-xs font-mono text-white/60">{editorState.rotation}°</span>
			</div>
			<input
				type="range"
				min="0"
				max="360"
				step="1"
				value={editorState.rotation}
				class="range range-xs range-primary"
				oninput={(e) => onUpdate({ rotation: parseInt(e.currentTarget.value) })}
			/>
		</div>

		<!-- Rotation Presets -->
		<div class="grid grid-cols-5 gap-1">
			{#each [0, 45, 90, 180, 270] as angle}
				<button
					class={cn(
						"btn btn-xs",
						editorState.rotation === angle
							? "btn-primary"
							: "bg-white/5 border-white/10 text-white/60 hover:text-white"
					)}
					onclick={() => onUpdate({ rotation: angle })}
				>
					{angle}°
				</button>
			{/each}
		</div>
	</div>

	<!-- Scale -->
	<div class="space-y-3">
		<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider">Scale</h4>

		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<span class="text-sm text-white">Image Scale</span>
				<span class="text-xs font-mono text-white/60">{Math.round(editorState.scale * 100)}%</span>
			</div>
			<input
				type="range"
				min="0.1"
				max="3"
				step="0.05"
				value={editorState.scale}
				class="range range-xs range-primary"
				oninput={(e) => onUpdate({ scale: parseFloat(e.currentTarget.value) })}
			/>
		</div>

		<!-- Scale Presets -->
		<div class="grid grid-cols-4 gap-2">
			{#each [50, 100, 150, 200] as percent}
				<button
					class={cn(
						"btn btn-xs",
						Math.round(editorState.scale * 100) === percent
							? "btn-primary"
							: "bg-white/5 border-white/10 text-white/60 hover:text-white"
					)}
					onclick={() => onUpdate({ scale: percent / 100 })}
				>
					{percent}%
				</button>
			{/each}
		</div>
	</div>

	<!-- Reset All Transforms -->
	<div class="pt-4 border-t border-white/10">
		<button
			class="btn btn-sm w-full btn-outline btn-error"
			onclick={() =>
				onUpdate({
					rotation: 0,
					scale: 1,
					flipX: false,
					flipY: false,
				})}
		>
			<Icon icon="material-symbols:restart-alt" class="w-4 h-4" />
			Reset All Transforms
		</button>
	</div>
</div>
