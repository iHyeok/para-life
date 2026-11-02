// Core chat flows on a phone-sized viewport (port of the review session's e2e.ts)
import { connectionStatus, expect, openChat, test } from "./fixtures";

test.use({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true });

test.beforeEach(async ({ page, ui, server }) => {
  await server.start();
  await openChat(page, ui, server);
});

test.afterEach(async ({ pageErrors }) => {
  expect(pageErrors).toEqual([]);
});

const sendButton = 'button[aria-label="전송"]';
const sidebarVisible = (page: import("@playwright/test").Page) =>
  page.$eval(".sidebar", (el) => getComputedStyle(el).display !== "none");

test("phone layout: one pane, connected, quick prompts, Pretendard, no horizontal overflow", async ({ page }) => {
  expect(await connectionStatus(page)).toBe("연결됨");
  expect(await sidebarVisible(page)).toBe(false);
  await expect(page.getByRole("button", { name: "오늘 브리핑", exact: true })).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain("Pretendard");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("a sent message is delivered to Claude and the echo marks it sent", async ({ page, server }) => {
  await page.locator("textarea").fill("안녕 **test**");
  await page.click(sendButton);
  const delivered = await server.waitDelivered((p) => p.content === "안녕 **test**");
  expect(delivered.meta.message_id).toMatch(/^u\d+-\d+$/);
  // User text is shown verbatim, not as markdown
  await expect(page.locator(".conversation")).toContainText("안녕 **test**");
  await expect(page.locator(".conversation")).not.toContainText("전송 중");
  await expect(page.locator(".conversation")).not.toContainText("전송 실패");
});

test("a quick prompt sends its text", async ({ page, server }) => {
  await page.getByRole("button", { name: "오늘 브리핑", exact: true }).click();
  await server.waitDelivered((p) => p.content.startsWith("오늘 브리핑 해줘"));
});

test("assistant markdown renders, raw HTML is text and remote images become links", async ({ page, server }) => {
  server.reply(
    "**굵게** 와 [링크](https://example.com)\n- a\n- b\n\n" +
      "<img src=x onerror=alert(1)><style>body{display:none}</style><form action=https://evil><input name=pw></form>\n\n" +
      "![pix](https://evil.example/t.png) [js](javascript:alert(1))",
  );
  const md = page.locator(".md").last();
  await expect(md).toContainText("굵게");
  const r = await md.evaluate((el) => ({
    strong: !!el.querySelector("strong"),
    target: el.querySelector('a[href="https://example.com/"], a[href="https://example.com"]')?.getAttribute("target"),
    rel: el.querySelector("a")?.getAttribute("rel"),
    li: el.querySelectorAll("li").length,
    dangerous: el.querySelectorAll("style, form, img, input:not([type=checkbox]), script").length,
    onerror: [...el.querySelectorAll("*")].some((n) => n.hasAttribute("onerror")),
    escapedShown: el.textContent?.includes("<style>body{display:none}</style>"),
    imageLink: [...el.querySelectorAll("a")].find((a) => a.textContent === "🖼 pix")?.getAttribute("href"),
    jsHref: [...el.querySelectorAll("a")].some((a) => (a.getAttribute("href") ?? "").startsWith("javascript")),
  }));
  expect(r).toEqual({
    strong: true,
    target: "_blank",
    rel: "noopener noreferrer",
    li: 2,
    dangerous: 0,
    onerror: false,
    escapedShown: true,
    imageLink: "https://evil.example/t.png",
    jsHref: false,
  });
  // The injected <style> did not hide the page
  await expect(page.locator(".conversation")).toBeVisible();
});

test("permission card: 허용 relays allow to Claude and the card goes away", async ({ page, server }) => {
  server.requestPermission("p1", '{"command":"ls"}');
  const card = page.getByRole("alert");
  await expect(card).toContainText("권한 요청 · Bash");
  await expect(card).toContainText('{"command":"ls"}');
  await expect(page).toHaveTitle(/승인 대기 1/);
  await card.getByRole("button", { name: "허용" }).click();
  await expect
    .poll(() => server.out.find((m) => m.method === "notifications/claude/channel/permission")?.params)
    .toEqual({ request_id: "p1", behavior: "allow" });
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page).not.toHaveTitle(/승인 대기/);
});

test("permission card is replayed after a reload and 거부 denies", async ({ page, server }) => {
  server.requestPermission("p2", "rm -rf build");
  await expect(page.getByRole("alert")).toContainText("rm -rf build");
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("rm -rf build");
  await page.getByRole("button", { name: "거부" }).click();
  await expect
    .poll(() => server.out.find((m) => m.method === "notifications/claude/channel/permission")?.params)
    .toEqual({ request_id: "p2", behavior: "deny" });
});

test("a reply that arrives on the list pane shows as unread until the chat is opened", async ({ page, server }) => {
  await page.getByRole("button", { name: "채널 목록" }).click();
  expect(await sidebarVisible(page)).toBe(true);
  server.reply("while on list");
  const item = page.locator(".sidebar button", { hasText: "PARA Life" });
  await expect(item).toContainText("while on list");
  await expect(item.locator("span", { hasText: /^1$/ })).toBeVisible();
  await expect(page).toHaveTitle("(1) Chat");
  await item.click();
  expect(await sidebarVisible(page)).toBe(false);
  await expect(page.locator(".conversation")).toContainText("while on list");
  await page.getByRole("button", { name: "채널 목록" }).click();
  await expect(item.locator("span", { hasText: /^1$/ })).toHaveCount(0);
});

test("messages typed offline are queued and flushed after the server comes back", async ({ page, server }) => {
  server.reply("**굵게** before restart");
  await expect(page.locator(".md").last()).toContainText("굵게");
  await server.stop();
  await expect.poll(() => connectionStatus(page)).toMatch(/^연결 끊김/);

  await page.locator("textarea").fill("offline msg");
  await page.click(sendButton);
  await expect(page.locator(".conversation")).toContainText("연결되면 전송됩니다");

  await server.start();
  await page.getByRole("button", { name: "지금 연결" }).click();
  await server.waitDelivered((p) => p.content === "offline msg", 10000);
  await expect(page.locator(".conversation")).not.toContainText("연결되면 전송됩니다");
  await expect(page.locator(".conversation")).not.toContainText("전송 실패");
  // History from before the restart is still on screen, and not duplicated by the replay
  await expect(page.locator(".md", { hasText: "before restart" })).toHaveCount(1);
  await expect(page.locator(".conversation").getByText("offline msg", { exact: true })).toHaveCount(1);
  expect(server.delivered().map((p) => p.content)).toEqual(["offline msg"]);
});

test("a wide viewport shows the list and the conversation side by side", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect.poll(() => sidebarVisible(page)).toBe(true);
  await expect(page.locator(".conversation")).toBeVisible();
});

test("activity: delivered mark, what Claude is doing with elapsed time, approval wait, then idle", async ({ page, server }) => {
  const convo = page.locator(".conversation");
  const row = page.locator("[data-activity]");
  // Hooks report once → the server starts announcing activity
  await server.hook("Stop");
  await page.locator("textarea").fill("상태 보여줘");
  await page.click(sendButton);
  await server.waitDelivered((p) => p.content === "상태 보여줘");
  await expect(convo).toContainText("전달됨");
  await expect(row).toHaveAttribute("data-activity", "working");
  await expect(row).toContainText("메시지 확인 중");
  await expect(convo).toContainText("연결됨 · 작업 중");

  await server.hook("PreToolUse", "파일 읽는 중 · paper-research.md");
  await expect(row).toContainText("파일 읽는 중 · paper-research.md");
  await expect(row).toContainText(/0:0[1-9]/, { timeout: 4000 });

  // A reply mid-turn: the turn is still going, so the row stays; "전달됨" is gone
  server.reply("중간 보고");
  await expect(convo).toContainText("중간 보고");
  await expect(convo).not.toContainText("전달됨");
  await expect(row).toHaveAttribute("data-activity", "working");

  server.requestPermission("perm-a", "ls");
  await expect(row).toHaveAttribute("data-activity", "waiting");
  await expect(row).toContainText("승인 대기 · Bash");
  await page.getByRole("button", { name: "허용" }).click();
  await expect(row).toHaveAttribute("data-activity", "working");

  await server.hook("Stop");
  await expect(row).toHaveCount(0);
  await expect(convo).not.toContainText("작업 중");

  // A reload mid-turn shows the current state again
  await server.hook("PreToolUse", "명령 실행 · Run tests");
  await page.reload();
  await expect(row).toContainText("명령 실행 · Run tests");
});
