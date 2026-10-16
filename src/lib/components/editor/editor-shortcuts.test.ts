import { describe, expect, test } from "vite-plus/test";
import {
	EDITOR_TOOLS,
	SHORTCUT_GROUPS,
	escapeTarget,
	isSpaceActivated,
	isTextEntryTarget,
	shortcutAction,
	shortcutHint,
} from "./editor-shortcuts";

function key(init: KeyboardEventInit): KeyboardEvent {
	return new KeyboardEvent("keydown", init);
}

function input(type: string): HTMLInputElement {
	const element = document.createElement("input");
	element.type = type;
	return element;
}

describe("editor shortcuts", () => {
	test("undo and both redo spellings", () => {
		expect(shortcutAction(key({ key: "z", ctrlKey: true }))).toBe("undo");
		expect(shortcutAction(key({ key: "Z", ctrlKey: true, shiftKey: true }))).toBe("redo");
		expect(shortcutAction(key({ key: "y", metaKey: true }))).toBe("redo");
	});

	test("a plain letter opens its tool; with Ctrl or Alt it does nothing", () => {
		expect(shortcutAction(key({ key: "d" }))).toBe("tool:draw");
		expect(shortcutAction(key({ key: "d", ctrlKey: true }))).toBeNull();
		expect(shortcutAction(key({ key: "d", altKey: true }))).toBeNull();
	});

	test("every tool has its own key and appears in the dialog", () => {
		const tools = SHORTCUT_GROUPS.find((group) => group.title === "Tools")?.entries ?? [];
		expect(tools.map((entry) => entry.label)).toEqual(EDITOR_TOOLS.map((tool) => tool.label));
		expect(new Set(tools.map((entry) => entry.keys)).size).toBe(EDITOR_TOOLS.length);
	});

	test("tooltips read from the same map as the dialog", () => {
		expect(shortcutHint("redo")).toBe("Redo (Ctrl+Shift+Z)");
		const edit = SHORTCUT_GROUPS.find((group) => group.title === "Edit")?.entries ?? [];
		expect(edit.find((entry) => entry.label === "Redo")?.keys).toBe("Ctrl+Shift+Z / Ctrl+Y");
	});

	test("sliders and buttons keep shortcuts working; text fields do not", () => {
		expect(isTextEntryTarget(input("range"))).toBe(false);
		expect(isTextEntryTarget(document.createElement("button"))).toBe(false);
		expect(isTextEntryTarget(input("text"))).toBe(true);
		expect(isTextEntryTarget(input("number"))).toBe(true);
		expect(isTextEntryTarget(document.createElement("select"))).toBe(true);
	});

	test("Space on a focused button presses it instead of comparing", () => {
		expect(isSpaceActivated(document.createElement("button"))).toBe(true);
		expect(isSpaceActivated(input("range"))).toBe(false);
	});

	test("Esc closes the innermost thing first", () => {
		expect(escapeTarget({ isCropping: true, activeTool: "crop" })).toBe("crop");
		expect(escapeTarget({ isCropping: false, activeTool: "adjust" })).toBe("panel");
		expect(escapeTarget({ isCropping: false, activeTool: null })).toBe("editor");
	});
});
