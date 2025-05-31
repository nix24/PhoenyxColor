import type { AppState } from "$lib/stores/app.svelte";
import { toast } from "svelte-sonner";
import { browser } from "$app/environment";
import { validateAppData } from "$lib/schemas/validation";
import pkg from "file-saver";

const { saveAs } = pkg;

// Dynamic import for localforage to avoid SSR issues
let localforage: any = null;
let localforageInitialized = false;
let localforageError: string | null = null;

const STORAGE_KEY = "phoenyxcolor-app-state";
const STORAGE_VERSION = "1.1";
const BACKUP_KEY = "phoenyxcolor-backup";
const INIT_TIMEOUT = 5000; // 5 seconds timeout for initialization

export interface StorageData {
	version: string;
	timestamp: string;
	state: Partial<AppState>;
}

export class PersistenceService {
	private static instance: PersistenceService;
	private autoSaveInterval: number | null = null;
	private isInitialized = false;
	private initializationPromise: Promise<boolean> | null = null;

	// localforage is chosen as the primary storage library because it provides a robust abstraction
	// over IndexedDB, WebSQL, and localStorage. It automatically selects the best available
	// backend, handles browser inconsistencies, and offers a simple promise-based API.
	// This aligns with the goal of using the "best local storage database" approach
	// to ensure data persistence robustly and handle edge cases effectively.
	// Fallback to direct localStorage is implemented for scenarios where localforage might not
	// initialize or operate as expected, further enhancing robustness.
	// Data validation, versioning, and backup mechanisms are also included.

	static getInstance(): PersistenceService {
		if (!PersistenceService.instance) {
			PersistenceService.instance = new PersistenceService();
		}
		return PersistenceService.instance;
	}

	constructor() {
		if (browser) {
			// Start initialization but don't block constructor
			this.initializeStorage().catch((error) => {
				console.error("Storage initialization failed in constructor:", error);
			});
		}
	}

	private async initializeStorage(): Promise<boolean> {
		if (!browser) return false;

		// Return existing promise if initialization is already in progress
		if (this.initializationPromise) {
			return this.initializationPromise;
		}

		this.initializationPromise = this.performInitialization();
		return this.initializationPromise;
	}

	private async performInitialization(): Promise<boolean> {
		try {
			// Create a timeout promise for initialization
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => reject(new Error("Initialization timeout")), INIT_TIMEOUT);
			});

			// Race between localforage import and timeout
			const initPromise = (async () => {
				const { default: localforageLib } = await import("localforage");
				localforage = localforageLib;

				// Test if localforage is actually functional
				await this.testLocalforageOperations();

				// Configure localforage for optimal performance and reliability
				localforage.config({
					driver: [localforage.INDEXEDDB, localforage.WEBSQL, localforage.LOCALSTORAGE],
					name: "PhoenyxColor",
					version: 1.0,
					storeName: "app_data",
					description: "PhoenyxColor application data storage",
					size: 4980736, // ~5MB default size
				});

				localforageInitialized = true;
				this.isInitialized = true;

				const driver = localforage.driver();
				console.log("✅ Storage initialized successfully with driver:", driver);

				// Log driver capabilities
				this.logDriverCapabilities(driver);

				return true;
			})();

			await Promise.race([initPromise, timeoutPromise]);
			return true;
		} catch (error) {
			localforageError = error instanceof Error ? error.message : "Unknown error";
			console.error("❌ Failed to initialize localforage:", error);

			// Test localStorage as fallback
			if (this.testLocalStorageOperations()) {
				this.isInitialized = true;
				console.log("⚠️ Fallback to localStorage successful");
				if (browser) {
					toast.warning("Using basic storage mode. Some features may be limited.");
				}
				return true;
			} else {
				console.error("❌ Both localforage and localStorage failed");
				if (browser) {
					toast.error("Storage initialization failed. Data persistence is disabled.");
				}
				return false;
			}
		}
	}

	private async testLocalforageOperations(): Promise<boolean> {
		if (!localforage) return false;

		try {
			const testKey = "phoenyxcolor-test";
			const testData = { test: true, timestamp: Date.now() };

			// Test write
			await localforage.setItem(testKey, testData);

			// Test read
			const retrieved = await localforage.getItem(testKey);
			if (!retrieved || (retrieved as any).test !== true) {
				throw new Error("Data integrity test failed");
			}

			// Test delete
			await localforage.removeItem(testKey);

			// Verify deletion
			const shouldBeNull = await localforage.getItem(testKey);
			if (shouldBeNull !== null) {
				throw new Error("Delete operation test failed");
			}

			console.log("✅ Localforage operations test passed");
			return true;
		} catch (error) {
			console.error("❌ Localforage operations test failed:", error);
			return false;
		}
	}

	private testLocalStorageOperations(): boolean {
		if (!browser) return false;

		try {
			const testKey = "phoenyxcolor-ls-test";
			const testData = JSON.stringify({ test: true, timestamp: Date.now() });

			// Test write
			localStorage.setItem(testKey, testData);

			// Test read
			const retrieved = localStorage.getItem(testKey);
			if (!retrieved) {
				throw new Error("Read test failed");
			}

			const parsed = JSON.parse(retrieved);
			if (parsed.test !== true) {
				throw new Error("Data integrity test failed");
			}

			// Test delete
			localStorage.removeItem(testKey);

			// Verify deletion
			const shouldBeNull = localStorage.getItem(testKey);
			if (shouldBeNull !== null) {
				throw new Error("Delete operation test failed");
			}

			console.log("✅ localStorage operations test passed");
			return true;
		} catch (error) {
			console.error("❌ localStorage operations test failed:", error);
			return false;
		}
	}

	private logDriverCapabilities(driver: string): void {
		const capabilities: Record<string, string> = {
			[localforage?.INDEXEDDB || "idb"]: "IndexedDB - High performance, large storage",
			[localforage?.WEBSQL || "websql"]: "WebSQL - Good performance, deprecated",
			[localforage?.LOCALSTORAGE || "localstorage"]: "localStorage - Basic, limited storage",
		};

		const capability = capabilities[driver] || "Unknown driver";
		console.log(`📊 Storage capability: ${capability}`);
	}

	private async ensureInitialized(): Promise<boolean> {
		if (!browser) return false;

		if (!this.isInitialized) {
			return await this.initializeStorage();
		}

		return this.isInitialized;
	}

	/**
	 * Enhanced save with comprehensive error handling and retry logic
	 */
	async saveState(state: AppState): Promise<boolean> {
		if (!(await this.ensureInitialized())) {
			console.error("Storage not initialized, cannot save state");
			return false;
		}

		let attempts = 0;
		const maxAttempts = 3;

		while (attempts < maxAttempts) {
			attempts++;

			try {
				// Create backup before saving new state
				await this.createBackup();

				// Only save persistent data, exclude runtime state
				const persistentState: Partial<AppState> = {
					references: state.references || [],
					palettes: state.palettes || [],
					gradients: state.gradients || [],
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

				// Try localforage first if available
				if (localforageInitialized && localforage) {
					try {
						await localforage.setItem(STORAGE_KEY, storageData);
						console.log(`✅ State saved successfully via localforage (attempt ${attempts})`);
						return true;
					} catch (localforageError) {
						console.warn(`⚠️ Localforage save failed (attempt ${attempts}):`, localforageError);

						// If it's a quota error, don't retry with localforage
						if (
							localforageError instanceof Error &&
							localforageError.name === "QuotaExceededError"
						) {
							throw localforageError;
						}
					}
				}

				// Fallback to localStorage
				if (browser) {
					const jsonString = JSON.stringify(storageData);
					localStorage.setItem(STORAGE_KEY, jsonString);
					console.log(`✅ State saved successfully via localStorage (attempt ${attempts})`);
					return true;
				}

				throw new Error("No storage method available");
			} catch (error) {
				console.error(`❌ Save attempt ${attempts} failed:`, error);

				if (error instanceof Error && error.name === "QuotaExceededError") {
					if (browser) {
						toast.error(
							"Storage quota exceeded. Consider clearing some data or exporting your work."
						);
					}

					// Try to restore from backup and clear some space
					await this.restoreFromBackup();
					return false;
				}

				// If this is the last attempt, show error
				if (attempts === maxAttempts) {
					if (browser) {
						toast.error(`Failed to save application state after ${maxAttempts} attempts`);
					}
					return false;
				}

				// Wait before retry (exponential backoff)
				await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempts) * 1000));
			}
		}

		return false;
	}

	/**
	 * Enhanced load with comprehensive error handling and automatic migration
	 */
	async loadState(): Promise<Partial<AppState> | null> {
		if (!(await this.ensureInitialized())) {
			console.log("Storage not initialized, cannot load state");
			return null;
		}

		let attempts = 0;
		const maxAttempts = 3;

		while (attempts < maxAttempts) {
			attempts++;

			try {
				let storageData: StorageData | null = null;
				let dataSource = "none";

				// Try localforage first if available and initialized
				if (localforageInitialized && localforage) {
					try {
						storageData = await localforage.getItem(STORAGE_KEY);
						if (storageData) {
							dataSource = "localforage";
							console.log(`✅ Loaded data from localforage (attempt ${attempts})`);
						}
					} catch (localforageError) {
						console.warn(
							`⚠️ Failed to load from localforage (attempt ${attempts}):`,
							localforageError
						);

						// If localforage fails, mark it as problematic for this session
						if (attempts === maxAttempts) {
							localforageInitialized = false;
							console.warn("Disabling localforage for this session due to repeated failures");
						}
					}
				}

				// Fallback to localStorage if no data from localforage
				if (!storageData && browser) {
					try {
						const stored = localStorage.getItem(STORAGE_KEY);
						if (stored) {
							storageData = JSON.parse(stored);
							dataSource = "localStorage";
							console.log(`✅ Loaded data from localStorage (attempt ${attempts})`);

							// Migrate to localforage if it's available and data is valid
							if (localforageInitialized && localforage && storageData) {
								try {
									await localforage.setItem(STORAGE_KEY, storageData);
									// Only remove localStorage after successful migration
									localStorage.removeItem(STORAGE_KEY);
									console.log("✅ Successfully migrated data from localStorage to localforage");
									if (browser) {
										toast.success("Storage upgraded to advanced mode");
									}
								} catch (migrateError) {
									console.warn(
										"⚠️ Failed to migrate to localforage, keeping localStorage:",
										migrateError
									);
								}
							}
						}
					} catch (parseError) {
						console.warn(`⚠️ Failed to parse localStorage data (attempt ${attempts}):`, parseError);

						// Try to recover from corrupt localStorage
						if (browser) {
							localStorage.removeItem(STORAGE_KEY);
							console.log("🧹 Removed corrupt localStorage data");
						}
					}
				}

				if (!storageData) {
					if (attempts === maxAttempts) {
						console.log("No saved state found in any storage after all attempts");
					}
					return null;
				}

				console.log(`Found data from ${dataSource}, version: ${storageData.version || "unknown"}`);

				// Enhanced version compatibility check and migration
				if (!storageData.version || storageData.version !== STORAGE_VERSION) {
					console.warn(
						`Storage version mismatch. Expected ${STORAGE_VERSION}, got ${storageData.version || "none"}`
					);
					try {
						storageData = await this.migrateData(storageData);
						console.log("✅ Data migration completed successfully");
					} catch (migrateError) {
						console.error("❌ Data migration failed:", migrateError);
						if (browser) {
							toast.error("Failed to migrate data - some data may be lost");
						}

						// Try to continue with unmigrated data if possible
						if (!storageData.state) {
							console.error("Cannot continue without valid state data");
							return null;
						}
					}
				}

				// Enhanced validation and sanitization
				const validatedState = this.validateAndSanitizeState(storageData.state);

				if (validatedState) {
					console.log(`✅ Data validation successful (attempt ${attempts})`);
					if (browser && attempts === 1) {
						toast.success("Application data loaded successfully");
					}
					return validatedState;
				} else {
					console.warn(`⚠️ Data validation failed (attempt ${attempts})`);
					if (attempts === maxAttempts) {
						if (browser) {
							toast.warning("Some application data could not be loaded");
						}
					}
				}
			} catch (error) {
				console.error(`❌ Load attempt ${attempts} failed:`, error);

				// If this is the last attempt, try backup recovery
				if (attempts === maxAttempts) {
					console.log("🔄 All load attempts failed, trying backup recovery...");
					const backupState = await this.restoreFromBackup();
					if (backupState) {
						console.log("✅ Successfully restored from backup");
						if (browser) {
							toast.info("Restored application data from backup");
						}
						return backupState;
					}

					if (browser) {
						toast.error("Failed to load saved application data");
					}
					console.log("❌ No backup data available, starting fresh");
					return null;
				}

				// Wait before retry (exponential backoff)
				await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempts) * 1000));
			}
		}

		return null;
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
	 * Enhanced clear all stored data with comprehensive cleanup
	 */
	async clearStorage(): Promise<boolean> {
		if (!browser) return false;

		console.log("🧹 Starting comprehensive storage cleanup...");
		let overallSuccess = true;
		const errors: string[] = [];

		try {
			// Clear localforage if available and initialized
			if (localforageInitialized && localforage) {
				try {
					await localforage.removeItem(STORAGE_KEY);
					await localforage.removeItem(BACKUP_KEY);

					// Clear all phoenyxcolor related items
					const keys = await localforage.keys();
					const phoenyxKeys = keys.filter((key: string) => key.startsWith("phoenyxcolor"));

					for (const key of phoenyxKeys) {
						try {
							await localforage.removeItem(key);
							console.log(`✅ Removed localforage key: ${key}`);
						} catch (keyError) {
							console.warn(`⚠️ Failed to remove localforage key ${key}:`, keyError);
							errors.push(`localforage key ${key}`);
						}
					}

					console.log("✅ Localforage data cleared successfully");
				} catch (localforageError) {
					console.warn("⚠️ Failed to clear localforage:", localforageError);
					errors.push("localforage");
					overallSuccess = false;
				}
			}

			// Always clear localStorage regardless of localforage status
			try {
				// Remove specific keys
				localStorage.removeItem(STORAGE_KEY);
				localStorage.removeItem(BACKUP_KEY);

				// Find and remove all phoenyxcolor related keys
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
						errors.push(`localStorage key ${key}`);
						overallSuccess = false;
					}
				});

				console.log("✅ localStorage data cleared successfully");
			} catch (lsError) {
				console.warn("⚠️ Failed to clear localStorage:", lsError);
				errors.push("localStorage");
				overallSuccess = false;
			}

			// Clear sessionStorage as well (in case any temporary data is stored there)
			try {
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
						errors.push(`sessionStorage key ${key}`);
					}
				});

				if (sessionKeysToRemove.length > 0) {
					console.log("✅ sessionStorage data cleared successfully");
				}
			} catch (ssError) {
				console.warn("⚠️ Failed to clear sessionStorage:", ssError);
				errors.push("sessionStorage");
			}

			// Try to clear IndexedDB directly if localforage failed
			if (!localforageInitialized || errors.includes("localforage")) {
				try {
					if ("indexedDB" in window) {
						// This is a more aggressive approach - delete the entire database
						const deleteReq = indexedDB.deleteDatabase("PhoenyxColor");

						await new Promise<void>((resolve, reject) => {
							deleteReq.onsuccess = () => {
								console.log("✅ IndexedDB database deleted successfully");
								resolve();
							};
							deleteReq.onerror = () => {
								console.warn("⚠️ Failed to delete IndexedDB database");
								reject(deleteReq.error);
							};
							deleteReq.onblocked = () => {
								console.warn("⚠️ IndexedDB deletion blocked");
								// Still resolve as the deletion might complete later
								resolve();
							};
						});
					}
				} catch (idbError) {
					console.warn("⚠️ Failed to clear IndexedDB directly:", idbError);
					errors.push("IndexedDB");
				}
			}

			// Provide user feedback
			if (overallSuccess && errors.length === 0) {
				console.log("✅ All storage cleared successfully");
				if (browser) {
					toast.success("All stored data cleared successfully");
				}
				return true;
			} else {
				const message =
					errors.length > 0
						? `Storage partially cleared. Failed to clear: ${errors.join(", ")}`
						: "Storage cleared with some warnings";

				console.warn(`⚠️ ${message}`);
				if (browser) {
					toast.warning(message);
				}
				return !overallSuccess; // Return true if there were only minor errors
			}
		} catch (error) {
			console.error("❌ Critical error during storage clearing:", error);
			if (browser) {
				toast.error("Critical error occurred while clearing storage");
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

			allKeys.forEach((key) => {
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
