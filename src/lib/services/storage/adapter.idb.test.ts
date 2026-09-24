import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { IndexedDBAdapter } from "./adapter.idb";
import { StoredRecordSchemas } from "$lib/schemas/validation";

const ItemSchema = z.object({ id: z.string(), size: z.number() });

describe("IndexedDBAdapter.getCollection", () => {
	it("keeps valid records and quarantines invalid ones once", async () => {
		const adapter = new IndexedDBAdapter();
		await adapter.clear();
		await adapter.set("items", [
			{ id: "a", size: 1 },
			{ id: "b", size: "huge" },
			{ id: "c", size: 3 },
		]);

		const first = await adapter.getCollection("items", ItemSchema);
		expect(first.records.map((item) => item.id)).toEqual(["a", "c"]);
		expect(first.invalidCount).toBe(1);

		// A second load before any save must not duplicate the quarantined entry.
		await adapter.getCollection("items", ItemSchema);
		const quarantine = await adapter.getCollection(
			"items_quarantine",
			z.looseObject({ id: z.string() })
		);
		expect(quarantine.records).toEqual([{ id: "b", size: "huge" }]);
	});

	it("returns an empty collection for a missing key", async () => {
		const adapter = new IndexedDBAdapter();
		await adapter.clear();
		expect(await adapter.getCollection("missing", ItemSchema)).toEqual({
			records: [],
			invalidCount: 0,
		});
	});

	it("repairs gradients with unusable stops instead of dropping them", async () => {
		const adapter = new IndexedDBAdapter();
		await adapter.clear();
		await adapter.set("phoenyx_gradients", [
			{
				id: "0b8e6f7e-7c3f-4f0e-9d7a-8b2f7c1a2b3c",
				name: "Broken",
				type: "linear",
				stops: [{ color: "#ff0000", position: 0 }],
				createdAt: "2024-01-01T00:00:00.000Z",
			},
		]);
		const { records, invalidCount } = await adapter.getCollection(
			"phoenyx_gradients",
			StoredRecordSchemas.gradients
		);
		expect(invalidCount).toBe(0);
		expect(records[0]?.stops).toHaveLength(2);
		expect(records[0]?.createdAt).toBeInstanceOf(Date);
	});
});
