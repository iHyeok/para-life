// SQLite-backed history in the UI: replay, paging older messages, scroll anchoring, restarts
// (port of the review session's persist.ts)
import type { Page } from "@playwright/test";
import { expect, openChat, test } from "./fixtures";

test.use({ viewport: { width: 1100, height: 800 } });

const seeded = (page: Page) =>
  page.evaluate(() => document.querySelector(".conversation")?.textContent?.match(/seed message \d+/g)?.length ?? 0);

/** The conversation's scrolling element. */
const SCROLLER = () =>
  [...document.querySelectorAll<HTMLElement>(".conversation div")].find(
    (d) => getComputedStyle(d).overflowY === "auto",
  ) as HTMLElement;

test.afterEach(async ({ pageErrors }) => {
  expect(pageErrors).toEqual([]);
});

test("replay shows the newest 200; scrolling up pages in older ones without losing the reader's place", async ({
  page,
  ui,
  server,
}) => {
  server.seed(300);
  await server.start();
  await openChat(page, ui, server);
  const more = page.getByRole("button", { name: "이전 대화 더 보기" });

  await expect.poll(() => seeded(page)).toBe(200);
  await expect(more).toBeVisible();
  await expect(page.locator(".conversation").getByText("seed message 299", { exact: true })).toBeVisible();

  // Scrolling to the top loads the previous page; the message that was first stays in view
  const anchor = "seed message 100";
  await page.evaluate(`(${SCROLLER.toString()})().scrollTop = 0`);
  await expect.poll(() => seeded(page)).toBe(250);
  const inView = await page.evaluate(
    ({ text, scroller }) => {
      const sc = new Function(`return (${scroller})()`)() as HTMLElement;
      const el = [...sc.querySelectorAll("div")].reverse().find((d) => d.textContent === text) as HTMLElement;
      const r = el.getBoundingClientRect();
      const c = sc.getBoundingClientRect();
      return r.top >= c.top - 5 && r.bottom <= c.bottom + 5;
    },
    { text: anchor, scroller: SCROLLER.toString() },
  );
  expect(inView).toBe(true);

  // The button pages in the rest, then disappears at the start of history
  while (await more.isVisible()) {
    const before = await seeded(page);
    await more.click();
    await expect.poll(() => seeded(page)).toBeGreaterThan(before);
  }
  expect(await seeded(page)).toBe(300);
  await expect(page.locator(".conversation").getByText("seed message 0", { exact: true })).toBeAttached();
  await expect(more).toHaveCount(0);
});

test("sent and received messages survive a server restart and a page reload", async ({ page, ui, server }) => {
  await server.start();
  await openChat(page, ui, server);
  await page.locator("textarea").fill("persist me");
  await page.keyboard.press("Enter");
  await server.waitDelivered((p) => p.content === "persist me");
  server.reply("**stored** reply");
  await expect(page.locator(".md").last()).toContainText("stored reply");

  await server.restart();
  await page.reload();
  await expect(page.locator(".conversation")).toContainText("연결됨");
  await expect(page.locator(".conversation").getByText("persist me", { exact: true })).toHaveCount(1);
  await expect(page.locator(".md", { hasText: "stored reply" })).toHaveCount(1);
  // Short history: nothing older to load
  await expect(page.getByRole("button", { name: "이전 대화 더 보기" })).toHaveCount(0);
  // Replayed history is old news, not unread
  await expect(page).toHaveTitle("Chat — 다중채팅시스템");
});
