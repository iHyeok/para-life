/**
 * Cloudflare Pages middleware (runs only for /me paths, see site/public/_routes.json).
 *
 * Cloudflare Access protects /me on the production host only. Preview and per-deployment
 * hosts (<branch>.para-life.pages.dev, <hash>.para-life.pages.dev) would otherwise serve
 * /me without a login, so send those requests to the protected production host instead.
 */
const PRODUCTION_HOST = "para-life.pages.dev";

export const onRequest = async (context: {
  request: Request;
  next: () => Promise<Response>;
}): Promise<Response> => {
  const url = new URL(context.request.url);
  const isMe = url.pathname === "/me" || url.pathname.startsWith("/me/");
  if (isMe && url.hostname !== PRODUCTION_HOST) {
    url.hostname = PRODUCTION_HOST;
    url.port = "";
    url.protocol = "https:";
    return Response.redirect(url.toString(), 302);
  }
  return context.next();
};
