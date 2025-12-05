<script lang="ts">
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";
	import type { ImageEditorState } from "../EditorHistory.svelte";

	let { editorState, onUpdate } = $props<{
		editorState: ImageEditorState;
		onUpdate: (updates: Partial<ImageEditorState>) => void;
	}>();

	let activeSection = $state<"light" | "color" | "effects" | "detail">("light");

	interface SliderConfig {
		key: keyof ImageEditorState;
		label: string;
		min: number;
		max: number;
		step: number;
		unit: string;
		defaultValue: number;
	}

	const lightSliders: SliderConfig[] = [
		{
			key: "brightness",
			label: "Brightness",
			min: 0,
			max: 200,
			step: 1,
			unit: "%",
			defaultValue: 100,
		},
		{ key: "contrast", label: "Contrast", min: 0, max: 200, step: 1, unit: "%", defaultValue: 100 },
		{ key: "shadows", label: "Shadows", min: -100, max: 100, step: 1, unit: "", defaultValue: 0 },
		{
			key: "highlights",
			label: "Highlights",
			min: -100,
			max: 100,
			step: 1,
			unit: "",
			defaultValue: 0,
		},
	];

	const colorSliders: SliderConfig[] = [
		{
			key: "saturation",
			label: "Saturation",
			min: 0,
			max: 200,
			step: 1,
			unit: "%",
			defaultValue: 100,
		},
		{ key: "vibrance", label: "Vibrance", min: -100, max: 100, step: 1, unit: "", defaultValue: 0 },
		{ key: "hueRotate", label: "Hue", min: 0, max: 360, step: 1, unit: "°", defaultValue: 0 },
		{
			key: "temperature",
			label: "Temperature",
			min: -100,
			max: 100,
			step: 1,
			unit: "",
			defaultValue: 0,
		},
		{ key: "tint", label: "Tint", min: -100, max: 100, step: 1, unit: "", defaultValue: 0 },
	];

	const effectSliders: SliderConfig[] = [
		{ key: "sepia", label: "Sepia", min: 0, max: 100, step: 1, unit: "%", defaultValue: 0 },
		{ key: "invert", label: "Invert", min: 0, max: 100, step: 1, unit: "%", defaultValue: 0 },
		{ key: "opacity", label: "Opacity", min: 0, max: 1, step: 0.01, unit: "", defaultValue: 1 },
	];

	const detailSliders: SliderConfig[] = [
		{ key: "clarity", label: "Clarity", min: -100, max: 100, step: 1, unit: "", defaultValue: 0 },
		{ key: "blur", label: "Blur", min: 0, max: 20, step: 0.5, unit: "px", defaultValue: 0 },
		{ key: "vignette", label: "Vignette", min: 0, max: 100, step: 1, unit: "%", defaultValue: 0 },
	];

	const sections = [
		{
			id: "light" as const,
			label: "Light",
			icon: "material-symbols:light-mode",
			sliders: lightSliders,
		},
		{
			id: "color" as const,
			label: "Color",
			icon: "material-symbols:palette",
			sliders: colorSliders,
		},
		{
			id: "effects" as const,
			label: "Effects",
			icon: "material-symbols:blur-on",
			sliders: effectSliders,
		},
		{
			id: "detail" as const,
			label: "Detail",
			icon: "material-symbols:details",
			sliders: detailSliders,
		},
	];

	function handleSliderChange(key: keyof ImageEditorState, value: number) {
		onUpdate({ [key]: value });
	}

	function formatValue(value: number, config: SliderConfig): string {
		if (config.key === "opacity") {
			return `${Math.round(value * 100)}%`;
		}
		return `${Math.round(value)}${config.unit}`;
	}

	function isDefaultValue(value: number, defaultVal: number): boolean {
		return Math.abs(value - defaultVal) < 0.01;
	}

	function getStateValue(key: keyof ImageEditorState): number {
		const val = editorState[key];
		return typeof val === "number" ? val : 0;
	}
</script>

<div class="space-y-4">
	<!-- Section Tabs -->
	<div class="flex gap-2 p-1 bg-white/5 rounded-xl">
		{#each sections as section}
			<button
				class={cn(
					"flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200",
					activeSection === section.id
						? "bg-phoenix-primary text-white shadow-lg"
						: "text-white/60 hover:text-white hover:bg-white/10"
				)}
				onclick={() => (activeSection = section.id)}
			>
				<Icon icon={section.icon} class="w-4 h-4" />
				<span class="hidden sm:inline">{section.label}</span>
			</button>
		{/each}
	</div>

	<!-- Active Section Sliders -->
	{#each sections as section}
		{#if activeSection === section.id}
			<div class="space-y-4">
				{#each section.sliders as slider}
					{@const value = getStateValue(slider.key)}
					{@const isDefault = isDefaultValue(value, slider.defaultValue)}
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<span class={cn("text-sm font-medium", isDefault ? "text-white/60" : "text-white")}>
								{slider.label}
							</span>
							<div class="flex items-center gap-2">
								<span
									class={cn(
										"text-xs font-mono min-w-[50px] text-right",
										isDefault ? "text-white/40" : "text-phoenix-primary"
									)}
								>
									{formatValue(value, slider)}
								</span>
								{#if !isDefault}
									<button
										class="btn btn-xs btn-ghost btn-circle text-white/40 hover:text-white"
										onclick={() => handleSliderChange(slider.key, slider.defaultValue)}
										title="Reset"
									>
										<Icon icon="material-symbols:refresh" class="w-3 h-3" />
									</button>
								{/if}
							</div>
						</div>
						<input
							type="range"
							min={slider.min}
							max={slider.max}
							step={slider.step}
							{value}
							class="range range-xs range-primary w-full"
							oninput={(e) => handleSliderChange(slider.key, parseFloat(e.currentTarget.value))}
						/>
					</div>
				{/each}

				<!-- Grayscale Toggle (in Effects section) -->
				{#if section.id === "effects"}
					<div class="flex items-center justify-between py-2 border-t border-white/10 mt-4">
						<span class="text-sm font-medium text-white">Grayscale</span>
						<input
							type="checkbox"
							class="toggle toggle-sm toggle-primary"
							checked={editorState.isGrayscale}
							onchange={(e) => onUpdate({ isGrayscale: e.currentTarget.checked })}
						/>
					</div>
				{/if}
			</div>
		{/if}
	{/each}
</div>
