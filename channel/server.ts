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
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  statSync,
  copyFileSync,
} from "fs";
import { homedir } from "os";
import { join, extname, basename } from "path";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { execSync } from "child_process";
import type { ServerWebSocket } from "bun";

// --- Config ---
const PORT = Number(process.env.PARA_CHANNEL_PORT ?? 3847);
const CF_TEAM_DOMAIN = process.env.CF_TEAM_DOMAIN ?? "";
const CF_AUD = process.env.CF_AUDIENCE ?? "";
const SKIP_AUTH = process.env.SKIP_AUTH === "1";

const STATE_DIR = join(homedir(), ".claude", "channels", "para-life");
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
};

type Wire =
  | ({ type: "msg" } & Msg)
  | { type: "edit"; id: string; text: string }
  | { type: "permission_request"; id: string; tool: string; description: string }
  | { type: "status"; connected: boolean };

type PermissionWaiter = {
  resolve: (allowed: boolean) => void;
  timeout: ReturnType<typeof setTimeout>;
};

// --- State ---
const clients = new Set<ServerWebSocket<unknown>>();
const pendingPermissions = new Map<string, PermissionWaiter>();
let seq = 0;

function nextId() {
  return `m${Date.now()}-${++seq}`;
}

function broadcast(m: Wire) {
  const data = JSON.stringify(m);
  for (const ws of clients) if (ws.readyState === 1) ws.send(data);
}

function mime(ext: string) {
  const m: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".txt": "text/plain",
  };
  return m[ext] ?? "application/octet-stream";
}

// --- MCP Server ---
const mcp = new Server(
  { name: "para-life-channel", version: "0.1.0" },
  {
    capabilities: { tools: {}, experimental: { "claude/channel": {}, "claude/channel/permission": {} } },
    instructions: `The sender reads the para-life chat UI, not this session. Anything you want them to see must go through the reply tool — your transcript output never reaches the UI.\n\nMessages from the para-life chat arrive as <channel source="para-life" chat_id="web" message_id="...">. If the tag has a file_path attribute, Read that file — it is an upload from the UI. Reply with the reply tool.\n\nYou are the PARA Life orchestrator. Your cwd is ~/para-life. Refer to PARA-SPEC.md for data management rules. You can read other project directories for status checks but only write to ~/para-life.`,
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
mcp.setNotificationHandler(
  { method: "notifications/claude/channel/permission_request" } as any,
  async (notification: any) => {
    const { id, tool, description } = notification.params ?? {};
    if (id) {
      broadcast({
        type: "permission_request",
        id: id as string,
        tool: (tool as string) ?? "unknown",
        description: (description as string) ?? "",
      });

      // Wait for user response via WebSocket
      const allowed = await new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          pendingPermissions.delete(id as string);
          resolve(false); // Auto-deny after 60s
        }, 60000);
        pendingPermissions.set(id as string, { resolve, timeout });
      });

      // Send response back to CC
      void mcp.notification({
        method: "notifications/claude/channel/permission",
        params: { id, allowed },
      });
    }
  }
);

// --- Deliver message to Claude Code ---
function deliver(
  id: string,
  text: string,
  file?: { path: string; name: string }
): void {
  try {
    const result = mcp.notification({
      method: "notifications/claude/channel",
      params: {
        content: text || `(${file?.name ?? "attachment"})`,
        meta: {
          chat_id: "web",
          message_id: id,
          user: "web",
          ts: new Date().toISOString(),
          ...(file ? { file_path: file.path } : {}),
        },
      },
    });
    // Handle both sync and async cases
    if (result && typeof (result as any).catch === "function") {
      (result as any).catch((err: unknown) => {
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

// --- Kill stale process on our port ---
try {
  const pid = execSync(`lsof -ti :${PORT}`, { encoding: "utf-8" }).trim();
  if (pid) {
    process.stderr.write(`killing stale process on port ${PORT}: pid ${pid}\n`);
    execSync(`kill ${pid}`);
    Bun.sleepSync(500);
  }
} catch {}

// --- HTTP + WebSocket Server ---
try {
Bun.serve({
  port: PORT,
  hostname: "0.0.0.0", // Accept tunnel connections
  async fetch(req, server) {
    const url = new URL(req.url);

    // Health check (no auth needed)
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({ status: "ok", clients: clients.size }),
        { headers: { "content-type": "application/json" } }
      );
    }

    // Auth check for all other routes
    if (!SKIP_AUTH) {
      const token = extractToken(req);
      if (!token || !(await verifyToken(token))) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    // WebSocket upgrade
    if (url.pathname === "/ws") {
      if (server.upgrade(req)) return;
      return new Response("upgrade failed", { status: 400 });
    }

    // Serve outbox files
    if (url.pathname.startsWith("/files/")) {
      const f = url.pathname.slice(7);
      if (f.includes("..") || f.includes("/"))
        return new Response("bad", { status: 400 });
      try {
        return new Response(readFileSync(join(OUTBOX_DIR, f)), {
          headers: { "content-type": mime(extname(f).toLowerCase()) },
        });
      } catch {
        return new Response("404", { status: 404 });
      }
    }

    // File upload
    if (url.pathname === "/upload" && req.method === "POST") {
      const form = await req.formData();
      const id = String(form.get("id") ?? "");
      const text = String(form.get("text") ?? "");
      const f = form.get("file");
      if (!id) return new Response("missing id", { status: 400 });
      let file: { path: string; name: string } | undefined;
      if (f instanceof File && f.size > 0) {
        mkdirSync(INBOX_DIR, { recursive: true });
        const ext = extname(f.name).toLowerCase() || ".bin";
        const path = join(INBOX_DIR, `${Date.now()}${ext}`);
        writeFileSync(path, Buffer.from(await f.arrayBuffer()));
        file = { path, name: f.name };
      }
      deliver(id, text, file);
      return new Response(null, { status: 204 });
    }

    // Permission response from UI
    if (url.pathname === "/permission" && req.method === "POST") {
      const body = (await req.json()) as { id: string; allowed: boolean };
      const waiter = pendingPermissions.get(body.id);
      if (waiter) {
        clearTimeout(waiter.timeout);
        waiter.resolve(body.allowed);
        pendingPermissions.delete(body.id);
      }
      return new Response(null, { status: 204 });
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
    open: (ws) => {
      clients.add(ws);
      broadcast({ type: "status", connected: true });
    },
    close: (ws) => {
      clients.delete(ws);
    },
    message: (_, raw) => {
      try {
        const data = JSON.parse(String(raw));
        if (data.type === "permission_response") {
          const waiter = pendingPermissions.get(data.id);
          if (waiter) {
            clearTimeout(waiter.timeout);
            waiter.resolve(data.allowed);
            pendingPermissions.delete(data.id);
          }
          return;
        }
        const { id, text } = data as { id: string; text: string };
        if (id && text?.trim()) deliver(id, text.trim());
      } catch {}
    },
  },
});
} catch (e) {
  process.stderr.write(`server start error: ${e}\n`);
}

process.stderr.write(`para-life-channel: http://localhost:${PORT}\n`);

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
    if (m.type === 'msg') { hideThinking(); addMsg(m); }
    if (m.type === 'edit') {
      const el = msgMap[m.id];
      if (el) el.querySelector('.body').textContent = m.text + ' (edited)';
    }
    if (m.type === 'permission_request') showPermission(m);
  };
}
connect();

function addMsg(m) {
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
  const div = document.createElement('div');
  div.className = 'permission';
  div.innerHTML = '<p>🔐 <b>' + esc(m.tool) + '</b>: ' + esc(m.description) + '</p><div class="btns"><button class="allow">Allow</button><button class="deny">Deny</button></div>';
  div.querySelector('.allow').onclick = () => { respondPermission(m.id, true); div.remove(); };
  div.querySelector('.deny').onclick = () => { respondPermission(m.id, false); div.remove(); };
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
