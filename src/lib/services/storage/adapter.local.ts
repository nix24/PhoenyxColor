import type { StorageAdapter } from "./adapter.interface";
import { browser } from "$app/environment";

/** Local storage adapter implementation */
export class LocalStorageAdapter implements StorageAdapter {
    async get<T>(key: string): Promise<T | null> {
        if (!browser) return null;
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error(`LocalStorage get error for key "${key}":`, error);
            return null;
        }
    }

    async set<T>(key: string, value: T): Promise<void> {
        if (!browser) return;
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error(`LocalStorage set error for key "${key}":`, error);
            throw error; // Propagate error (e.g., QuotaExceeded)
        }
    }

    async remove(key: string): Promise<void> {
        if (!browser) return;
        localStorage.removeItem(key);
    }

    async clear(): Promise<void> {
        if (!browser) return;
        localStorage.clear();
    }
}
