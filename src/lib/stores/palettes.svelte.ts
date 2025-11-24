import { storage } from "$lib/services/storage";
import { HistoryStore } from "./history.svelte";
import { validatePalette, validateColor } from "$lib/schemas/validation"; // Assuming these exist from previous code

export interface ColorPalette {
    id: string;
    name: string;
    colors: string[];
    maxSlots: number;
    createdAt: Date;
    tags: string[];
}

export class PaletteStore {
    palettes = $state<ColorPalette[]>([]);
    activePaletteId = $state<string | null>(null);
    history = new HistoryStore<ColorPalette[]>();

    private STORAGE_KEY = "phoenyx_palettes";

    constructor() {
        this.load();
    }

    get activePalette() {
        return this.activePaletteId ? this.palettes.find(p => p.id === this.activePaletteId) : null;
    }

    async load() {
        const saved = await storage.db.get<ColorPalette[]>(this.STORAGE_KEY);
        if (saved) {
            // Hydrate dates
            this.palettes = saved.map(p => ({
                ...p,
                createdAt: new Date(p.createdAt)
            }));
        }
    }

    async save() {
        await storage.db.set(this.STORAGE_KEY, $state.snapshot(this.palettes));
    }

    // Actions
    add(palette: Omit<ColorPalette, "id" | "createdAt">) {
        const newPalette: ColorPalette = {
            ...palette,
            id: crypto.randomUUID(),
            createdAt: new Date(),
        };

        // Validation could go here

        const prevState = $state.snapshot(this.palettes);
        this.palettes.push(newPalette);
        this.save();

        this.history.push({
            label: "Add Palette",
            undo: () => {
                this.palettes = prevState;
                this.save();
            },
            redo: () => {
                this.palettes = [...prevState, newPalette];
                this.save();
            }
        });

        return newPalette.id;
    }

    remove(id: string) {
        const index = this.palettes.findIndex(p => p.id === id);
        if (index === -1) return;

        const prevState = $state.snapshot(this.palettes);
        this.palettes.splice(index, 1);

        if (this.activePaletteId === id) {
            this.activePaletteId = null;
        }

        this.save();

        this.history.push({
            label: "Remove Palette",
            undo: () => {
                this.palettes = prevState;
                this.save();
            },
            redo: () => {
                const nextState = [...prevState];
                nextState.splice(index, 1);
                this.palettes = nextState;
                this.save();
            }
        });
    }

    update(id: string, updates: Partial<ColorPalette>) {
        const index = this.palettes.findIndex(p => p.id === id);
        if (index === -1) return;

        const prevState = $state.snapshot(this.palettes);
        Object.assign(this.palettes[index], updates);
        this.save();

        this.history.push({
            label: "Update Palette",
            undo: () => {
                this.palettes = prevState;
                this.save();
            },
            redo: () => {
                const nextState = $state.snapshot(this.palettes); // Current state is the redo state
                this.palettes = nextState;
                this.save();
            }
        });
    }

    setActive(id: string | null) {
        this.activePaletteId = id;
    }

    addColor(paletteId: string, color: string) {
        const palette = this.palettes.find(p => p.id === paletteId);
        if (!palette) return;

        if (palette.colors.length >= palette.maxSlots) return;

        const newColors = [...palette.colors, color];
        this.update(paletteId, { colors: newColors });
    }

    removeColor(paletteId: string, colorIndex: number) {
        const palette = this.palettes.find(p => p.id === paletteId);
        if (!palette) return;

        if (colorIndex < 0 || colorIndex >= palette.colors.length) return;

        const newColors = [...palette.colors];
        newColors.splice(colorIndex, 1);
        this.update(paletteId, { colors: newColors });
    }

    updateColor(paletteId: string, colorIndex: number, newColor: string) {
        const palette = this.palettes.find(p => p.id === paletteId);
        if (!palette) return;

        if (colorIndex < 0 || colorIndex >= palette.colors.length) return;

        const newColors = [...palette.colors];
        newColors[colorIndex] = newColor;
        this.update(paletteId, { colors: newColors });
    }
}
