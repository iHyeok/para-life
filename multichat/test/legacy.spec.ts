// The current client against an old channel server without hello/echo/ping (port of old.ts)
import { type ChildProcess, spawn } from "node:child_process";
import path from "node:path";
import { BUN, connectionStatus, expect, freePort, openChat, test, waitFor } from "./fixtures";

let legacy: ChildProcess;
let port: number;

test.beforeEach(async ({ page, ui }) => {
  port = await freePort();
  let stderr = "";
  legacy = spawn(BUN, [path.join(__dirname, "legacy-server.ts"), String(port)], { stdio: ["ignore", "ignore", "pipe"] });
  legacy.stderr?.on("data", (d) => {
    stderr += d;
  });
  await waitFor(() => stderr.includes("legacy server on"), 10_000, "legacy server");
  await openChat(page, ui, { wsUrl: `ws://127.0.0.1:${port}/ws`, httpUrl: `http://127.0.0.1:${port}` });
});

test.afterEach(async ({ pageErrors }) => {
  legacy.kill("SIGKILL");
  expect(pageErrors).toEqual([]);
});

const received = () => fetch(`http://127.0.0.1:${port}/received`).then((r) => r.json());

test("without an echo, transmission counts as sent", async ({ page }) => {
  const convo = page.locator(".conversation");
  await expect(convo).toContainText("history from the old server");
  await page.locator("textarea").fill("hello old server");
  await page.keyboard.press("Enter");
  await expect.poll(received).toEqual(["hello old server"]);
  await expect(convo).not.toContainText("전송 중…");
  await expect(convo).not.toContainText("전송 실패");
});

test("@slow no heartbeat or ack timeout against a server that never answers them", async ({ page }) => {
  // Past the 20s ack timeout and the 25s+10s heartbeat window
  test.setTimeout(90_000);
  await page.locator("textarea").fill("hello old server");
  await page.keyboard.press("Enter");
  await expect.poll(received).toEqual(["hello old server"]);
  await page.waitForTimeout(40_000);
  expect(await connectionStatus(page)).toBe("연결됨");
  await expect(page.locator(".conversation")).not.toContainText("전송 실패");
});
