import { storage } from "$lib/services/storage";
import { HistoryStore } from "./history.svelte";

export interface ReferenceImage {
    id: string;
    src: string; // Base64 or Blob URL
    thumbnailSrc?: string;
    name: string;
    position: { x: number; y: number };
    scale: number;
    rotation: number;
    opacity: number;
    isGrayscale: boolean;
    brightness?: number;
    contrast?: number;
    saturation?: number;
    hueRotate?: number;
    blur?: number;
    sepia?: number;
    invert?: number;
    flipX?: boolean;
    flipY?: boolean;
    createdAt: Date;
}

export class ReferenceStore {
    references = $state<ReferenceImage[]>([]);
    history = new HistoryStore<ReferenceImage[]>();

    private STORAGE_KEY = "phoenyx_references";

    constructor() {
        this.load();
    }

    async load() {
        const saved = await storage.db.get<ReferenceImage[]>(this.STORAGE_KEY);
        if (saved) {
            this.references = saved.map(r => ({
                ...r,
                createdAt: new Date(r.createdAt)
            }));
        }
    }

    async save() {
        // In a real massive app, we might want to store images separately in IDB as Blobs
        // and only keep metadata here. For now, we store the whole array in IDB which is 
        // much better than LocalStorage.
        await storage.db.set(this.STORAGE_KEY, $state.snapshot(this.references));
    }

    add(ref: Omit<ReferenceImage, "id" | "createdAt">) {
        const newRef: ReferenceImage = {
            ...ref,
            id: crypto.randomUUID(),
            createdAt: new Date(),
        };

        const prevState = $state.snapshot(this.references);
        this.references.push(newRef);
        this.save();

        this.history.push({
            label: "Add Reference",
            undo: () => {
                this.references = prevState;
                this.save();
            },
            redo: () => {
                this.references = [...prevState, newRef];
                this.save();
            }
        });
    }

    remove(id: string) {
        const index = this.references.findIndex(r => r.id === id);
        if (index === -1) return;

        const prevState = $state.snapshot(this.references);
        this.references.splice(index, 1);
        this.save();

        this.history.push({
            label: "Remove Reference",
            undo: () => {
                this.references = prevState;
                this.save();
            },
            redo: () => {
                const nextState = [...prevState];
                nextState.splice(index, 1);
                this.references = nextState;
                this.save();
            }
        });
    }

    update(id: string, updates: Partial<ReferenceImage>) {
        const index = this.references.findIndex(r => r.id === id);
        if (index === -1) return;

        const prevState = $state.snapshot(this.references);
        Object.assign(this.references[index], updates);
        this.save();

        this.history.push({
            label: "Update Reference",
            undo: () => {
                this.references = prevState;
                this.save();
            },
            redo: () => {
                // We can't just re-apply updates because we need the full state snapshot
                // But since we modified the state in place above, we can just snapshot it now
                const nextState = $state.snapshot(this.references);
                this.references = nextState;
                this.save();
            }
        });
    }
}
