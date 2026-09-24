declare const BrandSym: unique symbol;

export type Brand<K, T> = K & { readonly [BrandSym]: T };

export type PaletteId = Brand<string, "PaletteId">;
export type GradientId = Brand<string, "GradientId">;
export type ReferenceId = Brand<string, "ReferenceId">;
