<script lang="ts">
	import { app } from "$lib/stores/root.svelte";
	import Icon from "@iconify/svelte";
	import GlassPanel from "$lib/components/ui/GlassPanel.svelte";
	import { cn } from "$lib/utils/cn";
	import {
		getContrastRatio,
		getWcagLevel,
		simulateColorBlindness,
		hexToHsl,
		type ColorBlindnessType,
	} from "./palette-utils";


	type AnalysisTab = "vision" | "contrast" | "distribution";
	let activeTab = $state<AnalysisTab>("vision");
	let activeSimulation = $state<ColorBlindnessType | null>(null);

	let colors = $derived(app.palettes.activePalette?.colors ?? []);

	// Simulate colors based on active simulation
	let displayColors = $derived(() => {
		const sim = activeSimulation;
		if (sim === null) return colors;
		return colors.map((c) => simulateColorBlindness(c, sim));
	});

	// Generate contrast pairs (only unique combinations, not matrix)
	let contrastPairs = $derived(() => {
		const pairs: Array<{
			color1: string;
			color2: string;
			index1: number;
			index2: number;
			ratio: number;
			level: string;
			passesAA: boolean;
			passesAAA: boolean;
		}> = [];

		for (let i = 0; i < colors.length; i++) {
			for (let j = i + 1; j < colors.length; j++) {
				const c1 = colors[i];
				const c2 = colors[j];
				if (!c1 || !c2) continue;

				const ratio = getContrastRatio(c1, c2);
				const wcag = getWcagLevel(ratio);
				let level = "Fail";
				if (wcag.aaa) level = "AAA";
				else if (wcag.aa) level = "AA";
				else if (wcag.aaLarge) level = "AA Large";

				pairs.push({
					color1: c1,
					color2: c2,
					index1: i,
					index2: j,
					ratio,
					level,
					passesAA: wcag.aa,
					passesAAA: wcag.aaa,
				});
			}
		}

		return pairs.sort((a, b) => b.ratio - a.ratio);
	});

	// Best pairings for text
	let bestTextPairs = $derived(
		contrastPairs()
			.filter((p) => p.passesAA)
			.slice(0, 5)
	);
	let failingPairs = $derived(contrastPairs().filter((p) => !p.passesAA && p.ratio < 3));

	// Calculate color distribution stats
	let colorStats = $derived(
		colors.map((color) => {
			const hsl = hexToHsl(color);
			return hsl ? { color, ...hsl } : { color, h: 0, s: 0, l: 0 };
		})
	);

	// Lightness distribution
	let lightnessStats = $derived(() => {
		if (colorStats.length === 0) return { min: 0, max: 0, avg: 0, range: 0 };
		const lightnesses = colorStats.map((s) => s.l);
		const min = Math.min(...lightnesses);
		const max = Math.max(...lightnesses);
		return {
			min,
			max,
			avg: Math.round(lightnesses.reduce((a, b) => a + b, 0) / lightnesses.length),
			range: max - min,
		};
	});

	// Saturation stats
	let saturationStats = $derived(() => {
		if (colorStats.length === 0) return { min: 0, max: 0, avg: 0 };
		const saturations = colorStats.map((s) => s.s);
		return {
			min: Math.min(...saturations),
			max: Math.max(...saturations),
			avg: Math.round(saturations.reduce((a, b) => a + b, 0) / saturations.length),
		};
	});

	// Overall accessibility score (percentage of pairs meeting AA)
	let accessibilityScore = $derived(() => {
		const pairs = contrastPairs();
		if (pairs.length === 0) return 0;
		const passing = pairs.filter((p) => p.passesAA).length;
		return Math.round((passing / pairs.length) * 100);
	});

	// Color blindness impact analysis
	let colorBlindnessImpact = $derived(() => {
		const types: ColorBlindnessType[] = ["protanopia", "deuteranopia", "tritanopia"];
		return types.map((type) => {
			const simulated = colors.map((c) => simulateColorBlindness(c, type));
			// Check if any colors become too similar
			let similarPairs = 0;
			for (let i = 0; i < simulated.length; i++) {
				for (let j = i + 1; j < simulated.length; j++) {
					const s1 = simulated[i];
					const s2 = simulated[j];
					if (!s1 || !s2) continue;
					const ratio = getContrastRatio(s1, s2);
					if (ratio < 1.5) similarPairs++;
				}
			}
			return {
				type,
				label:
					type === "protanopia"
						? "Red-blind"
						: type === "deuteranopia"
							? "Green-blind"
							: "Blue-blind",
				affectedPopulation: type === "protanopia" ? "1%" : type === "deuteranopia" ? "6%" : "0.01%",
				similarPairs,
				status: similarPairs === 0 ? "good" : similarPairs <= 2 ? "warning" : "poor",
			};
		});
	});

	function getScoreColor(score: number): string {
		if (score >= 80) return "text-success";
		if (score >= 50) return "text-warning";
		return "text-error";
	}

	function getScoreIcon(score: number): string {
		if (score >= 80) return "material-symbols:check-circle";
		if (score >= 50) return "material-symbols:info";
		return "material-symbols:warning";
	}

	function getScoreIconColor(score: number): string {
		if (score >= 80) return "text-emerald-400";
		if (score >= 50) return "text-amber-400";
		return "text-red-400";
	}

	function getScoreMessage(score: number): string {
		if (score >= 80) return "Excellent! Most color combinations work well together.";
		if (score >= 50) return "Good, but some combinations may be hard to read.";
		return "Many color pairs don't have enough contrast for text.";
	}
</script>

<GlassPanel class="flex-1 overflow-hidden" intensity="medium">
	<div class="flex flex-col h-full">
		<!-- Header with Subtabs -->
		<div class="border-b border-white/5 bg-black/20">
			<div class="p-4 pb-3">
				<h3 class="font-semibold text-white flex items-center gap-2 mb-3">
					<Icon icon="material-symbols:analytics" class="w-5 h-5" />
					Palette Analysis
				</h3>

				<!-- Pill Tabs -->
				<div class="flex gap-1 p-0.5 bg-white/5 rounded-lg">
					{#each [
						{ id: "vision", label: "Vision", icon: "material-symbols:visibility" },
						{ id: "contrast", label: "Contrast", icon: "material-symbols:contrast" },
						{ id: "distribution", label: "Spread", icon: "material-symbols:pie-chart" },
					] as tab}
						<button
							class={cn(
								"flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200",
								activeTab === tab.id
									? "bg-white/12 text-white shadow-sm"
									: "text-text-muted/70 hover:text-white/80"
							)}
							onclick={() => (activeTab = tab.id as AnalysisTab)}
						>
							<Icon icon={tab.icon} class="w-3.5 h-3.5" />
							{tab.label}
						</button>
					{/each}
				</div>
			</div>
		</div>

		{#if colors.length === 0}
			<div class="flex-1 flex items-center justify-center text-text-muted/50">
				<div class="text-center">
					<Icon icon="material-symbols:bar-chart" class="w-12 h-12 mx-auto mb-2 opacity-30" />
					<p>Select a palette with colors to analyze</p>
				</div>
			</div>
		{:else}
			<div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
				<!-- VISION TAB -->
				{#if activeTab === "vision"}
					<div class="space-y-6">
						<!-- Color Blindness Quick Check -->
						<div class="space-y-3">
							<h4 class="text-sm font-medium text-white flex items-center gap-2">
								<Icon icon="material-symbols:accessibility-new" class="w-4 h-4 text-primary" />
								Color Blindness Check
							</h4>
							<p class="text-xs text-text-muted">
								See how your palette looks to people with different types of color vision.
							</p>

							<div class="grid grid-cols-3 gap-3">
								{#each colorBlindnessImpact() as impact}
									<button
										class={cn(
											"p-3 rounded-lg border transition-all text-left",
											activeSimulation === impact.type
												? "border-primary bg-primary/10"
												: "border-white/10 bg-white/5 hover:bg-white/10"
										)}
										onclick={() =>
											(activeSimulation = activeSimulation === impact.type ? null : impact.type)}
									>
										<div class="flex items-center justify-between mb-2">
											<span class="text-xs font-medium text-white">{impact.label}</span>
											{#if impact.status === "good"}
												<Icon icon="material-symbols:check-circle" class="w-4 h-4 text-success" />
											{:else if impact.status === "warning"}
												<Icon icon="material-symbols:warning" class="w-4 h-4 text-warning" />
											{:else}
												<Icon icon="material-symbols:error" class="w-4 h-4 text-error" />
											{/if}
										</div>
										<div class="text-[10px] text-text-muted">
											~{impact.affectedPopulation} of population
										</div>
									</button>
								{/each}
							</div>
						</div>

						<!-- Simulated Preview -->
						<div class="space-y-3">
							<div class="flex items-center justify-between">
								<h4 class="text-sm font-medium text-white">
									{activeSimulation
										? `Viewing as: ${activeSimulation.charAt(0).toUpperCase() + activeSimulation.slice(1)}`
										: "Normal Vision"}
								</h4>
								{#if activeSimulation}
									<button
										class="text-xs text-primary hover:underline"
										onclick={() => (activeSimulation = null)}
									>
										Reset to normal
									</button>
								{/if}
							</div>

							<!-- Side by side comparison -->
							<div class="grid grid-cols-2 gap-3">
								<div>
									<div class="text-xs text-text-muted mb-2">Original</div>
									<div class="flex gap-1 h-10">
										{#each colors as color}
											<div
												class="flex-1 rounded border border-white/10"
												style:background-color={color}
											></div>
										{/each}
									</div>
								</div>
								<div>
									<div class="text-xs text-text-muted mb-2">
										{activeSimulation ? "Simulated" : "Same"}
									</div>
									<div class="flex gap-1 h-10">
										{#each displayColors() as color}
											<div
												class="flex-1 rounded border border-white/10"
												style:background-color={color}
											></div>
										{/each}
									</div>
								</div>
							</div>
						</div>

						<!-- Text Preview with Simulation -->
						<div class="space-y-3">
							<h4 class="text-sm font-medium text-white">Text Readability Preview</h4>
							{#if displayColors().length > 0}
								{@const simColors = displayColors()}
								<div class="grid grid-cols-2 gap-2">
									{#each simColors.slice(0, 4) as bgColor, i}
										{@const textColor = simColors[simColors.length - 1 - i] ?? "#ffffff"}
										<div class="p-3 rounded-lg" style:background-color={bgColor}>
											<p class="text-sm font-medium" style:color={textColor}>Sample Text</p>
											<p class="text-xs opacity-80" style:color={textColor}>Body copy here</p>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>

					<!-- CONTRAST TAB -->
				{:else if activeTab === "contrast"}
					<div class="space-y-6">
						<!-- Accessibility Score -->
						<div
							class="p-4 rounded-xl bg-white/5 border border-white/8"
						>
							<div class="flex items-center gap-3">
								<div class={cn("shrink-0", getScoreIconColor(accessibilityScore()))}>
									<Icon icon={getScoreIcon(accessibilityScore())} class="w-8 h-8" />
								</div>
								<div class="flex-1">
									<div class="flex items-baseline gap-2 mb-0.5">
										<span class={cn("text-2xl font-bold font-mono tabular-nums", getScoreColor(accessibilityScore()))}>
											{accessibilityScore()}%
										</span>
										<span class="text-[11px] text-text-muted/60">accessibility</span>
									</div>
									<p class="text-xs text-text-muted/70 leading-relaxed">{getScoreMessage(accessibilityScore())}</p>
								</div>
							</div>
						</div>

						<!-- Best Pairings -->
						{#if bestTextPairs.length > 0}
							<div class="space-y-3">
								<h4 class="text-sm font-medium text-white flex items-center gap-2">
									<Icon icon="material-symbols:thumb-up" class="w-4 h-4 text-success" />
									Best Color Pairs for Text
								</h4>
								<p class="text-xs text-text-muted">
									These combinations have good contrast and are safe to use for text.
								</p>
								<div class="space-y-2">
									{#each bestTextPairs as pair}
										<div
											class="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
										>
											<div class="flex items-center gap-1">
												<div
													class="w-8 h-8 rounded border border-white/20"
													style:background-color={pair.color1}
												></div>
												<Icon icon="material-symbols:add" class="w-3 h-3 text-text-muted" />
												<div
													class="w-8 h-8 rounded border border-white/20"
													style:background-color={pair.color2}
												></div>
											</div>

											<!-- Preview -->
											<div class="flex-1 flex gap-2">
												<div
													class="px-3 py-1.5 rounded text-xs font-medium"
													style:background-color={pair.color1}
													style:color={pair.color2}
												>
													Text
												</div>
												<div
													class="px-3 py-1.5 rounded text-xs font-medium"
													style:background-color={pair.color2}
													style:color={pair.color1}
												>
													Text
												</div>
											</div>

											<div class="text-right">
												<span
													class={cn(
														"px-2 py-0.5 rounded text-xs font-medium",
														pair.passesAAA
															? "bg-success/20 text-success"
															: "bg-warning/20 text-warning"
													)}
												>
													{pair.level}
												</span>
												<div class="text-[10px] text-text-muted mt-1">
													{pair.ratio.toFixed(1)}:1
												</div>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Problematic Pairings -->
						{#if failingPairs.length > 0}
							<div class="space-y-3">
								<h4 class="text-sm font-medium text-white flex items-center gap-2">
									<Icon icon="material-symbols:warning" class="w-4 h-4 text-error" />
									Avoid These Pairs for Text
								</h4>
								<p class="text-xs text-text-muted">
									These combinations don't have enough contrast for readable text.
								</p>
								<div class="space-y-2">
									{#each failingPairs.slice(0, 3) as pair}
										<div
											class="flex items-center gap-3 p-3 rounded-lg bg-error/5 border border-error/20"
										>
											<div class="flex items-center gap-1">
												<div
													class="w-8 h-8 rounded border border-white/20"
													style:background-color={pair.color1}
												></div>
												<Icon icon="material-symbols:close" class="w-3 h-3 text-error" />
												<div
													class="w-8 h-8 rounded border border-white/20"
													style:background-color={pair.color2}
												></div>
											</div>

											<div class="flex-1 text-xs text-text-muted">
												Only {pair.ratio.toFixed(1)}:1 contrast (need 4.5:1)
											</div>

											<span class="px-2 py-0.5 rounded text-xs font-medium bg-error/20 text-error">
												Fail
											</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Quick Reference -->
						<div class="p-3 rounded-lg bg-white/5 border border-white/10">
							<h4 class="text-xs font-medium text-white mb-2">What do the levels mean?</h4>
							<div class="space-y-1.5 text-xs text-text-muted">
								<div class="flex items-center gap-2">
									<span class="px-1.5 py-0.5 rounded bg-success/20 text-success text-[10px]"
										>AAA</span
									>
									<span>7:1+ — Best for all text, including small text</span>
								</div>
								<div class="flex items-center gap-2">
									<span class="px-1.5 py-0.5 rounded bg-warning/20 text-warning text-[10px]"
										>AA</span
									>
									<span>4.5:1+ — Good for regular text (14px+)</span>
								</div>
								<div class="flex items-center gap-2">
									<span class="px-1.5 py-0.5 rounded bg-info/20 text-info text-[10px]"
										>AA Large</span
									>
									<span>3:1+ — OK for large text only (18px+ bold)</span>
								</div>
							</div>
						</div>
					</div>

					<!-- DISTRIBUTION TAB -->
				{:else if activeTab === "distribution"}
					<div class="space-y-6">
						<!-- Palette Overview -->
						<div class="grid grid-cols-3 gap-2">
							<div class="p-3 rounded-lg bg-white/5 border border-white/8 text-center">
								<div class="text-lg font-bold font-mono text-white tabular-nums">{colors.length}</div>
								<div class="text-[10px] text-text-muted/50 font-medium">Colors</div>
							</div>
							<div class="p-3 rounded-lg bg-white/5 border border-white/8 text-center">
								<div class="text-lg font-bold font-mono text-white tabular-nums">{lightnessStats().range}%</div>
								<div class="text-[10px] text-text-muted/50 font-medium">L Range</div>
							</div>
							<div class="p-3 rounded-lg bg-white/5 border border-white/8 text-center">
								<div class="text-lg font-bold font-mono text-white tabular-nums">{saturationStats().avg}%</div>
								<div class="text-[10px] text-text-muted/50 font-medium">Avg Sat</div>
							</div>
						</div>

						<!-- Hue Wheel -->
						<div class="space-y-3">
							<h4 class="text-sm font-medium text-white">Hue Distribution</h4>
							<p class="text-xs text-text-muted">Where your colors fall on the color wheel.</p>

							<div class="flex items-center gap-6">
								<div class="relative w-28 h-28 shrink-0">
									<!-- Hue wheel background -->
									<div
										class="absolute inset-0 rounded-full opacity-30"
										style:background="conic-gradient(from 0deg, hsl(0, 70%, 50%), hsl(60, 70%, 50%), hsl(120, 70%, 50%), hsl(180, 70%, 50%), hsl(240, 70%, 50%), hsl(300, 70%, 50%), hsl(360, 70%, 50%))"
									></div>
									<div class="absolute inset-3 rounded-full bg-void-deep"></div>

									<!-- Color dots on wheel -->
									{#each colorStats as stat}
										{@const angle = (stat.h - 90) * (Math.PI / 180)}
										{@const radius = 44}
										{@const x = 56 + Math.cos(angle) * radius}
										{@const y = 56 + Math.sin(angle) * radius}
										<div
											class="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg -translate-x-1/2 -translate-y-1/2"
											style:left="{x}px"
											style:top="{y}px"
											style:background-color={stat.color}
											title={`${stat.color} (H: ${stat.h}°)`}
										></div>
									{/each}
								</div>

								<div class="flex-1 space-y-2">
									{#each colorStats as stat}
										<div class="flex items-center gap-2">
											<div
												class="w-4 h-4 rounded border border-white/20 shrink-0"
												style:background-color={stat.color}
											></div>
											<div class="text-xs text-text-muted flex-1">
												H: {stat.h}° S: {stat.s}% L: {stat.l}%
											</div>
										</div>
									{/each}
								</div>
							</div>
						</div>

						<!-- Lightness Bar -->
						<div class="space-y-3">
							<h4 class="text-sm font-medium text-white">Lightness Spread</h4>
							<p class="text-xs text-text-muted">
								A good palette usually has a range of light and dark colors.
							</p>

							<div class="space-y-2">
								<div
									class="h-8 bg-linear-to-r from-black via-gray-500 to-white rounded-lg relative overflow-hidden"
								>
									{#each colorStats as stat}
										<div
											class="absolute top-1 bottom-1 w-2 rounded border-2 border-white shadow-md"
											style:left="calc({stat.l}% - 4px)"
											style:background-color={stat.color}
											title={`${stat.color} (L: ${stat.l}%)`}
										></div>
									{/each}
								</div>
								<div class="flex justify-between text-[10px] text-text-muted">
									<span>Dark (0%)</span>
									<span>Mid (50%)</span>
									<span>Light (100%)</span>
								</div>
							</div>

							<!-- Lightness advice -->
							{#if lightnessStats().range < 30}
								<div class="p-3 rounded-lg bg-warning/10 border border-warning/20 text-xs">
									<Icon
										icon="material-symbols:lightbulb"
										class="w-4 h-4 inline text-warning mr-1"
									/>
									<span class="text-warning font-medium">Tip:</span>
									<span class="text-text-muted">
										Your colors are similar in brightness. Consider adding more contrast.
									</span>
								</div>
							{:else if lightnessStats().range > 70}
								<div class="p-3 rounded-lg bg-success/10 border border-success/20 text-xs">
									<Icon
										icon="material-symbols:check-circle"
										class="w-4 h-4 inline text-success mr-1"
									/>
									<span class="text-success font-medium">Great!</span>
									<span class="text-text-muted">
										Good range of light and dark colors for contrast.
									</span>
								</div>
							{/if}
						</div>

						<!-- Saturation Bar -->
						<div class="space-y-3">
							<h4 class="text-sm font-medium text-white">Saturation Spread</h4>

							<div class="space-y-2">
								<div
									class="h-8 rounded-lg relative overflow-hidden"
									style:background="linear-gradient(to right, hsl(220, 0%, 50%), hsl(220, 100%, 50%))"
								>
									{#each colorStats as stat}
										<div
											class="absolute top-1 bottom-1 w-2 rounded border-2 border-white shadow-md"
											style:left="calc({stat.s}% - 4px)"
											style:background-color={stat.color}
											title={`${stat.color} (S: ${stat.s}%)`}
										></div>
									{/each}
								</div>
								<div class="flex justify-between text-[10px] text-text-muted">
									<span>Muted (0%)</span>
									<span>Balanced (50%)</span>
									<span>Vibrant (100%)</span>
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</GlassPanel>
