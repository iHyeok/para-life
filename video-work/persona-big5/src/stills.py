"""Extract stills for visual QA.

usage:
  python3 stills.py every <video.mp4> <outdir> [seconds=5]     one frame every N s
  python3 stills.py ends  <outdir> <scene.mp4> [<scene.mp4> ...] last frame before each scene's fade-out
  python3 stills.py at    <video.mp4> <outdir> t1,t2,...       frames at given times
"""
import subprocess
import sys
from pathlib import Path


def dur(p):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                 "-of", "csv=p=0", str(p)], capture_output=True, text=True,
                                check=True).stdout.strip())


def grab(src, t, out):
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{t:.3f}", "-i", str(src),
                    "-frames:v", "1", str(out)], check=True)


def main():
    mode = sys.argv[1]
    if mode == "every":
        src, out = Path(sys.argv[2]), Path(sys.argv[3])
        step = float(sys.argv[4]) if len(sys.argv) > 4 else 5.0
        out.mkdir(parents=True, exist_ok=True)
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(src), "-vf", f"fps=1/{step}",
                        str(out / "f_%03d.png")], check=True)
    elif mode == "ends":
        out = Path(sys.argv[2])
        out.mkdir(parents=True, exist_ok=True)
        for s in sys.argv[3:]:
            p = Path(s)
            grab(p, max(0.0, dur(p) - 0.6), out / f"{p.stem}.png")
    elif mode == "at":
        src, out = Path(sys.argv[2]), Path(sys.argv[3])
        out.mkdir(parents=True, exist_ok=True)
        for t in sys.argv[4].split(","):
            grab(src, float(t), out / f"t_{float(t):07.1f}.png")
    print("ok")


if __name__ == "__main__":
    main()
