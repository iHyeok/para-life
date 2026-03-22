import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ROOT = path.resolve(process.cwd(), "..");

function readIndex(category: string) {
  const filePath = path.join(ROOT, category, "_index.json");
  if (!fs.existsSync(filePath)) return { description: "", items: [] };
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function readMarkdown(category: string, id: string) {
  const filePath = path.join(ROOT, category, `${id}.md`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  return { ...data, content: content.trim() };
}

export function getProjects() {
  const index = readIndex("projects");
  return index.items.map((item: any) => ({
    ...item,
    detail: readMarkdown("projects", item.id),
  }));
}

export function getAreas() {
  const index = readIndex("areas");
  return index.items.map((item: any) => ({
    ...item,
    detail: readMarkdown("areas", item.id),
  }));
}

export function getResources() {
  const index = readIndex("resources");
  return index.items.map((item: any) => ({
    ...item,
    detail: readMarkdown("resources", item.id),
  }));
}

export function getArchives() {
  const index = readIndex("archives");
  return index.items;
}

export function getProject(id: string) {
  return readMarkdown("projects", id);
}

export function getArea(id: string) {
  return readMarkdown("areas", id);
}

export function getResource(id: string) {
  return readMarkdown("resources", id);
}
