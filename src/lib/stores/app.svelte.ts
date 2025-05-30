// Core application state management using Svelte 5 runes
import { persistenceService } from "$lib/services/persistence";
import { validatePalette, validateGradient, validateColor } from "$lib/schemas/validation";

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
			const prevState = [...state.references];
			const newRef: ReferenceImage = {
				...ref,
				id: crypto.randomUUID(),
				createdAt: new Date(),
				thumbnailSrc: ref.thumbnailSrc || ref.src, // Fallback to full src if thumbnail not provided
			};
			state.references.push(newRef);

			const action = createUndoAction("references", "add", prevState, [...state.references]);
			pushUndoAction(action);
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
			}
		},

		// Palette actions
		addPalette(palette: Omit<ColorPalette, "id" | "createdAt">) {
			const prevState = [...state.palettes];
			const newPalette: ColorPalette = {
				...palette,
				id: crypto.randomUUID(),
				createdAt: new Date(),
			};

			// Validate palette data before adding
			const validation = validatePalette(newPalette);
			if (!validation.valid) {
				console.error("Invalid palette data:", validation.error);
				throw new Error(validation.error);
			}

			state.palettes.push(newPalette);
			state.activePalette = newPalette.id;

			const action = createUndoAction("palettes", "add", prevState, [...state.palettes]);
			pushUndoAction(action);
		},

		updatePalette(id: string, updates: Partial<ColorPalette>) {
			const index = state.palettes.findIndex((p) => p.id === id);
			if (index !== -1) {
				const prevState = [...state.palettes];
				Object.assign(state.palettes[index], updates);

				const action = createUndoAction("palettes", "update", prevState, [...state.palettes]);
				pushUndoAction(action);
			}
		},

		removePalette(id: string) {
			const index = state.palettes.findIndex((p) => p.id === id);
			if (index !== -1) {
				const prevState = [...state.palettes];
				state.palettes.splice(index, 1);
				if (state.activePalette === id) {
					state.activePalette = state.palettes[0]?.id || null;
				}

				const action = createUndoAction("palettes", "remove", prevState, [...state.palettes]);
				pushUndoAction(action);
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
			}
		},

		updatePaletteColor(paletteId: string, colorIndex: number, newColor: string) {
			const palette = state.palettes.find((p) => p.id === paletteId);
			if (palette && colorIndex >= 0 && colorIndex < palette.colors.length) {
				const prevState = [...state.palettes];
				palette.colors[colorIndex] = newColor;

				const action = createUndoAction("palettes", "updateColor", prevState, [...state.palettes]);
				pushUndoAction(action);
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

			// Validate gradient data before adding
			const validation = validateGradient(newGradient);
			if (!validation.valid) {
				console.error("Invalid gradient data:", validation.error);
				throw new Error(validation.error);
			}

			state.gradients.push(newGradient);
			state.activeGradient = newGradient.id;

			const action = createUndoAction("gradients", "add", prevState, [...state.gradients]);
			pushUndoAction(action);
		},

		updateGradient(id: string, updates: Partial<Gradient>) {
			const index = state.gradients.findIndex((g) => g.id === id);
			if (index !== -1) {
				const prevState = [...state.gradients];
				Object.assign(state.gradients[index], updates);

				const action = createUndoAction("gradients", "update", prevState, [...state.gradients]);
				pushUndoAction(action);
			}
		},

		removeGradient(id: string) {
			const index = state.gradients.findIndex((g) => g.id === id);
			if (index !== -1) {
				const prevState = [...state.gradients];
				state.gradients.splice(index, 1);
				if (state.activeGradient === id) {
					state.activeGradient = state.gradients[0]?.id || null;
				}

				const action = createUndoAction("gradients", "remove", prevState, [...state.gradients]);
				pushUndoAction(action);
			}
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
		updateSettings(updates: Partial<AppSettings>) {
			Object.assign(state.settings, updates);
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
			const success = await persistenceService.saveState(state);
			if (success) {
				this.markSaved();
			}
			return success;
		},

		async loadFromStorage(): Promise<boolean> {
			const loadedState = await persistenceService.loadState();
			if (loadedState) {
				// Merge loaded state with current state
				Object.assign(state, loadedState);
				this.markSaved();
				return true;
			}
			return false;
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

		async nuclearClearStorage() {
			const cleared = await persistenceService.nuclearClearStorage();
			if (cleared) {
				// Also clear in-memory state
				state.references = [];
				state.palettes = [];
				state.gradients = [];
				state.activePalette = null;
				state.activeGradient = null;
				state.globalColorBuffer = null;
				state.undoStack = [];
				state.redoStack = [];
				this.markSaved();
			}
			return cleared;
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
	};
}

export const appStore = createAppStore();

// Make appStore globally accessible for debugging in development
if (typeof window !== 'undefined' && import.meta.env.DEV) {
	(window as any).appStore = appStore;
	(window as any).debugStorage = () => appStore.debugStorage();
	(window as any).nuclearClear = () => appStore.nuclearClearStorage();
	console.log("🔧 Debug functions available:");
	console.log("  - appStore: Full access to app store");
	console.log("  - debugStorage(): Inspect storage contents");
	console.log("  - nuclearClear(): Clear ALL storage (nuclear option)");
}
