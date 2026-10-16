import { describe, expect, it } from "vite-plus/test";
import { openDatabase } from "$lib/core/storage";
import { pngFromRows } from "./engine/fixtures";
import { describeImage } from "./image-description";
import { ReferenceLibrary } from "./library.svelte";
import { renderThumbnail } from "./thumbnail";

// Real IndexedDB: in the browser, library items are $state proxies, which it cannot clone.
describe("ReferenceLibrary in the browser", () => {
	it("restores a deleted reference and keeps it after a reload", async () => {
		const db = await openDatabase(`library-test-${crypto.randomUUID()}`);
		const dependencies = { database: async () => db, describeImage, renderThumbnail };
		const library = new ReferenceLibrary(dependencies);
		await library.whenReady();
		const image = await pngFromRows([[[10, 20, 30, 255]]]);
		const { reference } = await library.importImage(new File([image], "dot.png"));

		const removed = await library.remove(reference.id);
		if (!removed) throw new Error("nothing removed");
		await library.restore(removed);

		const reloaded = new ReferenceLibrary(dependencies);
		await reloaded.whenReady();
		expect(reloaded.items.map((item) => item.reference)).toEqual([reference]);
		db.close();
	});
});
