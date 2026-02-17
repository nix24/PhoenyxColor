const common = @import("common.zig");

export fn applyPosterize(ptr: [*]u8, len: usize, intensity: f32) void {
    const data = ptr[0..len];
    const levels = @max(2.0, @round(10.0 - (intensity / 100.0) * 8.0));
    const step = 255.0 / levels;

    var i: usize = 0;
    while (i < len) : (i += 4) {
        const r: f32 = @floatFromInt(data[i]);
        const g: f32 = @floatFromInt(data[i + 1]);
        const b: f32 = @floatFromInt(data[i + 2]);

        data[i] = common.clamp(@round(@floor(r / step) * step), 0, 255);
        data[i + 1] = common.clamp(@round(@floor(g / step) * step), 0, 255);
        data[i + 2] = common.clamp(@round(@floor(b / step) * step), 0, 255);
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

        const lum = common.luminance(r, g, b) / 255.0;

        const new_r = @as(f32, @floatFromInt(dr)) + (@as(f32, @floatFromInt(lr)) - @as(f32, @floatFromInt(dr))) * lum;
        const new_g = @as(f32, @floatFromInt(dg)) + (@as(f32, @floatFromInt(lg)) - @as(f32, @floatFromInt(dg))) * lum;
        const new_b = @as(f32, @floatFromInt(db)) + (@as(f32, @floatFromInt(lb)) - @as(f32, @floatFromInt(db))) * lum;

        data[i] = common.clamp(r * (1.0 - factor) + new_r * factor, 0, 255);
        data[i + 1] = common.clamp(g * (1.0 - factor) + new_g * factor, 0, 255);
        data[i + 2] = common.clamp(b * (1.0 - factor) + new_b * factor, 0, 255);
    }
}

export fn applyPixelate(ptr: [*]u8, width: usize, height: usize, intensity: f32) void {
    const data = ptr[0..(width * height * 4)];
    const pixelSize = @max(1, @as(usize, @intFromFloat((intensity / 100.0) * 20.0)));

    var y: usize = 0;
    while (y < height) : (y += pixelSize) {
        var x: usize = 0;
        while (x < width) : (x += pixelSize) {
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
