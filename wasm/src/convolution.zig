const common = @import("common.zig");

/// Generic 3x3 convolution with intensity blending and bias offset.
/// Covers emboss (bias=128), sharpen (bias=0), and custom kernels.
export fn applyConvolution3x3(
    ptr: [*]u8,
    width: usize,
    height: usize,
    k0: f32,
    k1: f32,
    k2: f32,
    k3: f32,
    k4: f32,
    k5: f32,
    k6: f32,
    k7: f32,
    k8: f32,
    intensity: f32,
    bias: f32,
) void {
    const len = width * height * 4;
    const data = ptr[0..len];
    const factor = intensity / 100.0;
    const kernel = [9]f32{ k0, k1, k2, k3, k4, k5, k6, k7, k8 };

    // Allocate temp copy of source data
    const temp = common.allocator.alloc(u8, len) catch return;
    defer common.allocator.free(temp);
    @memcpy(temp, data);

    var y: usize = 1;
    while (y < height - 1) : (y += 1) {
        var x: usize = 1;
        while (x < width - 1) : (x += 1) {
            const i = (y * width + x) * 4;

            var ch: usize = 0;
            while (ch < 3) : (ch += 1) {
                var sum: f32 = 0;
                var ky: usize = 0;
                while (ky < 3) : (ky += 1) {
                    var kx: usize = 0;
                    while (kx < 3) : (kx += 1) {
                        const ki = ((y + ky - 1) * width + (x + kx - 1)) * 4;
                        const pixel_val: f32 = @floatFromInt(temp[ki + ch]);
                        sum += pixel_val * kernel[ky * 3 + kx];
                    }
                }

                const convolved = sum + bias;
                const original: f32 = @floatFromInt(temp[i + ch]);
                data[i + ch] = common.clamp(original * (1.0 - factor) + convolved * factor, 0, 255);
            }
        }
    }
}

/// Clarity via unsharp mask: box blur (radius 3) + midtone-weighted sharpening.
export fn applyClarity(ptr: [*]u8, width: usize, height: usize, clarity: f32) void {
    const len = width * height * 4;
    const data = ptr[0..len];
    const factor = clarity / 100.0;
    const radius: usize = 3;

    // Allocate blurred copy
    const blurred = common.allocator.alloc(u8, len) catch return;
    defer common.allocator.free(blurred);
    @memcpy(blurred, data);

    // Simple box blur (horizontal then vertical would be separable, but
    // for radius=3 a direct 2D pass is fast enough)
    var y: usize = radius;
    while (y < height - radius) : (y += 1) {
        var x: usize = radius;
        while (x < width - radius) : (x += 1) {
            var r_sum: u32 = 0;
            var g_sum: u32 = 0;
            var b_sum: u32 = 0;
            var count: u32 = 0;

            var dy: usize = 0;
            while (dy <= radius * 2) : (dy += 1) {
                var dx: usize = 0;
                while (dx <= radius * 2) : (dx += 1) {
                    const si = ((y + dy - radius) * width + (x + dx - radius)) * 4;
                    r_sum += data[si];
                    g_sum += data[si + 1];
                    b_sum += data[si + 2];
                    count += 1;
                }
            }

            const bi = (y * width + x) * 4;
            blurred[bi] = @intCast(r_sum / count);
            blurred[bi + 1] = @intCast(g_sum / count);
            blurred[bi + 2] = @intCast(b_sum / count);
        }
    }

    // Apply unsharp mask with mid-tone targeting
    var i: usize = 0;
    while (i < len) : (i += 4) {
        const r: f32 = @floatFromInt(data[i]);
        const g: f32 = @floatFromInt(data[i + 1]);
        const b: f32 = @floatFromInt(data[i + 2]);
        const br: f32 = @floatFromInt(blurred[i]);
        const bg: f32 = @floatFromInt(blurred[i + 1]);
        const bb: f32 = @floatFromInt(blurred[i + 2]);

        const lum = common.luminance(r, g, b) / 255.0;
        // Mid-tone weight: peaks at 0.5, falls off toward 0 and 1
        const mid_tone_raw = 1.0 - @abs(lum - 0.5) * 2.0;
        const mid_tone_weight = if (mid_tone_raw > 0.0) mid_tone_raw else 0.0;

        const amount = factor * mid_tone_weight * 1.5;

        data[i] = common.clamp(r + (r - br) * amount, 0, 255);
        data[i + 1] = common.clamp(g + (g - bg) * amount, 0, 255);
        data[i + 2] = common.clamp(b + (b - bb) * amount, 0, 255);
    }
}
