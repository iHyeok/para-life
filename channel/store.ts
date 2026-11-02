/**
 * Persistent chat history.
 *
 * Two SQLite files, same schema:
 * - chat.db          hot: recent messages (replay on connect, edits, retries, recent paging)
 * - chat-archive.db  cold: messages older than HOT_DAYS, moved over once a day
 *
 * Paging walks hot first and continues into the archive, so clients see one timeline.
 * Keeping the hot file small keeps its pages cached and makes backups/inspection cheap.
 */
import { Database } from "bun:sqlite";
import { mkdirSync } from "fs";
import { join } from "path";

export type StoredMsg = {
  id: string;
  from: "user" | "assistant";
  text: string;
  ts: number;
  replyTo?: string;
  file?: { url: string; name: string };
  edited?: boolean;
};

type Row = {
  id: string;
  sender: "user" | "assistant";
  text: string;
  ts: number;
  reply_to: string | null;
  file_url: string | null;
  file_name: string | null;
  edited: number;
};

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS messages (
    id        TEXT PRIMARY KEY,
    sender    TEXT NOT NULL,
    text      TEXT NOT NULL,
    ts        INTEGER NOT NULL,
    reply_to  TEXT,
    file_url  TEXT,
    file_name TEXT,
    edited    INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS messages_ts ON messages (ts, id);
`;

const HOT_DAYS = 90;
const DAY = 24 * 60 * 60 * 1000;

function toMsg(r: Row): StoredMsg {
  return {
    id: r.id,
    from: r.sender,
    text: r.text,
    ts: r.ts,
    ...(r.reply_to ? { replyTo: r.reply_to } : {}),
    ...(r.file_url ? { file: { url: r.file_url, name: r.file_name ?? "" } } : {}),
    ...(r.edited ? { edited: true } : {}),
  };
}

export class ChatStore {
  private hot: Database;
  private cold: Database;

  constructor(dir: string) {
    mkdirSync(dir, { recursive: true });
    this.hot = this.open(join(dir, "chat.db"));
    this.cold = this.open(join(dir, "chat-archive.db"));
  }

  private open(path: string) {
    const db = new Database(path, { create: true });
    db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 3000;");
    db.exec(SCHEMA);
    return db;
  }

  /** Insert, or overwrite an existing id (a retried upload, say). */
  save(m: StoredMsg) {
    this.hot
      .query(
        `INSERT INTO messages (id, sender, text, ts, reply_to, file_url, file_name, edited)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET text = excluded.text, file_url = excluded.file_url,
           file_name = excluded.file_name, edited = excluded.edited`
      )
      .run(m.id, m.from, m.text, m.ts, m.replyTo ?? null, m.file?.url ?? null, m.file?.name ?? null, m.edited ? 1 : 0);
  }

  get(id: string): StoredMsg | undefined {
    for (const db of [this.hot, this.cold]) {
      const r = db.query("SELECT * FROM messages WHERE id = ?").get(id) as Row | null;
      if (r) return toMsg(r);
    }
  }

  /** Returns the updated message, or undefined if it isn't stored. */
  edit(id: string, text: string): StoredMsg | undefined {
    for (const db of [this.hot, this.cold]) {
      const res = db.query("UPDATE messages SET text = ?, edited = 1 WHERE id = ?").run(text, id);
      if (res.changes) return this.get(id);
    }
  }

  /** The newest `limit` messages, oldest first. */
  recent(limit: number) {
    return this.before(undefined, limit);
  }

  /**
   * Up to `limit` messages strictly older than the cursor (ts, id), oldest first,
   * plus whether anything older remains.
   */
  before(cursor: { ts: number; id: string } | undefined, limit: number) {
    const rows: Row[] = [];
    for (const db of [this.hot, this.cold]) {
      const need = limit + 1 - rows.length;
      if (need <= 0) break;
      const page = (
        cursor
          ? db
              .query("SELECT * FROM messages WHERE (ts, id) < (?, ?) ORDER BY ts DESC, id DESC LIMIT ?")
              .all(cursor.ts, cursor.id, need)
          : db.query("SELECT * FROM messages ORDER BY ts DESC, id DESC LIMIT ?").all(need)
      ) as Row[];
      rows.push(...page);
    }
    const hasMore = rows.length > limit;
    return { messages: rows.slice(0, limit).reverse().map(toMsg), hasMore };
  }

  /** Move messages older than HOT_DAYS into the archive file. Returns how many moved. */
  archive(now = Date.now()): number {
    const cutoff = now - HOT_DAYS * DAY;
    const old = this.hot.query("SELECT * FROM messages WHERE ts < ?").all(cutoff) as Row[];
    if (!old.length) return 0;
    const insert = this.cold.query(
      `INSERT OR REPLACE INTO messages (id, sender, text, ts, reply_to, file_url, file_name, edited)
       VALUES ($id, $sender, $text, $ts, $reply_to, $file_url, $file_name, $edited)`
    );
    // Copy first, delete second: a crash in between leaves a duplicate, never a loss
    this.cold.transaction((rows: Row[]) => {
      for (const r of rows) {
        insert.run({
          $id: r.id, $sender: r.sender, $text: r.text, $ts: r.ts, $reply_to: r.reply_to,
          $file_url: r.file_url, $file_name: r.file_name, $edited: r.edited,
        });
      }
    })(old);
    this.hot.query("DELETE FROM messages WHERE ts < ?").run(cutoff);
    return old.length;
  }

  close() {
    this.hot.close();
    this.cold.close();
  }
}
