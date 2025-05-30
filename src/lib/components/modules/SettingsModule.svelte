<script lang="ts">
	import { appStore } from "$lib/stores/app.svelte";
	import Icon from "@iconify/svelte";
	import { toast } from "svelte-sonner";
	import { keyboardShortcuts } from "$lib/services/keyboardShortcuts";

	let isExporting = $state(false);
	let isImporting = $state(false);

	// Local state for settings form
	let localSettings = $state({
		theme: appStore.state.settings.theme,
		defaultPaletteSlots: appStore.state.settings.defaultPaletteSlots,
		alwaysOnTop: appStore.state.settings.alwaysOnTop,
		enableAnimations: appStore.state.settings.enableAnimations,
		globalEyedropperEnabled: appStore.state.settings.globalEyedropperEnabled,
		autoSave: appStore.state.settings.autoSave,
		autoSaveInterval: appStore.state.settings.autoSaveInterval,
		defaultPngResolution: appStore.state.settings.exportPreferences.defaultPngResolution,
		compressionLevel: appStore.state.settings.exportPreferences.compressionLevel,
	});

	// Theme options
	const themeOptions = [
		{
			value: "light",
			label: "🌞 Light",
			description: "Clean and bright interface",
		},
		{ value: "dark", label: "🌙 Dark", description: "Easy on the eyes" },
		{
			value: "cupcake",
			label: "🧁 Cupcake",
			description: "Soft and sweet colors",
		},
		{
			value: "bumblebee",
			label: "🐝 Bumblebee",
			description: "Vibrant yellow accents",
		},
		{
			value: "emerald",
			label: "💎 Emerald",
			description: "Professional green theme",
		},
		{
			value: "corporate",
			label: "🏢 Corporate",
			description: "Business-focused design",
		},
		{
			value: "synthwave",
			label: "🌆 Synthwave",
			description: "Retro neon aesthetics",
		},
		{
			value: "valentine",
			label: "💖 Valentine",
			description: "Romantic pink theme",
		},
	];

	// Resolution presets
	const resolutionPresets = [
		{ value: 1920, label: "Full HD (1920px)" },
		{ value: 2560, label: "2K (2560px)" },
		{ value: 3840, label: "4K (3840px)" },
		{ value: 1280, label: "HD (1280px)" },
		{ value: 800, label: "Standard (800px)" },
	];

	function saveSettings() {
		try {
			appStore.updateSettings({
				theme: localSettings.theme as any,
				defaultPaletteSlots: localSettings.defaultPaletteSlots,
				alwaysOnTop: localSettings.alwaysOnTop,
				enableAnimations: localSettings.enableAnimations,
				globalEyedropperEnabled: localSettings.globalEyedropperEnabled,
				autoSave: localSettings.autoSave,
				autoSaveInterval: localSettings.autoSaveInterval,
				exportPreferences: {
					...appStore.state.settings.exportPreferences,
					defaultPngResolution: localSettings.defaultPngResolution,
					compressionLevel: localSettings.compressionLevel,
				},
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
		} catch (error) {
			console.error("Failed to save settings:", error);
			toast.error("Failed to save settings. Please try again.");
		}
	}

	function resetSettings() {
		localSettings = {
			theme: "light",
			defaultPaletteSlots: 5,
			alwaysOnTop: false,
			enableAnimations: true,
			globalEyedropperEnabled: false,
			autoSave: true,
			autoSaveInterval: 5,
			defaultPngResolution: 1920,
			compressionLevel: 80,
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
					defaultPaletteSlots: appStore.state.settings.defaultPaletteSlots,
					alwaysOnTop: appStore.state.settings.alwaysOnTop,
					enableAnimations: appStore.state.settings.enableAnimations,
					globalEyedropperEnabled: appStore.state.settings.globalEyedropperEnabled,
					autoSave: appStore.state.settings.autoSave,
					autoSaveInterval: appStore.state.settings.autoSaveInterval,
					defaultPngResolution: appStore.state.settings.exportPreferences.defaultPngResolution,
					compressionLevel: appStore.state.settings.exportPreferences.compressionLevel,
				};
			}
		} catch (error) {
			console.error("Failed to import data:", error);
			toast.error("Failed to import data. Please try again.");
		} finally {
			isImporting = false;
		}
	}

	function clearAllData() {
		if (
			confirm("Are you sure you want to clear all application data? This action cannot be undone.")
		) {
			// Clear all data from the store
			appStore.state.references = [];
			appStore.state.palettes = [];
			appStore.state.gradients = [];
			appStore.state.activePalette = null;
			appStore.state.activeGradient = null;
			appStore.clearUndoHistory();

			toast.success("All application data cleared");
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

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
							onchange={saveSettings}
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
								onchange={saveSettings}
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

			<!-- Workflow Settings -->
			<div class="card bg-base-100 shadow-lg border border-base-300">
				<div class="card-body">
					<h2 class="card-title text-xl mb-4">
						<Icon icon="material-symbols:work-outline" class="text-primary" />
						Workflow
					</h2>

					<!-- Default Palette Slots -->
					<div class="form-control mb-4">
						<label class="label" for="palette-slots">
							<span class="label-text font-medium">Default Palette Slots</span>
						</label>
						<input
							id="palette-slots"
							type="range"
							min="3"
							max="20"
							class="range range-primary"
							bind:value={localSettings.defaultPaletteSlots}
							onchange={saveSettings}
						/>
						<div class="w-full flex justify-between text-xs px-2 text-base-content/60">
							<span>3</span>
							<span class="font-medium">{localSettings.defaultPaletteSlots}</span>
							<span>20</span>
						</div>
					</div>

					<!-- Auto Save -->
					<div class="form-control mb-4">
						<label class="label cursor-pointer">
							<span class="label-text font-medium">Auto Save</span>
							<input
								type="checkbox"
								class="toggle toggle-primary"
								bind:checked={localSettings.autoSave}
								onchange={saveSettings}
							/>
						</label>
					</div>

					<!-- Auto Save Interval -->
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
								onchange={saveSettings}
							/>
						</div>
					{/if}
				</div>
			</div>

			<!-- Desktop Features -->
			<div class="card bg-base-100 shadow-lg border border-base-300">
				<div class="card-body">
					<h2 class="card-title text-xl mb-4">
						<Icon icon="material-symbols:desktop-windows" class="text-primary" />
						Desktop Features
					</h2>

					<!-- Always on Top -->
					<div class="form-control mb-4 tooltip" data-tip="Desktop app feature">
						<label class="label cursor-not-allowed">
							<span class="label-text font-medium opacity-50">Always on Top</span>
							<input
								type="checkbox"
								class="toggle toggle-primary"
								bind:checked={localSettings.alwaysOnTop}
								onchange={saveSettings}
								disabled
							/>
						</label>
						<label class="label" for="always-on-top">
							<span class="label-text-alt text-base-content/60">
								Keep PhoenyxColor above other windows (Desktop Only)
							</span>
						</label>
					</div>

					<!-- Global Eyedropper -->
					<div class="form-control tooltip" data-tip="Desktop app feature">
						<label class="label cursor-not-allowed">
							<span class="label-text font-medium opacity-50">Global Eyedropper</span>
							<input
								type="checkbox"
								class="toggle toggle-primary"
								bind:checked={localSettings.globalEyedropperEnabled}
								onchange={saveSettings}
								disabled
							/>
						</label>
						<label class="label" for="global-eyedropper">
							<span class="label-text-alt text-base-content/60">
								Pick colors from anywhere on screen (Desktop Only)
							</span>
						</label>
					</div>
				</div>
			</div>

			<!-- Export Settings -->
			<div class="card bg-base-100 shadow-lg border border-base-300">
				<div class="card-body">
					<h2 class="card-title text-xl mb-4">
						<Icon icon="material-symbols:download" class="text-primary" />
						Export Preferences
					</h2>

					<!-- Default PNG Resolution -->
					<div class="form-control mb-4">
						<label class="label" for="png-resolution">
							<span class="label-text font-medium">Default PNG Resolution</span>
						</label>
						<select
							id="png-resolution"
							class="select select-bordered w-full"
							bind:value={localSettings.defaultPngResolution}
							onchange={saveSettings}
						>
							{#each resolutionPresets as preset}
								<option value={preset.value}>{preset.label}</option>
							{/each}
						</select>
					</div>

					<!-- Compression Level -->
					<div class="form-control">
						<label class="label" for="compression">
							<span class="label-text font-medium">Compression Level</span>
						</label>
						<input
							id="compression"
							type="range"
							min="10"
							max="100"
							class="range range-primary"
							bind:value={localSettings.compressionLevel}
							onchange={saveSettings}
						/>
						<div class="w-full flex justify-between text-xs px-2 text-base-content/60">
							<span>High Compression</span>
							<span class="font-medium">{localSettings.compressionLevel}%</span>
							<span>High Quality</span>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="mt-8 flex flex-wrap gap-4 justify-center">
			<button class="btn btn-primary" onclick={saveSettings}>
				<Icon icon="material-symbols:save" />
				Save Settings
			</button>

			<button class="btn btn-outline" onclick={resetSettings}>
				<Icon icon="material-symbols:refresh" />
				Reset to Defaults
			</button>

			<button class="btn btn-outline" onclick={exportSettings} disabled={isExporting}>
				{#if isExporting}
					<span class="loading loading-spinner loading-sm"></span>
				{:else}
					<Icon icon="material-symbols:file-export" />
				{/if}
				Export Settings
			</button>

			<button class="btn btn-outline" onclick={importSettings} disabled={isImporting}>
				{#if isImporting}
					<span class="loading loading-spinner loading-sm"></span>
				{:else}
					<Icon icon="material-symbols:file-import" />
				{/if}
				Import Settings
			</button>

			<button class="btn btn-error btn-outline" onclick={clearAllData}>
				<Icon icon="material-symbols:delete-forever" />
				Clear All Data
			</button>
		</div>

		<!-- Keyboard Shortcuts Management -->
		<div class="mt-8 card bg-base-100 shadow-lg border border-base-300">
			<div class="card-body">
				<div class="flex items-center justify-between mb-4">
					<h2 class="card-title text-xl">
						<Icon icon="material-symbols:keyboard" class="text-primary" />
						Keyboard Shortcuts
					</h2>
					<button
						class="btn btn-outline btn-sm"
						onclick={() => keyboardShortcuts.showShortcutsHelp()}
					>
						<Icon icon="material-symbols:help-outline" class="w-4 h-4" />
						Show All Shortcuts
					</button>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each keyboardShortcuts.getAllShortcuts() as shortcut}
						<div class="flex justify-between items-center p-3 bg-base-200 rounded-lg">
							<div class="flex-1">
								<span class="text-sm font-medium">{shortcut.description}</span>
								<div class="text-xs text-base-content/60 mt-1">
									Action: {shortcut.action}
								</div>
							</div>
							<div class="flex items-center space-x-2">
								<div class="flex space-x-1">
									{#if shortcut.ctrlKey}
										<kbd class="kbd kbd-xs">Ctrl</kbd>
									{/if}
									{#if shortcut.shiftKey}
										<kbd class="kbd kbd-xs">Shift</kbd>
									{/if}
									{#if shortcut.altKey}
										<kbd class="kbd kbd-xs">Alt</kbd>
									{/if}
									{#if shortcut.metaKey}
										<kbd class="kbd kbd-xs">Cmd</kbd>
									{/if}
									<kbd class="kbd kbd-xs">
										{shortcut.key.startsWith("Key")
											? shortcut.key.substring(3)
											: shortcut.key.startsWith("Digit")
												? shortcut.key.substring(5)
												: shortcut.key}
									</kbd>
								</div>
							</div>
						</div>
					{/each}
				</div>

				<div class="mt-4 p-4 bg-info/10 rounded-lg border border-info/20">
					<div class="flex items-start space-x-2">
						<Icon icon="material-symbols:info" class="text-info mt-0.5" />
						<div class="text-sm">
							<p class="font-medium text-info">Keyboard Shortcuts Tips:</p>
							<ul class="mt-2 space-y-1 text-base-content/70">
								<li>• Shortcuts work globally when not typing in input fields</li>
								<li>
									• Press <kbd class="kbd kbd-xs">F1</kbd> anytime to see all shortcuts
								</li>
								<li>
									• Press <kbd class="kbd kbd-xs">Esc</kbd> to clear global color buffer
								</li>
								<li>
									• Use <kbd class="kbd kbd-xs">Ctrl + 1/2/3</kbd>
									to switch between modules
								</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
