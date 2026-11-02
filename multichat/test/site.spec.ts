// Built dashboard (site/dist) in light and dark, phone and desktop widths (port of siteshots.ts).
// Needs `npm run build` in site/ first; skipped when there is no build.
import fs from "node:fs";
import path from "node:path";
import { expect, serveStatic, test } from "./fixtures";

const DIST = path.resolve(__dirname, "..", "..", "site", "dist");

function pages(dir: string, base = ""): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.isDirectory()) return e.name === "_astro" ? [] : pages(path.join(dir, e.name), `${base}${e.name}/`);
    return e.name === "index.html" ? [`/${base}`] : [];
  });
}

const urls = pages(DIST);
let site: Awaited<ReturnType<typeof serveStatic>>;

test.describe("site/dist layout", () => {
  test.skip(urls.length === 0, "site/dist not built (run `npm run build` in site/)");

  test.beforeAll(async () => {
    site = await serveStatic(DIST);
  });
  test.afterAll(async () => {
    await site?.close();
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`every page fits a 375px phone screen (${scheme})`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 375, height: 1100 },
        isMobile: true,
        hasTouch: true,
        colorScheme: scheme,
      });
      await context.route(/^https?:\/\/(?!127\.0\.0\.1[:/])/, (route) => route.abort());
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      const overflowing: string[] = [];
      for (const url of urls) {
        const res = await page.goto(site.origin + url);
        expect(res?.status(), url).toBe(200);
        if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) overflowing.push(url);
      }
      expect(overflowing).toEqual([]);
      expect(errors).toEqual([]);
      await context.close();
    });
  }

  test("dashboards render on desktop, with distinct light and dark themes", async ({ browser }) => {
    const backgrounds: string[] = [];
    for (const scheme of ["light", "dark"] as const) {
      const context = await browser.newContext({ viewport: { width: 1200, height: 1100 }, colorScheme: scheme });
      await context.route(/^https?:\/\/(?!127\.0\.0\.1[:/])/, (route) => route.abort());
      const page = await context.newPage();
      for (const url of ["/", "/me/"]) {
        await page.goto(site.origin + url);
        await expect(page.locator("h1").first()).toHaveText("PARA Life");
        expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
      }
      backgrounds.push(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
      await context.close();
    }
    expect(backgrounds[0]).not.toBe(backgrounds[1]);
  });
});
