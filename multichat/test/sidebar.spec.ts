// Desktop channel list: collapse to an avatar rail, drag to resize, remembered across reloads
import { expect, test } from "./fixtures";

const saved = [
  { id: "para-life", name: "PARA Life", wsUrl: "ws://127.0.0.1:9/ws", httpUrl: "http://127.0.0.1:9", color: "#60a5fa" },
  { id: "paper", name: "Paper", wsUrl: "ws://127.0.0.1:9/p/ws", httpUrl: "http://127.0.0.1:9/p", color: "#c084fc" },
];

test.beforeEach(async ({ page, ui }) => {
  await page.routeWebSocket(/kyxi\.net/, (ws) => ws.close());
  await page.addInitScript((saved) => {
    if (sessionStorage.getItem("booted")) return;
    sessionStorage.setItem("booted", "1");
    localStorage.setItem("multichat-channels", JSON.stringify(saved));
    localStorage.setItem("multichat-seen-defaults", JSON.stringify(["para-life", "paper", "museum"]));
  }, saved);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${ui.origin}/`);
});

const sidebarWidth = (page: import("@playwright/test").Page) =>
  page.locator("aside.sidebar").evaluate((el) => Math.round(el.getBoundingClientRect().width));

test("the list collapses to a rail and expands again, and stays that way after reload", async ({ page }) => {
  const aside = page.locator("aside.sidebar");
  await expect(aside).toHaveAttribute("data-collapsed", "false");
  await page.getByRole("button", { name: "채널 목록 접기" }).click();
  await expect(aside).toHaveAttribute("data-collapsed", "true");
  await expect.poll(() => sidebarWidth(page)).toBe(68);
  // Rail still switches channels
  await page.locator("aside.sidebar").getByRole("button", { name: "Paper", exact: true }).click();
  await expect(page.locator(".conversation").getByText("Paper", { exact: true }).first()).toBeVisible();

  await page.reload();
  await expect(aside).toHaveAttribute("data-collapsed", "true");
  await page.getByRole("button", { name: "채널 목록 펼치기" }).click();
  await expect(aside).toHaveAttribute("data-collapsed", "false");
  await expect.poll(() => sidebarWidth(page)).toBe(340);
});

test("Ctrl+\\ toggles the list", async ({ page }) => {
  const aside = page.locator("aside.sidebar");
  await page.keyboard.press("Control+Backslash");
  await expect(aside).toHaveAttribute("data-collapsed", "true");
  await page.keyboard.press("Control+Backslash");
  await expect(aside).toHaveAttribute("data-collapsed", "false");
});

test("dragging the edge resizes within limits; double-click resets", async ({ page }) => {
  const handle = page.getByRole("separator", { name: "채널 목록 너비 조절" });
  const box = (await handle.boundingBox())!;
  const y = box.y + 200;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(460, y, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => sidebarWidth(page)).toBe(460);
  await page.reload();
  await expect.poll(() => sidebarWidth(page)).toBe(460);

  // Way past the minimum → collapses to the rail
  const b2 = (await handle.boundingBox())!;
  await page.mouse.move(b2.x + b2.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(60, y, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator("aside.sidebar")).toHaveAttribute("data-collapsed", "true");

  await handle.dblclick();
  await expect(page.locator("aside.sidebar")).toHaveAttribute("data-collapsed", "false");
  await expect.poll(() => sidebarWidth(page)).toBe(340);
});

test("phones ignore the collapsed setting and keep the full-width list", async ({ page }) => {
  await page.getByRole("button", { name: "채널 목록 접기" }).click();
  await page.setViewportSize({ width: 390, height: 800 });
  await expect(page.locator("aside.sidebar")).toHaveAttribute("data-collapsed", "false");
  await expect(page.getByRole("separator", { name: "채널 목록 너비 조절" })).toBeHidden();
});
