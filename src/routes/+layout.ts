// Layout load function for PhoenyxColor
// This configures SSR/prerendering and provides base metadata

// Disable prerendering - app relies heavily on client-side localStorage/IndexedDB
export const prerender = false;

// Enable client-side rendering
export const ssr = true;

// Enable trailing slashes for consistent URLs
export const trailingSlash = "never";

