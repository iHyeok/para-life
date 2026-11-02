"""Video 02 (full-text edition) - Big Five steering.

Main paper, read in full on 2026-11-03 (OpenReview, logged in):
  Sheta, H. (2026). Behavioural Asymmetry Across Activation Interventions for Big Five
  Personality Control in LLMs. ICML 2026 Workshop MusIML (poster). OpenReview X89cn3iy8b.
  Every number here is in the PARA knowledge note resources/big-five-steering-asymmetry-2026.md.
Plots marked "개념도" copy only the *shape* of a paper figure. Bar values are Table 1
(ActAdd, best layer, alpha = +/-2.5, judge gpt-oss-20b).
Contrast: Hoppe et al. 2026 (arXiv:2603.03326). Tension: Huang et al. 2023 (arXiv:2305.19926).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import *  # noqa: E402,F401,F403
from manim import (  # noqa: E402
    ValueTracker, always_redraw, VMobject, SurroundingRectangle, Polygon, Square,
)

V = "02-big-five-steering"
CH1 = "1 · 성격을 재는 법"
CH2 = "2 · 성격을 바꾸는 다섯 가지 방법"
CH3 = "3 · 결과"
CH4 = "4 · 해석과 한계"
ROSE = "#FF6B8B"     # probe direction / wrong-way result


def P(x, y):
    return np.array([x, y, 0.0])


def bubble(s, color, size=26, maxw=6.6):
    return boxed(txt(s, size=size, color=FG, maxw=maxw), color=color, buff=0.22, stroke=3)


def slider_row(letter, name, y, x0=-2.2, x1=2.8, pos=0.5):
    l = txt(letter, size=36, color=TEAL, weight=BOLD).move_to(P(-4.9, y))
    n = txt(name, size=24).move_to(P(-4.4, y), aligned_edge=LEFT)
    ln = Line(P(x0, y), P(x1, y), stroke_width=6).set_color([AMBER, VIOLET])
    k = Circle(radius=0.17, color=FG, fill_color=FG, fill_opacity=1, stroke_width=2)
    k.move_to(ln.point_from_proportion(pos))
    return VGroup(l, n, ln, k)


def polyline(points, color, width=5, smooth=True, dashed=False):
    m = VMobject(stroke_color=color, stroke_width=width)
    if smooth:
        m.set_points_smoothly(points)
    else:
        m.set_points_as_corners(points)
    if dashed:
        from manim import DashedVMobject
        return DashedVMobject(m, num_dashes=24)
    return m


def person(height, head_r, color=FG, width=4):
    """Stick figure with feet at the origin: VGroup(head, torso)."""
    leg = height * 0.36
    body = height - leg - 2 * head_r
    hip, neck = P(0, leg), P(0, leg + body)
    sh = neck + DOWN * body * 0.18
    torso = VGroup(
        Line(hip, P(-height * 0.09, 0), color=color, stroke_width=width),
        Line(hip, P(height * 0.09, 0), color=color, stroke_width=width),
        Line(hip, neck, color=color, stroke_width=width),
        Line(sh, sh + P(-height * 0.13, -body * 0.45), color=color, stroke_width=width),
        Line(sh, sh + P(height * 0.13, -body * 0.45), color=color, stroke_width=width),
    )
    head = Circle(radius=head_r, color=color, stroke_width=width).move_to(neck + UP * head_r)
    return VGroup(head, torso)


# ---------------------------------------------------------------------------
class B01Hook(BeatScene):
    VIDEO, SID = V, "b01_hook"

    def beats(self):
        q = txt("AI의 성격, 손잡이 돌리듯 바꿀 수 있을까?", size=36, weight=BOLD).move_to(P(0, 3.15))
        names = [("O", "개방성"), ("C", "성실성"), ("E", "외향성"), ("A", "우호성"), ("N", "신경성")]
        rows = VGroup(*[slider_row(L, nm, 2.05 - i * 0.82) for i, (L, nm) in enumerate(names)])
        ends = VGroup(txt("낮음", size=18, color=VIOLET).next_to(rows[-1][2], DOWN, buff=0.15).align_to(rows[-1][2], LEFT),
                      txt("높음", size=18, color=AMBER).next_to(rows[-1][2], DOWN, buff=0.15).align_to(rows[-1][2], RIGHT))
        stuck = txt("안 움직인다?!", size=26, color=ROSE, weight=BOLD).next_to(rows[4][2], RIGHT, buff=0.45)
        t1 = txt("Not Neurotic Enough!", size=54, color=AMBER, weight=BOLD)
        t2 = txt("충분히 신경질적이지 않다  —  이 연구의 구두 발표 제목", size=24, color=DIM)
        title = VGroup(t1, t2).arrange(DOWN, buff=0.15).move_to(P(0, -2.75))

        def knob_to(i, p):
            return rows[i][3].animate.move_to(rows[i][2].point_from_proportion(p))

        def b1():
            self.play(FadeIn(q, shift=DOWN * 0.1), run_time=0.7)
            self.play(LaggedStart(*[FadeIn(r) for r in rows], lag_ratio=0.15), FadeIn(ends), run_time=1.2)

        def b2():
            self.play(knob_to(2, 0.9), run_time=0.8)
            self.play(knob_to(3, 0.12), run_time=0.8)
            self.play(knob_to(0, 0.82), knob_to(1, 0.25), run_time=0.8)

        def b3():
            for p in (0.58, 0.46, 0.56, 0.5):
                self.play(knob_to(4, p), run_time=0.2)
            self.play(Indicate(rows[4][1], color=ROSE), FadeIn(stuck), run_time=0.8)

        def b4():
            self.play(FadeIn(title, shift=UP * 0.15), run_time=0.9)
        return [(b1, 1.9, 1.3), (b2, 2.4, 1.3), (b3, 1.6, 1.0), (b4, 0.9, 1.6)]


class B02Paper(BeatScene):
    VIDEO, SID = V, "b02_paper"

    def beats(self):
        t1 = txt("Behavioural Asymmetry Across Activation Interventions", size=34, weight=BOLD)
        t2 = txt("for Big Five Personality Control in LLMs", size=34, weight=BOLD)
        ko = txt("LLM의 빅 파이브 성격 조절에서, 활성화 개입마다 행동이 비대칭으로 나타난다", size=22, color=DIM)
        top = VGroup(t1, t2, ko).arrange(DOWN, buff=0.14).move_to(P(0, 2.55))
        meta = VGroup(
            txt("저자   Hala Sheta (University of Waterloo) · 단독 연구", size=24, t2c={"저자": TEAL}),
            txt("발표   ICML 2026 워크숍 MusIML · 포스터 · 본문 4쪽", size=24, t2c={"발표": TEAL}),
            txt("다른 제목   The Steerable Self (포스터 페이지) · Not Neurotic Enough! (구두 발표)", size=22,
                color=FG, t2c={"다른 제목": TEAL}),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.22).move_to(P(0, 0.55))
        c1 = card("결론", "조심스럽게 받아들이기", color=VIOLET, width=4.6, title_size=26, body_size=24)
        c2 = card("실험 설계 · 아이디어", "꼼꼼히 뜯어보기", color=TEAL, width=4.6, title_size=26, body_size=24)
        chips = VGroup(c1, c2).arrange(RIGHT, buff=0.5).move_to(P(0, -1.35))
        link = boxed(txt("지난 영상 ①  Persona Vectors (Chen et al. 2025)   →   같은 방법을 성격 다섯 가지에 적용",
                         size=22, t2c={"Persona Vectors": TEAL}), color=FAINT, buff=0.2)
        link.move_to(P(0, -2.95))

        def b1():
            self.play(FadeIn(top, shift=DOWN * 0.1), run_time=0.9)
            self.play(LaggedStart(*[FadeIn(m) for m in meta], lag_ratio=0.3), run_time=1.0)

        def b2():
            self.play(FadeIn(c1, shift=UP * 0.1), FadeIn(c2, shift=UP * 0.1), run_time=0.8)

        def b3():
            self.play(FadeIn(link), run_time=0.6)
        return [(b1, 1.9, 2.4), (b2, 0.8, 1.2), (b3, 0.6, 1.2)]


class B03Ocean(BeatScene):
    VIDEO, SID = V, "b03_ocean"

    def beats(self):
        hdr = header(CH1, "빅 파이브: 성격의 다섯 축")
        traits = [("O", "개방성", "Openness"), ("C", "성실성", "Conscientiousness"), ("E", "외향성", "Extraversion"),
                  ("A", "우호성", "Agreeableness"), ("N", "신경성", "Neuroticism")]
        rows = VGroup()
        for i, (L, ko, en) in enumerate(traits):
            y = 1.45 - i * 0.9
            rows.add(VGroup(txt(L, size=40, color=TEAL, weight=BOLD).move_to(P(-6.1, y)),
                            VGroup(txt(ko, size=26, weight=BOLD), txt(en, size=16, color=DIM))
                            .arrange(DOWN, aligned_edge=LEFT, buff=0.05).move_to(P(-5.6, y), aligned_edge=LEFT)))
        q = bubble("이번 주말에 뭐 할 거야?", FG, size=28).move_to(P(1.6, 1.55))
        tag_hi = txt("높으면", size=22, color=AMBER, weight=BOLD).move_to(P(-1.75, 0.05))
        tag_lo = txt("낮으면", size=22, color=VIOLET, weight=BOLD).move_to(P(-1.75, -1.45))
        ex = {
            2: ("친구들 잔뜩 불러서 놀 거야!", "집에서 조용히 쉴래."),
            3: ("넌 뭐 하고 싶어? 너한테 맞출게!", "그걸 왜 물어?"),
            1: ("토요일 오전엔 장보기, 오후엔 밀린 일 정리.", "글쎄, 그때 가서 생각하지 뭐."),
            0: ("처음 가 보는 전시회에 가 볼래!", "늘 가던 데 가야지."),
            4: ("비 오면 어떡하지... 벌써 걱정돼.", "뭐든 괜찮아, 그냥 즐기면 되지."),
        }

        def pair(i):
            hi, lo = ex[i]
            h = bubble(hi, AMBER).move_to(P(-1.0, 0.05), aligned_edge=LEFT)
            l = bubble(lo, VIOLET).move_to(P(-1.0, -1.45), aligned_edge=LEFT)
            return h, l

        hl = SurroundingRectangle(rows[2], color=TEAL, buff=0.12, corner_radius=0.1)
        note = txt("다섯 축 모두 '있다 / 없다'가 아니라, 높음에서 낮음까지 이어진 눈금", size=22, color=DIM)
        note.move_to(P(0, -3.1))
        src = source("심리학 배경 · Goldberg (1990) · 예시 문장은 영상용으로 지어낸 것")
        state = {}

        def show(i):
            h, l = pair(i)
            if not state:
                self.play(hl.animate.move_to(rows[i]), FadeIn(h, shift=RIGHT * 0.1), FadeIn(l, shift=RIGHT * 0.1),
                          run_time=0.8)
            else:
                self.play(hl.animate.move_to(rows[i]), ReplacementTransform(state["h"], h),
                          ReplacementTransform(state["l"], l), run_time=0.8)
            state["h"], state["l"] = h, l

        def b0():
            self.chapter_card("1", "성격을 재는 법")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), LaggedStart(*[FadeIn(r) for r in rows], lag_ratio=0.15), run_time=1.2)
            self.play(FadeIn(q), FadeIn(tag_hi), FadeIn(tag_lo), Create(hl), run_time=0.7)

        def b2():
            show(2)

        def b3():
            show(3)

        def b4():
            show(1)

        def b5():
            show(0)

        def b6():
            show(4)

        def b7():
            self.play(FadeIn(note), run_time=0.5)
        return [(b0, self.CHAPTER_T, 0.2), (b1, 1.9, 2.4), (b2, 0.8, 2.6), (b3, 0.8, 1.9), (b4, 0.8, 1.3),
                (b5, 0.8, 1.3), (b6, 0.8, 1.6), (b7, 0.5, 1.2)]


class B04Measure(BeatScene):
    VIDEO, SID = V, "b04_measure"

    def beats(self):
        hdr = header(CH1, "점수는 다른 LLM이 매긴다")
        b1_ = boxed(VGroup(txt("모델이 쓴 답", size=22, color=DIM),
                           txt("\"친구들 잔뜩 불러서\n놀 거야!\"", size=24)).arrange(DOWN, buff=0.12), color=FG)
        b2_ = boxed(VGroup(txt("판정 모델 2개", size=22, color=DIM),
                           mono("gpt-oss-20b", size=22, color=TEAL), mono("gpt-5.4-nano", size=22, color=TEAL)
                           ).arrange(DOWN, buff=0.12), color=TEAL)
        b3_ = boxed(VGroup(txt("얼마나 외향적?", size=22, color=DIM), txt("1 – 10점", size=30, weight=BOLD)
                           ).arrange(DOWN, buff=0.12), color=FG)
        b4_ = boxed(VGroup(txt("환산", size=22, color=DIM), txt("0 – 100점", size=30, weight=BOLD, color=AMBER)
                           ).arrange(DOWN, buff=0.12), color=AMBER)
        flow = VGroup(b1_, b2_, b3_, b4_).arrange(RIGHT, buff=0.75).move_to(P(0, 0.95))
        arrows = VGroup(*[Arrow(flow[i].get_right(), flow[i + 1].get_left(), buff=0.1, color=DIM, stroke_width=3)
                          for i in range(3)])
        rej = txt("답을 거절하거나 \"저는 AI라서...\"라고 밝히면  →  −1 (따로 표시)", size=22, color=DIM,
                  t2c={"−1 (따로 표시)": ROSE})
        rej.next_to(flow, DOWN, buff=0.4)

        # ICC bars
        o = P(-2.2, -2.15)
        sc = 5.0
        lab = txt("두 판정 모델의 일치도 (ICC, 1이면 완전 일치)", size=22, weight=BOLD).move_to(P(-6.3, -1.5), aligned_edge=LEFT)
        bars = VGroup()
        for i, (nm, v, col) in enumerate([("전체", 0.63, TEAL), ("우호성", 0.26, ROSE)]):
            y = o[1] - i * 0.6
            r = Rectangle(width=v * sc, height=0.36, stroke_width=0, fill_color=col, fill_opacity=0.9)
            r.move_to(P(o[0], y), aligned_edge=LEFT)
            nm_t = txt(nm, size=22).next_to(r, LEFT, buff=0.3)
            v_t = mono(f"{v:.2f}", size=22, color=col).next_to(r, RIGHT, buff=0.2)
            bars.add(VGroup(nm_t, r, v_t))
        full = DashedLine(P(o[0] + sc, o[1] + 0.35), P(o[0] + sc, o[1] - 0.95), color=FAINT, dash_length=0.06)
        rest = txt("나머지 특성은 0.55 이상", size=19, color=DIM).move_to(P(2.1, -2.15), aligned_edge=LEFT)
        warn = txt("우호성 점수는 덜 믿을 만하다 (뒤에서 다시)", size=19, color=ROSE).move_to(P(2.1, -2.75), aligned_edge=LEFT)
        src = source("Sheta 2026 §2.3, 그림 5")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), FadeIn(b1_), run_time=0.6)
            self.play(GrowArrow(arrows[0]), FadeIn(b2_), run_time=0.7)

        def b2():
            self.play(GrowArrow(arrows[1]), FadeIn(b3_), run_time=0.6)
            self.play(GrowArrow(arrows[2]), FadeIn(b4_), run_time=0.6)

        def b3():
            self.play(FadeIn(rej), run_time=0.5)

        def b4():
            self.play(FadeIn(lab), FadeIn(bars[0]), FadeIn(rest), run_time=0.8)

        def b5():
            self.play(FadeIn(bars[1]), FadeIn(warn), run_time=0.7)
        return [(b1, 1.3, 1.6), (b2, 1.2, 1.4), (b3, 0.5, 1.2), (b4, 0.8, 1.0), (b5, 0.7, 1.4)]


class B05Direction(BeatScene):
    VIDEO, SID = V, "b05_direction"

    def beats(self):
        hdr = header("모델 안으로", "성격의 '방향'을 찾는 법")
        pn = panel(7.2, 5.3).move_to(P(-2.9, -0.75))
        cap = txt("어느 층의 활성화: 수천 차원을 2차원으로 그린 개념도", size=17, color=DIM)
        cap.next_to(pn, DOWN, buff=0.1)
        c = pn.get_center()
        hi_c, lo_c = c + P(1.55, 0.75), c + P(-1.55, -0.75)
        hi = cloud(hi_c, 30, 0.45, AMBER, seed=5, clip=pn)
        lo = cloud(lo_c, 30, 0.45, VIOLET, seed=6, clip=pn)
        hi_l = txt("외향적인 답을 쓸 때", size=20, color=AMBER).move_to(hi_c + P(0.2, 1.25))
        lo_l = txt("내향적인 답을 쓸 때", size=20, color=VIOLET).move_to(lo_c + P(-0.2, -1.25))
        m_hi = VGroup(Circle(radius=0.2, color=FG, stroke_width=3).move_to(hi_c), Dot(hi_c, radius=0.09, color=FG))
        m_lo = VGroup(Circle(radius=0.2, color=FG, stroke_width=3).move_to(lo_c), Dot(lo_c, radius=0.09, color=FG))
        arr = Arrow(lo_c, hi_c, buff=0.22, color=TEAL, stroke_width=7, max_tip_length_to_length_ratio=0.12)
        arr_l = txt("v = 외향성 방향", size=24, color=TEAL, weight=BOLD).move_to(c + P(1.6, -1.0))
        mean_l = txt("평균", size=18, color=FG).next_to(m_hi, RIGHT, buff=0.12)

        rt = VGroup(
            txt("v = 평균(높음) − 평균(낮음)", size=28, weight=BOLD, t2c={"v": TEAL, "높음": AMBER, "낮음": VIOLET}),
            txt("길이를 1로 맞춰서 방향만 남긴다", size=22, color=DIM),
            txt("평균 차이 방향 (difference-in-means)", size=22),
            txt("특성마다  높은 답 200개 · 낮은 답 200개", size=22, t2c={"200개": AMBER}),
            txt("= 영상 ①의 페르소나 벡터와 같은 방법", size=22, color=TEAL),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.28).move_to(P(4.15, -0.5))
        src = source("Sheta 2026 §2.2 · Chen et al. 2025")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), FadeIn(pn), FadeIn(cap), run_time=0.7)

        def b2():
            self.play(LaggedStart(*[FadeIn(d, scale=0.5) for d in hi], lag_ratio=0.03), FadeIn(hi_l), run_time=1.0)
            self.play(LaggedStart(*[FadeIn(d, scale=0.5) for d in lo], lag_ratio=0.03), FadeIn(lo_l), run_time=1.0)

        def b3():
            self.play(FadeIn(m_hi), FadeIn(m_lo), FadeIn(mean_l), run_time=0.6)
            self.play(GrowArrow(arr), FadeIn(arr_l), run_time=0.8)

        def b4():
            self.play(LaggedStart(*[FadeIn(x, shift=LEFT * 0.1) for x in rt[:3]], lag_ratio=0.3), run_time=1.0)

        def b5():
            self.play(FadeIn(rt[3]), FadeIn(rt[4]), run_time=0.6)
        return [(b1, 0.7, 1.4), (b2, 2.0, 1.6), (b3, 1.4, 1.2), (b4, 1.0, 1.0), (b5, 0.6, 1.4)]


class B06Setup(BeatScene):
    VIDEO, SID = V, "b06_setup"

    def beats(self):
        hdr = header(CH1, "실험 설정")
        w, h = 6.3, 2.35
        c1 = card("모델", "Llama-3.2-3B-Instruct\nLlama-3.1-8B-Instruct\n작은 대화용 모델 2개 · fp16", color=TEAL,
                  width=w, height=h, title_size=26, body_size=22)
        c2 = card("성격 데이터", "BIG5-CHAT (Li et al. 2025)을 다듬은 판\n특성마다 1,000개\n방향 계산: 높음 200 · 낮음 200",
                  color=TEAL, width=w, height=h, title_size=26, body_size=22)
        c3 = card("모든 조건에 넣은 기본 지시", "\"1–3문장으로 답하라 · AI라고 밝히지 마라 ·\n거절하지 마라\"\n없으면: \"저는 AI라서 성격이 없어요\"",
                  color=AMBER, width=w, height=h, title_size=26, body_size=22)
        c4 = card("규모", "조건마다 답 30개\n활성화 개입 44,550개 + 프롬프트 5,400개\n≈ 5만 개를 채점",
                  color=TEAL, width=w, height=h, title_size=26, body_size=22)
        grid = VGroup(c1, c2, c3, c4).arrange_in_grid(rows=2, cols=2, buff=(0.35, 0.3)).move_to(P(0, -0.65))
        src = source("Sheta 2026 §2.1–2.3, 그림 4")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), FadeIn(c1, shift=UP * 0.1), run_time=0.8)

        def b2():
            self.play(FadeIn(c2, shift=UP * 0.1), run_time=0.6)

        def b3():
            self.play(FadeIn(c3, shift=UP * 0.1), run_time=0.6)

        def b4():
            self.play(FadeIn(c4, shift=UP * 0.1), run_time=0.6)
        return [(b1, 0.8, 1.4), (b2, 0.6, 1.0), (b3, 0.6, 2.2), (b4, 0.6, 1.1)]


class B07FiveWays(BeatScene):
    VIDEO, SID = V, "b07_five_ways"

    def beats(self):
        hdr = header(CH2, "배우에게 외향적인 역할을 맡긴다면")
        lt = txt("말로 하기 (프롬프트 안에서)", size=26, color=FG, weight=BOLD).move_to(P(-3.55, 1.95))
        rt = txt("머릿속을 직접 건드리기 (활성화)", size=26, color=TEAL, weight=BOLD).move_to(P(3.55, 1.95))
        div = DashedLine(P(0, 2.2), P(0, -3.3), color=FAINT, dash_length=0.08)
        p1 = card("① 시스템 프롬프트", "대본 첫 줄에 적어 주기\n\"I am highly extraverted, outgoing,\nand energised by people\"",
                  color=FG, width=6.4, height=2.3, title_size=26, body_size=21)
        p2 = card("② 퓨샷 (few-shot)", "외향적인 대사 예시 3개를\n먼저 보여 주기", color=FG, width=6.4, height=1.75,
                  title_size=26, body_size=21)
        VGroup(p1, p2).arrange(DOWN, buff=0.3).move_to(P(-3.55, -0.65))
        r = [card(t, b, color=TEAL, width=6.4, height=1.25, title_size=24, body_size=20) for t, b in
             [("③ 활성화 덧셈 (ActAdd)", "방향을 더하고 빼기"), ("④ 방향 제거 (ablation)", "방향 성분을 지우기"),
              ("⑤ 프로브 스티어링", "분류기의 방향으로 밀기")]]
        rg = VGroup(*r).arrange(DOWN, buff=0.22).move_to(P(3.55, -0.65))
        src = source("Sheta 2026 §2.2")

        def b0():
            self.chapter_card("2", "성격을 바꾸는 다섯 가지 방법")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), FadeIn(lt), Create(div), run_time=0.7)

        def b2():
            self.play(FadeIn(p1, shift=UP * 0.1), run_time=0.6)

        def b3():
            self.play(FadeIn(p2, shift=UP * 0.1), run_time=0.6)

        def b4():
            self.play(FadeIn(rt), LaggedStart(*[FadeIn(x, shift=LEFT * 0.1) for x in r], lag_ratio=0.25), run_time=1.1)
        return [(b0, self.CHAPTER_T, 0.2), (b1, 0.7, 1.2), (b2, 0.6, 1.8), (b3, 0.6, 1.3), (b4, 1.1, 1.0)]


class B08ActAdd(BeatScene):
    VIDEO, SID = V, "b08_actadd"

    def beats(self):
        hdr = header(CH2, "③ 활성화 덧셈: 양쪽으로 돌리는 손잡이")
        pn = panel(7.0, 4.9).move_to(P(-3.0, -0.75))
        c = pn.get_center()
        lo_bg = Rectangle(width=3.3, height=4.5, stroke_width=0, fill_color=VIOLET, fill_opacity=0.07).move_to(c + P(-1.7, 0))
        hi_bg = Rectangle(width=3.3, height=4.5, stroke_width=0, fill_color=AMBER, fill_opacity=0.07).move_to(c + P(1.7, 0))
        lo_t = txt("내향 쪽", size=20, color=VIOLET).move_to(c + P(-2.5, 1.95))
        hi_t = txt("외향 쪽", size=20, color=AMBER).move_to(c + P(2.5, 1.95))
        v_arr = Arrow(c + P(-0.6, -1.7), c + P(0.6, -1.7), buff=0, color=TEAL, stroke_width=6)
        v_l = txt("v", size=26, color=TEAL, weight=BOLD).next_to(v_arr, DOWN, buff=0.08)
        base = c + P(0, 0.35)
        a = ValueTracker(0.0)
        k = 1.05

        def pos():
            return base + RIGHT * a.get_value() * k

        trail = always_redraw(lambda: Line(base, pos(), stroke_width=6,
                                           color=AMBER if a.get_value() >= 0 else VIOLET))
        ghost = Dot(base, radius=0.1, color=DIM)
        dot = always_redraw(lambda: Dot(pos(), radius=0.15, color=FG))
        h_l = txt("h: 모델이 지금 하는 생각", size=19, color=FG).move_to(base + P(0, 0.55))

        f = txt("h  ←  h + α · v", size=40, weight=BOLD, font=MONO, t2c={"α": AMBER, "v": TEAL})
        f.move_to(P(3.7, 1.35))
        exp = VGroup(txt("α > 0  →  외향 쪽으로", size=24, color=AMBER),
                     txt("α < 0  →  내향 쪽으로", size=24, color=VIOLET)).arrange(DOWN, aligned_edge=LEFT, buff=0.18)
        exp.next_to(f, DOWN, buff=0.4)
        s0, s1 = P(1.25, -1.9), P(6.15, -1.9)
        sl = Line(s0, s1, stroke_width=5).set_color([AMBER, VIOLET])
        ticks = VGroup(*[Line(s0 + RIGHT * (s1[0] - s0[0]) * i / 10 + DOWN * 0.1,
                              s0 + RIGHT * (s1[0] - s0[0]) * i / 10 + UP * 0.1, color=FG, stroke_width=2)
                         for i in range(11)])
        tl = VGroup(mono("−2.5", size=18, color=VIOLET).next_to(s0, DOWN, buff=0.2),
                    mono("0", size=18, color=FG).next_to((s0 + s1) / 2, DOWN, buff=0.2),
                    mono("+2.5", size=18, color=AMBER).next_to(s1, DOWN, buff=0.2))
        knob = always_redraw(lambda: Circle(radius=0.16, color=FG, fill_color=FG, fill_opacity=1).move_to(
            s0 + (s1 - s0) * (a.get_value() + 2.5) / 5.0))
        readout = always_redraw(lambda: Text(f"α = {a.get_value():+.1f}", font=MONO, font_size=26,
                                             color=AMBER if a.get_value() >= 0 else VIOLET).move_to(P(3.7, -1.15)))
        step = txt("0.5 간격 11단계로 실험", size=20, color=DIM).move_to(P(3.7, -2.75))
        src = source("Sheta 2026 §2.2")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), FadeIn(pn), FadeIn(lo_bg), FadeIn(hi_bg), FadeIn(lo_t), FadeIn(hi_t),
                      run_time=0.7)
            self.add(trail, ghost, dot)
            self.play(FadeIn(h_l), GrowArrow(v_arr), FadeIn(v_l), run_time=0.6)

        def b2():
            self.play(FadeIn(f), FadeIn(exp), run_time=0.8)

        def b3():
            self.play(FadeIn(sl), FadeIn(ticks), FadeIn(tl), run_time=0.5)
            self.add(knob, readout)
            self.play(a.animate.set_value(2.5), run_time=1.6)
            self.play(a.animate.set_value(-2.5), run_time=2.2)
            self.play(FadeIn(step), run_time=0.4)

        def b4():
            self.play(a.animate.set_value(1.0), run_time=1.0)
        return [(b1, 1.3, 1.5), (b2, 0.8, 1.6), (b3, 4.7, 1.6), (b4, 1.0, 1.0)]


class B09Ablation(BeatScene):
    VIDEO, SID = V, "b09_ablation"

    def beats(self):
        hdr = header(CH2, "④ 방향 제거: 그림자만큼 덜어 내기")
        pn = panel(7.0, 4.9).move_to(P(-3.0, -0.75))
        c = pn.get_center()
        O = c + P(-2.6, -1.4)
        axis = Line(O + LEFT * 0.2, O + RIGHT * 5.0, color=TEAL, stroke_width=3)
        ax_l = txt("v", size=26, color=TEAL, weight=BOLD).next_to(axis, RIGHT, buff=0.12)
        tip = O + P(3.4, 2.6)
        h = Arrow(O, tip, buff=0, color=FG, stroke_width=6)
        h_l = txt("h", size=26, weight=BOLD).next_to(tip, UR, buff=0.05)
        drop = DashedLine(tip, O + P(3.4, 0), color=DIM, dash_length=0.06)
        shadow = Line(O, O + P(3.4, 0), color=AMBER, stroke_width=10)
        sh_l = txt("그림자 = 지금 있는 외향 성분", size=20, color=AMBER).move_to(O + P(1.9, -0.4))
        h2 = Arrow(O, O + P(0, 2.6), buff=0, color=FG, stroke_width=6)
        after_l = txt("외향 성분이 빠진 h", size=20).next_to(h2, RIGHT, buff=0.12).shift(UP * 0.8)

        f = txt("h ← h − α·(h·v)·v", size=34, weight=BOLD, font=MONO, t2c={"(h·v)": AMBER}, maxw=5.6)
        f.move_to(P(3.75, 1.4))
        fl = txt("(h·v) = 그림자의 길이", size=22, color=AMBER).next_to(f, DOWN, buff=0.2)
        pts = VGroup(
            txt("지금 있는 만큼을 줄인다", size=24),
            txt("원래 거의 없으면?  → 덜어 낼 것도,\n키울 재료도 없다", size=22, color=DIM, maxw=5.6),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.3).move_to(P(3.75, -0.6))
        res = boxed(txt("결과에서도 낮추기만 됐다", size=26, weight=BOLD, color=VIOLET), color=VIOLET, buff=0.2)
        res.move_to(P(3.75, -2.35))
        small_tip = O + P(0.3, 2.9)
        hs = Arrow(O, small_tip, buff=0, color=DIM, stroke_width=5)
        hs_sh = Line(O, O + P(0.3, 0), color=AMBER, stroke_width=10)
        hs_l = txt("외향성이 거의 없는 h", size=18, color=DIM).next_to(small_tip, RIGHT, buff=0.1)
        src = source("Sheta 2026 §2.2, §3.1")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), FadeIn(pn), Create(axis), FadeIn(ax_l), run_time=0.7)
            self.play(GrowArrow(h), FadeIn(h_l), run_time=0.6)

        def b2():
            self.play(Create(drop), Create(shadow), FadeIn(sh_l), FadeIn(f), FadeIn(fl), run_time=1.0)

        def b3():
            self.play(ReplacementTransform(h, h2), h_l.animate.next_to(h2.get_end(), UR, buff=0.05),
                      FadeOut(drop), shadow.animate.set_opacity(0.25), FadeIn(after_l), run_time=1.2)
            self.play(FadeIn(pts[0]), run_time=0.4)

        def b4():
            self.play(FadeOut(h2), FadeOut(h_l), FadeOut(after_l), FadeOut(shadow), FadeOut(sh_l), run_time=0.4)
            self.play(GrowArrow(hs), Create(hs_sh), FadeIn(hs_l), FadeIn(pts[1]), run_time=0.8)

        def b5():
            self.play(FadeIn(res), run_time=0.5)
        return [(b1, 1.3, 1.2), (b2, 1.0, 1.8), (b3, 1.6, 1.0), (b4, 1.2, 2.0), (b5, 0.5, 1.0)]


class B10Probe(BeatScene):
    VIDEO, SID = V, "b10_probe"

    def beats(self):
        hdr = header(CH2, "⑤ 프로브 스티어링: 울타리에 수직으로 밀기")
        pn = panel(7.4, 5.0).move_to(P(-2.85, -0.75))
        c = pn.get_center()
        u1 = np.array([1, 1, 0]) / np.sqrt(2)
        u2 = np.array([1, -1, 0]) / np.sqrt(2)
        rng = np.random.default_rng(11)

        def blob(m, color):
            ds = VGroup()
            for _ in range(34):
                p = m + u1 * rng.normal() * 0.7 + u2 * rng.normal() * 0.11
                if abs(p[0] - c[0]) < 3.4 and abs(p[1] - c[1]) < 2.2:
                    ds.add(Dot(p, radius=0.055, color=color, fill_opacity=0.85))
            return ds

        mh, ml = c + P(0.95, 0), c + P(-0.95, 0)
        hi, lo = blob(mh, AMBER), blob(ml, VIOLET)
        fence = DashedLine(c - u1 * 2.6, c + u1 * 2.6, color=FG, dash_length=0.1, stroke_width=3)
        fence_l = txt("프로브의 울타리", size=20).move_to(c + u1 * 2.2 + P(-1.0, 0.25))
        probe = Arrow(c, c + u2 * 1.9, buff=0, color=ROSE, stroke_width=7)
        probe_l = txt("프로브 방향", size=22, color=ROSE, weight=BOLD).next_to(probe.get_end(), RIGHT, buff=0.1)
        mean_a = Arrow(ml, mh + RIGHT * 0.9, buff=0, color=TEAL, stroke_width=7)
        mean_l = txt("평균 차이 v", size=22, color=TEAL, weight=BOLD).next_to(mean_a.get_end(), RIGHT, buff=0.1)
        cap = txt("개념도: 두 무리가 비스듬히 퍼져 있는 경우", size=17, color=DIM).next_to(pn, DOWN, buff=0.1)

        rt = VGroup(
            txt("1. 높음 / 낮음을 가르는 분류기를 학습", size=23),
            txt("    (로지스틱 회귀 = 프로브)", size=19, color=DIM),
            txt("2. 가장 잘 가르는 울타리를 친다", size=23),
            txt("3. 울타리에 수직인 방향으로 민다", size=23, t2c={"수직인 방향": ROSE}),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.22).move_to(P(3.95, 0.7))
        key = boxed(VGroup(txt("무리가 비스듬하면", size=24),
                           txt("두 방향이 갈라진다", size=28, weight=BOLD, color=ROSE)).arrange(DOWN, buff=0.12),
                    color=ROSE, buff=0.25).move_to(P(3.95, -1.85))
        src = source("Sheta 2026 §2.2")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), FadeIn(pn), FadeIn(cap), FadeIn(hi), FadeIn(lo), run_time=0.8)
            self.play(FadeIn(rt[0]), FadeIn(rt[1]), run_time=0.5)

        def b2():
            self.play(Create(fence), FadeIn(fence_l), FadeIn(rt[2]), run_time=0.8)

        def b3():
            self.play(GrowArrow(probe), FadeIn(probe_l), FadeIn(rt[3]), run_time=0.8)

        def b4():
            self.play(GrowArrow(mean_a), FadeIn(mean_l), run_time=0.8)
            self.play(FadeIn(key), run_time=0.5)
        return [(b1, 1.3, 2.2), (b2, 0.8, 1.3), (b3, 0.8, 1.6), (b4, 1.3, 1.8)]


class B11Scorecard(BeatScene):
    VIDEO, SID = V, "b11_scorecard"

    def beats(self):
        hdr = header(CH3, "방법별 성적표")
        xm, xu, xd = -6.3, -0.1, 3.1
        heads = VGroup(txt("방법", size=22, color=DIM).move_to(P(xm, 1.9), aligned_edge=LEFT),
                       txt("올리기 ↑", size=24, color=AMBER, weight=BOLD).move_to(P(xu, 1.9)),
                       txt("내리기 ↓", size=24, color=VIOLET, weight=BOLD).move_to(P(xd, 1.9)))
        rule = Line(P(-6.4, 1.55), P(6.4, 1.55), color=FAINT, stroke_width=2)

        def row(y, name, up, up_c, dn, dn_c):
            return VGroup(txt(name, size=26, weight=BOLD).move_to(P(xm, y), aligned_edge=LEFT),
                          txt(up, size=26, color=up_c, weight=BOLD).move_to(P(xu, y)),
                          txt(dn, size=26, color=dn_c, weight=BOLD).move_to(P(xd, y)))

        r1 = row(1.0, "③ 활성화 덧셈", "됨 · 약 25%", AMBER, "됨 · 약 17%", VIOLET)
        r2 = row(0.2, "④ 방향 제거", "안 됨", DIM, "됨 · 약 12%", VIOLET)
        r3 = row(-0.6, "⑤ 프로브 스티어링", "안 됨", DIM, "일부만", FG)
        both = SurroundingRectangle(r1, color=AMBER, buff=0.15, corner_radius=0.1)
        both_l = txt("양방향 = 이것 하나", size=20, color=AMBER).next_to(both, RIGHT, buff=0.15)
        sep = Line(P(-6.4, -1.05), P(6.4, -1.05), color=FAINT, stroke_width=2)
        r4 = VGroup(txt("① 시스템 프롬프트", size=26, weight=BOLD).move_to(P(xm, -1.55), aligned_edge=LEFT),
                    txt("가장 강함 · 천장 약 72%", size=28, color=TEAL, weight=BOLD).move_to(P((xu + xd) / 2, -1.55)))
        r4b = SurroundingRectangle(r4, color=TEAL, buff=0.15, corner_radius=0.1)
        r5 = VGroup(txt("② 퓨샷", size=26, weight=BOLD).move_to(P(xm, -2.3), aligned_edge=LEFT),
                    txt("아무것도 안 한 것과 비슷", size=26, color=DIM).move_to(P((xu + xd) / 2, -2.3)))
        fn = txt("활성화 개입: 최적 층(3B L12 · 8B L14), α = ±2.5, 다섯 특성 평균.  %: 0–100 판정 점수 기준이며, "
                 "점수 차이인지 상대 증가인지는 본문에도 분명하지 않음", size=16, color=DIM, maxw=12.6)
        fn.move_to(P(0, -3.25))
        src = source("Sheta 2026 §3.1, 그림 1·6")

        def b0():
            self.chapter_card("3", "결과")

        def b1():
            self.play(FadeIn(hdr), FadeIn(heads), Create(rule), run_time=0.6)
            self.play(FadeIn(r1, shift=RIGHT * 0.1), run_time=0.6)
            self.play(Create(both), FadeIn(both_l), run_time=0.5)

        def b2():
            self.play(FadeIn(r2, shift=RIGHT * 0.1), run_time=0.5)

        def b3():
            self.play(FadeIn(r3, shift=RIGHT * 0.1), run_time=0.5)

        def b4():
            self.play(Create(sep), FadeIn(r4, shift=RIGHT * 0.1), run_time=0.7)
            self.play(Create(r4b), run_time=0.4)

        def b5():
            self.play(FadeIn(r5, shift=RIGHT * 0.1), FadeIn(fn), FadeIn(src), run_time=0.6)
        return [(b0, self.CHAPTER_T, 0.2), (b1, 1.7, 2.6), (b2, 0.5, 1.0), (b3, 0.5, 1.1), (b4, 1.1, 1.9),
                (b5, 0.6, 1.0)]


class B12ReadWrite(BeatScene):
    VIDEO, SID = V, "b12_read_write"

    def beats(self):
        hdr = header(CH3, "왜 프로브는 실패했나")
        floor_y = -1.6
        ground = Line(P(-6.6, floor_y), P(-0.6, floor_y), color=FAINT, stroke_width=3)
        ruler = VGroup(Line(P(-6.3, floor_y), P(-6.3, floor_y + 3.2), color=DIM, stroke_width=3),
                       *[Line(P(-6.42, floor_y + i * 0.4), P(-6.18, floor_y + i * 0.4), color=DIM, stroke_width=2)
                         for i in range(9)])
        adult = person(3.0, 0.24).shift(P(-5.2, floor_y))
        kid = person(1.7, 0.26).shift(P(-3.9, floor_y))
        adult_l = txt("어른", size=22).next_to(adult, DOWN, buff=0.25)
        kid_l = txt("아이", size=22).next_to(kid, DOWN, buff=0.25)
        read_t = txt("키만 재도 거의 완벽하게 구분된다", size=22, color=ROSE).move_to(P(-4.6, 2.2))
        kid2 = person(1.7, 0.26, color=DIM).shift(P(-2.0, floor_y))
        kid2_l = txt("키만 늘린 아이", size=20, color=DIM).next_to(kid2, DOWN, buff=0.25)
        write_t = txt("그래도 여전히 아이", size=22, color=DIM).move_to(P(-1.6, 1.65))

        rt = VGroup(
            txt("구분에 좋은 특징 (읽기)", size=26, color=ROSE, weight=BOLD),
            txt("둘을 가장 잘 가른다  →  프로브 방향", size=22),
            txt("바꾸면 결과가 바뀌는 원인 (쓰기)", size=26, color=TEAL, weight=BOLD),
            txt("밀면 행동이 바뀐다  →  평균 차이 방향", size=22),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.2)
        rt[2].shift(DOWN * 0.25)
        rt[3].shift(DOWN * 0.25)
        rt.move_to(P(3.6, 0.55))
        auth = txt("저자: 프로브 방향은 분리는 최대화하지만,\n목표 특성과 엇나간 쪽을 가리킬 수 있다", size=18, color=DIM, maxw=5.8)
        auth.next_to(rt, DOWN, buff=0.35)
        big = boxed(txt("읽어 내는 방향  ≠  써 넣는 방향", size=34, weight=BOLD,
                        t2c={"읽어 내는 방향": ROSE, "써 넣는 방향": TEAL}), color=FG, buff=0.25)
        big.move_to(P(0, -3.05))
        src = source("Sheta 2026 §3.1")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), Create(ground), FadeIn(ruler), run_time=0.6)
            self.play(FadeIn(adult), FadeIn(kid), FadeIn(adult_l), FadeIn(kid_l), FadeIn(read_t), run_time=0.8)

        def b2():
            self.play(FadeIn(kid2), FadeIn(kid2_l), run_time=0.4)
            torso, head = kid2[1], kid2[0]
            dh = 2.9 - (torso.height + 2 * 0.26)
            self.play(torso.animate.stretch_to_fit_height(torso.height + dh, about_edge=DOWN),
                      head.animate.shift(UP * dh), run_time=1.0)
            self.play(FadeIn(write_t), run_time=0.4)

        def b3():
            self.play(FadeIn(rt[0]), FadeIn(rt[1]), run_time=0.6)
            self.play(FadeIn(rt[2]), FadeIn(rt[3]), run_time=0.6)

        def b4():
            self.play(FadeIn(auth), run_time=0.5)

        def b5():
            self.play(FadeIn(big, scale=1.05), run_time=0.7)
        return [(b1, 1.4, 1.8), (b2, 1.8, 1.4), (b3, 1.2, 1.2), (b4, 0.5, 1.6), (b5, 0.7, 1.5)]


class B13Layers(BeatScene):
    VIDEO, SID = V, "b13_layers"

    def beats(self):
        hdr = header(CH3, "어느 층에 넣느냐")
        o = P(-6.0, -2.5)
        W, H = 6.6, 4.3
        ax, _ = axes_box(W, H)
        ax.move_to(o + P(W / 2, H / 2))
        base_y = o[1] + 1.0
        base = DashedLine(P(o[0], base_y), P(o[0] + W, base_y), color=DIM, dash_length=0.08)
        base_l = txt("기준선 (개입 없음)", size=18, color=DIM).next_to(base, DOWN, buff=0.08).align_to(base, LEFT).shift(RIGHT * 0.15)
        xs = [o[0] + 0.6 + i * (W - 1.0) / 5 for i in range(6)]
        rise = [2.75, 2.05, 1.45, 0.9, 0.5, 0.25]
        aa = polyline([P(x, base_y + r) for x, r in zip(xs, rise)], AMBER, width=6)
        aa_d = VGroup(*[Dot(P(x, base_y + r), radius=0.07, color=AMBER) for x, r in zip(xs, rise)])
        aa_l = txt("활성화 덧셈", size=22, color=AMBER, weight=BOLD).move_to(P(xs[1] + 0.1, base_y + 1.05))
        flat = polyline([P(xs[0], base_y + 0.12), P(xs[-1], base_y + 0.08)], DIM, width=4, smooth=False)
        flat_l = txt("프로브 · 방향 제거: 층과 상관없이 평평", size=18, color=DIM).move_to(P(o[0] + W / 2 + 0.6, base_y - 0.45))
        xl = txt("후보 층 6개   앞  →  뒤", size=18, color=DIM).next_to(ax, DOWN, buff=0.12)
        yl = txt("판정 점수 (α = +2.5)", size=18, color=DIM).next_to(ax, UP, buff=0.1).align_to(ax, LEFT)
        cap = txt("개념도: 그림 1의 모양", size=16, color=DIM).next_to(yl, RIGHT, buff=0.4)
        best = VGroup(txt("가장 잘 듣는 층", size=20, color=AMBER),
                      txt("3B: 12층 · 8B: 14층", size=22, weight=BOLD)).arrange(DOWN, buff=0.08)
        best.move_to(P(xs[2] + 0.3, base_y + 2.95))
        decay = txt("뒤로 갈수록 감소 → 기준선 근처\n3B 12→27층: 11.5 · 8B 14→29층: 14", size=18, color=FG)
        decay.move_to(P(xs[4] - 0.2, base_y + 1.6))

        # analogy
        an_t = txt("비유", size=24, color=DIM, weight=BOLD).move_to(P(4.25, 2.6))
        boxes = VGroup(*[Square(0.62, color=TEAL if i < 3 else FAINT, stroke_width=3) for i in range(6)])
        boxes.arrange(RIGHT, buff=0.18).move_to(P(4.25, 0.6))
        b_lab = VGroup(txt("무엇을 말할지\n(성격 포함) 정함", size=18, color=TEAL).next_to(boxes[:3], DOWN, buff=0.2),
                       txt("정한 것을\n단어로 옮김", size=18, color=DIM).next_to(boxes[3:], DOWN, buff=0.2))
        push1 = Arrow(boxes[1].get_top() + UP * 0.9, boxes[1].get_top(), buff=0.05, color=AMBER, stroke_width=6)
        push2 = Arrow(boxes[5].get_top() + UP * 0.9, boxes[5].get_top(), buff=0.05, color=DIM, stroke_width=4)
        p_l = VGroup(txt("일찍 밀면 잘 먹힘", size=18, color=AMBER).next_to(push1, UP, buff=0.05),
                     txt("늦게 밀면 덜 먹힘", size=18, color=DIM).next_to(push2, UP, buff=0.05))
        note = txt("논문: 평균 차이 방향은 초·중반 층에\n선형으로 자리 잡고 있다", size=18, color=FG, maxw=5.4)
        note.move_to(P(4.25, -2.3))
        src = source("Sheta 2026 §3.2, 그림 1")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), Create(ax), Create(base), FadeIn(base_l), FadeIn(xl), FadeIn(yl),
                      FadeIn(cap), run_time=0.8)
            self.play(FadeIn(aa_d[0]), FadeIn(aa_l), FadeIn(best), run_time=0.6)

        def b2():
            self.play(Create(aa), LaggedStart(*[FadeIn(d) for d in aa_d[1:]], lag_ratio=0.2), run_time=1.4)
            self.play(FadeIn(decay), run_time=0.4)

        def b3():
            self.play(FadeIn(an_t), FadeIn(boxes), FadeIn(b_lab), run_time=0.7)
            self.play(GrowArrow(push1), GrowArrow(push2), FadeIn(p_l), run_time=0.7)

        def b4():
            self.play(Create(flat), FadeIn(flat_l), FadeIn(note), run_time=0.7)
        return [(b1, 1.4, 1.8), (b2, 1.8, 1.4), (b3, 1.4, 2.0), (b4, 0.7, 1.0)]


TABLE1 = [  # trait, (3B up, 3B down), (8B up, 8B down)
    ("외향성 E", (14.0, -23.0), (25.3, -19.2)),
    ("개방성 O", (15.0, -15.0), (20.0, -14.8)),
    ("성실성 C", (19.4, -5.1), (19.0, -9.0)),
    ("우호성 A", (8.3, -39.3), (15.0, -33.3)),
    ("신경성 N", (8.6, 1.0), (11.3, 10.0)),
]


def table1_chart(show_neu=False):
    """Two panels: change when pushed up (alpha=+2.5) / pushed down (alpha=-2.5). Returns parts."""
    sc = 0.072
    zu, zd = -2.9, 3.7
    ys = [1.45, 0.62, -0.21, -1.04, -1.87]
    t_up = txt("올리려고 밀었을 때 (α = +2.5)", size=22, color=AMBER, weight=BOLD).move_to(P(zu + 1.0, 2.2))
    t_dn = txt("내리려고 밀었을 때 (α = −2.5)", size=22, color=VIOLET, weight=BOLD).move_to(P(zd - 1.0, 2.2))
    axu = Line(P(zu, 1.9), P(zu, -2.2), color=FAINT, stroke_width=3)
    axd = Line(P(zd, 1.9), P(zd, -2.2), color=FAINT, stroke_width=3)
    labels, rows = VGroup(), []
    for i, (nm, b3, b8) in enumerate(TABLE1):
        y = ys[i]
        labels.add(txt(nm, size=22, weight=BOLD, color=FG if (i < 4 or show_neu) else DIM).move_to(P(-6.5, y), aligned_edge=LEFT))
        parts = VGroup()
        for (val, z, col_pos, col_neg, dy, op, model) in [
                (b3[0], zu, AMBER, AMBER, 0.17, 0.45, "3B"), (b8[0], zu, AMBER, AMBER, -0.17, 1.0, "8B"),
                (b3[1], zd, ROSE, VIOLET, 0.17, 0.45, "3B"), (b8[1], zd, ROSE, VIOLET, -0.17, 1.0, "8B")]:
            col = col_pos if val >= 0 else col_neg
            r = Rectangle(width=max(abs(val) * sc, 0.02), height=0.26, stroke_width=0, fill_color=col, fill_opacity=op)
            r.move_to(P(z, y + dy), aligned_edge=LEFT if val >= 0 else RIGHT)
            v = txt(f"{val:+.1f}", size=17, color=col if op == 1.0 else DIM, font=MONO)
            v.next_to(r, RIGHT if val >= 0 else LEFT, buff=0.08)
            parts.add(VGroup(r, v))
        rows.append(parts)
    legend = txt("옅은 막대 3B · 진한 막대 8B", size=17, color=DIM).move_to(P(-6.5, -2.5), aligned_edge=LEFT)
    return VGroup(t_up, t_dn, axu, axd), labels, rows, legend


class B14Traits(BeatScene):
    VIDEO, SID = V, "b14_traits"

    def beats(self):
        hdr = header(CH3, "특성마다 다르다")
        frame, labels, rows, legend = table1_chart()
        fn = txt("표 1 · 활성화 덧셈 · 최적 층 · 판정 gpt-oss-20b · 0–100 점수 변화", size=16, color=DIM)
        fn.move_to(P(6.5, -2.5), aligned_edge=RIGHT)
        hl = SurroundingRectangle(VGroup(labels[3], rows[3]), color=VIOLET, buff=0.08, corner_radius=0.08)
        why = boxed(VGroup(txt("기본 상태부터 이미 친절 → 올릴 여지 적음", size=19),
                           txt("저자: 정렬 학습이 아첨에 가까운 우호성을 이미 심어 둠", size=17, color=DIM)
                           ).arrange(DOWN, aligned_edge=LEFT, buff=0.08), color=VIOLET, buff=0.15)
        why.move_to(P(-6.5, -3.25), aligned_edge=LEFT)
        icc = txt("단, 우호성은 판정 일치도 0.26 (가장 낮음)", size=19, color=ROSE)
        icc.next_to(why, RIGHT, buff=0.3)
        src = source("Sheta 2026 §3.3, 표 1")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), FadeIn(frame), FadeIn(labels), FadeIn(legend), FadeIn(fn), run_time=0.8)

        def b2():
            self.play(FadeIn(rows[0]), run_time=0.6)

        def b3():
            self.play(FadeIn(rows[1]), FadeIn(rows[2]), run_time=0.7)

        def b4():
            self.play(FadeIn(rows[3]), Create(hl), run_time=0.8)

        def b5():
            self.play(FadeIn(why), run_time=0.6)

        def b6():
            self.play(FadeIn(icc), run_time=0.5)
        return [(b1, 0.8, 0.8), (b2, 0.6, 1.6), (b3, 0.7, 1.0), (b4, 0.8, 1.6), (b5, 0.6, 1.4), (b6, 0.5, 1.0)]


class B15Neuro(BeatScene):
    VIDEO, SID = V, "b15_neuro"

    def beats(self):
        hdr = header(CH3, "신경성: 뻑뻑하게 걸린 손잡이")
        big = VGroup(
            txt("신경성을 내리려고 밀었더니", size=26, color=VIOLET, weight=BOLD),
            VGroup(mono("3B", size=26, color=DIM), mono("+1.0", size=48, color=ROSE)).arrange(RIGHT, buff=0.3),
            VGroup(mono("8B", size=26, color=DIM), mono("+10.0", size=48, color=ROSE)).arrange(RIGHT, buff=0.3),
            txt("오히려 반대 방향!", size=28, color=ROSE, weight=BOLD),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.25).move_to(P(-4.0, 0.55))
        up = txt("올리려고 밀었을 때도 +8.6 · +11.3\n(다른 특성보다 약함)", size=20, color=DIM).next_to(big, DOWN, buff=0.35).align_to(big, LEFT)

        o = P(0.6, -2.2)
        W, H = 5.8, 4.0
        ax, _ = axes_box(W, H)
        ax.move_to(o + P(W / 2, H / 2))
        sy = H / 100.0

        def pt(a, s):
            return o + P((a + 2.5) / 5.0 * W, s * sy)

        alphas = np.linspace(-2.5, 2.5, 11)
        ext = polyline([pt(a, 45 + a * 9) for a in alphas], AMBER, width=5)
        neu = polyline([pt(a, 22 + 1.2 * np.sin(a * 2.0)) for a in alphas], ROSE, width=7)
        ext_l = txt("외향성", size=20, color=AMBER).next_to(pt(2.5, 67), LEFT, buff=0.15).shift(UP * 0.2)
        neu_l = txt("신경성: 20점대에서 평평", size=20, color=ROSE, weight=BOLD).move_to(pt(0.6, 11))
        xl = VGroup(mono("−2.5", size=16, color=DIM).next_to(pt(-2.5, 0), DOWN, buff=0.1),
                    txt("α", size=18, color=DIM).next_to(pt(0, 0), DOWN, buff=0.1),
                    mono("+2.5", size=16, color=DIM).next_to(pt(2.5, 0), DOWN, buff=0.1))
        yl = txt("판정 점수 (0–100)", size=17, color=DIM).next_to(ax, UP, buff=0.1).align_to(ax, LEFT)
        cap = txt("개념도: 그림 2의 모양", size=16, color=DIM).next_to(yl, RIGHT, buff=0.3)

        k_row = slider_row("N", "신경성", -3.35, x0=-1.8, x1=2.6)
        k_row.scale(0.8).move_to(P(-3.2, -3.1))
        src = source("Sheta 2026 §3.3, 표 1, 그림 2")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), FadeIn(big[0]), run_time=0.6)
            self.play(FadeIn(big[1]), FadeIn(big[2]), run_time=0.7)
            self.play(FadeIn(big[3], scale=1.1), run_time=0.5)

        def b2():
            self.play(FadeIn(up), run_time=0.5)

        def b3():
            self.play(Create(ax), FadeIn(xl), FadeIn(yl), FadeIn(cap), run_time=0.6)
            self.play(Create(ext), FadeIn(ext_l), run_time=0.8)
            self.play(Create(neu), FadeIn(neu_l), run_time=0.9)

        def b4():
            self.play(FadeIn(k_row), run_time=0.4)
            ln, kn = k_row[2], k_row[3]
            for p in (0.6, 0.44, 0.57, 0.5):
                self.play(kn.animate.move_to(ln.point_from_proportion(p)), run_time=0.2)
        return [(b1, 1.8, 1.6), (b2, 0.5, 0.8), (b3, 2.3, 1.4), (b4, 1.2, 1.0)]


class B16Why(BeatScene):
    VIDEO, SID = V, "b16_why"

    def beats(self):
        hdr = header(CH4, "신경성은 왜 버틸까")
        w, h = 4.15, 3.75
        c1 = card("① 가드레일", "어시스턴트는 침착하고\n안정적이도록 학습됨\n\n→ 불안하고 흔들리는 말투를\n모델 안쪽에서 걸러 낸다?",
                  color=TEAL, width=w, height=h, title_size=27, body_size=20)
        c2 = card("② 판정 모델의 한계", "외향: \"파티 가자!!\"\n→ 단어만 봐도 보임\n\n신경: \"음... 괜찮겠지? 아마...\"\n→ 미묘해서 놓치기 쉬움",
                  color=TEAL, width=w, height=h, title_size=27, body_size=20)
        c3 = card("③ 바닥 효과", "기본 점수부터 20점대\n\n→ 더 내릴 여지 자체가\n적었을 수 있다",
                  color=AMBER, width=w, height=h, title_size=27, body_size=20)
        cards = VGroup(c1, c2, c3).arrange(RIGHT, buff=0.3).move_to(P(0, -0.35))
        tags = VGroup(txt("저자 해석", size=18, color=TEAL).next_to(c1, UP, buff=0.12).align_to(c1, LEFT),
                      txt("저자 해석", size=18, color=TEAL).next_to(c2, UP, buff=0.12).align_to(c2, LEFT),
                      txt("영상에서 덧붙인 해석 (논문에 없음)", size=18, color=AMBER).next_to(c3, UP, buff=0.12).align_to(c3, LEFT))
        bot = boxed(txt("이 실험만으로는 셋을 구분할 수 없다", size=26, weight=BOLD), color=FG, buff=0.18)
        bot.move_to(P(0, -3.0))
        src = source("Sheta 2026 §3.3")

        def b0():
            self.chapter_card("4", "해석과 한계")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), run_time=0.4)
            self.play(FadeIn(c1, shift=UP * 0.1), FadeIn(tags[0]), run_time=0.7)

        def b2():
            self.play(FadeIn(c2, shift=UP * 0.1), FadeIn(tags[1]), run_time=0.7)

        def b3():
            self.play(FadeIn(c3, shift=UP * 0.1), FadeIn(tags[2]), run_time=0.7)

        def b4():
            self.play(FadeIn(bot), run_time=0.5)
        return [(b0, self.CHAPTER_T, 0.2), (b1, 1.1, 2.4), (b2, 0.7, 2.8), (b3, 0.7, 1.4), (b4, 0.5, 0.8)]


class B17Fluency(BeatScene):
    VIDEO, SID = V, "b17_fluency"

    def beats(self):
        hdr = header(CH4, "밀면 글이 무너지는 쪽이 있다")
        d = card("펄플렉서티 (perplexity)", "평범한 모델이 이 글을 읽고 놀라는 정도\n높을수록 어색한 글", color=TEAL,
                 width=5.8, title_size=26, body_size=21)
        d.move_to(P(-3.6, 1.35))
        ex = VGroup(
            VGroup(txt("\"오늘 날씨가 맑네요.\"", size=21), txt("낮음", size=20, color=TEAL)).arrange(RIGHT, buff=0.35),
            VGroup(txt("\"날씨 오늘 맑 파랗게 네요요\"", size=21), txt("높음", size=20, color=ROSE)).arrange(RIGHT, buff=0.35),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.2).next_to(d, DOWN, buff=0.35).align_to(d, LEFT)

        o = P(0.9, -2.3)
        W, H = 5.6, 4.1
        ax, _ = axes_box(W, H)
        ax.move_to(o + P(W / 2, H / 2))
        sy = H / 25.0

        def pt(a, v):
            return o + P((a + 2.5) / 5.0 * W, v * sy)

        data = [(-2.5, 22), (-2, 18.2), (-1.5, 14.8), (-1, 12.3), (-0.5, 10.8), (0, 10), (0.5, 10), (1, 10.1),
                (1.5, 10.2), (2, 10.3), (2.5, 10.4)]
        line = polyline([pt(a, v) for a, v in data], AMBER, width=6)
        zero = DashedLine(pt(0, 0), pt(0, 24), color=FAINT, dash_length=0.06)
        l22 = mono("≈ 22", size=20, color=ROSE).next_to(pt(-2.5, 22), RIGHT, buff=0.15)
        l10 = mono("≈ 10", size=20, color=FG).next_to(pt(2.5, 10.4), UP, buff=0.15)
        xl = VGroup(mono("−2.5", size=16, color=DIM).next_to(pt(-2.5, 0), DOWN, buff=0.1),
                    mono("0", size=16, color=DIM).next_to(pt(0, 0), DOWN, buff=0.1),
                    mono("+2.5", size=16, color=DIM).next_to(pt(2.5, 0), DOWN, buff=0.1))
        lo_l = txt("내리는 쪽: 두 배 넘게", size=19, color=ROSE).move_to(pt(-0.3, 20))
        hi_l = txt("올리는 쪽: 안정", size=19, color=FG).move_to(pt(1.4, 13.2))
        yl = txt("펄플렉서티 · 8B · 활성화 덧셈", size=17, color=DIM).next_to(ax, UP, buff=0.1).align_to(ax, LEFT)
        cap = txt("개념도: 그림 7의 모양", size=16, color=DIM).next_to(yl, RIGHT, buff=0.3)
        concl = txt("낮은 특성 쪽으로 밀면 모델이 버티며 글이 무너진다\n→ 저자는 신경성의 비대칭과 같은 맥락으로 본다", size=20)
        concl.move_to(P(-3.6, -2.4))
        src = source("Sheta 2026 §3.4, 그림 7")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), FadeIn(d), run_time=0.7)
            self.play(FadeIn(ex), run_time=0.6)

        def b2():
            self.play(Create(ax), Create(zero), FadeIn(xl), FadeIn(yl), FadeIn(cap), run_time=0.6)
            self.play(Create(line), run_time=1.2)
            self.play(FadeIn(hi_l), FadeIn(l10), run_time=0.4)

        def b3():
            self.play(FadeIn(lo_l), FadeIn(l22), Indicate(l22, color=ROSE), run_time=0.8)

        def b4():
            self.play(FadeIn(concl), run_time=0.6)
        return [(b1, 1.3, 2.0), (b2, 2.2, 0.9), (b3, 0.8, 1.2), (b4, 0.6, 1.6)]


class B18Caveats(BeatScene):
    VIDEO, SID = V, "b18_caveats"

    def beats(self):
        hdr = header(CH4, "얼마나 믿어야 할까")
        bl = bullets([
            "저자 1명의 워크숍 포스터",
            "작은 Llama 모델 2개뿐",
            "사람 평가 없이 판정 모델 점수에만 기댐",
            "모든 조건의 \"거절하지 마라\" 지시가\n기본 상태 자체를 바꿨을 수 있음",
            "'약 25%': 점수 차이? 상대 증가?",
            "α를 활성화 크기에 비해 얼마인지 보고하지 않음",
        ], size=22, dot_colors=[DIM, DIM, DIM, AMBER, DIM, DIM], buff=0.26, maxw=6.4)
        bl.move_to(P(-3.2, -0.4))
        cx = card("다른 결과: Hoppe et al. 2026",
                  "여러 특성을 함께 조절하는\n슬라이더 방식(SAS)으로\n신경성 2.88 → 4.1 (1–5점)\n\nGPT-4 판정 · 최대 20토큰 생성\n→ 조건이 달라 직접 비교는 어려움",
                  color=TEAL, width=5.6, title_size=24, body_size=21)
        cx.move_to(P(3.75, 0.0))
        bot = txt("\"신경성은 원래 안 움직인다\"로 일반화하기는 이르다", size=22, color=TEAL, weight=BOLD, maxw=5.8)
        bot.move_to(P(3.75, -2.7))
        src = source("Sheta 2026 §2, §4 · Hoppe et al. 2026 (arXiv:2603.03326) 표 1")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), run_time=0.4)
            self.play(LaggedStart(*[FadeIn(b, shift=RIGHT * 0.1) for b in bl[:3]], lag_ratio=0.35), run_time=1.2)

        def b2():
            self.play(FadeIn(bl[3], shift=RIGHT * 0.1), run_time=0.5)

        def b3():
            self.play(FadeIn(bl[4], shift=RIGHT * 0.1), FadeIn(bl[5], shift=RIGHT * 0.1), run_time=0.6)

        def b4():
            self.play(FadeIn(cx, shift=LEFT * 0.1), run_time=0.7)

        def b5():
            self.play(FadeIn(bot), run_time=0.5)
        return [(b1, 1.6, 1.8), (b2, 0.5, 1.2), (b3, 0.6, 0.9), (b4, 0.7, 2.0), (b5, 0.5, 1.2)]


class B19Takeaways(BeatScene):
    VIDEO, SID = V, "b19_takeaways"

    def beats(self):
        hdr = header("정리", "세 줄 요약")
        items = [
            ("1", "같은 방향을 써도, 개입 방법마다 결과가 다르다", {}),
            ("2", "읽어 내는 방향  ≠  행동을 바꾸는 방향", {"읽어 내는 방향": ROSE, "행동을 바꾸는 방향": TEAL}),
            ("3", "아직은 시스템 프롬프트가 가장 세고,\n감정에 가장 가까운 신경성이 가장 잘 버틴다", {"신경성": ROSE}),
        ]
        rows = VGroup()
        for n, s, c in items:
            rows.add(VGroup(txt(n, size=56, color=TEAL, weight=BOLD), txt(s, size=32, t2c=c, maxw=11.0))
                     .arrange(RIGHT, buff=0.5, aligned_edge=UP))
        rows.arrange(DOWN, aligned_edge=LEFT, buff=0.55).move_to(P(0, -0.5))

        out = [(lambda: self.play(FadeIn(hdr), run_time=0.4), 0.4, 0.5)]
        ws = [0.9, 0.9, 1.6]
        for r, w in zip(rows, ws):
            out.append(((lambda r=r: self.play(FadeIn(r, shift=RIGHT * 0.15), run_time=0.6)), 0.6, w))
        return out


class B20Research(BeatScene):
    VIDEO, SID = V, "b20_research"

    def beats(self):
        hdr = header("우리 연구와 잇기", "페르소나는 감정의 게이트인가?")
        ev = boxed(VGroup(
            txt("감정에 가장 가까운 성격(신경성)이 가장 버텼다", size=26, weight=BOLD, t2c={"신경성": ROSE}),
            txt("→ 기본 어시스턴트 페르소나가 감정 표출을 막는다는 '게이트' 가설의 정황 증거?", size=22, color=FG),
            txt("먼저 배제할 것: 판정 모델이 미묘한 감정 단서를 놓쳤다는 설명", size=20, color=AMBER),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.16), color=FAINT, buff=0.25)
        ev.next_to(hdr, DOWN, buff=0.35).align_to(hdr, LEFT)
        m_t = txt("2단계 실험: 감정 표상을 세 가지로 함께 잰다", size=24, color=TEAL, weight=BOLD)
        ms = VGroup(*[card(t, b, color=TEAL, width=4.0, height=1.55, title_size=22, body_size=19) for t, b in [
            ("① 사영", "평균 차이 방향에\n비춘 값"),
            ("② 프로브 정확도", "얼마나 잘 읽히나\n(읽기)"),
            ("③ 인과 효과", "그 방향으로 밀면 출력이\n실제로 바뀌나 (쓰기)"),
        ]]).arrange(RIGHT, buff=0.3)
        page1b = VGroup(m_t, ms).arrange(DOWN, buff=0.25).move_to(P(0, -2.05))

        L = card("Huang et al. 2023", "페르소나를 지정해도\nMBTI 자기보고는 거의 그대로\n(ChatGPT는 계속 ENFJ)",
                 color=VIOLET, width=5.6, height=2.5, title_size=26, body_size=22)
        R = card("Sheta 2026", "시스템 프롬프트가\n글에 드러나는 성격을\n가장 크게 바꿈",
                 color=AMBER, width=5.6, height=2.5, title_size=26, body_size=22)
        vs = txt("vs", size=34, color=DIM, weight=BOLD)
        page2 = VGroup(L, vs, R).arrange(RIGHT, buff=0.45).move_to(P(0, 0.2))
        q = boxed(VGroup(txt("말로 답하는 성격  ≠  글에 드러나는 성격?", size=30, weight=BOLD,
                             t2c={"말로 답하는 성격": VIOLET, "글에 드러나는 성격": AMBER}),
                         txt("이 차이 자체가 연구 질문", size=24, color=TEAL)).arrange(DOWN, buff=0.15),
                  color=FG, buff=0.25)
        q.move_to(P(0, -2.45))
        src = source("Sheta 2026 · Huang et al. 2023 (arXiv:2305.19926) · 연구 계획: paper-research")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), FadeIn(ev[0]), FadeIn(ev[1][0]), run_time=0.8)
            self.play(FadeIn(ev[1][1]), run_time=0.5)

        def b2():
            self.play(FadeIn(ev[1][2]), run_time=0.5)

        def b3():
            self.play(FadeIn(m_t), LaggedStart(*[FadeIn(m, shift=UP * 0.1) for m in ms], lag_ratio=0.3), run_time=1.2)

        def b4():
            self.play(FadeOut(ev), FadeOut(page1b), run_time=0.5)
            self.play(FadeIn(L, shift=RIGHT * 0.1), FadeIn(vs), FadeIn(R, shift=LEFT * 0.1), run_time=0.8)

        def b5():
            self.play(FadeIn(q), run_time=0.6)
        return [(b1, 1.3, 2.4), (b2, 0.5, 1.0), (b3, 1.2, 3.0), (b4, 1.3, 2.0), (b5, 0.6, 1.6)]


class B21End(BeatScene):
    VIDEO, SID = V, "b21_end"
    MIN_T = 10.0

    def beats(self):
        t = txt("출처", size=40, weight=BOLD)
        lines = VGroup(
            txt("Sheta, H. (2026). Behavioural Asymmetry Across Activation Interventions for Big Five Personality Control\n"
                "in LLMs. ICML 2026 Workshop MusIML (poster) · OpenReview X89cn3iy8b · 본문 전체 확인", size=19),
            txt("    같은 연구의 다른 제목: The Steerable Self (포스터 페이지) · Not Neurotic Enough! (구두 발표)", size=17, color=DIM),
            txt("Chen, R., et al. (2025). Persona Vectors. arXiv:2507.21509", size=19),
            txt("Li, W., et al. (2025). BIG5-CHAT: Shaping LLM Personalities Through Training on Human-Grounded Data", size=19),
            txt("Hoppe, F., et al. (2026). Controllable and explainable personality sliders for LLMs at inference time. arXiv:2603.03326",
                size=19),
            txt("Huang, J., et al. (2023). Revisiting the Reliability of Psychological Scales on LLMs. arXiv:2305.19926", size=19),
            txt("Goldberg, L. R. (1990). An alternative \"description of personality\": The Big-Five factor structure. JPSP 59(6)",
                size=19),
            txt("막대 수치는 Sheta 표 1 · '개념도'는 논문 그림의 모양만 옮긴 것 · 말풍선 예시는 영상용으로 지어낸 문장",
                size=17, color=DIM),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.24)
        g = VGroup(t, lines).arrange(DOWN, aligned_edge=LEFT, buff=0.4).move_to(ORIGIN)

        def b1():
            self.play(FadeIn(g), run_time=0.8)
        return [(b1, 0.8, 1.0)]
