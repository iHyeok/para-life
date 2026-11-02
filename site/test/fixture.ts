/**
 * A tiny PARA data tree in a temp dir, laid out like the repo (data dirs next to site/),
 * so lib/data.ts can be pointed at it by running with cwd = <tmp>/site.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type Item = Record<string, unknown> & { id: string };

const write = (file: string, content: string) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};

export const PUBLIC_PROJECT_BODY = `# Public project

## Goal
Ship it.

## Tasks
- [x] Done thing
- [ ] **Next** step with [a link](https://example.com)
  - [ ] nested child is not top-level
- [ ] \`code\` task
* [ ] star bullet task
- [ ]
- [X] Also done

## Progress Log

### 2026-11-02
- Latest entry with *emphasis*
  - nested detail ignored
- Second bullet

### 2026-10-30

### 2026-10-01
* Older entry
Some trailing prose

## Notes
- [ ] not a task: outside the Tasks section
`;

export function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "para-site-"));
  fs.mkdirSync(path.join(root, "site"));

  const category = (name: string, items: Item[], bodies: Record<string, string> = {}) => {
    write(path.join(root, name, "_index.json"), JSON.stringify({ items }, null, 2));
    for (const [id, body] of Object.entries(bodies)) write(path.join(root, name, `${id}.md`), body);
  };

  category(
    "projects",
    [
      { id: "pub-proj", title: "Public Project", status: "active", visibility: "public", area: "pub-area" },
      { id: "lim-proj", title: "Limited Project", status: "active", visibility: "limited", goal: "limited goal" },
      { id: "priv-proj", title: "Private Project", status: "active", visibility: "private", area: "priv-area" },
      { id: "typo-proj", title: "Typo Project", status: "active", visibility: "pubilc" },
      { id: "novis-proj", title: "No Visibility", status: "on-hold" },
      { id: "fm-proj", title: "Index Title", status: "active", visibility: "public", goal: "" },
    ],
    {
      "pub-proj": PUBLIC_PROJECT_BODY,
      "fm-proj": `---\ntitle: Frontmatter Title\ngoal: from frontmatter\ndeadline: 2026-12-31\ntags: [a, b]\n---\n\nBody text\n`,
    },
  );
  category("areas", [
    { id: "pub-area", title: "Public Area", visibility: "public" },
    { id: "priv-area", title: "Private Area", visibility: "private" },
  ]);
  category("resources", [{ id: "pub-res", title: "Public Resource", visibility: "public" }]);
  category("archives", [
    { id: "old-proj", title: "Old Project", visibility: "public", originalType: "project", archivedAt: "2026-01-01" },
    { id: "lim-arch", title: "Limited Archive", visibility: "limited" },
  ]);

  return {
    root,
    siteDir: path.join(root, "site"),
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}
