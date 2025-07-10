<script lang="ts">
	import { appStore } from "$lib/stores/app.svelte";
	import Icon from "@iconify/svelte";
	import { toast } from "svelte-sonner";

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

	// Local state for settings form
	let localSettings = $state({
		theme: appStore.state.settings.theme,
		enableAnimations: appStore.state.settings.enableAnimations,
		autoSave: appStore.state.settings.autoSave,
		autoSaveInterval: appStore.state.settings.autoSaveInterval,
	});

	// Theme options
	const themeOptions = [
		{ value: "system", label: "System" },
		{ value: "light", label: "Light" },
		{ value: "dark", label: "Dark" },
	];

	async function saveSettings() {
		try {
			console.log("💾 Saving settings from UI...");

			await appStore.updateSettings({
				theme: localSettings.theme,
				enableAnimations: localSettings.enableAnimations,
				autoSave: localSettings.autoSave,
				autoSaveInterval: localSettings.autoSaveInterval,
			});

			// Apply theme change to DOM
			document.documentElement.setAttribute("data-theme", localSettings.theme);

			// Update auto-save if changed
			if (localSettings.autoSave) {
				appStore.startAutoSave();
			} else {
				appStore.stopAutoSave();
			}

			toast.success("Settings saved successfully!");
			console.log("✅ Settings saved and applied");
		} catch (error) {
			console.error("Failed to save settings:", error);
			toast.error("Failed to save settings. Please try again.");
		}
	}

	function resetSettings() {
		localSettings = {
			theme: "system",
			enableAnimations: true,
			autoSave: true,
			autoSaveInterval: 5,
		};
		toast.info("Settings reset to defaults");
	}

	async function exportSettings() {
		isExporting = true;
		try {
			await appStore.exportData();
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
			const success = await appStore.importData();
			if (success) {
				// Update local state to reflect imported settings
				localSettings = {
					theme: appStore.state.settings.theme,
					enableAnimations: appStore.state.settings.enableAnimations,
					autoSave: appStore.state.settings.autoSave,
					autoSaveInterval: appStore.state.settings.autoSaveInterval,
				};
			}
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
			const cleared = await appStore.clearData();
			if (cleared) {
				toast.success("All application data cleared");
			} else {
				toast.error("Failed to clear all application data. Some data might remain in storage.");
			}
		}
	}

	async function nuclearClear() {
		if (
			confirm("This will completely wipe all app storage. This action cannot be undone. Continue?")
		) {
			const cleared = await appStore.nuclearClearStorage();
			if (cleared) {
				toast.success("Storage cleared successfully. Reloading app...");
				setTimeout(() => window.location.reload(), 1500);
			} else {
				toast.error("Failed to clear storage.");
			}
		}
	}
</script>

<div class="h-full overflow-y-auto">
	<div class="container mx-auto p-4 md:p-6 max-w-4xl">
		<!-- Header -->
		<div class="mb-6 md:mb-8">
			<div class="flex items-center gap-3 mb-2">
				<Icon icon="material-symbols:settings-outline" class="text-2xl md:text-3xl text-primary" />
				<h1 class="text-2xl md:text-3xl font-bold text-base-content">Settings</h1>
			</div>
			<p class="text-base-content/70">Configure your PhoenyxColor experience and preferences</p>
		</div>

		<div class="grid grid-cols-1 gap-6">
			<!-- Appearance Settings -->
			<div class="card bg-base-100 shadow-lg border border-base-300">
				<div class="card-body">
					<h2 class="card-title text-xl mb-4">
						<Icon icon="material-symbols:palette" class="text-primary" />
						Appearance
					</h2>

					<!-- Theme Selection -->
					<div class="form-control mb-4">
						<label class="label" for="theme-select">
							<span class="label-text font-medium">Theme</span>
						</label>
						<select
							id="theme-select"
							class="select select-bordered w-full"
							bind:value={localSettings.theme}
							onchange={handleAsyncChange(saveSettings)}
						>
							{#each themeOptions as theme}
								<option value={theme.value}>{theme.label}</option>
							{/each}
						</select>
						<label class="label" for="theme-select">
							<span class="label-text-alt text-base-content/60">
								Choose your preferred color scheme
							</span>
						</label>
					</div>

					<!-- Animations Toggle -->
					<div class="form-control">
						<label class="label cursor-pointer">
							<span class="label-text font-medium">Enable Animations</span>
							<input
								type="checkbox"
								class="toggle toggle-primary"
								bind:checked={localSettings.enableAnimations}
								onchange={handleAsyncChange(saveSettings)}
							/>
						</label>
						<label class="label" for="enable-animations">
							<span class="label-text-alt text-base-content/60">
								Smooth transitions and visual effects
							</span>
						</label>
					</div>
				</div>
			</div>

			<!-- Add General card -->
			<div class="card bg-base-100 shadow-lg border border-base-300">
				<div class="card-body">
					<h2 class="card-title text-xl mb-4">
						<Icon icon="material-symbols:settings" class="text-primary" />
						General
					</h2>

					<!-- Auto Save -->
					<div class="form-control mb-4">
						<label class="label cursor-pointer">
							<span class="label-text font-medium">Auto Save</span>
							<input
								type="checkbox"
								class="toggle toggle-primary"
								bind:checked={localSettings.autoSave}
								onchange={handleAsyncChange(saveSettings)}
							/>
						</label>
					</div>

					{#if localSettings.autoSave}
						<div class="form-control">
							<label class="label" for="save-interval">
								<span class="label-text font-medium">Auto Save Interval (minutes)</span>
							</label>
							<input
								id="save-interval"
								type="number"
								min="1"
								max="60"
								class="input input-bordered"
								bind:value={localSettings.autoSaveInterval}
								onchange={handleAsyncChange(saveSettings)}
							/>
						</div>
					{/if}
				</div>
			</div>

			<!-- Remove Workflow and Export cards -->
		</div>

		<!-- Add Data Management card -->
		<div class="mt-8 card bg-base-100 shadow-lg border border-base-300">
			<div class="card-body">
				<h2 class="card-title text-xl mb-4">
					<Icon icon="material-symbols:storage" class="text-primary" />
					Data Management
				</h2>

				<div class="flex flex-wrap gap-4">
					<button class="btn btn-outline" onclick={exportSettings} disabled={isExporting}>
						{#if isExporting}
							<span class="loading loading-spinner loading-sm"></span>
						{:else}
							<Icon icon="material-symbols:file-export" />
						{/if}
						Export Data
					</button>

					<button class="btn btn-outline" onclick={importSettings} disabled={isImporting}>
						{#if isImporting}
							<span class="loading loading-spinner loading-sm"></span>
						{:else}
							<Icon icon="material-symbols:file-import" />
						{/if}
						Import Data
					</button>

					<button class="btn btn-error btn-outline" onclick={clearAllData}>
						<Icon icon="material-symbols:delete-forever" />
						Clear All Data
					</button>

					<button class="btn btn-error btn-outline" onclick={nuclearClear}>
						<Icon icon="material-symbols:delete-forever" />
						Nuclear Clear
					</button>
				</div>

				<p class="mt-4 text-sm text-base-content/70">
					Use Clear All Data to remove app data. Nuclear Clear wipes all browser storage for the
					app.
				</p>
			</div>
		</div>
	</div>
</div>
