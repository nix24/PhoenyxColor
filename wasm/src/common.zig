const std = @import("std");

pub const allocator = std.heap.wasm_allocator;

pub inline fn clamp(val: f32, min_v: f32, max_v: f32) u8 {
    if (val < min_v) return @intFromFloat(min_v);
    if (val > max_v) return @intFromFloat(max_v);
    return @intFromFloat(val);
}

pub inline fn clampF32(val: f32, min_v: f32, max_v: f32) f32 {
    if (val < min_v) return min_v;
    if (val > max_v) return max_v;
    return val;
}

pub inline fn luminance(r: f32, g: f32, b: f32) f32 {
    return r * 0.299 + g * 0.587 + b * 0.114;
}
