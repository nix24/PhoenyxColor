<script lang="ts">
	import { app } from "$lib/stores/root.svelte";
	import Icon from "@iconify/svelte";
	import { toast } from "svelte-sonner";
	import { storage } from "$lib/services/storage";
	import GlassPanel from "$lib/components/ui/GlassPanel.svelte";
	import { cn } from "$lib/utils/cn";

	let isExporting = $state(false);
	let isImporting = $state(false);

	// Helper function for async onChange handlers
	function handleAsyncChange(handler: () => Promise<void>) {
		return () => {
			handler().catch((error) => {
				console.error("Error in async change handler:", error);
				toast.error("Failed to save changes. Please try again.");
			});
		};
	}

	// Local state for settings form - synced with store
	// We can bind directly to the store state in Svelte 5, but let's keep a local copy for form handling if needed
	// Actually, for settings, direct binding is often cleaner in Svelte 5

	const themeOptions = [
		{ value: "system", label: "System" },
		{ value: "light", label: "Light" },
		{ value: "dark", label: "Dark" },
	];

	async function saveSettings() {
		try {
			console.log("💾 Saving settings from UI...");

			// In the new architecture, changes to app.settings.state are reactive
			// We just need to trigger a save to persistence
			await app.settings.save();

			// Apply theme change to DOM
			document.documentElement.setAttribute("data-theme", app.settings.state.theme);

			toast.success("Settings saved successfully!");
		} catch (error) {
			console.error("Failed to save settings:", error);
			toast.error("Failed to save settings. Please try again.");
		}
	}

	async function exportSettings() {
		isExporting = true;
		try {
			// TODO: Implement export in new architecture
			// For now, we can just export the settings
			const data = {
				settings: app.settings.state,
				palettes: app.palettes.palettes,
				references: app.references.references,
				gradients: app.gradients.gradients,
			};

			const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `phoenyx-backup-${new Date().toISOString().split("T")[0]}.json`;
			a.click();
			URL.revokeObjectURL(url);
			toast.success("Data exported successfully");
		} catch (error) {
			console.error("Failed to export data:", error);
			toast.error("Failed to export data. Please try again.");
		} finally {
			isExporting = false;
		}
	}

	async function importSettings() {
		isImporting = true;
		try {
			// TODO: Implement proper import with validation
			toast.info("Import functionality coming soon in next update");
		} catch (error) {
			console.error("Failed to import data:", error);
			toast.error("Failed to import data. Please try again.");
		} finally {
			isImporting = false;
		}
	}

	async function clearAllData() {
		if (
			confirm("Are you sure you want to clear all application data? This action cannot be undone.")
		) {
			await storage.db.clear();
			await storage.local.clear();
			window.location.reload();
		}
	}

	async function nuclearClear() {
		if (
			confirm("This will completely wipe all app storage. This action cannot be undone. Continue?")
		) {
			await storage.db.clear();
			await storage.local.clear();
			toast.success("Storage cleared successfully. Reloading app...");
			setTimeout(() => window.location.reload(), 1500);
		}
	}
</script>

<div class="h-full overflow-y-auto custom-scrollbar">
	<div class="container mx-auto p-4 md:p-6 max-w-4xl">
		<!-- Header -->
		<GlassPanel class="mb-6 md:mb-8 p-6" intensity="low">
			<div class="flex items-center gap-3 mb-2">
				<Icon
					icon="material-symbols:settings-outline"
					class="text-2xl md:text-3xl text-phoenix-primary"
				/>
				<h1 class="text-2xl md:text-3xl font-bold text-white tracking-wide">Settings</h1>
			</div>
			<p class="text-text-muted">Configure your PhoenyxColor experience and preferences</p>
		</GlassPanel>

		<div class="grid grid-cols-1 gap-6">
			<!-- Appearance Settings -->
			<GlassPanel class="p-6" intensity="medium">
				<h2 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
					<Icon icon="material-symbols:palette" class="text-phoenix-primary" />
					Appearance
				</h2>

				<!-- Theme Selection -->
				<div class="form-control mb-6">
					<label class="label" for="theme-select">
						<span class="label-text font-medium text-white">Theme</span>
					</label>
					<select
						id="theme-select"
						class="select bg-black/30 border-white/10 text-white w-full focus:border-phoenix-primary focus:outline-none"
						bind:value={app.settings.state.theme}
						onchange={handleAsyncChange(saveSettings)}
					>
						{#each themeOptions as theme}
							<option value={theme.value}>{theme.label}</option>
						{/each}
					</select>
					<label class="label" for="theme-select">
						<span class="label-text-alt text-text-muted/60">
							Choose your preferred color scheme
						</span>
					</label>
				</div>

				<!-- Animations Toggle -->
				<div class="form-control">
					<label class="label cursor-pointer justify-start gap-4">
						<input
							type="checkbox"
							class="toggle toggle-primary border-white/20 bg-black/30 checked:bg-phoenix-primary checked:border-phoenix-primary"
							bind:checked={app.settings.state.enableAnimations}
							onchange={handleAsyncChange(saveSettings)}
						/>
						<div>
							<span class="label-text font-medium text-white block">Enable Animations</span>
							<span class="label-text-alt text-text-muted/60">
								Smooth transitions and visual effects
							</span>
						</div>
					</label>
				</div>
			</GlassPanel>

			<!-- General Settings -->
			<GlassPanel class="p-6" intensity="medium">
				<h2 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
					<Icon icon="material-symbols:settings" class="text-phoenix-primary" />
					General
				</h2>

				<!-- Auto Save -->
				<div class="form-control mb-6">
					<label class="label cursor-pointer justify-start gap-4">
						<input
							type="checkbox"
							class="toggle toggle-primary border-white/20 bg-black/30 checked:bg-phoenix-primary checked:border-phoenix-primary"
							bind:checked={app.settings.state.autoSave}
							onchange={handleAsyncChange(saveSettings)}
						/>
						<span class="label-text font-medium text-white">Auto Save</span>
					</label>
				</div>

				{#if app.settings.state.autoSave}
					<div class="form-control">
						<label class="label" for="save-interval">
							<span class="label-text font-medium text-white">Auto Save Interval (minutes)</span>
						</label>
						<input
							id="save-interval"
							type="number"
							min="1"
							max="60"
							class="input bg-black/30 border-white/10 text-white focus:border-phoenix-primary focus:outline-none"
							bind:value={app.settings.state.autoSaveInterval}
							onchange={handleAsyncChange(saveSettings)}
						/>
					</div>
				{/if}
			</GlassPanel>
		</div>

		<!-- Data Management -->
		<GlassPanel class="mt-6 p-6" intensity="medium">
			<h2 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
				<Icon icon="material-symbols:storage" class="text-phoenix-primary" />
				Data Management
			</h2>

			<div class="flex flex-wrap gap-4">
				<button
					class="btn btn-outline border-white/20 text-white hover:bg-white/10 hover:border-white/40 gap-2"
					onclick={exportSettings}
					disabled={isExporting}
				>
					{#if isExporting}
						<span class="loading loading-spinner loading-sm"></span>
					{:else}
						<Icon icon="material-symbols:file-export" class="w-5 h-5" />
					{/if}
					Export Data
				</button>

				<button
					class="btn btn-outline border-white/20 text-white hover:bg-white/10 hover:border-white/40 gap-2"
					onclick={importSettings}
					disabled={isImporting}
				>
					{#if isImporting}
						<span class="loading loading-spinner loading-sm"></span>
					{:else}
						<Icon icon="material-symbols:file-import" class="w-5 h-5" />
					{/if}
					Import Data
				</button>

				<button
					class="btn btn-outline border-error/50 text-error hover:bg-error/10 hover:border-error gap-2"
					onclick={clearAllData}
				>
					<Icon icon="material-symbols:delete-forever" class="w-5 h-5" />
					Clear All Data
				</button>

				<button
					class="btn btn-outline border-error/50 text-error hover:bg-error/10 hover:border-error gap-2"
					onclick={nuclearClear}
				>
					<Icon icon="material-symbols:delete-forever" class="w-5 h-5" />
					Nuclear Clear
				</button>
			</div>

			<p
				class="mt-4 text-sm text-text-muted/70 bg-black/20 p-3 rounded-lg border border-white/5 inline-block"
			>
				<span class="text-phoenix-accent font-bold">Note:</span> Use Clear All Data to remove app data.
				Nuclear Clear wipes all browser storage for the app.
			</p>
		</GlassPanel>
	</div>
</div>
