<script lang="ts">
	import { scale } from "svelte/transition";
	import { cubicOut } from "svelte/easing";
	import Icon from "@iconify/svelte";
	import { toast } from "svelte-sonner";
	import { sortPalette } from "$lib/utils/color-engine";
	import type { ValidatedGradientStop } from "$lib/schemas/validation";

	interface Props {
		open: boolean;
		onClose: () => void;
		onExtract: (stops: ValidatedGradientStop[], name: string) => void;
	}

	let { open, onClose, onExtract } = $props();

	let file: File | null = $state(null);
	let preview = $state("");
	let colorCount = $state(5);
	let isExtracting = $state(false);

	function handleImageSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const selected = input.files?.[0];
		if (!selected) return;

		if (!selected.type.startsWith("image/")) {
			toast.error("Please select an image file");
			return;
		}

		file = selected;
		preview = URL.createObjectURL(selected);
	}

	function clearImage() {
		if (preview) URL.revokeObjectURL(preview);
		file = null;
		preview = "";
	}

	async function handleExtract() {
		if (!file || !preview) {
			toast.error("Please select an image first");
			return;
		}

		isExtracting = true;
		try {
			const { extractPalette } = await import("$lib/utils/color-engine");
			const colors = await extractPalette(preview, {
				colorCount,
				quality: "balanced",
			});
			const sortedColors = sortPalette(colors);
			const stops: ValidatedGradientStop[] = sortedColors.map((color, index) => ({
				color,
				position: (index / (sortedColors.length - 1)) * 100,
			}));

			const baseName = file.name.replace(/\.[^/.]+$/, "");
			onExtract(stops, `${baseName} Gradient`);
			clearImage();
		} catch (error) {
			console.error("Error extracting colors:", error);
			toast.error("Failed to extract colors from image");
		} finally {
			isExtracting = false;
		}
	}
</script>

{#if open}
	<div
		class="fixed inset-0 modal-backdrop-blur flex items-center justify-center z-50 p-4"
		onclick={(e) => e.target === e.currentTarget && onClose()}
		onkeydown={(e) => e.key === "Escape" && onClose()}
		role="dialog"
		tabindex="-1"
	>
		<div
			in:scale={{ duration: 200, start: 0.95, easing: cubicOut }}
			class="bg-base-100/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/10 modal-enter"
		>
			<div class="flex items-center justify-between mb-4">
				<h3 class="font-bold text-lg flex items-center gap-2">
					<Icon icon="material-symbols:image" class="w-5 h-5 text-phoenix-primary" />
					Extract from Image
				</h3>
				<button class="btn btn-sm btn-circle btn-ghost" onclick={onClose}>
					<Icon icon="material-symbols:close" class="w-4 h-4" />
				</button>
			</div>
			<div class="space-y-4">
				{#if !preview}
					<label
						class="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-base-300 rounded-lg cursor-pointer hover:border-phoenix-primary/50 transition-colors"
					>
						<div class="flex flex-col items-center justify-center pt-5 pb-6">
							<Icon
								icon="material-symbols:cloud-upload"
								class="w-10 h-10 text-base-content/40 mb-2"
							/>
							<p class="text-sm text-base-content/60">Click to upload an image</p>
						</div>
						<input type="file" class="hidden" accept="image/*" onchange={handleImageSelect} />
					</label>
				{:else}
					<div class="relative">
						<img
							src={preview}
							alt="Preview"
							class="w-full h-48 object-cover rounded-lg"
						/>
						<button
							class="btn btn-sm btn-circle btn-error absolute top-2 right-2"
							onclick={clearImage}
						>
							<Icon icon="material-symbols:close" class="w-4 h-4" />
						</button>
					</div>
				{/if}
				<div>
					<label class="label" for="extract-color-count">
						<span class="label-text">Number of Colors: {colorCount}</span>
					</label>
					<input
						type="range"
						min="2"
						max="10"
						bind:value={colorCount}
						class="range range-primary"
					/>
				</div>
			</div>
			<div class="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/5">
				<button class="btn btn-ghost" onclick={onClose}>Cancel</button>
				<button
					class="btn btn-primary gap-2"
					onclick={handleExtract}
					disabled={!preview || isExtracting}
				>
					{#if isExtracting}
						<span class="loading loading-spinner loading-sm"></span>
						Extracting...
					{:else}
						<Icon icon="material-symbols:colorize" class="w-4 h-4" />
						Extract Colors
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
