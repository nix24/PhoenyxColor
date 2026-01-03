const std = @import("std");

pub fn build(b: *std.Build) void {
    // Define the target for WebAssembly with no OS (freestanding)
    const target = b.resolveTargetQuery(.{
        .cpu_arch = .wasm32,
        .os_tag = .freestanding,
    });

    // Use ReleaseFast for production, allow override with -Doptimize=...
    const optimize = b.standardOptimizeOption(.{
        .preferred_optimize_mode = .ReleaseFast,
    });

    // Create the executable (WASM module)
    const wasm = b.addExecutable(.{
        .name = "phoenyx-color",
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/main.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });

    // WASM library (no main function) requires entry to be disabled
    wasm.entry = .disabled;

    // Ensure exported functions are included in the output
    wasm.rdynamic = true;

    // Install the WASM file directly to ../../static/ folder (relative to zig-out/prefix)
    const install_wasm = b.addInstallFile(wasm.getEmittedBin(), "../../static/phoenyx-color.wasm");
    b.getInstallStep().dependOn(&install_wasm.step);
}
