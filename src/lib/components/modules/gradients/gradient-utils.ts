// Gradient Studio Utilities
import chroma from "chroma-js";
import type { ValidatedGradient, ValidatedGradientStop } from "$lib/schemas/validation";

// --- Types ---

export type GradientType = "linear" | "radial" | "conic" | "mesh";
export type InterpolationMode = "oklch" | "oklab" | "rgb" | "hsl" | "lab" | "lch";
export type EasingType = "linear" | "ease-in" | "ease-out" | "ease-in-out";

export interface MeshPoint {
	id: string;
	x: number; // 0-100 percentage
	y: number; // 0-100 percentage
	color: string;
	radius: number; // Influence radius
}

export interface GradientPreset {
	name: string;
	colors: string[];
	category: PresetCategory;
	type: GradientType;
	angle?: number;
	description?: string;
}

export type PresetCategory =
	| "trending"
	| "nature"
	| "vibrant"
	| "dark"
	| "pastel"
	| "holographic"
	| "glassmorphism"
	| "aurora"
	| "duotone"
	| "mesh";

export interface NoiseConfig {
	enabled: boolean;
	intensity: number; // 0-100
	scale: number; // 0.1-10
	type: "perlin" | "simplex" | "grain";
}

export type MoodType = "calm" | "energetic" | "corporate" | "playful" | "luxury" | "natural";

// --- Constants ---

export const INTERPOLATION_MODES: { id: InterpolationMode; name: string; description: string }[] = [
	{ id: "oklch", name: "OKLCH", description: "Perceptually uniform, best for most gradients" },
	{ id: "oklab", name: "OKLab", description: "Perceptually uniform lightness" },
	{ id: "lab", name: "LAB", description: "Device-independent color space" },
	{ id: "lch", name: "LCH", description: "Cylindrical LAB, good for hue transitions" },
	{ id: "hsl", name: "HSL", description: "Classic hue-saturation-lightness" },
	{ id: "rgb", name: "RGB", description: "Simple linear interpolation" },
];

export const EASING_TYPES: { id: EasingType; name: string }[] = [
	{ id: "linear", name: "Linear" },
	{ id: "ease-in", name: "Ease In" },
	{ id: "ease-out", name: "Ease Out" },
	{ id: "ease-in-out", name: "Ease In-Out" },
];

export const PRESET_CATEGORIES: { id: PresetCategory; name: string; icon: string }[] = [
	{ id: "trending", name: "Trending", icon: "material-symbols:trending-up" },
	{ id: "nature", name: "Nature", icon: "material-symbols:eco" },
	{ id: "vibrant", name: "Vibrant", icon: "material-symbols:electric-bolt" },
	{ id: "dark", name: "Dark", icon: "material-symbols:dark-mode" },
	{ id: "pastel", name: "Pastel", icon: "material-symbols:cloud" },
	{ id: "holographic", name: "Holographic", icon: "material-symbols:blur-on" },
	{ id: "glassmorphism", name: "Glass", icon: "material-symbols:blur-circular" },
	{ id: "aurora", name: "Aurora", icon: "material-symbols:nights-stay" },
	{ id: "duotone", name: "Duotone", icon: "material-symbols:contrast" },
	{ id: "mesh", name: "Mesh", icon: "material-symbols:grid-4x4" },
];

// --- Enhanced Gradient Presets ---

export const GRADIENT_PRESETS: GradientPreset[] = [
	// Trending
	{
		name: "Sunset Vibes",
		colors: ["#ff9a9e", "#fecfef", "#fecfef"],
		category: "trending",
		type: "linear",
		angle: 135,
	},
	{
		name: "Ocean Breeze",
		colors: ["#667eea", "#764ba2"],
		category: "trending",
		type: "linear",
		angle: 45,
	},
	{
		name: "Northern Lights",
		colors: ["#00c3f7", "#9921e8"],
		category: "trending",
		type: "radial",
	},
	{
		name: "Cyber Wave",
		colors: ["#4facfe", "#00f2fe"],
		category: "trending",
		type: "linear",
		angle: 90,
	},
	{
		name: "Peach Blossom",
		colors: ["#ffecd2", "#fcb69f"],
		category: "trending",
		type: "linear",
		angle: 120,
	},

	// Nature
	{
		name: "Forest Dawn",
		colors: ["#134e5e", "#71b280"],
		category: "nature",
		type: "linear",
		angle: 45,
	},
	{
		name: "Desert Sand",
		colors: ["#ffeaa7", "#fab1a0"],
		category: "nature",
		type: "linear",
		angle: 135,
	},
	{
		name: "Mountain Peak",
		colors: ["#74b9ff", "#0984e3", "#2d3436"],
		category: "nature",
		type: "linear",
		angle: 0,
	},
	{
		name: "Tropical Storm",
		colors: ["#00b894", "#00cec9"],
		category: "nature",
		type: "radial",
	},
	{
		name: "Autumn Leaves",
		colors: ["#f39c12", "#e74c3c", "#9b59b6"],
		category: "nature",
		type: "linear",
		angle: 45,
	},

	// Vibrant
	{
		name: "Electric Lime",
		colors: ["#00f260", "#0575e6"],
		category: "vibrant",
		type: "linear",
		angle: 45,
	},
	{
		name: "Pink Burst",
		colors: ["#f093fb", "#f5576c"],
		category: "vibrant",
		type: "radial",
	},
	{
		name: "Neon Dreams",
		colors: ["#ff0844", "#00dbde"],
		category: "vibrant",
		type: "linear",
		angle: 90,
	},
	{
		name: "Rainbow Explosion",
		colors: ["#ff006e", "#fb5607", "#ffbe0b", "#8338ec"],
		category: "vibrant",
		type: "conic",
	},
	{
		name: "Laser Beam",
		colors: ["#ff00ff", "#00ffff"],
		category: "vibrant",
		type: "linear",
		angle: 45,
	},

	// Dark
	{
		name: "Midnight",
		colors: ["#232526", "#414345"],
		category: "dark",
		type: "linear",
		angle: 45,
	},
	{
		name: "Deep Space",
		colors: ["#000428", "#004e92"],
		category: "dark",
		type: "radial",
	},
	{
		name: "Shadow Realm",
		colors: ["#1a1a2e", "#16213e", "#0f3460"],
		category: "dark",
		type: "linear",
		angle: 135,
	},
	{
		name: "Obsidian",
		colors: ["#0f0c29", "#302b63", "#24243e"],
		category: "dark",
		type: "linear",
		angle: 45,
	},
	{
		name: "Black Hole",
		colors: ["#000000", "#130f40", "#000000"],
		category: "dark",
		type: "radial",
	},

	// Pastel
	{
		name: "Cotton Candy",
		colors: ["#ffecd2", "#fcb69f"],
		category: "pastel",
		type: "linear",
		angle: 45,
	},
	{
		name: "Dreamy Cloud",
		colors: ["#a8edea", "#fed6e3"],
		category: "pastel",
		type: "radial",
	},
	{
		name: "Soft Sunrise",
		colors: ["#fff1eb", "#ace0f9"],
		category: "pastel",
		type: "linear",
		angle: 90,
	},
	{
		name: "Lavender Mist",
		colors: ["#e0c3fc", "#8ec5fc"],
		category: "pastel",
		type: "linear",
		angle: 120,
	},
	{
		name: "Mint Fresh",
		colors: ["#d4fc79", "#96e6a1"],
		category: "pastel",
		type: "linear",
		angle: 45,
	},

	// Holographic
	{
		name: "Hologram",
		colors: ["#a8ff78", "#78ffd6", "#78c6ff", "#a878ff", "#ff78f0"],
		category: "holographic",
		type: "linear",
		angle: 45,
		description: "Multi-spectral holographic effect",
	},
	{
		name: "Iridescent",
		colors: ["#667eea", "#764ba2", "#f093fb", "#f5576c", "#ffecd2"],
		category: "holographic",
		type: "linear",
		angle: 135,
	},
	{
		name: "Oil Slick",
		colors: ["#0f0c29", "#302b63", "#24243e", "#667eea", "#764ba2"],
		category: "holographic",
		type: "conic",
	},
	{
		name: "Prism",
		colors: ["#ff0000", "#ff7f00", "#ffff00", "#00ff00", "#0000ff", "#4b0082", "#8f00ff"],
		category: "holographic",
		type: "linear",
		angle: 90,
	},

	// Glassmorphism
	{
		name: "Frosted Glass",
		colors: ["rgba(255,255,255,0.4)", "rgba(255,255,255,0.1)"],
		category: "glassmorphism",
		type: "linear",
		angle: 135,
	},
	{
		name: "Crystal Clear",
		colors: ["#ffffff33", "#ffffff11", "#ffffff22"],
		category: "glassmorphism",
		type: "radial",
	},
	{
		name: "Smoke Glass",
		colors: ["#00000033", "#00000011"],
		category: "glassmorphism",
		type: "linear",
		angle: 180,
	},

	// Aurora
	{
		name: "Aurora Borealis",
		colors: ["#00d2ff", "#3a7bd5", "#00d2ff", "#928dab"],
		category: "aurora",
		type: "linear",
		angle: 45,
	},
	{
		name: "Northern Sky",
		colors: ["#1a2a6c", "#b21f1f", "#fdbb2d"],
		category: "aurora",
		type: "linear",
		angle: 135,
	},
	{
		name: "Polar Night",
		colors: ["#0f2027", "#203a43", "#2c5364", "#00d4ff"],
		category: "aurora",
		type: "linear",
		angle: 0,
	},
	{
		name: "Cosmic Aurora",
		colors: ["#000046", "#1cb5e0", "#00d4ff", "#7f00ff"],
		category: "aurora",
		type: "conic",
	},

	// Duotone
	{
		name: "Sunset Duo",
		colors: ["#ff6b6b", "#feca57"],
		category: "duotone",
		type: "linear",
		angle: 45,
	},
	{
		name: "Ocean Duo",
		colors: ["#0077b6", "#00b4d8"],
		category: "duotone",
		type: "linear",
		angle: 90,
	},
	{
		name: "Forest Duo",
		colors: ["#2d6a4f", "#95d5b2"],
		category: "duotone",
		type: "linear",
		angle: 135,
	},
	{
		name: "Berry Duo",
		colors: ["#7b2cbf", "#e0aaff"],
		category: "duotone",
		type: "linear",
		angle: 45,
	},
	{
		name: "Fire Duo",
		colors: ["#d00000", "#ffba08"],
		category: "duotone",
		type: "linear",
		angle: 45,
	},

	// Mesh-style (simulated with multi-stop)
	{
		name: "Mesh Sunset",
		colors: ["#ff9a9e", "#fad0c4", "#ffecd2", "#fcb69f"],
		category: "mesh",
		type: "radial",
	},
	{
		name: "Mesh Ocean",
		colors: ["#667eea", "#764ba2", "#f093fb", "#a8edea"],
		category: "mesh",
		type: "conic",
	},
	{
		name: "Mesh Aurora",
		colors: ["#00d2ff", "#3a7bd5", "#667eea", "#764ba2", "#f093fb"],
		category: "mesh",
		type: "conic",
	},
];

// --- CSS Generation ---

export function generateCSSGradient(
	gradient: ValidatedGradient | null,
	interpolationMode: InterpolationMode = "oklch"
): string {
	if (!gradient || !gradient.stops || !gradient.stops.length) {
		return `linear-gradient(45deg in oklch, #3b82f6, #8b5cf6)`;
	}

	const sortedStops = [...gradient.stops].sort((a, b) => a.position - b.position);
	const colorStops = sortedStops.map((stop) => `${stop.color} ${stop.position}%`).join(", ");

	const interpolation = interpolationMode === "rgb" ? "" : ` in ${interpolationMode}`;

	switch (gradient.type) {
		case "linear":
			return `linear-gradient(${gradient.angle || 45}deg${interpolation}, ${colorStops})`;
		case "radial":
			return `radial-gradient(circle at ${gradient.centerX || 50}% ${gradient.centerY || 50}%${interpolation}, ${colorStops})`;
		case "conic":
			return `conic-gradient(from ${gradient.angle || 0}deg at ${gradient.centerX || 50}% ${gradient.centerY || 50}%${interpolation}, ${colorStops})`;
		default:
			return `linear-gradient(45deg${interpolation}, ${colorStops})`;
	}
}

export function generateTailwindGradient(gradient: ValidatedGradient): string {
	if (!gradient || !gradient.stops || gradient.stops.length < 2) return "";

	const sortedStops = [...gradient.stops].sort((a, b) => a.position - b.position);
	const firstColor = sortedStops[0]?.color || "#000";
	const lastColor = sortedStops[sortedStops.length - 1]?.color || "#fff";

	// Convert angle to Tailwind direction
	const angleToDirection: Record<number, string> = {
		0: "to-t",
		45: "to-tr",
		90: "to-r",
		135: "to-br",
		180: "to-b",
		225: "to-bl",
		270: "to-l",
		315: "to-tl",
	};

	const angle = gradient.angle || 45;
	const closestAngle = Object.keys(angleToDirection)
		.map(Number)
		.reduce((prev, curr) => (Math.abs(curr - angle) < Math.abs(prev - angle) ? curr : prev));

	const direction = angleToDirection[closestAngle] || "to-r";

	return `bg-gradient-${direction} from-[${firstColor}] to-[${lastColor}]`;
}

export function generateCSSVariables(gradient: ValidatedGradient, prefix = "gradient"): string {
	if (!gradient) return "";

	const lines: string[] = [];
	lines.push(`:root {`);
	lines.push(`  --${prefix}-name: "${gradient.name}";`);
	lines.push(`  --${prefix}-type: ${gradient.type};`);
	lines.push(`  --${prefix}-angle: ${gradient.angle || 45}deg;`);

	if (gradient.stops && gradient.stops.length > 0) {
		gradient.stops.forEach((stop, index) => {
			lines.push(`  --${prefix}-color-${index + 1}: ${stop.color};`);
			lines.push(`  --${prefix}-position-${index + 1}: ${stop.position}%;`);
		});
	}

	lines.push(`  --${prefix}: ${generateCSSGradient(gradient)};`);
	lines.push(`}`);

	return lines.join("\n");
}

// --- Color Manipulation ---

export function interpolateGradientColors(
	colors: string[],
	steps: number,
	mode: InterpolationMode = "oklch"
): string[] {
	if (colors.length < 2) return colors;

	try {
		const chromaMode = mode === "oklch" ? "lch" : mode === "oklab" ? "lab" : mode;
		return chroma.scale(colors).mode(chromaMode as any).colors(steps);
	} catch {
		return chroma.scale(colors).colors(steps);
	}
}

export function smoothenGradientStops(
	stops: ValidatedGradientStop[],
	mode: InterpolationMode = "oklch"
): ValidatedGradientStop[] {
	if (stops.length < 3) return stops;

	const colors = stops.map((s) => s.color);
	const smoothColors = interpolateGradientColors(colors, stops.length, mode);

	return stops.map((stop, index) => ({
		...stop,
		color: smoothColors[index] || stop.color,
	}));
}

export function reverseGradientStops(stops: ValidatedGradientStop[]): ValidatedGradientStop[] {
	return stops
		.map((stop) => ({
			...stop,
			position: 100 - stop.position,
		}))
		.reverse();
}

export function distributeStopsEvenly(stops: ValidatedGradientStop[]): ValidatedGradientStop[] {
	return stops.map((stop, index) => ({
		...stop,
		position: (index / (stops.length - 1)) * 100,
	}));
}

// --- Mood-based Generation ---

export function generateMoodGradient(
	mood: MoodType,
	baseColor?: string,
	colorCount = 3
): string[] {
	const seed = baseColor || getRandomColor();

	const moodConfigs: Record<
		MoodType,
		{ saturationRange: [number, number]; lightnessRange: [number, number]; hueShift: number }
	> = {
		calm: { saturationRange: [0.3, 0.5], lightnessRange: [0.6, 0.85], hueShift: 30 },
		energetic: { saturationRange: [0.8, 1], lightnessRange: [0.4, 0.6], hueShift: 60 },
		corporate: { saturationRange: [0.4, 0.6], lightnessRange: [0.3, 0.5], hueShift: 20 },
		playful: { saturationRange: [0.7, 0.9], lightnessRange: [0.5, 0.7], hueShift: 90 },
		luxury: { saturationRange: [0.2, 0.4], lightnessRange: [0.1, 0.3], hueShift: 15 },
		natural: { saturationRange: [0.4, 0.6], lightnessRange: [0.4, 0.6], hueShift: 40 },
	};

	const config = moodConfigs[mood];
	const baseHsl = chroma(seed).hsl();
	const colors: string[] = [];

	for (let i = 0; i < colorCount; i++) {
		const hueOffset = (i - Math.floor(colorCount / 2)) * config.hueShift;
		const saturation =
			config.saturationRange[0] +
			Math.random() * (config.saturationRange[1] - config.saturationRange[0]);
		const lightness =
			config.lightnessRange[0] +
			(i / (colorCount - 1)) * (config.lightnessRange[1] - config.lightnessRange[0]);

		colors.push(
			chroma
				.hsl((baseHsl[0] + hueOffset + 360) % 360, saturation, lightness)
				.hex()
		);
	}

	return colors;
}

export function generateRandomGradient(colorCount = 3): string[] {
	const baseHue = Math.random() * 360;
	const colors: string[] = [];

	for (let i = 0; i < colorCount; i++) {
		const hue = (baseHue + i * (360 / colorCount) + Math.random() * 30 - 15) % 360;
		const saturation = 0.5 + Math.random() * 0.4;
		const lightness = 0.3 + Math.random() * 0.4;
		colors.push(chroma.hsl(hue, saturation, lightness).hex());
	}

	return colors;
}

function getRandomColor(): string {
	return chroma.random().hex();
}

// --- Mesh Gradient Utilities ---

export function createMeshPoint(x: number, y: number, color?: string): MeshPoint {
	return {
		id: crypto.randomUUID(),
		x: Math.max(0, Math.min(100, x)),
		y: Math.max(0, Math.min(100, y)),
		color: color || getRandomColor(),
		radius: 50,
	};
}

export function generateMeshGradientCSS(points: MeshPoint[]): string {
	if (points.length === 0) return "transparent";

	// Generate multiple radial gradients layered together
	const gradients = points.map((point) => {
		const color = chroma(point.color);
		const transparent = color.alpha(0).css();
		return `radial-gradient(circle at ${point.x}% ${point.y}%, ${point.color} 0%, ${transparent} ${point.radius}%)`;
	});

	return gradients.join(", ");
}

export function generateDefaultMeshPoints(): MeshPoint[] {
	// Generate random colors instead of hardcoded ones
	const baseHue = Math.random() * 360;
	return [
		createMeshPoint(20, 20, chroma.hsl(baseHue, 0.7, 0.55).hex()),
		createMeshPoint(80, 20, chroma.hsl((baseHue + 120) % 360, 0.7, 0.55).hex()),
		createMeshPoint(50, 80, chroma.hsl((baseHue + 240) % 360, 0.7, 0.55).hex()),
		createMeshPoint(50, 50, chroma.hsl((baseHue + 60) % 360, 0.6, 0.6).hex()),
	];
}

export function generateMeshPointsFromColors(colors: string[]): MeshPoint[] {
	if (colors.length === 0) return generateDefaultMeshPoints();

	// Predefined positions for mesh points based on count
	const positions: [number, number][] = [
		[25, 25], [75, 25], [50, 75], [50, 50],
		[15, 50], [85, 50], [25, 85], [75, 85],
	];

	return colors.slice(0, 8).map((color, index) => {
		const pos = positions[index] || [Math.random() * 80 + 10, Math.random() * 80 + 10];
		return createMeshPoint(pos[0], pos[1], color);
	});
}

// --- Export Utilities ---

export function gradientToSVG(
	gradient: ValidatedGradient,
	width = 400,
	height = 200
): string {
	const gradientId = `gradient-${Date.now()}`;
	let gradientDef = "";

	const stops = gradient.stops || [];
	const sortedStops = [...stops].sort((a, b) => a.position - b.position);
	const stopsXML = sortedStops
		.map((stop) => `<stop offset="${stop.position}%" stop-color="${stop.color}"/>`)
		.join("\n      ");

	switch (gradient.type) {
		case "linear": {
			const angle = gradient.angle || 45;
			const rad = (angle * Math.PI) / 180;
			const x1 = 50 - 50 * Math.cos(rad);
			const y1 = 50 - 50 * Math.sin(rad);
			const x2 = 50 + 50 * Math.cos(rad);
			const y2 = 50 + 50 * Math.sin(rad);
			gradientDef = `<linearGradient id="${gradientId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
      ${stopsXML}
    </linearGradient>`;
			break;
		}
		case "radial":
			gradientDef = `<radialGradient id="${gradientId}" cx="${gradient.centerX || 50}%" cy="${gradient.centerY || 50}%" r="50%">
      ${stopsXML}
    </radialGradient>`;
			break;
		case "conic":
			// SVG doesn't natively support conic gradients, so we approximate with radial
			gradientDef = `<radialGradient id="${gradientId}" cx="${gradient.centerX || 50}%" cy="${gradient.centerY || 50}%" r="70%">
      ${stopsXML}
    </radialGradient>`;
			break;
		default:
			gradientDef = `<linearGradient id="${gradientId}">
      ${stopsXML}
    </linearGradient>`;
	}

	return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${gradientDef}
  </defs>
  <rect width="100%" height="100%" fill="url(#${gradientId})"/>
</svg>`;
}

// --- Validation Helpers ---

export function isValidHexColor(color: string): boolean {
	return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

export function normalizeHexColor(color: string): string {
	if (!color.startsWith("#")) {
		color = "#" + color;
	}

	if (color.length === 4) {
		// Expand shorthand (#RGB -> #RRGGBB)
		color = "#" + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
	}

	return color.toLowerCase();
}

export function interpolateColorAtPosition(
	stops: ValidatedGradientStop[],
	position: number,
	mode: InterpolationMode = "oklch"
): string {
	const sorted = [...stops].sort((a, b) => a.position - b.position);
	if (sorted.length === 0) return "#808080";
	if (sorted.length === 1 || position <= sorted[0]!.position) return sorted[0]!.color;
	if (position >= sorted[sorted.length - 1]!.position) return sorted[sorted.length - 1]!.color;

	for (let i = 0; i < sorted.length - 1; i++) {
		const s1 = sorted[i]!;
		const s2 = sorted[i + 1]!;
		if (position >= s1.position && position <= s2.position) {
			const t = (position - s1.position) / (s2.position - s1.position);
			return chroma.mix(s1.color, s2.color, t, mode === "oklch" ? "oklch" : mode).hex();
		}
	}
	return "#808080";
}

export function getContrastColor(bgColor: string): string {
	try {
		const luminance = chroma(bgColor).luminance();
		return luminance > 0.5 ? "#000000" : "#ffffff";
	} catch {
		return "#ffffff";
	}
}

