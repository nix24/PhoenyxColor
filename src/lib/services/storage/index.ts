import { localStorageAdapter } from "./adapter.local";
import { IndexedDBAdapter } from "./adapter.idb";

export const storage = {
	local: localStorageAdapter,
	db: new IndexedDBAdapter(),
};
