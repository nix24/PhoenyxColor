import type { AppState } from "$lib/stores/app.svelte";
import { browser } from "$app/environment";
import { toast } from "svelte-sonner";
import { safeSet, safeGet } from "$lib/utils/storageUtils";

const STORAGE_KEY = "phoenyxcolor-simple-storage";
const VERSION = "1.0";

export interface SimpleStorageData {
	version: string;
	timestamp: string;
	state: Partial<AppState>;
}

export class SimpleStorageService {
	private static instance: SimpleStorageService;

	// Hold pending state and debounce handle for write coalescing
	private pendingState: AppState | null = null;
	private saveTimer: number | null = null;
	private pendingResolvers: ((value: boolean) => void)[] = [];
	private static readonly DEBOUNCE_MS = 300;

	static getInstance(): SimpleStorageService {
		if (!SimpleStorageService.instance) {
			SimpleStorageService.instance = new SimpleStorageService();
		}
		return SimpleStorageService.instance;
	}

	/**
	 * Public saveState – debounced by default.
	 * Pass { immediate: true } to bypass debounce (used by auto-save timer).
	 */
	async saveState(state: AppState, opts: { immediate?: boolean } = {}): Promise<boolean> {
		if (!browser) return false;

		if (opts.immediate) {
			return await this.performSave(state);
		}

		return new Promise<boolean>((resolve) => {
			this.pendingState = state;
			this.pendingResolvers.push(resolve);

			if (this.saveTimer) clearTimeout(this.saveTimer);

			this.saveTimer = window.setTimeout(async () => {
				const result = await this.performSave(this.pendingState!);
				this.pendingState = null;
				// Flush all awaiting resolvers
				this.pendingResolvers.forEach((r) => r(result));
				this.pendingResolvers = [];
			}, SimpleStorageService.DEBOUNCE_MS);
		});
	}

	/**
	 * Actual synchronous save logic (stringify + write).
	 */
	private async performSave(state: AppState): Promise<boolean> {
		try {
			console.log("🔄 Simple storage: Saving state (flush)…");

			// Only save persistent data
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

			const storageData: SimpleStorageData = {
				version: VERSION,
				timestamp: new Date().toISOString(),
				state: persistentState,
			};

			const ok = safeSet(STORAGE_KEY, storageData);
			if (!ok) {
				toast.error("Failed to save – storage quota may be full");
				return false;
			}

			console.log("✅ Simple storage: Data saved successfully");
			return true;
		} catch (error: any) {
			if (error?.name === "QuotaExceededError") {
				toast.error("Storage quota exceeded. Please export or clear data.");
			}
			console.error("❌ Simple storage: Save failed:", error);
			return false;
		}
	}

	async loadState(): Promise<Partial<AppState> | null> {
		if (!browser) return null;

		try {
			console.log("🔄 Simple storage: Loading state...");

			const storageData = safeGet<SimpleStorageData>(STORAGE_KEY);
			if (!storageData) {
				console.log("📦 Simple storage: No data found");
				return null;
			}

			console.log("📦 Simple storage: Loaded data version:", storageData.version);

			if (!storageData.state) {
				console.warn("📦 Simple storage: No state data in storage");
				return null;
			}

			// Convert date strings back to Date objects
			const processedState = { ...storageData.state };

			if (processedState.references && Array.isArray(processedState.references)) {
				processedState.references = processedState.references.map((ref: any) => ({
					...ref,
					createdAt: new Date(ref.createdAt),
				}));
			}

			if (processedState.palettes && Array.isArray(processedState.palettes)) {
				processedState.palettes = processedState.palettes.map((palette: any) => ({
					...palette,
					createdAt: new Date(palette.createdAt),
				}));
			}

			if (processedState.gradients && Array.isArray(processedState.gradients)) {
				processedState.gradients = processedState.gradients.map((gradient: any) => ({
					...gradient,
					createdAt: new Date(gradient.createdAt),
				}));
			}

			console.log("✅ Simple storage: Data loaded successfully");
			console.log("📊 Loaded data:", {
				references: processedState.references?.length || 0,
				palettes: processedState.palettes?.length || 0,
				gradients: processedState.gradients?.length || 0,
			});

			return processedState;
		} catch (error) {
			console.error("❌ Simple storage: Load failed:", error);
			return null;
		}
	}

	async clearStorage(): Promise<boolean> {
		if (!browser) return false;

		try {
			console.log("🧹 Simple storage: Starting comprehensive clear...");

			// Get all localStorage keys that start with 'phoenyxcolor'
			const keysToRemove = Object.keys(localStorage).filter((key) =>
				key.startsWith("phoenyxcolor")
			);

			console.log("🧹 Found keys to remove:", keysToRemove);

			// Remove all phoenyxcolor-related keys
			keysToRemove.forEach((key) => {
				localStorage.removeItem(key);
				console.log("🗑️ Removed key:", key);
			});

			// Also clear any theme data that might be stored
			const themeKeys = Object.keys(localStorage).filter(
				(key) => key.includes("theme") || key.includes("daisy")
			);

			console.log("🎨 Theme-related keys found:", themeKeys);

			// Remove theme-related keys as part of the cleanup
			themeKeys.forEach((key) => {
				localStorage.removeItem(key);
				console.log("🗑️ Removed theme key:", key);
			});

			console.log("✅ Simple storage: All storage cleared");
			return true;
		} catch (error) {
			console.error("❌ Simple storage: Clear failed:", error);
			return false;
		}
	}
}

export const simpleStorageService = SimpleStorageService.getInstance();
