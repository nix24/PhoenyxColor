<script lang="ts">
	import { app } from "$lib/stores/root.svelte";
	import type { ValidatedGradient } from "$lib/schemas/validation";
	import pkg from "file-saver";
	import Icon from "@iconify/svelte";
	import { toast } from "svelte-sonner";
	import GlassPanel from "$lib/components/ui/GlassPanel.svelte";
	import { cn } from "$lib/utils/cn";
	import GradientPreview from "./GradientPreview.svelte";
	import GradientControls from "./GradientControls.svelte";
	import MeshGradientCanvas from "./MeshGradientCanvas.svelte";
	import {
		generateCSSGradient,
		generateTailwindGradient,
		generateCSSVariables,
		gradientToSVG,
		type InterpolationMode,
		type MeshPoint,
		generateDefaultMeshPoints,
		generateMeshPointsFromColors,
		generateMeshGradientCSS,
	} from "./gradient-utils";
	import chroma from "chroma-js";

	const { saveAs } = pkg;

	interface Props {
		onCreateNew?: () => void;
	}

	let { onCreateNew }: Props = $props();

	// Editor state
	let interpolationMode = $state<InterpolationMode>("oklch");
	let previewSize = $state({ width: 480, height: 240 });
	let showInteractiveHandles = $state(true);
	let meshPoints = $state<MeshPoint[]>([]);
	let isMeshMode = $state(false);
	let colorPickerValue = $state("#3b82f6");

	// Mesh noise settings
	let noiseEnabled = $state(false);
	let noiseIntensity = $state(10);
	let noiseScale = $state(1);

	// Export dialog state
	let showExportDialog = $state(false);
	let exportFormat = $state<"css" | "tailwind" | "variables" | "png" | "svg" | "json">("css");

	function handleAngleChange(angle: number) {
		if (app.gradients.activeGradient) {
			app.gradients.update(app.gradients.activeGradient.id, { angle });
		}
	}

	function handleCenterChange(x: number, y: number) {
		if (app.gradients.activeGradient) {
			app.gradients.update(app.gradients.activeGradient.id, { centerX: x, centerY: y });
		}
	}

	function handleStopPositionChange(index: number, position: number) {
		const gradient = app.gradients.activeGradient;
		if (gradient && gradient.stops[index]) {
			gradient.stops[index].position = position;
			gradient.stops.sort((a, b) => a.position - b.position);
			app.gradients.update(gradient.id, { stops: gradient.stops });
		}
	}

	function handleMeshPointMove(id: string, x: number, y: number) {
		meshPoints = meshPoints.map((p) => (p.id === id ? { ...p, x, y } : p));
	}

	function addMeshPoint() {
		const newPoint: MeshPoint = {
			id: crypto.randomUUID(),
			x: 50 + Math.random() * 20 - 10,
			y: 50 + Math.random() * 20 - 10,
			color: colorPickerValue,
			radius: 50,
		};
		meshPoints = [...meshPoints, newPoint];
	}

	function removeMeshPoint(id: string) {
		meshPoints = meshPoints.filter((p) => p.id !== id);
	}

	function updateMeshPointColor(id: string, color: string) {
		meshPoints = meshPoints.map((p) => (p.id === id ? { ...p, color } : p));
	}

	function updateMeshPointRadius(id: string, radius: number) {
		meshPoints = meshPoints.map((p) => (p.id === id ? { ...p, radius } : p));
	}

	// Export functions
	async function handleExport() {
		const gradient = app.gradients.activeGradient;
		if (!gradient && !isMeshMode) {
			toast.error("No gradient selected");
			return;
		}

		try {
			switch (exportFormat) {
				case "css": {
					const css = isMeshMode
						? `background: ${generateMeshGradientCSS(meshPoints)};`
						: `background: ${generateCSSGradient(gradient ?? null, interpolationMode)};`;
					await navigator.clipboard.writeText(css);
					toast.success("CSS copied to clipboard!");
					break;
				}
				case "tailwind": {
					if (!gradient) {
						toast.error("Tailwind export not available for mesh gradients");
						return;
					}
					const tailwind = generateTailwindGradient(gradient);
					await navigator.clipboard.writeText(tailwind);
					toast.success("Tailwind classes copied!");
					break;
				}
				case "variables": {
					if (!gradient) {
						toast.error("CSS Variables export not available for mesh gradients");
						return;
					}
					const vars = generateCSSVariables(gradient);
					await navigator.clipboard.writeText(vars);
					toast.success("CSS Variables copied!");
					break;
				}
				case "json": {
					if (!gradient) {
						toast.error("JSON export not available for mesh gradients");
						return;
					}
					const json = JSON.stringify(gradient, null, 2);
					const blob = new Blob([json], { type: "application/json;charset=utf-8" });
					saveAs(blob, `${gradient.name}.json`);
					toast.success("JSON file saved!");
					break;
				}
				case "svg": {
					if (!gradient) {
						toast.error("SVG export not available for mesh gradients");
						return;
					}
					const svg = gradientToSVG(gradient, previewSize.width, previewSize.height);
					const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
					saveAs(blob, `${gradient.name}.svg`);
					toast.success("SVG file saved!");
					break;
				}
				case "png":
					await exportAsPNG();
					break;
			}
			showExportDialog = false;
		} catch (error) {
			console.error("Export error:", error);
			toast.error("Export failed");
		}
	}

	async function exportAsPNG() {
		const gradient = app.gradients.activeGradient;

		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			toast.error("Failed to create canvas");
			return;
		}

		canvas.width = previewSize.width;
		canvas.height = previewSize.height;

		if (isMeshMode) {
			// For mesh gradients, we need to render each point as a radial gradient
			meshPoints.forEach((point) => {
				const centerX = (point.x / 100) * canvas.width;
				const centerY = (point.y / 100) * canvas.height;
				const radius = (point.radius / 100) * Math.max(canvas.width, canvas.height);

				const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
				grad.addColorStop(0, point.color);
				grad.addColorStop(1, "transparent");

				ctx.globalCompositeOperation = "lighter";
				ctx.fillStyle = grad;
				ctx.fillRect(0, 0, canvas.width, canvas.height);
			});
		} else if (gradient) {
			let grad: CanvasGradient;

			switch (gradient.type) {
				case "linear": {
					const angle = ((gradient.angle || 45) * Math.PI) / 180;
					const x1 = canvas.width / 2 - (Math.cos(angle) * canvas.width) / 2;
					const y1 = canvas.height / 2 - (Math.sin(angle) * canvas.height) / 2;
					const x2 = canvas.width / 2 + (Math.cos(angle) * canvas.width) / 2;
					const y2 = canvas.height / 2 + (Math.sin(angle) * canvas.height) / 2;
					grad = ctx.createLinearGradient(x1, y1, x2, y2);
					break;
				}
				case "radial": {
					const centerX = ((gradient.centerX || 50) / 100) * canvas.width;
					const centerY = ((gradient.centerY || 50) / 100) * canvas.height;
					grad = ctx.createRadialGradient(
						centerX,
						centerY,
						0,
						centerX,
						centerY,
						Math.max(canvas.width, canvas.height) / 2
					);
					break;
				}
				default:
					grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
			}

			gradient.stops.forEach((stop) => {
				grad.addColorStop(stop.position / 100, stop.color);
			});

			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		}

		canvas.toBlob((blob) => {
			if (blob) {
				const name = gradient?.name || "mesh-gradient";
				saveAs(blob, `${name}.png`);
				toast.success("PNG file saved!");
			}
		});
	}

	function deleteGradient() {
		const gradient = app.gradients.activeGradient;
		if (gradient && confirm(`Delete "${gradient.name}"?`)) {
			app.gradients.remove(gradient.id);
			toast.info("Gradient deleted");
		}
	}
</script>

<GlassPanel class="flex-1 overflow-hidden relative" intensity="medium">
	<div class="flex flex-col h-full">
		{#if app.gradients.activeGradient || isMeshMode}
			<div class="p-6 flex-1 overflow-y-auto custom-scrollbar">
				<!-- Header -->
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
					<div>
						{#if isMeshMode}
							<h3 class="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
								<Icon icon="material-symbols:grid-4x4" class="w-6 h-6 text-phoenix-violet" />
								Mesh Gradient
							</h3>
							<p class="text-sm text-text-muted mt-1">{meshPoints.length} color points</p>
						{:else if app.gradients.activeGradient}
							<h3 class="text-2xl font-bold text-white tracking-wide">
								{app.gradients.activeGradient.name}
							</h3>
							<p class="text-sm text-text-muted mt-1">
								{app.gradients.activeGradient.type} gradient • {app.gradients.activeGradient.stops
									.length} stops
							</p>
						{/if}
					</div>

					<div class="flex flex-wrap items-center gap-2">
						<!-- Mode Toggle: Gradient / Mesh -->
						<div class="join border border-white/10 rounded-lg">
							<button
								class={cn(
									"btn btn-sm join-item gap-2 border-none",
									!isMeshMode
										? "bg-phoenix-primary text-white"
										: "bg-transparent text-text-muted hover:text-white hover:bg-white/5"
								)}
								onclick={() => {
									if (isMeshMode) isMeshMode = false;
								}}
								title="Standard gradient mode"
							>
								<Icon icon="material-symbols:gradient" class="w-4 h-4" />
								Gradient
							</button>
							<button
								class={cn(
									"btn btn-sm join-item gap-2 border-none",
									isMeshMode
										? "bg-phoenix-violet text-white"
										: "bg-transparent text-text-muted hover:text-white hover:bg-white/5"
								)}
								onclick={() => {
									if (!isMeshMode) {
										isMeshMode = true;
										// Only generate new mesh points if none exist
										if (meshPoints.length === 0) {
											// Use gradient colors if available, otherwise random
											const gradient = app.gradients.activeGradient;
											if (gradient && gradient.stops.length > 0) {
												const colors = gradient.stops.map((s) => s.color);
												meshPoints = generateMeshPointsFromColors(colors);
											} else {
												meshPoints = generateDefaultMeshPoints();
											}
										}
									}
								}}
								title="Mesh gradient mode"
							>
								<Icon icon="material-symbols:grid-4x4" class="w-4 h-4" />
								Mesh
							</button>
						</div>

						<!-- Interactive Handles Toggle -->
						<button
							class={cn(
								"btn btn-sm gap-2",
								showInteractiveHandles
									? "btn-primary"
									: "btn-ghost text-text-muted hover:text-white"
							)}
							onclick={() => (showInteractiveHandles = !showInteractiveHandles)}
							title="Toggle interactive handles"
						>
							<Icon icon="material-symbols:touch-app" class="w-4 h-4" />
							Handles
						</button>

						<!-- Export Button -->
						<button
							class="btn btn-sm btn-outline border-white/20 text-white hover:bg-white/10 hover:border-white/40 gap-2"
							onclick={() => (showExportDialog = true)}
						>
							<Icon icon="material-symbols:download" class="w-4 h-4" />
							Export
						</button>

						<!-- Delete Button -->
						{#if app.gradients.activeGradient && !isMeshMode}
							<button
								class="btn btn-sm btn-ghost text-error hover:bg-error/10"
								onclick={deleteGradient}
								title="Delete gradient"
							>
								<Icon icon="material-symbols:delete-outline" class="w-4 h-4" />
							</button>
						{/if}
					</div>
				</div>

				<!-- Preview Section -->
				<div class="flex flex-col lg:flex-row gap-6">
					<!-- Preview -->
					<div class="flex-1 flex flex-col items-center">
						<div class="bg-void-deep rounded-xl border border-white/10 p-4 mb-4">
							{#if isMeshMode}
								<MeshGradientCanvas
									points={meshPoints}
									width={previewSize.width}
									height={previewSize.height}
									showHandles={showInteractiveHandles}
									{noiseEnabled}
									{noiseIntensity}
									{noiseScale}
									onPointMove={handleMeshPointMove}
									onPointAdd={(x, y, color) => {
										const newPoint: MeshPoint = {
											id: crypto.randomUUID(),
											x,
											y,
											color,
											radius: 50,
										};
										meshPoints = [...meshPoints, newPoint];
									}}
									onPointRemove={(id) => {
										meshPoints = meshPoints.filter((p) => p.id !== id);
									}}
									onPointColorChange={updateMeshPointColor}
									onPointRadiusChange={updateMeshPointRadius}
								/>
							{:else}
								<GradientPreview
									gradient={app.gradients.activeGradient ?? null}
									meshPoints={[]}
									{interpolationMode}
									{previewSize}
									{showInteractiveHandles}
									onAngleChange={handleAngleChange}
									onCenterChange={handleCenterChange}
									onStopPositionChange={handleStopPositionChange}
									onMeshPointMove={handleMeshPointMove}
								/>
							{/if}
						</div>

						<!-- Preview Size Controls -->
						<div class="flex items-center gap-4 text-sm text-text-muted">
							<div class="flex items-center gap-2">
								<label for="preview-width">W:</label>
								<input
									id="preview-width"
									type="range"
									min="200"
									max="800"
									bind:value={previewSize.width}
									class="range range-xs range-primary w-24"
								/>
								<span class="font-mono w-12">{previewSize.width}px</span>
							</div>
							<div class="flex items-center gap-2">
								<label for="preview-height">H:</label>
								<input
									id="preview-height"
									type="range"
									min="100"
									max="500"
									bind:value={previewSize.height}
									class="range range-xs range-primary w-24"
								/>
								<span class="font-mono w-12">{previewSize.height}px</span>
							</div>
						</div>
					</div>

					<!-- Controls Panel -->
					<div class="w-full lg:w-80 xl:w-96">
						{#if isMeshMode}
							<!-- Mesh Controls -->
							<div class="space-y-6">
								<div class="flex items-center justify-between mb-2">
									<h4 class="text-sm font-medium text-text-muted uppercase tracking-wider">
										Mesh Points
									</h4>
									<button
										class="btn btn-xs bg-phoenix-primary border-none text-white hover:bg-phoenix-primary/80"
										onclick={addMeshPoint}
									>
										<Icon icon="material-symbols:add" class="w-3 h-3" />
										Add Point
									</button>
								</div>

								<div class="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
									{#each meshPoints as point, index (point.id)}
										<div class="p-3 rounded-lg bg-black/20 border border-white/10 space-y-2">
											<div class="flex items-center justify-between">
												<span class="text-sm text-text-muted">Point {index + 1}</span>
												<button
													class="btn btn-xs btn-ghost text-error hover:bg-error/10"
													onclick={() => removeMeshPoint(point.id)}
												>
													<Icon icon="material-symbols:close" class="w-3 h-3" />
												</button>
											</div>

											<div class="flex items-center gap-2">
												<input
													type="color"
													value={point.color}
													class="w-8 h-8 rounded cursor-pointer"
													onchange={(e) =>
														updateMeshPointColor(point.id, (e.target as HTMLInputElement).value)}
												/>
												<input
													type="text"
													value={point.color}
													class="input input-xs bg-black/30 border-white/10 text-white flex-1 font-mono"
													onchange={(e) =>
														updateMeshPointColor(point.id, (e.target as HTMLInputElement).value)}
												/>
											</div>

											<div class="flex items-center gap-2">
												<label for="radius-{point.id}" class="text-xs text-text-muted w-12"
													>Radius</label
												>
												<input
													id="radius-{point.id}"
													type="range"
													min="10"
													max="100"
													value={point.radius}
													class="range range-xs range-primary flex-1"
													oninput={(e) =>
														updateMeshPointRadius(
															point.id,
															parseInt((e.target as HTMLInputElement).value)
														)}
												/>
												<span class="text-xs font-mono text-text-muted w-8">{point.radius}%</span>
											</div>

											<div class="text-xs text-text-muted/60">
												Position: {Math.round(point.x)}%, {Math.round(point.y)}%
											</div>
										</div>
									{/each}
								</div>

								<!-- Noise Controls -->
								<div class="mt-6 p-4 rounded-lg bg-black/20 border border-white/10 space-y-4">
									<div class="flex items-center justify-between">
										<h4 class="text-sm font-medium text-text-muted uppercase tracking-wider">
											Noise Effect
										</h4>
										<input
											type="checkbox"
											class="toggle toggle-sm toggle-primary"
											bind:checked={noiseEnabled}
										/>
									</div>

									{#if noiseEnabled}
										<div class="space-y-3 mt-3">
											<div class="flex items-center justify-between">
												<label for="noise-intensity" class="text-sm text-text-muted"
													>Intensity</label
												>
												<span class="text-sm font-mono text-phoenix-primary">{noiseIntensity}%</span
												>
											</div>
											<input
												id="noise-intensity"
												type="range"
												min="1"
												max="50"
												bind:value={noiseIntensity}
												class="range range-xs range-primary w-full"
											/>
										</div>

										<div class="space-y-3">
											<div class="flex items-center justify-between">
												<label for="noise-scale" class="text-sm text-text-muted">Scale</label>
												<span class="text-sm font-mono text-phoenix-primary"
													>{noiseScale.toFixed(1)}</span
												>
											</div>
											<input
												id="noise-scale"
												type="range"
												min="0.1"
												max="5"
												step="0.1"
												bind:value={noiseScale}
												class="range range-xs range-primary w-full"
											/>
										</div>
									{/if}
								</div>
							</div>
						{:else if app.gradients.activeGradient}
							<GradientControls
								gradient={app.gradients.activeGradient}
								{interpolationMode}
								onInterpolationModeChange={(mode) => (interpolationMode = mode)}
								{colorPickerValue}
								onColorPickerChange={(color) => (colorPickerValue = color)}
							/>
						{/if}
					</div>
				</div>
			</div>
		{:else}
			<!-- Empty State -->
			<div class="flex items-center justify-center h-full">
				<div class="text-center text-text-muted/50">
					<div
						class="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 animate-float"
					>
						<Icon icon="material-symbols:gradient" class="h-12 w-12 opacity-50" />
					</div>
					<h3 class="text-xl font-bold text-white mb-2">No Gradient Selected</h3>
					<p class="mb-6 max-w-xs mx-auto">
						Select a gradient from the list or create a new one to start designing.
					</p>
					<div class="flex flex-col sm:flex-row gap-3 justify-center">
						<button
							class="btn btn-primary bg-linear-to-r from-phoenix-primary to-phoenix-violet border-none text-white shadow-lg hover:shadow-phoenix-primary/50"
							onclick={onCreateNew}
							type="button"
						>
							<Icon icon="material-symbols:add" class="w-4 h-4" />
							Create Gradient
						</button>
						<button
							class="btn btn-outline border-white/20 text-white hover:bg-white/10"
							onclick={() => {
								isMeshMode = true;
								if (meshPoints.length === 0) {
									meshPoints = generateDefaultMeshPoints();
								}
							}}
							type="button"
						>
							<Icon icon="material-symbols:grid-4x4" class="w-4 h-4" />
							Try Mesh Mode
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
</GlassPanel>

<!-- Export Dialog -->
{#if showExportDialog}
	<div
		class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
		role="dialog"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget) showExportDialog = false;
		}}
		onkeydown={(e) => {
			if (e.key === "Escape") showExportDialog = false;
		}}
	>
		<div class="bg-base-100 rounded-xl p-6 w-96 shadow-xl">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-lg font-bold">Export Gradient</h3>
				<button class="btn btn-sm btn-circle btn-ghost" onclick={() => (showExportDialog = false)}>
					<Icon icon="material-symbols:close" class="w-4 h-4" />
				</button>
			</div>

			<div class="space-y-3 mb-6">
				{#each [{ id: "css", label: "CSS", icon: "material-symbols:code", desc: "Copy CSS background property" }, { id: "tailwind", label: "Tailwind CSS", icon: "simple-icons:tailwindcss", desc: "Copy Tailwind gradient classes" }, { id: "variables", label: "CSS Variables", icon: "material-symbols:variable-add", desc: "Export as CSS custom properties" }, { id: "png", label: "PNG Image", icon: "material-symbols:image", desc: "Download as PNG file" }, { id: "svg", label: "SVG File", icon: "material-symbols:shapes", desc: "Download as SVG vector" }, { id: "json", label: "JSON", icon: "material-symbols:data-object", desc: "Download gradient data" }] as option}
					<button
						class={cn(
							"w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3",
							exportFormat === option.id
								? "bg-phoenix-primary/20 border-phoenix-primary"
								: "bg-base-200 border-base-300 hover:border-phoenix-primary/50"
						)}
						onclick={() => (exportFormat = option.id as typeof exportFormat)}
					>
						<Icon icon={option.icon} class="w-5 h-5 text-phoenix-primary" />
						<div>
							<div class="font-medium">{option.label}</div>
							<div class="text-xs text-base-content/60">{option.desc}</div>
						</div>
					</button>
				{/each}
			</div>

			<div class="flex justify-end gap-2">
				<button class="btn btn-ghost" onclick={() => (showExportDialog = false)}>Cancel</button>
				<button class="btn btn-primary" onclick={handleExport}>
					<Icon icon="material-symbols:download" class="w-4 h-4" />
					Export
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.animate-float {
		animation: float 3s ease-in-out infinite;
	}

	@keyframes float {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-10px);
		}
	}
</style>
