import type { RootStore } from "$lib/stores/root.svelte";
import type { ValidatedReferenceImage } from "$lib/schemas/validation";
import type { ValidatedColorPalette } from "$lib/schemas/validation";
import type { ValidatedGradient } from "$lib/schemas/validation";
import type { ValidatedAppSettings } from "$lib/schemas/validation";
import { toast } from "svelte-sonner";
import { browser } from "$app/environment";
import { validateAppData } from "$lib/schemas/validation";
import pkg from "file-saver";

const { saveAs } = pkg;

const STORAGE_VERSION = "1.1";

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
	async importData(): Promise<Partial<StorageData["data"]> | null> {
		if (!browser) return null;

		return new Promise((resolve) => {
			try {
				const input = document.createElement("input");
				input.type = "file";
				input.accept = ".json";

				input.onchange = async (e) => {
					const file = (e.target as HTMLInputElement).files?.[0];
					if (!file) {
						resolve(null);
						return;
					}

					try {
						const text = await file.text();
						const importData = JSON.parse(text);

						// Validate import data structure
						if (!importData.data || !importData.version) {
							toast.error("Invalid import file format");
							resolve(null);
							return;
						}

						// Check version compatibility
						if (importData.version !== STORAGE_VERSION) {
							console.warn(`Import version mismatch: ${importData.version} vs ${STORAGE_VERSION}`);
						}

						const validatedState = this.validateAndSanitizeState(importData.data);
						if (validatedState) {
							toast.success("Data imported successfully");
							resolve(validatedState);
						} else {
							toast.error("Import data validation failed");
							resolve(null);
						}
					} catch (parseError) {
						console.error("Failed to parse import file:", parseError);
						toast.error("Invalid JSON file");
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

	private validateAndSanitizeState(data: any): Partial<StorageData["data"]> | null {
		try {
			const sanitized: Partial<StorageData["data"]> = {};

			// Validate and sanitize references
			if (Array.isArray(data.references)) {
				sanitized.references = data.references
					.filter((ref: any) => {
						return ref && typeof ref.id === "string" && typeof ref.src === "string";
					})
					.map((ref: any) => ({
						...ref,
						createdAt: new Date(ref.createdAt || Date.now()),
					}));
			}

			// Validate and sanitize palettes
			if (Array.isArray(data.palettes)) {
				sanitized.palettes = data.palettes
					.filter((palette: any) => {
						return (
							palette &&
							typeof palette.id === "string" &&
							typeof palette.name === "string" &&
							Array.isArray(palette.colors)
						);
					})
					.map((palette: any) => ({
						...palette,
						createdAt: new Date(palette.createdAt || Date.now()),
					}));
			}

			// Validate and sanitize gradients
			if (Array.isArray(data.gradients)) {
				sanitized.gradients = data.gradients
					.filter((gradient: any) => {
						return (
							gradient &&
							typeof gradient.id === "string" &&
							typeof gradient.name === "string" &&
							Array.isArray(gradient.stops)
						);
					})
					.map((gradient: any) => ({
						...gradient,
						createdAt: new Date(gradient.createdAt || Date.now()),
					}));
			}

			// Validate settings
			if (data.settings && typeof data.settings === "object") {
				sanitized.settings = {
					...data.settings,
					theme: data.settings.theme === "dark" ? "dark" : "light",
				};
			}

			// Validate tutorial state
			if (data.tutorialState && typeof data.tutorialState === "object") {
				sanitized.tutorialState = {
					...data.tutorialState,
					isActive: false, // Don't import active tutorial state
					currentStep: 0,
					currentModule: null,
				};
			}

			return sanitized;
		} catch (error) {
			console.error("State validation failed:", error);
			return null;
		}
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

			keysToRemove.forEach((key) => {
				try {
					localStorage.removeItem(key);
					console.log(`✅ Removed localStorage key: ${key}`);
				} catch (keyError) {
					console.warn(`⚠️ Failed to remove localStorage key ${key}:`, keyError);
					overallSuccess = false;
				}
			});

			// After removing phoenyxcolor keys, also clear theme-related keys that may be left behind
			const themeKeys: string[] = Object.keys(localStorage).filter(
				(key) => key.includes("theme") || key.includes("daisy"),
			);

			themeKeys.forEach((key) => {
				try {
					localStorage.removeItem(key);
					console.log(`✅ Removed theme key: ${key}`);
				} catch (keyError) {
					console.warn(`⚠️ Failed to remove theme key ${key}:`, keyError);
					overallSuccess = false;
				}
			});

			// Clear sessionStorage
			const sessionKeysToRemove: string[] = [];
			for (let i = 0; i < sessionStorage.length; i++) {
				const key = sessionStorage.key(i);
				if (key && (key.startsWith("phoenyxcolor") || key.includes("phoenyx"))) {
					sessionKeysToRemove.push(key);
				}
			}

			sessionKeysToRemove.forEach((key) => {
				try {
					sessionStorage.removeItem(key);
					console.log(`✅ Removed sessionStorage key: ${key}`);
				} catch (keyError) {
					console.warn(`⚠️ Failed to remove sessionStorage key ${key}:`, keyError);
				}
			});

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

export const persistenceService = PersistenceService.getInstance();
