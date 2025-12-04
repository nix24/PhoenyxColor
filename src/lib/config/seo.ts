// Centralized SEO configuration for PhoenyxColor
// This file contains all site-wide metadata constants and helper functions

export const SITE_CONFIG = {
    name: "PhoenyxColor",
    shortName: "Phoenyx",
    description:
        "A powerful color management suite for artists and designers. Create stunning palettes, gradients, and manage reference images with ease.",
    author: "PhoenyxColor Team",
    baseUrl: "https://phoenyxcolor.app", // Update with actual production URL
    themeColor: "#ff007f", // Phoenix primary color
    backgroundColor: "#0a0a0f", // Void background
    locale: "en_US",
    twitter: "@phoenyxcolor", // Update with actual handle
    keywords: [
        "color picker",
        "palette generator",
        "gradient maker",
        "color management",
        "design tool",
        "artist tools",
        "color theory",
        "reference images",
    ],
} as const;

export const DEFAULT_OG_IMAGE = "/logo.jpg";

export interface PageMetadata {
    title: string;
    description: string;
    path: string;
    ogImage?: string;
    noIndex?: boolean;
}

export const PAGE_METADATA: Record<string, PageMetadata> = {
    home: {
        title: "PhoenyxColor - Color Management Suite",
        description: SITE_CONFIG.description,
        path: "/",
    },
    references: {
        title: "Reference Images - PhoenyxColor",
        description:
            "Upload and manage reference images for your artwork. Extract colors, apply transformations, and organize your visual inspiration.",
        path: "/references",
    },
    palettes: {
        title: "Color Palettes - PhoenyxColor",
        description:
            "Create, edit, and analyze beautiful color palettes. Generate harmonious color schemes with advanced color theory tools.",
        path: "/palettes",
    },
    gradients: {
        title: "Gradient Studio - PhoenyxColor",
        description:
            "Design stunning linear, radial, and conic gradients. Use presets, extract from images, or generate smart mood-based gradients.",
        path: "/gradients",
    },
    settings: {
        title: "Settings - PhoenyxColor",
        description: "Configure your PhoenyxColor preferences, export settings, and workspace options.",
        path: "/settings",
        noIndex: true, // Settings page doesn't need to be indexed
    },
};

/**
 * Generates a full URL from a path
 */
export function getFullUrl(path: string): string {
    const base = SITE_CONFIG.baseUrl.replace(/\/$/, "");
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${base}${cleanPath}`;
}

/**
 * Generates Open Graph image URL
 */
export function getOgImageUrl(imagePath?: string): string {
    const image = imagePath || DEFAULT_OG_IMAGE;
    if (image.startsWith("http")) return image;
    return getFullUrl(image);
}

/**
 * Generates a page title with site name suffix
 */
export function getPageTitle(pageTitle: string, includeSiteName = true): string {
    if (!includeSiteName || pageTitle.includes(SITE_CONFIG.name)) {
        return pageTitle;
    }
    return `${pageTitle} | ${SITE_CONFIG.name}`;
}

/**
 * Type for structured data (JSON-LD)
 */
export interface WebAppStructuredData {
    "@context": "https://schema.org";
    "@type": "WebApplication";
    name: string;
    description: string;
    url: string;
    applicationCategory: string;
    operatingSystem: string;
    offers: {
        "@type": "Offer";
        price: string;
        priceCurrency: string;
    };
}

/**
 * Generates JSON-LD structured data for the application
 */
export function getStructuredData(): WebAppStructuredData {
    return {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: SITE_CONFIG.name,
        description: SITE_CONFIG.description,
        url: SITE_CONFIG.baseUrl,
        applicationCategory: "DesignApplication",
        operatingSystem: "Web",
        offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
        },
    };
}

