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

function snapshotStoreState<T>(state: T): T {
	return $state.snapshot(state) as T;
}

export function recordCollectionUpdate<T>(
	current: T[],
	index: number,
	updates: Partial<T>,
	applyUpdates: () => void,
	setState: (state: T[]) => void,
	save: () => void,
	history: HistoryStore<T[]>,
	label: string,
): void {
	const previousState = snapshotStoreState(current);
	const nextState = previousState.map((item, itemIndex) =>
		itemIndex === index ? { ...item, ...updates } : item,
	);
	applyUpdates();
	save();
	history.push({
		label,
		undo: () => {
			setState(previousState);
			save();
		},
		redo: () => {
			setState(nextState);
			save();
		},
	});
}
// fallow-ignore-file unused-class-member
