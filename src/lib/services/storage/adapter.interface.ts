/** Interface for a storage adapter which provides a simple key-value store for application data*/
export interface StorageAdapter {
    /** Retrieves a value from the storage adapter */
    get<T>(key: string): Promise<T | null>;
    /** Sets a value in the storage adapter */
    set<T>(key: string, value: T): Promise<void>;
    /** Removes a value from the storage adapter */
    remove(key: string): Promise<void>;
    /** Clears all values from the storage adapter */
    clear(): Promise<void>;
}
