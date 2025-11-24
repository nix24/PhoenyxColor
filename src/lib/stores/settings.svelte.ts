import { storage } from "$lib/services/storage";

export interface AppSettings {
    theme: "light" | "dark" | "system";
    defaultPaletteSlots: number;
    alwaysOnTop: boolean;
    enableAnimations: boolean;
    globalEyedropperEnabled: boolean;
    referenceBoardSavePath: string | null;
    workspace: {
        showGrid: boolean;
        snapToGrid: boolean;
        gridSize: number;
        showRulers: boolean;
    };
    exportPreferences: {
        defaultFormat: "png" | "jpeg" | "webp" | "svg";
        defaultScale: number;
        includeBackground: boolean;
        defaultPngResolution: number; // Keeping for backward compatibility if needed, or remove if unused
        defaultSvgSize: { width: number; height: number };
        compressionLevel: number;
    };
    autoSave: boolean;
    autoSaveInterval: number; // minutes
}

const DEFAULT_SETTINGS: AppSettings = {
    theme: "system",
    defaultPaletteSlots: 5,
    alwaysOnTop: false,
    enableAnimations: true,
    globalEyedropperEnabled: false,
    referenceBoardSavePath: null,
    workspace: {
        showGrid: true,
        snapToGrid: false,
        gridSize: 20,
        showRulers: true,
    },
    exportPreferences: {
        defaultFormat: "png",
        defaultScale: 1,
        includeBackground: true,
        defaultPngResolution: 1920,
        defaultSvgSize: { width: 800, height: 600 },
        compressionLevel: 80,
    },
    autoSave: true,
    autoSaveInterval: 5,
};

export class SettingsStore {
    state = $state<AppSettings>(DEFAULT_SETTINGS);
    private STORAGE_KEY = "phoenyx_settings";

    constructor() {
        this.load();
    }

    async load() {
        const saved = await storage.local.get<AppSettings>(this.STORAGE_KEY);
        if (saved) {
            // Merge with defaults to handle new settings in future versions
            this.state = { ...DEFAULT_SETTINGS, ...saved };
        }
    }

    async save() {
        await storage.local.set(this.STORAGE_KEY, $state.snapshot(this.state));
    }

    update(updates: Partial<AppSettings>) {
        Object.assign(this.state, updates);
        this.save();
    }

    // Specific actions
    setTheme(theme: AppSettings["theme"]) {
        this.update({ theme });
    }
}
