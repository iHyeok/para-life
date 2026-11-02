import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { createFixture, PUBLIC_PROJECT_BODY } from "./fixture";

type Data = typeof import("../src/lib/data");

let data: Data;
let fixture: ReturnType<typeof createFixture>;
const cwd = process.cwd();

beforeAll(async () => {
  fixture = createFixture();
  // data.ts resolves the data dirs from cwd/.., once at import time
  process.chdir(fixture.siteDir);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  data = await import("../src/lib/data");
});

afterAll(() => {
  process.chdir(cwd);
  fixture.cleanup();
});

const pub = (md: string) => data.renderMarkdown(md, "public");
const me = (md: string) => data.renderMarkdown(md, "me");

describe("markdown rendering", () => {
  test("raw HTML is shown as text, never rendered", () => {
    const html = pub("<script>alert(1)</script>\n\nand <b>x</b> <img src=x onerror=alert(1)>");
    expect(html).not.toMatch(/<script|<b>|<img/);
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
  });

  test("existing entities are not double-escaped", () => {
    expect(pub("Tom &amp; Jerry & co")).toContain("Tom &amp; Jerry &amp; co");
  });

  test("unsafe link and image URLs are dropped, keeping the text", () => {
    const html = pub(
      "[evil](javascript:alert(1)) [data](data:text/html,x) [vb](VBScript:x) ![**bold** alt](javascript:x)",
    );
    expect(html).not.toMatch(/href=|src=|javascript:|data:|vbscript:/i);
    expect(html).toContain("evil");
    expect(html).toContain("data");
    expect(html).toContain("bold alt");
  });

  test("safe links render; external ones open in a new tab with escaped titles", () => {
    const html = pub('[ok](https://a.com/?a=1&b=2 "t\\"q") [mail](mailto:x@y.z) [anchor](#tasks) [rel](/me/)');
    expect(html).toContain('<a href="https://a.com/?a=1&amp;b=2" title="t&quot;q" target="_blank" rel="noopener">ok</a>');
    expect(html).toContain('<a href="mailto:x@y.z">mail</a>');
    expect(html).toContain('<a href="#tasks">anchor</a>');
    expect(html).toContain('<a href="/me/">rel</a>');
  });

  test("images keep a safe src and get lazy loading", () => {
    expect(pub("![pic](https://x.test/y.png)")).toContain(
      '<img src="https://x.test/y.png" alt="pic" loading="lazy" decoding="async">',
    );
  });

  test("task lists render (gfm)", () => {
    const html = pub("- [x] parent done\n  - [ ] child open");
    expect(html.match(/type="checkbox"/g)).toHaveLength(2);
  });
});

describe("item links", () => {
  test("public item: public URL in the public view, /me URL in the me view", () => {
    expect(pub("[p](../projects/pub-proj.md)")).toContain('<a href="/projects/pub-proj/">p</a>');
    expect(me("[p](../projects/pub-proj.md)")).toContain('<a href="/me/projects/pub-proj/">p</a>');
  });

  test("relative forms and hashes are handled", () => {
    expect(pub("[a](./areas/pub-area.md)")).toContain('href="/areas/pub-area/"');
    expect(pub("[a](resources/pub-res.md#notes)")).toContain('href="/resources/pub-res/#notes"');
    expect(pub("[a](../../projects/pub-proj.md#tasks)")).toContain('href="/projects/pub-proj/#tasks"');
  });

  test("limited item in the public view links to its (protected) /me page", () => {
    expect(pub("[l](../projects/lim-proj.md)")).toContain('href="/me/projects/lim-proj/"');
  });

  test("a project that was archived resolves to the archive page", () => {
    expect(pub("[arch](../projects/old-proj.md)")).toContain('<a href="/archives/old-proj/">arch</a>');
    expect(me("[arch](../projects/old-proj.md)")).toContain('href="/me/archives/old-proj/"');
  });

  test("dangling links become plain text", () => {
    const html = pub("[gone](../projects/nope.md)");
    expect(html).not.toContain("<a");
    expect(html).toContain("gone");
  });

  test("private target: text in the public view, link in the me view", () => {
    for (const link of ["[secret](../projects/priv-proj.md)", "[secret](../areas/priv-area.md)"]) {
      const html = pub(link);
      expect(html).not.toContain("<a");
      expect(html).not.toContain("priv-");
      expect(html).toContain("secret");
    }
    expect(me("[secret](../projects/priv-proj.md)")).toContain('href="/me/projects/priv-proj/"');
  });

  test("an item with an unknown visibility is treated as private in links", () => {
    expect(pub("[t](../projects/typo-proj.md)")).not.toContain("<a");
  });

  test("non-item .md links are left alone", () => {
    expect(pub("[spec](../PARA-SPEC.md)")).toContain('href="../PARA-SPEC.md"');
  });
});

describe("visibility", () => {
  test("allow-list: missing means public, unknown values fail closed as private", () => {
    const vis = Object.fromEntries(data.getProjects().map((p) => [p.id, p.visibility]));
    expect(vis).toEqual({
      "pub-proj": "public",
      "lim-proj": "limited",
      "priv-proj": "private",
      "typo-proj": "private",
      "novis-proj": "public",
      "fm-proj": "public",
    });
  });

  test("public view hides private items and locks limited ones; me shows everything unlocked", () => {
    const cases = [
      ["public", "public", true, false],
      ["limited", "public", true, true],
      ["private", "public", false, true],
      ["public", "me", true, false],
      ["limited", "me", true, false],
      ["private", "me", true, false],
    ] as const;
    for (const [visibility, view, listed, locked] of cases) {
      expect(data.isListed({ visibility }, view), `${visibility}/${view} listed`).toBe(listed);
      expect(data.isLocked({ visibility }, view), `${visibility}/${view} locked`).toBe(locked);
    }
  });

  test("public detail pages exist only for public items", () => {
    const ids = (view: "public" | "me") => data.detailPaths("projects", view).map((p) => p.params.id);
    expect(ids("public")).toEqual(["pub-proj", "novis-proj", "fm-proj"]);
    expect(ids("me")).toHaveLength(6);
    expect(data.detailPaths("archives", "public").map((p) => p.params.id)).toEqual(["old-proj"]);
  });

  test("detailHref sends non-public items to /me", () => {
    expect(data.detailHref("projects", { id: "x", visibility: "public" }, "public")).toBe("/projects/x/");
    expect(data.detailHref("projects", { id: "x", visibility: "limited" }, "public")).toBe("/me/projects/x/");
    expect(data.detailHref("projects", { id: "x", visibility: "public" }, "me")).toBe("/me/projects/x/");
  });

  test("listedArea hides a private area in the public view", () => {
    expect(data.listedArea("pub-area", "public")?.title).toBe("Public Area");
    expect(data.listedArea("priv-area", "public")).toBeUndefined();
    expect(data.listedArea("priv-area", "me")?.title).toBe("Private Area");
    expect(data.listedArea(undefined, "me")).toBeUndefined();
  });
});

describe("loading", () => {
  test("frontmatter fills gaps, the index wins, dates become strings, empty strings are unset", () => {
    const p = data.getItem("projects", "fm-proj");
    expect(p.title).toBe("Index Title");
    expect(p.goal).toBe("from frontmatter");
    expect(p.deadline).toBe("2026-12-31");
    expect(p.tags).toEqual(["a", "b"]);
    expect(p.body).toBe("Body text");
  });

  test("missing .md means an empty body; unknown ids throw", () => {
    expect(data.getItem("projects", "lim-proj").body).toBe("");
    expect(() => data.getItem("projects", "nope")).toThrow("projects/nope not found");
  });
});

describe("task and log parsing", () => {
  test("openTasks: open top-level tasks under ## Tasks, as plain text", () => {
    expect(data.openTasks(PUBLIC_PROJECT_BODY)).toEqual(["Next step with a link", "code task", "star bullet task"]);
    expect(data.openTasks("no sections here\n- [ ] loose")).toEqual([]);
  });

  test("progressLog: dated entries with their top-level bullets, empty ones dropped", () => {
    expect(data.progressLog(PUBLIC_PROJECT_BODY)).toEqual([
      { date: "2026-11-02", items: ["Latest entry with emphasis", "Second bullet"] },
      { date: "2026-10-01", items: ["Older entry"] },
    ]);
  });

  test("section headings match case-insensitively", () => {
    expect(data.openTasks("## tasks\n- [ ] lower")).toEqual(["lower"]);
  });

  test("taskProgress counts nested tasks across the whole body", () => {
    expect(data.taskProgress(PUBLIC_PROJECT_BODY)).toEqual({ total: 8, done: 2, percent: 25 });
    expect(data.taskProgress("nothing")).toEqual({ total: 0, done: 0, percent: 0 });
  });

  test("plainText strips links, images and emphasis", () => {
    expect(data.plainText(" **a** [b](c) ![d](e) `f` ~g~ ")).toBe("a b d f g");
  });
});
