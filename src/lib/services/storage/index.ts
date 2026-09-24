import { LocalStorageAdapter } from "./adapter.local";
import { IndexedDBAdapter } from "./adapter.idb";

export const storage = {
	local: new LocalStorageAdapter(),
	db: new IndexedDBAdapter(),
};
