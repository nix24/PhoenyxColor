import type { RootStore } from "$lib/stores/root.svelte";
import type { ValidatedReferenceImage } from "$lib/schemas/validation";
import type { ValidatedColorPalette } from "$lib/schemas/validation";
import type { ValidatedGradient } from "$lib/schemas/validation";
import type { ValidatedAppSettings } from "$lib/schemas/validation";
import { toast } from "svelte-sonner";
import { browser } from "$app/environment";
import { validateAppData, parseImportedState } from "$lib/schemas/validation";
import type { ImportedState } from "$lib/schemas/validation";
import pkg from "file-saver";

const { saveAs } = pkg;

const STORAGE_VERSION = "1.1";

function removeStorageKeys(storage: Storage, keys: string[], label: string): boolean {
	let success = true;
	for (const key of keys) {
		try {
			storage.removeItem(key);
			console.log(`✅ Removed ${label} key: ${key}`);
		} catch (keyError) {
			console.warn(`⚠️ Failed to remove ${label} key ${key}:`, keyError);
			success = false;
		}
	}
	return success;
}

export interface StorageData {
	version: string;
	timestamp: string;
	data: {
		references: ValidatedReferenceImage[];
		palettes: ValidatedColorPalette[];
		gradients: ValidatedGradient[];
		settings: ValidatedAppSettings;
		tutorialState: {
			hasSeenWelcome: boolean;
			hasSeenPaletteTutorial: boolean;
			hasSeenGradientTutorial: boolean;
			hasSeenReferenceTutorial: boolean;
		};
	};
}

export class PersistenceService {
	private static instance: PersistenceService;
	private autoSaveInterval: number | null = null;

	static getInstance(): PersistenceService {
		if (!PersistenceService.instance) {
			PersistenceService.instance = new PersistenceService();
		}
		return PersistenceService.instance;
	}

	/**
	 * Export application data to JSON file
	 */
	async exportData(app: RootStore): Promise<boolean> {
		if (!browser) return false;

		try {
			const exportData = {
				version: STORAGE_VERSION,
				timestamp: new Date().toISOString(),
				data: {
					references: app.references.references || [],
					palettes: app.palettes.palettes || [],
					gradients: app.gradients.gradients || [],
					settings: app.settings.state,
					tutorialState: {
						hasSeenWelcome: false,
						hasSeenPaletteTutorial: false,
						hasSeenGradientTutorial: false,
						hasSeenReferenceTutorial: false,
					}, // TODO: Move tutorial state to settings or its own store
				},
			};

			// Validate export data
			const validation = validateAppData(exportData);
			if (!validation.valid) {
				toast.error(`Export validation failed: ${validation.error}`);
				return false;
			}

			const filename = `phoenyxcolor-data-${new Date().toISOString().split("T")[0]}.json`;
			const blob = new Blob([JSON.stringify(exportData, null, 2)], {
				type: "application/json;charset=utf-8",
			});

			saveAs(blob, filename);
			toast.success(`Data exported as ${filename}`);
			return true;
		} catch (error) {
			console.error("Export failed:", error);
			toast.error("Failed to export data");
			return false;
		}
	}

	/**
	 * Import application data from JSON file with validation
	 */
	async importData(): Promise<ImportedState | null> {
		if (!browser) return null;

		return new Promise((resolve) => {
			try {
				const input = document.createElement("input");
				input.type = "file";
				input.accept = ".json";

				input.onchange = async (e) => {
					// SAFETY: `e` is the change event of the `input` element created above, so
					// `e.target` is that same `HTMLInputElement`.
					const target = e.target as HTMLInputElement;
					const file = target.files?.[0];
					if (!file) {
						resolve(null);
						return;
					}

					try {
						const imported = parseImportedState(await file.text());
						if (!imported) {
							toast.error("Invalid import file format");
							resolve(null);
							return;
						}

						if (imported.version !== STORAGE_VERSION) {
							console.warn(`Import version mismatch: ${imported.version} vs ${STORAGE_VERSION}`);
						}

						toast.success("Data imported successfully");
						resolve(imported);
					} catch (readError) {
						console.error("Failed to read import file:", readError);
						toast.error("Could not read the selected file");
						resolve(null);
					}
				};

				input.click();
			} catch (error) {
				console.error("Failed to setup import:", error);
				toast.error("Failed to setup file import");
				resolve(null);
			}
		});
	}

	/**
	 * Start auto-save with specified interval
	 */
	startAutoSave(saveCallback: () => Promise<boolean>, intervalMinutes: number): void {
		this.stopAutoSave(); // Clear any existing interval

		const intervalMs = intervalMinutes * 60 * 1000;
		this.autoSaveInterval = window.setInterval(async () => {
			try {
				console.log("🔄 Auto-save triggered");
				await saveCallback();
			} catch (error) {
				console.error("Auto-save failed:", error);
			}
		}, intervalMs);

		console.log(`✅ Auto-save started with ${intervalMinutes} minute interval`);
	}

	/**
	 * Stop auto-save
	 */
	stopAutoSave(): void {
		if (this.autoSaveInterval) {
			clearInterval(this.autoSaveInterval);
			this.autoSaveInterval = null;
			console.log("🛑 Auto-save stopped");
		}
	}

	/**
	 * Clear storage - comprehensive cleanup
	 */
	async clearStorage(): Promise<boolean> {
		if (!browser) return false;

		console.log("🧹 Persistence service: Starting storage cleanup...");
		let overallSuccess = true;

		try {
			// Clear localStorage phoenyxcolor keys
			const keysToRemove: string[] = [];
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key && (key.startsWith("phoenyxcolor") || key.includes("phoenyx"))) {
					keysToRemove.push(key);
				}
			}

			overallSuccess =
				removeStorageKeys(localStorage, keysToRemove, "localStorage") && overallSuccess;

			// After removing phoenyxcolor keys, also clear theme-related keys that may be left behind
			const themeKeys: string[] = Object.keys(localStorage).filter(
				(key) => key.includes("theme") || key.includes("daisy"),
			);

			overallSuccess = removeStorageKeys(localStorage, themeKeys, "theme") && overallSuccess;

			// Clear sessionStorage
			const sessionKeysToRemove: string[] = [];
			for (let i = 0; i < sessionStorage.length; i++) {
				const key = sessionStorage.key(i);
				if (key && (key.startsWith("phoenyxcolor") || key.includes("phoenyx"))) {
					sessionKeysToRemove.push(key);
				}
			}

			removeStorageKeys(sessionStorage, sessionKeysToRemove, "sessionStorage");

			// Try to clear IndexedDB
			try {
				if ("indexedDB" in window) {
					const deleteReq = indexedDB.deleteDatabase("PhoenyxColor");
					await new Promise<void>((resolve, reject) => {
						deleteReq.onsuccess = () => {
							console.log("✅ IndexedDB database deleted");
							resolve();
						};
						deleteReq.onerror = () => {
							console.warn("⚠️ Failed to delete IndexedDB database");
							reject(deleteReq.error);
						};
						deleteReq.onblocked = () => {
							console.warn("⚠️ IndexedDB deletion blocked");
							resolve();
						};
					});
				}
			} catch (idbError) {
				console.warn("⚠️ Failed to clear IndexedDB:", idbError);
			}

			console.log("✅ Persistence service: Storage cleanup completed");
			return overallSuccess;
		} catch (error) {
			console.error("❌ Critical error during storage clearing:", error);
			return false;
		}
	}

	/**
	 * Debug function to inspect storage
	 */
	async debugStorage(): Promise<void> {
		if (!browser) {
			console.log("Not in browser environment");
			return;
		}

		console.log("=== PERSISTENCE SERVICE DEBUG ===");

		// Check localStorage
		console.log("LocalStorage keys:");
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key) {
				const value = localStorage.getItem(key);
				console.log(`  ${key}: ${value ? `${value.substring(0, 100)}...` : "null"}`);
			}
		}

		// Check storage usage
		try {
			if ("storage" in navigator && "estimate" in navigator.storage) {
				const estimate = await navigator.storage.estimate();
				const used = estimate.usage || 0;
				const available = estimate.quota || 0;
				const percentage = available > 0 ? (used / available) * 100 : 0;

				console.log("\nStorage Usage:");
				console.log(`  Used: ${Math.round((used / 1024 / 1024) * 100) / 100}MB`);
				console.log(`  Available: ${Math.round((available / 1024 / 1024) * 100) / 100}MB`);
				console.log(`  Percentage: ${Math.round(percentage * 100) / 100}%`);
			}
		} catch (error) {
			console.error("Failed to get storage info:", error);
		}

		console.log("=== END DEBUG ===");
	}
}

const persistenceService = PersistenceService.getInstance();
// fallow-ignore-file unused-class-member
