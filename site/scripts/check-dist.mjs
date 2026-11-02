#!/usr/bin/env node
/**
 * Post-build check for site/dist (run after `astro build`):
 *  1. Privacy: nothing from limited/private items leaks into pages outside /me/.
 *     Limited items may show their title on public locked cards; private items may not appear at all.
 *  2. Links: every internal href/src points at a page or file that exists in dist.
 *
 * Usage: node scripts/check-dist.mjs [--dist site/dist] [--root <repo root>]
 * Exits 1 and lists the problems if anything is found.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const CATEGORIES = ["projects", "areas", "resources", "archives"];
const VISIBILITIES = ["public", "limited", "private"];
// Short strings ("TODO", a date) are too generic to count as a leak
const MIN_SECRET_LENGTH = 13;

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function unescapeHtml(s) {
  return s.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (m, e) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? Number.parseInt(e.slice(2), 16) : Number(e.slice(1));
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

const squash = (s) => s.replace(/\s+/g, " ").trim();

/** Visible text of a page (scripts/styles dropped, tags removed, entities decoded). */
export function pageText(html) {
  const noCode = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ");
  return squash(unescapeHtml(noCode.replace(/<[^>]+>/g, "")));
}

/** Markdown line -> the plain text it renders to (roughly), for leak matching. */
export function plainLine(line) {
  return squash(
    line
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[*_`~]/g, "")
      .replace(/^\s*(?:[-*+]|\d+\.)\s+(?:\[[ xX]\]\s+)?/, "")
      .replace(/^\s*#+\s+/, "")
      .replace(/^\s*>\s?/, ""),
  );
}

function visibilityOf(item) {
  const v = item.visibility ?? "public";
  return VISIBILITIES.includes(v) ? v : "private";
}

/** _index.json items merged with their .md frontmatter (index wins), like src/lib/data.ts. */
export function loadItems(root) {
  const items = [];
  for (const category of CATEGORIES) {
    const indexPath = path.join(root, category, "_index.json");
    if (!fs.existsSync(indexPath)) continue;
    for (const raw of JSON.parse(fs.readFileSync(indexPath, "utf-8")).items) {
      const mdPath = path.join(root, category, `${raw.id}.md`);
      const md = fs.existsSync(mdPath) ? matter(fs.readFileSync(mdPath, "utf-8")) : null;
      const merged = { ...(md?.data ?? {}), ...raw };
      items.push({ ...merged, category, visibility: visibilityOf(merged), body: md?.content ?? "" });
    }
  }
  return items;
}

const FIELDS = ["goal", "description", "source", "topic"];

/** Every string an item contributes: text fields and body lines. */
function stringsOf(item) {
  const fields = FIELDS.map((k) => item[k]).filter((v) => typeof v === "string");
  return [...fields.map(squash), ...item.body.split("\n").map(plainLine)];
}

/**
 * Strings that may legitimately appear on public pages: anything a public item says,
 * and the titles of public and limited items (limited ones show as locked cards).
 * Shared boilerplate ("Related Projects", a link to a public resource) is not a leak.
 */
function publicStrings(items) {
  const allowed = new Set();
  for (const item of items) {
    if (item.visibility === "private") continue;
    allowed.add(squash(String(item.title ?? "")));
    if (item.visibility === "public") for (const s of stringsOf(item)) allowed.add(s);
  }
  return allowed;
}

/** Strings from a non-public item that must not appear on public pages. */
function secretsOf(item, allowed) {
  return [...new Set(stringsOf(item))].filter((s) => s.length >= MIN_SECRET_LENGTH && !allowed.has(s));
}

export function checkDist({ dist, root }) {
  const problems = [];
  const files = walk(dist).map((f) => path.relative(dist, f).split(path.sep).join("/"));
  const fileSet = new Set(files);
  const htmlFiles = files.filter((f) => f.endsWith(".html"));
  const publicPages = htmlFiles.filter((f) => !f.startsWith("me/"));
  const pages = new Map(publicPages.map((f) => [f, fs.readFileSync(path.join(dist, f), "utf-8")]));
  const texts = new Map([...pages].map(([f, html]) => [f, pageText(html)]));
  const raws = new Map([...pages].map(([f, html]) => [f, squash(unescapeHtml(html))]));

  const items = loadItems(root);
  const allowed = publicStrings(items);
  for (const item of items) {
    if (item.visibility === "public") continue;
    const label = `${item.visibility} ${item.category}/${item.id}`;
    if (fileSet.has(`${item.category}/${item.id}/index.html`)) {
      problems.push(`${label} has a public detail page`);
    }
    const secrets = secretsOf(item, allowed);
    for (const [page, text] of texts) {
      const raw = raws.get(page);
      if (item.visibility === "private") {
        const title = squash(String(item.title ?? ""));
        if (title && text.includes(title)) problems.push(`${label}: title "${title}" appears in ${page}`);
        if (raw.includes(`/${item.id}/`)) problems.push(`${label}: link to /${item.id}/ appears in ${page}`);
      }
      for (const s of secrets) {
        if (text.includes(s) || raw.includes(s)) problems.push(`${label} leaks "${s.slice(0, 40)}" in ${page}`);
      }
    }
  }

  const exists = (p) => {
    const rel = decodeURI(p).replace(/^\//, "");
    if (rel === "" || rel.endsWith("/")) return fileSet.has(`${rel}index.html`);
    return fileSet.has(rel) || fileSet.has(`${rel}/index.html`);
  };
  const broken = new Set();
  for (const f of htmlFiles) {
    const html = fs.readFileSync(path.join(dist, f), "utf-8");
    for (const [, url] of html.matchAll(/\b(?:href|src)="(\/(?!\/)[^"#?]*)/g)) {
      if (!exists(unescapeHtml(url))) broken.add(`/${f} -> ${url}`);
    }
  }
  for (const b of [...broken].sort()) problems.push(`broken internal link: ${b}`);

  return { problems, pages: htmlFiles.length, publicPages: publicPages.length };
}

function main() {
  const args = process.argv.slice(2);
  const opt = (name, fallback) => {
    const i = args.indexOf(name);
    return i >= 0 ? path.resolve(args[i + 1]) : fallback;
  };
  const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const dist = opt("--dist", path.join(siteDir, "dist"));
  const root = opt("--root", path.resolve(siteDir, ".."));
  if (!fs.existsSync(dist)) {
    console.error(`check-dist: ${dist} not found (run \`npm run build\` first)`);
    process.exit(1);
  }
  const { problems, pages, publicPages } = checkDist({ dist, root });
  if (problems.length) {
    console.error(`check-dist: ${problems.length} problem(s)`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`check-dist: ok (${pages} pages, ${publicPages} public; no leaks, no broken internal links)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
