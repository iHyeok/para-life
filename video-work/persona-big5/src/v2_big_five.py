"""Video 02 - Big Five steering.

Main paper: Sheta, "The Steerable Self" (MusIML workshop @ ICML 2026). Full text was NOT
available; every claim about it comes from the two public ICML abstracts:
  A1 = poster abstract  (icml.cc/virtual/2026/80171)
  A2 = oral abstract    (icml.cc/virtual/2026/83945, "Not Neurotic Enough!")
Contrast scene: Hoppe et al. 2026, arXiv:2603.03326 (full text read).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import *  # noqa: E402,F401,F403
from manim import GrowFromEdge  # noqa: E402

V = "02-big-five-steering"
CH1 = "1 · Big Five (OCEAN)"
CH2 = "2 · 세 가지 활성화 개입"
CH3 = "3 · 결과 (초록 기준)"


def P(x, y):
    return np.array([x, y, 0.0])


class T01Title(BeatScene):
    VIDEO, SID = V, "t01_title"

    def beats(self):
        t1 = txt("Big Five 성격 스티어링", size=76, weight=BOLD)
        t2 = txt("The Steerable Self", size=40, color=TEAL)
        top = VGroup(t1, t2).arrange(DOWN, buff=0.25).move_to(P(0, 1.65))
        full = txt("The Steerable Self: Activation-Based Interventions for Big Five Personality Control in LLMs",
                   size=22, color=FG)
        meta = txt("Hala Sheta · 6th Muslims in ML (MusIML) 워크숍 @ ICML 2026 · 포스터 + 구두 발표", size=22, color=DIM)
        low = VGroup(full, meta).arrange(DOWN, buff=0.2).move_to(P(0, -0.15))
        warn = boxed(VGroup(txt("주의: 본문 미확보", size=28, color=AMBER, weight=BOLD),
                            txt("이 영상은 ICML 페이지에 공개된 초록 2개(포스터 · 구두 발표)만 근거로 합니다",
                                size=22)).arrange(DOWN, buff=0.15), color=AMBER, buff=0.3)
        warn.move_to(P(0, -2.2))

        def b1():
            self.play(FadeIn(top, shift=UP * 0.2), run_time=1.0)

        def b2():
            self.play(FadeIn(low), run_time=0.8)

        def b3():
            self.play(FadeIn(warn), run_time=0.8)
        return [(b1, 1.0, 1.0), (b2, 0.8, 1.2), (b3, 0.8, 2.0)]


class T02Ocean(BeatScene):
    VIDEO, SID = V, "t02_ocean"

    def beats(self):
        hdr = header(CH1, "성격의 다섯 축")
        data = [("O", "개방성 (Openness)", "새로운 경험·생각에 열려 있음"),
                ("C", "성실성 (Conscientiousness)", "계획적이고 책임감 있음"),
                ("E", "외향성 (Extraversion)", "사교적이고 활동적임"),
                ("A", "우호성 (Agreeableness)", "협조적이고 배려함"),
                ("N", "신경성 (Neuroticism)", "불안 등 부정 정서를 쉽게 느낌")]
        rows = VGroup()
        for i, (L, nm, ds) in enumerate(data):
            y = 1.45 - i * 0.92
            l = txt(L, size=44, color=TEAL, weight=BOLD).move_to(P(-6.0, y))
            n = txt(nm, size=27, weight=BOLD, maxw=4.6).move_to(P(-5.45, y), aligned_edge=LEFT)
            d = txt(ds, size=23, color=DIM, maxw=4.3).move_to(P(-0.85, y), aligned_edge=LEFT)
            ln = Line(P(3.9, y), P(6.0, y), stroke_width=7).set_color([AMBER, VIOLET])
            lo = txt("낮음", size=18, color=VIOLET).next_to(ln, LEFT, buff=0.15)
            hi = txt("높음", size=18, color=AMBER).next_to(ln, RIGHT, buff=0.12)
            rows.add(VGroup(l, n, d, VGroup(lo, ln, hi)))
        note = txt("각 축은 '있다/없다'가 아니라 연속선", size=22, color=FG).move_to(P(0, -3.05))
        src = source("심리학 배경 · Goldberg (1990)")

        def b0():
            self.chapter_card("1", "Big Five (OCEAN)")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), run_time=0.5)
            self.play(LaggedStart(*[FadeIn(r[:3], shift=RIGHT * 0.1) for r in rows], lag_ratio=0.25), run_time=2.0)

        def b2():
            self.play(LaggedStart(*[FadeIn(r[3]) for r in rows], lag_ratio=0.15), FadeIn(note), run_time=1.0)
        return [(b0, self.CHAPTER_T, 0.2), (b1, 2.5, 3.0), (b2, 1.0, 1.0)]


class T03Measure(BeatScene):
    VIDEO, SID = V, "t03_measure"

    def beats(self):
        hdr = header(CH1, "LLM의 성격은 어떻게 재나")
        L = card("① 자기보고 설문 (self-report)",
                 "예: IPIP, BFI-44 같은 성격 문항\n\"I am the life of the party\"\n→ 얼마나 동의하는지 1–5로 답함",
                 color=FG, width=6.0, title_size=27, body_size=22, height=2.55)
        R = card("② 행동·텍스트 판정 (LLM-as-a-judge)",
                 "모델이 자유롭게 쓴 글을\n다른 LLM이 읽고 특성 점수를 매김",
                 color=FG, width=6.0, title_size=27, body_size=22, height=2.55)
        VGroup(L, R).arrange(RIGHT, buff=0.4).move_to(P(0, 0.55))
        lL = txt("한계: 스스로 말하는 성격 ≠ 실제 행동\n(Hoppe et al.: 자기보고 점수는 종종 신뢰하기 어려움)",
                 size=20, color=DIM, maxw=5.8).next_to(L, DOWN, buff=0.25).align_to(L, LEFT)
        lR = txt("한계: 판정자의 기준·편향을 탐\n(예: 열정적인 반대도 '아첨'으로 채점 · Chen et al.)",
                 size=20, color=DIM, maxw=5.8).next_to(R, DOWN, buff=0.25).align_to(R, LEFT)
        bot = boxed(txt("The Steerable Self: 판정자 점수 (judge score)로 측정  —  포스터 초록", size=24,
                        t2c={"판정자 점수 (judge score)": AMBER}), color=FAINT, buff=0.18)
        bot.move_to(P(0, -2.75))
        src = source("Hoppe et al. 2026 §4.2–4.3 · Chen et al. 2025 부록 B.2")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), FadeIn(L, shift=UP * 0.1), run_time=0.8)
            self.play(FadeIn(lL), run_time=0.5)

        def b2():
            self.play(FadeIn(R, shift=UP * 0.1), run_time=0.7)
            self.play(FadeIn(lR), run_time=0.5)

        def b3():
            self.play(FadeIn(bot), run_time=0.6)
        return [(b1, 1.3, 2.0), (b2, 1.2, 2.0), (b3, 0.6, 1.0)]


class T04Methods(BeatScene):
    VIDEO, SID = V, "t04_methods"

    def beats(self):
        hdr = header(CH2, "같은 방향, 다른 사용법")
        top = txt("공통 방향 v: 특성 높음 vs 낮음 응답의 평균 차이 (difference-in-means)", size=24,
                  t2c={"v": TEAL, "높음": AMBER, "낮음": VIOLET})
        top.next_to(hdr, DOWN, buff=0.35).align_to(hdr, LEFT)

        W, H = 4.05, 4.55
        panels = VGroup(*[panel(W, H, color=FAINT) for _ in range(3)]).arrange(RIGHT, buff=0.22)
        panels.move_to(P(0, -1.05))
        titles = [("활성화 덧셈", "(activation addition)"), ("프로브 스티어링", "(probe steering)"),
                  ("방향 제거", "(directional ablation)")]
        heads = VGroup()
        for p, (a, b) in zip(panels, titles):
            h = VGroup(txt(a, size=26, weight=BOLD), txt(b, size=18, color=DIM)).arrange(DOWN, buff=0.06)
            h.move_to(p.get_top() + DOWN * 0.5)
            heads.add(h)

        # panel 1: +/- alpha along v
        c1 = panels[0].get_center() + P(0, 0.05)
        u = np.array([1.0, 0.0, 0])
        v1 = Arrow(c1 + LEFT * 0.0, c1 + RIGHT * 0.9, buff=0, color=TEAL, stroke_width=5)
        d1 = Dot(c1, radius=0.1, color=FG)
        plus = Arrow(c1, c1 + RIGHT * 1.6, buff=0.1, color=AMBER, stroke_width=4)
        minus = Arrow(c1, c1 + LEFT * 1.6, buff=0.1, color=VIOLET, stroke_width=4)
        f1 = mono("h ← h + α·v", size=24, t2c={"α": AMBER, "v": TEAL}).next_to(c1, DOWN, buff=0.55)
        e1 = txt("α > 0: 높임 · α < 0: 낮춤", size=19, color=FG, t2c={"높임": AMBER, "낮춤": VIOLET}).next_to(f1, DOWN, buff=0.2)
        g1 = VGroup(minus, plus, v1, d1)

        # panel 2: probe hyperplane + normal
        c2 = panels[1].get_center() + P(0, 0.4)
        hi = cloud(c2 + P(0.75, 0.25), 9, 0.2, AMBER, seed=21, radius=0.05)
        lo = cloud(c2 + P(-0.75, -0.25), 9, 0.2, VIOLET, seed=22, radius=0.05)
        sep = DashedLine(c2 + P(-0.35, 0.75), c2 + P(0.35, -0.75), color=FG, dash_length=0.07)
        nrm = Arrow(c2, c2 + P(0.85, 0.4), buff=0, color=TEAL, stroke_width=5)
        f2 = txt("프로브 = 높음/낮음을 가르는\n선형 분류기", size=19).next_to(c2, DOWN, buff=0.9)
        e2 = txt("그 분류 방향으로 활성화를 밂", size=19, color=FG).next_to(f2, DOWN, buff=0.15)
        g2 = VGroup(hi, lo, sep, nrm)

        # panel 3: remove component along v
        c3 = panels[2].get_center() + P(-0.7, -0.35)
        axis3 = Arrow(c3, c3 + RIGHT * 1.7, buff=0, color=TEAL, stroke_width=4)
        hvec = Arrow(c3, c3 + P(1.2, 0.85), buff=0, color=FG, stroke_width=4)
        comp = Line(c3, c3 + P(1.2, 0), color=VIOLET, stroke_width=8)
        after = Arrow(c3, c3 + P(0, 0.85), buff=0, color=FG, stroke_width=4)
        drop = DashedLine(c3 + P(1.2, 0.85), c3 + P(1.2, 0), color=DIM, dash_length=0.05)
        f3 = mono("h ← h − (h·u) u", size=22, t2c={"u": TEAL}).next_to(panels[2].get_center(), DOWN, buff=0.5)
        e3 = txt("u: v 방향 단위벡터\nv 방향 성분을 0으로 (지우기만)", size=19, color=FG, t2c={"0으로": VIOLET}).next_to(f3, DOWN, buff=0.2)

        note = footnote("각 방법의 일반적 정의. 논문 속 구현·계수·프롬프팅 비교 여부는 본문 확인 필요")
        src = source("A1 포스터 초록 · A2 구두 발표 초록")

        def b0():
            self.chapter_card("2", "세 가지 활성화 개입")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), FadeIn(top), FadeIn(panels), FadeIn(heads), FadeIn(note), run_time=1.0)

        def b2():
            self.play(FadeIn(d1), GrowArrow(v1), run_time=0.4)
            self.play(GrowArrow(plus), GrowArrow(minus), FadeIn(f1), FadeIn(e1), run_time=0.8)

        def b3():
            self.play(FadeIn(hi), FadeIn(lo), Create(sep), run_time=0.6)
            self.play(GrowArrow(nrm), FadeIn(f2), FadeIn(e2), run_time=0.6)

        def b4():
            self.play(GrowArrow(axis3), GrowArrow(hvec), run_time=0.5)
            self.play(Create(comp), Create(drop), run_time=0.5)
            self.play(ReplacementTransform(hvec, after), FadeOut(comp), FadeIn(f3), FadeIn(e3), run_time=0.8)
        return [(b0, self.CHAPTER_T, 0.2), (b1, 1.0, 1.4), (b2, 1.2, 1.2), (b3, 1.2, 1.3), (b4, 1.8, 2.0)]


class T05Setup(BeatScene):
    VIDEO, SID = V, "t05_setup"

    def beats(self):
        hdr = header(CH2, "실험 설정 (초록에서 확인되는 것)")
        L = panel(6.1, 4.6, color=TEAL)
        R = panel(6.1, 4.6, color=FAINT)
        VGroup(L, R).arrange(RIGHT, buff=0.35).move_to(P(0, -0.65))
        lt = txt("초록에서 확인됨", size=28, color=TEAL, weight=BOLD)
        lb = bullets(["모델: 작은 instruction-tuned Llama 모델들",
                      "다섯 특성 × 높이기 / 낮추기 두 방향",
                      "층을 바꿔 가며 개입 → 최적 층",
                      "효과 측정: 판정자 점수 (judge score)"], size=22, dot_colors=[TEAL] * 4, buff=0.3, maxw=5.2)
        lg = VGroup(lt, lb).arrange(DOWN, aligned_edge=LEFT, buff=0.35)
        lg.move_to(L).align_to(L, LEFT).shift(RIGHT * 0.3).align_to(L, UP).shift(DOWN * 0.35)
        rt = txt("초록만으로는 알 수 없음", size=28, color=DIM, weight=BOLD)
        rb = bullets(["정확한 모델 크기", "층 번호 · 스티어링 계수", "판정 모델과 채점 기준",
                      "프롬프트 지시와의 비교 여부"], size=22, dot_colors=[DIM] * 4, buff=0.3, maxw=5.2)
        rg = VGroup(rt, rb).arrange(DOWN, aligned_edge=LEFT, buff=0.35)
        rg.move_to(R).align_to(R, LEFT).shift(RIGHT * 0.3).align_to(R, UP).shift(DOWN * 0.35)
        src = source("A1 · A2")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), FadeIn(L), FadeIn(lt), run_time=0.7)
            self.play(LaggedStart(*[FadeIn(b) for b in lb], lag_ratio=0.3), run_time=1.2)

        def b2():
            self.play(FadeIn(R), FadeIn(rt), LaggedStart(*[FadeIn(b) for b in rb], lag_ratio=0.25), run_time=1.2)
        return [(b1, 1.9, 2.0), (b2, 1.2, 1.6)]


class T06Results(BeatScene):
    VIDEO, SID = V, "t06_results"

    def beats(self):
        hdr = header(CH3, "활성화 덧셈만 양방향으로 작동")
        ax_w, ax_h = 4.6, 3.6
        o = P(-5.6, -2.55)
        xa = Arrow(o, o + RIGHT * ax_w, buff=0, color=FAINT, stroke_width=2, max_tip_length_to_length_ratio=0.04)
        ya = Arrow(o, o + UP * ax_h, buff=0, color=FAINT, stroke_width=2, max_tip_length_to_length_ratio=0.05)
        mid = o + P(ax_w / 2, ax_h / 2)
        zero = DashedLine(o + P(ax_w / 2, 0.1), o + P(ax_w / 2, ax_h), color=FAINT, dash_length=0.05)
        xl = txt("스티어링 계수 α (−  ·  0  ·  +)", size=18, color=DIM).next_to(xa, DOWN, buff=0.12)
        yl = txt("판정 점수", size=18, color=DIM).rotate(np.pi / 2).next_to(ya, LEFT, buff=0.1)
        aa_lo = Line(mid + P(-1.9, -1.25), mid, color=VIOLET, stroke_width=6)
        aa_hi = Line(mid, mid + P(1.9, 1.25), color=AMBER, stroke_width=6)
        other = DashedLine(mid + P(-1.9, -0.3), mid + P(1.9, 0.35), color=DIM, dash_length=0.1, stroke_width=4)
        lab_aa = txt("활성화 덧셈", size=20, color=AMBER).next_to(aa_hi.get_end(), LEFT, buff=0.1).shift(UP * 0.25)
        lab_ot = txt("프로브 · 제거: 부분적", size=18, color=DIM).move_to(mid + P(1.15, -1.0))
        sch = txt("개념도 (실제 데이터 아님)", size=16, color=DIM).next_to(ya, UP, buff=0.12).align_to(ya, LEFT)

        c1 = card("활성화 덧셈 (activation addition)",
                  "가장 일관된 양방향 용량-반응 (dose-response)\n최적 층에서 평균 판정 점수 약 25% ↑\n다섯 특성 모두 높이기·낮추기가 안정적인\n유일한 방법",
                  color=AMBER, width=6.9, title_size=26, body_size=22)
        c2 = card("프로브 스티어링 · 방향 제거",
                  "기껏해야 부분적 조절\n일관된 양방향 효과 실패\n(최고 효과 층은 같았는데도)",
                  color=DIM, width=6.9, title_size=26, body_size=22)
        cs = VGroup(c1, c2).arrange(DOWN, buff=0.3, aligned_edge=LEFT).move_to(P(2.9, -0.55))
        fn = txt("'약 25%'는 초록 표현 그대로 (상대 증가인지 점수 차이인지 미상)", size=17, color=DIM)
        fn.next_to(cs, DOWN, buff=0.15).align_to(cs, LEFT)
        src = source("A1 · A2")

        def b0():
            self.chapter_card("3", "결과 (초록 기준)")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), GrowArrow(xa), GrowArrow(ya), FadeIn(xl), FadeIn(yl),
                      Create(zero), FadeIn(sch), run_time=0.8)
            self.play(Create(aa_lo), Create(aa_hi), FadeIn(lab_aa), FadeIn(c1, shift=LEFT * 0.1), run_time=1.0)

        def b2():
            self.play(FadeIn(fn), run_time=0.4)

        def b3():
            self.play(Create(other), FadeIn(lab_ot), FadeIn(c2, shift=LEFT * 0.1), run_time=0.9)
        return [(b0, self.CHAPTER_T, 0.2), (b1, 1.8, 2.2), (b2, 0.4, 0.6), (b3, 0.9, 1.6)]


class T07Traits(BeatScene):
    VIDEO, SID = V, "t07_traits"

    def beats(self):
        hdr = header(CH3, "특성마다 다르다")
        quote = txt("구두 발표 제목: \"Not Neurotic Enough!\"", size=24, color=AMBER)
        quote.next_to(hdr, DOWN, buff=0.35).align_to(hdr, LEFT)
        rows_d = [("A", "우호성", "가장 잘 반응", FG, 1.0), ("E", "외향성", "가장 잘 반응", FG, 1.0),
                  ("N", "신경성", "높이든 낮추든 잘 안 움직임", VIOLET, 0.0),
                  ("O", "개방성", "초록에 따로 언급 없음", DIM, None), ("C", "성실성", "초록에 따로 언급 없음", DIM, None)]
        rows = VGroup()
        for i, (L, nm, st, col, lvl) in enumerate(rows_d):
            y = 0.9 - i * 0.82
            l = txt(L, size=40, color=TEAL, weight=BOLD).move_to(P(-5.6, y))
            n = txt(nm, size=28, weight=BOLD).move_to(P(-4.9, y), aligned_edge=LEFT)
            s = txt(st, size=26, color=col).move_to(P(-2.4, y), aligned_edge=LEFT)
            rows.add(VGroup(l, n, s))
        nb = boxed(txt("왜 신경성이 버티는지는 초록만으로는 알 수 없음", size=22, color=DIM), color=FAINT, buff=0.18)
        nb.move_to(P(0, -3.05))
        src = source("A2 구두 발표 초록")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), run_time=0.5)
            self.play(FadeIn(rows[0]), FadeIn(rows[1]), run_time=0.7)

        def b2():
            self.play(FadeIn(rows[2]), FadeIn(quote), run_time=0.7)

        def b3():
            self.play(FadeIn(rows[3]), FadeIn(rows[4]), FadeIn(nb), run_time=0.7)
        return [(b1, 1.2, 1.2), (b2, 0.7, 1.6), (b3, 0.7, 1.4)]


class T08Meaning(BeatScene):
    VIDEO, SID = V, "t08_meaning"

    def beats(self):
        hdr = header(CH3, "같은 방향 ≠ 같은 효과")
        q1 = card("구두 발표 초록 (A2)", "같은 기하학적 방향을 공유해도,\n활성화 개입들은 서로 바꿔 쓸 수 없다\n(not interchangeable)",
                  color=FG, width=6.0, title_size=22, body_size=24, height=2.4)
        q2 = card("포스터 초록 (A1)", "평균 차이 방향은 초·중반 층에서\n선형으로 조직되어 있고,\n양쪽 방향으로 '쓸 수 있다' (writable)",
                  color=FG, width=6.0, title_size=22, body_size=24, height=2.4)
        VGroup(q1, q2).arrange(RIGHT, buff=0.35).move_to(P(0, 0.45))
        sm = VGroup(txt("정리 (영상 제작자의 해석)", size=20, color=DIM),
                    txt("방향을 읽어 낼 수 있다  ≠  그 방향으로 행동을 바꿀 수 있다", size=30, weight=BOLD,
                        t2c={"읽어 낼 수 있다": TEAL, "행동을 바꿀 수 있다": AMBER})).arrange(DOWN, buff=0.15)
        sm = boxed(sm, color=TEAL, buff=0.28)
        sm.move_to(P(0, -2.25))
        src = source("A1 · A2")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), FadeIn(q1, shift=UP * 0.1), run_time=0.8)

        def b2():
            self.play(FadeIn(q2, shift=UP * 0.1), run_time=0.7)

        def b3():
            self.play(FadeIn(sm), run_time=0.7)
        return [(b1, 0.8, 1.5), (b2, 0.7, 1.4), (b3, 0.7, 1.6)]


class T09Sliders(BeatScene):
    VIDEO, SID = V, "t09_sliders"

    def beats(self):
        hdr = header("비교: 다른 연구", "여러 특성을 동시에 조절하면?")
        ref = txt("Hoppe et al. 2026, \"Controllable and explainable personality sliders for LLMs at inference time\" (arXiv:2603.03326) · 전문 확인",
                  size=18, color=DIM)
        ref.next_to(hdr, DOWN, buff=0.25).align_to(hdr, LEFT)
        bl = bullets([
            "따로 학습한 벡터를 이어 붙이면 → 간섭, 문장 붕괴",
            "벡터끼리 얽혀 있음 (예: 외향성–개방성, 그림 8)",
            "SAS: 다음 프로브를 앞선 스티어링으로\n이동된 활성화 위에서 학습",
        ], size=22, dot_colors=[TEAL] * 3, buff=0.32, maxw=5.0)
        bl.move_to(P(-3.85, -0.35))

        cols = ["", "외향성 ↑", "신경성 ↑", "우호성 ↓", "PPL ↓"]
        rows = [("기준선", ["3.50", "2.88", "4.00", "9.95"], DIM),
                ("SAS", ["4.20", "4.1", "2.62", "14.54"], FG),
                ("단순 결합", ["3.62", "3.10", "3.61", "27.16"], DIM)]
        xs = [0.75, 2.4, 3.75, 5.1, 6.35]
        y0 = 0.75
        tbl = VGroup()
        for j, c in enumerate(cols):
            if c:
                tbl.add(txt(c, size=20, color=AMBER if j < 4 else DIM, weight=BOLD).move_to(P(xs[j], y0)))
        for i, (nm, vals, col) in enumerate(rows):
            yy = y0 - 0.62 * (i + 1)
            tbl.add(txt(nm, size=21, color=col, weight=BOLD).move_to(P(xs[0], yy)))
            for j, v in enumerate(vals):
                tbl.add(txt(v, size=23, color=col, weight=BOLD if nm == "SAS" else NORMAL).move_to(P(xs[j + 1], yy)))
        rule = Line(P(-0.1, y0 - 0.32), P(6.9, y0 - 0.32), color=FAINT, stroke_width=2)
        tt = txt("표 1: 목표 = 외향성·신경성 올리고 우호성 내리기 (판정 점수 1–5)", size=18, color=DIM)
        tt.next_to(VGroup(tbl, rule), UP, buff=0.25).align_to(P(-0.1, 0), LEFT)
        tg = VGroup(tt, tbl, rule)
        cav = txt("주의: 판정 GPT-4 · 생성 최대 20토큰 (§4.1) · 표 캡션에 모델명 없음\n(주 실험 모델: Llama-3-8B-Instruct) · 모델·개입·평가가 달라 직접 비교 불가",
                  size=18, color=DIM, maxw=7.0)
        cav.move_to(P(3.3, -2.15))
        src = source("Hoppe et al. 2026 · 초록, §3.3–3.4, §4.1, §5.4 표 1, 그림 8")

        def b1():
            self.play(FadeIn(hdr), FadeIn(ref), FadeIn(src), run_time=0.7)
            self.play(FadeIn(bl[0]), FadeIn(bl[1]), run_time=0.7)

        def b2():
            self.play(FadeIn(bl[2]), run_time=0.5)

        def b3():
            self.play(FadeIn(tg), run_time=0.9)

        def b4():
            self.play(FadeIn(cav), run_time=0.5)
        return [(b1, 1.4, 1.6), (b2, 0.5, 1.2), (b3, 0.9, 1.8), (b4, 0.5, 1.6)]


class T10Limits(BeatScene):
    VIDEO, SID = V, "t10_limits"

    def beats(self):
        hdr = header("정리", "주의할 점")
        bl = bullets([
            "근거: 공개된 초록 2개뿐 (본문 미확인)",
            "작은 instruction-tuned Llama 모델들에서의 결과",
            "측정: LLM 판정자 점수 (판정자 편향 가능)",
            "'약 25%': 상대 증가인지 점수 차이인지 초록으로는 불명",
        ], size=28, dot_colors=[AMBER, DIM, DIM, DIM], buff=0.45)
        bl.next_to(hdr, DOWN, buff=0.7).align_to(hdr, LEFT)
        src = source("A1 · A2")
        out = [(lambda: self.play(FadeIn(hdr), FadeIn(src), run_time=0.5), 0.5, 0.3)]
        for r in bl:
            out.append(((lambda r=r: self.play(FadeIn(r, shift=RIGHT * 0.1), run_time=0.5)), 0.5, 1.0))
        return out


class T11Research(BeatScene):
    VIDEO, SID = V, "t11_research"

    def beats(self):
        hdr, prem, mid, arrows, outs, q, extra = research_card(
            "이번 연구: 개입 방법마다 효과가 다를 수 있음 → 프롬프트 전환과 스티어링 전환을 함께 비교")

        def b1():
            self.play(FadeIn(hdr), FadeIn(prem[0]), run_time=0.8)
            self.play(FadeIn(prem[1]), run_time=0.6)

        def b2():
            self.play(FadeIn(mid), run_time=0.7)

        def b3():
            self.play(GrowArrow(arrows[0]), FadeIn(outs[0]), run_time=0.7)
            self.play(GrowArrow(arrows[1]), FadeIn(outs[1]), run_time=0.7)

        def b4():
            self.play(FadeIn(extra), run_time=0.5)
            self.play(FadeIn(q, scale=1.1), run_time=0.5)
        return [(b1, 1.4, 1.4), (b2, 0.7, 0.8), (b3, 1.4, 1.6), (b4, 1.0, 1.6)]


class T12End(BeatScene):
    VIDEO, SID = V, "t12_end"
    MIN_T = 9.0

    def beats(self):
        t = txt("출처", size=40, weight=BOLD)
        lines = VGroup(
            txt("Sheta, H. (2026). The Steerable Self: Activation-Based Interventions for Big Five Personality Control in LLMs.\n"
                "MusIML Workshop @ ICML 2026 · icml.cc/virtual/2026/80171 · OpenReview X89cn3iy8b  (초록만 확인)", size=19),
            txt("Sheta, H. (2026). Not Neurotic Enough!: Behavioural Asymmetry Across Activation Interventions for\n"
                "Big Five Personality Control in LLMs. 구두 발표 · icml.cc/virtual/2026/83945  (초록만 확인)", size=19),
            txt("Hoppe, F., Khachaturov, D., Mullins, R., & Meng, M. H. (2026). Controllable and explainable personality\n"
                "sliders for LLMs at inference time. arXiv:2603.03326", size=19),
            txt("Chen, R., et al. (2025). Persona Vectors. arXiv:2507.21509 · Goldberg, L. R. (1990). JPSP 59(6)", size=19),
            txt("도식은 개념도, 표는 Hoppe et al. 표 1의 수치를 옮긴 것 · 연구 질문 카드: Sofroniew et al. (2026), arXiv:2604.07729",
                size=18, color=DIM),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.3)
        g = VGroup(t, lines).arrange(DOWN, aligned_edge=LEFT, buff=0.4).move_to(ORIGIN)

        def b1():
            self.play(FadeIn(g), run_time=0.8)
        return [(b1, 0.8, 1.0)]
