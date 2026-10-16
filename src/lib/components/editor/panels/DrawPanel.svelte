<script lang="ts">
import Icon from "@iconify/svelte";

interface Props {
	brushColor: string;
	brushSize: number;
	hasStrokes: boolean;
	onClear: () => void;
}

let { brushColor = $bindable(), brushSize = $bindable(), hasStrokes, onClear }: Props = $props();
</script>

<div class="space-y-5">
	<label class="grid gap-2 text-sm text-white/80" for="editor-brush-color">
		Brush color
		<input
			id="editor-brush-color"
			type="color"
			bind:value={brushColor}
			class="h-11 w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 p-1"
		/>
	</label>
	<label class="grid gap-2 text-sm text-white/80" for="editor-brush-size">
		<span class="flex items-center justify-between">
			Brush size
			<span class="font-mono text-white/60">{brushSize}px</span>
		</span>
		<input
			id="editor-brush-size"
			type="range"
			min="1"
			max="100"
			step="1"
			bind:value={brushSize}
			class="range range-xs range-primary w-full"
		/>
	</label>
	<button
		type="button"
		class="btn btn-ghost min-h-11 w-full border border-white/10"
		disabled={!hasStrokes}
		onclick={onClear}
	>
		<Icon icon="material-symbols:ink-eraser" class="h-5 w-5" />
		Clear drawing
	</button>
	<p class="text-xs leading-relaxed text-white/60">
		Drag over the image to draw. Each stroke is one undo step.
	</p>
</div>
