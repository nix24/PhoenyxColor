/**
 * Editor History Service for local undo/redo functionality
 * Manages a stack of image adjustment states within the editor session
 */

export type QuickEffectType =
    | "none"
    | "posterize"
    | "pixelate"
    | "solarize"
    | "duotone"
    | "halftone"
    | "vhs"
    | "glitch"
    | "emboss"
    | "sharpen";

export interface AppliedEffect {
    type: QuickEffectType;
    intensity: number;
    duotoneColors?: [string, string];
}

export interface ImageEditorState {
    // Basic adjustments
    brightness: number;
    contrast: number;
    saturation: number;
    hueRotate: number;
    blur: number;
    opacity: number;
    sepia: number;
    invert: number;
    isGrayscale: boolean;

    // Enhanced adjustments
    shadows: number;
    highlights: number;
    vibrance: number;
    temperature: number;
    tint: number;
    clarity: number;
    vignette: number;

    // Transform
    scale: number;
    rotation: number;
    flipX: boolean;
    flipY: boolean;

    // Gradient map
    gradientMapOpacity: number;
    gradientMapBlendMode: string;

    // Crop (if applied)
    cropRect: { x: number; y: number; width: number; height: number } | null;

    // Curves (stored as control points)
    curves: {
        rgb: Array<{ x: number; y: number }>;
        red: Array<{ x: number; y: number }>;
        green: Array<{ x: number; y: number }>;
        blue: Array<{ x: number; y: number }>;
    };

    // Effects (stackable)
    appliedEffects: AppliedEffect[];
}

export const DEFAULT_EDITOR_STATE: ImageEditorState = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hueRotate: 0,
    blur: 0,
    opacity: 1,
    sepia: 0,
    invert: 0,
    isGrayscale: false,
    shadows: 0,
    highlights: 0,
    vibrance: 0,
    temperature: 0,
    tint: 0,
    clarity: 0,
    vignette: 0,
    scale: 1,
    rotation: 0,
    flipX: false,
    flipY: false,
    gradientMapOpacity: 0,
    gradientMapBlendMode: "normal",
    cropRect: null,
    curves: {
        rgb: [
            { x: 0, y: 0 },
            { x: 255, y: 255 },
        ],
        red: [
            { x: 0, y: 0 },
            { x: 255, y: 255 },
        ],
        green: [
            { x: 0, y: 0 },
            { x: 255, y: 255 },
        ],
        blue: [
            { x: 0, y: 0 },
            { x: 255, y: 255 },
        ],
    },
    appliedEffects: [],
};

const MAX_HISTORY_SIZE = 50;

export class EditorHistoryService {
    private undoStack = $state<ImageEditorState[]>([]);
    private redoStack = $state<ImageEditorState[]>([]);
    currentState = $state<ImageEditorState>({ ...DEFAULT_EDITOR_STATE });

    canUndo = $derived(this.undoStack.length > 0);
    canRedo = $derived(this.redoStack.length > 0);
    historyCount = $derived(this.undoStack.length);

    /**
     * Initialize with a state (typically from stored image properties)
     */
    initialize(initialState: Partial<ImageEditorState>) {
        this.currentState = { ...DEFAULT_EDITOR_STATE, ...initialState };
        this.undoStack = [];
        this.redoStack = [];
    }

    /**
     * Push a new state onto the history stack
     */
    pushState(newState: Partial<ImageEditorState>) {
        // Save current state to undo stack
        this.undoStack = [...this.undoStack, { ...this.currentState }];

        // Limit history size
        if (this.undoStack.length > MAX_HISTORY_SIZE) {
            this.undoStack = this.undoStack.slice(-MAX_HISTORY_SIZE);
        }

        // Clear redo stack on new action
        this.redoStack = [];

        // Apply new state
        this.currentState = { ...this.currentState, ...newState };
    }

    /**
     * Update current state without pushing to history (for live preview during drag)
     */
    updateWithoutHistory(newState: Partial<ImageEditorState>) {
        this.currentState = { ...this.currentState, ...newState };
    }

    /**
     * Undo the last action
     */
    undo(): ImageEditorState | null {
        if (this.undoStack.length === 0) return null;

        const previousState = this.undoStack[this.undoStack.length - 1];
        if (!previousState) return null;

        this.undoStack = this.undoStack.slice(0, -1);
        this.redoStack = [...this.redoStack, { ...this.currentState }];
        this.currentState = { ...DEFAULT_EDITOR_STATE, ...previousState };

        return this.currentState;
    }

    /**
     * Redo the last undone action
     */
    redo(): ImageEditorState | null {
        if (this.redoStack.length === 0) return null;

        const nextState = this.redoStack[this.redoStack.length - 1];
        if (!nextState) return null;

        this.redoStack = this.redoStack.slice(0, -1);
        this.undoStack = [...this.undoStack, { ...this.currentState }];
        this.currentState = { ...DEFAULT_EDITOR_STATE, ...nextState };

        return this.currentState;
    }

    /**
     * Reset to default state
     */
    reset() {
        this.pushState({ ...DEFAULT_EDITOR_STATE });
    }

    /**
     * Get a snapshot of the current state
     */
    getSnapshot(): ImageEditorState {
        return { ...this.currentState };
    }
}

/**
 * Create a new history service instance for an editor session
 */
export function createEditorHistory(): EditorHistoryService {
    return new EditorHistoryService();
}

/**
 * Merge partial state with defaults to create a complete state
 */
export function mergeWithDefaults(partial: Partial<ImageEditorState>): ImageEditorState {
    return { ...DEFAULT_EDITOR_STATE, ...partial };
}

