// Client-only app: all state lives in IndexedDB/localStorage, so there is nothing to render on a server.
export const ssr = false;
export const prerender = false;

export const trailingSlash = "never";
