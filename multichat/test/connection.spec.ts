// Connection resilience: reconnect backoff, frozen-server detection, slow uploads
// (ports of the review session's backoff.ts, halfopen.ts and v_up_verify.ts)
import { randomBytes } from "node:crypto";
import { connectionStatus, expect, openChat, test } from "./fixtures";

declare global {
  interface Window {
    __wsOpened: number[];
  }
}

/** Record when each WebSocket is created (page clock, ms). */
function recordSockets() {
  const W = window.WebSocket;
  window.__wsOpened = [];
  window.WebSocket = class extends W {
    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, protocols);
      window.__wsOpened.push(performance.now());
    }
  };
}

const pageNow = (page: import("@playwright/test").Page) => page.evaluate(() => performance.now());
const sockets = (page: import("@playwright/test").Page) => page.evaluate(() => window.__wsOpened);

test.afterEach(async ({ pageErrors }) => {
  expect(pageErrors).toEqual([]);
});

test("reconnect attempts back off exponentially and reset after a successful connect", async ({ page, ui, server }) => {
  test.setTimeout(45_000);
  await server.start();
  await openChat(page, ui, server, recordSockets);
  expect(await sockets(page)).toHaveLength(1);

  await server.stop();
  const dropped = await pageNow(page);
  await expect.poll(() => connectionStatus(page)).toMatch(/^연결 끊김 · \d+초 후 재시도$/);
  // Retries at +1s, then 2s and 4s apart
  await expect.poll(() => sockets(page).then((s) => s.length), { timeout: 12_000 }).toBe(4);
  const [, a1, a2, a3] = await sockets(page);
  const gaps = [a1 - dropped, a2 - a1, a3 - a2].map((g) => Math.round(g));
  expect(gaps[0], `gaps ${gaps}`).toBeGreaterThan(700);
  expect(gaps[0], `gaps ${gaps}`).toBeLessThan(1800);
  expect(gaps[1], `gaps ${gaps}`).toBeGreaterThan(1700);
  expect(gaps[1], `gaps ${gaps}`).toBeLessThan(2900);
  expect(gaps[2], `gaps ${gaps}`).toBeGreaterThan(3500);
  expect(gaps[2], `gaps ${gaps}`).toBeLessThan(5200);

  // Back online: "지금 연결" connects right away, and the next outage starts over at 1s
  await server.start();
  await page.getByRole("button", { name: "지금 연결" }).click();
  await expect.poll(() => connectionStatus(page)).toBe("연결됨");
  const before = (await sockets(page)).length;
  await server.stop();
  const dropped2 = await pageNow(page);
  await expect.poll(() => sockets(page).then((s) => s.length), { timeout: 5_000 }).toBe(before + 1);
  const retry = (await sockets(page))[before] - dropped2;
  expect(retry).toBeLessThan(1800);
});

test("@slow a frozen server (half-open socket) is detected by the heartbeat", async ({ page, ui, server }) => {
  // Heartbeat: ping every 25s, drop after 10s without an answer -> at most ~35s
  test.setTimeout(120_000);
  await server.start();
  await openChat(page, ui, server, recordSockets);
  // The socket stays open at the TCP level: the kernel keeps accepting, the process never answers
  process.kill(server.proc.pid as number, "SIGSTOP");
  const frozenAt = Date.now();
  await expect.poll(() => connectionStatus(page), { timeout: 40_000, intervals: [500] }).not.toBe("연결됨");
  const detectedIn = Date.now() - frozenAt;
  expect(detectedIn).toBeLessThanOrEqual(40_000);
  // Reconnect attempts can't complete against the frozen process either
  await page.waitForTimeout(3_000);
  expect(await connectionStatus(page)).not.toBe("연결됨");

  // Thawed: the pending upgrade (or the next retry) gets through on its own
  process.kill(server.proc.pid as number, "SIGCONT");
  await expect.poll(() => connectionStatus(page), { timeout: 30_000 }).toBe("연결됨");
});

test("@slow a slow upload is not marked failed while it is still being sent", async ({ page, ui, server }) => {
  test.setTimeout(150_000);
  await server.start();
  await openChat(page, ui, server);
  // ~40 KB/s up: a 1 MB file (1.33 MB as base64) takes ~35s, longer than the 20s ack timeout
  // and the 25s heartbeat, which must both wait for the bytes to leave
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 50,
    downloadThroughput: 1_000_000,
    uploadThroughput: 40_000,
  });
  const data = randomBytes(1024 * 1024);
  await page.locator('input[type="file"]').setInputFiles({ name: "big.bin", mimeType: "application/octet-stream", buffer: data });
  await page.locator("textarea").fill("slow upload");
  await page.getByRole("button", { name: "전송", exact: true }).click();

  const convo = page.locator(".conversation");
  await expect(convo).toContainText("전송 중…");
  const started = Date.now();
  // Watch the whole transfer: never failed, never disconnected
  for (;;) {
    const text = (await convo.textContent()) ?? "";
    expect(text).not.toContain("전송 실패");
    expect(await connectionStatus(page)).toBe("연결됨");
    if (!text.includes("전송 중…")) break;
    expect(Date.now() - started).toBeLessThan(120_000);
    await page.waitForTimeout(500);
  }
  const took = Date.now() - started;
  const delivered = await server.waitDelivered((p) => p.meta.file_name === "big.bin");
  expect(delivered.content).toBe("slow upload");
  // The throttle really applied (otherwise this test proves nothing)
  expect(took).toBeGreaterThan(20_000);
  // And stays fine after the ack timeout would have fired
  await page.waitForTimeout(2_000);
  await expect(convo).not.toContainText("전송 실패");
  await expect(convo.getByRole("link", { name: "big.bin" })).toBeVisible();
});
