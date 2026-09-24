import type { z } from "zod";
import { browser } from "$app/environment";

/** Local storage adapter implementation */
export class LocalStorageAdapter {
	/** Read `key` and parse it with `schema`. Null when absent, unreadable, or invalid. */
	async get<TSchema extends z.ZodType>(
		key: string,
		schema: TSchema
	): Promise<z.infer<TSchema> | null> {
		if (!browser) return null;
		try {
			const item = localStorage.getItem(key);
			if (!item) return null;
			const parsed = schema.safeParse(JSON.parse(item));
			if (parsed.success) return parsed.data;
			console.warn(`LocalStorage value for "${key}" failed validation; ignoring it.`);
			return null;
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

	async clear(): Promise<void> {
		if (!browser) return;
		localStorage.clear();
	}
}
