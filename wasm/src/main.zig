const std = @import("std");
const math = std.math;

// --- Memory Management ---

pub const allocator = std.heap.wasm_allocator;

// Exported function to allocate memory from JS
export fn alloc(len: usize) ?[*]u8 {
    const buf = allocator.alloc(u8, len) catch return null;
    return buf.ptr;
}

// Exported function to free memory from JS
export fn dealloc(ptr: [*]u8, len: usize) void {
    allocator.free(ptr[0..len]);
}

// --- Utils ---

inline fn clamp(val: f32, min: f32, max: f32) u8 {
    if (val < min) return @intFromFloat(min);
    if (val > max) return @intFromFloat(max);
    return @intFromFloat(val);
}

inline fn clamp_f32(val: f32, min: f32, max: f32) f32 {
    if (val < min) return min;
    if (val > max) return max;
    return val;
}

// --- Image Adjustments ---

// Apply temperature adjustment
export fn applyTemperature(ptr: [*]u8, len: usize, temp: f32) void {
    const data = ptr[0..len];
    const factor = temp / 100.0;

    // Pre-calculate deltas to avoid branches in the loop if possible,
    // but the branching logic depends on factor direction.
    // We'll keep the branch outside the inner loop logic or rely on branch prediction.

    var i: usize = 0;
    while (i < len) : (i += 4) {
        const r: f32 = @floatFromInt(data[i]);
        const g: f32 = @floatFromInt(data[i + 1]);
        const b: f32 = @floatFromInt(data[i + 2]);

        var new_r = r;
        var new_g = g;
        var new_b = b;

        if (factor > 0) {
            // Warm
            new_r = r + factor * 30.0;
            new_g = g + factor * 10.0;
            new_b = b - factor * 20.0;
        } else {
            // Cool
            new_r = r + factor * 20.0;
            new_g = g + factor * 5.0;
            new_b = b - factor * 30.0;
        }

        data[i] = clamp(new_r, 0, 255);
        data[i + 1] = clamp(new_g, 0, 255);
        data[i + 2] = clamp(new_b, 0, 255);
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

        // Tint formula:
        // Magenta (>0): r +(f*15), g -(f*20), b +(f*15)
        // Green (<0):   r +(f*15), g -(f*20), b +(f*15)
        // The formula is the same when using the signed factor.

        const new_r = r + factor * 15.0;
        const new_g = g - factor * 20.0;
        const new_b = b + factor * 15.0;

        data[i] = clamp(new_r, 0, 255);
        data[i + 1] = clamp(new_g, 0, 255);
        data[i + 2] = clamp(new_b, 0, 255);
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

        const lum = r * 0.299 + g * 0.587 + b * 0.114;
        const normLum = lum / 255.0;

        // Shadow adjustment
        const shadowWeight = if ((1.0 - normLum * 2.0) > 0.0) (1.0 - normLum * 2.0) else 0.0;
        const shadowAdjust = shadowWeight * shadowFactor * 50.0;

        // Highlight adjustment
        const highlightWeight = if (((normLum - 0.5) * 2.0) > 0.0) ((normLum - 0.5) * 2.0) else 0.0;
        const highlightAdjust = highlightWeight * highlightFactor * 50.0;

        const newLum = clamp_f32(lum + shadowAdjust + highlightAdjust, 0, 255);
        const lumRatio = if (lum > 0.01) newLum / lum else 1.0;

        data[i] = clamp(r * lumRatio, 0, 255);
        data[i + 1] = clamp(g * lumRatio, 0, 255);
        data[i + 2] = clamp(b * lumRatio, 0, 255);
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
        const gray = r * 0.299 + g * 0.587 + b * 0.114;

        if (adjustAmount > 0) {
            data[i] = clamp(r + (r - gray) * adjustAmount, 0, 255);
            data[i + 1] = clamp(g + (g - gray) * adjustAmount, 0, 255);
            data[i + 2] = clamp(b + (b - gray) * adjustAmount, 0, 255);
        } else {
            const desat = @abs(adjustAmount);
            data[i] = clamp(r + (gray - r) * desat, 0, 255);
            data[i + 1] = clamp(g + (gray - g) * desat, 0, 255);
            data[i + 2] = clamp(b + (gray - b) * desat, 0, 255);
        }
    }
}

// --- Effects ---

export fn applyPosterize(ptr: [*]u8, len: usize, intensity: f32) void {
    const data = ptr[0..len];
    const levels = @max(2.0, @round(10.0 - (intensity / 100.0) * 8.0));
    const step = 255.0 / levels;

    var i: usize = 0;
    while (i < len) : (i += 4) {
        // floor(val / step) * step
        const r: f32 = @floatFromInt(data[i]);
        const g: f32 = @floatFromInt(data[i + 1]);
        const b: f32 = @floatFromInt(data[i + 2]);

        data[i] = clamp(@round(@floor(r / step) * step), 0, 255);
        data[i + 1] = clamp(@round(@floor(g / step) * step), 0, 255);
        data[i + 2] = clamp(@round(@floor(b / step) * step), 0, 255);
    }
}

export fn applySolarize(ptr: [*]u8, len: usize, intensity: f32) void {
    const data = ptr[0..len];
    const threshold: u8 = @intFromFloat(255.0 * (1.0 - intensity / 100.0));

    var i: usize = 0;
    while (i < len) : (i += 4) {
        if (data[i] > threshold) data[i] = 255 - data[i];
        if (data[i + 1] > threshold) data[i + 1] = 255 - data[i + 1];
        if (data[i + 2] > threshold) data[i + 2] = 255 - data[i + 2];
    }
}

export fn applyDuotone(ptr: [*]u8, len: usize, intensity: f32, dr: u8, dg: u8, db: u8, lr: u8, lg: u8, lb: u8) void {
    const data = ptr[0..len];
    const factor = intensity / 100.0;

    var i: usize = 0;
    while (i < len) : (i += 4) {
        const r: f32 = @floatFromInt(data[i]);
        const g: f32 = @floatFromInt(data[i + 1]);
        const b: f32 = @floatFromInt(data[i + 2]);

        const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255.0;

        const new_r = @as(f32, @floatFromInt(dr)) + (@as(f32, @floatFromInt(lr)) - @as(f32, @floatFromInt(dr))) * lum;
        const new_g = @as(f32, @floatFromInt(dg)) + (@as(f32, @floatFromInt(lg)) - @as(f32, @floatFromInt(dg))) * lum;
        const new_b = @as(f32, @floatFromInt(db)) + (@as(f32, @floatFromInt(lb)) - @as(f32, @floatFromInt(db))) * lum;

        data[i] = clamp(r * (1.0 - factor) + new_r * factor, 0, 255);
        data[i + 1] = clamp(g * (1.0 - factor) + new_g * factor, 0, 255);
        data[i + 2] = clamp(b * (1.0 - factor) + new_b * factor, 0, 255);
    }
}

// Pixelate
export fn applyPixelate(ptr: [*]u8, width: usize, height: usize, intensity: f32) void {
    const data = ptr[0..(width * height * 4)];
    const pixelSize = @max(1, @as(usize, @intFromFloat((intensity / 100.0) * 20.0)));

    // We can't do this purely in-place safely without overwriting data we might need,
    // BUT since we are block averaging, we process block by block.
    // We iterate blocks.

    var y: usize = 0;
    while (y < height) : (y += pixelSize) {
        var x: usize = 0;
        while (x < width) : (x += pixelSize) {

            // Calculate Average
            var r_sum: u32 = 0;
            var g_sum: u32 = 0;
            var b_sum: u32 = 0;
            var count: u32 = 0;

            var py: usize = 0;
            while (py < pixelSize and y + py < height) : (py += 1) {
                var px: usize = 0;
                while (px < pixelSize and x + px < width) : (px += 1) {
                    const idx = ((y + py) * width + (x + px)) * 4;
                    r_sum += data[idx];
                    g_sum += data[idx + 1];
                    b_sum += data[idx + 2];
                    count += 1;
                }
            }

            if (count == 0) continue;

            const r_avg: u8 = @intCast(r_sum / count);
            const g_avg: u8 = @intCast(g_sum / count);
            const b_avg: u8 = @intCast(b_sum / count);

            // Fill Block
            py = 0;
            while (py < pixelSize and y + py < height) : (py += 1) {
                var px: usize = 0;
                while (px < pixelSize and x + px < width) : (px += 1) {
                    const idx = ((y + py) * width + (x + px)) * 4;
                    data[idx] = r_avg;
                    data[idx + 1] = g_avg;
                    data[idx + 2] = b_avg;
                }
            }
        }
    }
}

// --- K-Means Clustering for Palette Extraction ---

const Oklab = struct {
    l: f32,
    a: f32,
    b: f32,
};

fn rgbToOklab(r: u8, g: u8, b: u8) Oklab {
    const f_r = @as(f32, @floatFromInt(r)) / 255.0;
    const f_g = @as(f32, @floatFromInt(g)) / 255.0;
    const f_b = @as(f32, @floatFromInt(b)) / 255.0;

    // Linearize RGB (assuming sRGB input)
    // Approximate linearization for performance if needed, but here's proper sRGB
    const lin_r = if (f_r > 0.04045) std.math.pow(f32, (f_r + 0.055) / 1.055, 2.4) else f_r / 12.92;
    const lin_g = if (f_g > 0.04045) std.math.pow(f32, (f_g + 0.055) / 1.055, 2.4) else f_g / 12.92;
    const lin_b = if (f_b > 0.04045) std.math.pow(f32, (f_b + 0.055) / 1.055, 2.4) else f_b / 12.92;

    // RGB to linear LMS
    const l = 0.4122214708 * lin_r + 0.5363325363 * lin_g + 0.0514459929 * lin_b;
    const m = 0.2119034982 * lin_r + 0.6806995451 * lin_g + 0.1073969566 * lin_b;
    const s = 0.0883024619 * lin_r + 0.2817188376 * lin_g + 0.6299787005 * lin_b;

    // Cube root (approximate Oklab transform)
    const l_ = std.math.pow(f32, l, 0.333333333);
    const m_ = std.math.pow(f32, m, 0.333333333);
    const s_ = std.math.pow(f32, s, 0.333333333);

    return Oklab{
        .l = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
        .a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
        .b = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
    };
}

// Centroid struct for export
// We'll export a flat array of floats: [l, a, b, l, a, b...]
export fn runKMeans(img_ptr: [*]u8, len: usize, k: u32, iterations: u32, seed: u32) ?[*]f32 {

    // 1. Setup Data
    // We allocation a new buffer for the centroids result
    // Result size: k * 3 floats (L, A, B)
    const result_ptr = allocator.alloc(f32, k * 3) catch return null;

    // Parse Image to Oklab points
    // To save memory, we might convert on the fly OR allocate a points buffer.
    // Iterating over the byte buffer repeatedly is potentially slow due to conversion overhead.
    // But allocating a huge array of Structs in WASM might run OOM if image is big.
    // Since input is already downsampled (usually 128x128 or 256x256), memory is fine.

    var points = std.ArrayListUnmanaged(Oklab){};
    defer points.deinit(allocator);

    var i: usize = 0;
    while (i < len) : (i += 4) {
        // Skip transparent
        if (img_ptr[i + 3] < 128) continue;
        const lab = rgbToOklab(img_ptr[i], img_ptr[i + 1], img_ptr[i + 2]);
        points.append(allocator, lab) catch break;
    }

    const pixel_data = points.items;

    // 2. Initialize Centroids (Random Selection)
    var prng = std.Random.DefaultPrng.init(seed);
    const rand = prng.random();

    var centroids = std.ArrayListUnmanaged(Oklab){};
    defer centroids.deinit(allocator);

    // Naive initialization
    var c: u32 = 0;
    while (c < k) : (c += 1) {
        if (pixel_data.len > 0) {
            const idx = rand.uintLessThan(usize, pixel_data.len);
            centroids.append(allocator, pixel_data[idx]) catch break;
        } else {
            centroids.append(allocator, Oklab{ .l = 0, .a = 0, .b = 0 }) catch break;
        }
    }

    // 3. K-Means Loop
    const assignments = allocator.alloc(usize, pixel_data.len) catch return result_ptr.ptr;
    defer allocator.free(assignments);

    const cluster_counts = allocator.alloc(u32, k) catch return result_ptr.ptr;
    defer allocator.free(cluster_counts);

    const cluster_sums_l = allocator.alloc(f32, k) catch return result_ptr.ptr;
    defer allocator.free(cluster_sums_l);

    const cluster_sums_a = allocator.alloc(f32, k) catch return result_ptr.ptr;
    defer allocator.free(cluster_sums_a);

    const cluster_sums_b = allocator.alloc(f32, k) catch return result_ptr.ptr;
    defer allocator.free(cluster_sums_b);

    var iter: u32 = 0;
    while (iter < iterations) : (iter += 1) {
        // Assignment Step
        for (pixel_data, 0..) |p, p_idx| {
            var min_dist: f32 = 1000000.0;
            var best_c: usize = 0;

            for (centroids.items, 0..) |cent, c_idx| {
                const dist = (p.l - cent.l) * (p.l - cent.l) +
                    (p.a - cent.a) * (p.a - cent.a) +
                    (p.b - cent.b) * (p.b - cent.b);
                if (dist < min_dist) {
                    min_dist = dist;
                    best_c = c_idx;
                }
            }
            assignments[p_idx] = best_c;
        }

        // Update Step
        @memset(cluster_counts, 0);
        @memset(cluster_sums_l, 0);
        @memset(cluster_sums_a, 0);
        @memset(cluster_sums_b, 0);

        for (pixel_data, 0..) |p, p_idx| {
            const c_idx = assignments[p_idx];
            cluster_counts[c_idx] += 1;
            cluster_sums_l[c_idx] += p.l;
            cluster_sums_a[c_idx] += p.a;
            cluster_sums_b[c_idx] += p.b;
        }

        for (centroids.items, 0..) |*cent, c_idx| {
            const count = cluster_counts[c_idx];
            if (count > 0) {
                const f_count: f32 = @floatFromInt(count);
                cent.l = cluster_sums_l[c_idx] / f_count;
                cent.a = cluster_sums_a[c_idx] / f_count;
                cent.b = cluster_sums_b[c_idx] / f_count;
            }
        }
    }

    // Copy result to buffer
    for (centroids.items, 0..) |cent, index| {
        result_ptr[index * 3] = cent.l;
        result_ptr[index * 3 + 1] = cent.a;
        result_ptr[index * 3 + 2] = cent.b;
    }

    return result_ptr.ptr;
}
