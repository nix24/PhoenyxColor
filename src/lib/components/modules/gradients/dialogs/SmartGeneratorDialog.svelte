<script lang="ts">
	import { scale } from "svelte/transition";
	import { cubicOut } from "svelte/easing";
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";
	import type { ValidatedGradientStop } from "$lib/schemas/validation";
	import {
		generateMoodGradient,
		generateRandomGradient,
		type MoodType,
	} from "../gradient-utils";

	interface Props {
		open: boolean;
		onClose: () => void;
		onGenerate: (stops: ValidatedGradientStop[], name: string) => void;
	}

	let { open, onClose, onGenerate } = $props();

	let seedColor = $state("#3b82f6");
	let colorCount = $state(4);
	let mood = $state<MoodType>("calm");

	const moods = [
		{ id: "calm", label: "Calm", icon: "material-symbols:spa" },
		{ id: "energetic", label: "Energetic", icon: "material-symbols:bolt" },
		{ id: "corporate", label: "Corporate", icon: "material-symbols:business" },
		{ id: "playful", label: "Playful", icon: "material-symbols:celebration" },
		{ id: "luxury", label: "Luxury", icon: "material-symbols:diamond" },
		{ id: "natural", label: "Natural", icon: "material-symbols:eco" },
	] as const;

	function buildStops(colors: string[]): ValidatedGradientStop[] {
		return colors.map((color, index) => ({
			color,
			position: (index / (colors.length - 1)) * 100,
		}));
	}

	function handleGenerate() {
		const colors = generateMoodGradient(mood, seedColor, colorCount);
		const moodLabel = mood.charAt(0).toUpperCase() + mood.slice(1);
		onGenerate(buildStops(colors), `${moodLabel} Gradient`);
	}

	function handleRandom() {
		const colors = generateRandomGradient(colorCount);
		onGenerate(buildStops(colors), "Random Gradient");
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
					<Icon icon="material-symbols:magic-button" class="w-5 h-5 text-phoenix-primary" />
					Smart Generator
				</h3>
				<button class="btn btn-sm btn-circle btn-ghost" onclick={onClose}>
					<Icon icon="material-symbols:close" class="w-4 h-4" />
				</button>
			</div>
			<div class="space-y-4">
				<div>
					<label class="label" for="seed-color">
						<span class="label-text">Seed Color</span>
					</label>
					<div class="flex gap-2">
						<input
							type="color"
							bind:value={seedColor}
							class="w-12 h-10 rounded cursor-pointer"
						/>
						<input
							type="text"
							bind:value={seedColor}
							class="input input-bordered flex-1 font-mono"
						/>
					</div>
				</div>
				<div>
					<label class="label" for="color-count">
						<span class="label-text">Number of Colors: {colorCount}</span>
					</label>
					<input
						type="range"
						min="2"
						max="8"
						bind:value={colorCount}
						class="range range-primary"
					/>
				</div>
				<div>
					<label class="label" for="mood-select">
						<span class="label-text">Mood</span>
					</label>
					<div class="grid grid-cols-3 gap-2">
						{#each moods as m}
							<button
								class={cn(
									"btn btn-sm gap-1",
									mood === m.id ? "btn-primary" : "btn-outline"
								)}
								onclick={() => (mood = m.id as MoodType)}
							>
								<Icon icon={m.icon} class="w-4 h-4" />
								{m.label}
							</button>
						{/each}
					</div>
				</div>
			</div>
			<div class="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/5">
				<button class="btn btn-ghost" onclick={onClose}>Cancel</button>
				<button class="btn btn-outline gap-2" onclick={handleRandom}>
					<Icon icon="material-symbols:casino" class="w-4 h-4" />
					Random
				</button>
				<button class="btn btn-primary gap-2" onclick={handleGenerate}>
					<Icon icon="material-symbols:auto-awesome" class="w-4 h-4" />
					Generate
				</button>
			</div>
		</div>
	</div>
{/if}
