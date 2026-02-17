const common = @import("common.zig");

// Apply temperature adjustment
export fn applyTemperature(ptr: [*]u8, len: usize, temp: f32) void {
    const data = ptr[0..len];
    const factor = temp / 100.0;

    var i: usize = 0;
    while (i < len) : (i += 4) {
        const r: f32 = @floatFromInt(data[i]);
        const g: f32 = @floatFromInt(data[i + 1]);
        const b: f32 = @floatFromInt(data[i + 2]);

        var new_r = r;
        var new_g = g;
        var new_b = b;

        if (factor > 0) {
            new_r = r + factor * 30.0;
            new_g = g + factor * 10.0;
            new_b = b - factor * 20.0;
        } else {
            new_r = r + factor * 20.0;
            new_g = g + factor * 5.0;
            new_b = b - factor * 30.0;
        }

        data[i] = common.clamp(new_r, 0, 255);
        data[i + 1] = common.clamp(new_g, 0, 255);
        data[i + 2] = common.clamp(new_b, 0, 255);
    }
}

// Apply tint adjustment
export fn applyTint(ptr: [*]u8, len: usize, tint: f32) void {
    const data = ptr[0..len];
    const factor = tint / 100.0;

    var i: usize = 0;
    while (i < len) : (i += 4) {
        const r: f32 = @floatFromInt(data[i]);
        const g: f32 = @floatFromInt(data[i + 1]);
        const b: f32 = @floatFromInt(data[i + 2]);

        const new_r = r + factor * 15.0;
        const new_g = g - factor * 20.0;
        const new_b = b + factor * 15.0;

        data[i] = common.clamp(new_r, 0, 255);
        data[i + 1] = common.clamp(new_g, 0, 255);
        data[i + 2] = common.clamp(new_b, 0, 255);
    }
}

// Shadows and Highlights
export fn applyShadowsHighlights(ptr: [*]u8, len: usize, shadows: f32, highlights: f32) void {
    const data = ptr[0..len];
    const shadowFactor = shadows / 100.0;
    const highlightFactor = highlights / 100.0;

    var i: usize = 0;
    while (i < len) : (i += 4) {
        const r: f32 = @floatFromInt(data[i]);
        const g: f32 = @floatFromInt(data[i + 1]);
        const b: f32 = @floatFromInt(data[i + 2]);

        const lum = common.luminance(r, g, b);
        const normLum = lum / 255.0;

        const shadowWeight = if ((1.0 - normLum * 2.0) > 0.0) (1.0 - normLum * 2.0) else 0.0;
        const shadowAdjust = shadowWeight * shadowFactor * 50.0;

        const highlightWeight = if (((normLum - 0.5) * 2.0) > 0.0) ((normLum - 0.5) * 2.0) else 0.0;
        const highlightAdjust = highlightWeight * highlightFactor * 50.0;

        const newLum = common.clampF32(lum + shadowAdjust + highlightAdjust, 0, 255);
        const lumRatio = if (lum > 0.01) newLum / lum else 1.0;

        data[i] = common.clamp(r * lumRatio, 0, 255);
        data[i + 1] = common.clamp(g * lumRatio, 0, 255);
        data[i + 2] = common.clamp(b * lumRatio, 0, 255);
    }
}

// Vibrance
export fn applyVibrance(ptr: [*]u8, len: usize, vibrance: f32) void {
    const data = ptr[0..len];
    const factor = vibrance / 100.0;

    var i: usize = 0;
    while (i < len) : (i += 4) {
        const r: f32 = @floatFromInt(data[i]);
        const g: f32 = @floatFromInt(data[i + 1]);
        const b: f32 = @floatFromInt(data[i + 2]);

        const max_val = @max(r, @max(g, b));
        const min_val = @min(r, @min(g, b));
        const saturation = if (max_val > 0.0) (max_val - min_val) / max_val else 0.0;

        const adjustAmount = factor * (1.0 - saturation) * 0.5;
        const gray = common.luminance(r, g, b);

        if (adjustAmount > 0) {
            data[i] = common.clamp(r + (r - gray) * adjustAmount, 0, 255);
            data[i + 1] = common.clamp(g + (g - gray) * adjustAmount, 0, 255);
            data[i + 2] = common.clamp(b + (b - gray) * adjustAmount, 0, 255);
        } else {
            const desat = @abs(adjustAmount);
            data[i] = common.clamp(r + (gray - r) * desat, 0, 255);
            data[i + 1] = common.clamp(g + (gray - g) * desat, 0, 255);
            data[i + 2] = common.clamp(b + (gray - b) * desat, 0, 255);
        }
    }
}
