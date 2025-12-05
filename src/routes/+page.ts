// Server-side redirect for the root page
// This is better for SEO than client-side redirects
import { redirect } from "@sveltejs/kit";
import type { Load } from "@sveltejs/kit";

export const load: Load = () => {
    // Redirect to the references page as the default landing
    redirect(302, "/references");
};
