const std = @import("std");
const common = @import("common.zig");

/// Halftone: block-based luminance sampling, threshold-based fill.
export fn applyHalftone(ptr: [*]u8, width: usize, height: usize, intensity: f32) void {
    const data = ptr[0..(width * height * 4)];
    const factor = intensity / 100.0;
    const dot_size = @max(2, @as(usize, @intFromFloat(factor * 8.0)));
    const spacing = dot_size * 2;

    // Allocate output buffer (white background)
    const len = width * height * 4;
    const output = common.allocator.alloc(u8, len) catch return;
    defer common.allocator.free(output);
    @memset(output, 255);

    // Ensure alpha channel is copied
    var ai: usize = 3;
    while (ai < len) : (ai += 4) {
        output[ai] = data[ai];
    }

    // Draw halftone dots
    var y: usize = 0;
    while (y < height) : (y += spacing) {
        var x: usize = 0;
        while (x < width) : (x += spacing) {
            // Sample average luminance in block
            var total_lum: f32 = 0;
            var count: u32 = 0;

            var sy: usize = 0;
            while (sy < spacing and y + sy < height) : (sy += 1) {
                var sx: usize = 0;
                while (sx < spacing and x + sx < width) : (sx += 1) {
                    const i = ((y + sy) * width + (x + sx)) * 4;
                    const r: f32 = @floatFromInt(data[i]);
                    const g: f32 = @floatFromInt(data[i + 1]);
                    const b: f32 = @floatFromInt(data[i + 2]);
                    total_lum += common.luminance(r, g, b) / 255.0;
                    count += 1;
                }
            }

            if (count == 0) continue;
            const avg_lum = total_lum / @as(f32, @floatFromInt(count));
            const radius = (1.0 - avg_lum) * @as(f32, @floatFromInt(dot_size));

            if (radius < 0.5) continue;

            // Fill circle pixels (rasterize)
            const cx = x + spacing / 2;
            const cy = y + spacing / 2;
            const r_int = @as(usize, @intFromFloat(@ceil(radius)));

            var dy: usize = 0;
            while (dy <= r_int * 2) : (dy += 1) {
                const py_signed: i64 = @as(i64, @intCast(cy)) + @as(i64, @intCast(dy)) - @as(i64, @intCast(r_int));
                if (py_signed < 0 or py_signed >= @as(i64, @intCast(height))) continue;
                const py: usize = @intCast(py_signed);

                var dx: usize = 0;
                while (dx <= r_int * 2) : (dx += 1) {
                    const px_signed: i64 = @as(i64, @intCast(cx)) + @as(i64, @intCast(dx)) - @as(i64, @intCast(r_int));
                    if (px_signed < 0 or px_signed >= @as(i64, @intCast(width))) continue;
                    const px: usize = @intCast(px_signed);

                    const fdx = @as(f32, @floatFromInt(px_signed)) - @as(f32, @floatFromInt(cx));
                    const fdy = @as(f32, @floatFromInt(py_signed)) - @as(f32, @floatFromInt(cy));
                    if (fdx * fdx + fdy * fdy <= radius * radius) {
                        const oi = (py * width + px) * 4;
                        output[oi] = 0;
                        output[oi + 1] = 0;
                        output[oi + 2] = 0;
                    }
                }
            }
        }
    }

    // Blend output with original based on intensity
    var i: usize = 0;
    while (i < len) : (i += 4) {
        const orig_r: f32 = @floatFromInt(data[i]);
        const orig_g: f32 = @floatFromInt(data[i + 1]);
        const orig_b: f32 = @floatFromInt(data[i + 2]);
        const out_r: f32 = @floatFromInt(output[i]);
        const out_g: f32 = @floatFromInt(output[i + 1]);
        const out_b: f32 = @floatFromInt(output[i + 2]);

        data[i] = common.clamp(orig_r * (1.0 - factor) + out_r * factor, 0, 255);
        data[i + 1] = common.clamp(orig_g * (1.0 - factor) + out_g * factor, 0, 255);
        data[i + 2] = common.clamp(orig_b * (1.0 - factor) + out_b * factor, 0, 255);
    }
}

/// VHS: chromatic aberration + scanlines + seeded noise.
export fn applyVHS(ptr: [*]u8, width: usize, height: usize, intensity: f32, seed: u32) void {
    const len = width * height * 4;
    const data = ptr[0..len];
    const factor = intensity / 100.0;
    const offset = @as(usize, @intFromFloat(@round(factor * 5.0)));

    // Allocate temp copy for channel reads
    const temp = common.allocator.alloc(u8, len) catch return;
    defer common.allocator.free(temp);
    @memcpy(temp, data);

    // Chromatic aberration
    var y: usize = 0;
    while (y < height) : (y += 1) {
        var x: usize = 0;
        while (x < width) : (x += 1) {
            const i = (y * width + x) * 4;

            // Shift red channel left
            const red_x = if (x >= offset) x - offset else 0;
            const red_i = (y * width + red_x) * 4;
            data[i] = temp[red_i];

            // Green stays
            data[i + 1] = temp[i + 1];

            // Shift blue channel right
            const blue_x = @min(width - 1, x + offset);
            const blue_i = (y * width + blue_x) * 4;
            data[i + 2] = temp[blue_i + 2];
        }
    }

    // Scanlines
    const scan_spacing: usize = 3;
    y = 0;
    while (y < height) : (y += scan_spacing) {
        var x: usize = 0;
        while (x < width) : (x += 1) {
            const i = (y * width + x) * 4;
            const darkening = 0.8 + (1.0 - factor) * 0.2;
            data[i] = common.clamp(@as(f32, @floatFromInt(data[i])) * darkening, 0, 255);
            data[i + 1] = common.clamp(@as(f32, @floatFromInt(data[i + 1])) * darkening, 0, 255);
            data[i + 2] = common.clamp(@as(f32, @floatFromInt(data[i + 2])) * darkening, 0, 255);
        }
    }

    // Seeded noise
    var prng = std.Random.DefaultPrng.init(seed);
    const rand = prng.random();
    const noise_amount = factor * 20.0;

    var i: usize = 0;
    while (i < len) : (i += 4) {
        // Generate noise in range [-0.5, 0.5) * noise_amount
        const noise = (@as(f32, @floatFromInt(rand.int(u16))) / 65535.0 - 0.5) * noise_amount;
        data[i] = common.clamp(@as(f32, @floatFromInt(data[i])) + noise, 0, 255);
        data[i + 1] = common.clamp(@as(f32, @floatFromInt(data[i + 1])) + noise, 0, 255);
        data[i + 2] = common.clamp(@as(f32, @floatFromInt(data[i + 2])) + noise, 0, 255);
    }
}

/// Glitch: RGB channel offset + seeded horizontal slice displacement.
export fn applyGlitch(ptr: [*]u8, width: usize, height: usize, intensity: f32, seed: u32) void {
    const len = width * height * 4;
    const data = ptr[0..len];
    const factor = intensity / 100.0;
    const channel_offset = @as(usize, @intFromFloat(@round(factor * 10.0)));

    // Allocate temp copy
    const temp = common.allocator.alloc(u8, len) catch return;
    defer common.allocator.free(temp);
    @memcpy(temp, data);

    // RGB channel offset
    var y: usize = 0;
    while (y < height) : (y += 1) {
        var x: usize = 0;
        while (x < width) : (x += 1) {
            const i = (y * width + x) * 4;

            const red_x = if (x >= channel_offset) x - channel_offset else 0;
            const red_i = (y * width + red_x) * 4;
            data[i] = temp[red_i];

            data[i + 1] = temp[i + 1];

            const blue_x = @min(width - 1, x + channel_offset);
            const blue_i = (y * width + blue_x) * 4;
            data[i + 2] = temp[blue_i + 2];
        }
    }

    // Horizontal slice displacement
    var prng = std.Random.DefaultPrng.init(seed);
    const rand = prng.random();
    const num_slices = @as(usize, @intFromFloat(@round(factor * 10.0)));
    const slice_height = @max(1, height / 20);

    var s: usize = 0;
    while (s < num_slices) : (s += 1) {
        const slice_y = rand.uintLessThan(usize, if (height > slice_height) height - slice_height else 1);
        const disp_raw = @as(i32, @intFromFloat((@as(f32, @floatFromInt(rand.int(u16))) / 65535.0 - 0.5) * factor * 30.0));

        var sy: usize = slice_y;
        while (sy < slice_y + slice_height and sy < height) : (sy += 1) {
            var sx: usize = 0;
            while (sx < width) : (sx += 1) {
                const src_x_signed = @as(i32, @intCast(sx)) + disp_raw;
                const src_x: usize = if (src_x_signed < 0)
                    0
                else if (src_x_signed >= @as(i32, @intCast(width)))
                    width - 1
                else
                    @intCast(src_x_signed);

                const src_i = (sy * width + src_x) * 4;
                const dst_i = (sy * width + sx) * 4;

                data[dst_i] = temp[src_i];
                data[dst_i + 1] = temp[src_i + 1];
                data[dst_i + 2] = temp[src_i + 2];
            }
        }
    }
}
