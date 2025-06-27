// Core application state management using Svelte 5 runes
import { persistenceService } from "$lib/services/persistence";
import { simpleStorageService } from "$lib/services/simpleStorage";
import { validatePalette, validateGradient, validateColor } from "$lib/schemas/validation";

// Use simple storage for now to debug persistence issues
const storageService = simpleStorageService;

export interface ReferenceImage {
	id: string;
	src: string;
	thumbnailSrc?: string;
	name: string;
	position: { x: number; y: number };
	scale: number;
	rotation: number;
	opacity: number;
	isGrayscale: boolean;
	createdAt: Date;
	fileSize?: number;
	dimensions?: { width: number; height: number };
}

export interface ColorPalette {
	id: string;
	name: string;
	colors: string[];
	maxSlots: number;
	createdAt: Date;
	tags: string[];
}

export interface GradientStop {
	color: string;
	position: number; // 0-100
}

export interface Gradient {
	id: string;
	name: string;
	type: "linear" | "radial" | "conic";
	stops: GradientStop[];
	angle?: number; // for linear gradients
	centerX?: number; // for radial gradients
	centerY?: number; // for radial gradients
	createdAt: Date;
}

export interface UndoRedoAction {
	id: string;
	moduleId: string;
	actionType: string;
	timestamp: Date;
	prevState: any;
	nextState: any;
}

export interface TutorialState {
	isActive: boolean;
	currentStep: number;
	currentModule: string | null;
	completedTutorials: string[];
	showHints: boolean;
}

export interface AppSettings {
	theme: "light" | "dark";
	defaultPaletteSlots: number;
	alwaysOnTop: boolean;
	enableAnimations: boolean;
	globalEyedropperEnabled: boolean;
	referenceBoardSavePath: string | null;
	exportPreferences: {
		defaultPngResolution: number;
		defaultSvgSize: { width: number; height: number };
		compressionLevel: number;
	};
	keyboardShortcuts: { [action: string]: string };
	autoSave: boolean;
	autoSaveInterval: number; // minutes
}

export interface AppState {
	references: ReferenceImage[];
	palettes: ColorPalette[];
	gradients: Gradient[];
	activePalette: string | null;
	activeGradient: string | null;
	isEyedropperActive: boolean;
	globalColorBuffer: string | null; // For storing colors from global eyedropper
	settings: AppSettings;
	tutorialState: TutorialState;
	undoStack: UndoRedoAction[];
	redoStack: UndoRedoAction[];
	maxUndoStackSize: number;
	isLoading: boolean;
	lastSaved: Date | null;
}

// Create reactive stores using Svelte 5 runes
function createAppStore() {
	const state = $state<AppState>({
		references: [],
		palettes: [],
		gradients: [],
		activePalette: null,
		activeGradient: null,
		isEyedropperActive: false,
		globalColorBuffer: null,
		settings: {
			theme: "light",
			defaultPaletteSlots: 5,
			alwaysOnTop: false,
			enableAnimations: true,
			globalEyedropperEnabled: false,
			referenceBoardSavePath: null,
			exportPreferences: {
				defaultPngResolution: 1920,
				defaultSvgSize: { width: 800, height: 600 },
				compressionLevel: 80,
			},
			keyboardShortcuts: {
				"toggle-eyedropper": "KeyE",
				save: "KeyS",
				undo: "KeyZ",
				redo: "KeyY",
				"new-palette": "KeyN",
				export: "KeyX",
			},
			autoSave: true,
			autoSaveInterval: 5,
		},
		tutorialState: {
			isActive: false,
			currentStep: 0,
			currentModule: null,
			completedTutorials: [],
			showHints: true,
		},
		undoStack: [],
		redoStack: [],
		maxUndoStackSize: 50,
		isLoading: false,
		lastSaved: null,
	});

	// Flag to prevent auto-save during clearing operations
	let clearingInProgress = $state(false);

	// Helper function to create undo/redo actions
	function createUndoAction(
		moduleId: string,
		actionType: string,
		prevState: any,
		nextState: any
	): UndoRedoAction {
		return {
			id: crypto.randomUUID(),
			moduleId,
			actionType,
			timestamp: new Date(),
			prevState,
			nextState,
		};
	}

	// Helper function to push action to undo stack
	function pushUndoAction(action: UndoRedoAction) {
		state.undoStack.push(action);
		if (state.undoStack.length > state.maxUndoStackSize) {
			state.undoStack.shift();
		}
		// Clear redo stack when new action is performed
		state.redoStack = [];
	}

	return {
		// Getters
		get state() {
			return state;
		},
		get references() {
			return state.references;
		},
		get palettes() {
			return state.palettes;
		},
		get gradients() {
			return state.gradients;
		},
		get activePalette() {
			return state.activePalette ? state.palettes.find((p) => p.id === state.activePalette) : null;
		},
		get activeGradient() {
			return state.activeGradient
				? state.gradients.find((g) => g.id === state.activeGradient)
				: null;
		},
		get canUndo() {
			return state.undoStack.length > 0;
		},
		get canRedo() {
			return state.redoStack.length > 0;
		},

		// Actions
		setActivePalette(id: string | null) {
			state.activePalette = id;
		},

		// Loading state
		setLoading(loading: boolean) {
			state.isLoading = loading;
		},

		// Reference actions
		addReference(ref: Omit<ReferenceImage, "id">) {
			const newRef: ReferenceImage = {
				...ref,
				id: crypto.randomUUID(),
				createdAt: new Date(),
				thumbnailSrc: ref.thumbnailSrc || ref.src, // Fallback to full src if thumbnail not provided
			};

			const prevState = [...state.references];
			state.references.push(newRef);

			pushUndoAction(createUndoAction("references", "add", prevState, [...state.references]));

			// Auto-save after adding reference (only if not clearing)
			if (!clearingInProgress && state.settings.autoSave) {
				this.saveToStorage().catch((error) =>
					console.error("Auto-save failed after adding reference:", error)
				);
			}
		},

		updateReference(id: string, updates: Partial<ReferenceImage>) {
			const index = state.references.findIndex((r) => r.id === id);
			if (index !== -1) {
				const prevState = [...state.references];
				Object.assign(state.references[index], updates);

				const action = createUndoAction("references", "update", prevState, [...state.references]);
				pushUndoAction(action);
			}
		},

		removeReference(id: string) {
			const index = state.references.findIndex((r) => r.id === id);
			if (index !== -1) {
				const prevState = [...state.references];
				state.references.splice(index, 1);

				const action = createUndoAction("references", "remove", prevState, [...state.references]);
				pushUndoAction(action);

				// Auto-save after removing reference (only if not clearing)
				if (!clearingInProgress && state.settings.autoSave) {
					this.saveToStorage().catch((error) =>
						console.error("Auto-save failed after removing reference:", error)
					);
				}
			}
		},

		// Palette actions
		addPalette(palette: Omit<ColorPalette, "id" | "createdAt">) {
			if (state.palettes.length >= 100) {
				console.warn("Maximum number of palettes reached");
				return;
			}

			// Create the new palette with proper UUID first
			const newPalette: ColorPalette = {
				...palette,
				id: crypto.randomUUID(),
				createdAt: new Date(),
			};

			// Now validate the complete palette
			const validation = validatePalette(newPalette);
			if (!validation.valid) {
				console.error("Invalid palette:", validation.error);
				return;
			}

			console.log("🎨 Adding palette:", newPalette.name, "ID:", newPalette.id);

			const prevState = [...state.palettes];
			state.palettes.push(newPalette);

			console.log("🎨 Palettes array after add:", state.palettes.length);

			pushUndoAction(createUndoAction("palettes", "add", prevState, [...state.palettes]));

			// IMMEDIATE save to localStorage as backup
			try {
				const immediateBackup = {
					palettes: state.palettes,
					timestamp: new Date().toISOString(),
				};
				localStorage.setItem("phoenyxcolor-immediate-backup", JSON.stringify(immediateBackup));
				console.log("🆘 Immediate backup saved to localStorage");
			} catch (error) {
				console.error("🆘 Immediate backup failed:", error);
			}

			// Synchronous save attempt (only if not clearing)
			if (!clearingInProgress && state.settings.autoSave) {
				console.log("💾 Starting immediate save...");
				this.saveToStorage()
					.then((success) => {
						console.log("💾 Save completed:", success);
					})
					.catch((error) => {
						console.error("💾 Save failed:", error);
					});
			}

			return newPalette.id;
		},

		updatePalette(id: string, updates: Partial<ColorPalette>) {
			const prevState = [...state.palettes];
			const index = state.palettes.findIndex((p) => p.id === id);
			if (index !== -1) {
				Object.assign(state.palettes[index], updates);

				// Create undo action
				const undoAction = createUndoAction("palettes", "updatePalette", prevState, [
					...state.palettes,
				]);
				pushUndoAction(undoAction);

				console.log("✅ Palette updated:", id);

				// Auto-save changes
				this.saveToStorage().catch((error) => {
					console.error("Failed to auto-save after updating palette:", error);
				});
			}
		},

		removePalette(id: string) {
			const index = state.palettes.findIndex((p) => p.id === id);
			if (index === -1) return;

			const prevState = [...state.palettes];
			state.palettes.splice(index, 1);

			// Clear active palette if it was removed
			if (state.activePalette === id) {
				state.activePalette = null;
			}

			pushUndoAction(createUndoAction("palettes", "remove", prevState, [...state.palettes]));

			// Auto-save after removing palette (only if not clearing)
			if (!clearingInProgress && state.settings.autoSave) {
				this.saveToStorage().catch((error) =>
					console.error("Auto-save failed after removing palette:", error)
				);
			}
		},

		addColorToPalette(paletteId: string, color: string) {
			// Validate color before adding
			const colorValidation = validateColor(color);
			if (!colorValidation.valid) {
				console.error("Invalid color:", colorValidation.error);
				throw new Error(colorValidation.error);
			}

			const palette = state.palettes.find((p) => p.id === paletteId);
			if (palette && palette.colors.length < palette.maxSlots) {
				const prevState = [...state.palettes];
				palette.colors.push(color);

				const action = createUndoAction("palettes", "addColor", prevState, [...state.palettes]);
				pushUndoAction(action);

				// Auto-save after adding color (only if not clearing)
				if (!clearingInProgress && state.settings.autoSave) {
					this.saveToStorage().catch((error) =>
						console.error("Auto-save failed after adding color:", error)
					);
				}
			}
		},

		updatePaletteColor(paletteId: string, colorIndex: number, newColor: string) {
			const palette = state.palettes.find((p) => p.id === paletteId);
			if (palette && colorIndex >= 0 && colorIndex < palette.colors.length) {
				const prevState = [...state.palettes];
				palette.colors[colorIndex] = newColor;

				const action = createUndoAction("palettes", "updateColor", prevState, [...state.palettes]);
				pushUndoAction(action);

				// Auto-save after updating color (only if not clearing)
				if (!clearingInProgress && state.settings.autoSave) {
					this.saveToStorage().catch((error) =>
						console.error("Auto-save failed after updating color:", error)
					);
				}
			}
		},

		// Gradient actions
		addGradient(gradient: Omit<Gradient, "id" | "createdAt">) {
			const prevState = [...state.gradients];

			const newGradient: Gradient = {
				...gradient,
				id: crypto.randomUUID(),
				createdAt: new Date(),
			};

			state.gradients.push(newGradient);

			// Create undo action
			const undoAction = createUndoAction("gradients", "addGradient", prevState, [
				...state.gradients,
			]);
			pushUndoAction(undoAction);

			console.log("✅ Gradient added:", newGradient.name);

			// Auto-save changes
			this.saveToStorage().catch((error) => {
				console.error("Failed to auto-save after adding gradient:", error);
			});

			return newGradient.id;
		},

		updateGradient(id: string, updates: Partial<Gradient>) {
			const prevState = [...state.gradients];
			const index = state.gradients.findIndex((g) => g.id === id);
			if (index !== -1) {
				Object.assign(state.gradients[index], updates);

				// Create undo action
				const undoAction = createUndoAction("gradients", "updateGradient", prevState, [
					...state.gradients,
				]);
				pushUndoAction(undoAction);

				console.log("✅ Gradient updated:", id);

				// Auto-save changes
				this.saveToStorage().catch((error) => {
					console.error("Failed to auto-save after updating gradient:", error);
				});
			}
		},

		removeGradient(id: string) {
			const prevState = [...state.gradients];
			state.gradients = state.gradients.filter((g) => g.id !== id);

			// If this was the active gradient, clear it
			if (state.activeGradient === id) {
				state.activeGradient = null;
			}

			// Create undo action
			const undoAction = createUndoAction("gradients", "removeGradient", prevState, [
				...state.gradients,
			]);
			pushUndoAction(undoAction);

			console.log("✅ Gradient removed:", id);

			// Auto-save changes
			this.saveToStorage().catch((error) => {
				console.error("Failed to auto-save after removing gradient:", error);
			});
		},

		setActiveGradient(id: string | null) {
			state.activeGradient = id;
		},

		// Eyedropper and global color
		toggleEyedropper() {
			state.isEyedropperActive = !state.isEyedropperActive;
		},

		setGlobalColor(color: string) {
			state.globalColorBuffer = color;
		},

		clearGlobalColor() {
			state.globalColorBuffer = null;
		},

		// Settings
		async updateSettings(updates: Partial<AppSettings>) {
			console.log("⚙️ Updating settings:", updates);
			Object.assign(state.settings, updates);

			// Automatically save settings changes to storage
			try {
				const saved = await this.saveToStorage();
				console.log(`💾 Settings save result: ${saved ? "SUCCESS" : "FAILED"}`);
			} catch (error) {
				console.error("❌ Failed to save settings:", error);
			}
		},

		// Tutorial actions
		startTutorial(moduleId: string) {
			state.tutorialState.isActive = true;
			state.tutorialState.currentModule = moduleId;
			state.tutorialState.currentStep = 0;
		},

		nextTutorialStep() {
			state.tutorialState.currentStep++;
		},

		previousTutorialStep() {
			if (state.tutorialState.currentStep > 0) {
				state.tutorialState.currentStep--;
			}
		},

		completeTutorial(moduleId: string) {
			state.tutorialState.isActive = false;
			state.tutorialState.currentModule = null;
			state.tutorialState.currentStep = 0;
			if (!state.tutorialState.completedTutorials.includes(moduleId)) {
				state.tutorialState.completedTutorials.push(moduleId);
			}
		},

		exitTutorial() {
			state.tutorialState.isActive = false;
			state.tutorialState.currentModule = null;
			state.tutorialState.currentStep = 0;
		},

		toggleHints() {
			state.tutorialState.showHints = !state.tutorialState.showHints;
		},

		// Undo/Redo actions
		undo() {
			if (state.undoStack.length === 0) return;

			const action = state.undoStack.pop()!;
			state.redoStack.push(action);

			// Apply the previous state based on module
			switch (action.moduleId) {
				case "references":
					state.references = action.prevState;
					break;
				case "palettes":
					state.palettes = action.prevState;
					break;
				case "gradients":
					state.gradients = action.prevState;
					break;
			}
		},

		redo() {
			if (state.redoStack.length === 0) return;

			const action = state.redoStack.pop()!;
			state.undoStack.push(action);

			// Apply the next state based on module
			switch (action.moduleId) {
				case "references":
					state.references = action.nextState;
					break;
				case "palettes":
					state.palettes = action.nextState;
					break;
				case "gradients":
					state.gradients = action.nextState;
					break;
			}
		},

		clearUndoHistory() {
			state.undoStack = [];
			state.redoStack = [];
		},

		// Data persistence
		markSaved() {
			state.lastSaved = new Date();
		},

		async saveToStorage(): Promise<boolean> {
			try {
				console.log("💾 Starting save to storage...");
				console.log("💾 Current state to save:", {
					references: state.references.length,
					palettes: state.palettes.length,
					gradients: state.gradients.length,
					activePalette: state.activePalette,
					activeGradient: state.activeGradient,
					theme: state.settings.theme,
				});

				const success = await storageService.saveState(state);
				if (success) {
					this.markSaved();
					console.log("✅ Data saved successfully to storage");
				} else {
					console.error("❌ Failed to save data to storage");
				}
				return success;
			} catch (error) {
				console.error("❌ Error during save operation:", error);
				return false;
			}
		},

		async loadFromStorage(): Promise<boolean> {
			try {
				state.isLoading = true;
				console.log("📦 Starting data load from storage...");

				const loadedState = await storageService.loadState();

				// Check for immediate backup if main load fails
				if (!loadedState) {
					console.log("📦 No saved state found, checking for immediate backup...");

					try {
						const backupData = localStorage.getItem("phoenyxcolor-immediate-backup");
						if (backupData) {
							const backup = JSON.parse(backupData);
							console.log(
								"🆘 Found immediate backup with",
								backup.palettes?.length || 0,
								"palettes"
							);

							if (backup.palettes && backup.palettes.length > 0) {
								// Restore from backup
								state.palettes = backup.palettes.map((palette: any) => ({
									...palette,
									createdAt: new Date(palette.createdAt),
								}));
								console.log(
									"🆘 Restored from immediate backup:",
									state.palettes.length,
									"palettes"
								);
								this.markSaved();
								return true;
							}
						}
					} catch (backupError) {
						console.error("🆘 Failed to load backup:", backupError);
					}

					console.log("📦 No saved state or backup found");
					return false;
				}

				console.log("📦 Raw loaded state:", loadedState);

				// Simple merge - just assign arrays directly since simple storage already processes them
				if (loadedState.references) {
					state.references = loadedState.references;
				}
				if (loadedState.palettes) {
					state.palettes = loadedState.palettes;
				}
				if (loadedState.gradients) {
					state.gradients = loadedState.gradients;
				}
				if (loadedState.settings) {
					Object.assign(state.settings, loadedState.settings);
				}
				if (loadedState.activePalette !== undefined) {
					state.activePalette = loadedState.activePalette;
				}
				if (loadedState.activeGradient !== undefined) {
					state.activeGradient = loadedState.activeGradient;
				}
				if (loadedState.tutorialState) {
					Object.assign(state.tutorialState, loadedState.tutorialState);
				}

				console.log("📦 Final merged state:", {
					references: state.references.length,
					palettes: state.palettes.length,
					gradients: state.gradients.length,
					activePalette: state.activePalette,
					activeGradient: state.activeGradient,
					theme: state.settings.theme,
				});

				this.markSaved();
				console.log("✅ Data loaded successfully from storage");
				return true;
			} catch (error) {
				console.error("❌ Failed to load data from storage:", error);
				return false;
			} finally {
				state.isLoading = false;
			}
		},

		async exportData(): Promise<boolean> {
			return await persistenceService.exportData(state);
		},

		async importData(): Promise<boolean> {
			const importedState = await persistenceService.importData();
			if (importedState) {
				// Merge imported state with current state
				Object.assign(state, importedState);
				this.markSaved();
				return true;
			}
			return false;
		},

		startAutoSave() {
			if (state.settings.autoSave) {
				persistenceService.startAutoSave(
					() => this.saveToStorage(),
					state.settings.autoSaveInterval
				);
			}
		},

		stopAutoSave() {
			persistenceService.stopAutoSave();
		},

		// Debug functions for troubleshooting storage
		async debugStorage() {
			await persistenceService.debugStorage();
		},

		async testPersistence() {
			console.log("🧪 Testing persistence functionality...");

			// Save current state
			const currentPalettes = state.palettes.length;
			const currentReferences = state.references.length;

			console.log("🧪 Current state before test:", {
				palettes: currentPalettes,
				references: currentReferences,
			});

			// Save to storage
			const saveResult = await this.saveToStorage();
			console.log("🧪 Save result:", saveResult);

			// Try to load back
			const loadResult = await this.loadFromStorage();
			console.log("🧪 Load result:", loadResult);

			console.log("🧪 State after load test:", {
				palettes: state.palettes.length,
				references: state.references.length,
			});

			// Check if localforage is working
			try {
				const { default: localforage } = await import("localforage");
				const testKey = "phoenyxcolor-test-persist";
				const testData = { test: true, timestamp: Date.now() };

				await localforage.setItem(testKey, testData);
				const retrieved = await localforage.getItem(testKey);
				await localforage.removeItem(testKey);

				console.log("🧪 Direct localforage test:", {
					saved: testData,
					retrieved: retrieved,
					success: JSON.stringify(testData) === JSON.stringify(retrieved),
				});
			} catch (error) {
				console.error("🧪 Direct localforage test failed:", error);
			}

			return { saveResult, loadResult };
		},

		async nuclearClearStorage() {
			console.log("🧨 NUCLEAR CLEAR: Starting complete storage wipe...");

			// Set flag to prevent auto-save during clearing
			clearingInProgress = true;

			try {
				// Stop auto-save to prevent race conditions
				this.stopAutoSave();

				// Clear in-memory state first
				console.log("🧨 Clearing in-memory state...");
				state.references = [];
				state.palettes = [];
				state.gradients = [];
				state.activePalette = null;
				state.activeGradient = null;
				state.globalColorBuffer = null;
				state.undoStack = [];
				state.redoStack = [];

				// Clear both old and new storage systems
				console.log("🧨 Clearing simple storage...");
				const simpleCleared = await storageService.clearStorage();

				console.log("🧨 Clearing old persistence storage...");
				const persistenceCleared = await persistenceService.clearStorage();

				// Also try to clear localforage directly
				try {
					const { default: localforage } = await import("localforage");
					await localforage.clear();
					console.log("🧨 Cleared localforage");
				} catch (error) {
					console.warn("🧨 Could not clear localforage:", error);
				}

				console.log("🧨 Storage clear results:", {
					simple: simpleCleared,
					persistence: persistenceCleared,
				});

				if (simpleCleared || persistenceCleared) {
					this.markSaved();
					console.log("✅ NUCLEAR CLEAR: Complete storage wipe successful");
				} else {
					console.error("❌ NUCLEAR CLEAR: Storage clear failed");
				}

				// Restart auto-save if it was enabled
				if (state.settings.autoSave) {
					setTimeout(() => {
						this.startAutoSave();
						console.log("🔄 Auto-save restarted after nuclear clear");
					}, 1000); // Wait 1 second before restarting
				}

				return simpleCleared || persistenceCleared;
			} finally {
				// Always reset the clearing flag
				setTimeout(() => {
					clearingInProgress = false;
					console.log("🔓 Clearing flag reset");
				}, 2000); // Wait 2 seconds to ensure all operations complete
			}
		},

		// Clear all data
		async clearData() {
			console.log("Clearing all application data...");

			// Clear in-memory state
			state.references = [];
			state.palettes = [];
			state.gradients = [];
			state.activePalette = null;
			state.activeGradient = null;
			state.globalColorBuffer = null;
			state.undoStack = [];
			state.redoStack = [];

			console.log("In-memory state cleared");

			// Clear persistent storage
			const storageCleared = await persistenceService.clearStorage();

			if (storageCleared) {
				console.log("Storage cleared successfully");
				this.markSaved();
			} else {
				console.error("Failed to clear storage");
			}

			return storageCleared;
		},

		// Hard reset - clears everything and reloads page
		async hardReset() {
			console.log("🚨 HARD RESET: Clearing all data and reloading page...");

			try {
				await this.nuclearClearStorage();

				// Clear any remaining localStorage items
				const allKeys = Object.keys(localStorage);
				allKeys.forEach((key) => {
					if (key.includes("phoenyx") || key.includes("theme") || key.includes("daisy")) {
						localStorage.removeItem(key);
						console.log("🗑️ Hard reset removed:", key);
					}
				});

				// Force page reload after a short delay
				setTimeout(() => {
					console.log("🔄 Reloading page for clean state...");
					window.location.reload();
				}, 500);

				return true;
			} catch (error) {
				console.error("❌ Hard reset failed:", error);
				return false;
			}
		},
	};
}

export const appStore = createAppStore();

// Cross-tab synchronisation – reload state when another tab updates localStorage
if (typeof window !== "undefined") {
	window.addEventListener("storage", (e) => {
		if (e.key === "phoenyxcolor-simple-storage" && e.newValue !== e.oldValue) {
			console.log("🔄 Detected storage change from another tab – reloading state…");
			appStore.loadFromStorage();
		}
	});
}

// Make appStore globally accessible for debugging in development
if (typeof window !== "undefined" && import.meta.env.DEV) {
	(window as any).appStore = appStore;
	(window as any).debugStorage = () => appStore.debugStorage();
	(window as any).testPersistence = () => appStore.testPersistence();
	(window as any).nuclearClear = () => appStore.nuclearClearStorage();
	(window as any).hardReset = () => appStore.hardReset();
	console.log("🔧 Debug functions available:");
	console.log("  - appStore: Full access to app store");
	console.log("  - debugStorage(): Inspect storage contents");
	console.log("  - testPersistence(): Test save/load functionality");
	console.log("  - nuclearClear(): Clear ALL storage (nuclear option)");
	console.log("  - hardReset(): Nuclear clear + page reload (ultimate reset)");
}
