/**
 * Snapshot undo/redo for one piece of document state (e.g. an image's edit recipe).
 *
 * Live gestures call `preview` as often as they like; only `commit` records an entry, so a whole
 * slider drag undoes in one step. Entries hold full snapshots, so `T` must stay small and
 * JSON-like: reference pixels by id, never embed them.
 */

type Entry<T> = { label: string; state: T };

function clone<T>(value: T): T {
	// SAFETY: `$state.snapshot` deep-clones `value`; its `Snapshot<T>` type only strips
	// reactivity, and `T` is plain JSON-like data by this module's contract.
	return $state.snapshot(value) as T;
}

export class History<T> {
	present: T;
	// Raw: entries are immutable snapshots, so deep proxies would only add cost.
	#past = $state.raw<Entry<T>[]>([]);
	#future = $state.raw<Entry<T>[]>([]);
	/** `present` as it was before the first uncommitted `preview`; null when nothing is pending. */
	#base: T | null = null;
	readonly #limit: number;

	constructor(initial: T, limit = 100) {
		this.present = $state(clone(initial));
		this.#limit = limit;
	}

	get canUndo(): boolean {
		return this.#past.length > 0;
	}

	get canRedo(): boolean {
		return this.#future.length > 0;
	}

	get undoLabel(): string | undefined {
		return this.#past.at(-1)?.label;
	}

	get redoLabel(): string | undefined {
		return this.#future.at(-1)?.label;
	}

	get isPreviewing(): boolean {
		return this.#base !== null;
	}

	/** Show `next` without recording history. */
	preview(next: T): void {
		this.#base ??= clone(this.present);
		this.present = clone(next);
	}

	/** Drop uncommitted previews and restore the last committed state. */
	cancelPreview(): void {
		if (this.#base === null) return;
		this.present = this.#base;
		this.#base = null;
	}

	/** Record one undoable step ending at `next` (or at the current preview when omitted). */
	commit(label: string, next?: T): void {
		const before = this.#base ?? clone(this.present);
		this.#base = null;
		if (next !== undefined) this.present = clone(next);
		this.#past = [...this.#past, { label, state: before }].slice(-this.#limit);
		this.#future = [];
	}

	undo(): void {
		const moved = this.#step(this.#past, this.#future);
		if (moved) [this.#past, this.#future] = moved;
	}

	redo(): void {
		const moved = this.#step(this.#future, this.#past);
		if (moved) [this.#future, this.#past] = moved;
	}

	/**
	 * Undo and redo are mirror images: the newest entry of `from` becomes `present`, and the
	 * current state goes onto `to`. Returns both stacks as they should be, or null when `from`
	 * is empty.
	 */
	#step(from: Entry<T>[], to: Entry<T>[]): [from: Entry<T>[], to: Entry<T>[]] | null {
		this.cancelPreview();
		const entry = from.at(-1);
		if (!entry) return null;
		const nextTo = [...to, { label: entry.label, state: clone(this.present) }];
		this.present = clone(entry.state);
		return [from.slice(0, -1), nextTo];
	}

	/** Start over from `state` with empty history (e.g. after opening another document). */
	reset(state: T): void {
		this.#base = null;
		this.present = clone(state);
		this.#past = [];
		this.#future = [];
	}
}
