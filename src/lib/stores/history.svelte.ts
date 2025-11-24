export interface HistoryAction<T> {
    undo: (state: T) => void;
    redo: (state: T) => void;
    label: string;
}

export class HistoryStore<T> {
    undoStack: HistoryAction<T>[] = $state([]);
    redoStack: HistoryAction<T>[] = $state([]);
    maxSize: number;

    constructor(maxSize = 50) {
        this.maxSize = maxSize;
    }

    get canUndo() {
        return this.undoStack.length > 0;
    }

    get canRedo() {
        return this.redoStack.length > 0;
    }

    push(action: HistoryAction<T>) {
        this.undoStack.push(action);
        if (this.undoStack.length > this.maxSize) {
            this.undoStack.shift();
        }
        this.redoStack = []; // Clear redo stack on new action
    }

    undo(state: T) {
        const action = this.undoStack.pop();
        if (action) {
            action.undo(state);
            this.redoStack.push(action);
        }
    }

    redo(state: T) {
        const action = this.redoStack.pop();
        if (action) {
            action.redo(state);
            this.undoStack.push(action);
        }
    }

    clear() {
        this.undoStack = [];
        this.redoStack = [];
    }
}
