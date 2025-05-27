import { appStore } from '$lib/stores/app.svelte';
import { toast } from 'svelte-sonner';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: string;
  description: string;
  handler: () => void;
}

class KeyboardShortcutsService {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private isListening = false;

  constructor() {
    this.initializeDefaultShortcuts();
  }

  private initializeDefaultShortcuts() {
    // Global shortcuts
    this.registerShortcut({
      key: 'KeyE',
      action: 'toggle-eyedropper',
      description: 'Toggle global eyedropper tool',
      handler: () => {
        appStore.toggleEyedropper();
        toast.info('Eyedropper toggled');
      }
    });

    this.registerShortcut({
      key: 'KeyS',
      ctrlKey: true,
      action: 'save',
      description: 'Save current work',
      handler: () => {
        appStore.saveToStorage();
        toast.success('Work saved');
      }
    });

    this.registerShortcut({
      key: 'KeyZ',
      ctrlKey: true,
      action: 'undo',
      description: 'Undo last action',
      handler: () => {
        if (appStore.canUndo) {
          appStore.undo();
          toast.info('Action undone');
        } else {
          toast.warning('Nothing to undo');
        }
      }
    });

    this.registerShortcut({
      key: 'KeyY',
      ctrlKey: true,
      action: 'redo',
      description: 'Redo last undone action',
      handler: () => {
        if (appStore.canRedo) {
          appStore.redo();
          toast.info('Action redone');
        } else {
          toast.warning('Nothing to redo');
        }
      }
    });

    this.registerShortcut({
      key: 'KeyN',
      ctrlKey: true,
      action: 'new-palette',
      description: 'Create new palette',
      handler: () => {
        appStore.setActiveModule('palettes');
        // This would trigger the new palette dialog
        // For now, just switch to palettes module
        toast.info('Switched to palettes - press New Palette button');
      }
    });

    this.registerShortcut({
      key: 'KeyX',
      ctrlKey: true,
      action: 'export',
      description: 'Export current work',
      handler: () => {
        appStore.exportData();
        toast.info('Export initiated');
      }
    });

    // Module switching shortcuts
    this.registerShortcut({
      key: 'Digit1',
      ctrlKey: true,
      action: 'switch-references',
      description: 'Switch to References module',
      handler: () => {
        appStore.setActiveModule('references');
        toast.info('Switched to References');
      }
    });

    this.registerShortcut({
      key: 'Digit2',
      ctrlKey: true,
      action: 'switch-palettes',
      description: 'Switch to Palettes module',
      handler: () => {
        appStore.setActiveModule('palettes');
        toast.info('Switched to Palettes');
      }
    });

    this.registerShortcut({
      key: 'Digit3',
      ctrlKey: true,
      action: 'switch-gradients',
      description: 'Switch to Gradients module',
      handler: () => {
        appStore.setActiveModule('gradients');
        toast.info('Switched to Gradients');
      }
    });

    // Clear global color buffer
    this.registerShortcut({
      key: 'Escape',
      action: 'clear-global-color',
      description: 'Clear global color buffer',
      handler: () => {
        if (appStore.state.globalColorBuffer) {
          appStore.clearGlobalColor();
          toast.info('Global color cleared');
        }
      }
    });

    // Help/shortcuts display
    this.registerShortcut({
      key: 'F1',
      action: 'show-help',
      description: 'Show keyboard shortcuts help',
      handler: () => {
        this.showShortcutsHelp();
      }
    });
  }

  registerShortcut(shortcut: KeyboardShortcut) {
    const key = this.getShortcutKey(shortcut);
    this.shortcuts.set(key, shortcut);
  }

  unregisterShortcut(action: string) {
    for (const [key, shortcut] of this.shortcuts.entries()) {
      if (shortcut.action === action) {
        this.shortcuts.delete(key);
        break;
      }
    }
  }

  private getShortcutKey(shortcut: KeyboardShortcut): string {
    const parts = [];
    if (shortcut.ctrlKey) parts.push('ctrl');
    if (shortcut.shiftKey) parts.push('shift');
    if (shortcut.altKey) parts.push('alt');
    if (shortcut.metaKey) parts.push('meta');
    parts.push(shortcut.key.toLowerCase());
    return parts.join('+');
  }

  private getEventKey(event: KeyboardEvent): string {
    const parts = [];
    if (event.ctrlKey) parts.push('ctrl');
    if (event.shiftKey) parts.push('shift');
    if (event.altKey) parts.push('alt');
    if (event.metaKey) parts.push('meta');
    parts.push(event.code.toLowerCase());
    return parts.join('+');
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const eventKey = this.getEventKey(event);
    const shortcut = this.shortcuts.get(eventKey);

    if (shortcut) {
      event.preventDefault();
      event.stopPropagation();
      shortcut.handler();
    }
  };

  startListening() {
    if (!this.isListening) {
      document.addEventListener('keydown', this.handleKeyDown);
      this.isListening = true;
    }
  }

  stopListening() {
    if (this.isListening) {
      document.removeEventListener('keydown', this.handleKeyDown);
      this.isListening = false;
    }
  }

  getAllShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  getShortcutByAction(action: string): KeyboardShortcut | undefined {
    return Array.from(this.shortcuts.values()).find(s => s.action === action);
  }

  updateShortcut(action: string, newKey: string, modifiers: {
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
  } = {}) {
    const existingShortcut = this.getShortcutByAction(action);
    if (existingShortcut) {
      // Remove old shortcut
      this.unregisterShortcut(action);
      
      // Add new shortcut with updated key
      this.registerShortcut({
        ...existingShortcut,
        key: newKey,
        ...modifiers
      });
    }
  }

  showShortcutsHelp() {
    // This would show a modal with all available shortcuts
    // For now, just log them to console and show a toast
    console.table(this.getAllShortcuts().map(s => ({
      Action: s.description,
      Shortcut: this.formatShortcutDisplay(s)
    })));
    
    toast.info('Keyboard shortcuts logged to console (F12 → Console)');
  }

  private formatShortcutDisplay(shortcut: KeyboardShortcut): string {
    const parts = [];
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.shiftKey) parts.push('Shift');
    if (shortcut.altKey) parts.push('Alt');
    if (shortcut.metaKey) parts.push('Cmd');
    
    // Convert key code to display name
    let keyName = shortcut.key;
    if (keyName.startsWith('Key')) {
      keyName = keyName.substring(3);
    } else if (keyName.startsWith('Digit')) {
      keyName = keyName.substring(5);
    }
    
    parts.push(keyName);
    return parts.join(' + ');
  }

  // Method to export shortcuts for settings
  exportShortcuts(): Record<string, string> {
    const exported: Record<string, string> = {};
    for (const shortcut of this.shortcuts.values()) {
      exported[shortcut.action] = this.formatShortcutDisplay(shortcut);
    }
    return exported;
  }

  // Method to import shortcuts from settings
  importShortcuts(shortcuts: Record<string, string>) {
    // This would parse the shortcuts and update the registered shortcuts
    // Implementation would depend on the exact format needed
    console.log('Importing shortcuts:', shortcuts);
  }
}

// Create singleton instance
export const keyboardShortcuts = new KeyboardShortcutsService(); 