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
}

// Create singleton instance
export const keyboardShortcuts = new KeyboardShortcutsService();
