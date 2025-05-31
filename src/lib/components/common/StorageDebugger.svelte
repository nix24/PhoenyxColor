<script lang="ts">
	import { appStore } from "$lib/stores/app.svelte";
	import Icon from "@iconify/svelte";
	import { onMount } from "svelte";

	let storageInfo = $state<any>({});
	let isVisible = $state(false);

	async function refreshStorageInfo() {
		try {
			// Check localStorage
			const localStorageKeys = Object.keys(localStorage).filter((key) =>
				key.startsWith("phoenyxcolor")
			);

			// Check localforage
			let localforageKeys: string[] = [];
			try {
				const { default: localforage } = await import("localforage");
				localforageKeys = await localforage.keys();
			} catch (error) {
				console.error("LocalForage not available:", error);
			}

			// Check immediate backup
			const immediateBackup = localStorage.getItem("phoenyxcolor-immediate-backup");
			let backupData = null;
			if (immediateBackup) {
				try {
					backupData = JSON.parse(immediateBackup);
				} catch (error) {
					console.error("Failed to parse backup:", error);
				}
			}

			storageInfo = {
				localStorage: {
					keys: localStorageKeys,
					data: localStorageKeys.reduce((acc, key) => {
						try {
							const value = localStorage.getItem(key);
							acc[key] = value ? JSON.parse(value) : value;
						} catch {
							acc[key] = localStorage.getItem(key);
						}
						return acc;
					}, {} as any),
				},
				localforage: {
					keys: localforageKeys,
				},
				backup: backupData,
				currentState: {
					palettes: appStore.state.palettes.length,
					references: appStore.state.references.length,
					gradients: appStore.state.gradients.length,
				},
			};
		} catch (error) {
			console.error("Failed to refresh storage info:", error);
		}
	}

	async function testSave() {
		console.log("🧪 Manual save test...");
		const result = await appStore.saveToStorage();
		console.log("🧪 Save result:", result);
		await refreshStorageInfo();
	}

	async function testLoad() {
		console.log("🧪 Manual load test...");
		const result = await appStore.loadFromStorage();
		console.log("🧪 Load result:", result);
		await refreshStorageInfo();
	}

	async function clearAll() {
		console.log("🧪 Clearing all storage...");
		await appStore.nuclearClearStorage();
		localStorage.removeItem("phoenyxcolor-immediate-backup");
		await refreshStorageInfo();
	}

	async function hardReset() {
		if (confirm("Are you sure? This will clear ALL data and reload the page.")) {
			console.log("🚨 Hard reset initiated...");
			await appStore.hardReset();
		}
	}

	onMount(() => {
		refreshStorageInfo();

		// Refresh every 2 seconds
		const interval = setInterval(refreshStorageInfo, 2000);

		return () => clearInterval(interval);
	});
</script>

{#if isVisible}
	<div
		class="fixed bottom-4 right-4 z-50 bg-base-100 border border-base-300 rounded-lg shadow-xl p-4 w-96 max-h-96 overflow-y-auto"
	>
		<div class="flex items-center justify-between mb-3">
			<h3 class="font-bold text-sm">Storage Debugger</h3>
			<button class="btn btn-xs btn-circle btn-ghost" onclick={() => (isVisible = false)}>
				<Icon icon="material-symbols:close" class="w-3 h-3" />
			</button>
		</div>

		<div class="space-y-3 text-xs">
			<!-- Current State -->
			<div>
				<h4 class="font-semibold">Current State</h4>
				<div class="bg-base-200 p-2 rounded">
					<div>Palettes: {storageInfo.currentState?.palettes || 0}</div>
					<div>References: {storageInfo.currentState?.references || 0}</div>
					<div>Gradients: {storageInfo.currentState?.gradients || 0}</div>
				</div>
			</div>

			<!-- LocalStorage -->
			<div>
				<h4 class="font-semibold">LocalStorage</h4>
				<div class="bg-base-200 p-2 rounded max-h-20 overflow-y-auto">
					{#if storageInfo.localStorage?.keys?.length > 0}
						{#each storageInfo.localStorage.keys as key}
							<div class="truncate">{key}</div>
						{/each}
					{:else}
						<div class="text-base-content/60">No keys found</div>
					{/if}
				</div>
			</div>

			<!-- Immediate Backup -->
			<div>
				<h4 class="font-semibold">Backup Data</h4>
				<div class="bg-base-200 p-2 rounded">
					{#if storageInfo.backup}
						<div>Palettes: {storageInfo.backup.palettes?.length || 0}</div>
						<div>Timestamp: {storageInfo.backup.timestamp}</div>
					{:else}
						<div class="text-base-content/60">No backup found</div>
					{/if}
				</div>
			</div>

			<!-- Actions -->
			<div class="flex flex-wrap gap-1">
				<button class="btn btn-xs btn-primary" onclick={testSave}>Save</button>
				<button class="btn btn-xs btn-secondary" onclick={testLoad}>Load</button>
				<button class="btn btn-xs btn-error" onclick={clearAll}>Clear All</button>
				<button class="btn btn-xs btn-warning" onclick={hardReset}>Hard Reset</button>
				<button class="btn btn-xs btn-outline" onclick={refreshStorageInfo}>Refresh</button>
			</div>
		</div>
	</div>
{/if}

<!-- Toggle Button -->
<button
	class="fixed bottom-4 left-4 z-40 btn btn-sm btn-circle btn-primary"
	onclick={() => (isVisible = !isVisible)}
	title="Toggle Storage Debugger"
>
	<Icon icon="material-symbols:bug-report" class="w-4 h-4" />
</button>
