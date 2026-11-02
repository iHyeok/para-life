import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ChatStore } from "../store";
import {
  ChannelServer,
  Client,
  freePort,
  rawRequest,
  removeDir,
  SERVER_PATH,
  stateDir,
  tempHome,
  waitFor,
} from "./harness";

const UI_ORIGIN = "http://ui.test:4000";
const MB = 1024 * 1024;

// Cleaned up after each test even when an assertion fails
const cleanup: (() => unknown)[] = [];
afterEach(async () => {
  while (cleanup.length) await cleanup.pop()?.();
});

async function startServer(opts: { home?: string; port?: number; env?: Record<string, string> } = {}) {
  const home = opts.home ?? tempHome();
  const port = opts.port ?? (await freePort());
  const srv = await ChannelServer.start({
    home,
    port,
    env: { PARA_ALLOWED_ORIGINS: UI_ORIGIN, ...opts.env },
  });
  cleanup.push(() => srv.kill());
  if (!opts.home) cleanup.push(() => removeDir(home));
  return srv;
}

async function connect(srv: ChannelServer, headers?: Record<string, string>) {
  const c = await Client.ready(srv.wsUrl(), headers);
  cleanup.push(() => c.close());
  return c;
}

describe("host and origin allowlist", () => {
  // Shared by this block, so not in the per-test cleanup
  let srv: ChannelServer;
  const home = tempHome();
  beforeAll(async () => {
    srv = await ChannelServer.start({
      home,
      port: await freePort(),
      env: { PARA_ALLOWED_ORIGINS: UI_ORIGIN, PARA_ALLOWED_HOSTS: "extra.test" },
    });
  });
  afterAll(async () => {
    await srv?.kill();
    removeDir(home);
  });

  const req = (headers: Record<string, string>, path = "/health") => rawRequest(srv.port, { path, headers });

  test("accepts the built-in hosts and PARA_ALLOWED_HOSTS", async () => {
    for (const host of [`127.0.0.1:${srv.port}`, `localhost:${srv.port}`, "api.kyxi.net", "extra.test"]) {
      expect((await req({ Host: host })).status).toBe(200);
    }
  });

  test("rejects unknown hosts", async () => {
    for (const host of ["evil.test", `evil.test:${srv.port}`, "127.0.0.1:1", `api.kyxi.net.evil.test`]) {
      const r = await req({ Host: host });
      expect(r.status).toBe(403);
      expect(r.body).toContain("Forbidden host");
    }
  });

  test("DNS rebinding: Host=evil:port with a matching same-origin Origin is still 403", async () => {
    const host = `evil.test:${srv.port}`;
    for (const path of ["/health", "/ws", "/"]) {
      const r = await req({ Host: host, Origin: `http://${host}` }, path);
      expect(r.status).toBe(403);
    }
    // Same for a WebSocket upgrade attempt
    const ws = await req(
      {
        Host: host,
        Origin: `http://${host}`,
        Upgrade: "websocket",
        Connection: "Upgrade",
        "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
        "Sec-WebSocket-Version": "13",
      },
      "/ws",
    );
    expect(ws.status).toBe(403);
  });

  test("origin rules: none, allowlisted and same-origin pass; others are 403", async () => {
    const host = `127.0.0.1:${srv.port}`;
    expect((await req({ Host: host })).status).toBe(200);
    const allowed = await req({ Host: host, Origin: UI_ORIGIN });
    expect(allowed.status).toBe(200);
    expect(allowed.headers["access-control-allow-origin"]).toBe(UI_ORIGIN);
    expect(allowed.headers["access-control-allow-credentials"]).toBe("true");
    expect((await req({ Host: host, Origin: `http://${host}` })).status).toBe(200);
    for (const origin of ["https://evil.test", "https://main.kyxi.net", "null", "not a url"]) {
      const r = await req({ Host: host, Origin: origin });
      expect(r.status).toBe(403);
      expect(r.headers["access-control-allow-origin"]).toBeUndefined();
    }
  });

  test("CORS preflight from an allowed origin", async () => {
    const r = await rawRequest(srv.port, {
      method: "OPTIONS",
      path: "/upload",
      headers: { Host: `127.0.0.1:${srv.port}`, Origin: UI_ORIGIN },
    });
    expect(r.status).toBe(204);
    expect(r.headers["access-control-allow-methods"]).toContain("POST");
  });

  test("WebSocket from a disallowed origin is refused, allowed origin connects", async () => {
    await expect(Client.connect(srv.wsUrl(), { Origin: "https://evil.test" })).rejects.toThrow();
    const c = await Client.ready(srv.wsUrl(), { Origin: UI_ORIGIN });
    c.close();
  });
});

describe("auth", () => {
  test("without SKIP_AUTH every route but /health needs a Cloudflare Access token", async () => {
    const home = tempHome();
    cleanup.push(() => removeDir(home));
    const srv = await ChannelServer.start({ home, port: await freePort(), env: { SKIP_AUTH: "0" } });
    cleanup.push(() => srv.kill());
    const host = { Host: `127.0.0.1:${srv.port}` };
    expect((await rawRequest(srv.port, { headers: host })).status).toBe(200);
    expect((await rawRequest(srv.port, { path: "/ws", headers: host })).status).toBe(401);
    expect((await rawRequest(srv.port, { path: "/", headers: host })).status).toBe(401);
    const forged = await rawRequest(srv.port, { path: "/", headers: { ...host, "Cf-Access-Jwt-Assertion": "x.y.z" } });
    expect(forged.status).toBe(401);
  });
});

describe("chat protocol", () => {
  test("hello lists the features, then history_end", async () => {
    const srv = await startServer();
    const c = await connect(srv);
    expect(c.frames[0]).toEqual({ type: "hello", features: ["echo", "ping", "history_end", "history_page", "activity"] });
    expect(c.frames.at(-1)).toEqual({ type: "history_end", hasMore: false });
  });

  test("ping gets a pong", async () => {
    const srv = await startServer();
    const c = await connect(srv);
    c.send({ type: "ping" });
    expect(await c.next((f) => f.type === "pong")).toEqual({ type: "pong" });
  });

  test("a user message is delivered to Claude and echoed to every client as the ack", async () => {
    const srv = await startServer();
    const a = await connect(srv);
    const b = await connect(srv);
    a.send({ id: "u1", text: "  hello **there**  " });
    const echo = await a.next((f) => f.type === "msg" && f.id === "u1");
    expect(echo).toMatchObject({ type: "msg", id: "u1", from: "user", text: "hello **there**" });
    expect(typeof echo.ts).toBe("number");
    expect(await b.next((f) => f.type === "msg" && f.id === "u1")).toMatchObject({ from: "user" });
    const n = await srv.waitNotification("notifications/claude/channel");
    expect(n.content).toBe("hello **there**");
    expect(n.meta).toMatchObject({ chat_id: "web", message_id: "u1", user: "web" });
  });

  test("blank and malformed messages are ignored", async () => {
    const srv = await startServer();
    const c = await connect(srv);
    c.send({ id: "blank", text: "   " });
    c.send({ id: 5, text: "number id" });
    c.ws.send("not json");
    c.send({ id: "ok", text: "after" });
    await c.next((f) => f.id === "ok");
    expect(srv.notifications("notifications/claude/channel").map((n) => n.params.content)).toEqual(["after"]);
  });

  test("a retried message id is acked again but delivered only once", async () => {
    const srv = await startServer();
    const a = await connect(srv);
    const b = await connect(srv);
    a.send({ id: "dup", text: "once" });
    const first = await a.next((f) => f.id === "dup");
    await b.next((f) => f.id === "dup");
    a.send({ id: "dup", text: "once" });
    const second = await a.next((f) => f.id === "dup");
    expect(second).toEqual(first);
    // Give a duplicate delivery a chance to show up before asserting it didn't
    a.send({ type: "ping" });
    await a.next((f) => f.type === "pong");
    await Bun.sleep(100);
    expect(srv.notifications("notifications/claude/channel")).toHaveLength(1);
    // The other client only saw the original broadcast
    expect(b.frames.filter((f) => f.id === "dup")).toHaveLength(1);
  });

  test("reply and edit_message tools reach the UI and are stored", async () => {
    const srv = await startServer();
    const c = await connect(srv);
    const res = await srv.callTool("reply", { text: "**hi**", reply_to: "u1" });
    expect(res.isError).toBeFalsy();
    const id = res.content[0].text.match(/^sent \((.+)\)$/)?.[1];
    expect(id).toBeTruthy();
    expect(await c.next((f) => f.type === "msg" && f.id === id)).toMatchObject({
      from: "assistant",
      text: "**hi**",
      replyTo: "u1",
    });

    const edit = await srv.callTool("edit_message", { message_id: id, text: "edited" });
    expect(edit.content[0].text).toBe("ok");
    expect(await c.next((f) => f.type === "edit")).toEqual({ type: "edit", id, text: "edited" });

    // A fresh client sees the edited text in the replay
    const fresh = await connect(srv);
    expect(fresh.replay().find((f) => f.id === id)).toMatchObject({ text: "edited", edited: true });
  });

  test("edit_message refuses user messages and unknown ids", async () => {
    const srv = await startServer();
    const c = await connect(srv);
    c.send({ id: "mine", text: "user text" });
    await c.next((f) => f.id === "mine");
    for (const message_id of ["mine", "nope"]) {
      const res = await srv.callTool("edit_message", { message_id, text: "hijack" });
      expect(res.isError).toBe(true);
    }
    const fresh = await connect(srv);
    expect(fresh.replay().find((f) => f.id === "mine")?.text).toBe("user text");
  });

  test("reply with a file copies it to the outbox and serves it", async () => {
    const srv = await startServer();
    const c = await connect(srv);
    const src = join(srv.home, "report.txt");
    writeFileSync(src, "file body");
    const res = await srv.callTool("reply", { text: "see file", files: [src] });
    expect(res.isError).toBeFalsy();
    const m = await c.next((f) => f.type === "msg" && f.from === "assistant");
    expect(m.file.name).toBe("report.txt");
    expect(m.file.url).toMatch(/^\/files\/[\w-]+\.txt$/);
    const r = await fetch(`http://127.0.0.1:${srv.port}${m.file.url}`);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("text/plain");
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await r.text()).toBe("file body");
    // Path traversal is refused
    expect((await rawRequest(srv.port, { path: "/files/..%2f..%2fx", headers: { Host: `127.0.0.1:${srv.port}` } })).status).toBe(400);
  });
});

describe("permission relay", () => {
  const request = (id: string) => ({
    jsonrpc: "2.0",
    method: "notifications/claude/channel/permission_request",
    params: { request_id: id, tool_name: "Bash", description: "list files", input_preview: '{"command":"ls"}' },
  });

  test("request reaches the UI, is replayed on reconnect, and the answer goes back to Claude", async () => {
    const srv = await startServer();
    const a = await connect(srv);
    srv.send(request("p1"));
    expect(await a.next((f) => f.type === "permission_request")).toEqual({
      type: "permission_request",
      id: "p1",
      tool: "Bash",
      description: "list files",
      input_preview: '{"command":"ls"}',
    });

    // A client that connects later gets the still-open request inside the replay
    const late = await connect(srv);
    expect(late.replay().some((f) => f.type === "permission_request" && f.id === "p1")).toBe(true);

    late.send({ type: "permission_response", id: "p1", allowed: true });
    expect(await srv.waitNotification("notifications/claude/channel/permission")).toEqual({
      request_id: "p1",
      behavior: "allow",
    });
    for (const c of [a, late]) {
      expect(await c.next((f) => f.type === "permission_resolved")).toEqual({
        type: "permission_resolved",
        id: "p1",
        behavior: "allow",
      });
    }

    // Answered: no longer replayed, and a second answer is ignored
    const after = await connect(srv);
    expect(after.replay().some((f) => f.type === "permission_request")).toBe(false);
    a.send({ type: "permission_response", id: "p1", allowed: false });
    a.send({ type: "ping" });
    await a.next((f) => f.type === "pong");
    await Bun.sleep(100);
    expect(srv.notifications("notifications/claude/channel/permission")).toHaveLength(1);
  });

  test("anything but allowed === true is a deny (HTTP route too)", async () => {
    const srv = await startServer();
    const c = await connect(srv);
    srv.send(request("p2"));
    await c.next((f) => f.type === "permission_request");
    const r = await fetch(`http://127.0.0.1:${srv.port}/permission`, {
      method: "POST",
      body: JSON.stringify({ id: "p2", allowed: "true" }),
    });
    expect(r.status).toBe(204);
    expect(await srv.waitNotification("notifications/claude/channel/permission")).toEqual({
      request_id: "p2",
      behavior: "deny",
    });
    expect(await c.next((f) => f.type === "permission_resolved")).toMatchObject({ id: "p2", behavior: "deny" });
  });
});

describe("file upload over WebSocket", () => {
  const inbox = (srv: ChannelServer) => join(stateDir(srv.home), "inbox");

  test("exactly 25MB is accepted and stored, delivered with its path", async () => {
    const srv = await startServer();
    const c = await connect(srv);
    const data = Buffer.alloc(25 * MB, 7);
    c.send({ type: "file_upload", id: "f1", text: "big one", fileName: "big.bin", fileData: data.toString("base64") });
    const echo = await c.next((f) => f.type === "msg" && f.id === "f1", 20000);
    expect(echo).toMatchObject({ from: "user", text: "big one", file: { name: "big.bin" } });
    expect(echo.file.url).toMatch(/^\/inbox\/[\w-]+\.bin$/);
    const n = await srv.waitNotification("notifications/claude/channel");
    expect(n.meta).toMatchObject({ message_id: "f1", file_name: "big.bin" });
    expect(n.meta.file_path.startsWith(inbox(srv))).toBe(true);
    expect(statSync(n.meta.file_path).size).toBe(25 * MB);
  }, 30000);

  test("one byte over 25MB is refused with an error for that id", async () => {
    const srv = await startServer();
    const c = await connect(srv);
    const data = Buffer.alloc(25 * MB + 1, 7);
    c.send({ type: "file_upload", id: "f2", text: "", fileName: "toobig.bin", fileData: data.toString("base64") });
    expect(await c.next((f) => f.type === "error", 20000)).toEqual({ type: "error", id: "f2", message: "file too large" });
    expect(srv.notifications("notifications/claude/channel")).toHaveLength(0);
    expect(existsSync(inbox(srv)) ? readdirSync(inbox(srv)) : []).toHaveLength(0);
  }, 30000);

  test("a retried upload is acked from the store without a second copy", async () => {
    const srv = await startServer();
    const c = await connect(srv);
    const payload = { type: "file_upload", id: "f3", text: "pic", fileName: "a.png", fileData: Buffer.from("png").toString("base64") };
    c.send(payload);
    const first = await c.next((f) => f.id === "f3");
    c.send(payload);
    expect(await c.next((f) => f.id === "f3")).toEqual(first);
    expect(readdirSync(inbox(srv))).toHaveLength(1);
    expect(srv.notifications("notifications/claude/channel")).toHaveLength(1);
    // The stored upload is served back with a safe content type
    const r = await fetch(`http://127.0.0.1:${srv.port}${first.file.url}`);
    expect(r.headers.get("content-type")).toBe("image/png");
    expect(r.headers.get("content-security-policy")).toContain("sandbox");
  });

  test("HTTP /upload enforces the same limit", async () => {
    const srv = await startServer();
    const form = new FormData();
    form.set("id", "h1");
    form.set("file", new File([Buffer.alloc(25 * MB + 1)], "x.bin"));
    const r = await fetch(`http://127.0.0.1:${srv.port}/upload`, { method: "POST", body: form });
    expect(r.status).toBe(413);
  }, 30000);
});

describe("history", () => {
  test("messages survive a server restart", async () => {
    const home = tempHome();
    cleanup.push(() => removeDir(home));
    const port = await freePort();
    const first = await startServer({ home, port });
    const c = await connect(first);
    c.send({ id: "keep1", text: "remember me" });
    await c.next((f) => f.id === "keep1");
    await first.callTool("reply", { text: "noted" });
    await c.next((f) => f.from === "assistant");
    c.close();
    await first.stop();

    const second = await startServer({ home, port });
    const fresh = await connect(second);
    const msgs = fresh.replay().filter((f) => f.type === "msg");
    expect(msgs.map((m) => m.text)).toEqual(["remember me", "noted"]);
    // Still deduped after the restart
    fresh.send({ id: "keep1", text: "remember me" });
    await fresh.next((f) => f.id === "keep1");
    await Bun.sleep(100);
    expect(second.notifications("notifications/claude/channel")).toHaveLength(0);
  });

  test("replay sends the newest 200; history_before pages older ones", async () => {
    const home = tempHome();
    cleanup.push(() => removeDir(home));
    const seed = new ChatStore(stateDir(home));
    const base = Date.now() - 300 * 60000;
    for (let i = 0; i < 300; i++) {
      seed.save({ id: `s${String(i).padStart(3, "0")}`, from: i % 2 ? "assistant" : "user", text: `seed ${i}`, ts: base + i * 60000 });
    }
    seed.close();

    const srv = await startServer({ home });
    const c = await connect(srv);
    const replay = c.replay().filter((f) => f.type === "msg");
    expect(replay).toHaveLength(200);
    expect(replay[0].id).toBe("s100");
    expect(replay.at(-1)?.id).toBe("s299");
    expect(c.replay().at(-1)).toEqual({ type: "history_end", hasMore: true });

    c.send({ type: "history_before", before: { ts: replay[0].ts, id: replay[0].id }, limit: 60 });
    const page = await c.next((f) => f.type === "history_page");
    expect(page.messages.map((m: any) => m.id)).toEqual(Array.from({ length: 60 }, (_, i) => `s0${40 + i}`));
    expect(page.messages[0].type).toBe("msg");
    expect(page.hasMore).toBe(true);

    // Limit is capped at 100
    c.send({ type: "history_before", before: { ts: page.messages[0].ts, id: page.messages[0].id }, limit: 1000 });
    const last = await c.next((f) => f.type === "history_page");
    expect(last.messages).toHaveLength(40);
    expect(last.messages[0].id).toBe("s000");
    expect(last.hasMore).toBe(false);

    // Bad cursors are ignored
    c.send({ type: "history_before", before: { ts: "x", id: 1 } });
    c.send({ type: "ping" });
    const next = await c.next((f) => f.type === "history_page" || f.type === "pong");
    expect(next.type).toBe("pong");
  });
});

describe("process lifecycle", () => {
  test("exits when stdin closes", async () => {
    const home = tempHome();
    cleanup.push(() => removeDir(home));
    const srv = await ChannelServer.start({ home, port: await freePort() });
    cleanup.push(() => srv.kill());
    srv.proc.stdin.end();
    const code = await Promise.race([srv.proc.exited, Bun.sleep(5000).then(() => "timeout")]);
    expect(code).toBe(0);
  });

  test("a second instance on the same port leaves a live server alone", async () => {
    const home = tempHome();
    cleanup.push(() => removeDir(home));
    const port = await freePort();
    const live = await startServer({ home, port });
    const c = await connect(live);

    const second = await ChannelServer.start({ home: tempHome(), port, env: { SKIP_AUTH: "1" } });
    cleanup.push(() => second.kill());
    cleanup.push(() => removeDir(second.home));
    // It notices the live owner (or fails to bind) and runs without the web channel
    expect(second.stderr).toMatch(/held by live pid|web channel disabled/);
    expect(second.stderr).not.toContain("killing orphaned");

    // The original server and its socket keep working
    expect(live.proc.exitCode).toBeNull();
    c.send({ id: "still", text: "alive" });
    expect(await c.next((f) => f.id === "still")).toMatchObject({ text: "alive" });
    expect((await fetch(`http://127.0.0.1:${port}/health`).then((r) => r.json())).clients).toBe(1);
    // MCP still works on the second one
    expect((await second.callTool("reply", { text: "x" })).isError).toBeFalsy();
  });

  // The server finds the port's owner with lsof; without it there is nothing to test
  const hasLsof = Bun.which("lsof") !== null;
  test.skipIf(!hasLsof)("an orphaned channel server holding the port is replaced", async () => {
    const home = tempHome();
    cleanup.push(() => removeDir(home));
    const port = await freePort();
    // `sleep | bun server.ts &` in a shell that exits right away: the server is reparented
    // to init and its stdin stays open, like a server whose Claude Code session died
    const env = { ...process.env, HOME: home, PARA_CHANNEL_PORT: String(port), SKIP_AUTH: "1" };
    const sh = Bun.spawn(["sh", "-c", `(sleep 60 | "${process.execPath}" "${SERVER_PATH}" >/dev/null 2>&1 &)`], {
      env,
      stdout: "ignore",
      stderr: "ignore",
    });
    await sh.exited;
    const orphanPid = await waitFor(
      () => {
        try {
          return Number(execSync(`lsof -nP -ti tcp:${port} -sTCP:LISTEN`, { encoding: "utf-8" }).trim().split("\n")[0]);
        } catch {
          return 0;
        }
      },
      10000,
      "orphan listening",
    );
    cleanup.push(() => {
      try {
        process.kill(orphanPid, "SIGKILL");
      } catch {}
    });
    const ppid = Number(execSync(`ps -o ppid= -p ${orphanPid}`, { encoding: "utf-8" }).trim());
    if (ppid !== 1) {
      // Some CI sandboxes reparent orphans to a subreaper instead of init; the rule can't be exercised there
      console.warn(`orphan reparented to ${ppid}, not init: skipping`);
      return;
    }

    const fresh = await startServer({ home, port });
    expect(fresh.stderr).toContain(`killing orphaned channel server on port ${port}: pid ${orphanPid}`);
    await waitFor(() => {
      try {
        process.kill(orphanPid, 0);
        return false;
      } catch {
        return true;
      }
    }, 5000, "orphan to exit");
    const c = await connect(fresh);
    expect(c.frames[0].type).toBe("hello");
  }, 20000);
});

describe("project sessions (PARA_CHANNEL_ID / PARA_CHANNEL_BASE)", () => {
  const env = { PARA_CHANNEL_ID: "paper", PARA_CHANNEL_NAME: "Paper", PARA_CHANNEL_BASE: "/p/paper" };

  test("serves under the tunnel prefix and keeps its own history dir", async () => {
    const home = tempHome();
    cleanup.push(() => removeDir(home));
    const srv = await startServer({ home, env });
    const base = `http://127.0.0.1:${srv.port}/p/paper`;
    const health = await fetch(`${base}/health`, { headers: { Origin: UI_ORIGIN } });
    expect(health.status).toBe(200);
    // Local access without the prefix still works
    expect((await fetch(`http://127.0.0.1:${srv.port}/health`)).status).toBe(200);

    const c = await connect(srv);
    c.ws.close();
    const viaPrefix = await Client.ready(`ws://127.0.0.1:${srv.port}/p/paper/ws`, { Origin: UI_ORIGIN });
    cleanup.push(() => viaPrefix.close());
    viaPrefix.send({ id: "p1", text: "paper only" });
    await viaPrefix.next((f) => f.type === "msg" && f.id === "p1");

    const dir = join(home, ".claude", "channels", "paper");
    await waitFor(() => existsSync(join(dir, "chat.db")), 5000, "paper chat.db");
    expect(existsSync(stateDir(home))).toBe(false);
  });

  test("announces itself as a project session, not the orchestrator", async () => {
    const srv = await startServer({ env });
    const init = await srv.response(1);
    expect(init.result.serverInfo.name).toBe("para-paper-channel");
    expect(init.result.instructions).toContain('"Paper"');
    expect(init.result.instructions).not.toContain("You are the PARA Life orchestrator");
  });

  test("a prefix that only looks similar is not stripped", async () => {
    const srv = await startServer({ env });
    const res = await fetch(`http://127.0.0.1:${srv.port}/p/paperx/health`, { headers: { Origin: UI_ORIGIN } });
    expect(res.status).not.toBe(200);
  });
});

describe("session activity (hooks → chat)", () => {
  async function post(srv: ChannelServer, body: object, opts: { token?: string; host?: string } = {}) {
    const info = JSON.parse(readFileSync(join(stateDir(srv.home), "activity.json"), "utf-8"));
    return rawRequest(srv.port, {
      method: "POST",
      path: "/activity",
      headers: {
        Host: opts.host ?? `127.0.0.1:${srv.port}`,
        "Content-Type": "application/json",
        "X-Activity-Token": opts.token ?? info.token,
      },
      body: JSON.stringify(body),
    });
  }

  test("activity.json is private and names the port", async () => {
    const srv = await startServer();
    const file = join(stateDir(srv.home), "activity.json");
    expect(statSync(file).mode & 0o777).toBe(0o600);
    const info = JSON.parse(readFileSync(file, "utf-8"));
    expect(info.port).toBe(srv.port);
    expect(info.token).toMatch(/^[0-9a-f]{48}$/);
  });

  test("rejects reports without the token or arriving through the tunnel host", async () => {
    const srv = await startServer();
    expect((await post(srv, { event: "Stop" }, { token: "x".repeat(48) })).status).toBe(403);
    expect((await post(srv, { event: "Stop" }, { host: "api.kyxi.net" })).status).toBe(403);
    expect((await post(srv, { nope: 1 })).status).toBe(400);
  });

  test("hooks drive working → idle; deliveries and permissions update it; late joiners get the state", async () => {
    const srv = await startServer();
    const c = await connect(srv);
    expect(c.frames[0].features).toContain("activity");
    // Silent until a hook has been seen (a session without hooks would never go idle)
    c.send({ id: "a0", text: "before hooks" });
    await c.next((f) => f.type === "msg" && f.id === "a0");
    expect(c.frames.some((f) => f.type === "activity")).toBe(false);

    expect((await post(srv, { event: "PreToolUse", label: "파일 읽는 중 · a.md" })).status).toBe(204);
    const w = await c.next((f) => f.type === "activity");
    expect(w).toMatchObject({ state: "working", label: "파일 읽는 중 · a.md" });
    await post(srv, { event: "PostToolUse", label: "생각 중" });
    const w2 = await c.next((f) => f.type === "activity");
    expect(w2).toMatchObject({ state: "working", label: "생각 중", since: w.since });

    const late = await connect(srv);
    expect(late.frames.at(-1)).toMatchObject({ type: "activity", state: "working", label: "생각 중" });

    await post(srv, { event: "Stop" });
    expect(await c.next((f) => f.type === "activity")).toMatchObject({ state: "idle" });

    // A new message while idle starts a new working stretch right away
    c.send({ id: "a1", text: "next" });
    const d = await c.next((f) => f.type === "activity");
    expect(d).toMatchObject({ state: "working", label: "메시지 확인 중" });
    expect(d.since).toBeGreaterThanOrEqual(w.since);

    // Permission prompt → waiting, answered → working
    srv.send({
      jsonrpc: "2.0",
      method: "notifications/claude/channel/permission_request",
      params: { request_id: "perm1", tool_name: "Bash", description: "run", input_preview: "ls" },
    });
    expect(await c.next((f) => f.type === "activity")).toMatchObject({ state: "waiting", label: "승인 대기 · Bash" });
    c.send({ type: "permission_response", id: "perm1", allowed: true });
    expect(await c.next((f) => f.type === "activity")).toMatchObject({ state: "working" });
  });
});
