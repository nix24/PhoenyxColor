import type { AppState } from '$lib/stores/app.svelte';
import { toast } from 'svelte-sonner';

const STORAGE_KEY = 'phoenyxcolor-app-state';
const STORAGE_VERSION = '1.0';

export interface StorageData {
    version: string;
    timestamp: string;
    state: Partial<AppState>;
}

export class PersistenceService {
    private static instance: PersistenceService;
    private autoSaveInterval: number | null = null;

    static getInstance(): PersistenceService {
        if (!PersistenceService.instance) {
            PersistenceService.instance = new PersistenceService();
        }
        return PersistenceService.instance;
    }

    /**
     * Save application state to localStorage
     */
    async saveState(state: AppState): Promise<boolean> {
        try {
            // Only save persistent data, exclude runtime state
            const persistentState: Partial<AppState> = {
                references: state.references,
                referenceBoards: state.referenceBoards,
                activeReferenceBoard: state.activeReferenceBoard,
                palettes: state.palettes,
                gradients: state.gradients,
                activePalette: state.activePalette,
                activeGradient: state.activeGradient,
                settings: state.settings,
                tutorialState: {
                    ...state.tutorialState,
                    isActive: false, // Don't persist active tutorial state
                    currentStep: 0,
                    currentModule: null
                }
            };

            const storageData: StorageData = {
                version: STORAGE_VERSION,
                timestamp: new Date().toISOString(),
                state: persistentState
            };

            const serialized = JSON.stringify(storageData);
            
            // Check if data exceeds localStorage limit (usually ~5MB)
            if (serialized.length > 5 * 1024 * 1024) {
                console.warn('Data size exceeds recommended localStorage limit');
                toast.warning('Large amount of data detected. Consider exporting your work.');
            }

            localStorage.setItem(STORAGE_KEY, serialized);
            return true;
        } catch (error) {
            console.error('Failed to save state to localStorage:', error);
            
            if (error instanceof DOMException && error.code === 22) {
                toast.error('Storage quota exceeded. Please clear some data or export your work.');
            } else {
                toast.error('Failed to save application state');
            }
            return false;
        }
    }

    /**
     * Load application state from localStorage
     */
    async loadState(): Promise<Partial<AppState> | null> {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) {
                return null;
            }

            const storageData: StorageData = JSON.parse(stored);
            
            // Version compatibility check
            if (storageData.version !== STORAGE_VERSION) {
                console.warn(`Storage version mismatch. Expected ${STORAGE_VERSION}, got ${storageData.version}`);
                // Could implement migration logic here in the future
            }

            // Validate and sanitize loaded data
            const validatedState = this.validateAndSanitizeState(storageData.state);
            
            if (validatedState) {
                toast.success('Application data loaded successfully');
                return validatedState;
            } else {
                toast.warning('Some application data could not be loaded');
                return null;
            }
        } catch (error) {
            console.error('Failed to load state from localStorage:', error);
            toast.error('Failed to load saved application data');
            return null;
        }
    }

    /**
     * Clear all stored data
     */
    async clearStorage(): Promise<boolean> {
        try {
            localStorage.removeItem(STORAGE_KEY);
            toast.success('All stored data cleared');
            return true;
        } catch (error) {
            console.error('Failed to clear storage:', error);
            toast.error('Failed to clear stored data');
            return false;
        }
    }

    /**
     * Export application data as JSON file
     */
    async exportData(state: AppState): Promise<boolean> {
        try {
            const exportData = {
                version: STORAGE_VERSION,
                exportedAt: new Date().toISOString(),
                application: 'PhoenyxColor',
                data: {
                    references: state.references,
                    referenceBoards: state.referenceBoards,
                    palettes: state.palettes,
                    gradients: state.gradients,
                    settings: state.settings
                }
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `phoenyxcolor-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success('Data exported successfully');
            return true;
        } catch (error) {
            console.error('Failed to export data:', error);
            toast.error('Failed to export application data');
            return false;
        }
    }

    /**
     * Import application data from JSON file
     */
    async importData(): Promise<Partial<AppState> | null> {
        return new Promise((resolve) => {
            try {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';

                input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) {
                        resolve(null);
                        return;
                    }

                    try {
                        const text = await file.text();
                        const importData = JSON.parse(text);

                        // Validate import data structure
                        if (!importData.data || !importData.version) {
                            toast.error('Invalid import file format');
                            resolve(null);
                            return;
                        }

                        const validatedState = this.validateAndSanitizeState(importData.data);
                        if (validatedState) {
                            toast.success('Data imported successfully');
                            resolve(validatedState);
                        } else {
                            toast.error('Import data validation failed');
                            resolve(null);
                        }
                    } catch (error) {
                        console.error('Failed to parse import file:', error);
                        toast.error('Failed to parse import file');
                        resolve(null);
                    }
                };

                input.click();
            } catch (error) {
                console.error('Failed to import data:', error);
                toast.error('Failed to import data');
                resolve(null);
            }
        });
    }

    /**
     * Start auto-save functionality
     */
    startAutoSave(saveCallback: () => void, intervalMinutes: number = 5): void {
        this.stopAutoSave(); // Clear any existing interval
        
        this.autoSaveInterval = window.setInterval(() => {
            saveCallback();
        }, intervalMinutes * 60 * 1000);
    }

    /**
     * Stop auto-save functionality
     */
    stopAutoSave(): void {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    /**
     * Get storage usage information
     */
    getStorageInfo(): { used: number; available: number; percentage: number } {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            const usedBytes = stored ? new Blob([stored]).size : 0;
            const availableBytes = 5 * 1024 * 1024; // Approximate localStorage limit
            const percentage = (usedBytes / availableBytes) * 100;

            return {
                used: usedBytes,
                available: availableBytes,
                percentage: Math.round(percentage * 100) / 100
            };
        } catch (error) {
            console.error('Failed to get storage info:', error);
            return { used: 0, available: 0, percentage: 0 };
        }
    }

    /**
     * Validate and sanitize loaded state data
     */
    private validateAndSanitizeState(state: any): Partial<AppState> | null {
        try {
            const sanitized: Partial<AppState> = {};

            // Validate references array
            if (Array.isArray(state.references)) {
                sanitized.references = state.references.filter((ref: any) => 
                    ref && typeof ref.id === 'string' && typeof ref.src === 'string'
                );
            }

            // Validate reference boards array
            if (Array.isArray(state.referenceBoards)) {
                sanitized.referenceBoards = state.referenceBoards.filter((board: any) =>
                    board && typeof board.id === 'string' && typeof board.name === 'string'
                );
            }

            // Validate palettes array
            if (Array.isArray(state.palettes)) {
                sanitized.palettes = state.palettes.filter((palette: any) =>
                    palette && typeof palette.id === 'string' && Array.isArray(palette.colors)
                );
            }

            // Validate gradients array
            if (Array.isArray(state.gradients)) {
                sanitized.gradients = state.gradients.filter((gradient: any) =>
                    gradient && typeof gradient.id === 'string' && Array.isArray(gradient.stops)
                );
            }

            // Validate settings object
            if (state.settings && typeof state.settings === 'object') {
                sanitized.settings = {
                    theme: state.settings.theme || 'light',
                    defaultPaletteSlots: Number(state.settings.defaultPaletteSlots) || 5,
                    alwaysOnTop: Boolean(state.settings.alwaysOnTop),
                    enableAnimations: Boolean(state.settings.enableAnimations),
                    globalEyedropperEnabled: Boolean(state.settings.globalEyedropperEnabled),
                    referenceBoardSavePath: state.settings.referenceBoardSavePath || null,
                    exportPreferences: state.settings.exportPreferences || {
                        defaultPngResolution: 1920,
                        defaultSvgSize: { width: 800, height: 600 },
                        compressionLevel: 80
                    },
                    keyboardShortcuts: state.settings.keyboardShortcuts || {},
                    autoSave: Boolean(state.settings.autoSave),
                    autoSaveInterval: Number(state.settings.autoSaveInterval) || 5
                };
            }

            // Validate tutorial state
            if (state.tutorialState && typeof state.tutorialState === 'object') {
                sanitized.tutorialState = {
                    isActive: false, // Always start with tutorials inactive
                    currentStep: 0,
                    currentModule: null,
                    completedTutorials: Array.isArray(state.tutorialState.completedTutorials) 
                        ? state.tutorialState.completedTutorials 
                        : [],
                    showHints: Boolean(state.tutorialState.showHints)
                };
            }

            // Validate active IDs
            if (typeof state.activePalette === 'string') {
                sanitized.activePalette = state.activePalette;
            }
            if (typeof state.activeGradient === 'string') {
                sanitized.activeGradient = state.activeGradient;
            }
            if (typeof state.activeReferenceBoard === 'string') {
                sanitized.activeReferenceBoard = state.activeReferenceBoard;
            }

            return sanitized;
        } catch (error) {
            console.error('Failed to validate state:', error);
            return null;
        }
    }
}

// Export singleton instance
export const persistenceService = PersistenceService.getInstance(); 