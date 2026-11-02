"""Fill script.template.md with the narration JSON and scene durations -> script.md.

usage: python3 gen_script.py 01-persona-vectors
Durations come from {video}/durations.json (written by build.py) when present,
otherwise from the narration estimate (chars without spaces / 7 + 0.6 s).
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main(video):
    narr = json.loads((ROOT / "narration" / f"{video}.json").read_text(encoding="utf-8"))
    tpl = (ROOT / video / "script.template.md").read_text(encoding="utf-8")
    dpath = ROOT / video / "durations.json"
    if dpath.exists():
        d = {x["scene_id"]: x for x in json.loads(dpath.read_text(encoding="utf-8"))}
        mode = "렌더된 실제 길이(초)" + (" · 오디오 반영" if any(x["audio"] for x in d.values()) else " · 오디오 없이 추정치로 렌더")
        dur = {k: v["duration"] for k, v in d.items()}
    else:
        mode = "내레이션 글자 수로 추정한 길이(초, 렌더 전)"
        dur = {x["scene_id"]: len(re.sub(r"\s", "", x["text"])) / 7 + 0.6 for x in narr}
    rows, total = [], 0.0
    for i, x in enumerate(narr, 1):
        sid = x["scene_id"]
        m, sec = divmod(total, 60)
        rows.append(f"| {i} | {sid} | {int(m)}:{sec:05.2f} | {dur[sid]:.1f} s |")
        total += dur[sid]
    rows.append(f"| | **합계** | | **{total:.1f} s ({int(total // 60)}분 {total % 60:.0f}초)** |")
    out = tpl.replace("{{TABLE}}", "\n".join(rows)).replace("{{DURATION_MODE}}", mode)
    for x in narr:
        out = out.replace("{{N:" + x["scene_id"] + "}}", "\n\n  > " + x["text"])
    left = re.findall(r"\{\{[^}]+\}\}", out)
    if left:
        raise SystemExit(f"unfilled placeholders: {left}")
    (ROOT / video / "script.md").write_text(out, encoding="utf-8")
    print(f"wrote {video}/script.md ({total:.1f}s)")


if __name__ == "__main__":
    main(sys.argv[1])
