import { describe, expect, it } from "vitest";
import { History } from "./history.svelte";

type Recipe = { exposure: number; tags: string[] };

const initial: Recipe = { exposure: 0, tags: [] };

describe("History", () => {
	it("records one entry per commit and undoes/redoes it", () => {
		const history = new History(initial);
		history.commit("Exposure", { exposure: 1, tags: [] });
		expect(history.present.exposure).toBe(1);
		expect(history.undoLabel).toBe("Exposure");

		history.undo();
		expect(history.present.exposure).toBe(0);
		expect(history.canUndo).toBe(false);
		expect(history.redoLabel).toBe("Exposure");

		history.redo();
		expect(history.present.exposure).toBe(1);
		expect(history.canRedo).toBe(false);
	});

	it("coalesces a preview gesture into a single entry", () => {
		const history = new History(initial);
		for (const exposure of [0.1, 0.2, 0.3, 0.4]) history.preview({ exposure, tags: [] });
		expect(history.isPreviewing).toBe(true);
		expect(history.canUndo).toBe(false);

		history.commit("Exposure");
		expect(history.isPreviewing).toBe(false);
		expect(history.present.exposure).toBe(0.4);

		history.undo();
		expect(history.present.exposure).toBe(0);
		expect(history.canUndo).toBe(false);
	});

	it("cancelPreview restores the committed state without an entry", () => {
		const history = new History(initial);
		history.preview({ exposure: 2, tags: [] });
		history.cancelPreview();
		expect(history.present.exposure).toBe(0);
		expect(history.canUndo).toBe(false);
	});

	it("undo during a preview discards the preview first", () => {
		const history = new History(initial);
		history.commit("A", { exposure: 1, tags: [] });
		history.preview({ exposure: 5, tags: [] });
		history.undo();
		expect(history.present.exposure).toBe(0);
		history.redo();
		expect(history.present.exposure).toBe(1);
	});

	it("clears redo on a new commit", () => {
		const history = new History(initial);
		history.commit("A", { exposure: 1, tags: [] });
		history.undo();
		history.commit("B", { exposure: 2, tags: [] });
		expect(history.canRedo).toBe(false);
	});

	it("caps the number of entries, dropping the oldest", () => {
		const history = new History(initial, 3);
		for (let exposure = 1; exposure <= 5; exposure++) {
			history.commit(`step ${exposure}`, { exposure, tags: [] });
		}
		let undos = 0;
		while (history.canUndo) {
			history.undo();
			undos++;
		}
		expect(undos).toBe(3);
		expect(history.present.exposure).toBe(2);
	});

	it("never aliases caller objects or stored snapshots", () => {
		const history = new History(initial);
		const next: Recipe = { exposure: 1, tags: ["a"] };
		history.commit("A", next);
		next.tags.push("mutated after commit");
		expect(history.present.tags).toEqual(["a"]);

		history.commit("B", { exposure: 2, tags: ["b"] });
		// Live edits to the restored state must not leak into the stored snapshots.
		history.undo();
		history.present.tags.push("live edit");
		history.undo();
		expect(history.present.tags).toEqual([]);
		history.redo();
		expect(history.present.tags).toEqual(["a", "live edit"]);
		history.redo();
		expect(history.present.tags).toEqual(["b"]);
	});

	it("reset replaces state and clears both stacks", () => {
		const history = new History(initial);
		history.commit("A", { exposure: 1, tags: [] });
		history.undo();
		history.reset({ exposure: 9, tags: [] });
		expect(history.present.exposure).toBe(9);
		expect(history.canUndo).toBe(false);
		expect(history.canRedo).toBe(false);
	});
});
