import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { Marked, type Tokens } from "marked";

const ROOT = path.resolve(process.cwd(), "..");

export type View = "public" | "me";
export type Visibility = "public" | "limited" | "private";
export type Category = "projects" | "areas" | "resources" | "archives";

interface BaseItem {
  id: string;
  title: string;
  visibility: Visibility;
  tags?: string[];
  area?: string;
  createdAt?: string;
  updatedAt?: string;
  /** Markdown body of the item's .md file ("" if the file is missing) */
  body: string;
}

export interface Project extends BaseItem {
  status: string;
  priority?: "high" | "medium" | "low";
  goal?: string;
  deadline?: string;
  relatedResources?: string[];
}

export interface Area extends BaseItem {
  description?: string;
}

export interface Resource extends BaseItem {
  topic?: string;
  source?: string;
  relatedProjects?: string[];
}

export interface Archive extends BaseItem {
  originalType?: string;
  archivedAt?: string;
  goal?: string;
  status?: string;
}

type ItemOf<C extends Category> = {
  projects: Project;
  areas: Area;
  resources: Resource;
  archives: Archive;
}[C];

// YAML turns unquoted dates into Date objects; keep everything as YYYY-MM-DD strings.
// Empty strings are dropped so they read as "not set".
function normalize(data: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === "" || v === null) continue;
    out[k] = v instanceof Date ? v.toISOString().slice(0, 10) : v;
  }
  return out;
}

const VISIBILITIES: Visibility[] = ["public", "limited", "private"];

// Missing = schema default "public"; anything unexpected (typo) fails closed as private
function checkVisibility(item: Record<string, unknown>, where: string): Visibility {
  const v = item.visibility ?? "public";
  if (VISIBILITIES.includes(v as Visibility)) return v as Visibility;
  console.warn(`[para-life] ${where}: unknown visibility ${JSON.stringify(v)}, treating as private`);
  return "private";
}

const cache = new Map<Category, BaseItem[]>();

/** _index.json items merged with their .md frontmatter (index wins) and body. Read once per build. */
function load<C extends Category>(category: C): ItemOf<C>[] {
  // `astro dev` keeps modules alive, so only cache in production builds
  if (import.meta.env.DEV || !cache.has(category)) {
    const indexPath = path.join(ROOT, category, "_index.json");
    const index = fs.existsSync(indexPath)
      ? JSON.parse(fs.readFileSync(indexPath, "utf-8"))
      : { items: [] };
    const items = (index.items as Record<string, unknown>[]).map((raw) => {
      const item = normalize(raw);
      const mdPath = path.join(ROOT, category, `${item.id}.md`);
      const md = fs.existsSync(mdPath) ? matter(fs.readFileSync(mdPath, "utf-8")) : null;
      const merged = { ...normalize(md?.data ?? {}), ...item };
      return {
        ...merged,
        visibility: checkVisibility(merged, `${category}/${item.id}`),
        body: md?.content.trim() ?? "",
      };
    });
    cache.set(category, items as BaseItem[]);
  }
  return cache.get(category) as ItemOf<C>[];
}

export const getProjects = () => load("projects");
export const getAreas = () => load("areas");
export const getResources = () => load("resources");
export const getArchives = () => load("archives");

export function getItem<C extends Category>(category: C, id: string): ItemOf<C> {
  const item = load(category).find((i) => i.id === id);
  if (!item) throw new Error(`${category}/${id} not found`);
  return item;
}

/** Listed in this view? Public view hides private items; limited ones show as locked cards. */
export function isListed(item: { visibility: Visibility }, view: View) {
  return view === "me" || item.visibility === "public" || item.visibility === "limited";
}

/** Locked card (title only) in this view? */
export function isLocked(item: { visibility: Visibility }, view: View) {
  return view === "public" && item.visibility !== "public";
}

/** The item's area, if it may be shown in this view. */
export function listedArea(areaId: string | undefined, view: View) {
  const area = load("areas").find((a) => a.id === areaId);
  return area && isListed(area, view) ? area : undefined;
}

/** Public detail pages exist only for public items; /me/ has a page for every item. */
export function detailHref(category: Category, item: { id: string; visibility: Visibility }, view: View) {
  const base = view === "me" || item.visibility !== "public" ? "/me" : "";
  return `${base}/${category}/${item.id}/`;
}

export function detailPaths(category: Category, view: View) {
  return load(category)
    .filter((i) => view === "me" || i.visibility === "public")
    .map((i) => ({ params: { id: i.id } }));
}

export function homeHref(view: View) {
  return view === "me" ? "/me/" : "/";
}

// --- Markdown ---

// Leaves existing entities (&amp; &#39; ...) alone so marked's pre-escaped text isn't doubled
function escapeHtml(s: string) {
  return s.replace(/&(?!#?\w+;)|[<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

const SAFE_URL = /^(https?:|mailto:|\/|\.|#)/i;

const CATEGORIES: Category[] = ["projects", "areas", "resources", "archives"];

/** Resolve "../projects/foo.md"-style links between PARA items to site URLs (archived items included). */
function resolveItemLink(href: string, view: View): string | null | undefined {
  const m = href.match(/^(?:\.\.?\/)*(projects|areas|resources|archives)\/([\w-]+)\.md(#.*)?$/);
  if (!m) return undefined; // not an item link: leave untouched
  const [, category, id, hash = ""] = m;
  for (const c of [category as Category, "archives" as const]) {
    const item = load(c).find((i) => i.id === id);
    if (item) return isListed(item, view) ? detailHref(c, item, view) + hash : null;
  }
  return null; // dangling link: render as plain text
}

function markedFor(view: View) {
  return new Marked({
    gfm: true,
    walkTokens(token) {
      if (token.type !== "link") return;
      const link = token as Tokens.Link;
      const resolved = resolveItemLink(link.href, view);
      if (resolved === null) (token as { type: string }).type = "text";
      else if (resolved !== undefined) link.href = resolved;
    },
    renderer: {
      // Raw HTML in notes is shown as text, like the old renderer did
      html({ text }) {
        return escapeHtml(text);
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        if (!SAFE_URL.test(href)) return text;
        const external = /^https?:\/\//.test(href);
        return `<a href="${escapeHtml(href)}"${title ? ` title="${escapeHtml(title)}"` : ""}${
          external ? ' target="_blank" rel="noopener"' : ""
        }>${text}</a>`;
      },
      image({ href, title, text, tokens }) {
        const alt = tokens ? this.parser.parseInline(tokens, this.parser.textRenderer) : text;
        if (!SAFE_URL.test(href)) return escapeHtml(alt);
        return `<img src="${escapeHtml(href)}" alt="${escapeHtml(alt)}"${
          title ? ` title="${escapeHtml(title)}"` : ""
        } loading="lazy" decoding="async">`;
      },
    },
  });
}

const markedByView = { public: markedFor("public"), me: markedFor("me") };

export function renderMarkdown(body: string, view: View): string {
  return markedByView[view].parse(body, { async: false }) as string;
}

/** Task counts across the body, nested items included. */
export function taskProgress(body: string) {
  const total = body.match(/^\s*[-*] \[[ xX]\]/gm)?.length ?? 0;
  const done = body.match(/^\s*[-*] \[[xX]\]/gm)?.length ?? 0;
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
}
