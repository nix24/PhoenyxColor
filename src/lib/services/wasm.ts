import { browser } from "$app/environment";

// Define the shape of our WASM exports
interface WasmExports {
    memory: WebAssembly.Memory;
    alloc: (len: number) => number;
    dealloc: (ptr: number, len: number) => void;

    // Image Adjustments
    applyTemperature: (ptr: number, len: number, temp: number) => void;
    applyTint: (ptr: number, len: number, tint: number) => void;
    applyShadowsHighlights: (ptr: number, len: number, shadows: number, highlights: number) => void;
    applyVibrance: (ptr: number, len: number, vibrance: number) => void;

    // Effects
    applyPosterize: (ptr: number, len: number, intensity: number) => void;
    applySolarize: (ptr: number, len: number, intensity: number) => void;
    applyDuotone: (ptr: number, len: number, intensity: number, dr: number, dg: number, db: number, lr: number, lg: number, lb: number) => void;
    applyPixelate: (ptr: number, width: number, height: number, intensity: number) => void;

    // Clustering
    runKMeans: (imgPtr: number, len: number, k: number, iterations: number, seed: number) => number;
}

class WasmService {
    private instance: WebAssembly.Instance | null = null;
    private memory: WebAssembly.Memory | null = null;
    private loadingPromise: Promise<void> | null = null;

    async init() {
        if (this.instance) return;
        if (this.loadingPromise) return this.loadingPromise;

        this.loadingPromise = (async () => {
            if (!browser) return;

            try {
                const response = await fetch("/phoenyx-color.wasm");
                if (!response.ok) throw new Error("Failed to load WASM module");

                const buffer = await response.arrayBuffer();
                const module = await WebAssembly.instantiate(buffer, {
                    env: {
                        // Add any imported functions here if main.zig requires them
                        // print: (ptr: number, len: number) => console.log(...)
                    }
                });

                this.instance = module.instance;
                this.memory = this.instance.exports.memory as WebAssembly.Memory;

                console.log("PhoenyxColor WASM initialized successfully");
            } catch (err) {
                console.error("Failed to initialize WASM:", err);
                throw err;
            }
        })();

        return this.loadingPromise;
    }

    private get exports(): WasmExports {
        if (!this.instance) throw new Error("WASM not initialized");
        return this.instance.exports as unknown as WasmExports;
    }

    // --- Helpers ---

    private alloc(len: number): number {
        const ptr = this.exports.alloc(len);
        if (ptr === 0) throw new Error("WASM allocation failed (OOM)");
        return ptr;
    }

    private dealloc(ptr: number, len: number) {
        this.exports.dealloc(ptr, len);
    }

    // Process a canvas-like Uint8ClampedArray in place
    processImage(
        data: Uint8ClampedArray | Uint8Array,
        width: number,
        height: number,
        operation: (ptr: number, len: number) => void
    ) {
        if (!this.instance) throw new Error("WASM not loaded");

        const len = data.length;
        const ptr = this.alloc(len);

        try {
            // Copy data to WASM memory
            const heap = new Uint8Array(this.memory!.buffer);
            heap.set(data, ptr);

            // Run operation
            operation(ptr, len);

            // Copy back
            // Accessing buffer again because WASM might have grown memory (detached buffer)
            const newHeap = new Uint8Array(this.memory!.buffer);
            const resultSlice = newHeap.subarray(ptr, ptr + len);
            data.set(resultSlice);

        } finally {
            this.dealloc(ptr, len);
        }
    }

    // --- Public API ---

    applyTemperature(data: Uint8ClampedArray, width: number, height: number, temp: number) {
        this.processImage(data, width, height, (ptr, len) => {
            this.exports.applyTemperature(ptr, len, temp);
        });
    }

    applyTint(data: Uint8ClampedArray, width: number, height: number, tint: number) {
        this.processImage(data, width, height, (ptr, len) => {
            this.exports.applyTint(ptr, len, tint);
        });
    }

    applyShadowsHighlights(data: Uint8ClampedArray, width: number, height: number, shadows: number, highlights: number) {
        this.processImage(data, width, height, (ptr, len) => {
            this.exports.applyShadowsHighlights(ptr, len, shadows, highlights);
        });
    }

    applyVibrance(data: Uint8ClampedArray, width: number, height: number, vibrance: number) {
        this.processImage(data, width, height, (ptr, len) => {
            this.exports.applyVibrance(ptr, len, vibrance);
        });
    }

    applyPosterize(data: Uint8ClampedArray, width: number, height: number, intensity: number) {
        this.processImage(data, width, height, (ptr, len) => {
            this.exports.applyPosterize(ptr, len, intensity);
        });
    }

    applySolarize(data: Uint8ClampedArray, width: number, height: number, intensity: number) {
        this.processImage(data, width, height, (ptr, len) => {
            this.exports.applySolarize(ptr, len, intensity);
        });
    }

    applyDuotone(data: Uint8ClampedArray, width: number, height: number, intensity: number, dark: { r: number, g: number, b: number }, light: { r: number, g: number, b: number }) {
        this.processImage(data, width, height, (ptr, len) => {
            this.exports.applyDuotone(ptr, len, intensity, dark.r, dark.g, dark.b, light.r, light.g, light.b);
        });
    }

    applyPixelate(data: Uint8ClampedArray, width: number, height: number, intensity: number) {
        // Pixelate needs width/height
        if (!this.instance) throw new Error("WASM not loaded");
        const len = data.length;
        const ptr = this.alloc(len);

        try {
            const heap = new Uint8Array(this.memory!.buffer);
            heap.set(data, ptr);

            this.exports.applyPixelate(ptr, width, height, intensity);

            const newHeap = new Uint8Array(this.memory!.buffer);
            data.set(newHeap.subarray(ptr, ptr + len));
        } finally {
            this.dealloc(ptr, len);
        }
    }

    // --- K-Means ---

    runKMeans(data: Uint8ClampedArray, k: number, iterations: number = 10): { l: number, a: number, b: number }[] {
        if (!this.instance) throw new Error("WASM not loaded");

        const len = data.length;
        const imgPtr = this.alloc(len);
        let resultPtr = 0;

        try {
            // Copy image
            const heap = new Uint8Array(this.memory!.buffer);
            heap.set(data, imgPtr);

            // Run
            const seed = Date.now() & 0xFFFFFFFF;
            resultPtr = this.exports.runKMeans(imgPtr, len, k, iterations, seed);

            if (resultPtr === 0) throw new Error("WASM K-Means failed");

            // Read results
            // Output is [l, a, b, l, a, b...] floats (f32)
            // Memory view must be DataView or Float32Array
            const resultHeap = new Float32Array(this.memory!.buffer);
            // resultPtr is byte offset. Float32Array index = byte offset / 4.
            const startIdx = resultPtr / 4;
            const floatCount = k * 3;

            const results: { l: number, a: number, b: number }[] = [];
            for (let i = 0; i < k; i++) {
                results.push({
                    l: resultHeap[startIdx + i * 3] ?? 0,
                    a: resultHeap[startIdx + i * 3 + 1] ?? 0,
                    b: resultHeap[startIdx + i * 3 + 2] ?? 0
                });
            }

            return results;

        } finally {
            this.dealloc(imgPtr, len);
            if (resultPtr !== 0) {
                // Free result buffer (k * 3 * 4 bytes)
                this.dealloc(resultPtr, k * 3 * 4);
            }
        }
    }
}

export const wasm = new WasmService();
