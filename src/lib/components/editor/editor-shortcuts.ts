/**
 * The editor's keyboard map. One table drives the key handler, the toolbar and header tooltips,
 * and the shortcuts dialog, so they cannot drift apart.
 */

export const EDITOR_TOOLS = [
	{ id: "adjust", label: "Adjust", icon: "material-symbols:tune" },
	{ id: "presets", label: "Presets", icon: "material-symbols:filter-vintage" },
	{ id: "crop", label: "Crop", icon: "material-symbols:crop-rotate" },
	{ id: "effects", label: "Effects", icon: "material-symbols:auto-fix-high" },
	{ id: "draw", label: "Draw", icon: "material-symbols:draw" },
	{ id: "layers", label: "Layers", icon: "material-symbols:layers" },
	{ id: "palette", label: "Palette", icon: "material-symbols:palette" },
	{ id: "export", label: "Export", icon: "material-symbols:download" },
] as const;

export type EditorTool = (typeof EDITOR_TOOLS)[number]["id"];

export type EditorAction =
	| `tool:${EditorTool}`
	| "undo"
	| "redo"
	| "openExport"
	| "zoomIn"
	| "zoomOut"
	| "actualSize"
	| "fit"
	| "compare"
	| "rotateLeft"
	| "rotateRight"
	| "flipX"
	| "flipY";

/** `mod` is Ctrl, or ⌘ on macOS. `shift` left out means either. */
interface KeyCombo {
	key: string;
	mod?: boolean;
	shift?: boolean;
}

interface Shortcut {
	action: EditorAction;
	label: string;
	combos: KeyCombo[];
}

/** Keys the dialog lists that are handled elsewhere (crop nudging, Esc). Display only. */
interface ShortcutNote {
	label: string;
	keys: string;
}

const TOOL_KEYS = {
	adjust: "a",
	presets: "f",
	crop: "c",
	effects: "e",
	draw: "d",
	layers: "l",
	palette: "p",
	export: "x",
} satisfies Record<EditorTool, string>;

const TOOL_SHORTCUTS: Shortcut[] = EDITOR_TOOLS.map((tool) => ({
	action: `tool:${tool.id}`,
	label: tool.label,
	combos: [{ key: TOOL_KEYS[tool.id] }],
}));

const EDIT_SHORTCUTS: Shortcut[] = [
	{ action: "undo", label: "Undo", combos: [{ key: "z", mod: true, shift: false }] },
	{
		action: "redo",
		label: "Redo",
		combos: [
			{ key: "z", mod: true, shift: true },
			{ key: "y", mod: true },
		],
	},
	{ action: "openExport", label: "Export", combos: [{ key: "s", mod: true }] },
	{ action: "compare", label: "Compare (hold)", combos: [{ key: " " }] },
];

const VIEW_SHORTCUTS: Shortcut[] = [
	{ action: "fit", label: "Fit", combos: [{ key: "r" }] },
	{ action: "actualSize", label: "100%", combos: [{ key: "0", mod: true }] },
	{
		action: "zoomIn",
		label: "Zoom in",
		combos: [
			{ key: "=", mod: true },
			{ key: "+", mod: true },
		],
	},
	{ action: "zoomOut", label: "Zoom out", combos: [{ key: "-", mod: true }] },
];

const TRANSFORM_SHORTCUTS: Shortcut[] = [
	{ action: "rotateLeft", label: "Rotate left", combos: [{ key: "[" }] },
	{ action: "rotateRight", label: "Rotate right", combos: [{ key: "]" }] },
	{ action: "flipX", label: "Flip horizontal", combos: [{ key: "h" }] },
	{ action: "flipY", label: "Flip vertical", combos: [{ key: "v" }] },
];

const SHORTCUTS = [...TOOL_SHORTCUTS, ...EDIT_SHORTCUTS, ...VIEW_SHORTCUTS, ...TRANSFORM_SHORTCUTS];

function comboLabel(combo: KeyCombo): string {
	const key = combo.key === " " ? "Space" : combo.key.toUpperCase();
	return [combo.mod && "Ctrl", combo.shift && "Shift", key].filter(Boolean).join("+");
}

function keysLabel(shortcut: Shortcut): string {
	return shortcut.combos.map(comboLabel).join(" / ");
}

/** "Undo (Ctrl+Z)": the label with its first key, for tooltips. */
export function shortcutHint(action: EditorAction): string {
	const shortcut = SHORTCUTS.find((candidate) => candidate.action === action);
	if (!shortcut) throw new Error(`No shortcut for "${action}".`);
	const [first] = shortcut.combos;
	return first ? `${shortcut.label} (${comboLabel(first)})` : shortcut.label;
}

export const SHORTCUT_GROUPS: { title: string; entries: ShortcutNote[] }[] = [
	{ title: "Tools", entries: TOOL_SHORTCUTS.map((s) => ({ label: s.label, keys: keysLabel(s) })) },
	{ title: "Edit", entries: EDIT_SHORTCUTS.map((s) => ({ label: s.label, keys: keysLabel(s) })) },
	{ title: "View", entries: VIEW_SHORTCUTS.map((s) => ({ label: s.label, keys: keysLabel(s) })) },
	{
		title: "Transform",
		entries: TRANSFORM_SHORTCUTS.map((s) => ({ label: s.label, keys: keysLabel(s) })),
	},
	{
		title: "Crop",
		entries: [
			{ label: "Move 1 px", keys: "Arrows" },
			{ label: "Move 10 px", keys: "Shift+Arrows" },
			{ label: "Resize", keys: "Alt+Arrows" },
		],
	},
	{ title: "General", entries: [{ label: "Close dialog, crop or panel", keys: "Esc" }] },
];

function matchesCombo(event: KeyboardEvent, combo: KeyCombo): boolean {
	if (event.key.toLowerCase() !== combo.key) return false;
	if ((event.ctrlKey || event.metaKey) !== (combo.mod ?? false)) return false;
	if (event.altKey) return false;
	return combo.shift === undefined || combo.shift === event.shiftKey;
}

/** The action a key press triggers, if any. */
export function shortcutAction(event: KeyboardEvent): EditorAction | null {
	return (
		SHORTCUTS.find((shortcut) => shortcut.combos.some((combo) => matchesCombo(event, combo)))
			?.action ?? null
	);
}

const NON_TEXT_INPUT_TYPES = new Set(["range", "checkbox", "radio", "button", "color", "file"]);

/** Typing into this element must not trigger shortcuts (letters, arrows, Ctrl+Z belong to it). */
export function isTextEntryTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	if (target.isContentEditable) return true;
	if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
	return target instanceof HTMLInputElement && !NON_TEXT_INPUT_TYPES.has(target.type);
}

/** Space presses this element (a button, a checkbox), so it must not also hold-compare. */
export function isSpaceActivated(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	return (
		target instanceof HTMLButtonElement ||
		target instanceof HTMLAnchorElement ||
		target.tagName === "SUMMARY" ||
		(target instanceof HTMLInputElement && (target.type === "checkbox" || target.type === "radio"))
	);
}

export type EscapeTarget = "crop" | "panel" | "editor";

/** What Esc closes: the innermost open thing first. The shortcuts dialog handles its own Esc. */
export function escapeTarget(state: {
	isCropping: boolean;
	activeTool: EditorTool | null;
}): EscapeTarget {
	if (state.isCropping) return "crop";
	if (state.activeTool) return "panel";
	return "editor";
}
