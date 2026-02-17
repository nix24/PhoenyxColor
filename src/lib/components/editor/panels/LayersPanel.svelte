<script lang="ts">
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";
	import { BLEND_MODES, type ImageLayer, type BlendMode } from "$lib/types/image-editor";

	let {
		layers = [],
		activeLayerId = null,
		onAddImageLayer,
		onRemoveLayer,
		onUpdateLayer,
		onDuplicateLayer,
		onReorderLayer,
		onSetActiveLayer,
		onMergeDown,
		onFlattenAll,
	} = $props<{
		layers: ImageLayer[];
		activeLayerId: string | null;
		onAddImageLayer: () => void;
		onRemoveLayer: (id: string) => void;
		onUpdateLayer: (id: string, updates: Partial<ImageLayer>) => void;
		onDuplicateLayer: (id: string) => void;
		onReorderLayer: (fromIndex: number, toIndex: number) => void;
		onSetActiveLayer: (id: string | null) => void;
		onMergeDown: (id: string) => void;
		onFlattenAll: () => void;
	}>();

	let dragIndex = $state<number | null>(null);
	let dropIndex = $state<number | null>(null);
	let editingNameId = $state<string | null>(null);
	let editingNameValue = $state("");

	// Layers are displayed top-to-bottom (last layer = top of stack = first in list)
	const displayLayers = $derived([...layers].reverse());

	function handleDragStart(index: number) {
		dragIndex = index;
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		dropIndex = index;
	}

	function handleDrop(index: number) {
		if (dragIndex === null || dragIndex === index) {
			dragIndex = null;
			dropIndex = null;
			return;
		}
		// Convert display indices back to layers array indices
		const fromActual = layers.length - 1 - dragIndex;
		const toActual = layers.length - 1 - index;
		onReorderLayer(fromActual, toActual);
		dragIndex = null;
		dropIndex = null;
	}

	function handleDragEnd() {
		dragIndex = null;
		dropIndex = null;
	}

	function startRename(layer: ImageLayer) {
		editingNameId = layer.id;
		editingNameValue = layer.name;
	}

	function commitRename(layerId: string) {
		if (editingNameValue.trim()) {
			onUpdateLayer(layerId, { name: editingNameValue.trim() });
		}
		editingNameId = null;
	}

	function handleOpacityChange(layerId: string, value: number) {
		onUpdateLayer(layerId, { opacity: value / 100 });
	}

	function handleBlendModeChange(layerId: string, value: string) {
		onUpdateLayer(layerId, { blendMode: value as BlendMode });
	}

</script>

<!-- Layer Actions Bar -->
<div class="flex items-center gap-1.5 mb-3">
	<button
		class="btn btn-xs btn-ghost gap-1 text-white/60 hover:text-white"
		onclick={onAddImageLayer}
		title="Add Image Layer"
		type="button"
	>
		<Icon icon="material-symbols:add-photo-alternate-outline" class="w-4 h-4" />
		<span class="text-[11px]">Add Image</span>
	</button>
	<div class="flex-1"></div>
	{#if layers.length > 0}
		<button
			class="btn btn-xs btn-ghost text-white/40 hover:text-white"
			onclick={onFlattenAll}
			title="Flatten All Layers"
			type="button"
		>
			<Icon icon="material-symbols:layers-clear" class="w-3.5 h-3.5" />
		</button>
	{/if}
</div>

<!-- Active Layer Controls -->
{#if activeLayerId}
	{@const activeLayer = layers.find((l: ImageLayer) => l.id === activeLayerId)}
	{#if activeLayer}
		<div class="mb-3 p-2.5 rounded-lg bg-white/3 border border-white/5 space-y-2">
			<!-- Blend Mode -->
			<div class="flex items-center gap-2">
				<label class="text-[10px] text-white/40 uppercase tracking-wider w-12 shrink-0" for="blend-mode-select">Blend</label>
				<select
					id="blend-mode-select"
					class="select select-xs bg-white/5 border-white/10 text-white/80 flex-1 text-xs"
					value={activeLayer.blendMode}
					onchange={(e) => handleBlendModeChange(activeLayerId!, (e.target as HTMLSelectElement).value)}
				>
					{#each BLEND_MODES as mode}
						<option value={mode.value}>{mode.label}</option>
					{/each}
				</select>
			</div>

			<!-- Opacity -->
			<div class="flex items-center gap-2">
				<label class="text-[10px] text-white/40 uppercase tracking-wider w-12 shrink-0" for="layer-opacity">Opacity</label>
				<input
					id="layer-opacity"
					type="range"
					min="0"
					max="100"
					value={Math.round(activeLayer.opacity * 100)}
					oninput={(e) => handleOpacityChange(activeLayerId!, Number((e.target as HTMLInputElement).value))}
					class="range range-xs range-primary flex-1"
				/>
				<span class="text-[11px] text-white/50 w-8 text-right tabular-nums">
					{Math.round(activeLayer.opacity * 100)}%
				</span>
			</div>
		</div>
	{/if}
{/if}

<!-- Layer Stack -->
<div class="space-y-0.5">
	{#if displayLayers.length === 0}
		<div class="text-center py-8">
			<Icon icon="material-symbols:layers-outline" class="w-10 h-10 text-white/15 mx-auto mb-2" />
			<p class="text-xs text-white/30">No layers added</p>
			<p class="text-[10px] text-white/20 mt-1">Add an image layer to start blending</p>
		</div>
	{:else}
		{#each displayLayers as layer, i (layer.id)}
			{@const isActive = layer.id === activeLayerId}
			{@const actualIndex = layers.length - 1 - i}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div
				class={cn(
					"group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-150",
					isActive
						? "bg-phoenix-primary/10 border border-phoenix-primary/30"
						: "hover:bg-white/5 border border-transparent",
					dropIndex === i && dragIndex !== i ? "border-t-2 border-t-phoenix-primary" : "",
					dragIndex === i ? "opacity-40" : ""
				)}
				onclick={() => onSetActiveLayer(layer.id)}
				ondragstart={() => handleDragStart(i)}
				ondragover={(e) => handleDragOver(e, i)}
				ondrop={() => handleDrop(i)}
				ondragend={handleDragEnd}
				draggable={!layer.locked}
			>
				<!-- Drag Handle -->
				<div class="cursor-grab active:cursor-grabbing text-white/20 hover:text-white/40 shrink-0">
					<Icon icon="material-symbols:drag-indicator" class="w-3.5 h-3.5" />
				</div>

				<!-- Thumbnail -->
				<div class="w-8 h-8 rounded bg-white/5 overflow-hidden shrink-0 border border-white/10">
					{#if layer.thumbnailSrc}
						<img src={layer.thumbnailSrc} alt={layer.name} class="w-full h-full object-cover" />
					{:else}
						<div class="w-full h-full flex items-center justify-center">
							<Icon icon="material-symbols:image-outline" class="w-4 h-4 text-white/20" />
						</div>
					{/if}
				</div>

				<!-- Name -->
				<div class="flex-1 min-w-0">
					{#if editingNameId === layer.id}
						<input
							type="text"
							class="input input-xs bg-white/5 border-white/20 text-white text-xs w-full"
							bind:value={editingNameValue}
							onblur={() => commitRename(layer.id)}
							onkeydown={(e) => { if (e.key === "Enter") commitRename(layer.id); if (e.key === "Escape") editingNameId = null; }}
							autofocus
						/>
					{:else}
						<span
							class={cn(
								"text-xs truncate block",
								isActive ? "text-white font-medium" : "text-white/60"
							)}
							ondblclick={() => startRename(layer)}
							role="textbox"
							tabindex="0"
						>
							{layer.name}
						</span>
						{#if layer.blendMode !== "normal"}
							<span class="text-[9px] text-white/30">{layer.blendMode}</span>
						{/if}
					{/if}
				</div>

				<!-- Layer Actions -->
				<div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
					<!-- Visibility -->
					<button
						class={cn(
							"w-6 h-6 rounded flex items-center justify-center transition-colors",
							layer.visible ? "text-white/50 hover:text-white" : "text-white/20 hover:text-white/40"
						)}
						onclick={(e) => { e.stopPropagation(); onUpdateLayer(layer.id, { visible: !layer.visible }); }}
						title={layer.visible ? "Hide layer" : "Show layer"}
						type="button"
					>
						<Icon icon={layer.visible ? "material-symbols:visibility" : "material-symbols:visibility-off"} class="w-3.5 h-3.5" />
					</button>

					<!-- Lock -->
					<button
						class={cn(
							"w-6 h-6 rounded flex items-center justify-center transition-colors",
							layer.locked ? "text-phoenix-primary/70" : "text-white/30 hover:text-white/50"
						)}
						onclick={(e) => { e.stopPropagation(); onUpdateLayer(layer.id, { locked: !layer.locked }); }}
						title={layer.locked ? "Unlock layer" : "Lock layer"}
						type="button"
					>
						<Icon icon={layer.locked ? "material-symbols:lock" : "material-symbols:lock-open"} class="w-3 h-3" />
					</button>

					<!-- More Actions -->
					<div class="dropdown dropdown-end">
						<button
							class="w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-white/60"
							tabindex="0"
							onclick={(e) => e.stopPropagation()}
							type="button"
						>
							<Icon icon="material-symbols:more-vert" class="w-3.5 h-3.5" />
						</button>
						<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
						<ul tabindex="0" class="dropdown-content z-50 menu p-1 shadow-xl bg-void-deep border border-white/10 rounded-lg w-36">
							<li>
								<button class="text-xs text-white/70" onclick={() => onDuplicateLayer(layer.id)} type="button">
									<Icon icon="material-symbols:content-copy" class="w-3.5 h-3.5" /> Duplicate
								</button>
							</li>
							{#if actualIndex > 0}
								<li>
									<button class="text-xs text-white/70" onclick={() => onMergeDown(layer.id)} type="button">
										<Icon icon="material-symbols:merge" class="w-3.5 h-3.5" /> Merge Down
									</button>
								</li>
							{/if}
							<li>
								<button class="text-xs text-red-400/80 hover:text-red-300" onclick={() => onRemoveLayer(layer.id)} type="button">
									<Icon icon="material-symbols:delete-outline" class="w-3.5 h-3.5" /> Delete
								</button>
							</li>
						</ul>
					</div>
				</div>
			</div>
		{/each}
	{/if}
</div>

<!-- Base Image Indicator -->
<div class="mt-2 pt-2 border-t border-white/5">
	<div class="flex items-center gap-2 px-2 py-1.5 text-white/30">
		<Icon icon="material-symbols:image" class="w-4 h-4" />
		<span class="text-[11px]">Base Image (Background)</span>
		<Icon icon="material-symbols:lock" class="w-3 h-3 ml-auto" />
	</div>
</div>
