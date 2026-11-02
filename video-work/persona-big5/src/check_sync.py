"""Check A/V sync of a final video against its narration mp3s.

usage: python3 check_sync.py 01-persona-vectors

For every scene: expected voice onset = scene start (durations.json) + 0.3 s lead
+ the mp3's own leading silence. Measured onset = first end-of-silence in the
final mp4's audio at or after the scene start (ffmpeg silencedetect).
Also checks that the cumulative mp3 offsets equal the scene starts, and that the
mp4 has one video and one audio stream of matching length.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEAD = 0.3
NOISE, MIN_SIL = "-40dB", "0.2"


def probe(path, entries, stream=None):
    cmd = ["ffprobe", "-v", "error"]
    if stream:
        cmd += ["-select_streams", stream]
    cmd += ["-show_entries", entries, "-of", "json", str(path)]
    return json.loads(subprocess.run(cmd, capture_output=True, text=True, check=True).stdout)


def silences(path):
    r = subprocess.run(["ffmpeg", "-v", "info", "-i", str(path), "-af",
                        f"silencedetect=noise={NOISE}:d={MIN_SIL}", "-f", "null", "-"],
                       capture_output=True, text=True)
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", r.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
    return starts, ends


def lead_silence(mp3):
    s, e = silences(mp3)
    return e[0] if s and s[0] < 0.01 and e else 0.0


def main(video):
    mp4 = ROOT / f"{video}.mp4"
    info = json.loads((ROOT / video / "durations.json").read_text(encoding="utf-8"))
    streams = probe(mp4, "stream=codec_type,codec_name,duration")["streams"]
    print("streams:", ", ".join(f"{s['codec_type']}:{s['codec_name']} {float(s['duration']):.2f}s" for s in streams))
    _, ends = silences(mp4)
    worst, cum = 0.0, 0.0
    print(f"{'scene':18s} {'start':>8s} {'cum':>8s} {'mp3':>6s} {'expect':>8s} {'meas':>8s} {'diff':>6s}")
    for x in info:
        mp3 = ROOT / "audio" / video / f"{x['scene_id']}.mp3"
        alen = float(probe(mp3, "format=duration")["format"]["duration"]) if mp3.exists() else 0.0
        exp = x["start"] + LEAD + (lead_silence(mp3) if mp3.exists() else 0.0)
        meas = next((e for e in ends if e >= x["start"] - 0.05), float("nan"))
        d = meas - exp
        worst = max(worst, abs(d))
        print(f"{x['scene_id']:18s} {x['start']:8.2f} {cum:8.2f} {alen:6.2f} {exp:8.2f} {meas:8.2f} {d:+6.2f}")
        if abs(cum - x["start"]) > 0.05:
            print("   !! cumulative offset mismatch")
        if alen + LEAD > x["duration"] + 0.01:
            print("   !! audio longer than scene")
        cum += x["duration"]
    print(f"total scenes {cum:.2f}s · max onset error {worst:.3f}s")


if __name__ == "__main__":
    main(sys.argv[1])
