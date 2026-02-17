const std = @import("std");
const common = @import("common.zig");

const Oklab = struct {
    l: f32,
    a: f32,
    b: f32,
};

fn rgbToOklab(r: u8, g: u8, b: u8) Oklab {
    const f_r = @as(f32, @floatFromInt(r)) / 255.0;
    const f_g = @as(f32, @floatFromInt(g)) / 255.0;
    const f_b = @as(f32, @floatFromInt(b)) / 255.0;

    const lin_r = if (f_r > 0.04045) std.math.pow(f32, (f_r + 0.055) / 1.055, 2.4) else f_r / 12.92;
    const lin_g = if (f_g > 0.04045) std.math.pow(f32, (f_g + 0.055) / 1.055, 2.4) else f_g / 12.92;
    const lin_b = if (f_b > 0.04045) std.math.pow(f32, (f_b + 0.055) / 1.055, 2.4) else f_b / 12.92;

    const l = 0.4122214708 * lin_r + 0.5363325363 * lin_g + 0.0514459929 * lin_b;
    const m = 0.2119034982 * lin_r + 0.6806995451 * lin_g + 0.1073969566 * lin_b;
    const s = 0.0883024619 * lin_r + 0.2817188376 * lin_g + 0.6299787005 * lin_b;

    const l_ = std.math.pow(f32, l, 0.333333333);
    const m_ = std.math.pow(f32, m, 0.333333333);
    const s_ = std.math.pow(f32, s, 0.333333333);

    return Oklab{
        .l = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
        .a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
        .b = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
    };
}

export fn runKMeans(img_ptr: [*]u8, len: usize, k: u32, iterations: u32, seed: u32) ?[*]f32 {
    const result_ptr = common.allocator.alloc(f32, k * 3) catch return null;

    var points = std.ArrayListUnmanaged(Oklab){};
    defer points.deinit(common.allocator);

    var i: usize = 0;
    while (i < len) : (i += 4) {
        if (img_ptr[i + 3] < 128) continue;
        const lab = rgbToOklab(img_ptr[i], img_ptr[i + 1], img_ptr[i + 2]);
        points.append(common.allocator, lab) catch break;
    }

    const pixel_data = points.items;

    var prng = std.Random.DefaultPrng.init(seed);
    const rand = prng.random();

    var centroids = std.ArrayListUnmanaged(Oklab){};
    defer centroids.deinit(common.allocator);

    var c: u32 = 0;
    while (c < k) : (c += 1) {
        if (pixel_data.len > 0) {
            const idx = rand.uintLessThan(usize, pixel_data.len);
            centroids.append(common.allocator, pixel_data[idx]) catch break;
        } else {
            centroids.append(common.allocator, Oklab{ .l = 0, .a = 0, .b = 0 }) catch break;
        }
    }

    const assignments = common.allocator.alloc(usize, pixel_data.len) catch return result_ptr.ptr;
    defer common.allocator.free(assignments);

    const cluster_counts = common.allocator.alloc(u32, k) catch return result_ptr.ptr;
    defer common.allocator.free(cluster_counts);

    const cluster_sums_l = common.allocator.alloc(f32, k) catch return result_ptr.ptr;
    defer common.allocator.free(cluster_sums_l);

    const cluster_sums_a = common.allocator.alloc(f32, k) catch return result_ptr.ptr;
    defer common.allocator.free(cluster_sums_a);

    const cluster_sums_b = common.allocator.alloc(f32, k) catch return result_ptr.ptr;
    defer common.allocator.free(cluster_sums_b);

    var iter: u32 = 0;
    while (iter < iterations) : (iter += 1) {
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

    for (centroids.items, 0..) |cent, index| {
        result_ptr[index * 3] = cent.l;
        result_ptr[index * 3 + 1] = cent.a;
        result_ptr[index * 3 + 2] = cent.b;
    }

    return result_ptr.ptr;
}
