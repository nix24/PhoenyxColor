export type Direction = "up" | "down" | "left" | "right";

interface FocusableElement {
    id: string;
    element: HTMLElement;
    rect: DOMRect;
    onFocus?: () => void;
    onBlur?: () => void;
    onSelect?: () => void;
}

export class SpatialNavEngine {
    private elements: Map<string, FocusableElement> = new Map();
    private currentFocusId: string | null = null;
    private enabled: boolean = true;

    constructor() {
        if (typeof window !== "undefined") {
            window.addEventListener("keydown", this.handleKeyDown.bind(this));
        }
    }

    destroy() {
        if (typeof window !== "undefined") {
            window.removeEventListener("keydown", this.handleKeyDown.bind(this));
        }
    }

    register(id: string, element: HTMLElement, callbacks?: { onFocus?: () => void; onBlur?: () => void; onSelect?: () => void }) {
        this.elements.set(id, {
            id,
            element,
            rect: element.getBoundingClientRect(),
            ...callbacks
        });

        // Update rect on resize/scroll could be added here
    }

    unregister(id: string) {
        this.elements.delete(id);
        if (this.currentFocusId === id) {
            this.currentFocusId = null;
        }
    }

    focus(id: string) {
        if (!this.elements.has(id)) return;

        const prev = this.currentFocusId ? this.elements.get(this.currentFocusId) : null;
        if (prev?.onBlur) prev.onBlur();
        if (prev) prev.element.classList.remove("spatial-focus");

        this.currentFocusId = id;
        const next = this.elements.get(id);
        if (next) {
            next.element.focus();
            next.element.classList.add("spatial-focus");
            if (next.onFocus) next.onFocus();
            next.element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }

    private handleKeyDown(e: KeyboardEvent) {
        if (!this.enabled) return;

        switch (e.key) {
            case "ArrowUp":
                this.move("up");
                e.preventDefault();
                break;
            case "ArrowDown":
                this.move("down");
                e.preventDefault();
                break;
            case "ArrowLeft":
                this.move("left");
                e.preventDefault();
                break;
            case "ArrowRight":
                this.move("right");
                e.preventDefault();
                break;
            case "Enter":
                if (this.currentFocusId) {
                    const el = this.elements.get(this.currentFocusId);
                    if (el?.onSelect) el.onSelect();
                    else el?.element.click();
                }
                break;
        }
    }

    private move(direction: Direction) {
        if (!this.currentFocusId) {
            // If nothing focused, focus the first registered element
            const first = this.elements.keys().next().value;
            if (first) this.focus(first);
            return;
        }

        const current = this.elements.get(this.currentFocusId);
        if (!current) return;

        // Refresh rects
        this.refreshRects();

        const candidates = Array.from(this.elements.values()).filter((e) => e.id !== this.currentFocusId);
        let bestCandidate: FocusableElement | null = null;
        let minDistance = Infinity;

        for (const candidate of candidates) {
            if (this.isValidCandidate(current, candidate, direction)) {
                const dist = this.getDistance(current, candidate, direction);
                if (dist < minDistance) {
                    minDistance = dist;
                    bestCandidate = candidate;
                }
            }
        }

        if (bestCandidate) {
            this.focus(bestCandidate.id);
        }
    }

    private refreshRects() {
        for (const el of this.elements.values()) {
            el.rect = el.element.getBoundingClientRect();
        }
    }

    private isValidCandidate(current: FocusableElement, candidate: FocusableElement, direction: Direction): boolean {
        const cRect = current.rect;
        const nRect = candidate.rect;

        switch (direction) {
            case "up": return nRect.bottom <= cRect.top;
            case "down": return nRect.top >= cRect.bottom;
            case "left": return nRect.right <= cRect.left;
            case "right": return nRect.left >= cRect.right;
        }
    }

    private getDistance(current: FocusableElement, candidate: FocusableElement, direction: Direction): number {
        const cRect = current.rect;
        const nRect = candidate.rect;

        // Simple Euclidean distance between centers
        const cCenter = { x: cRect.left + cRect.width / 2, y: cRect.top + cRect.height / 2 };
        const nCenter = { x: nRect.left + nRect.width / 2, y: nRect.top + nRect.height / 2 };

        // Weight alignment heavily (magnetic feel)
        let dx = Math.abs(cCenter.x - nCenter.x);
        let dy = Math.abs(cCenter.y - nCenter.y);

        if (direction === "up" || direction === "down") {
            return dy + dx * 2; // Penalize horizontal deviation
        } else {
            return dx + dy * 2; // Penalize vertical deviation
        }
    }
}

export const spatialNav = new SpatialNavEngine();
