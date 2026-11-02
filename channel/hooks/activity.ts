#!/usr/bin/env bun
/**
 * Claude Code hook → chat activity ("작업 중 · 파일 수정 중 · server.ts").
 *
 * Registered in .claude/settings.json for UserPromptSubmit, PreToolUse, PostToolUse and Stop.
 * Finds the channel server owned by the same Claude Code process (activity.json written by
 * channel/server.ts under ~/.claude/channels/<id>/) and posts the event to it. Sessions without
 * a channel server find nothing and exit. Never blocks or fails the hooked action.
 */
import { readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";

type HookInput = {
  hook_event_name?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
};

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const short = (s: string, n = 60) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Short Korean label for what a tool call is doing. Never includes command text or file contents. */
export function labelFor(tool: string, input: Record<string, unknown> = {}): string {
  const file = basename(str(input.file_path) || str(input.notebook_path) || str(input.path));
  if (/^mcp__.*__(reply|edit_message)$/.test(tool)) return "답장 보내는 중";
  if (tool.startsWith("mcp__claude-in-chrome__")) return "브라우저 작업 중";
  if (tool.startsWith("mcp__")) return `도구 사용 중 · ${tool.split("__")[1] ?? tool}`;
  switch (tool) {
    case "Bash": {
      const d = str(input.description);
      return d ? `명령 실행 · ${short(d)}` : "명령 실행 중";
    }
    case "Read":
      return file ? `파일 읽는 중 · ${file}` : "파일 읽는 중";
    case "Edit":
    case "MultiEdit":
    case "Write":
    case "NotebookEdit":
      return file ? `파일 수정 중 · ${file}` : "파일 수정 중";
    case "Grep":
    case "Glob":
      return "파일 검색 중";
    case "WebFetch":
    case "WebSearch":
      return "웹 자료 확인 중";
    case "Agent":
    case "Task": {
      const d = str(input.description);
      return d ? `하위 작업 · ${short(d)}` : "하위 작업 실행 중";
    }
    case "Skill":
      return str(input.skill) ? `스킬 · ${short(str(input.skill), 40)}` : "스킬 실행 중";
    case "TodoWrite":
      return "할 일 정리 중";
    case "ToolSearch":
      return "도구 불러오는 중";
    default:
      return tool ? `${tool} 실행 중` : "생각 중";
  }
}

export function eventLabel(input: HookInput): { event: string; label?: string } | null {
  const event = str(input.hook_event_name);
  if (event === "Stop") return { event };
  if (event === "UserPromptSubmit" || event === "PostToolUse") return { event, label: "생각 중" };
  if (event === "PreToolUse") return { event, label: labelFor(str(input.tool_name), input.tool_input ?? {}) };
  return null;
}

function claudeAncestor(): number | null {
  let p = process.ppid;
  for (let i = 0; i < 6 && p > 1; i++) {
    const r = Bun.spawnSync(["ps", "-o", "ppid=,comm=", "-p", String(p)]);
    const [ppid, ...comm] = r.stdout.toString().trim().split(/\s+/);
    if (basename(comm.join(" ")) === "claude") return p;
    p = Number(ppid);
  }
  return null;
}

function findServer(claudePid: number): { port: number; token: string } | null {
  const root = join(homedir(), ".claude", "channels");
  let dirs: string[] = [];
  try {
    dirs = readdirSync(root);
  } catch {
    return null;
  }
  for (const d of dirs) {
    try {
      const info = JSON.parse(readFileSync(join(root, d, "activity.json"), "utf-8"));
      if (info.claudePid === claudePid && typeof info.port === "number") return info;
    } catch {}
  }
  return null;
}

async function main() {
  const input = (await Bun.stdin.json().catch(() => ({}))) as HookInput;
  const report = eventLabel(input);
  if (!report) return;
  const pid = claudeAncestor();
  if (!pid) return;
  const server = findServer(pid);
  if (!server) return;
  await fetch(`http://127.0.0.1:${server.port}/activity`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-activity-token": server.token },
    body: JSON.stringify(report),
    signal: AbortSignal.timeout(800),
  }).catch(() => {});
}

if (import.meta.main) {
  await main().catch(() => {});
  process.exit(0);
}
