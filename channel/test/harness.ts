/**
 * Test helpers: spawn channel/server.ts with a throwaway HOME and a free port,
 * talk MCP JSON-RPC over its stdin/stdout and the chat protocol over WebSocket.
 */
import type { Subprocess } from "bun";
import { mkdtempSync, rmSync } from "node:fs";
import { createConnection, createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const SERVER_PATH = join(import.meta.dir, "..", "server.ts");

export function tempHome(prefix = "para-home-") {
  return mkdtempSync(join(tmpdir(), prefix));
}

export function removeDir(dir: string) {
  rmSync(dir, { recursive: true, force: true });
}

export function stateDir(home: string) {
  return join(home, ".claude", "channels", "para-life");
}

export async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      srv.close(() => resolve(port));
    });
  });
}

/** Poll until `fn` returns a truthy value or the timeout passes. */
export async function waitFor<T>(fn: () => T | Promise<T>, timeoutMs = 5000, what = "condition"): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await Bun.sleep(20);
  }
}

type Json = Record<string, any>;

export type ServerOptions = {
  home: string;
  port: number;
  env?: Record<string, string>;
  /** Skip the MCP initialize handshake (Claude Code always sends it) */
  noInitialize?: boolean;
};

export class ChannelServer {
  proc: Subprocess<"pipe", "pipe", "pipe">;
  /** Every JSON-RPC message the server wrote to stdout */
  out: Json[] = [];
  stderr = "";
  readonly port: number;
  readonly home: string;
  private nextId = 100;

  private constructor(opts: ServerOptions) {
    this.port = opts.port;
    this.home = opts.home;
    this.proc = Bun.spawn([process.execPath, SERVER_PATH], {
      env: {
        PATH: process.env.PATH ?? "",
        HOME: opts.home,
        PARA_CHANNEL_PORT: String(opts.port),
        SKIP_AUTH: "1",
        ...opts.env,
      },
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });
    void this.readStdout();
    void this.readStderr();
  }

  static async start(opts: ServerOptions): Promise<ChannelServer> {
    const s = new ChannelServer(opts);
    if (!opts.noInitialize) {
      s.send({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } },
      });
      await s.response(1);
      s.send({ jsonrpc: "2.0", method: "notifications/initialized" });
    }
    // The HTTP listener is up (or deliberately disabled) once stderr says so
    await waitFor(
      () => /para-life-channel: http|web channel disabled/.test(s.stderr),
      10000,
      `server start on ${opts.port} (stderr: ${s.stderr})`,
    );
    return s;
  }

  private async readStdout() {
    const decoder = new TextDecoder();
    let buf = "";
    for await (const chunk of this.proc.stdout) {
      buf += decoder.decode(chunk, { stream: true });
      let i = buf.indexOf("\n");
      while (i >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 1);
        try {
          this.out.push(JSON.parse(line));
        } catch {}
        i = buf.indexOf("\n");
      }
    }
  }

  private async readStderr() {
    const decoder = new TextDecoder();
    for await (const chunk of this.proc.stderr) this.stderr += decoder.decode(chunk, { stream: true });
  }

  send(msg: Json) {
    this.proc.stdin.write(`${JSON.stringify(msg)}\n`);
    this.proc.stdin.flush();
  }

  response(id: number, timeoutMs = 5000) {
    return waitFor(() => this.out.find((m) => m.id === id), timeoutMs, `MCP response ${id}`);
  }

  async callTool(name: string, args: Json) {
    const id = this.nextId++;
    this.send({ jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } });
    return (await this.response(id)).result as { content: { type: string; text: string }[]; isError?: boolean };
  }

  notifications(method: string) {
    return this.out.filter((m) => m.method === method);
  }

  waitNotification(method: string, pred: (params: Json) => boolean = () => true, timeoutMs = 5000) {
    return waitFor(
      () => this.out.find((m) => m.method === method && pred(m.params)),
      timeoutMs,
      `notification ${method}`,
    ).then((m) => m.params as Json);
  }

  /** Close stdin like a Claude Code session ending, and wait for the exit. */
  async stop() {
    try {
      this.proc.stdin.end();
    } catch {}
    const timer = setTimeout(() => this.proc.kill("SIGKILL"), 5000);
    await this.proc.exited;
    clearTimeout(timer);
  }

  kill() {
    this.proc.kill("SIGKILL");
    return this.proc.exited;
  }

  wsUrl() {
    return `ws://127.0.0.1:${this.port}/ws`;
  }
}

/** WebSocket client that keeps every frame so tests can wait for specific ones. */
export class Client {
  ws: WebSocket;
  frames: Json[] = [];
  closed = false;
  private cursor = 0;

  private constructor(url: string, headers?: Record<string, string>) {
    // Bun's WebSocket accepts extra handshake headers (used for Origin)
    this.ws = new WebSocket(url, headers ? ({ headers } as any) : undefined);
    this.ws.onmessage = (e) => this.frames.push(JSON.parse(String(e.data)));
    this.ws.onclose = () => {
      this.closed = true;
    };
  }

  static async connect(url: string, headers?: Record<string, string>) {
    const c = new Client(url, headers);
    await new Promise<void>((resolve, reject) => {
      c.ws.onopen = () => resolve();
      c.ws.onerror = () => reject(new Error(`ws connect failed: ${url}`));
    });
    return c;
  }

  /** Connect and wait for the history replay to finish. */
  static async ready(url: string, headers?: Record<string, string>) {
    const c = await Client.connect(url, headers);
    await c.next((f) => f.type === "history_end");
    return c;
  }

  send(msg: Json) {
    this.ws.send(JSON.stringify(msg));
  }

  /** Next frame (after the previous match) satisfying pred. */
  async next(pred: (f: Json) => boolean, timeoutMs = 5000): Promise<Json> {
    const found = await waitFor(
      () => {
        for (let i = this.cursor; i < this.frames.length; i++) {
          if (pred(this.frames[i])) {
            this.cursor = i + 1;
            return this.frames[i];
          }
        }
        return undefined;
      },
      timeoutMs,
      "websocket frame",
    );
    return found;
  }

  /** Frames received up to the first history_end, i.e. the replay. */
  replay() {
    const end = this.frames.findIndex((f) => f.type === "history_end");
    return this.frames.slice(0, end < 0 ? this.frames.length : end + 1);
  }

  close() {
    this.ws.close();
  }
}

/** Raw HTTP/1.1 request so tests control the exact Host and Origin headers. */
export function rawRequest(
  port: number,
  { method = "GET", path = "/health", headers = {} as Record<string, string>, body = "" } = {},
): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  return new Promise((resolve, reject) => {
    const sock = createConnection({ port, host: "127.0.0.1" });
    let data = "";
    sock.setEncoding("utf-8");
    sock.on("connect", () => {
      const lines = [`${method} ${path} HTTP/1.1`, "Connection: close"];
      for (const [k, v] of Object.entries(headers)) lines.push(`${k}: ${v}`);
      if (body) lines.push(`Content-Length: ${Buffer.byteLength(body)}`);
      sock.write(`${lines.join("\r\n")}\r\n\r\n${body}`);
    });
    sock.on("data", (d) => {
      data += d;
    });
    sock.on("error", reject);
    sock.on("close", () => {
      const [head, ...rest] = data.split("\r\n\r\n");
      const [statusLine, ...headerLines] = head.split("\r\n");
      const hdrs: Record<string, string> = {};
      for (const l of headerLines) {
        const i = l.indexOf(":");
        if (i > 0) hdrs[l.slice(0, i).toLowerCase()] = l.slice(i + 1).trim();
      }
      resolve({ status: Number(statusLine.split(" ")[1]), headers: hdrs, body: rest.join("\r\n\r\n") });
    });
  });
}
