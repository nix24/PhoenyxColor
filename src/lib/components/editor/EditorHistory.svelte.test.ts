import { describe, expect, test } from "vitest";
import { EditorHistoryService } from "./EditorHistory.svelte";

describe("EditorHistoryService", () => {
	test("undoes and redoes crop, rotation, and filter changes", () => {
		const history = new EditorHistoryService();
		history.initialize({ rotation: 0, isGrayscale: false, cropRect: null });

		history.pushState({ rotation: 90 });
		history.pushState({ isGrayscale: true });
		history.pushState({ cropRect: { x: 10, y: 20, width: 120, height: 80 } });

		expect(history.undo()).toMatchObject({ rotation: 90, isGrayscale: true, cropRect: null });
		expect(history.undo()).toMatchObject({ rotation: 90, isGrayscale: false, cropRect: null });
		expect(history.redo()).toMatchObject({ rotation: 90, isGrayscale: true, cropRect: null });
	});
});
