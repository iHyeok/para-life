#!/usr/bin/env bun
/**
 * Para-Life Channel Server
 *
 * Custom MCP channel for para-life orchestrator.
 * Extends fakechat pattern with:
 * - External WebSocket access via Cloudflare Tunnel (port 3847)
 * - Cloudflare Access JWT verification
 * - Permission relay for remote tool approval
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  writeFileSync,
  mkdirSync,
  statSync,
  copyFileSync,
  chmodSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, extname, basename } from "node:path";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { execSync } from "node:child_process";
import type { ServerWebSocket } from "bun";
import { ChatStore, type StoredMsg } from "./store";

// --- Config ---
const PORT = Number(process.env.PARA_CHANNEL_PORT ?? 3847);
// Loopback only: remote access goes through Cloudflare Tunnel (-> localhost:PORT)
const HOST = process.env.PARA_CHANNEL_HOST ?? "127.0.0.1";
// Browser origins allowed to talk to this server (same-origin is always allowed)
const ALLOWED_ORIGINS = new Set(
  (process.env.PARA_ALLOWED_ORIGINS ??
    "https://main.kyxi.net,http://localhost:5174,http://127.0.0.1:5174")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);
// Host headers we answer to; anything else (e.g. a DNS-rebinding page) is rejected
const ALLOWED_HOSTS = new Set(
  [
    "api.kyxi.net",
    `localhost:${PORT}`,
    `127.0.0.1:${PORT}`,
    ...(process.env.PARA_ALLOWED_HOSTS ?? "").split(","),
  ]
    .map((s) => s.trim())
    .filter(Boolean)
);
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const PERMISSION_TTL_MS = 10 * 60 * 1000;
const CF_TEAM_DOMAIN = process.env.CF_TEAM_DOMAIN ?? "";
const CF_AUD = process.env.CF_AUDIENCE ?? "";
const SKIP_AUTH = process.env.SKIP_AUTH === "1";

// One server per chat session: the orchestrator is "para-life"; project sessions
// (scripts/session.sh) get their own id, port, URL prefix and history DB.
const CHANNEL_ID = process.env.PARA_CHANNEL_ID ?? "para-life";
if (!/^[a-z0-9-]+$/.test(CHANNEL_ID)) throw new Error(`bad PARA_CHANNEL_ID: ${CHANNEL_ID}`);
const CHANNEL_NAME = process.env.PARA_CHANNEL_NAME ?? "PARA Life";
// Path prefix when the tunnel routes a sub-path to this server (e.g. /p/paper)
const BASE_PATH = (process.env.PARA_CHANNEL_BASE ?? "").replace(/\/+$/, "");
if (BASE_PATH && !/^(\/[a-z0-9-]+)+$/.test(BASE_PATH)) throw new Error(`bad PARA_CHANNEL_BASE: ${BASE_PATH}`);
const STATE_DIR = join(homedir(), ".claude", "channels", CHANNEL_ID);
const INBOX_DIR = join(STATE_DIR, "inbox");
const OUTBOX_DIR = join(STATE_DIR, "outbox");

// --- Cloudflare Access JWT verification ---
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!jwks && CF_TEAM_DOMAIN) {
    jwks = createRemoteJWKSet(
      new URL(`https://${CF_TEAM_DOMAIN}/cdn-cgi/access/certs`)
    );
  }
  return jwks;
}

async function verifyToken(token: string): Promise<boolean> {
  if (SKIP_AUTH) return true;
  const ks = getJWKS();
  if (!ks) return false;
  try {
    await jwtVerify(token, ks, { audience: CF_AUD });
    return true;
  } catch {
    return false;
  }
}

function extractToken(req: Request): string | null {
  // Cloudflare Access sets this cookie/header
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(/CF_Authorization=([^;]+)/);
  if (match) return match[1];
  return req.headers.get("cf-access-jwt-assertion");
}

// --- Types ---
type Msg = {
  id: string;
  from: "user" | "assistant";
  text: string;
  ts: number;
  replyTo?: string;
  file?: { url: string; name: string };
  edited?: boolean;
};

type Wire =
  | ({ type: "msg" } & Msg)
  | { type: "edit"; id: string; text: string }
  | {
      type: "permission_request";
      id: string;
      tool: string;
      description: string;
      input_preview?: string;
    }
  | { type: "permission_resolved"; id: string; behavior: "allow" | "deny" | "expired" }
  | { type: "error"; id?: string; message: string }
  | { type: "hello"; features: string[] }
  | { type: "history_end"; hasMore?: boolean }
  | { type: "history_page"; messages: Wire[]; hasMore: boolean }
  | { type: "pong" }
  | { type: "status"; connected: boolean }
  | Activity;

// What the Claude Code session is doing, reported by hooks (channel/hooks/activity.ts)
type Activity = {
  type: "activity";
  state: "idle" | "working" | "waiting";
  label?: string;
  /** When the current working stretch began (ms) */
  since: number;
};

type PendingPermission = {
  request: Extract<Wire, { type: "permission_request" }>;
  timeout: ReturnType<typeof setTimeout>;
};

// --- State ---
const clients = new Set<ServerWebSocket<unknown>>();
const pendingPermissions = new Map<string, PendingPermission>();
// Chat history lives in SQLite (see store.ts) so it survives restarts
const store = new ChatStore(STATE_DIR);
const REPLAY_LIMIT = 200;
const PAGE_LIMIT = 100;
store.archive();
setInterval(() => store.archive(), 24 * 60 * 60 * 1000).unref();
let seq = 0;

const asWire = (m: StoredMsg): Wire => ({ type: "msg", ...m });

function nextId() {
  return `m${Date.now()}-${++seq}`;
}

function broadcast(m: Wire) {
  if (m.type === "msg") {
    const { type: _, ...msg } = m;
    store.save(msg);
  }
  const data = JSON.stringify(m);
  for (const ws of clients) if (ws.readyState === 1) ws.send(data);
}

// --- Session activity ---
// Only hooks know when a turn ends, so nothing is announced until the first hook call
let hooksSeen = false;
let activity: Activity = { type: "activity", state: "idle", since: Date.now() };
const ACTIVITY_TOKEN = randomBytes(24).toString("hex");

function setActivity(state: Activity["state"], label?: string) {
  if (!hooksSeen) return;
  const since = activity.state === "idle" && state !== "idle" ? Date.now() : activity.since;
  activity = { type: "activity", state, ...(label ? { label: label.slice(0, 120) } : {}), since };
  broadcast(activity);
}

function onHook(event: string, label?: string) {
  hooksSeen = true;
  // A permission prompt comes after PreToolUse; any later hook means the turn moved on
  // (the prompt may have been answered in the terminal)
  if (event === "Stop") setActivity("idle");
  else setActivity("working", label || "생각 중");
}

// The Claude Code process this server belongs to; hooks compare against it so other
// sessions in the same folder don't report into this chat
function ownerClaudePid(): number | null {
  try {
    let p = process.ppid;
    for (let i = 0; i < 6 && p > 1; i++) {
      const out = execSync(`ps -o ppid=,comm= -p ${p}`, { encoding: "utf-8" }).trim();
      const [ppid, ...comm] = out.split(/\s+/);
      if (basename(comm.join(" ")) === "claude") return p;
      p = Number(ppid);
    }
  } catch {}
  return null;
}

function tokenOk(got: string | null) {
  if (!got || got.length !== ACTIVITY_TOKEN.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(ACTIVITY_TOKEN));
}

function mime(ext: string) {
  const m: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".mp3": "audio/mpeg",
    ".pdf": "application/pdf",
    ".txt": "text/plain; charset=utf-8",
    ".md": "text/plain; charset=utf-8",
    ".json": "application/json",
  };
  return m[ext] ?? "application/octet-stream";
}

function uniqueName(fileName: string) {
  const ext = extname(fileName).toLowerCase().replace(/[^a-z0-9.]/g, "").slice(0, 10);
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext || ".bin"}`;
}

// Call only after the Host header passed ALLOWED_HOSTS, so same-origin can't be forged
function isOriginAllowed(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser client (curl, cloudflared health checks)
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    return new URL(origin).host === req.headers.get("host"); // built-in UI at "/"
  } catch {
    return false;
  }
}

// --- MCP Server ---
const mcp = new Server(
  { name: CHANNEL_ID === "para-life" ? "para-life-channel" : `para-${CHANNEL_ID}-channel`, version: "0.1.0" },
  {
    capabilities: { tools: {}, experimental: { "claude/channel": {}, "claude/channel/permission": {} } },
    instructions: CHANNEL_ID !== "para-life"
      ? `The sender reads the "${CHANNEL_NAME}" chat in the para-life chat UI, not this session. Anything you want them to see must go through the reply tool — your transcript output never reaches the UI.\n\nMessages from that chat arrive as <channel ...> tags with chat_id "web". If the tag has a file_path attribute, Read that file — it is an upload from the UI. Reply with the reply tool.\n\nYou are a project session of the PARA Life system (session id "${CHANNEL_ID}"), not the orchestrator. Your cwd is ~/para-life. Follow the session brief appended to your system prompt, CLAUDE.md and PARA-SPEC.md.`
      : `The sender reads the para-life chat UI, not this session. Anything you want them to see must go through the reply tool — your transcript output never reaches the UI.\n\nMessages from the para-life chat arrive as <channel source="para-life" chat_id="web" message_id="...">. If the tag has a file_path attribute, Read that file — it is an upload from the UI. Reply with the reply tool.\n\nYou are the PARA Life orchestrator. Your cwd is ~/para-life. Refer to PARA-SPEC.md for data management rules. You can read other project directories for status checks but only write to ~/para-life.`,
  }
);

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "reply",
      description:
        "Send a message to the para-life chat UI. Pass reply_to for quote-reply, files for attachments.",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string" },
          reply_to: { type: "string" },
          files: { type: "array", items: { type: "string" } },
        },
        required: ["text"],
      },
    },
    {
      name: "edit_message",
      description: "Edit a previously sent message.",
      inputSchema: {
        type: "object",
        properties: {
          message_id: { type: "string" },
          text: { type: "string" },
        },
        required: ["message_id", "text"],
      },
    },
  ],
}));

mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
  const args = (req.params.arguments ?? {}) as Record<string, unknown>;
  try {
    switch (req.params.name) {
      case "reply": {
        const text = args.text as string;
        const replyTo = args.reply_to as string | undefined;
        const files = (args.files as string[] | undefined) ?? [];

        mkdirSync(OUTBOX_DIR, { recursive: true });
        let file: { url: string; name: string } | undefined;
        if (files[0]) {
          const f = files[0];
          const st = statSync(f);
          if (st.size > 50 * 1024 * 1024) throw new Error(`file too large: ${f}`);
          const ext = extname(f).toLowerCase();
          const out = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
          copyFileSync(f, join(OUTBOX_DIR, out));
          file = { url: `/files/${out}`, name: basename(f) };
        }
        const id = nextId();
        broadcast({
          type: "msg",
          id,
          from: "assistant",
          text,
          ts: Date.now(),
          replyTo,
          file,
        });
        return { content: [{ type: "text", text: `sent (${id})` }] };
      }
      case "edit_message": {
        // Only Claude's own replies can be edited
        const target = store.get(String(args.message_id));
        if (target?.from !== "assistant") {
          throw new Error(`no assistant message ${args.message_id}`);
        }
        store.edit(target.id, String(args.text));
        broadcast({
          type: "edit",
          id: args.message_id as string,
          text: args.text as string,
        });
        return { content: [{ type: "text", text: "ok" }] };
      }
      default:
        return {
          content: [{ type: "text", text: `unknown: ${req.params.name}` }],
          isError: true,
        };
    }
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: `${req.params.name}: ${err instanceof Error ? err.message : err}`,
        },
      ],
      isError: true,
    };
  }
});

await mcp.connect(new StdioServerTransport());

// --- Permission relay: CC → WebSocket → User → WebSocket → CC ---
// No auto-deny: if nobody answers in the UI, the terminal prompt stays usable.
function respondPermission(id: unknown, allowed: unknown) {
  if (typeof id !== "string") return;
  const pending = pendingPermissions.get(id);
  if (!pending) return;
  clearTimeout(pending.timeout);
  pendingPermissions.delete(id);
  const behavior = allowed === true ? "allow" : "deny";
  void mcp.notification({
    method: "notifications/claude/channel/permission",
    params: { request_id: id, behavior },
  });
  broadcast({ type: "permission_resolved", id, behavior });
  if (pendingPermissions.size === 0 && activity.state === "waiting") setActivity("working", "생각 중");
}

mcp.setNotificationHandler(
  z.object({
    method: z.literal("notifications/claude/channel/permission_request"),
    params: z.object({
      request_id: z.string(),
      tool_name: z.string(),
      description: z.string(),
      input_preview: z.string(),
    }),
  }),
  async ({ params }) => {
    const { request_id, tool_name, description, input_preview } = params;
    const request = {
      type: "permission_request" as const,
      id: request_id,
      tool: tool_name,
      description,
      input_preview,
    };
    const timeout = setTimeout(() => {
      pendingPermissions.delete(request_id);
      broadcast({ type: "permission_resolved", id: request_id, behavior: "expired" });
    }, PERMISSION_TTL_MS);
    pendingPermissions.set(request_id, { request, timeout });
    broadcast(request);
    setActivity("waiting", `승인 대기 · ${tool_name}`);
  },
);

// Record a user message and echo it to every client: other devices see it, the sender gets its ack
function echoUser(id: string, text: string, file?: { path: string; name: string }) {
  broadcast({
    type: "msg",
    id,
    from: "user",
    text,
    ts: Date.now(),
    ...(file ? { file: { url: `/inbox/${basename(file.path)}`, name: file.name } } : {}),
  });
}

// --- Deliver message to Claude Code ---
function deliver(
  id: string,
  text: string,
  file?: { path: string; name: string }
): void {
  try {
    if (activity.state === "idle") setActivity("working", "메시지 확인 중");
    const result = mcp.notification({
      method: "notifications/claude/channel",
      params: {
        content: text || `(${file?.name ?? "attachment"})`,
        meta: {
          chat_id: "web",
          message_id: id,
          user: "web",
          ts: new Date().toISOString(),
          ...(file ? { file_path: file.path, file_name: file.name } : {}),
        },
      },
    });
    // Handle both sync and async cases
    if (result && typeof (result as Promise<void>).catch === "function") {
      (result as Promise<void>).catch((err: unknown) => {
        process.stderr.write(`deliver async error: ${err}\n`);
      });
    }
  } catch (err) {
    process.stderr.write(`deliver sync error: ${err}\n`);
  }
}

// Global unhandled rejection handler to prevent crash
process.on("unhandledRejection", (err) => {
  process.stderr.write(`unhandled rejection: ${err}\n`);
});

// Exit with the Claude Code session that spawned us, so we never linger as a stale server
process.stdin.on("end", () => process.exit(0));
process.stdin.on("close", () => process.exit(0));

// --- Free our port only from an orphaned channel server ---
// A listener whose Claude Code session is gone (bun wrappers up to pid 1) is stale.
// A listener owned by a live session is left alone; we then run without the web channel.
function procInfo(pid: number) {
  const out = execSync(`ps -o ppid=,comm= -p ${pid}`, { encoding: "utf-8" }).trim();
  const [ppid, ...comm] = out.split(/\s+/);
  return { ppid: Number(ppid), comm: basename(comm.join(" ")) };
}

function isOrphanedChannelServer(pid: number): boolean {
  const args = execSync(`ps -o args= -p ${pid}`, { encoding: "utf-8" });
  if (!args.includes("server.ts")) return false;
  let p = pid;
  for (let i = 0; i < 5; i++) {
    const { ppid } = procInfo(p);
    if (ppid <= 1) return true;
    if (procInfo(ppid).comm !== "bun") return false;
    p = ppid;
  }
  return false;
}

let portHeldByLive = false;
try {
  const pids = execSync(`lsof -nP -ti tcp:${PORT} -sTCP:LISTEN`, { encoding: "utf-8" })
    .split("\n")
    .map(Number)
    .filter((pid) => pid > 0 && pid !== process.pid);
  for (const pid of pids) {
    if (isOrphanedChannelServer(pid)) {
      process.stderr.write(`killing orphaned channel server on port ${PORT}: pid ${pid}\n`);
      process.kill(pid);
      Bun.sleepSync(500);
    } else {
      // Don't rely on bind failing: macOS lets 127.0.0.1:PORT bind next to *:PORT
      portHeldByLive = true;
      process.stderr.write(`port ${PORT} is held by live pid ${pid}; web channel disabled\n`);
    }
  }
} catch {}

// --- HTTP + WebSocket Server ---
try {
if (!portHeldByLive) {
Bun.serve({
  port: PORT,
  hostname: HOST,
  async fetch(req, server) {
    const url = new URL(req.url);
    if (BASE_PATH && (url.pathname === BASE_PATH || url.pathname.startsWith(`${BASE_PATH}/`))) {
      url.pathname = url.pathname.slice(BASE_PATH.length) || "/";
    }
    if (!ALLOWED_HOSTS.has(req.headers.get("host") ?? "")) {
      return new Response("Forbidden host", { status: 403 });
    }
    const origin = req.headers.get("origin");
    const originOk = isOriginAllowed(req);
    const cors: Record<string, string> = { Vary: "Origin" };
    if (origin && originOk) {
      cors["Access-Control-Allow-Origin"] = origin;
      cors["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
      cors["Access-Control-Allow-Headers"] = "Content-Type";
      cors["Access-Control-Allow-Credentials"] = "true";
    }

    // Block cross-site pages (other *.kyxi.net apps, random sites hitting localhost)
    if (!originOk) {
      return new Response("Forbidden origin", { status: 403, headers: cors });
    }

    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    // Health check (no auth needed)
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({ status: "ok", clients: clients.size }),
        { headers: { ...cors, "content-type": "application/json" } }
      );
    }

    // Hook reports from the local Claude Code session (never through the tunnel)
    if (url.pathname === "/activity" && req.method === "POST") {
      const local = /^(127\.0\.0\.1|localhost):/.test(req.headers.get("host") ?? "") && !req.headers.get("cf-connecting-ip");
      if (!local || !tokenOk(req.headers.get("x-activity-token"))) {
        return new Response("Forbidden", { status: 403 });
      }
      try {
        const body = (await req.json()) as { event?: unknown; label?: unknown };
        if (typeof body.event !== "string") return new Response("bad request", { status: 400 });
        onHook(body.event, typeof body.label === "string" ? body.label : undefined);
        return new Response(null, { status: 204 });
      } catch {
        return new Response("bad request", { status: 400 });
      }
    }

    // Auth check for all other routes
    if (!SKIP_AUTH) {
      const token = extractToken(req);
      if (!token || !(await verifyToken(token))) {
        return new Response("Unauthorized", { status: 401, headers: cors });
      }
    }

    // WebSocket upgrade
    if (url.pathname === "/ws") {
      if (server.upgrade(req)) return;
      return new Response("upgrade failed", { status: 400 });
    }

    // Serve outbox (Claude -> UI) and inbox (UI uploads) files
    const fileRoute = url.pathname.match(/^\/(files|inbox)\/(.+)$/);
    if (fileRoute) {
      const f = fileRoute[2];
      if (f.includes("..") || f.includes("/"))
        return new Response("bad", { status: 400 });
      const dir = fileRoute[1] === "files" ? OUTBOX_DIR : INBOX_DIR;
      const file = Bun.file(join(dir, f));
      if (await file.exists()) {
        // Streamed from disk instead of buffering the whole file in memory
        return new Response(file, {
          headers: {
            ...cors,
            "content-type": mime(extname(f).toLowerCase()),
            "x-content-type-options": "nosniff",
            // Opened directly (e.g. an SVG), the file can't run scripts
            "content-security-policy":
              "default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'; sandbox",
          },
        });
      }
      return new Response("404", { status: 404, headers: cors });
    }

    // File upload
    if (url.pathname === "/upload" && req.method === "POST") {
      const form = await req.formData();
      const id = String(form.get("id") ?? "");
      const text = String(form.get("text") ?? "");
      const f = form.get("file");
      if (!id) return new Response("missing id", { status: 400 });
      let file: { path: string; name: string } | undefined;
      if (f instanceof File && f.size > MAX_UPLOAD_BYTES)
        return new Response("file too large", { status: 413, headers: cors });
      if (f instanceof File && f.size > 0) {
        mkdirSync(INBOX_DIR, { recursive: true });
        const path = join(INBOX_DIR, uniqueName(f.name));
        writeFileSync(path, Buffer.from(await f.arrayBuffer()));
        file = { path, name: f.name };
      }
      echoUser(id, text, file);
      deliver(id, text, file);
      return new Response(null, { status: 204, headers: cors });
    }

    // Permission response from UI
    if (url.pathname === "/permission" && req.method === "POST") {
      const body = (await req.json()) as { id: unknown; allowed: unknown };
      respondPermission(body.id, body.allowed);
      return new Response(null, { status: 204, headers: cors });
    }

    // Serve chat UI
    if (url.pathname === "/") {
      return new Response(CHAT_HTML, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    return new Response("404", { status: 404 });
  },
  websocket: {
    // base64 inflates uploads by 4/3; leave room for the JSON envelope
    maxPayloadLength: Math.ceil((MAX_UPLOAD_BYTES * 4) / 3) + 64 * 1024,
    open: (ws) => {
      clients.add(ws);
      // Lets clients know user messages are echoed back (= delivery ack)
      ws.send(
        JSON.stringify({ type: "hello", features: ["echo", "ping", "history_end", "history_page", "activity"] })
      );
      // Send recent history, then still-open permission requests, to the new client
      const recent = store.recent(REPLAY_LIMIT);
      for (const m of recent.messages) ws.send(JSON.stringify(asWire(m)));
      for (const p of pendingPermissions.values()) ws.send(JSON.stringify(p.request));
      ws.send(JSON.stringify({ type: "history_end", hasMore: recent.hasMore }));
      if (hooksSeen) ws.send(JSON.stringify(activity));
    },
    close: (ws) => {
      clients.delete(ws);
    },
    message: (ws, raw) => {
      try {
        const data = JSON.parse(String(raw));
        if (data.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
          return;
        }
        if (data.type === "permission_response") {
          respondPermission(data.id, data.allowed);
          return;
        }
        // Older messages, one page at a time (cursor = oldest message the client has)
        if (data.type === "history_before") {
          const { ts, id } = data.before ?? {};
          if (typeof ts !== "number" || typeof id !== "string") return;
          const limit = Math.min(PAGE_LIMIT, Math.max(1, Number(data.limit) || 50));
          const page = store.before({ ts, id }, limit);
          ws.send(JSON.stringify({ type: "history_page", messages: page.messages.map(asWire), hasMore: page.hasMore }));
          return;
        }
        // File upload via WebSocket (base64 encoded)
        if (data.type === "file_upload") {
          const { id, text, fileName, fileData } = data;
          if (
            typeof id === "string" &&
            typeof fileName === "string" &&
            typeof fileData === "string" &&
            fileData
          ) {
            const seen = store.get(id);
            if (seen) {
              ws.send(JSON.stringify(asWire(seen)));
              return;
            }
            const buf = Buffer.from(fileData, "base64");
            if (buf.byteLength > MAX_UPLOAD_BYTES) {
              ws.send(JSON.stringify({ type: "error", id, message: "file too large" }));
              return;
            }
            mkdirSync(INBOX_DIR, { recursive: true });
            const path = join(INBOX_DIR, uniqueName(fileName));
            writeFileSync(path, buf);
            const t = typeof text === "string" ? text : "";
            echoUser(id, t, { path, name: fileName });
            deliver(id, t, { path, name: fileName });
          }
          return;
        }

        const { id, text } = data as { id: unknown; text: unknown };
        if (typeof id === "string" && typeof text === "string" && text.trim()) {
          // A retry of an already-delivered message only needs the ack again
          const seen = store.get(id);
          if (seen) {
            ws.send(JSON.stringify(asWire(seen)));
            return;
          }
          echoUser(id, text.trim());
          deliver(id, text.trim());
        }
      } catch {}
    },
  },
});
// Where hooks find this server: port, token and the owning Claude Code pid
mkdirSync(STATE_DIR, { recursive: true });
writeFileSync(
  join(STATE_DIR, "activity.json"),
  JSON.stringify({ port: PORT, token: ACTIVITY_TOKEN, claudePid: ownerClaudePid(), serverPid: process.pid }),
  { mode: 0o600 },
);
chmodSync(join(STATE_DIR, "activity.json"), 0o600);
process.stderr.write(`para-life-channel: http://${HOST}:${PORT}\n`);
}
} catch (e) {
  process.stderr.write(`server start error (web channel disabled): ${e}\n`);
}

// --- Chat UI HTML ---
const CHAT_HTML = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PARA Life Chat</title>
<style>
:root {
  --bg: #0f0f0f;
  --bg-card: #1a1a1a;
  --border: #2a2a2a;
  --text: #e5e5e5;
  --text-muted: #888;
  --accent: #60a5fa;
  --green: #4ade80;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  height: 100vh;
  display: flex;
  flex-direction: column;
}
header {
  padding: 0.8rem 1rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
header h1 { font-size: 1rem; font-weight: 700; }
#status {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  background: var(--bg-card);
}
#status.connected { color: var(--green); }
#status.disconnected { color: #f87171; }
#messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.msg {
  max-width: 80%;
  padding: 0.6rem 0.9rem;
  border-radius: 12px;
  font-size: 0.9rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
.msg.user {
  align-self: flex-end;
  background: var(--accent);
  color: #000;
  border-bottom-right-radius: 4px;
}
.msg.assistant {
  align-self: flex-start;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-bottom-left-radius: 4px;
}
.msg .time {
  display: block;
  font-size: 0.65rem;
  opacity: 0.6;
  margin-top: 0.3rem;
}
.msg.thinking {
  opacity: 0.5;
  padding: 0.6rem 1.2rem;
}
.dots span {
  animation: blink 1.4s infinite;
  font-size: 1.2rem;
  letter-spacing: 0.15rem;
}
.dots span:nth-child(2) { animation-delay: 0.2s; }
.dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink { 0%,80%,100%{opacity:0.2} 40%{opacity:1} }
.msg .reply-ref {
  font-size: 0.75rem;
  opacity: 0.7;
  border-left: 2px solid;
  padding-left: 0.5rem;
  margin-bottom: 0.3rem;
}
.msg a { color: inherit; text-decoration: underline; }
.msg .file-link { display: block; margin-top: 0.3rem; font-size: 0.8rem; }
.permission {
  background: #2d1b00;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  padding: 0.8rem;
  margin: 0.5rem 0;
}
.permission p { font-size: 0.85rem; margin-bottom: 0.5rem; }
.permission pre {
  font-size: 0.75rem;
  background: #000;
  padding: 0.5rem;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  max-height: 160px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
.permission .btns { display: flex; gap: 0.5rem; }
.permission button {
  padding: 0.3rem 0.8rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}
.permission .allow { background: var(--green); color: #000; }
.permission .deny { background: #f87171; color: #000; }
#input-area {
  padding: 0.8rem 1rem;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}
#text {
  flex: 1;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  padding: 0.6rem 0.8rem;
  font: inherit;
  font-size: 0.9rem;
  resize: none;
  max-height: 120px;
  outline: none;
}
#text:focus { border-color: var(--accent); }
#input-area button {
  background: var(--accent);
  color: #000;
  border: none;
  border-radius: 8px;
  padding: 0.6rem 1rem;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.9rem;
  white-space: nowrap;
}
#input-area button:disabled { opacity: 0.5; cursor: default; }
#file-input { display: none; }
#attach-btn {
  background: var(--bg-card) !important;
  color: var(--text) !important;
  border: 1px solid var(--border) !important;
  padding: 0.6rem !important;
  font-size: 1rem !important;
}
#file-chip {
  font-size: 0.75rem;
  color: var(--accent);
  padding: 0.2rem 0;
}
</style>
</head>
<body>
<header>
  <h1>PARA Life</h1>
  <span id="status" class="disconnected">disconnected</span>
</header>
<div id="messages"></div>
<div id="input-area">
  <button id="attach-btn" onclick="document.getElementById('file-input').click()">+</button>
  <input type="file" id="file-input">
  <div style="flex:1;display:flex;flex-direction:column;gap:0.3rem;">
    <span id="file-chip"></span>
    <textarea id="text" rows="1" placeholder="Message..." autofocus></textarea>
  </div>
  <button id="send-btn" onclick="send()">Send</button>
</div>

<script>
const msgs = document.getElementById('messages');
const textEl = document.getElementById('text');
const statusEl = document.getElementById('status');
const fileInput = document.getElementById('file-input');
const fileChip = document.getElementById('file-chip');
const msgMap = {};
const permCards = {};
let uid = 0;
let ws;

fileInput.onchange = () => {
  const f = fileInput.files[0];
  fileChip.textContent = f ? '📎 ' + f.name : '';
};

function connect() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(proto + '//' + location.host + '/ws');
  ws.onopen = () => {
    // Server replays history and open permission requests on connect
    msgs.innerHTML = '';
    for (const k in permCards) delete permCards[k];
    thinkingEl = null;
    statusEl.textContent = 'connected';
    statusEl.className = 'connected';
  };
  ws.onclose = () => {
    statusEl.textContent = 'disconnected';
    statusEl.className = 'disconnected';
    setTimeout(connect, 3000);
  };
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.type === 'msg') { if (m.from === 'assistant') hideThinking(); addMsg(m); }
    if (m.type === 'edit') {
      const el = msgMap[m.id];
      if (el) el.querySelector('.body').textContent = m.text;
    }
    if (m.type === 'permission_request') showPermission(m);
    if (m.type === 'permission_resolved' && permCards[m.id]) {
      permCards[m.id].remove();
      delete permCards[m.id];
    }
  };
}
connect();

function addMsg(m) {
  if (msgMap[m.id]) return;
  const div = document.createElement('div');
  div.className = 'msg ' + m.from;
  let html = '';
  if (m.replyTo && msgMap[m.replyTo]) {
    const ref = msgMap[m.replyTo].querySelector('.body').textContent.slice(0, 60);
    html += '<div class="reply-ref">' + esc(ref) + '</div>';
  }
  html += '<span class="body">' + esc(m.text) + '</span>';
  if (m.file) {
    html += '<a class="file-link" href="' + m.file.url + '" download="' + esc(m.file.name) + '">[' + esc(m.file.name) + ']</a>';
  }
  html += '<span class="time">' + new Date(m.ts).toLocaleTimeString() + '</span>';
  div.innerHTML = html;
  msgs.appendChild(div);
  msgMap[m.id] = div;
  msgs.scrollTop = msgs.scrollHeight;
}

function showPermission(m) {
  if (permCards[m.id]) return;
  const div = document.createElement('div');
  div.className = 'permission';
  div.innerHTML = '<p>🔐 <b>' + esc(m.tool) + '</b>: ' + esc(m.description) + '</p>'
    + (m.input_preview ? '<pre>' + esc(m.input_preview) + '</pre>' : '')
    + '<div class="btns"><button class="allow">Allow</button><button class="deny">Deny</button></div>';
  const done = () => { div.remove(); delete permCards[m.id]; };
  div.querySelector('.allow').onclick = () => { respondPermission(m.id, true); done(); };
  div.querySelector('.deny').onclick = () => { respondPermission(m.id, false); done(); };
  permCards[m.id] = div;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function respondPermission(id, allowed) {
  ws.send(JSON.stringify({ type: 'permission_response', id, allowed }));
}

let thinkingEl = null;
function showThinking() {
  if (thinkingEl) return;
  thinkingEl = document.createElement('div');
  thinkingEl.className = 'msg assistant thinking';
  thinkingEl.innerHTML = '<span class="dots"><span>.</span><span>.</span><span>.</span></span>';
  msgs.appendChild(thinkingEl);
  msgs.scrollTop = msgs.scrollHeight;
}
function hideThinking() {
  if (thinkingEl) { thinkingEl.remove(); thinkingEl = null; }
}

function send() {
  const text = textEl.value.trim();
  const file = fileInput.files[0];
  if (!text && !file) return;
  textEl.value = '';
  fileInput.value = '';
  fileChip.textContent = '';
  autoResize();
  const id = 'u' + Date.now() + '-' + (++uid);
  addMsg({ id, from: 'user', text, ts: Date.now(), file: file ? { url: URL.createObjectURL(file), name: file.name } : undefined });
  showThinking();
  if (file) {
    const fd = new FormData();
    fd.set('id', id);
    fd.set('text', text);
    fd.set('file', file);
    fetch('/upload', { method: 'POST', body: fd });
  } else {
    ws.send(JSON.stringify({ id, text }));
  }
}

function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function autoResize() {
  textEl.style.height = 'auto';
  textEl.style.height = Math.min(textEl.scrollHeight, 120) + 'px';
}
textEl.addEventListener('input', autoResize);
let composing = false;
textEl.addEventListener('compositionstart', () => { composing = true; });
textEl.addEventListener('compositionend', () => { composing = false; });
textEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !composing) { e.preventDefault(); send(); }
});
</script>
</body>
</html>`;
