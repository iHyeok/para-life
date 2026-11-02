import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ChatStore, type StoredMsg } from "../store";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 2);

let dir: string;
let store: ChatStore;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "para-store-"));
  store = new ChatStore(dir);
});

afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

const id = (i: number) => `m${String(i).padStart(4, "0")}`;
const msg = (i: number, ts: number): StoredMsg => ({
  id: id(i),
  from: i % 2 ? "assistant" : "user",
  text: `msg ${i}`,
  ts,
});

/** 500 messages over 200 days; pairs share a timestamp so paging must tie-break by id. */
function seed500() {
  for (let i = 0; i < 500; i++) store.save(msg(i, NOW - 200 * DAY + Math.floor(i / 2) * DAY * 0.8));
}

/** Walk every page from the newest back, like the UI does with history_before. */
function walkAll(pageSize: number) {
  const first = store.recent(pageSize);
  const seen = first.messages.map((m) => m.id);
  let cursor = first.messages[0];
  let more = first.hasMore;
  let pages = 1;
  while (more && pages < 100) {
    const page = store.before({ ts: cursor.ts, id: cursor.id }, pageSize);
    seen.unshift(...page.messages.map((m) => m.id));
    more = page.hasMore;
    if (page.messages.length) cursor = page.messages[0];
    pages++;
  }
  return { seen, pages };
}

describe("ChatStore", () => {
  test("recent returns the newest messages, oldest first, with hasMore", () => {
    seed500();
    const r = store.recent(200);
    expect(r.messages).toHaveLength(200);
    expect(r.messages[0].id).toBe("m0300");
    expect(r.messages[199].id).toBe("m0499");
    expect(r.hasMore).toBe(true);
    for (let i = 1; i < r.messages.length; i++) {
      expect(r.messages[i - 1].ts).toBeLessThanOrEqual(r.messages[i].ts);
    }
    expect(store.recent(1000).hasMore).toBe(false);
  });

  test("archive moves only rows older than 90 days", () => {
    seed500();
    const moved = store.archive(NOW);
    expect(moved).toBeGreaterThan(0);
    expect(moved).toBeLessThan(500);
    // Exactly the rows older than the cutoff were moved
    const expected = Array.from({ length: 500 }, (_, i) => NOW - 200 * DAY + Math.floor(i / 2) * DAY * 0.8).filter(
      (ts) => ts < NOW - 90 * DAY,
    ).length;
    expect(moved).toBe(expected);
  });

  test("paging walks hot and archive as one timeline with no gaps or duplicates", () => {
    seed500();
    store.archive(NOW);
    const { seen } = walkAll(50);
    expect(new Set(seen).size).toBe(500);
    // Strictly chronological, ties broken by id
    expect(seen).toEqual(Array.from({ length: 500 }, (_, i) => id(i)));
  });

  test("a page boundary exactly at the hot/archive split has no gap", () => {
    // 10 archived + 10 hot, page size 10: the second page comes entirely from the archive
    for (let i = 0; i < 10; i++) store.save(msg(i, NOW - 120 * DAY + i));
    for (let i = 10; i < 20; i++) store.save(msg(i, NOW - DAY + i));
    expect(store.archive(NOW)).toBe(10);
    const first = store.recent(10);
    expect(first.messages.map((m) => m.id)).toEqual(Array.from({ length: 10 }, (_, i) => id(i + 10)));
    expect(first.hasMore).toBe(true);
    const second = store.before(first.messages[0], 10);
    expect(second.messages.map((m) => m.id)).toEqual(Array.from({ length: 10 }, (_, i) => id(i)));
    expect(second.hasMore).toBe(false);
  });

  test("archive is idempotent", () => {
    seed500();
    expect(store.archive(NOW)).toBeGreaterThan(0);
    expect(store.archive(NOW)).toBe(0);
    expect(walkAll(100).seen).toHaveLength(500);
  });

  test("get finds hot and archived messages", () => {
    seed500();
    store.archive(NOW);
    expect(store.get("m0000")?.text).toBe("msg 0");
    expect(store.get("m0499")?.text).toBe("msg 499");
    expect(store.get("nope")).toBeUndefined();
  });

  test("edit updates hot and archived messages and marks them edited", () => {
    seed500();
    store.archive(NOW);
    expect(store.edit("m0499", "edited hot")).toMatchObject({ id: "m0499", text: "edited hot", edited: true });
    expect(store.edit("m0000", "edited cold")).toMatchObject({ id: "m0000", text: "edited cold", edited: true });
    expect(store.get("m0000")?.text).toBe("edited cold");
    expect(store.edit("missing", "x")).toBeUndefined();
  });

  test("save upserts by id but keeps the original timestamp and sender", () => {
    store.save({ id: "a", from: "assistant", text: "first", ts: 1000 });
    store.save({ id: "a", from: "user", text: "again", ts: 1, file: { url: "/inbox/f.png", name: "f.png" } });
    expect(store.get("a")).toEqual({
      id: "a",
      from: "assistant",
      text: "again",
      ts: 1000,
      file: { url: "/inbox/f.png", name: "f.png" },
    });
    expect(store.recent(10).messages).toHaveLength(1);
  });

  test("optional fields round-trip", () => {
    store.save({ id: "r", from: "assistant", text: "re", ts: 5, replyTo: "q", edited: true });
    store.save({ id: "p", from: "user", text: "plain", ts: 6 });
    expect(store.get("r")).toEqual({ id: "r", from: "assistant", text: "re", ts: 5, replyTo: "q", edited: true });
    expect(store.get("p")).toEqual({ id: "p", from: "user", text: "plain", ts: 6 });
  });

  test("history survives closing and reopening the files", () => {
    seed500();
    store.archive(NOW);
    store.close();
    store = new ChatStore(dir);
    expect(store.recent(10).messages).toHaveLength(10);
    expect(store.get("m0000")?.text).toBe("msg 0");
    expect(walkAll(100).seen).toHaveLength(500);
  });
});
