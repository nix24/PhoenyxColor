import { appStore } from "$lib/stores/app.svelte";
import { goto } from "$app/navigation";
import { toast } from "svelte-sonner";

export interface ShortcutAction {
	key: string;
	ctrlKey?: boolean;
	shiftKey?: boolean;
	altKey?: boolean;
	action: () => void;
	description: string;
	category: "navigation" | "editing" | "tools" | "export";
}

class KeyboardShortcutsService {
	private shortcuts: ShortcutAction[] = [];
	private isListening = false;

	constructor() {
		this.initializeDefaultShortcuts();
	}

	private initializeDefaultShortcuts() {
		this.shortcuts = [
			// Navigation shortcuts
			{
				key: "1",
				ctrlKey: true,
				action: () => goto("/references"),
				description: "Switch to References",
				category: "navigation",
			},
			{
				key: "2",
				ctrlKey: true,
				action: () => goto("/palettes"),
				description: "Switch to Palettes",
				category: "navigation",
			},
			{
				key: "3",
				ctrlKey: true,
				action: () => goto("/gradients"),
				description: "Switch to Gradients",
				category: "navigation",
			},
			{
				key: "4",
				ctrlKey: true,
				action: () => goto("/settings"),
				description: "Switch to Settings",
				category: "navigation",
			},
			{
				key: "h",
				ctrlKey: true,
				action: () => goto("/tutorials"),
				description: "Open Help/Tutorials",
				category: "navigation",
			},

			// Tool shortcuts
			{
				key: "e",
				ctrlKey: true,
				action: () => appStore.toggleEyedropper(),
				description: "Toggle Eyedropper",
				category: "tools",
			},

			// Editing shortcuts
			{
				key: "z",
				ctrlKey: true,
				action: () => appStore.undo(),
				description: "Undo",
				category: "editing",
			},
			{
				key: "y",
				ctrlKey: true,
				action: () => appStore.redo(),
				description: "Redo",
				category: "editing",
			},
			{
				key: "z",
				ctrlKey: true,
				shiftKey: true,
				action: () => appStore.redo(),
				description: "Redo (Alt)",
				category: "editing",
			},

			// Export shortcuts
			{
				key: "s",
				ctrlKey: true,
				action: () => appStore.saveToStorage(),
				description: "Save",
				category: "export",
			},
			{
				key: "e",
				ctrlKey: true,
				shiftKey: true,
				action: () => appStore.exportData(),
				description: "Export Data",
				category: "export",
			},
		];
	}

	registerShortcut(shortcut: ShortcutAction) {
		this.shortcuts.push(shortcut);
	}

	unregisterShortcut(action: string) {
		this.shortcuts = this.shortcuts.filter((s) => s.action.toString() !== action);
	}

	private getShortcutKey(shortcut: ShortcutAction): string {
		const parts = [];
		if (shortcut.ctrlKey) parts.push("ctrl");
		if (shortcut.shiftKey) parts.push("shift");
		if (shortcut.altKey) parts.push("alt");
		parts.push(shortcut.key.toLowerCase());
		return parts.join("+");
	}

	private getEventKey(event: KeyboardEvent): string {
		const parts = [];
		if (event.ctrlKey) parts.push("ctrl");
		if (event.shiftKey) parts.push("shift");
		if (event.altKey) parts.push("alt");
		parts.push(event.key.toLowerCase());
		return parts.join("+");
	}

	private handleKeyDown = (event: KeyboardEvent) => {
		// Don't trigger shortcuts when typing in inputs
		const target = event.target as HTMLElement;
		if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
			return;
		}

		const eventKey = this.getEventKey(event);
		const shortcut = this.shortcuts.find((s) => this.getShortcutKey(s) === eventKey);

		if (shortcut) {
			event.preventDefault();
			event.stopPropagation();
			shortcut.action();
		}
	};

	startListening() {
		if (!this.isListening) {
			document.addEventListener("keydown", this.handleKeyDown);
			this.isListening = true;
		}
	}

	stopListening() {
		if (this.isListening) {
			document.removeEventListener("keydown", this.handleKeyDown);
			this.isListening = false;
		}
	}

	getAllShortcuts(): ShortcutAction[] {
		return this.shortcuts;
	}

	getShortcutByAction(action: string): ShortcutAction | undefined {
		return this.shortcuts.find((s) => s.action.toString() === action);
	}

	updateShortcut(
		action: string,
		newKey: string,
		modifiers: {
			ctrlKey?: boolean;
			shiftKey?: boolean;
			altKey?: boolean;
		} = {}
	) {
		const existingShortcut = this.getShortcutByAction(action);
		if (existingShortcut) {
			// Remove old shortcut
			this.unregisterShortcut(action);

			// Add new shortcut with updated key
			this.registerShortcut({
				...existingShortcut,
				key: newKey,
				...modifiers,
			});
		}
	}

	showShortcutsHelp() {
		// This would show a modal with all available shortcuts
		// For now, just log them to console and show a toast
		console.table(
			this.getAllShortcuts().map((s) => ({
				Action: s.description,
				Shortcut: this.formatShortcutDisplay(s),
			}))
		);

		toast.info("Keyboard shortcuts logged to console (F12 → Console)");
	}

	private formatShortcutDisplay(shortcut: ShortcutAction): string {
		const parts = [];
		if (shortcut.ctrlKey) parts.push("Ctrl");
		if (shortcut.shiftKey) parts.push("Shift");
		if (shortcut.altKey) parts.push("Alt");

		// Convert key to display name
		const keyName = shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key;
		parts.push(keyName);

		return parts.join(" + ");
	}

	// Method to export shortcuts for settings
	exportShortcuts(): Record<string, string> {
		const exported: Record<string, string> = {};
		for (const shortcut of this.shortcuts) {
			exported[shortcut.action.toString()] = this.formatShortcutDisplay(shortcut);
		}
		return exported;
	}

	// Method to import shortcuts from settings
	importShortcuts(shortcuts: Record<string, string>) {
		// This would parse the shortcuts and update the registered shortcuts
		// Implementation would depend on the exact format needed
		console.log("Importing shortcuts:", shortcuts);
	}
}

// Create singleton instance
export const keyboardShortcuts = new KeyboardShortcutsService();
