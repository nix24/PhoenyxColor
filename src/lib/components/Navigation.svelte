<script lang="ts">
    import { appStore } from "$lib/stores/app.svelte";
    import Icon from "@iconify/svelte";
    import { onMount } from "svelte";
    import { themeChange } from "theme-change";
    import EyedropperTool from "$lib/components/common/EyedropperTool.svelte";

    interface NavItem {
        id: "references" | "palettes" | "gradients" | "settings" | "tutorials";
        label: string;
        icon: string;
        description: string;
    }

    const navItems: NavItem[] = [
        {
            id: "references",
            label: "References",
            icon: "material-symbols:image-outline",
            description: "Manage reference images",
        },
        {
            id: "palettes",
            label: "Palettes",
            icon: "material-symbols:palette-outline",
            description: "Create and edit color palettes",
        },
        {
            id: "gradients",
            label: "Gradients",
            icon: "material-symbols:gradient",
            description: "Generate beautiful gradients",
        },
    ];

    let hoveredItem: string | null = $state(null);

    // Initialize theme-change on mount
    onMount(() => {
        themeChange(false);
    });
</script>

<nav class="navbar bg-base-100 shadow-lg border-b border-base-300">
    <!-- Logo/Brand -->
    <div class="navbar-start">
        <div class="flex items-center space-x-3">
            <div class="avatar placeholder">
                <div
                    class="bg-gradient-to-br from-primary to-secondary rounded-lg w-10 text-primary-content"
                >
                    <Icon icon="material-symbols:brush" class="text-4xl" />
                </div>
            </div>
            <div class="hidden sm:block">
                <h1 class="text-xl font-bold text-base-content">
                    PhoenyxColor
                </h1>
                <p class="text-xs text-base-content/70">
                    Artist's Workflow Suite
                </p>
            </div>
        </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="navbar-center">
        <div class="tabs tabs-boxed bg-base-200">
            {#each navItems as item (item.id)}
                <button
                    class="tab tab-lg relative"
                    class:tab-active={appStore.activeModule === item.id}
                    onclick={() => appStore.setActiveModule(item.id)}
                    onmouseenter={() => (hoveredItem = item.id)}
                    onmouseleave={() => (hoveredItem = null)}
                    type="button"
                    aria-label="Switch to {item.label} module"
                >
                    <Icon
                        icon={item.icon}
                        class="text-lg {appStore.activeModule === item.id
                            ? 'text-primary'
                            : 'text-base-content/70'}"
                    />
                    <span class="hidden sm:inline ml-2">{item.label}</span>

                    <!-- Improved tooltip positioning -->
                    {#if hoveredItem === item.id && hoveredItem !== appStore.activeModule}
                        <div class="tooltip-container">
                            <div class="tooltip-content">
                                {item.description}
                            </div>
                        </div>
                    {/if}
                </button>
            {/each}
        </div>
    </div>

    <!-- Utility Actions -->
    <div class="navbar-end">
        <div class="flex items-center space-x-1">
            <!-- Global Color Buffer Display -->
            {#if appStore.state.globalColorBuffer}
                <div
                    class="flex items-center space-x-2 px-3 py-1 bg-base-200 rounded-lg border border-base-300"
                >
                    <div
                        onkeydown={(e) => {
                            if (e.key === "Enter") {
                                navigator.clipboard.writeText(
                                    appStore.state.globalColorBuffer!,
                                );
                            }
                        }}
                        role="button"
                        tabindex="0"
                        class="w-6 h-6 rounded border border-base-300 cursor-pointer"
                        style:background-color={appStore.state
                            .globalColorBuffer}
                        onclick={() => {
                            navigator.clipboard.writeText(
                                appStore.state.globalColorBuffer!,
                            );
                            // Could add toast notification here
                        }}
                        title="Click to copy: {appStore.state
                            .globalColorBuffer}"
                    ></div>
                    <span class="text-xs font-mono text-base-content/70">
                        {appStore.state.globalColorBuffer}
                    </span>
                    <button
                        class="btn btn-xs btn-ghost"
                        onclick={() => appStore.clearGlobalColor()}
                        title="Clear global color"
                        aria-label="Clear global color buffer"
                    >
                        <Icon icon="material-symbols:close" class="w-3 h-3" />
                    </button>
                </div>
            {/if}

            <!-- Enhanced Eyedropper Tool -->
            <EyedropperTool
                buttonClass="btn btn-circle btn-ghost"
                buttonLabel=""
                onColorPicked={(color) => {
                    // Color is automatically stored in global buffer by the tool
                    // Could add additional logic here if needed
                }}
            />

            <!-- Tutorials -->
            <button
                class="btn btn-circle btn-ghost"
                class:btn-primary={appStore.activeModule === "tutorials"}
                onclick={() => appStore.setActiveModule("tutorials")}
                type="button"
                aria-label="Open tutorials"
                title="Tutorials & Help"
            >
                <Icon
                    icon="material-symbols:help-outline"
                    class="text-lg {appStore.activeModule === 'tutorials'
                        ? 'text-primary-content'
                        : 'text-base-content'}"
                />
            </button>

            <!-- Settings -->
            <button
                class="btn btn-circle btn-ghost"
                class:btn-primary={appStore.activeModule === "settings"}
                onclick={() => appStore.setActiveModule("settings")}
                type="button"
                aria-label="Open settings"
                title="Settings"
            >
                <Icon
                    icon="material-symbols:settings-outline"
                    class="text-lg {appStore.activeModule === 'settings'
                        ? 'text-primary-content'
                        : 'text-base-content'}"
                />
            </button>
        </div>
    </div>
</nav>

<style>
    .tooltip-container {
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        z-index: 50;
        margin-top: 8px;
        pointer-events: none;
    }

    .tooltip-content {
        background: hsl(var(--b1));
        color: hsl(var(--bc));
        border: 1px solid hsl(var(--b3));
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 0.75rem;
        white-space: nowrap;
        box-shadow:
            0 4px 6px -1px rgb(0 0 0 / 0.1),
            0 2px 4px -2px rgb(0 0 0 / 0.1);
        animation: fadeInUp 0.2s ease-out forwards;
    }

    .tooltip-content::before {
        content: "";
        position: absolute;
        top: -4px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        border-bottom: 4px solid hsl(var(--b1));
    }

    .tab {
        transition: all 0.2s ease-out;
    }

    .tab:hover {
        transform: translateY(-1px);
    }

    /* Active class styling for theme buttons */
    /* .ACTIVECLASS {
        background: hsl(var(--p));
        color: hsl(var(--pc));
    } */
</style>
