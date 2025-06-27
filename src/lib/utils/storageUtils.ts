import { browser } from "$app/environment";

/**
 * Safely stringify and persist a value to localStorage.
 * Returns true if the write succeeded.
 */
export function safeSet<T>(key: string, value: T): boolean {
	if (!browser) return false;
	try {
		localStorage.setItem(key, JSON.stringify(value));
		return true;
	} catch (error) {
		console.error(`safeSet failed for ${key}:`, error);
		return false;
	}
}

/**
 * Safely read and parse a JSON value from localStorage.
 * Returns null if the key is missing or if parsing fails.
 */
export function safeGet<T>(key: string): T | null {
	if (!browser) return null;
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return null;
		return JSON.parse(raw) as T;
	} catch (error) {
		console.warn(`safeGet parse failed for ${key}:`, error);
		return null;
	}
}

/**
 * Remove an item from localStorage, ignoring errors.
 */
export function safeRemove(key: string): void {
	if (!browser) return;
	try {
		localStorage.removeItem(key);
	} catch (error) {
		console.warn(`safeRemove failed for ${key}:`, error);
	}
}
