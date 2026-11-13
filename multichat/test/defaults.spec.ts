// Built-in channels added after a browser saved its list (e.g. the Paper project session)
import { expect, test } from "./fixtures";

const saved = [{ id: "para-life", name: "PARA Life", wsUrl: "ws://127.0.0.1:9/ws", httpUrl: "http://127.0.0.1:9", color: "#60a5fa" }];

test.beforeEach(async ({ page }) => {
  // Never reach the real tunnel from tests
  await page.routeWebSocket(/kyxi\.net/, (ws) => ws.close());
});

async function boot(page: import("@playwright/test").Page, origin: string, seen?: string[]) {
  await page.addInitScript(
    ({ saved, seen }) => {
      if (sessionStorage.getItem("booted")) return;
      sessionStorage.setItem("booted", "1");
      localStorage.setItem("multichat-channels", JSON.stringify(saved));
      if (seen) localStorage.setItem("multichat-seen-defaults", JSON.stringify(seen));
    },
    { saved, seen },
  );
  await page.goto(`${origin}/`);
}

const storedIds = (page: import("@playwright/test").Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("multichat-channels") || "[]").map((c: { id: string }) => c.id));

test("a saved list from before the Paper channel gains it once", async ({ page, ui }) => {
  await boot(page, ui.origin);
  await expect(page.getByText("Paper", { exact: true }).first()).toBeVisible();
  expect(await storedIds(page)).toEqual(["para-life", "paper", "museum"]);
  const paper = await page.evaluate(() => JSON.parse(localStorage.getItem("multichat-channels") || "[]")[1]);
  expect(paper).toMatchObject({ wsUrl: "wss://api.kyxi.net/p/paper/ws", httpUrl: "https://api.kyxi.net/p/paper" });
  // Reload: not added twice
  await page.reload();
  await expect(page.getByText("PARA Life", { exact: true }).first()).toBeVisible();
  expect(await storedIds(page)).toEqual(["para-life", "paper", "museum"]);
});

test("a default the user already deleted does not come back", async ({ page, ui }) => {
  await boot(page, ui.origin, ["para-life", "paper", "museum"]);
  await expect(page.getByText("PARA Life", { exact: true }).first()).toBeVisible();
  expect(await storedIds(page)).toEqual(["para-life"]);
  await expect(page.getByText("Paper", { exact: true })).toHaveCount(0);
});

test("a browser that already has Paper gains the Museum channel once", async ({ page, ui }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("booted")) return;
    sessionStorage.setItem("booted", "1");
    localStorage.setItem(
      "multichat-channels",
      JSON.stringify([
        { id: "para-life", name: "PARA Life", wsUrl: "ws://127.0.0.1:9/ws", httpUrl: "http://127.0.0.1:9", color: "#60a5fa" },
        { id: "paper", name: "Paper", wsUrl: "ws://127.0.0.1:9/p/ws", httpUrl: "http://127.0.0.1:9/p", color: "#c084fc" },
      ]),
    );
    localStorage.setItem("multichat-seen-defaults", JSON.stringify(["para-life", "paper"]));
  });
  await page.goto(`${ui.origin}/`);
  await expect(page.getByText("Museum", { exact: true }).first()).toBeVisible();
  expect(await storedIds(page)).toEqual(["para-life", "paper", "museum"]);
  const museum = await page.evaluate(() => JSON.parse(localStorage.getItem("multichat-channels") || "[]")[2]);
  expect(museum).toMatchObject({ wsUrl: "wss://api.kyxi.net/p/museum/ws", httpUrl: "https://api.kyxi.net/p/museum" });
});
