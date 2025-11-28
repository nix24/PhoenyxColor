<script lang="ts">
	import { app } from "$lib/stores/root.svelte";
	import Icon from "@iconify/svelte";

	let imageUrl = $state(
		"https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80"
	);
	let isLoading = $state(false);

	async function handleGenerate() {
		if (!imageUrl) return;
		isLoading = true;
		await app.theme.generateFromImage(imageUrl);
		isLoading = false;
	}

	function handleReset() {
		app.theme.resetToDefault();
	}
</script>

<div class="flex flex-col gap-8 p-4">
	<div class="glass-oled p-6 rounded-2xl flex flex-col gap-4">
		<h2 class="text-2xl font-bold text-white flex items-center gap-2">
			<Icon icon="material-symbols:style" />
			Theme Generator
		</h2>
		<p class="text-text-muted">
			Paste an image URL below to generate a "Neo-Aero" theme using OkLCH perceptual extraction.
		</p>

		<div class="flex gap-4 items-center">
			<input
				type="text"
				bind:value={imageUrl}
				class="input flex-1 bg-black/20 border-white/10 text-white"
				placeholder="Image URL..."
			/>
			<button class="btn btn-primary" onclick={handleGenerate} disabled={isLoading}>
				{#if isLoading}
					<Icon icon="svg-spinners:ring-resize" />
				{:else}
					<Icon icon="material-symbols:magic-button" />
				{/if}
				Generate
			</button>
			<button class="btn btn-ghost" onclick={handleReset}>
				<Icon icon="material-symbols:restart-alt" />
			</button>
		</div>
	</div>

	<!-- UI Mockup Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
		<!-- Cards -->
		<div class="flex flex-col gap-4">
			<h3 class="text-xl font-semibold text-white/80">Glass Panels</h3>
			<div class="glass-oled p-6 rounded-2xl">
				<h3 class="text-lg font-bold text-primary mb-2">OLED Glass</h3>
				<p class="text-text-muted">
					High contrast, deep blacks. Optimized for battery life and depth perception.
				</p>
			</div>

			<div class="glass-aero p-6 rounded-2xl">
				<h3 class="text-lg font-bold text-primary mb-2">Aero Glass</h3>
				<p class="text-text-muted">
					Classic "Frutiger Aero" look with high blur and saturation boost.
				</p>
			</div>

			<div class="glass-hud p-4 rounded-lg flex items-center justify-between">
				<span class="text-sm font-mono text-primary">HUD_STATUS</span>
				<span class="text-sm font-mono text-white">ONLINE</span>
			</div>
		</div>

		<!-- Interactive Elements -->
		<div class="flex flex-col gap-4">
			<h3 class="text-xl font-semibold text-white/80">Interactive</h3>
			<div class="glass-oled p-6 rounded-2xl flex flex-col gap-4">
				<button class="btn btn-primary w-full">Primary Action</button>
				<button class="btn btn-ghost w-full">Secondary Action</button>

				<div class="flex gap-2">
					<input type="checkbox" checked class="checkbox checkbox-primary" />
					<input type="radio" checked class="radio radio-primary" />
					<input type="range" class="range range-primary" />
				</div>

				<div class="flex gap-2 mt-4">
					<div
						class="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold shadow-[0_0_15px_var(--color-primary)]"
					>
						P
					</div>
					<div
						class="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-white font-bold shadow-[0_0_15px_var(--color-secondary)]"
					>
						S
					</div>
					<div
						class="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-black font-bold shadow-[0_0_15px_var(--color-accent)]"
					>
						A
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
