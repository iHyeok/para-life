import type { APIRoute } from "astro";
import { meBodyIndex } from "../../lib/data";

// Built to /me/search-index.json so it sits behind Cloudflare Access with the rest of /me/.
// The /me dashboard search fetches it lazily to match inside Progress Logs and notes.
export const GET: APIRoute = () =>
  new Response(JSON.stringify(meBodyIndex()), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
