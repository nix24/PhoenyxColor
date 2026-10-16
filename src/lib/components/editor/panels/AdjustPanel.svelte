<script lang="ts">
import Icon from "@iconify/svelte";
import { cn } from "$lib/utils/cn";
import type { Snippet } from "svelte";
import type { ImageEditorState } from "$lib/types/image-editor";

let { editorState, onUpdate, onPreview, curves } = $props<{
	editorState: ImageEditorState;
	/** The Curves editor, shown under its own tab. */
	curves: Snippet;
	/** One undo step (a click, or a slider released). */
	onUpdate: (updates: Partial<ImageEditorState>) => void;
	/** A slider mid-drag: shown, not recorded. */
	onPreview: (updates: Partial<ImageEditorState>) => void;
}>();

let activeSection = $state<"light" | "color" | "detail" | "curves">("light");

/** The `ImageEditorState` fields a slider can drive — the numeric ones. */
type NumericStateKey = {
	[K in keyof ImageEditorState]: ImageEditorState[K] extends number ? K : never;
}[keyof ImageEditorState];

interface SliderConfig {
	key: NumericStateKey;
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
	{ key: "hueRotate", label: "Hue", min: 0, max: 360, step: 1, unit: "\u00B0", defaultValue: 0 },
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
	{ key: "sepia", label: "Sepia", min: 0, max: 100, step: 1, unit: "%", defaultValue: 0 },
	{ key: "invert", label: "Invert", min: 0, max: 100, step: 1, unit: "%", defaultValue: 0 },
];

const detailSliders: SliderConfig[] = [
	{ key: "clarity", label: "Clarity", min: -100, max: 100, step: 1, unit: "", defaultValue: 0 },
	{ key: "blur", label: "Blur", min: 0, max: 20, step: 0.5, unit: "px", defaultValue: 0 },
	{ key: "vignette", label: "Vignette", min: 0, max: 100, step: 1, unit: "%", defaultValue: 0 },
	{ key: "opacity", label: "Opacity", min: 0, max: 1, step: 0.01, unit: "", defaultValue: 1 },
];

const sections = [
	{
		id: "light" as const,
		label: "Light",
		icon: "material-symbols:light-mode",
		sliders: lightSliders,
	},
	{ id: "color" as const, label: "Color", icon: "material-symbols:palette", sliders: colorSliders },
	{
		id: "detail" as const,
		label: "Detail",
		icon: "material-symbols:details",
		sliders: detailSliders,
	},
	{ id: "curves" as const, label: "Curves", icon: "material-symbols:show-chart", sliders: [] },
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

function getStateValue(key: NumericStateKey): number {
	return editorState[key];
}

function sectionHasChanges(sliders: SliderConfig[]): boolean {
	return sliders.some((s) => !isDefaultValue(getStateValue(s.key), s.defaultValue));
}
</script>

<div class="space-y-4">
	<div class="flex gap-1.5 overflow-x-auto no-scrollbar" role="tablist" aria-label="Adjustments">
		{#each sections as section (section.id)}
			{@const hasChanges = sectionHasChanges(section.sliders) || (section.id === "color" && editorState.isGrayscale)}
			{@const isActive = activeSection === section.id}
			<button
				class={cn(
					"flex min-h-9 items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-colors duration-150 shrink-0",
					"focus-visible:outline-2 focus-visible:outline-phoenix-primary",
					isActive
						? "bg-phoenix-primary text-white shadow-md shadow-phoenix-primary/20"
						: hasChanges
							? "bg-white/8 text-white/80 hover:bg-white/12"
							: "bg-white/5 text-white/60 hover:text-white/80 hover:bg-white/8"
				)}
				onclick={() => (activeSection = section.id)}
				role="tab"
				aria-selected={isActive}
				aria-controls="adjust-section"
				type="button"
			>
				<Icon icon={section.icon} class="w-3.5 h-3.5" />
				{section.label}
				{#if hasChanges && !isActive}
					<span class="w-1.5 h-1.5 rounded-full bg-phoenix-primary" aria-label="edited"></span>
				{/if}
			</button>
		{/each}
	</div>

	<div id="adjust-section" class="space-y-3.5" role="tabpanel">
		{#if activeSection === "curves"}
			{@render curves()}
		{/if}
		{#each sections as section (section.id)}
			{#if activeSection === section.id}
				{#each section.sliders as slider (slider.key)}
					{@const value = getStateValue(slider.key)}
					{@const isDefault = isDefaultValue(value, slider.defaultValue)}
					{@const inputId = `adjust-${slider.key}`}
					<div class="space-y-1.5">
						<div class="flex min-h-6 items-center justify-between">
							<label for={inputId} class={cn("text-[13px] font-medium", isDefault ? "text-white/70" : "text-white")}>
								{slider.label}
							</label>
							<div class="flex items-center gap-1.5">
								<span
									class={cn(
										"text-xs font-mono min-w-11 text-right tabular-nums",
										isDefault ? "text-white/60" : "text-phoenix-primary"
									)}
								>
									{formatValue(value, slider)}
								</span>
								{#if !isDefault}
									<button
										class="w-6 h-6 rounded-md flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-phoenix-primary"
										onclick={() => handleSliderChange(slider.key, slider.defaultValue)}
										aria-label={`Reset ${slider.label}`}
										type="button"
									>
										<Icon icon="material-symbols:refresh" class="w-3.5 h-3.5" />
									</button>
								{/if}
							</div>
						</div>
						<input
							id={inputId}
							type="range"
							min={slider.min}
							max={slider.max}
							step={slider.step}
							{value}
							class="range range-xs range-primary w-full"
							oninput={(e) => onPreview({ [slider.key]: parseFloat(e.currentTarget.value) })}
							onchange={(e) => handleSliderChange(slider.key, parseFloat(e.currentTarget.value))}
						/>
					</div>
				{/each}

				{#if section.id === "color"}
					<label class="flex items-center justify-between pt-3 mt-1 border-t border-white/5" for="adjust-grayscale">
						<span class="text-[13px] font-medium text-white/80">Grayscale</span>
						<input
							id="adjust-grayscale"
							type="checkbox"
							class="toggle toggle-sm toggle-primary"
							checked={editorState.isGrayscale}
							onchange={(e) => onUpdate({ isGrayscale: e.currentTarget.checked })}
						/>
					</label>
				{/if}
			{/if}
		{/each}
	</div>
</div>

<style>
	.no-scrollbar::-webkit-scrollbar {
		display: none;
	}
	.no-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
