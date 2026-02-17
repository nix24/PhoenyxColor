const common = @import("common.zig");

// Re-export all modules so WASM exports are visible
pub const adjustments = @import("adjustments.zig");
pub const effects = @import("effects.zig");
pub const convolution = @import("convolution.zig");
pub const stylize = @import("stylize.zig");
pub const clustering = @import("clustering.zig");

// --- Memory Management ---

export fn alloc(len: usize) ?[*]u8 {
    const buf = common.allocator.alloc(u8, len) catch return null;
    return buf.ptr;
}

export fn dealloc(ptr: [*]u8, len: usize) void {
    common.allocator.free(ptr[0..len]);
}

// Force exports from all modules
comptime {
    _ = adjustments;
    _ = effects;
    _ = convolution;
    _ = stylize;
    _ = clustering;
}
