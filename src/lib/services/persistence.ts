import type { AppState } from "$lib/stores/app.svelte";
import { toast } from "svelte-sonner";
import { browser } from "$app/environment";
import { validateAppData } from "$lib/schemas/validation";
import pkg from "file-saver";

const { saveAs } = pkg;

// Dynamic import for localforage to avoid SSR issues
let localforage: any = null;

const STORAGE_KEY = "phoenyxcolor-app-state";
const STORAGE_VERSION = "1.1";
const BACKUP_KEY = "phoenyxcolor-backup";

export interface StorageData {
	version: string;
	timestamp: string;
	state: Partial<AppState>;
}

export class PersistenceService {
	private static instance: PersistenceService;
	private autoSaveInterval: number | null = null;
	private isInitialized = false;

	static getInstance(): PersistenceService {
		if (!PersistenceService.instance) {
			PersistenceService.instance = new PersistenceService();
		}
		return PersistenceService.instance;
	}

	constructor() {
		if (browser) {
			this.initializeStorage();
		}
	}

	private async initializeStorage() {
		if (!browser) return;

		try {
			// Dynamic import to avoid SSR issues
			const { default: localforageLib } = await import("localforage");
			localforage = localforageLib;

			// Configure localforage for better performance
			localforage.config({
				driver: [localforage.INDEXEDDB, localforage.WEBSQL, localforage.LOCALSTORAGE],
				name: "PhoenyxColor",
				version: 1.0,
				storeName: "app_data",
				description: "PhoenyxColor application data storage",
			});

			this.isInitialized = true;
			console.log("Storage initialized with driver:", localforage.driver());
		} catch (error) {
			console.error("Failed to initialize storage:", error);
			// Fallback to localStorage only
			this.isInitialized = true;
			if (browser) {
				toast.error("Advanced storage not available, using basic storage");
			}
		}
	}

	private async ensureInitialized() {
		if (!browser) return false;
		if (!this.isInitialized) {
			await this.initializeStorage();
		}
		return this.isInitialized;
	}

	/**
	 * Save application state with enhanced error handling
	 */
	async saveState(state: AppState): Promise<boolean> {
		if (!(await this.ensureInitialized())) {
			return false;
		}

		try {
			// Create backup before saving new state
			await this.createBackup();

			// Only save persistent data, exclude runtime state
			const persistentState: Partial<AppState> = {
				references: state.references,
				palettes: state.palettes,
				gradients: state.gradients,
				activePalette: state.activePalette,
				activeGradient: state.activeGradient,
				settings: state.settings,
				tutorialState: {
					...state.tutorialState,
					isActive: false, // Don't persist active tutorial state
					currentStep: 0,
					currentModule: null,
				},
			};

			const storageData: StorageData = {
				version: STORAGE_VERSION,
				timestamp: new Date().toISOString(),
				state: persistentState,
			};

			// Use localforage if available, otherwise localStorage
			if (localforage) {
				await localforage.setItem(STORAGE_KEY, storageData);
			} else {
				// Fallback to localStorage
				localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
			}

			console.log("State saved successfully");
			return true;
		} catch (error) {
			console.error("Failed to save state:", error);

			if (error instanceof Error && error.name === "QuotaExceededError") {
				if (browser) {
					toast.error(
						"Storage quota exceeded. Consider clearing some data or exporting your work."
					);
				}
				// Try to restore from backup
				await this.restoreFromBackup();
			} else {
				if (browser) {
					toast.error("Failed to save application state");
				}
			}
			return false;
		}
	}

	/**
	 * Load application state with migration support
	 */
	async loadState(): Promise<Partial<AppState> | null> {
		if (!(await this.ensureInitialized())) {
			console.log("Storage not initialized, cannot load state");
			return null;
		}

		try {
			let storageData: StorageData | null = null;
			let dataSource = "none";

			// Try localforage first if available
			if (localforage) {
				try {
					storageData = await localforage.getItem(STORAGE_KEY);
					if (storageData) {
						dataSource = "localforage";
						console.log("Loaded data from localforage");
					}
				} catch (error) {
					console.warn("Failed to load from localforage:", error);
				}
			}

			// Fallback to localStorage if no data from localforage
			if (!storageData && browser) {
				try {
					const stored = localStorage.getItem(STORAGE_KEY);
					if (stored) {
						storageData = JSON.parse(stored);
						dataSource = "localStorage";
						console.log("Loaded data from localStorage");
						
						// Migrate to localforage if it's available and data is valid
						if (localforage && storageData) {
							try {
								await localforage.setItem(STORAGE_KEY, storageData);
								localStorage.removeItem(STORAGE_KEY); // Clean up old storage
								console.log("Migrated data from localStorage to localforage");
							} catch (migrateError) {
								console.warn("Failed to migrate to localforage:", migrateError);
							}
						}
					}
				} catch (error) {
					console.warn("Failed to load from localStorage:", error);
				}
			}

			if (!storageData) {
				console.log("No saved state found in any storage");
				return null;
			}

			console.log(`Found data from ${dataSource}, version: ${storageData.version}`);

			// Version compatibility check and migration
			if (storageData.version !== STORAGE_VERSION) {
				console.warn(
					`Storage version mismatch. Expected ${STORAGE_VERSION}, got ${storageData.version}`
				);
				try {
					storageData = await this.migrateData(storageData);
					console.log("Data migration completed");
				} catch (migrateError) {
					console.error("Data migration failed:", migrateError);
					toast.error("Failed to migrate data - using current version");
				}
			}

			// Validate and sanitize loaded data
			const validatedState = this.validateAndSanitizeState(storageData.state);

			if (validatedState) {
				console.log("Data validation successful");
				if (browser) {
					toast.success("Application data loaded successfully");
				}
				return validatedState;
			} else {
				console.warn("Data validation failed");
				if (browser) {
					toast.warning("Some application data could not be loaded");
				}
				return null;
			}
		} catch (error) {
			console.error("Failed to load state:", error);
			if (browser) {
				toast.error("Failed to load saved application data");
			}

			// Try to restore from backup
			console.log("Attempting to restore from backup...");
			const backupState = await this.restoreFromBackup();
			if (backupState) {
				console.log("Successfully restored from backup");
				if (browser) {
					toast.info("Restored from backup data");
				}
				return backupState;
			}

			console.log("No backup data available");
			return null;
		}
	}

	/**
	 * Create a backup of current data
	 */
	private async createBackup(): Promise<void> {
		if (!browser) return;

		try {
			let currentData: StorageData | null = null;

			if (localforage) {
				currentData = await localforage.getItem(STORAGE_KEY);
			} else {
				const stored = localStorage.getItem(STORAGE_KEY);
				if (stored) {
					currentData = JSON.parse(stored);
				}
			}

			if (currentData) {
				const backupData = {
					...currentData,
					timestamp: new Date().toISOString(),
					isBackup: true,
				};

				if (localforage) {
					await localforage.setItem(BACKUP_KEY, backupData);
				} else {
					localStorage.setItem(BACKUP_KEY, JSON.stringify(backupData));
				}
			}
		} catch (error) {
			console.warn("Failed to create backup:", error);
		}
	}

	/**
	 * Restore from backup
	 */
	private async restoreFromBackup(): Promise<Partial<AppState> | null> {
		if (!browser) return null;

		try {
			let backupData: any = null;

			if (localforage) {
				backupData = await localforage.getItem(BACKUP_KEY);
			} else {
				const stored = localStorage.getItem(BACKUP_KEY);
				if (stored) {
					backupData = JSON.parse(stored);
				}
			}

			if (backupData && backupData.isBackup) {
				return this.validateAndSanitizeState(backupData.state);
			}
		} catch (error) {
			console.error("Failed to restore from backup:", error);
		}
		return null;
	}

	/**
	 * Migrate data between versions
	 */
	private async migrateData(data: StorageData): Promise<StorageData> {
		// Implement version-specific migrations here
		const migratedData = { ...data };

		// Example migration from 1.0 to 1.1
		if (data.version === "1.0") {
			// Add any necessary migrations
			migratedData.version = "1.1";
		}

		// Save migrated data
		if (localforage) {
			await localforage.setItem(STORAGE_KEY, migratedData);
		} else if (browser) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedData));
		}

		console.log(`Migrated data from version ${data.version} to ${migratedData.version}`);

		return migratedData;
	}

	/**
	 * Clear all stored data
	 */
	async clearStorage(): Promise<boolean> {
		if (!browser) return false;

		try {
			console.log("Clearing all storage data...");
			
			// Clear localforage if available
			if (localforage) {
				await localforage.removeItem(STORAGE_KEY);
				await localforage.removeItem(BACKUP_KEY);
				console.log("Cleared localforage data");
			}

			// Always clear localStorage regardless of localforage
			try {
				localStorage.removeItem(STORAGE_KEY);
				localStorage.removeItem(BACKUP_KEY);
				console.log("Cleared localStorage data");
			} catch (lsError) {
				console.warn("Failed to clear localStorage:", lsError);
			}

			// Clear any other related storage keys
			const keysToRemove = [];
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key && key.startsWith("phoenyxcolor")) {
					keysToRemove.push(key);
				}
			}
			
			keysToRemove.forEach(key => {
				try {
					localStorage.removeItem(key);
					console.log(`Cleared additional key: ${key}`);
				} catch (error) {
					console.warn(`Failed to clear key ${key}:`, error);
				}
			});

			console.log("Storage cleared successfully");
			toast.success("All stored data cleared");
			return true;
		} catch (error) {
			console.error("Failed to clear storage:", error);
			if (browser) {
				toast.error("Failed to clear stored data");
			}
			return false;
		}
	}

	/**
	 * Export application data as JSON file
	 */
	async exportData(state: AppState): Promise<boolean> {
		if (!browser) return false;

		try {
			const exportData = {
				version: STORAGE_VERSION,
				exportedAt: new Date().toISOString(),
				application: "PhoenyxColor",
				data: {
					references: state.references,
					palettes: state.palettes,
					gradients: state.gradients,
					settings: state.settings,
				},
			};

			// Validate export data before saving
			const validation = validateAppData(exportData);
			if (!validation.valid) {
				console.error("Export data validation failed:", validation.error);
				toast.error(`Export failed: ${validation.error}`);
				return false;
			}

			const jsonString = JSON.stringify(exportData, null, 2);
			
			// Use file-saver for reliable downloads
			const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
			saveAs(blob, `phoenyxcolor-export-${new Date().toISOString().split("T")[0]}.json`);

			toast.success("Data exported successfully");
			return true;
		} catch (error) {
			console.error("Failed to export data:", error);
			if (browser) {
				toast.error("Failed to export application data");
			}
			return false;
		}
	}

	/**
	 * Import application data from JSON file with validation
	 */
	async importData(): Promise<Partial<AppState> | null> {
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

	/**
	 * Start auto-save with debouncing
	 */
	startAutoSave(saveCallback: () => Promise<boolean>, intervalMinutes: number = 5): void {
		if (!browser) return;

		this.stopAutoSave();

		const intervalMs = intervalMinutes * 60 * 1000;
		this.autoSaveInterval = window.setInterval(async () => {
			try {
				const success = await saveCallback();
				if (success) {
					console.log("Auto-save completed");
				} else {
					console.warn("Auto-save failed");
				}
			} catch (error) {
				console.error("Auto-save error:", error);
			}
		}, intervalMs);

		console.log(`Auto-save started with ${intervalMinutes}min interval`);
	}

	/**
	 * Stop auto-save
	 */
	stopAutoSave(): void {
		if (this.autoSaveInterval) {
			clearInterval(this.autoSaveInterval);
			this.autoSaveInterval = null;
			console.log("Auto-save stopped");
		}
	}

	/**
	 * Get storage information and usage
	 */
	async getStorageInfo(): Promise<{ used: number; available: number; percentage: number }> {
		if (!browser) {
			return { used: 0, available: 0, percentage: 0 };
		}

		try {
			// Use Storage API if available
			if ("storage" in navigator && "estimate" in navigator.storage) {
				const estimate = await navigator.storage.estimate();
				const used = estimate.usage || 0;
				const available = estimate.quota || 0;
				const percentage = available > 0 ? (used / available) * 100 : 0;

				return {
					used: Math.round((used / 1024 / 1024) * 100) / 100, // MB
					available: Math.round((available / 1024 / 1024) * 100) / 100, // MB
					percentage: Math.round(percentage * 100) / 100,
				};
			} else {
				// Fallback estimation
				let dataSize = 0;
				if (localforage) {
					const data = await localforage.getItem(STORAGE_KEY);
					dataSize = data ? JSON.stringify(data).length : 0;
				} else {
					const stored = localStorage.getItem(STORAGE_KEY);
					dataSize = stored ? stored.length : 0;
				}

				const estimatedUsed = dataSize / 1024 / 1024; // MB

				return {
					used: Math.round(estimatedUsed * 100) / 100,
					available: 50, // Assume 50MB available as fallback
					percentage: (estimatedUsed / 50) * 100,
				};
			}
		} catch (error) {
			console.error("Failed to get storage info:", error);
			return { used: 0, available: 0, percentage: 0 };
		}
	}

	/**
	 * Validate and sanitize loaded state
	 */
	private validateAndSanitizeState(state: any): Partial<AppState> | null {
		try {
			if (!state || typeof state !== "object") {
				return null;
			}

			const sanitized: Partial<AppState> = {};

			// Validate references
			if (Array.isArray(state.references)) {
				sanitized.references = state.references.filter(
					(ref: any) =>
						ref &&
						typeof ref === "object" &&
						typeof ref.id === "string" &&
						typeof ref.name === "string"
				);
			}

			// Validate palettes
			if (Array.isArray(state.palettes)) {
				sanitized.palettes = state.palettes.filter(
					(pal: any) =>
						pal &&
						typeof pal === "object" &&
						typeof pal.id === "string" &&
						typeof pal.name === "string" &&
						Array.isArray(pal.colors)
				);
			}

			// Validate gradients
			if (Array.isArray(state.gradients)) {
				sanitized.gradients = state.gradients.filter(
					(grad: any) =>
						grad &&
						typeof grad === "object" &&
						typeof grad.id === "string" &&
						typeof grad.name === "string" &&
						Array.isArray(grad.stops)
				);
			}

			// Validate settings
			if (state.settings && typeof state.settings === "object") {
				sanitized.settings = {
					theme: state.settings.theme || "light",
					defaultPaletteSlots: state.settings.defaultPaletteSlots || 5,
					alwaysOnTop: Boolean(state.settings.alwaysOnTop),
					enableAnimations: state.settings.enableAnimations !== false,
					globalEyedropperEnabled: Boolean(state.settings.globalEyedropperEnabled),
					referenceBoardSavePath: state.settings.referenceBoardSavePath || null,
					exportPreferences: state.settings.exportPreferences || {
						defaultPngResolution: 1920,
						defaultSvgSize: { width: 800, height: 600 },
						compressionLevel: 80,
					},
					keyboardShortcuts: state.settings.keyboardShortcuts || {},
					autoSave: state.settings.autoSave !== false,
					autoSaveInterval: state.settings.autoSaveInterval || 5,
				};
			}

			// Validate tutorial state
			if (state.tutorialState && typeof state.tutorialState === "object") {
				sanitized.tutorialState = {
					isActive: false, // Always start with tutorial inactive
					currentStep: 0,
					currentModule: null,
					completedTutorials: Array.isArray(state.tutorialState.completedTutorials)
						? state.tutorialState.completedTutorials
						: [],
					showHints: state.tutorialState.showHints !== false,
				};
			}

			// Validate active selections
			if (typeof state.activePalette === "string") {
				sanitized.activePalette = state.activePalette;
			}

			if (typeof state.activeGradient === "string") {
				sanitized.activeGradient = state.activeGradient;
			}

			return sanitized;
		} catch (error) {
			console.error("State validation failed:", error);
			return null;
		}
	}

	/**
	 * Debug function to manually inspect storage
	 */
	async debugStorage(): Promise<void> {
		if (!browser) {
			console.log("Not in browser environment");
			return;
		}

		console.log("=== STORAGE DEBUG ===");
		
		// Check localStorage
		console.log("LocalStorage keys:");
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key) {
				const value = localStorage.getItem(key);
				console.log(`  ${key}: ${value ? value.substring(0, 100) + "..." : "null"}`);
			}
		}

		// Check localforage if available
		if (localforage) {
			console.log("\nLocalforage data:");
			try {
				const data = await localforage.getItem(STORAGE_KEY);
				console.log(`  ${STORAGE_KEY}:`, data ? "Present" : "Not found");
				
				const backup = await localforage.getItem(BACKUP_KEY);
				console.log(`  ${BACKUP_KEY}:`, backup ? "Present" : "Not found");
			} catch (error) {
				console.log("  Error reading localforage:", error);
			}
		} else {
			console.log("\nLocalforage: Not available");
		}

		// Check storage usage
		const storageInfo = await this.getStorageInfo();
		console.log("\nStorage Usage:");
		console.log(`  Used: ${storageInfo.used}MB`);
		console.log(`  Available: ${storageInfo.available}MB`);
		console.log(`  Percentage: ${storageInfo.percentage}%`);
		
		console.log("=== END DEBUG ===");
	}

	/**
	 * Manually force clear ALL storage (nuclear option)
	 */
	async nuclearClearStorage(): Promise<boolean> {
		if (!browser) return false;

		console.log("🚨 NUCLEAR STORAGE CLEAR - REMOVING EVERYTHING 🚨");
		
		try {
			// Clear ALL localStorage (not just our keys)
			const allKeys = [];
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key) allKeys.push(key);
			}
			
			allKeys.forEach(key => {
				localStorage.removeItem(key);
				console.log(`Removed localStorage key: ${key}`);
			});

			// Clear ALL localforage if available
			if (localforage) {
				await localforage.clear();
				console.log("Cleared all localforage data");
			}

			// Clear session storage too
			sessionStorage.clear();
			console.log("Cleared sessionStorage");

			console.log("Nuclear clear completed");
			toast.success("All browser storage cleared (nuclear option)");
			return true;
		} catch (error) {
			console.error("Nuclear clear failed:", error);
			toast.error("Failed to clear all storage");
			return false;
		}
	}
}

// Create singleton instance
export const persistenceService = PersistenceService.getInstance();
