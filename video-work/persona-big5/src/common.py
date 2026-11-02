"""Shared style, layout helpers and audio-driven scene timing for both videos.

Timing rule (per scene):
    audio/{video}/{scene_id}.mp3 exists -> target = audio length + AUDIO_PAD
    otherwise                           -> target = narration chars (no spaces) / CHARS_PER_SEC + AUDIO_PAD
The scene lasts max(animation time, target, reading floor, MIN_T): holds between
beats are stretched to fill the target, never shortened below a minimum hold.
Reading floor = Hangul characters shown in the scene / READ_CPS (6 per second),
so text-heavy scenes stay on screen long enough. It applies in estimate mode only;
with real audio it is off unless PB5_READ_FLOOR=1 (audio rule: max(animation, audio + 0.6 s)).
Each render prints a "[timing]" line with all of these numbers.
"""
import json
import os
import re
import subprocess
from pathlib import Path

from manim import (
    BOLD, DOWN, LEFT, NORMAL, ORIGIN, RIGHT, UP, UL, UR, DL, DR,
    Arrow, Circle, Create, Dot, FadeIn, FadeOut, GrowArrow, Line, DashedLine,
    RoundedRectangle, Rectangle, Scene, Text, VGroup, Write, config, AnimationGroup,
    LaggedStart, Transform, ReplacementTransform, Indicate, MoveToTarget, Succession,
)
import numpy as np

ROOT = Path(__file__).resolve().parents[1]          # video-work/persona-big5
NARRATION_DIR = ROOT / "narration"
AUDIO_DIR = ROOT / "audio"

CHARS_PER_SEC = 7.0
AUDIO_PAD = 0.6          # 0.3 s lead-in + 0.3 s tail around the voice
AUDIO_LEAD = 0.3
FADE_OUT = 0.4
MIN_HOLD = 0.8

# ---- style (shared by both videos) -------------------------------------
FONT = "Apple SD Gothic Neo"
MONO = "Menlo"
BG = "#0E1117"
FG = "#E6E8EB"
DIM = "#8B95A1"
FAINT = "#3A4250"
PANEL = "#171D29"
TEAL = "#3CC8B4"     # activation space / directions (vectors)
AMBER = "#F2A541"    # trait expressed / high / +alpha
VIOLET = "#A08CFF"   # trait suppressed / low / -alpha / removal

config.background_color = BG

MAX_W = 12.6


def narration(video):
    data = json.loads((NARRATION_DIR / f"{video}.json").read_text(encoding="utf-8"))
    return {d["scene_id"]: d["text"] for d in data}


def audio_path(video, sid):
    return AUDIO_DIR / video / f"{sid}.mp3"


def media_len(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True, text=True, check=True).stdout.strip()
    return float(out)


def target_duration(video, sid):
    p = audio_path(video, sid)
    if p.exists():
        return media_len(p) + AUDIO_PAD, "audio"
    text = narration(video)[sid]
    n = len(re.sub(r"\s", "", text))
    return n / CHARS_PER_SEC + AUDIO_PAD, "estimate"


# ---- text helpers --------------------------------------------------------
_TXT_LOG = []
READ_CPS = 6.0           # on-screen Hangul characters readable per second


def hangul_count(s):
    return len(re.findall(r"[\uac00-\ud7a3]", s))


def txt(s, size=30, color=FG, weight=NORMAL, font=FONT, maxw=MAX_W, t2c=None, **kw):
    _TXT_LOG.append(s)
    t = Text(s, font=font, font_size=size, color=color, weight=weight,
             t2c=t2c or {}, **kw)
    if maxw and t.width > maxw:
        t.scale_to_fit_width(maxw)
    return t


def mono(s, size=30, color=FG, **kw):
    return txt(s, size=size, color=color, font=MONO, **kw)


def header(chapter, title):
    tag = txt(chapter, size=22, color=DIM) if chapter else None
    ttl = txt(title, size=40, weight=BOLD)
    grp = VGroup(*(x for x in (tag, ttl) if x is not None))
    grp.arrange(DOWN, aligned_edge=LEFT, buff=0.14)
    grp.to_corner(UL, buff=0.55)
    return grp


def source(s):
    t = txt(s, size=18, color=DIM, maxw=9.0)
    t.to_corner(DR, buff=0.35)
    return t


def footnote(s, color=DIM):
    t = txt(s, size=18, color=color, maxw=7.5)
    t.to_corner(DL, buff=0.35)
    return t


def panel(width, height, color=FAINT, fill=PANEL, radius=0.18, stroke=2):
    return RoundedRectangle(width=width, height=height, corner_radius=radius,
                            stroke_color=color, stroke_width=stroke,
                            fill_color=fill, fill_opacity=1)


def boxed(mobj, color=FAINT, buff=0.28, fill=PANEL, stroke=2):
    r = panel(mobj.width + 2 * buff, mobj.height + 2 * buff, color=color, fill=fill, stroke=stroke)
    r.move_to(mobj)
    return VGroup(r, mobj)


def bullets(items, size=28, color=FG, dot_colors=None, buff=0.3, maxw=MAX_W - 0.6):
    rows = []
    for i, it in enumerate(items):
        c = (dot_colors[i] if dot_colors else TEAL)
        if isinstance(it, str):
            t = txt(it, size=size, color=color, maxw=maxw)
        else:
            t = it
        d = Dot(radius=0.06, color=c)
        row = VGroup(d, t).arrange(RIGHT, buff=0.25, aligned_edge=UP)
        d.shift(DOWN * min(0.14, t.height / 2 - 0.02))
        rows.append(row)
    return VGroup(*rows).arrange(DOWN, aligned_edge=LEFT, buff=buff)


def card(title, body, color=TEAL, width=4.0, title_size=28, body_size=24, height=None):
    t = txt(title, size=title_size, color=color, weight=BOLD, maxw=width - 0.5)
    b = txt(body, size=body_size, color=FG, maxw=width - 0.5) if body else None
    inner = VGroup(t, b).arrange(DOWN, buff=0.22, aligned_edge=LEFT) if b else VGroup(t)
    h = height or inner.height + 0.6
    r = panel(width, h, color=color)
    inner.move_to(r).align_to(r, LEFT).shift(RIGHT * 0.28)
    if height:
        inner.align_to(r, UP).shift(DOWN * 0.3)
    return VGroup(r, inner)


def cloud(center, n, spread, color, seed, radius=0.055, opacity=0.85, clip=None, margin=0.3):
    rng = np.random.default_rng(seed)
    pts = rng.normal(size=(n, 2)) * spread
    if clip is not None:
        cx, cy = clip.get_center()[:2]
        hw, hh = clip.width / 2 - margin, clip.height / 2 - margin
        pts = [(x, y) for x, y in pts
               if abs(center[0] + x - cx) < hw and abs(center[1] + y - cy) < hh - 0.25]
    dots = VGroup(*[Dot(np.array([center[0] + x, center[1] + y, 0]), radius=radius,
                        color=color, fill_opacity=opacity) for x, y in pts])
    return dots


def axes_box(w, h, color=FAINT):
    """Plain L-shaped axes (no ticks): returns (group, origin_point)."""
    o = np.array([-w / 2, -h / 2, 0])
    xa = Line(o, o + RIGHT * w, color=color, stroke_width=2)
    ya = Line(o, o + UP * h, color=color, stroke_width=2)
    return VGroup(xa, ya), o


# ---- scene base -------------------------------------------------------------
class BeatScene(Scene):
    """Subclass sets VIDEO and SID, implements beats() -> list of (fn, anim_time, weight)."""
    VIDEO = ""
    SID = ""
    MIN_T = 0.0

    def setup(self):
        self.target, self.mode = target_duration(self.VIDEO, self.SID)

    def construct(self):
        _TXT_LOG.clear()
        beats = self.beats()
        n_h = sum(hangul_count(x) for x in _TXT_LOG)
        read_t = n_h / READ_CPS
        narr_t = self.target
        # Reading floor: always in estimate mode; with real audio only if PB5_READ_FLOOR=1
        # (default audio rule = max(animation, audio + 0.6 s)).
        use_floor = self.mode != "audio" or os.environ.get("PB5_READ_FLOOR") == "1"
        self.target = max(self.target, read_t if use_floor else 0.0, self.MIN_T)
        print(f"[timing] {self.SID}: mode={self.mode} narration/audio={narr_t:.1f}s "
              f"on-screen hangul={n_h} read={read_t:.1f}s -> target={self.target:.1f}s")
        base = sum(b[1] for b in beats) + FADE_OUT
        extra = max(0.0, self.target - base)
        weights = [b[2] for b in beats]
        W = sum(weights[:-1]) + weights[-1] or 1.0
        for i, (fn, _t, w) in enumerate(beats):
            fn()
            if i < len(beats) - 1:
                self.wait(max(MIN_HOLD * min(w, 1.0) if w > 0 else 0.3, extra * w / W))
        rem = self.target - self.time - FADE_OUT
        self.wait(max(MIN_HOLD, rem))
        if self.mobjects:
            self.play(*[FadeOut(m) for m in self.mobjects], run_time=FADE_OUT)
        else:
            self.wait(FADE_OUT)

    # convenience
    CHAPTER_T = 2.7

    def chapter_card(self, num, title):
        """Full-screen chapter title card (2.7 s of animation)."""
        big_n = txt(num, size=110, color=TEAL, weight=BOLD)
        big_t = txt(title, size=56, weight=BOLD)
        grp = VGroup(big_n, big_t).arrange(DOWN, buff=0.4).move_to(ORIGIN)
        self.play(FadeIn(grp, shift=UP * 0.2), run_time=0.8)
        self.wait(1.4)
        self.play(FadeOut(grp), run_time=0.5)

    def beats(self):
        raise NotImplementedError


def research_card(extra_line=None):
    """The shared closing question card (persona = gate or generator?)."""
    hdr = header("연구에 어떻게 쓰나", "페르소나는 게이트인가, 생성기인가?")
    p1 = txt("LLM에는 감정 개념의 선형 표상이 있다  —  Sofroniew et al. 2026 (arXiv:2604.07729)",
             size=24, color=FG, t2c={"Sofroniew et al. 2026 (arXiv:2604.07729)": DIM})
    p2 = txt("그런데 기본 어시스턴트 페르소나가 그 표출을 억누르고 있다면?", size=26, color=FG)
    prem = VGroup(p1, p2).arrange(DOWN, aligned_edge=LEFT, buff=0.22)
    prem.next_to(hdr, DOWN, buff=0.45).align_to(hdr, LEFT)

    mid = boxed(VGroup(txt("페르소나 전환", size=30, weight=BOLD),
                       txt("프롬프트로 / 활성화 스티어링으로", size=22, color=DIM)
                       ).arrange(DOWN, buff=0.12), color=FG, buff=0.25)
    mid.move_to(np.array([0, -0.55, 0]))
    gate = card("게이트 (gate)", "감정 표상은 그대로,\n표출만 바뀐다", color=VIOLET, width=4.6,
                title_size=30, body_size=24)
    gen = card("생성기 (generator)", "감정 표상 자체가\n바뀐다", color=TEAL, width=4.6,
               title_size=30, body_size=24)
    gate.move_to(np.array([-4.3, -2.3, 0]))
    gen.move_to(np.array([4.3, -2.3, 0]))
    a1 = Arrow(mid.get_left(), gate.get_top() + RIGHT * 0.6, buff=0.12, color=DIM, stroke_width=3)
    a2 = Arrow(mid.get_right(), gen.get_top() + LEFT * 0.6, buff=0.12, color=DIM, stroke_width=3)
    q = txt("열린 질문", size=30, color=AMBER, weight=BOLD)
    q.move_to(np.array([0, -2.3, 0]))
    extra = None
    if extra_line:
        extra = txt(extra_line, size=20, color=DIM, maxw=8.4)
        extra.move_to(np.array([0, -3.45, 0]))
    return hdr, prem, mid, VGroup(a1, a2), VGroup(gate, gen), q, extra
