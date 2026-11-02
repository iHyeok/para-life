import { describe, expect, test } from "bun:test";
import { eventLabel, labelFor } from "../hooks/activity";

describe("activity hook labels", () => {
  test("tools map to short labels without command text", () => {
    expect(labelFor("Bash", { command: "rm -rf secret && curl x", description: "Run tests" })).toBe("명령 실행 · Run tests");
    expect(labelFor("Bash", { command: "export TOKEN=abc" })).toBe("명령 실행 중");
    expect(labelFor("Read", { file_path: "/Users/x/para-life/projects/a.md" })).toBe("파일 읽는 중 · a.md");
    expect(labelFor("Edit", { file_path: "/a/b/server.ts" })).toBe("파일 수정 중 · server.ts");
    expect(labelFor("Grep", { pattern: "x" })).toBe("파일 검색 중");
    expect(labelFor("mcp__para-life-channel__reply", { text: "hi" })).toBe("답장 보내는 중");
    expect(labelFor("mcp__para-paper-channel__reply", {})).toBe("답장 보내는 중");
    expect(labelFor("mcp__claude-in-chrome__navigate", {})).toBe("브라우저 작업 중");
    expect(labelFor("Agent", { description: "x".repeat(100) })).toHaveLength("하위 작업 · ".length + 60);
  });

  test("events", () => {
    expect(eventLabel({ hook_event_name: "Stop" })).toEqual({ event: "Stop" });
    expect(eventLabel({ hook_event_name: "UserPromptSubmit" })).toEqual({ event: "UserPromptSubmit", label: "생각 중" });
    expect(eventLabel({ hook_event_name: "PreToolUse", tool_name: "Read", tool_input: { file_path: "/x/y.md" } })).toEqual({
      event: "PreToolUse",
      label: "파일 읽는 중 · y.md",
    });
    expect(eventLabel({ hook_event_name: "Notification" })).toBeNull();
  });
});
