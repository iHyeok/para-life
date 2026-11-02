/**
 * /me/files/<key> — attachments of limited/private items, read from the private R2 bucket.
 *
 * The bucket (para-life-private) has no public domain; this route is the only way in, and it
 * lives under /me, which Cloudflare Access protects (preview hosts are redirected away by
 * functions/_middleware.ts). The PRIVATE_ASSETS binding exists on production only.
 */

interface R2ObjectBody {
  body: ReadableStream;
  size: number;
  httpEtag: string;
  range?: { offset: number; length: number };
  writeHttpMetadata(headers: Headers): void;
}

interface R2Bucket {
  get(
    key: string,
    options?: { range?: { offset: number; length?: number } | { suffix: number }; onlyIf?: Headers },
  ): Promise<(R2ObjectBody & { body?: ReadableStream }) | null>;
}

type Context = {
  request: Request;
  params: { path?: string | string[] };
  env: { PRIVATE_ASSETS?: R2Bucket };
};

function parseRange(header: string | null) {
  const m = header?.match(/^bytes=(\d*)-(\d*)$/);
  if (!m || (!m[1] && !m[2])) return undefined;
  if (!m[1]) return { suffix: Number(m[2]) };
  const offset = Number(m[1]);
  return m[2] ? { offset, length: Number(m[2]) - offset + 1 } : { offset };
}

export const onRequestGet = async ({ request, params, env }: Context): Promise<Response> => {
  const key = (Array.isArray(params.path) ? params.path : [params.path ?? ""]).join("/");
  if (!env.PRIVATE_ASSETS || !key || key.split("/").some((p) => p === ".." || p === "")) {
    return new Response("Not found", { status: 404 });
  }

  // Videos on iOS need byte ranges; If-None-Match lets browsers revalidate cheaply
  const range = parseRange(request.headers.get("range"));
  const object = await env.PRIVATE_ASSETS.get(key, { range, onlyIf: request.headers });
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("accept-ranges", "bytes");
  // Behind a login: never let shared caches keep it
  headers.set("cache-control", "private, max-age=3600");
  headers.set("x-content-type-options", "nosniff");

  // onlyIf matched an unchanged ETag: R2 returns the object without a body
  if (!object.body) return new Response(null, { status: 304, headers });

  if (range && object.range) {
    const { offset, length } = object.range;
    headers.set("content-range", `bytes ${offset}-${offset + length - 1}/${object.size}`);
    return new Response(object.body, { status: 206, headers });
  }
  return new Response(object.body, { headers });
};
