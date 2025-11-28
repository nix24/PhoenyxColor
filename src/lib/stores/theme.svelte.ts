import { ColorEngine, type ThemePalette } from "$lib/services/color-engine";

export class ThemeStore {
    // Default "Phoenix" brand colors
    current = $state<ThemePalette>({
        primary: "oklch(65% 0.22 30)", // Phoenix Orange/Red
        secondary: "oklch(55% 0.25 290)", // Phoenix Violet
        background: "oklch(15% 0.05 280)", // Dark Void
        text: "oklch(95% 0.01 280)",
        accent: "oklch(70% 0.15 40)"
    });

    isProcedural = $state(false);

    async generateFromImage(imageUrl: string) {
        try {
            const palette = await ColorEngine.extractTheme(imageUrl);
            this.current = palette;
            this.isProcedural = true;
            this.applyToCss();
        } catch (error) {
            console.error("Failed to generate theme:", error);
        }
    }

    resetToDefault() {
        this.current = {
            primary: "oklch(65% 0.22 30)",
            secondary: "oklch(55% 0.25 290)",
            background: "oklch(15% 0.05 280)",
            text: "oklch(95% 0.01 280)",
            accent: "oklch(70% 0.15 40)"
        };
        this.isProcedural = false;
        this.applyToCss();
    }

    applyToCss() {
        if (typeof document === "undefined") return;

        const root = document.documentElement;
        root.style.setProperty("--color-primary", this.current.primary);
        root.style.setProperty("--color-secondary", this.current.secondary);
        root.style.setProperty("--color-bg", this.current.background);
        root.style.setProperty("--color-text", this.current.text);
        root.style.setProperty("--color-accent", this.current.accent);
    }
}
