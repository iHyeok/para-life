/**
 * Playwright fixtures for the multichat end-to-end suite:
 * - `ui`: multichat/ served statically on a free port (index.html + committed build/main.js)
 * - `server`: channel/server.ts spawned with a temp HOME and free port, driven over MCP stdio
 * - `page`: points multichat at that server via localStorage; external requests (fonts) are blocked
 */
import { type ChildProcessWithoutNullStreams, execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { test as base, expect, type Page } from "@playwright/test";

const MULTICHAT_DIR = path.resolve(__dirname, "..");
const SERVER_PATH = path.resolve(__dirname, "..", "..", "channel", "server.ts");
const SEED_SCRIPT = path.resolve(__dirname, "seed.ts");
export const BUN = process.env.BUN_BIN ?? "bun";

export async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      srv.close(() => resolve(typeof addr === "object" && addr ? addr.port : 0));
    });
  });
}

export async function waitFor<T>(fn: () => T | Promise<T>, timeoutMs = 5000, what = "condition"): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 25));
  }
}

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css",
  ".json": "application/json",
};

/** Minimal static file server for multichat/ (what Cloudflare Pages serves in production). */
export async function serveStatic(root: string) {
  const port = await freePort();
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith("/")) rel += "index.html";
    const file = path.join(root, rel);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end("not found");
      return;
    }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
  return { port, origin: `http://127.0.0.1:${port}`, close: () => new Promise((r) => server.close(r)) };
}

type Json = Record<string, any>;

/** channel/server.ts as a child process, standing in for the Claude Code session. */
export class Channel {
  proc!: ChildProcessWithoutNullStreams;
  out: Json[] = [];
  stderr = "";
  readonly home = fs.mkdtempSync(path.join(os.tmpdir(), "para-e2e-home-"));
  private nextId = 100;

  constructor(
    readonly port: number,
    readonly allowedOrigin: string,
  ) {}

  get wsUrl() {
    return `ws://127.0.0.1:${this.port}/ws`;
  }

  get httpUrl() {
    return `http://127.0.0.1:${this.port}`;
  }

  /** Write `count` messages into the chat history before the server starts. */
  seed(count: number) {
    execFileSync(BUN, [SEED_SCRIPT, path.join(this.home, ".claude", "channels", "para-life"), String(count)]);
  }

  async start() {
    this.out = [];
    this.stderr = "";
    this.proc = spawn(BUN, [SERVER_PATH], {
      env: {
        PATH: process.env.PATH ?? "",
        HOME: this.home,
        PARA_CHANNEL_PORT: String(this.port),
        PARA_ALLOWED_ORIGINS: this.allowedOrigin,
        SKIP_AUTH: "1",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let buf = "";
    this.proc.stdout.setEncoding("utf-8");
    this.proc.stdout.on("data", (d: string) => {
      buf += d;
      let i = buf.indexOf("\n");
      while (i >= 0) {
        try {
          this.out.push(JSON.parse(buf.slice(0, i)));
        } catch {}
        buf = buf.slice(i + 1);
        i = buf.indexOf("\n");
      }
    });
    this.proc.stderr.setEncoding("utf-8");
    this.proc.stderr.on("data", (d: string) => {
      this.stderr += d;
    });
    this.send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "e2e", version: "1" } },
    });
    await waitFor(() => this.out.find((m) => m.id === 1), 10000, "MCP initialize");
    this.send({ jsonrpc: "2.0", method: "notifications/initialized" });
    await waitFor(() => this.stderr.includes("para-life-channel: http"), 10000, `channel server (${this.stderr})`);
  }

  send(msg: Json) {
    this.proc.stdin.write(`${JSON.stringify(msg)}\n`);
  }

  reply(text: string) {
    this.send({ jsonrpc: "2.0", id: this.nextId++, method: "tools/call", params: { name: "reply", arguments: { text } } });
  }

  requestPermission(id: string, input_preview: string) {
    this.send({
      jsonrpc: "2.0",
      method: "notifications/claude/channel/permission_request",
      params: { request_id: id, tool_name: "Bash", description: "list files", input_preview },
    });
  }

  /** Contents of every user message delivered to "Claude" so far. */
  delivered() {
    return this.out.filter((m) => m.method === "notifications/claude/channel").map((m) => m.params);
  }

  waitDelivered(pred: (p: Json) => boolean, timeoutMs = 5000) {
    return waitFor(() => this.delivered().find(pred), timeoutMs, "delivery to Claude");
  }

  /** End the session the way Claude Code does: close stdin, the server exits. */
  async stop() {
    if (!this.proc || this.proc.exitCode !== null || this.proc.signalCode) return;
    const exited = new Promise((r) => this.proc.once("exit", r));
    this.proc.stdin.end();
    const timer = setTimeout(() => this.proc.kill("SIGKILL"), 5000);
    await exited;
    clearTimeout(timer);
  }

  async restart() {
    await this.stop();
    await this.start();
  }

  async dispose() {
    if (this.proc && this.proc.exitCode === null && !this.proc.signalCode) {
      try {
        this.proc.kill("SIGCONT");
      } catch {}
      this.proc.kill("SIGKILL");
    }
    fs.rmSync(this.home, { recursive: true, force: true });
  }
}

/** Point multichat at the test channel before the app boots. */
export async function openChat(
  page: Page,
  ui: { origin: string },
  channel: { wsUrl: string; httpUrl: string },
  extraInit?: () => void,
) {
  await page.addInitScript(
    ({ wsUrl, httpUrl }) => {
      localStorage.setItem(
        "multichat-channels",
        JSON.stringify([{ id: "para-life", name: "PARA Life", wsUrl, httpUrl, color: "#60a5fa" }]),
      );
      // Keep built-in defaults (e.g. the Paper session) out of single-channel tests
      localStorage.setItem("multichat-seen-defaults", JSON.stringify(["para-life", "paper"]));
    },
    { wsUrl: channel.wsUrl, httpUrl: channel.httpUrl },
  );
  if (extraInit) await page.addInitScript(extraInit);
  await page.goto(`${ui.origin}/`);
  await expect(page.locator(".conversation")).toContainText("연결됨");
}

/** Header status line of the open conversation. */
export function connectionStatus(page: Page) {
  return page.evaluate(
    () => document.querySelector(".conversation")?.textContent?.match(/연결 끊김(?: · \d+초 후 재시도)?|연결 중…|연결됨/)?.[0] ?? "",
  );
}

type Fixtures = { server: Channel; pageErrors: string[] };
type WorkerFixtures = { ui: { port: number; origin: string } };

export const test = base.extend<Fixtures, WorkerFixtures>({
  ui: [
    // biome-ignore lint/correctness/noEmptyPattern: Playwright fixture signature
    async ({}, use) => {
      const server = await serveStatic(MULTICHAT_DIR);
      await use(server);
      await server.close();
    },
    { scope: "worker" },
  ],
  server: async ({ ui }, use) => {
    const channel = new Channel(await freePort(), ui.origin);
    await use(channel);
    await channel.dispose();
  },
  context: async ({ context }, use) => {
    // Hermetic: only the local UI and channel servers (Pretendard/Google Fonts CDNs are blocked)
    await context.route(/^https?:\/\/(?!127\.0\.0\.1[:/])/, (route) => route.abort());
    await use(context);
  },
  pageErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      // Blocked font requests log network errors; anything else is a real problem
      if (m.type() === "error" && !/net::ERR_FAILED|Failed to load resource/.test(m.text())) errors.push(m.text());
    });
    page.on("dialog", async (d) => {
      errors.push(`dialog: ${d.message()}`);
      await d.dismiss();
    });
    await use(errors);
  },
});

export { expect };
