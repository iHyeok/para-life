#!/usr/bin/env python3
"""Read other Claude Code conversations that ran in a project folder.

Project sessions use this to pick up what the user discussed with Claude Code directly
(e.g. at home in the same repo) when it hasn't been written to the repo's docs yet.

  scripts/cc-history.py <project-dir>                 # recent conversations, newest first
  scripts/cc-history.py <project-dir> --show 1        # user/Claude text of conversation #1
  scripts/cc-history.py <project-dir> --show 1 --full # without trimming long messages

Conversations of PARA project chat sessions (~/.claude/channels/*/session-id) are skipped,
so a session never lists itself. Tool calls and tool output are left out.
"""
import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path

HOME = Path.home()


def transcript_dir(project: Path) -> Path:
    return HOME / ".claude" / "projects" / re.sub(r"[^A-Za-z0-9]", "-", str(project))


def channel_session_ids() -> set:
    ids = set()
    for f in (HOME / ".claude" / "channels").glob("*/session-id"):
        try:
            ids.add(f.read_text().strip())
        except OSError:
            pass
    return ids


def text_of(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(b.get("text", "") for b in content if isinstance(b, dict) and b.get("type") == "text")
    return ""


def is_noise(text: str) -> bool:
    t = text.lstrip()
    return (not t or t.startswith("<command-") or t.startswith("<local-command") or t.startswith("<system-reminder>")
            or t.startswith("Caveat:") or t.startswith("[Request interrupted"))


def turns(path: Path):
    """(ts, who, text) for the human-readable turns of one transcript."""
    out = []
    with path.open(encoding="utf-8", errors="replace") as fh:
        for line in fh:
            try:
                e = json.loads(line)
            except json.JSONDecodeError:
                continue
            if e.get("type") not in ("user", "assistant") or e.get("isSidechain") or e.get("isMeta"):
                continue
            text = text_of((e.get("message") or {}).get("content")).strip()
            if is_noise(text):
                continue
            who = "사용자" if e["type"] == "user" else "Claude"
            if who == "사용자" and text.startswith("<channel"):
                who = "사용자(채팅)"
                text = re.sub(r"^<channel[^>]*>\s*|\s*</channel>$", "", text)
            out.append((e.get("timestamp", ""), who, text))
    return out


def fmt_ts(ts: str) -> str:
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone().strftime("%Y-%m-%d %H:%M")
    except ValueError:
        return ts[:16]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("project", type=Path)
    ap.add_argument("--show", type=int, metavar="N")
    ap.add_argument("--full", action="store_true")
    ap.add_argument("--limit", type=int, default=15)
    a = ap.parse_args()

    d = transcript_dir(a.project.expanduser().resolve())
    skip = channel_session_ids()
    files = sorted((f for f in d.glob("*.jsonl") if f.stem not in skip), key=lambda f: f.stat().st_mtime, reverse=True)
    convs = [(f, t) for f in files if (t := turns(f))][: a.limit]
    if not convs:
        print(f"이 폴더에서 돈 다른 Claude Code 대화가 없습니다 ({d}).")
        return

    if a.show is None:
        for i, (f, t) in enumerate(convs, 1):
            first = next((x[2] for x in t if x[1].startswith("사용자")), "")
            first = " ".join(first.split())[:90]
            print(f"{i:>2}. {fmt_ts(t[0][0])} ~ {fmt_ts(t[-1][0])} · 발화 {len(t)}개 · {first}")
        print("\n자세히: --show <번호>")
        return

    if not 1 <= a.show <= len(convs):
        sys.exit(f"--show는 1~{len(convs)}")
    f, t = convs[a.show - 1]
    print(f"# {f.stem} ({fmt_ts(t[0][0])} ~ {fmt_ts(t[-1][0])})\n")
    for ts, who, text in t:
        if not a.full and len(text) > 1500:
            text = text[:1500] + f" …(+{len(text) - 1500}자, --full)"
        print(f"## {fmt_ts(ts)} · {who}\n{text}\n")


if __name__ == "__main__":
    main()
