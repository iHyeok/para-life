"""Render every scene of a video with Manim, lay the narration audio under it, and
concatenate into the final mp4 (H.264 + AAC).

usage:  python build.py 01-persona-vectors [--only s05_pipeline,s06_extract] [--jobs 4]
        python build.py 02-big-five-steering

Audio sync: each scene's audio track is built as an exact-length PCM segment
(0.3 s lead-in, then the mp3 if present, padded with silence to the scene's
frame-exact duration). Segments are concatenated sample-accurately and encoded
to AAC once, so there is no per-scene drift.

Environment: MANIM (path to the manim executable), WORK (scratch dir for media).
"""
import argparse
import json
import os
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

SRC = Path(__file__).resolve().parent
ROOT = SRC.parent
MODULES = {"01-persona-vectors": SRC / "v1_persona_vectors.py",
           "02-big-five-steering": SRC / "v2_big_five.py"}
MANIM = os.environ.get("MANIM", "manim")
WORK = Path(os.environ.get("WORK", ROOT / ".work"))
FPS = 30
LEAD = 0.3


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        sys.stderr.write(r.stdout[-3000:] + "\n" + r.stderr[-3000:])
        raise SystemExit(f"failed: {' '.join(map(str, cmd[:6]))} ...")
    return r


def scene_classes(module):
    """Map scene_id -> class name by reading `VIDEO, SID = V, "..."` under each class."""
    out, cur = {}, None
    for line in module.read_text(encoding="utf-8").splitlines():
        m = re.match(r"class (\w+)\(BeatScene\)", line)
        if m:
            cur = m.group(1)
        m = re.search(r'VIDEO, SID = V, "(\w+)"', line)
        if m and cur:
            out[m.group(1)] = cur
    return out


def frames(path):
    r = run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets",
             "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", str(path)])
    return int(r.stdout.strip())


def scene_mp4(video, sid):
    # one media dir per scene: parallel Manim processes must not share the Text SVG cache
    return WORK / "media" / video / sid / "videos" / MODULES[video].stem / f"1080p{FPS}" / f"{sid}.mp4"


def render(video, sid, cls):
    media = WORK / "media" / video / sid
    r = run([MANIM, "render", "-r", "1920,1080", "--fps", str(FPS), "--disable_caching",
             "--media_dir", str(media), "-o", sid, str(MODULES[video]), cls])
    timing = [l for l in r.stdout.splitlines() if "[timing]" in l]
    mp4 = scene_mp4(video, sid)
    if not mp4.exists():
        raise SystemExit(f"missing output {mp4}")
    return mp4, (timing[0].strip() if timing else "")


def scene_audio(video, sid, dur, out_wav):
    mp3 = ROOT / "audio" / video / f"{sid}.mp3"
    if mp3.exists():
        cmd = ["ffmpeg", "-y", "-v", "error", "-i", str(mp3), "-filter_complex",
               f"[0:a]aresample=48000,aformat=channel_layouts=stereo,adelay={int(LEAD*1000)}:all=1,apad[a]",
               "-map", "[a]", "-t", f"{dur:.6f}", "-c:a", "pcm_s16le", str(out_wav)]
    else:
        cmd = ["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
               "-t", f"{dur:.6f}", "-c:a", "pcm_s16le", str(out_wav)]
    run(cmd)
    return mp3.exists()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video", choices=list(MODULES))
    ap.add_argument("--only", default="")
    ap.add_argument("--jobs", type=int, default=4)
    ap.add_argument("--no-final", action="store_true")
    a = ap.parse_args()

    order = [d["scene_id"] for d in json.loads((ROOT / "narration" / f"{a.video}.json").read_text(encoding="utf-8"))]
    classes = scene_classes(MODULES[a.video])
    missing = [s for s in order if s not in classes]
    if missing:
        raise SystemExit(f"no scene class for {missing}")
    todo = [s for s in order if not a.only or s in a.only.split(",")]
    WORK.mkdir(parents=True, exist_ok=True)

    results = {}
    with ThreadPoolExecutor(a.jobs) as ex:
        futs = {s: ex.submit(render, a.video, s, classes[s]) for s in todo}
        for s in todo:
            results[s] = futs[s].result()
            print(results[s][1] or s, flush=True)
    if a.no_final:
        return

    seg_dir = WORK / "segments" / a.video
    seg_dir.mkdir(parents=True, exist_ok=True)
    vlist, alist, info = [], [], []
    t = 0.0
    for s in order:
        mp4 = scene_mp4(a.video, s)
        n = frames(mp4)
        dur = n / FPS
        wav = seg_dir / f"{s}.wav"
        has_audio = scene_audio(a.video, s, dur, wav)
        vlist.append(f"file '{mp4}'")
        alist.append(f"file '{wav}'")
        info.append({"scene_id": s, "start": round(t, 3), "duration": round(dur, 3), "audio": has_audio})
        t += dur
    (seg_dir / "v.txt").write_text("\n".join(vlist) + "\n")
    (seg_dir / "a.txt").write_text("\n".join(alist) + "\n")
    vcat = seg_dir / "video.mp4"
    acat = seg_dir / "audio.wav"
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(seg_dir / "v.txt"),
         "-c", "copy", str(vcat)])
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(seg_dir / "a.txt"),
         "-c", "copy", str(acat)])
    final = ROOT / f"{a.video}.mp4"
    run(["ffmpeg", "-y", "-v", "error", "-i", str(vcat), "-i", str(acat), "-map", "0:v:0", "-map", "1:a:0",
         "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-r", str(FPS),
         "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", str(final)])
    (ROOT / a.video / "durations.json").write_text(json.dumps(info, ensure_ascii=False, indent=1) + "\n")
    print(f"wrote {final}  total {t:.1f}s")


if __name__ == "__main__":
    main()
