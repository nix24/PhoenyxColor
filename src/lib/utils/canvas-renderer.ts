import type { ImageEditorState, AppliedEffect } from "$lib/components/editor/EditorHistory.svelte";
import { applyAllAdjustments, applyCurves } from "$lib/utils/image-processing";
import { applyEffect, type EffectType } from "$lib/utils/effects-processing";

/**
 * Load an image from a source URL
 */
export async function loadImage(src: string): Promise<HTMLImageElement> {
    const img = new Image();
    img.crossOrigin = "anonymous";
    return new Promise((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

/**
 * Render the image with all effects applied to a canvas
 */
export async function renderCanvasImage(
    canvas: HTMLCanvasElement,
    image: HTMLImageElement,
    state: ImageEditorState,
    options: {
        previewEffect?: {
            type: EffectType;
            intensity: number;
            duotoneColors?: [string, string] | undefined;
        } | undefined;
        maxSize?: number;
    } = {}
): Promise<void> {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Could not get canvas context");

    let width = image.naturalWidth;
    let height = image.naturalHeight;

    // Resize if max size is specified
    if (options.maxSize) {
        if (width > options.maxSize || height > options.maxSize) {
            const scale = Math.min(options.maxSize / width, options.maxSize / height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
        }
    }

    canvas.width = width;
    canvas.height = height;

    // Apply basic CSS-achievable filters first (using ctx.filter)
    const basicFilters: string[] = [];
    if (state.isGrayscale) basicFilters.push("grayscale(100%)");
    if (state.sepia) basicFilters.push(`sepia(${state.sepia}%)`);
    if (state.invert) basicFilters.push(`invert(${state.invert}%)`);
    if (state.brightness !== 100) basicFilters.push(`brightness(${state.brightness}%)`);
    if (state.contrast !== 100) basicFilters.push(`contrast(${state.contrast}%)`);
    if (state.saturation !== 100) basicFilters.push(`saturate(${state.saturation}%)`);
    if (state.hueRotate !== 0) basicFilters.push(`hue-rotate(${state.hueRotate}deg)`);

    if (basicFilters.length > 0) {
        ctx.filter = basicFilters.join(" ");
    }

    // Apply transforms
    ctx.save();
    ctx.translate(width / 2, height / 2);
    if (state.flipX) ctx.scale(-1, 1);
    if (state.flipY) ctx.scale(1, -1);
    ctx.rotate((state.rotation * Math.PI) / 180);
    ctx.translate(-width / 2, -height / 2);
    ctx.drawImage(image, 0, 0, width, height);
    ctx.restore();

    // Reset filter for pixel manipulation
    ctx.filter = "none";

    // Apply curves (RGB and Channels)
    if (state.curves) {
        applyCurves(ctx, width, height, state.curves);
    }

    // Apply temperature and tint
    if (state.temperature !== 0 || state.tint !== 0) {
        applyAllAdjustments(ctx, width, height, {
            temperature: state.temperature,
            tint: state.tint,
        });
    }

    // Apply shadows/highlights/vibrance/clarity
    if (
        state.shadows !== 0 ||
        state.highlights !== 0 ||
        state.vibrance !== 0 ||
        state.clarity !== 0
    ) {
        applyAllAdjustments(ctx, width, height, {
            shadows: state.shadows,
            highlights: state.highlights,
            vibrance: state.vibrance,
            clarity: state.clarity,
        });
    }

    // Apply all stacked effects from state
    const appliedEffects = state.appliedEffects || [];
    for (const effect of appliedEffects) {
        if (effect.type !== "none") {
            applyEffect(
                ctx,
                width,
                height,
                effect.type as EffectType,
                effect.intensity,
                effect.duotoneColors
            );
        }
    }

    // Apply current preview effect (not yet applied to stack)
    if (options.previewEffect && options.previewEffect.type !== "none") {
        applyEffect(
            ctx,
            width,
            height,
            options.previewEffect.type,
            options.previewEffect.intensity,
            options.previewEffect.duotoneColors
        );
    }
}

