import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { checkDist, pageText, plainLine } from "../scripts/check-dist.mjs";
import { createFixture } from "./fixture";

let fixture: ReturnType<typeof createFixture>;
let dist: string;

const page = (rel: string, body: string) => {
  const file = path.join(dist, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `<!doctype html><html><body>${body}</body></html>`);
};

beforeEach(() => {
  fixture = createFixture();
  dist = path.join(fixture.siteDir, "dist");
  // Secret material for the non-public fixture items
  fs.writeFileSync(
    path.join(fixture.root, "projects", "lim-proj.md"),
    "# Limited Project\n\n## Related Projects\n- the limited plan is secret\n- [Public Resource](../resources/pub-res.md)\n",
  );
  fs.writeFileSync(path.join(fixture.root, "areas", "pub-area.md"), "## Related Projects\n- shared line\n");
  // A clean build: public pages, a locked card for the limited project, and /me pages
  page("index.html", '<a href="/projects/pub-proj/">Public Project</a> <a href="/me/projects/lim-proj/"><h3>Limited Project</h3></a> <a href="/resources/pub-res/">Public Resource</a>');
  page("projects/pub-proj/index.html", '<a href="/">home</a> <img src="/_astro/x.png">');
  page("resources/pub-res/index.html", "<p>Related Projects</p>");
  page("areas/pub-area/index.html", "<h2>Related Projects</h2>");
  page("me/index.html", "Private Project · Limited Project · the limited plan is secret");
  page("me/projects/lim-proj/index.html", "the limited plan is secret");
  fs.mkdirSync(path.join(dist, "_astro"), { recursive: true });
  fs.writeFileSync(path.join(dist, "_astro", "x.png"), "");
});

afterEach(() => fixture.cleanup());

const check = () => checkDist({ dist, root: fixture.root }).problems as string[];

describe("check-dist", () => {
  test("a clean build passes; limited titles on locked cards and shared boilerplate are allowed", () => {
    expect(check()).toEqual([]);
  });

  test("limited body text on a public page is a leak", () => {
    page("projects/pub-proj/index.html", '<a href="/">home</a> <p>the <strong>limited</strong> plan is secret</p>');
    expect(check()).toEqual([
      'limited projects/lim-proj leaks "the limited plan is secret" in projects/pub-proj/index.html',
    ]);
  });

  test("limited fields (goal) count as secrets", () => {
    page("projects/pub-proj/index.html", '<a href="/">home</a> <p>limited goal</p>');
    // "limited goal" is shorter than the minimum length, so it is not flagged on its own
    expect(check()).toEqual([]);
    fs.writeFileSync(
      path.join(fixture.root, "projects", "_index.json"),
      JSON.stringify({ items: [{ id: "lim-proj", title: "Limited Project", visibility: "limited", goal: "a long limited goal text" }] }),
    );
    page("projects/pub-proj/index.html", '<a href="/">home</a> <p title="a long limited goal text"></p>');
    expect(check()).toEqual(['limited projects/lim-proj leaks "a long limited goal text" in projects/pub-proj/index.html']);
  });

  test("a private title or link on a public page is a leak", () => {
    page("index.html", '<a href="/">Private Project</a> <a href="/me/projects/priv-proj/">x</a>');
    expect(check()).toEqual([
      'private projects/priv-proj: title "Private Project" appears in index.html',
      "private projects/priv-proj: link to /priv-proj/ appears in index.html",
      "broken internal link: /index.html -> /me/projects/priv-proj/",
    ]);
  });

  test("an unknown visibility is checked as private", () => {
    page("index.html", "<p>Typo Project</p>");
    expect(check()).toEqual(['private projects/typo-proj: title "Typo Project" appears in index.html']);
  });

  test("a public detail page for a non-public item is flagged", () => {
    page("projects/lim-proj/index.html", '<a href="/">x</a>');
    expect(check()).toContain("limited projects/lim-proj has a public detail page");
  });

  test("broken internal links and assets are reported, external ones ignored", () => {
    page(
      "me/index.html",
      '<a href="/projects/nope/">x</a> <a href="/me/#focus">ok</a> <img src="/_astro/missing.png"> <a href="https://x.test/y">ext</a> <a href="//cdn.test/z">proto</a>',
    );
    expect(check()).toEqual([
      "broken internal link: /me/index.html -> /_astro/missing.png",
      "broken internal link: /me/index.html -> /projects/nope/",
    ]);
  });

  test("helpers: visible text and markdown line flattening", () => {
    expect(pageText("<style>.a{}</style><p>a &amp; <b>b</b>&#39;s</p><script>x</script>")).toBe("a & b's");
    expect(plainLine("- [x] **done** with [link](x.md)")).toBe("done with link");
    expect(plainLine("## Heading")).toBe("Heading");
  });
});
