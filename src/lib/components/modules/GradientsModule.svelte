<script lang="ts">
    import { appStore } from "$lib/stores/app.svelte";
    import type { Gradient, GradientStop } from "$lib/stores/app.svelte";
    import Icon from "@iconify/svelte";
    import { toast } from "svelte-sonner";

    let newGradientName = $state("");
    let showCreateDialog = $state(false);
    let gradientType: "linear" | "radial" | "angular" = $state("linear");
    let previewSize = $state({ width: 400, height: 200 });

    // New state for presets and search
    let showPresetsDialog = $state(false);
    let presetSearchTerm = $state("");
    let selectedPresetCategory = $state("all");

    // Context menu state for color stops
    let contextMenu = $state<{
        show: boolean;
        x: number;
        y: number;
        gradientId: string;
        stopIndex: number;
    } | null>(null);

    // Gradient Presets Collection
    const gradientPresets = [
        // Sunset & Warm
        {
            name: "Sunset Glow",
            category: "sunset",
            colors: ["#ff7e5f", "#feb47b"],
            type: "linear",
            angle: 45,
        },
        {
            name: "Fire",
            category: "warm",
            colors: ["#f12711", "#f5af19"],
            type: "linear",
            angle: 45,
        },
        {
            name: "Orange Sunset",
            category: "sunset",
            colors: ["#ff6b6b", "#feca57", "#ff9ff3"],
            type: "linear",
            angle: 135,
        },
        {
            name: "Warm Flame",
            category: "warm",
            colors: ["#ff9a9e", "#fecfef", "#fecfef"],
            type: "radial",
        },

        // Ocean & Cool
        {
            name: "Ocean Blue",
            category: "ocean",
            colors: ["#2193b0", "#6dd5ed"],
            type: "linear",
            angle: 45,
        },
        {
            name: "Deep Sea",
            category: "ocean",
            colors: ["#667eea", "#764ba2"],
            type: "linear",
            angle: 135,
        },
        {
            name: "Aqua Marine",
            category: "cool",
            colors: ["#00c6fb", "#005bea"],
            type: "linear",
            angle: 45,
        },
        {
            name: "Ice Cold",
            category: "cool",
            colors: ["#b2fefa", "#0ed2f7"],
            type: "linear",
            angle: 90,
        },

        // Nature & Green
        {
            name: "Forest",
            category: "nature",
            colors: ["#134e5e", "#71b280"],
            type: "linear",
            angle: 45,
        },
        {
            name: "Emerald",
            category: "nature",
            colors: ["#11998e", "#38ef7d"],
            type: "linear",
            angle: 45,
        },
        {
            name: "Jungle",
            category: "nature",
            colors: ["#56ab2f", "#a8e6cf", "#dcedc1"],
            type: "linear",
            angle: 45,
        },

        // Purple & Mystical
        {
            name: "Purple Paradise",
            category: "purple",
            colors: ["#667eea", "#764ba2"],
            type: "linear",
            angle: 45,
        },
        {
            name: "Cosmic",
            category: "mystical",
            colors: ["#b92b27", "#1565c0"],
            type: "radial",
        },
        {
            name: "Galaxy",
            category: "mystical",
            colors: ["#200122", "#6f0000"],
            type: "linear",
            angle: 45,
        },
        {
            name: "Aurora",
            category: "mystical",
            colors: ["#00c3f7", "#9921e8", "#5f72bd"],
            type: "angular",
        },

        // Vibrant & Neon
        {
            name: "Electric",
            category: "neon",
            colors: ["#ff0844", "#00dbde"],
            type: "linear",
            angle: 45,
        },
        {
            name: "Neon Pink",
            category: "neon",
            colors: ["#f093fb", "#f5576c"],
            type: "linear",
            angle: 45,
        },
        {
            name: "Cyber",
            category: "neon",
            colors: ["#4facfe", "#00f2fe"],
            type: "linear",
            angle: 90,
        },
        {
            name: "Retro Wave",
            category: "neon",
            colors: ["#fa709a", "#fee140"],
            type: "linear",
            angle: 45,
        },

        // Pastel & Soft
        {
            name: "Cotton Candy",
            category: "pastel",
            colors: ["#ffecd2", "#fcb69f"],
            type: "linear",
            angle: 45,
        },
        {
            name: "Dreamy",
            category: "pastel",
            colors: ["#a8edea", "#fed6e3"],
            type: "linear",
            angle: 135,
        },
        {
            name: "Soft Rainbow",
            category: "pastel",
            colors: ["#ffeaa7", "#fab1a0", "#fd79a8", "#a29bfe"],
            type: "linear",
            angle: 45,
        },

        // Dark & Dramatic
        {
            name: "Dark Knight",
            category: "dark",
            colors: ["#232526", "#414345"],
            type: "linear",
            angle: 45,
        },
        {
            name: "Midnight",
            category: "dark",
            colors: ["#0c0c0c", "#1a1a1a", "#2d2d2d"],
            type: "linear",
            angle: 90,
        },
        {
            name: "Storm",
            category: "dark",
            colors: ["#373b44", "#4286f4"],
            type: "linear",
            angle: 45,
        },
    ];

    const presetCategories = [
        { id: "all", name: "All", icon: "material-symbols:grid-view" },
        { id: "sunset", name: "Sunset", icon: "material-symbols:wb-twilight" },
        { id: "ocean", name: "Ocean", icon: "material-symbols:water" },
        { id: "nature", name: "Nature", icon: "material-symbols:eco" },
        { id: "purple", name: "Purple", icon: "material-symbols:palette" },
        {
            id: "mystical",
            name: "Mystical",
            icon: "material-symbols:auto-awesome",
        },
        { id: "neon", name: "Neon", icon: "material-symbols:electric-bolt" },
        { id: "pastel", name: "Pastel", icon: "material-symbols:cloud" },
        {
            id: "warm",
            name: "Warm",
            icon: "material-symbols:local-fire-department",
        },
        { id: "cool", name: "Cool", icon: "material-symbols:ac-unit" },
        { id: "dark", name: "Dark", icon: "material-symbols:dark-mode" },
    ];

    // Filter presets based on search and category
    let filteredPresets = $derived(
        gradientPresets.filter((preset) => {
            const matchesSearch = preset.name
                .toLowerCase()
                .includes(presetSearchTerm.toLowerCase());
            const matchesCategory =
                selectedPresetCategory === "all" ||
                preset.category === selectedPresetCategory;
            return matchesSearch && matchesCategory;
        }),
    );

    function createGradient() {
        try {
            if (!newGradientName.trim()) {
                toast.error("Please enter a gradient name");
                return;
            }

            const defaultStops: GradientStop[] = [
                { color: "#3b82f6", position: 0 },
                { color: "#8b5cf6", position: 100 },
            ];

            appStore.addGradient({
                name: newGradientName.trim(),
                type: gradientType,
                stops: defaultStops,
                angle: gradientType === "linear" ? 45 : undefined,
                centerX: gradientType === "radial" ? 50 : undefined,
                centerY: gradientType === "radial" ? 50 : undefined,
            });

            const gradientName = newGradientName.trim();
            newGradientName = "";
            showCreateDialog = false;
            toast.success(`Gradient "${gradientName}" created!`);
        } catch (error) {
            console.error("Error creating gradient:", error);
            toast.error("Failed to create gradient. Please try again.");
        }
    }

    function addColorStop(gradientId: string) {
        const gradient = appStore.gradients.find((g) => g.id === gradientId);
        if (gradient) {
            // Find a good position for the new stop
            const positions = [...gradient.stops]
                .map((s) => s.position)
                .sort((a, b) => a - b);
            let newPosition = 50;

            // Find the largest gap and place the new stop in the middle
            let maxGap = 0;
            for (let i = 0; i < positions.length - 1; i++) {
                const gap = positions[i + 1] - positions[i];
                if (gap > maxGap) {
                    maxGap = gap;
                    newPosition = positions[i] + gap / 2;
                }
            }

            gradient.stops.push({
                color: "#3b82f6",
                position: newPosition,
            });

            // Sort stops by position
            gradient.stops.sort((a, b) => a.position - b.position);
            toast.success("Color stop added to gradient");
        }
    }

    function removeColorStop(gradientId: string, stopIndex: number) {
        const gradient = appStore.gradients.find((g) => g.id === gradientId);
        if (gradient && gradient.stops.length > 2) {
            gradient.stops.splice(stopIndex, 1);
            toast.info("Color stop removed from gradient");
        }
    }

    function updateColorStop(
        gradientId: string,
        stopIndex: number,
        updates: Partial<GradientStop>,
    ) {
        const gradient = appStore.gradients.find((g) => g.id === gradientId);
        if (gradient && gradient.stops[stopIndex]) {
            Object.assign(gradient.stops[stopIndex], updates);
            // Resort if position changed
            if (updates.position !== undefined) {
                gradient.stops.sort((a, b) => a.position - b.position);
            }
        }
    }

    function generateCSSGradient(gradient: Gradient): string {
        const stops = [...gradient.stops]
            .sort((a, b) => a.position - b.position)
            .map((stop) => `${stop.color} ${stop.position}%`)
            .join(", ");

        switch (gradient.type) {
            case "linear":
                return `linear-gradient(${gradient.angle || 45}deg, ${stops})`;
            case "radial":
                return `radial-gradient(circle at ${gradient.centerX || 50}% ${gradient.centerY || 50}%, ${stops})`;
            case "angular":
                return `conic-gradient(${stops})`;
            default:
                return `linear-gradient(45deg, ${stops})`;
        }
    }

    function copyGradientCSS(gradient: Gradient) {
        const css = `background: ${generateCSSGradient(gradient)};`;
        navigator.clipboard
            .writeText(css)
            .then(() => {
                toast.success(
                    `CSS for "${gradient.name}" copied to clipboard!`,
                );
            })
            .catch(() => {
                toast.error("Failed to copy CSS to clipboard");
            });
    }

    function duplicateGradient(gradient: Gradient) {
        appStore.addGradient({
            name: `${gradient.name} Copy`,
            type: gradient.type,
            stops: gradient.stops.map((stop) => ({ ...stop })),
            angle: gradient.angle,
            centerX: gradient.centerX,
            centerY: gradient.centerY,
        });
        toast.success(`Gradient "${gradient.name}" duplicated!`);
    }

    // Apply a preset gradient
    function applyPreset(preset: (typeof gradientPresets)[0]) {
        const stops: GradientStop[] = preset.colors.map((color, index) => ({
            color,
            position:
                index === 0
                    ? 0
                    : index === preset.colors.length - 1
                      ? 100
                      : (index / (preset.colors.length - 1)) * 100,
        }));

        appStore.addGradient({
            name: preset.name,
            type: preset.type as "linear" | "radial" | "angular",
            stops,
            angle: preset.type === "linear" ? preset.angle || 45 : undefined,
            centerX: preset.type === "radial" ? 50 : undefined,
            centerY: preset.type === "radial" ? 50 : undefined,
        });

        showPresetsDialog = false;
        toast.success(`Applied preset "${preset.name}"!`);
    }

    // Generate gradient from existing palette
    function generateFromPalette(paletteId: string) {
        const palette = appStore.palettes.find((p) => p.id === paletteId);
        if (!palette || palette.colors.length < 2) {
            toast.error(
                "Need at least 2 colors in palette to generate gradient",
            );
            return;
        }

        const stops: GradientStop[] = palette.colors.map((color, index) => ({
            color,
            position: (index / (palette.colors.length - 1)) * 100,
        }));

        appStore.addGradient({
            name: `${palette.name} Gradient`,
            type: "linear",
            stops,
            angle: 45,
        });

        toast.success(`Generated gradient from "${palette.name}" palette!`);
    }

    // Export gradient as PNG
    async function exportAsPNG(
        gradient: Gradient,
        width: number = 400,
        height: number = 200,
    ) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = width;
        canvas.height = height;

        // Create gradient
        let gradientObj;

        switch (gradient.type) {
            case "linear":
                const angle = ((gradient.angle || 45) * Math.PI) / 180;
                const x1 = width / 2 - (Math.cos(angle) * width) / 2;
                const y1 = height / 2 - (Math.sin(angle) * height) / 2;
                const x2 = width / 2 + (Math.cos(angle) * width) / 2;
                const y2 = height / 2 + (Math.sin(angle) * height) / 2;
                gradientObj = ctx.createLinearGradient(x1, y1, x2, y2);
                break;
            case "radial":
                const centerX = ((gradient.centerX || 50) / 100) * width;
                const centerY = ((gradient.centerY || 50) / 100) * height;
                gradientObj = ctx.createRadialGradient(
                    centerX,
                    centerY,
                    0,
                    centerX,
                    centerY,
                    Math.max(width, height) / 2,
                );
                break;
            case "angular":
                // For angular gradients, we'll use linear as fallback for PNG
                // A true conic gradient on canvas is complex to implement from scratch.
                toast.info(
                    "Angular gradient exported as a linear approximation for PNG.",
                );
                gradientObj = ctx.createLinearGradient(0, 0, width, 0); // Fallback
                break;
            default:
                gradientObj = ctx.createLinearGradient(0, 0, width, 0);
        }

        // Add color stops
        gradient.stops.forEach((stop) => {
            gradientObj.addColorStop(stop.position / 100, stop.color);
        });

        // Fill canvas
        ctx.fillStyle = gradientObj;
        ctx.fillRect(0, 0, width, height);

        // Download
        canvas.toBlob((blob) => {
            if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${gradient.name.replace(/[^a-z0-9]/gi, "_")}.png`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success(`Exported "${gradient.name}" as PNG!`);
            }
        }, "image/png");
    }

    // Export gradient as SVG
    function exportAsSVG(
        gradient: Gradient,
        width: number = 400,
        height: number = 200,
    ) {
        let gradientDef = "";
        const gradientId = `gradient-${gradient.id}`;

        switch (gradient.type) {
            case "linear":
                const angle = gradient.angle || 45;
                // Convert CSS angle (0deg is up) to SVG angle (0deg is right)
                const svgAngle = (angle - 90 + 360) % 360;
                const radians = (svgAngle * Math.PI) / 180;

                // Calculate gradient vector endpoints (0% to 100% of the line)
                // SVG gradientUnits="userSpaceOnUse" is simpler but objectBoundingBox is more common for fills
                // For objectBoundingBox, coordinates are 0 to 1 (or 0% to 100%)
                // This calculation ensures the angle is visually consistent with CSS linear-gradient
                let x1 = 0.5 - Math.cos(radians) * 0.5;
                let y1 = 0.5 - Math.sin(radians) * 0.5;
                let x2 = 0.5 + Math.cos(radians) * 0.5;
                let y2 = 0.5 + Math.sin(radians) * 0.5;

                // Ensure values are within [0,1] as percentages for x1,y1,x2,y2
                // This is a simplified approach. For perfect fidelity across all angles and aspect ratios,
                // the gradientTransform attribute might be needed.
                x1 = Math.max(0, Math.min(1, x1)) * 100;
                y1 = Math.max(0, Math.min(1, y1)) * 100;
                x2 = Math.max(0, Math.min(1, x2)) * 100;
                y2 = Math.max(0, Math.min(1, y2)) * 100;

                gradientDef = `<linearGradient id="${gradientId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%" gradientUnits="objectBoundingBox">
                    ${gradient.stops.map((stop) => `<stop offset="${stop.position}%" stop-color="${stop.color}"/>`).join("\n")}
                </linearGradient>`;
                break;
            case "radial":
                gradientDef = `<radialGradient id="${gradientId}" cx="${gradient.centerX || 50}%" cy="${gradient.centerY || 50}%" r="50%" fx="${gradient.centerX || 50}%" fy="${gradient.centerY || 50}%" gradientUnits="objectBoundingBox">
                    ${gradient.stops.map((stop) => `<stop offset="${stop.position}%" stop-color="${stop.color}"/>`).join("\n")}
                </radialGradient>`;
                break;
            case "angular":
                // SVG doesn't support conic gradients natively.
                // This remains a linear fallback as true conic SVG is very complex.
                toast.info(
                    "Angular gradient exported as a linear approximation for SVG.",
                );
                gradientDef = `<linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">
                    ${gradient.stops.map((stop) => `<stop offset="${stop.position}%" stop-color="${stop.color}"/>`).join("\n")}
                </linearGradient>`; // Fallback to a simple linear gradient
                break;
        }

        const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                ${gradientDef}
            </defs>
            <rect width="100%" height="100%" fill="url(#${gradientId})"/>
        </svg>`;

        const blob = new Blob([svg], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${gradient.name.replace(/[^a-z0-9]/gi, "_")}.svg`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported "${gradient.name}" as SVG!`);
    }

    // Reverse gradient colors
    function reverseGradient(gradientId: string) {
        const gradient = appStore.gradients.find((g) => g.id === gradientId);
        if (!gradient) return;

        const reversedStops = gradient.stops
            .map((stop) => ({
                ...stop,
                position: 100 - stop.position,
            }))
            .reverse();

        gradient.stops = reversedStops;
        toast.success("Gradient reversed!");
    }

    // Context menu functions
    function showContextMenu(
        event: MouseEvent,
        gradientId: string,
        stopIndex: number,
    ) {
        event.preventDefault();
        event.stopPropagation();

        contextMenu = {
            show: true,
            x: event.clientX,
            y: event.clientY,
            gradientId,
            stopIndex,
        };
    }

    function hideContextMenu() {
        contextMenu = null;
    }

    function duplicateColorStop() {
        if (!contextMenu) return;

        const gradient = appStore.gradients.find(
            (g) => g.id === contextMenu!.gradientId,
        );
        if (!gradient) return;

        const stop = gradient.stops[contextMenu!.stopIndex];
        const newStop = {
            ...stop,
            position: Math.min(100, stop.position + 10),
        };

        gradient.stops.push(newStop);
        gradient.stops.sort((a, b) => a.position - b.position);

        hideContextMenu();
        toast.success("Color stop duplicated!");
    }

    function deleteColorStopFromContext() {
        if (!contextMenu) return;

        const gradient = appStore.gradients.find(
            (g) => g.id === contextMenu!.gradientId,
        );
        if (!gradient || gradient.stops.length <= 2) {
            toast.warning("Gradient must have at least 2 color stops");
            hideContextMenu();
            return;
        }

        gradient.stops.splice(contextMenu!.stopIndex, 1);
        hideContextMenu();
        toast.info("Color stop removed!");
    }

    // Click outside to close context menu
    function handleDocumentClick(event: MouseEvent) {
        if (
            contextMenu &&
            !(event.target as Element).closest(".context-menu")
        ) {
            hideContextMenu();
        }
    }
</script>

<div class="h-full flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between p-6 border-b border-base-300">
        <div>
            <h2 class="text-2xl font-bold text-base-content">
                Gradient Generator
            </h2>
            <p class="text-sm text-base-content/70">
                Create beautiful gradients for your artwork
            </p>
        </div>

        <div class="flex items-center space-x-3">
            <button
                class="btn btn-primary btn-sm"
                onclick={() => (showCreateDialog = true)}
                type="button"
                aria-label="Create new gradient"
            >
                <Icon icon="material-symbols:add" class="h-4 w-4" />
                New Gradient
            </button>

            <button
                class="btn btn-outline btn-sm"
                onclick={() => (showPresetsDialog = true)}
                type="button"
                aria-label="Browse gradient presets"
            >
                <Icon icon="material-symbols:auto-awesome" class="h-4 w-4" />
                Browse Presets
            </button>

            {#if appStore.palettes.length > 0}
                <div class="dropdown dropdown-end">
                    <button
                        class="btn btn-outline btn-sm"
                        type="button"
                        tabindex="0"
                        aria-label="Generate gradient from palette"
                        title="Create gradient from existing palette"
                    >
                        <Icon icon="material-symbols:palette" class="h-4 w-4" />
                        From Palette
                    </button>
                    <ul
                        class="dropdown-content menu bg-base-100 rounded-box z-[1] w-64 p-2 shadow-xl border border-base-300 max-h-64 overflow-y-auto"
                    >
                        {#each appStore.palettes as palette (palette.id)}
                            <li>
                                <button
                                    onclick={() =>
                                        generateFromPalette(palette.id)}
                                    type="button"
                                    class="flex items-center justify-start p-2 text-left"
                                    disabled={palette.colors.length < 2}
                                >
                                    <div class="flex space-x-1 mr-3">
                                        {#each palette.colors.slice(0, 4) as color}
                                            <div
                                                class="w-3 h-3 rounded border border-base-300"
                                                style:background-color={color}
                                            ></div>
                                        {/each}
                                        {#if palette.colors.length > 4}
                                            <div
                                                class="text-xs text-base-content/60"
                                            >
                                                +{palette.colors.length - 4}
                                            </div>
                                        {/if}
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="text-sm font-medium truncate">
                                            {palette.name}
                                        </p>
                                        <p class="text-xs text-base-content/60">
                                            {palette.colors.length} colors
                                        </p>
                                    </div>
                                </button>
                            </li>
                        {/each}
                    </ul>
                </div>
            {/if}
        </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex">
        <!-- Gradients List -->
        <div class="w-80 border-r border-base-300 bg-base-100 overflow-y-auto">
            <div class="p-4">
                <h3 class="font-semibold text-base-content mb-3">
                    Gradients ({appStore.gradients.length})
                </h3>

                <div class="space-y-3">
                    {#each appStore.gradients as gradient (gradient.id)}
                        <div
                            class="card bg-base-100 shadow-sm border cursor-pointer transition-all duration-200 p-4 w-full hover:shadow-md"
                            class:border-primary={appStore.state
                                .activeGradient === gradient.id}
                            class:bg-primary-selected={appStore.state
                                .activeGradient === gradient.id}
                            class:border-base-300={appStore.state
                                .activeGradient !== gradient.id}
                            onclick={() =>
                                appStore.setActiveGradient(gradient.id)}
                            role="button"
                            tabindex="0"
                            aria-label="Select gradient {gradient.name}"
                            onkeydown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    appStore.setActiveGradient(gradient.id);
                                }
                            }}
                        >
                            <!-- Gradient Header -->
                            <div class="flex items-center justify-between mb-3">
                                <div class="flex-1 min-w-0">
                                    <h4
                                        class="font-medium text-base-content truncate"
                                        title={gradient.name}
                                    >
                                        {gradient.name}
                                    </h4>
                                    <p
                                        class="text-xs text-base-content/60 capitalize"
                                    >
                                        {gradient.type} • {gradient.stops
                                            .length} stops
                                    </p>
                                </div>

                                <div class="flex items-center space-x-1">
                                    <button
                                        class="btn btn-xs btn-ghost"
                                        onclick={(e) => {
                                            e.stopPropagation();
                                            copyGradientCSS(gradient);
                                        }}
                                        title="Copy CSS"
                                        type="button"
                                        aria-label="Copy CSS for gradient {gradient.name}"
                                    >
                                        <Icon
                                            icon="material-symbols:code"
                                            class="w-4 h-4"
                                        />
                                    </button>
                                    <button
                                        class="btn btn-xs btn-ghost"
                                        onclick={(e) => {
                                            e.stopPropagation();
                                            reverseGradient(gradient.id);
                                        }}
                                        title="Reverse gradient"
                                        type="button"
                                        aria-label="Reverse gradient {gradient.name}"
                                    >
                                        <Icon
                                            icon="material-symbols:swap-horiz"
                                            class="w-4 h-4"
                                        />
                                    </button>
                                    <button
                                        class="btn btn-xs btn-ghost"
                                        onclick={(e) => {
                                            e.stopPropagation();
                                            duplicateGradient(gradient);
                                        }}
                                        title="Duplicate gradient"
                                        type="button"
                                        aria-label="Duplicate gradient {gradient.name}"
                                    >
                                        <Icon
                                            icon="material-symbols:content-copy"
                                            class="w-4 h-4"
                                        />
                                    </button>
                                    <button
                                        class="btn btn-xs btn-ghost text-error"
                                        onclick={(e) => {
                                            e.stopPropagation();
                                            appStore.removeGradient(
                                                gradient.id,
                                            );
                                            toast.info(
                                                `Deleted gradient "${gradient.name}"`,
                                            );
                                        }}
                                        title="Delete gradient"
                                        type="button"
                                        aria-label="Delete gradient {gradient.name}"
                                    >
                                        <Icon
                                            icon="material-symbols:delete-outline"
                                            class="w-4 h-4"
                                        />
                                    </button>
                                </div>
                            </div>

                            <!-- Gradient Preview -->
                            <div
                                class="h-16 rounded border border-base-300"
                                style:background={generateCSSGradient(gradient)}
                                aria-label="Preview of {gradient.name} gradient"
                            ></div>
                        </div>
                    {/each}

                    {#if appStore.gradients.length === 0}
                        <div class="text-center py-8 text-base-content/70">
                            <Icon
                                icon="material-symbols:gradient"
                                class="h-12 w-12 mx-auto mb-2 opacity-50"
                            />
                            <p>No gradients yet</p>
                            <p class="text-xs">Create your first gradient</p>
                        </div>
                    {/if}
                </div>
            </div>
        </div>

        <!-- Gradient Editor -->
        <div class="flex-1 bg-base-100 overflow-y-auto">
            {#if appStore.activeGradient}
                <div class="p-6">
                    <!-- Editor Header -->
                    <div class="flex items-center justify-between mb-6">
                        <div>
                            <h3 class="text-xl font-bold text-base-content">
                                {appStore.activeGradient.name}
                            </h3>
                            <p class="text-sm text-base-content/70 capitalize">
                                {appStore.activeGradient.type} gradient with {appStore
                                    .activeGradient.stops.length} color stops
                            </p>
                        </div>

                        <!-- Type Selector -->
                        <div
                            class="join"
                            role="radiogroup"
                            aria-label="Select gradient type"
                        >
                            {#each ["linear", "radial", "angular"] as type}
                                <button
                                    role="radio"
                                    aria-checked={gradientType === type}
                                    class="btn btn-outline join-item flex-1 capitalize"
                                    class:btn-primary={gradientType === type}
                                    onclick={(e) => {
                                        e.stopPropagation();
                                        gradientType = type as
                                            | "linear"
                                            | "radial"
                                            | "angular";
                                    }}
                                    type="button"
                                    aria-label="Set gradient type to {type}"
                                >
                                    {type}
                                </button>
                            {/each}
                        </div>
                    </div>

                    <!-- Large Preview -->
                    <div class="mb-8">
                        <div class="flex items-center justify-between mb-3">
                            <h4 class="font-semibold text-base-content">
                                Preview
                            </h4>
                            <div class="flex items-center space-x-2">
                                <label
                                    for="preview-size-select"
                                    class="text-sm text-base-content/70"
                                >
                                    Size:
                                </label>
                                <select
                                    id="preview-size-select"
                                    bind:value={previewSize}
                                    class="select select-sm select-bordered"
                                    aria-label="Select preview size"
                                >
                                    <option value={{ width: 400, height: 200 }}
                                        >400x200</option
                                    >
                                    <option value={{ width: 600, height: 300 }}
                                        >600x300</option
                                    >
                                    <option value={{ width: 300, height: 300 }}
                                        >300x300 (Square)</option
                                    >
                                </select>
                            </div>
                        </div>

                        <div
                            class="rounded-lg border border-base-300 shadow-sm mx-auto"
                            style:background={generateCSSGradient(
                                appStore.activeGradient,
                            )}
                            style:width="{previewSize.width}px"
                            style:height="{previewSize.height}px"
                            aria-label="Large preview of {appStore
                                .activeGradient.name} gradient"
                        ></div>
                    </div>

                    <!-- Gradient Controls -->
                    {#if appStore.activeGradient.type === "linear"}
                        <div class="mb-6">
                            <label
                                for="gradient-angle-{appStore.activeGradient
                                    .id}"
                                class="block text-sm font-medium text-base-content mb-2"
                                >Angle</label
                            >
                            <div class="flex items-center space-x-3">
                                <input
                                    id="gradient-angle-{appStore.activeGradient
                                        .id}"
                                    type="range"
                                    min="0"
                                    max="360"
                                    step="1"
                                    value={appStore.activeGradient.angle || 45}
                                    class="range range-primary flex-1"
                                    oninput={(e) => {
                                        const angle = parseInt(
                                            (e.target as HTMLInputElement)
                                                ?.value || "45",
                                        );
                                        appStore.updateGradient(
                                            appStore.activeGradient!.id,
                                            { angle },
                                        );
                                    }}
                                    aria-describedby="angle-value-{appStore
                                        .activeGradient.id}"
                                />
                                <span
                                    id="angle-value-{appStore.activeGradient
                                        .id}"
                                    class="text-sm text-base-content/70 w-12"
                                >
                                    {appStore.activeGradient.angle || 45}°
                                </span>
                            </div>
                        </div>
                    {/if}

                    {#if appStore.activeGradient.type === "radial"}
                        <div class="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label
                                    for="gradient-centerx-{appStore
                                        .activeGradient.id}"
                                    class="block text-sm font-medium text-base-content mb-2"
                                    >Center X</label
                                >
                                <input
                                    id="gradient-centerx-{appStore
                                        .activeGradient.id}"
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={appStore.activeGradient.centerX ||
                                        50}
                                    class="range range-primary w-full"
                                    oninput={(e) => {
                                        const centerX = parseInt(
                                            (e.target as HTMLInputElement)
                                                ?.value || "50",
                                        );
                                        appStore.updateGradient(
                                            appStore.activeGradient!.id,
                                            { centerX },
                                        );
                                    }}
                                    aria-describedby="centerx-value-{appStore
                                        .activeGradient.id}"
                                />
                                <span
                                    id="centerx-value-{appStore.activeGradient
                                        .id}"
                                    class="text-xs text-base-content/60"
                                >
                                    {appStore.activeGradient.centerX || 50}%
                                </span>
                            </div>
                            <div>
                                <label
                                    for="gradient-centery-{appStore
                                        .activeGradient.id}"
                                    class="block text-sm font-medium text-base-content mb-2"
                                    >Center Y</label
                                >
                                <input
                                    id="gradient-centery-{appStore
                                        .activeGradient.id}"
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={appStore.activeGradient.centerY ||
                                        50}
                                    class="range range-primary w-full"
                                    oninput={(e) => {
                                        const centerY = parseInt(
                                            (e.target as HTMLInputElement)
                                                ?.value || "50",
                                        );
                                        appStore.updateGradient(
                                            appStore.activeGradient!.id,
                                            { centerY },
                                        );
                                    }}
                                    aria-describedby="centery-value-{appStore
                                        .activeGradient.id}"
                                />
                                <span
                                    id="centery-value-{appStore.activeGradient
                                        .id}"
                                    class="text-xs text-base-content/60"
                                >
                                    {appStore.activeGradient.centerY || 50}%
                                </span>
                            </div>
                        </div>
                    {/if}

                    <!-- Color Stops -->
                    <div class="mb-8">
                        <div class="flex items-center justify-between mb-4">
                            <h4 class="font-semibold text-base-content">
                                Color Stops
                            </h4>
                            <button
                                class="btn btn-outline btn-sm"
                                onclick={() =>
                                    addColorStop(appStore.activeGradient!.id)}
                                type="button"
                                aria-label="Add new color stop to gradient"
                            >
                                <Icon
                                    icon="material-symbols:add"
                                    class="h-3 w-3"
                                />
                                Add Stop
                            </button>
                        </div>

                        <div class="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {#each appStore.activeGradient.stops as stop, index (index)}
                                <div
                                    role="button"
                                    tabindex="0"
                                    class="flex items-center space-x-3 p-3 border border-base-300 rounded-lg"
                                    oncontextmenu={(e) =>
                                        showContextMenu(
                                            e,
                                            appStore.activeGradient!.id,
                                            index,
                                        )}
                                >
                                    <!-- Color -->
                                    <div class="flex flex-col">
                                        <label
                                            for="color-stop-{index}-color-{appStore
                                                .activeGradient.id}"
                                            class="text-xs text-base-content/70 mb-1"
                                        >
                                            Color
                                        </label>
                                        <input
                                            id="color-stop-{index}-color-{appStore
                                                .activeGradient.id}"
                                            type="color"
                                            value={stop.color}
                                            class="w-12 h-8 rounded border border-base-300 cursor-pointer"
                                            onchange={(e) => {
                                                const color =
                                                    (
                                                        e.target as HTMLInputElement
                                                    )?.value || stop.color;
                                                updateColorStop(
                                                    appStore.activeGradient!.id,
                                                    index,
                                                    { color },
                                                );
                                            }}
                                            aria-label="Color for stop {index +
                                                1}"
                                        />
                                    </div>

                                    <!-- Color Value -->
                                    <div class="flex flex-col">
                                        <label
                                            for="color-stop-{index}-value-{appStore
                                                .activeGradient.id}"
                                            class="text-xs text-base-content/70 mb-1"
                                        >
                                            Hex
                                        </label>
                                        <input
                                            id="color-stop-{index}-value-{appStore
                                                .activeGradient.id}"
                                            type="text"
                                            value={stop.color}
                                            class="input input-xs input-bordered w-20 font-mono"
                                            onchange={(e) => {
                                                const color =
                                                    (
                                                        e.target as HTMLInputElement
                                                    )?.value || stop.color;
                                                updateColorStop(
                                                    appStore.activeGradient!.id,
                                                    index,
                                                    { color },
                                                );
                                            }}
                                            aria-label="Hex value for stop {index +
                                                1}"
                                        />
                                    </div>

                                    <!-- Position -->
                                    <div
                                        class="flex-1 flex items-center space-x-2"
                                    >
                                        <div class="flex flex-col flex-1">
                                            <label
                                                for="color-stop-{index}-position-{appStore
                                                    .activeGradient.id}"
                                                class="text-xs text-base-content/70 mb-1"
                                            >
                                                Position
                                            </label>
                                            <input
                                                id="color-stop-{index}-position-{appStore
                                                    .activeGradient.id}"
                                                type="range"
                                                min="0"
                                                max="100"
                                                step="1"
                                                value={stop.position}
                                                class="range range-sm range-primary"
                                                oninput={(e) => {
                                                    const position = parseInt(
                                                        (
                                                            e.target as HTMLInputElement
                                                        )?.value || "0",
                                                    );
                                                    updateColorStop(
                                                        appStore.activeGradient!
                                                            .id,
                                                        index,
                                                        { position },
                                                    );
                                                }}
                                                aria-describedby="position-value-{index}-{appStore
                                                    .activeGradient.id}"
                                                aria-label="Position for color stop {index +
                                                    1}"
                                            />
                                        </div>
                                        <span
                                            id="position-value-{index}-{appStore
                                                .activeGradient.id}"
                                            class="text-sm text-base-content/70 w-8"
                                        >
                                            {stop.position}%
                                        </span>
                                    </div>

                                    <!-- Remove -->
                                    {#if appStore.activeGradient.stops.length > 2}
                                        <button
                                            class="btn btn-xs btn-ghost text-error"
                                            onclick={() =>
                                                removeColorStop(
                                                    appStore.activeGradient!.id,
                                                    index,
                                                )}
                                            title="Remove stop"
                                            type="button"
                                            aria-label="Remove color stop {index +
                                                1}"
                                        >
                                            <Icon
                                                icon="material-symbols:close"
                                                class="h-4 w-4"
                                            />
                                        </button>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>

                    <!-- Export Options -->
                    <div class="border-t border-base-300 pt-6">
                        <h4 class="font-semibold text-base-content mb-4">
                            Export Options
                        </h4>
                        <div class="grid grid-cols-3 gap-4">
                            <!-- CSS -->
                            <button
                                class="card bg-base-100 shadow-sm border border-base-300 hover:border-primary transition-colors p-4 text-left"
                                onclick={() =>
                                    copyGradientCSS(appStore.activeGradient!)}
                                type="button"
                                aria-label="Copy CSS code for gradient"
                            >
                                <div class="flex items-center space-x-3">
                                    <div
                                        class="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-400 rounded-lg flex items-center justify-center"
                                    >
                                        <Icon
                                            icon="material-symbols:code"
                                            class="h-5 w-5 text-base-content"
                                        />
                                    </div>
                                    <div>
                                        <h5
                                            class="font-medium text-base-content"
                                        >
                                            Copy CSS
                                        </h5>
                                        <p class="text-xs text-base-content/70">
                                            Copy CSS code to clipboard
                                        </p>
                                    </div>
                                </div>
                            </button>

                            <!-- PNG -->
                            <button
                                class="card bg-base-100 shadow-sm border border-base-300 hover:border-primary transition-colors p-4 text-left"
                                onclick={() =>
                                    exportAsPNG(
                                        appStore.activeGradient!,
                                        previewSize.width,
                                        previewSize.height,
                                    )}
                                type="button"
                                aria-label="Export gradient as PNG image"
                            >
                                <div class="flex items-center space-x-3">
                                    <div
                                        class="w-10 h-10 bg-gradient-to-br from-success to-success/80 rounded-lg flex items-center justify-center"
                                    >
                                        <Icon
                                            icon="material-symbols:image"
                                            class="h-5 w-5 text-base-content"
                                        />
                                    </div>
                                    <div>
                                        <h5
                                            class="font-medium text-base-content"
                                        >
                                            Export PNG
                                        </h5>
                                        <p class="text-xs text-base-content/70">
                                            Save as image file ({previewSize.width}x{previewSize.height})
                                        </p>
                                    </div>
                                </div>
                            </button>

                            <!-- SVG -->
                            <button
                                class="card bg-base-100 shadow-sm border border-base-300 hover:border-primary transition-colors p-4 text-left"
                                onclick={() =>
                                    exportAsSVG(
                                        appStore.activeGradient!,
                                        previewSize.width,
                                        previewSize.height,
                                    )}
                                type="button"
                                aria-label="Export gradient as SVG vector"
                            >
                                <div class="flex items-center space-x-3">
                                    <div
                                        class="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center"
                                    >
                                        <Icon
                                            icon="material-symbols:vector"
                                            class="h-5 w-5 text-white"
                                        />
                                    </div>
                                    <div>
                                        <h5
                                            class="font-medium text-base-content"
                                        >
                                            Export SVG
                                        </h5>
                                        <p class="text-xs text-base-content/70">
                                            Vector format ({previewSize.width}x{previewSize.height})
                                        </p>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            {:else}
                <div class="flex items-center justify-center h-full">
                    <div class="text-center text-base-content/70">
                        <Icon
                            icon="material-symbols:gradient"
                            class="h-24 w-24 mx-auto mb-4 opacity-30"
                        />
                        <h3 class="text-xl font-semibold mb-2">
                            No Gradient Selected
                        </h3>
                        <p class="mb-4">
                            Create or select a gradient to start working
                        </p>
                        <button
                            class="btn btn-primary"
                            onclick={() => (showCreateDialog = true)}
                            type="button"
                        >
                            Create Your First Gradient
                        </button>
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>

<!-- Create Gradient Dialog -->
{#if showCreateDialog}
    <div
        class="fixed inset-0 bg-base-content/20 flex items-center justify-center z-50"
        role="button"
        tabindex="0"
        onclick={(e) => {
            if (e.target === e.currentTarget) {
                showCreateDialog = false;
                newGradientName = "";
                gradientType = "linear";
            }
        }}
        onkeydown={(e) => {
            if (e.key === "Escape") {
                showCreateDialog = false;
                newGradientName = "";
                gradientType = "linear";
            }
        }}
    >
        <div class="bg-base-100 rounded-lg p-6 w-96 shadow-xl scale-in">
            <h3 class="text-lg font-semibold text-base-content mb-4">
                Create New Gradient
            </h3>

            <div class="space-y-4">
                <div>
                    <label
                        for="gradient-name-input"
                        class="block text-sm font-medium text-base-content mb-2"
                        >Gradient Name</label
                    >
                    <input
                        id="gradient-name-input"
                        bind:value={newGradientName}
                        type="text"
                        placeholder="Enter gradient name..."
                        class="input input-bordered w-full"
                        onkeydown={(e) => e.key === "Enter" && createGradient()}
                        aria-describedby="name-help"
                    />
                    <div
                        id="name-help"
                        class="text-xs text-base-content/60 mt-1"
                    >
                        Enter a descriptive name for your gradient
                    </div>
                </div>

                <div>
                    <label
                        for="gradient-type-selector"
                        class="block text-sm font-medium text-base-content mb-2"
                        >Gradient Type</label
                    >
                    <div
                        class="join w-full"
                        id="gradient-type-selector"
                        role="radiogroup"
                        aria-label="Select gradient type"
                    >
                        {#each ["linear", "radial", "angular"] as type}
                            <button
                                role="radio"
                                aria-checked={gradientType === type}
                                class="btn btn-outline join-item flex-1 capitalize"
                                class:btn-primary={gradientType === type}
                                onclick={(e) => {
                                    e.stopPropagation();
                                    gradientType = type as
                                        | "linear"
                                        | "radial"
                                        | "angular";
                                }}
                                type="button"
                                aria-label="Set gradient type to {type}"
                            >
                                {type}
                            </button>
                        {/each}
                    </div>
                </div>
            </div>

            <div class="flex items-center justify-end space-x-3 mt-6">
                <button
                    class="btn btn-ghost"
                    onclick={(e) => {
                        e.stopPropagation();
                        showCreateDialog = false;
                        newGradientName = "";
                        gradientType = "linear";
                    }}
                    type="button"
                >
                    Cancel
                </button>
                <button
                    class="btn btn-primary"
                    onclick={(e) => {
                        e.stopPropagation();
                        createGradient();
                    }}
                    disabled={!newGradientName.trim()}
                    type="button"
                >
                    Create Gradient
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Browse Presets Dialog -->
{#if showPresetsDialog}
    <div
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        role="button"
        tabindex="0"
        onclick={(e) => {
            if (e.target === e.currentTarget) {
                showPresetsDialog = false;
            }
        }}
        onkeydown={(e) => {
            if (e.key === "Escape") {
                showPresetsDialog = false;
            }
        }}
    >
        <div
            class="bg-base-100 rounded-lg shadow-xl p-6 w-[90vw] max-w-6xl h-[80vh] flex flex-col"
        >
            <div class="flex items-center justify-between mb-4">
                <h3 class="font-bold text-xl">Browse Gradient Presets</h3>
                <button
                    class="btn btn-xs btn-ghost"
                    onclick={() => (showPresetsDialog = false)}
                    type="button"
                    aria-label="Close presets dialog"
                >
                    <Icon icon="material-symbols:close" class="h-4 w-4" />
                </button>
            </div>

            <!-- Search and Categories -->
            <div class="flex items-center space-x-4 mb-6">
                <div class="relative flex-1">
                    <input
                        bind:value={presetSearchTerm}
                        type="text"
                        placeholder="Search gradients..."
                        class="input input-bordered w-full pl-10"
                    />
                    <Icon
                        icon="material-symbols:search"
                        class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50"
                    />
                </div>

                <div class="flex flex-wrap gap-2">
                    {#each presetCategories as category}
                        <button
                            class="btn btn-sm"
                            class:btn-primary={selectedPresetCategory ===
                                category.id}
                            class:btn-outline={selectedPresetCategory !==
                                category.id}
                            onclick={() =>
                                (selectedPresetCategory = category.id)}
                            type="button"
                        >
                            <Icon icon={category.icon} class="w-4 h-4" />
                            {category.name}
                        </button>
                    {/each}
                </div>
            </div>

            <!-- Presets Grid -->
            <div class="flex-1 overflow-y-auto">
                <div
                    class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
                >
                    {#each filteredPresets as preset}
                        <button
                            class="card bg-base-100 shadow-sm border border-base-300 hover:border-primary transition-all duration-200 p-3 text-left group hover:shadow-md"
                            onclick={() => applyPreset(preset)}
                            type="button"
                            aria-label="Apply preset {preset.name}"
                        >
                            <div
                                class="aspect-video rounded border border-base-300 mb-3 relative overflow-hidden"
                            >
                                <div
                                    class="w-full h-full"
                                    style:background={`${preset.type === "linear" ? "linear-gradient" : preset.type === "radial" ? "radial-gradient" : "conic-gradient"}(${preset.type === "linear" ? `${preset.angle || 45}deg, ` : preset.type === "radial" ? "circle, " : ""}${preset.colors.join(", ")})`}
                                ></div>
                                <div
                                    class="absolute inset-0 bg-base-content/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                >
                                    <Icon
                                        icon="material-symbols:add"
                                        class="w-6 h-6 text-base-content"
                                    />
                                </div>
                            </div>
                            <div>
                                <h4
                                    class="font-medium text-sm text-base-content truncate"
                                    title={preset.name}
                                >
                                    {preset.name}
                                </h4>
                                <p
                                    class="text-xs text-base-content/60 capitalize"
                                >
                                    {preset.type} • {preset.colors.length} colors
                                </p>
                            </div>
                        </button>
                    {/each}
                </div>

                {#if filteredPresets.length === 0}
                    <div class="text-center py-12 text-base-content/70">
                        <Icon
                            icon="material-symbols:search-off"
                            class="h-12 w-12 mx-auto mb-2 opacity-50"
                        />
                        <p>No presets match your search</p>
                        <p class="text-xs">
                            Try a different search term or category
                        </p>
                    </div>
                {/if}
            </div>

            <div class="flex justify-end mt-6">
                <button
                    class="btn btn-ghost"
                    onclick={() => (showPresetsDialog = false)}
                    type="button"
                >
                    Close
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Context Menu for Color Stops -->
{#if contextMenu?.show}
    <div
        class="fixed bg-base-100 rounded-lg shadow-xl border border-base-300 py-2 z-50 context-menu"
        style:left="{contextMenu.x}px"
        style:top="{contextMenu.y}px"
    >
        <button
            class="flex items-center space-x-3 px-4 py-2 hover:bg-base-200 w-full text-left"
            onclick={duplicateColorStop}
            type="button"
        >
            <Icon icon="material-symbols:content-copy" class="h-4 w-4" />
            <span>Duplicate Stop</span>
        </button>
        <button
            class="flex items-center space-x-3 px-4 py-2 hover:bg-base-200 w-full text-left text-error"
            onclick={deleteColorStopFromContext}
            type="button"
        >
            <Icon icon="material-symbols:delete-outline" class="h-4 w-4" />
            <span>Delete Stop</span>
        </button>
    </div>
{/if}

<svelte:document onclick={handleDocumentClick} />

<style>
    .bg-primary-selected {
        background-color: hsl(var(--p) / 0.1);
    }

    /* Custom range slider styles */
    .range::-webkit-slider-thumb {
        background: hsl(var(--p));
    }

    .range::-webkit-slider-track {
        background: hsl(var(--bc) / 0.2);
    }
</style>
