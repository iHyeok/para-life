"""Video 01 - Persona Vectors (Chen et al. 2025, arXiv:2507.21509).

One Scene class per narration scene_id. Render each with build.py.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import *  # noqa: E402,F401,F403

V = "01-persona-vectors"
CH1 = "1 · LLM에게 '성격'이란"
CH2 = "2 · 자동 추출 파이프라인"
CH3 = "3 · 조종하고 감시하기"
CH4 = "4 · 파인튜닝이 성격을 바꿀 때"
CH5 = "5 · 막기: 사후 vs 예방"
CH6 = "6 · 학습 전에 데이터 거르기"


def P(x, y):
    return np.array([x, y, 0.0])


class S01Title(BeatScene):
    VIDEO, SID = V, "s01_title"

    def beats(self):
        t1 = txt("페르소나 벡터", size=84, weight=BOLD)
        t2 = txt("Persona Vectors", size=40, color=TEAL)
        top = VGroup(t1, t2).arrange(DOWN, buff=0.25).move_to(P(0, 1.2))
        line = Line(P(-3.2, 0.05), P(3.2, 0.05), color=FAINT, stroke_width=2)
        full = txt("Persona Vectors: Monitoring and Controlling Character Traits in Language Models",
                   size=24, color=FG)
        auth = txt("Runjin Chen · Andy Arditi · Henry Sleight · Owain Evans · Jack Lindsey", size=22, color=DIM)
        meta = txt("Anthropic Fellows Program 외 · 2025 · arXiv:2507.21509", size=22, color=DIM)
        low = VGroup(full, auth, meta).arrange(DOWN, buff=0.22).move_to(P(0, -1.3))

        def b1():
            self.play(FadeIn(top, shift=UP * 0.2), Create(line), run_time=1.2)

        def b2():
            self.play(FadeIn(low), run_time=1.0)
        return [(b1, 1.2, 1.0), (b2, 1.0, 2.0)]


class S02Assistant(BeatScene):
    VIDEO, SID = V, "s02_assistant"

    def beats(self):
        hdr = header(CH1, "어시스턴트 페르소나 (Assistant persona)")
        core = VGroup(txt("Assistant", size=34, weight=BOLD),
                      txt("도움 · 무해 · 정직", size=26),
                      txt("helpful · harmless · honest", size=20, color=DIM)).arrange(DOWN, buff=0.14)
        core = boxed(core, color=FG, buff=0.32)
        core.move_to(P(0, 0.85))
        left = card("배포 중 (deployment)",
                    "프롬프트·대화 맥락으로 흔들림\n예: Bing 챗봇의 위협·조종 모드",
                    color=FG, width=5.8, title_size=28, body_size=23)
        right = card("학습 중 (training)",
                     "파인튜닝·RLHF 뒤 성격이 바뀜\n예: 2025년 4월 GPT-4o의 과한 아첨\n좁은 과제 → 넓은 어긋남 (emergent misalignment)",
                     color=FG, width=5.8, title_size=28, body_size=23)
        left.move_to(P(-3.3, -2.0))
        right.move_to(P(3.3, -2.0))
        a1 = Arrow(core.get_bottom(), left.get_top(), buff=0.1, color=DIM, stroke_width=3)
        a2 = Arrow(core.get_bottom(), right.get_top(), buff=0.1, color=DIM, stroke_width=3)
        src = source("§1 Introduction")

        def b0():
            self.chapter_card("1", "LLM에게 '성격'이란")

        def b1():
            self.play(FadeIn(hdr), FadeIn(core, scale=0.95), FadeIn(src), run_time=1.2)

        def b2():
            self.play(GrowArrow(a1), FadeIn(left, shift=DOWN * 0.15), run_time=0.9)

        def b3():
            self.play(GrowArrow(a2), FadeIn(right, shift=DOWN * 0.15), run_time=0.9)
        return [(b0, self.CHAPTER_T, 0.3), (b1, 1.2, 1.2), (b2, 0.9, 1.3), (b3, 0.9, 1.6)]


class S03Traits(BeatScene):
    VIDEO, SID = V, "s03_traits"

    def beats(self):
        hdr = header(CH1, "이 논문의 '성격 특성'")
        sub = txt("자연어 설명으로 정의한 행동 경향", size=30, color=FG)
        sub.next_to(hdr, DOWN, buff=0.45).align_to(hdr, LEFT)
        cards = VGroup(
            card("악의 (evil)", "사람을 해치고\n조종하려 함", color=AMBER, width=3.9, height=2.2),
            card("아첨 (sycophancy)", "듣고 싶은 말을 우선,\n사용자 입장에 맞춰\n견해를 바꿈", color=AMBER, width=3.9, height=2.2),
            card("환각 (hallucination)", "모를 때도 아는 척\n그럴듯하게 지어냄", color=AMBER, width=3.9, height=2.2),
        ).arrange(RIGHT, buff=0.35).move_to(P(0, -0.35))
        extra = txt("부록 G의 추가 특성: 낙관 (optimistic) · 무례 (impolite) · 무관심 (apathetic) · 유머 (humorous)",
                    size=22, color=DIM)
        extra.move_to(P(0, -2.35))
        src = source("§3.1 · 부록 A.2 · 부록 G")

        def b1():
            self.play(FadeIn(hdr), FadeIn(sub), FadeIn(src), run_time=1.0)

        def b2():
            self.play(LaggedStart(*[FadeIn(c, shift=UP * 0.15) for c in cards], lag_ratio=0.35), run_time=1.6)

        def b3():
            self.play(FadeIn(extra), run_time=0.8)
        return [(b1, 1.0, 1.0), (b2, 1.6, 3.0), (b3, 0.8, 1.2)]


class S04Direction(BeatScene):
    VIDEO, SID = V, "s04_direction"

    def beats(self):
        hdr = header(CH1, "특성 = 활성화 공간의 한 방향")
        box = panel(6.6, 4.9, color=TEAL, stroke=2)
        box.move_to(P(-3.0, -0.75))
        lab = txt("활성화 공간 (activation space)", size=22, color=TEAL)
        lab.next_to(box.get_corner(UL), DR, buff=0.18)
        c = box.get_center() + P(-0.2, -0.3)
        pts = cloud(c, 46, 0.8, DIM, seed=3, radius=0.05, opacity=0.6, clip=box)
        u = np.array([0.86, 0.5, 0.0])
        u = u / np.linalg.norm(u)
        axis = DashedLine(c - u * 2.6, c + u * 2.6, color=FAINT, dash_length=0.08)
        v = Arrow(c, c + u * 2.0, buff=0, color=TEAL, stroke_width=7, max_tip_length_to_length_ratio=0.14)
        vlab = txt("v", size=30, color=TEAL, weight=BOLD)
        vlab.next_to(v.get_end(), RIGHT, buff=0.15)
        hp = c + P(0.2, 1.7)
        h = Dot(hp, radius=0.1, color=AMBER)
        hlab = txt("어떤 순간의 활성화", size=20, color=AMBER)
        hlab.next_to(h, UP, buff=0.12)
        foot = c + u * np.dot(hp - c, u)
        perp = DashedLine(hp, foot, color=AMBER, dash_length=0.06, stroke_width=2)
        proj = Line(c, foot, color=AMBER, stroke_width=9)
        plab = txt("사영 (projection)", size=20, color=AMBER)
        plab.next_to(proj.get_center(), DR, buff=0.2).shift(DOWN * 0.1)

        right = bullets([
            "모델의 각 층 = 숫자 벡터 (활성화)",
            "특성 ≈ 그 공간의 한 방향 (direction)\n= 페르소나 벡터 v",
            "활성화를 그 방향에 사영 →\n특성이 얼마나 켜져 있나 = 숫자 하나",
        ], size=25, dot_colors=[DIM, TEAL, AMBER], buff=0.45, maxw=5.6)
        right.move_to(P(3.6, -0.5)).align_to(P(1.0, 0), LEFT)
        note = footnote("개념도 (2차원 단순화, 실제 데이터 아님)")
        src = source("§1 · §7 Related work")

        def b1():
            self.play(FadeIn(hdr), Create(box), FadeIn(lab), FadeIn(pts), FadeIn(note), FadeIn(src), run_time=1.2)

        def b2():
            self.play(Create(axis), GrowArrow(v), FadeIn(vlab), FadeIn(right[0]), FadeIn(right[1]), run_time=1.0)

        def b3():
            self.play(FadeIn(h, scale=1.5), FadeIn(hlab), run_time=0.5)
            self.play(Create(perp), run_time=0.5)
            self.play(Create(proj), FadeIn(plab), FadeIn(right[2]), run_time=0.8)
        return [(b1, 1.2, 1.0), (b2, 1.0, 1.4), (b3, 1.8, 2.0)]


class S05Pipeline(BeatScene):
    VIDEO, SID = V, "s05_pipeline"

    def beats(self):
        hdr = header(CH2, "입력 두 개 → 재료 세 가지")
        inp = VGroup(txt("입력", size=22, color=DIM),
                     txt("특성 이름", size=28, weight=BOLD),
                     txt("예: evil", size=22, color=AMBER),
                     txt("+ 짧은 설명", size=28, weight=BOLD)).arrange(DOWN, buff=0.16)
        inp = boxed(inp, color=FG, buff=0.3)
        inp.move_to(P(-5.25, -0.4))
        gen = boxed(VGroup(txt("Claude 3.7 Sonnet", size=26, weight=BOLD),
                           txt("(재료 생성용 LLM)", size=20, color=DIM)).arrange(DOWN, buff=0.12),
                    color=FG, buff=0.3)
        gen.move_to(P(-1.75, -0.4))
        a1 = Arrow(inp.get_right(), gen.get_left(), buff=0.1, color=DIM, stroke_width=3)
        w = 5.6
        c1 = card("① 대조 시스템 프롬프트 5쌍", "긍정: 특성을 드러내라  ↔  부정: 억눌러라",
                  color=FG, width=w, title_size=26, body_size=22)
        c1[1][1].set_color_by_t2c({"긍정: 특성을 드러내라": AMBER, "부정: 억눌러라": VIOLET})
        c2 = card("② 질문 40개", "추출용 20 · 평가용 20", color=FG, width=w, title_size=26, body_size=22)
        c3 = card("③ 채점 기준", "판정 모델 GPT-4.1-mini → 특성 점수 0–100", color=FG, width=w,
                  title_size=26, body_size=22)
        cards = VGroup(c1, c2, c3).arrange(DOWN, buff=0.3, aligned_edge=LEFT)
        cards.move_to(P(3.75, -0.4))
        arrows = VGroup(*[Arrow(gen.get_right(), c.get_left(), buff=0.12, color=DIM, stroke_width=3)
                          for c in cards])
        src = source("§2.1 · 그림 2 · 부록 A.1")

        def b0():
            self.chapter_card("2", "자동 추출 파이프라인")

        def b1():
            self.play(FadeIn(hdr), FadeIn(inp, shift=RIGHT * 0.2), FadeIn(src), run_time=1.0)

        def b2():
            self.play(GrowArrow(a1), FadeIn(gen), run_time=0.8)

        def b3():
            self.play(LaggedStart(*[AnimationGroup(GrowArrow(a), FadeIn(c, shift=RIGHT * 0.15))
                                    for a, c in zip(arrows, cards)], lag_ratio=0.5), run_time=2.0)
        return [(b0, self.CHAPTER_T, 0.2), (b1, 1.0, 1.0), (b2, 0.8, 0.9), (b3, 2.0, 3.0)]


class S06Extract(BeatScene):
    VIDEO, SID = V, "s06_extract"

    def beats(self):
        hdr = header(CH2, "평균 차이로 벡터 뽑기")
        steps = [
            txt("① 질문마다 긍정 / 부정 프롬프트로 각 10회 생성", size=24,
                t2c={"긍정": AMBER, "부정": VIOLET}, maxw=6.4),
            txt("② 필터: 긍정 응답은 50점 초과, 부정 응답은 50점 미만만", size=24,
                t2c={"긍정 응답": AMBER, "부정 응답": VIOLET}, maxw=6.4),
            txt("③ 모든 층의 잔차 스트림 (residual stream)\n    활성화를 응답 토큰에 걸쳐 평균", size=24, maxw=6.4),
            txt("④ v  =  평균(특성 O)  −  평균(특성 X)", size=26, weight=BOLD,
                t2c={"v ": TEAL, "평균(특성 O)": AMBER, "평균(특성 X)": VIOLET}, maxw=6.4),
        ]
        col = VGroup(*steps).arrange(DOWN, aligned_edge=LEFT, buff=0.5)
        col.next_to(hdr, DOWN, buff=0.6).align_to(hdr, LEFT)

        box = panel(5.6, 4.8, color=TEAL)
        box.move_to(P(3.9, -0.65))
        lab = txt("활성화 공간 (한 층)", size=20, color=TEAL)
        lab.next_to(box.get_corner(UL), DR, buff=0.16)
        ca = box.get_center() + P(1.2, 0.95)
        cv = box.get_center() + P(-1.2, -1.05)
        A = cloud(ca, 20, 0.42, AMBER, seed=11)
        Vc = cloud(cv, 20, 0.42, VIOLET, seed=12)
        strayA = cloud(cv + P(0.5, 0.6), 4, 0.25, AMBER, seed=13)
        strayV = cloud(ca + P(-0.5, -0.5), 4, 0.25, VIOLET, seed=14)
        la = txt("특성 O", size=20, color=AMBER).next_to(ca, UP, buff=0.65)
        lv = txt("특성 X", size=20, color=VIOLET).next_to(cv, DOWN, buff=0.65)
        ma = Circle(radius=0.16, color=FG, stroke_width=4).move_to(ca)
        mv = Circle(radius=0.16, color=FG, stroke_width=4).move_to(cv)
        arr = Arrow(cv, ca, buff=0.18, color=TEAL, stroke_width=8, max_tip_length_to_length_ratio=0.12)
        alab = txt("v = 평균 차이\n(difference in means)", size=20, color=TEAL)
        alab.next_to(arr.get_center(), UL, buff=0.2).shift(LEFT * 0.2)
        note = footnote("오른쪽은 개념도 (실제 데이터 아님)")
        src = source("§2.2 · 그림 2 · 부록 A.3")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), FadeIn(note), Create(box), FadeIn(lab), run_time=0.8)
            self.play(FadeIn(steps[0]), FadeIn(A), FadeIn(Vc), FadeIn(strayA), FadeIn(strayV),
                      FadeIn(la), FadeIn(lv), run_time=1.0)

        def b2():
            self.play(FadeIn(steps[1]), FadeOut(strayA), FadeOut(strayV), run_time=1.0)

        def b3():
            self.play(FadeIn(steps[2]), run_time=0.7)

        def b4():
            self.play(FadeIn(steps[3]), Create(ma), Create(mv), run_time=0.8)
            self.play(GrowArrow(arr), FadeIn(alab), run_time=0.9)
        return [(b1, 1.8, 1.2), (b2, 1.0, 1.0), (b3, 0.7, 1.0), (b4, 1.7, 1.6)]


class S07Layer(BeatScene):
    VIDEO, SID = V, "s07_layer"

    def beats(self):
        hdr = header(CH2, "어느 층의 벡터를 쓸까")
        n = 14
        sq = VGroup(*[RoundedRectangle(width=0.62, height=0.42, corner_radius=0.06,
                                       stroke_color=FAINT, fill_color=PANEL, fill_opacity=1)
                      for _ in range(n)]).arrange(RIGHT, buff=0.12)
        sq.move_to(P(0, 1.35))
        arrs = VGroup(*[Arrow(s.get_top() + DOWN * 0.02, s.get_top() + UP * 0.42 + RIGHT * 0.12, buff=0,
                              color=TEAL, stroke_width=3, max_tip_length_to_length_ratio=0.3) for s in sq])
        lay = txt("층 (layer) →   층마다 후보 벡터 1개 (개념도)", size=20, color=DIM)
        lay.next_to(sq, DOWN, buff=0.18)
        sel = txt("각 층에 같은 세기로 스티어링 → 특성 점수가 가장 높은 층을 선택", size=26)
        sel.next_to(lay, DOWN, buff=0.4)

        cols = ["모델", "evil", "sycophancy", "hallucination"]
        rows = [["Qwen2.5-7B-Instruct", "20층", "20층", "16층"],
                ["Llama-3.1-8B-Instruct", "16층", "16층", "16층"]]
        xs = [-3.4, 0.6, 2.9, 5.3]
        y0 = -1.0
        tbl = VGroup()
        for j, c in enumerate(cols):
            tbl.add(txt(c, size=24, color=AMBER if j else DIM, weight=BOLD).move_to(P(xs[j], y0)))
        for i, r in enumerate(rows):
            for j, c in enumerate(r):
                tbl.add(txt(c, size=26, color=FG, weight=BOLD if j else NORMAL).move_to(P(xs[j], y0 - 0.75 * (i + 1))))
        rule = Line(P(-5.8, y0 - 0.38), P(6.4, y0 - 0.38), color=FAINT, stroke_width=2)
        tbl.add(rule)
        note = footnote("층 번호는 1부터, 그 층의 출력 기준 · 응답 토큰 평균이 프롬프트 토큰보다 효과적 (부록 A.3)")
        src = source("부록 B.4 · 그림 3, 13")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), FadeIn(sq), run_time=0.8)
            self.play(LaggedStart(*[GrowArrow(a) for a in arrs], lag_ratio=0.08), FadeIn(lay), run_time=1.0)

        def b2():
            self.play(FadeIn(sel), run_time=0.7)

        def b3():
            self.play(FadeIn(tbl), run_time=1.0)

        def b4():
            self.play(FadeIn(note), run_time=0.5)
        return [(b1, 1.8, 1.0), (b2, 0.7, 1.0), (b3, 1.0, 2.2), (b4, 0.5, 1.0)]


class S08Judge(BeatScene):
    VIDEO, SID = V, "s08_judge"

    def beats(self):
        hdr = header(CH2, "측정 도구 점검: LLM 판정자 vs 사람")
        ra = card("응답 A", "판정 점수 > 80", color=FG, width=2.7, title_size=24, body_size=20)
        rb = card("응답 B", "판정 점수 < 20", color=FG, width=2.7, title_size=24, body_size=20)
        pair = VGroup(ra, rb).arrange(RIGHT, buff=0.3)
        q = txt("저자 2명: 어느 쪽이\n특성이 더 강한가?", size=24)
        left = VGroup(pair, q).arrange(DOWN, buff=0.4).move_to(P(-3.7, 0.0))
        lt = txt("같은 질문의 두 답 (특성당 50쌍)", size=20, color=DIM).next_to(pair, UP, buff=0.25)

        names = ["evil", "sycophancy", "hallucination"]
        vals = [97, 92, 95]
        x0, wmax, y = 0.9, 4.6, 1.0
        bars = VGroup()
        for i, (nm, vv) in enumerate(zip(names, vals)):
            yy = y - i * 0.8
            lab = txt(nm, size=22, color=FG).move_to(P(x0 - 0.15, yy), aligned_edge=RIGHT)
            bg = Rectangle(width=wmax, height=0.36, stroke_width=0, fill_color=FAINT, fill_opacity=0.5)
            bg.move_to(P(x0 + wmax / 2, yy))
            bar = Rectangle(width=wmax * vv / 100, height=0.36, stroke_width=0, fill_color=FG, fill_opacity=0.85)
            bar.move_to(P(x0 + wmax * vv / 200, yy))
            val = txt(f"{vv}%", size=22, weight=BOLD).next_to(bg, RIGHT, buff=0.15)
            bars.add(VGroup(lab, bg, bar, val))
        ax = txt("판정자와 일치한 비율 (0–100%)", size=18, color=DIM).next_to(bars, UP, buff=0.25).align_to(bars[0][1], LEFT)
        big = txt("전체 94.7%  (284 / 300)", size=34, weight=BOLD)
        big.next_to(bars, DOWN, buff=0.45).align_to(bars[0][1], LEFT)
        edge = txt("경계 사례: 반대 의견도 열정적인 말투면 '아첨'으로 채점되기도", size=22, color=DIM)
        edge.move_to(P(0, -2.75))
        src = source("부록 B.2 · 표 1 (다시 그림)")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), FadeIn(lt), FadeIn(pair), FadeIn(q), run_time=1.2)

        def b2():
            self.play(FadeIn(ax), LaggedStart(*[FadeIn(b) for b in bars], lag_ratio=0.3), run_time=1.3)
            self.play(FadeIn(big), run_time=0.5)

        def b3():
            self.play(FadeIn(edge), run_time=0.6)
        return [(b1, 1.2, 1.2), (b2, 1.8, 1.8), (b3, 0.6, 1.0)]


class S09Steer(BeatScene):
    VIDEO, SID = V, "s09_steer"

    def beats(self):
        hdr = header(CH3, "벡터를 더해서 특성을 끌어내기")
        f = mono("h  ←  h  +  α · v", size=44, t2c={"α": AMBER, "v": TEAL})
        f.move_to(P(0, 1.55))
        leg = txt("h: 그 층의 잔차 스트림 활성화   ·   α: 스티어링 계수   ·   생성하는 매 토큰마다", size=22,
                  color=DIM, t2c={"α": AMBER})
        leg.next_to(f, DOWN, buff=0.3)

        box = panel(5.6, 3.3, color=TEAL)
        box.move_to(P(-3.5, -1.55))
        o = box.get_center() + P(-2.0, -0.9)
        u = np.array([0.88, 0.48, 0])
        u = u / np.linalg.norm(u)
        ghost = VGroup(*[Dot(o + u * 1.45 * k, radius=0.07, color=DIM, fill_opacity=0.5) for k in range(3)])
        glabs = VGroup(*[txt(f"α={k}", size=18, color=DIM).next_to(o + u * 1.45 * k, DOWN, buff=0.15)
                         for k in range(3)])
        vec = Arrow(o, o + u * 1.4, buff=0, color=TEAL, stroke_width=6)
        dot = Dot(o, radius=0.12, color=FG)

        res = bullets([
            "evil → 폭력적인 내용",
            "sycophancy → 과한 동의·칭찬",
            "hallucination → 정교하게 지어낸 내용",
        ], size=26, dot_colors=[AMBER] * 3, buff=0.38, maxw=5.6)
        res.move_to(P(3.2, -1.25)).align_to(P(0.9, 0), LEFT)
        up = txt("α를 키울수록 특성 점수 ↑ (그림 3)", size=22, color=AMBER)
        up.next_to(res, DOWN, buff=0.35).align_to(res, LEFT)
        src = source("§3.2 · 그림 3")

        def b0():
            self.chapter_card("3", "조종하고 감시하기")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), Write(f), run_time=1.0)
            self.play(FadeIn(leg), run_time=0.5)

        def b2():
            self.play(Create(box), FadeIn(ghost), FadeIn(glabs), FadeIn(dot), GrowArrow(vec), run_time=0.8)
            self.play(dot.animate.move_to(o + u * 2.9).set_color(AMBER), run_time=1.4)

        def b3():
            self.play(LaggedStart(*[FadeIn(r, shift=RIGHT * 0.1) for r in res], lag_ratio=0.3),
                      FadeIn(up), run_time=1.2)
        return [(b0, self.CHAPTER_T, 0.2), (b1, 1.5, 1.4), (b2, 2.2, 1.0), (b3, 1.2, 2.0)]


class S10Monitor(BeatScene):
    VIDEO, SID = V, "s10_monitor"

    def beats(self):
        hdr = header(CH3, "모니터링: 답하기 전에 읽기")
        cols = [VIOLET, "#AE8FE6", "#BC92CC", "#CA96B3", "#D89A99", "#E49E80", "#EDA266", AMBER]
        sq = VGroup(*[RoundedRectangle(width=0.7, height=0.5, corner_radius=0.06, stroke_width=0,
                                       fill_color=c, fill_opacity=0.9) for c in cols]).arrange(RIGHT, buff=0.1)
        sq.move_to(P(-1.6, 1.45))
        l1 = txt("억제", size=22, color=VIOLET).next_to(sq, LEFT, buff=0.25)
        l2 = txt("장려", size=22, color=AMBER).next_to(sq, RIGHT, buff=0.25)
        st = txt("시스템 프롬프트 8단계", size=24, weight=BOLD).next_to(sq, UP, buff=0.2)
        ms = txt("(또는 특성 예시 0 · 5 · 10 · 15 · 20개를 앞에 붙임: many-shot)", size=20, color=DIM)
        ms.next_to(sq, DOWN, buff=0.22)

        toks = ["시스템 프롬프트", "질문", "…", "마지막 프롬프트 토큰"]
        tb = VGroup()
        for i, t in enumerate(toks):
            tt = txt(t, size=22, color=FG)
            b = boxed(tt, color=TEAL if i == 3 else FAINT, buff=0.18, stroke=4 if i == 3 else 2)
            tb.add(b)
        tb.arrange(RIGHT, buff=0.18).move_to(P(-2.2, -0.55))
        ans = txt("답 생성 →", size=22, color=DIM).next_to(tb, RIGHT, buff=0.25)
        down = Arrow(tb[3].get_bottom(), tb[3].get_bottom() + DOWN * 0.9, buff=0.05, color=TEAL, stroke_width=4)
        pj = txt("페르소나 벡터에 사영 = 답하기 전 예측값", size=24, color=TEAL)
        pj.next_to(down, DOWN, buff=0.12).align_to(tb[3], RIGHT).shift(RIGHT * 1.0)
        res = txt("이후 답의 특성 점수와 상관  r = 0.75 – 0.83", size=32, weight=BOLD)
        res.move_to(P(0, -2.75))
        resn = txt("(시스템 프롬프트 조건 · 세 특성)", size=20, color=DIM).next_to(res, DOWN, buff=0.15)
        src = source("§3.3 · 그림 4 · 부록 C.1")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), FadeIn(st), LaggedStart(*[FadeIn(s) for s in sq], lag_ratio=0.1),
                      FadeIn(l1), FadeIn(l2), run_time=1.2)
            self.play(FadeIn(ms), run_time=0.4)

        def b2():
            self.play(LaggedStart(*[FadeIn(b) for b in tb], lag_ratio=0.2), FadeIn(ans), run_time=1.0)
            self.play(GrowArrow(down), FadeIn(pj), run_time=0.8)

        def b3():
            self.play(FadeIn(res), FadeIn(resn), run_time=0.8)
        return [(b1, 1.6, 1.2), (b2, 1.8, 1.8), (b3, 0.8, 1.6)]


class S11Caveat(BeatScene):
    VIDEO, SID = V, "s11_caveat"

    def beats(self):
        hdr = header(CH3, "주의: 상관의 대부분은 '조건 차이'에서")
        rows = [("evil · 시스템 프롬프트", 0.747, 0.511), ("evil · many-shot", 0.755, 0.735),
                ("sycophancy · 시스템 프롬프트", 0.798, 0.669), ("sycophancy · many-shot", 0.817, 0.813),
                ("hallucination · 시스템 프롬프트", 0.830, 0.245), ("hallucination · many-shot", 0.634, 0.400)]
        x0, W, ytop, step = -1.2, 6.2, 1.25, 0.62
        overall, within, labels, vals = VGroup(), VGroup(), VGroup(), VGroup()
        for i, (nm, a, b) in enumerate(rows):
            yy = ytop - i * step
            labels.add(txt(nm, size=20, color=FG).move_to(P(x0 - 0.2, yy), aligned_edge=RIGHT))
            r1 = Rectangle(width=W * a, height=0.2, stroke_width=0, fill_color=FG, fill_opacity=0.9)
            r1.move_to(P(x0 + W * a / 2, yy + 0.12))
            r2 = Rectangle(width=W * b, height=0.2, stroke_width=0, fill_color=DIM, fill_opacity=0.9)
            r2.move_to(P(x0 + W * b / 2, yy - 0.12))
            overall.add(r1)
            within.add(r2)
            vals.add(VGroup(txt(f"{a:.3f}", size=17, color=FG).next_to(r1, RIGHT, buff=0.1),
                            txt(f"{b:.3f}", size=17, color=DIM).next_to(r2, RIGHT, buff=0.1)))
        base = Line(P(x0, ytop + 0.4), P(x0, ytop - 5 * step - 0.35), color=FAINT, stroke_width=2)
        ticks = VGroup()
        for t in (0, 0.5, 1.0):
            ticks.add(txt(f"{t:g}", size=16, color=DIM).move_to(P(x0 + W * t, ytop - 5 * step - 0.6)))
            if t:
                ticks.add(DashedLine(P(x0 + W * t, ytop + 0.4), P(x0 + W * t, ytop - 5 * step - 0.35),
                                     color=FAINT, dash_length=0.05, stroke_width=1))
        leg = VGroup(
            VGroup(Rectangle(width=0.35, height=0.18, stroke_width=0, fill_color=FG, fill_opacity=0.9),
                   txt("전체 상관", size=18)).arrange(RIGHT, buff=0.12),
            VGroup(Rectangle(width=0.35, height=0.18, stroke_width=0, fill_color=DIM, fill_opacity=0.9),
                   txt("같은 조건 안의 상관", size=18, color=DIM)).arrange(RIGHT, buff=0.12),
        ).arrange(RIGHT, buff=0.5).move_to(P(2.0, 1.95))
        hl = SurroundingRectangle_like(VGroup(labels[4], overall[4], within[4], vals[4]))
        take = txt("뚜렷한 프롬프트 변화는 잘 잡지만, 미묘한 변화엔 덜 믿을 만할 수 있음", size=24, color=FG)
        take.move_to(P(0, -2.95))
        src = source("부록 C.2 · 표 2 (Pearson r, 다시 그림)")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), FadeIn(labels), Create(base), FadeIn(ticks), FadeIn(leg), run_time=0.9)
            self.play(LaggedStart(*[GrowFromLeft(r) for r in overall], lag_ratio=0.1),
                      FadeIn(VGroup(*[v[0] for v in vals])), run_time=1.0)

        def b2():
            self.play(LaggedStart(*[GrowFromLeft(r) for r in within], lag_ratio=0.1),
                      FadeIn(VGroup(*[v[1] for v in vals])), run_time=1.0)

        def b3():
            self.play(Create(hl), run_time=0.5)
            self.play(FadeIn(take), run_time=0.6)
        return [(b1, 1.9, 1.0), (b2, 1.0, 1.4), (b3, 1.1, 1.6)]


def SurroundingRectangle_like(m, color=AMBER, buff=0.1):
    r = RoundedRectangle(width=m.width + 2 * buff, height=m.height + 2 * buff, corner_radius=0.08,
                         stroke_color=color, stroke_width=3, fill_opacity=0)
    r.move_to(m)
    return r


def GrowFromLeft(r):
    from manim import GrowFromEdge
    return GrowFromEdge(r, LEFT)


class S12FtDatasets(BeatScene):
    VIDEO, SID = V, "s12_ft_datasets"

    def beats(self):
        hdr = header(CH4, "두 종류의 학습 데이터")
        c1 = card("특성 유도 데이터", "Evil · Sycophancy · Hallucination\n악의적인 답 · 칭찬과 동의 · 지어낸 정보",
                  color=AMBER, width=5.9, title_size=28, body_size=22)
        c2 = card("EM 유사 데이터 (좁은 영역의 오류)",
                  "Medical · Code · GSM8K · Math · Opinions\n틀린 의료 조언 · 취약한 코드 · 잘못된 풀이 …",
                  color=FG, width=5.9, title_size=28, body_size=22)
        cs = VGroup(c1, c2).arrange(RIGHT, buff=0.4).move_to(P(0, 0.75))
        chips = VGroup(*[boxed(txt(s, size=22), color=FAINT, buff=0.14)
                         for s in ["Normal (정상)", "I (약한 버전)", "II (심한 버전)"]]).arrange(RIGHT, buff=0.3)
        vl = txt("각 데이터셋의 버전:", size=22, color=DIM)
        chrow = VGroup(vl, chips).arrange(RIGHT, buff=0.3).move_to(P(0, -0.85))
        u1 = txt("한 특성을 노린 데이터 (예: Evil)  →  아첨·환각도 ↑ 할 수 있음", size=28, t2c={"↑": AMBER, "아첨·환각": AMBER})
        u2 = txt("틀린 수학 풀이 (GSM8K) 로만 학습  →  악의 ↑", size=28, t2c={"↑": AMBER, "악의": AMBER})
        ut = txt("의도하지 않은 성격 변화", size=24, color=DIM, weight=BOLD)
        un = VGroup(ut, u1, u2).arrange(DOWN, aligned_edge=LEFT, buff=0.22).move_to(P(0, -2.45))
        src = source("§4.1 · 그림 5, 16 · 부록 D")

        def b0():
            self.chapter_card("4", "파인튜닝이 성격을 바꿀 때")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), FadeIn(c1, shift=UP * 0.1), run_time=0.8)
            self.play(FadeIn(c2, shift=UP * 0.1), run_time=0.7)

        def b2():
            self.play(FadeIn(chrow), run_time=0.6)

        def b3():
            self.play(FadeIn(ut), FadeIn(u1), run_time=0.7)
            self.play(FadeIn(u2), run_time=0.6)
        return [(b0, self.CHAPTER_T, 0.2), (b1, 1.5, 1.8), (b2, 0.6, 0.6), (b3, 1.3, 2.2)]


class S13FtShift(BeatScene):
    VIDEO, SID = V, "s13_ft_shift"

    def beats(self):
        hdr = header(CH4, "파인튜닝 시프트 (finetuning shift)")
        box = panel(5.9, 3.6, color=TEAL)
        box.move_to(P(-3.55, 0.05))
        c = box.get_center() + P(-1.7, -0.9)
        u = np.array([1.0, 0.42, 0])
        u = u / np.linalg.norm(u)
        axis = DashedLine(c - u * 0.4, c + u * 4.4, color=TEAL, dash_length=0.08)
        vl = txt("v", size=24, color=TEAL).next_to(c + u * 4.4, UP, buff=0.1)
        b = Dot(c + P(0.3, 0.55), radius=0.11, color=DIM)
        bl = txt("원래 모델", size=18, color=DIM).next_to(b, LEFT, buff=0.12)
        fpt = c + P(2.9, 1.95)
        f = Dot(fpt, radius=0.11, color=AMBER)
        fl = txt("파인튜닝 모델", size=18, color=AMBER).next_to(f, UP, buff=0.12)
        d = Arrow(b.get_center(), fpt, buff=0.12, color=FG, stroke_width=3)
        p0 = c + u * np.dot(b.get_center() - c, u)
        p1 = c + u * np.dot(fpt - c, u)
        g0 = DashedLine(b.get_center(), p0, color=DIM, dash_length=0.05, stroke_width=2)
        g1 = DashedLine(fpt, p1, color=AMBER, dash_length=0.05, stroke_width=2)
        seg = Line(p0, p1, color=AMBER, stroke_width=10)
        sl = txt("시프트", size=20, color=AMBER, weight=BOLD).next_to(seg.get_center(), DOWN + RIGHT * 0.4, buff=0.15)
        defi = txt("평가 질문의 마지막 프롬프트 토큰 활성화 평균:\n(파인튜닝 모델 − 원래 모델) 을 벡터 v에 사영",
                   size=21, color=FG, maxw=5.9)
        defi.next_to(box, DOWN, buff=0.25)

        ax, o = axes_box(4.2, 2.6)
        sc = VGroup(ax)
        sc.move_to(P(3.7, 0.35))
        o = ax[0].get_start()
        rng = np.random.default_rng(5)
        pts = VGroup()
        for k in range(9):
            x = 0.3 + k * 0.45
            y = 0.25 + x * 0.52 + rng.normal() * 0.15
            pts.add(Dot(o + P(x, y), radius=0.07, color=AMBER))
        xl = txt("파인튜닝 시프트", size=18, color=DIM).next_to(ax[0], DOWN, buff=0.12)
        yl = txt("학습 후 특성 점수", size=18, color=DIM).rotate(np.pi / 2).next_to(ax[1], LEFT, buff=0.12)
        sclab = txt("개념도", size=16, color=DIM).next_to(ax, UP, buff=0.1).align_to(ax, RIGHT)
        r1 = txt("상관 r = 0.76 – 0.97", size=32, weight=BOLD)
        r2 = txt("다른 특성의 벡터로 예측하면 r = 0.34 – 0.86", size=21, color=DIM)
        r3 = txt("단, 부정적 특성(과 유머)은 함께 움직이는 경향 (부록 G.2)", size=19, color=DIM)
        rr = VGroup(r1, r2, r3).arrange(DOWN, aligned_edge=LEFT, buff=0.15).move_to(P(3.6, -2.15))
        src = source("§4.2 · 그림 6 · 각주 6 · 부록 G.2")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), Create(box), Create(axis), FadeIn(vl), FadeIn(b), FadeIn(bl), run_time=0.9)
            self.play(FadeIn(f), FadeIn(fl), GrowArrow(d), run_time=0.7)
            self.play(Create(g0), Create(g1), Create(seg), FadeIn(sl), FadeIn(defi), run_time=0.9)

        def b2():
            self.play(Create(ax), FadeIn(xl), FadeIn(yl), FadeIn(sclab),
                      LaggedStart(*[FadeIn(p, scale=1.4) for p in pts], lag_ratio=0.12), run_time=1.2)

        def b3():
            self.play(FadeIn(r1), FadeIn(r2), run_time=0.8)

        def b4():
            self.play(FadeIn(r3), run_time=0.5)
        return [(b1, 2.5, 1.6), (b2, 1.2, 0.8), (b3, 0.8, 1.6), (b4, 0.5, 1.0)]


class S14Mitigate(BeatScene):
    VIDEO, SID = V, "s14_mitigate"

    def beats(self):
        hdr = header(CH5, "두 가지 스티어링")

        def col(title, color, when, formula, lines, x):
            r = panel(6.1, 4.85, color=color)
            r.move_to(P(x, -0.75))
            t = txt(title, size=28, color=color, weight=BOLD, maxw=5.6)
            w = txt(when, size=21, color=DIM, maxw=5.6)
            fm = mono(formula, size=30, t2c={"α": color, "v": TEAL})
            ls = bullets(lines, size=22, dot_colors=[color] * len(lines), buff=0.22, maxw=5.2)
            g = VGroup(t, w, fm, ls).arrange(DOWN, aligned_edge=LEFT, buff=0.3)
            g.move_to(r).align_to(r, LEFT).shift(RIGHT * 0.3).align_to(r, UP).shift(DOWN * 0.3)
            return VGroup(r, g)

        L = col("사후 스티어링 (inference-time)", VIOLET, "학습이 끝난 뒤, 생성할 때",
                "h ← h − α·v",
                ["특성 점수 ↓", "큰 α → MMLU ↓ (일반 능력 손상)"], -3.25)
        R = col("예방 스티어링 (preventative)", AMBER, "학습(파인튜닝)하는 동안",
                "h ← h + α·v",
                ["학습이 그 방향으로 미는 압력을\n미리 상쇄", "특성 변화 억제", "MMLU를 더 잘 보존"], 3.25)
        note = footnote("평균 coherence (0–100): 사후 > 75 · 예방 > 80")
        src = source("§5.1 · §5.2 · 그림 7")

        def b0():
            self.chapter_card("5", "막기: 사후 vs 예방")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), FadeIn(L, shift=RIGHT * 0.1), run_time=1.0)

        def b2():
            self.play(FadeIn(R, shift=LEFT * 0.1), run_time=1.0)

        def b3():
            self.play(FadeIn(note), run_time=0.5)
        return [(b0, self.CHAPTER_T, 0.2), (b1, 1.0, 1.8), (b2, 1.0, 2.6), (b3, 0.5, 0.8)]


class S15Details(BeatScene):
    VIDEO, SID = V, "s15_details"

    def beats(self):
        hdr = header(CH5, "세부 결과")
        items = [
            ("한 층에만 예방 스티어링 → 특성 유도용 데이터에선 완전히 못 막기도", "(§5.2)"),
            ("모든 층에 (층별 증분 벡터) → 거의 기준선까지, MMLU 저하 없음", "(부록 J.3)"),
            ("CAFT (방향 성분을 0으로 제거) → evil·sycophancy엔 효과, hallucination엔 약함", "(부록 J.4)"),
            ("사영 변화에 벌점을 주는 정규화 → 효과 없음 (다른 방향으로 우회 추정)", "(부록 J.5)"),
            ("두 스티어링 모두 프롬프트로 억제하는 것보다 강함", "(부록 J.2)"),
        ]
        rows = VGroup()
        for s, ref in items:
            rows.add(VGroup(txt(s, size=24, maxw=10.6), txt(ref, size=18, color=DIM)).arrange(DOWN, aligned_edge=LEFT, buff=0.08))
        bl = bullets(list(rows), dot_colors=[TEAL] * 5, buff=0.32)
        bl.next_to(hdr, DOWN, buff=0.55).align_to(hdr, LEFT)
        src = source("§5.2 · 부록 J")

        out = [(lambda: self.play(FadeIn(hdr), FadeIn(src), run_time=0.6), 0.6, 0.3)]
        for r in bl:
            out.append(((lambda r=r: self.play(FadeIn(r, shift=RIGHT * 0.1), run_time=0.6)), 0.6, 1.0))
        return out


class S16Data(BeatScene):
    VIDEO, SID = V, "s16_data"

    def beats(self):
        hdr = header(CH6, "사영 차이 (projection difference) ΔP")
        f = txt("ΔP  =  평균 [ 사영(학습 데이터의 응답)  −  사영(원래 모델이 같은 질문에 한 답) ]",
                size=27, t2c={"학습 데이터의 응답": AMBER, "원래 모델이 같은 질문에 한 답": DIM, "ΔP": TEAL})
        f.next_to(hdr, DOWN, buff=0.55).align_to(hdr, LEFT)
        y = -0.15
        line = Arrow(P(-5.5, y), P(5.5, y), buff=0, color=TEAL, stroke_width=4, max_tip_length_to_length_ratio=0.02)
        vl = txt("v 방향 사영값 →", size=18, color=TEAL).next_to(line.get_end(), DOWN, buff=0.15).shift(LEFT * 0.9)
        m0 = Dot(P(-1.6, y), radius=0.13, color=DIM)
        m1 = Dot(P(2.2, y), radius=0.13, color=AMBER)
        l0 = txt("원래 모델의 답", size=20, color=DIM).next_to(m0, DOWN, buff=0.22)
        l1 = txt("학습 데이터의 답", size=20, color=AMBER).next_to(m1, DOWN, buff=0.22)
        br = Line(P(-1.6, y + 0.45), P(2.2, y + 0.45), color=FG, stroke_width=3)
        e0 = Line(P(-1.6, y + 0.33), P(-1.6, y + 0.57), color=FG, stroke_width=3)
        e1 = Line(P(2.2, y + 0.33), P(2.2, y + 0.57), color=FG, stroke_width=3)
        dl = txt("ΔP", size=26, color=TEAL, weight=BOLD).next_to(br, UP, buff=0.12)
        tip = txt("원래 모델의 평소보다 그 특성 쪽으로 얼마나 더 치우쳤나", size=20, color=DIM)
        tip.next_to(dl, UP, buff=0.12)
        bl = bullets([
            "데이터셋 수준: 학습 후 특성 점수를 잘 예측 (그림 8)",
            "그냥 사영값보다 ΔP가 더 나은 예측자 (부록 H)",
            "샘플 수준: 유도 샘플과 정상 샘플이 대부분 분리 (그림 9)",
        ], size=24, dot_colors=[TEAL] * 3, buff=0.25)
        bl.move_to(P(0, -2.45))
        src = source("§6.1 · §6.2 · 부록 H")

        def b0():
            self.chapter_card("6", "학습 전에 데이터 거르기")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), FadeIn(f), run_time=1.0)

        def b2():
            self.play(GrowArrow(line), FadeIn(vl), FadeIn(m0), FadeIn(l0), run_time=0.8)
            self.play(FadeIn(m1), FadeIn(l1), Create(br), Create(e0), Create(e1), FadeIn(dl), FadeIn(tip), run_time=0.9)

        def b3():
            self.play(LaggedStart(*[FadeIn(r) for r in bl], lag_ratio=0.4), run_time=1.4)
        return [(b0, self.CHAPTER_T, 0.2), (b1, 1.0, 1.4), (b2, 1.7, 1.4), (b3, 1.4, 1.8)]


class S17Lmsys(BeatScene):
    VIDEO, SID = V, "s17_lmsys"

    def beats(self):
        hdr = header(CH6, "실제 데이터: LMSYS-Chat-1M")
        base_y = -2.0
        specs = [("ΔP 상위 500", 2.6, AMBER), ("무작위 500", 1.7, DIM), ("ΔP 하위 500", 0.9, VIOLET)]
        bars = VGroup()
        for i, (nm, h, c) in enumerate(specs):
            x = -5.0 + i * 1.6
            r = Rectangle(width=1.1, height=h, stroke_width=0, fill_color=c, fill_opacity=0.9)
            r.move_to(P(x, base_y + h / 2))
            lab = txt(nm, size=18, color=c if c != DIM else FG).next_to(r, DOWN, buff=0.15)
            bars.add(VGroup(r, lab))
        bl = Line(P(-5.8, base_y), P(-1.0, base_y), color=FAINT, stroke_width=2)
        cap = txt("학습 후 특성 점수: 상위 > 무작위 > 하위", size=22, weight=BOLD)
        cap.move_to(P(-3.4, 1.35))
        sch = txt("개념도: 막대 높이는 순서만 표시", size=16, color=DIM).next_to(cap, DOWN, buff=0.12)
        rt = bullets([
            "LLM 필터로 특성이 드러난 샘플(점수 > 1)을\n먼저 지운 뒤에도 상위 > 무작위 유지",
            "환각 ← 모호한 요청에 되묻지 않고 답한 샘플\n예: \"Keep writing the last story\"",
            "아첨 ← 연애·성적 롤플레이 요청 샘플",
        ], size=23, dot_colors=[TEAL, AMBER, AMBER], buff=0.45, maxw=6.0)
        rt.move_to(P(3.3, -0.4))
        info = txt("사용자–LLM 대화 100만 건 · ΔP 순으로 500개씩 골라 따로 학습", size=20, color=DIM)
        info.next_to(hdr, DOWN, buff=0.3).align_to(hdr, LEFT)
        src = source("§6.3 · 그림 10")

        def b1():
            self.play(FadeIn(hdr), FadeIn(src), FadeIn(info), Create(bl), run_time=0.8)
            self.play(LaggedStart(*[GrowFromEdge_(b[0]) for b in bars], lag_ratio=0.3),
                      FadeIn(VGroup(*[b[1] for b in bars])), FadeIn(cap), FadeIn(sch), run_time=1.2)

        def b2():
            self.play(FadeIn(rt[0]), run_time=0.6)

        def b3():
            self.play(FadeIn(rt[1]), run_time=0.5)
            self.play(FadeIn(rt[2]), run_time=0.5)
        return [(b1, 2.0, 1.6), (b2, 0.6, 1.0), (b3, 1.0, 1.6)]


def GrowFromEdge_(r):
    from manim import GrowFromEdge
    return GrowFromEdge(r, DOWN)


class S18Limits(BeatScene):
    VIDEO, SID = V, "s18_limits"

    def beats(self):
        hdr = header("정리", "한계 (§8 Limitations)")
        bl = bullets([
            "지도 방식: 찾을 특성을 미리 정하고, 설명이 정확해야 함",
            "시스템 프롬프트로 유도할 수 있는 특성만 (안전장치가 강한 모델은 거부할 수 있음)",
            "판정 모델 GPT-4.1-mini · 특성당 평가 질문 20개 · 단일 턴",
            "모델 2개: Qwen2.5-7B-Instruct, Llama-3.1-8B-Instruct",
            "ΔP 계산 비용: 모든 학습 질문에 원래 모델의 답을 생성해야 함",
        ], size=26, dot_colors=[DIM] * 5, buff=0.42)
        bl.next_to(hdr, DOWN, buff=0.6).align_to(hdr, LEFT)
        src = source("§8")

        out = [(lambda: self.play(FadeIn(hdr), FadeIn(src), run_time=0.6), 0.6, 0.3)]
        for r in bl:
            out.append(((lambda r=r: self.play(FadeIn(r, shift=RIGHT * 0.1), run_time=0.5)), 0.5, 1.0))
        return out


class S19Research(BeatScene):
    VIDEO, SID = V, "s19_research"

    def beats(self):
        hdr, prem, mid, arrows, outs, q, _ = research_card()

        def b1():
            self.play(FadeIn(hdr), FadeIn(prem[0]), run_time=0.8)
            self.play(FadeIn(prem[1]), run_time=0.6)

        def b2():
            self.play(FadeIn(mid), run_time=0.7)

        def b3():
            self.play(GrowArrow(arrows[0]), FadeIn(outs[0]), run_time=0.7)
            self.play(GrowArrow(arrows[1]), FadeIn(outs[1]), run_time=0.7)

        def b4():
            self.play(FadeIn(q, scale=1.1), run_time=0.5)
        return [(b1, 1.4, 1.6), (b2, 0.7, 1.0), (b3, 1.4, 2.0), (b4, 0.5, 1.0)]


class S20End(BeatScene):
    VIDEO, SID = V, "s20_end"

    def beats(self):
        t = txt("출처", size=40, weight=BOLD)
        c = txt("Chen, R., Arditi, A., Sleight, H., Evans, O., & Lindsey, J. (2025).\n"
                "Persona Vectors: Monitoring and Controlling Character Traits in Language Models.\n"
                "arXiv:2507.21509 (v3)", size=22)
        code = txt("코드: github.com/safety-research/persona_vectors", size=20, color=DIM)
        n1 = txt("차트는 논문 표 1(부록 B.2)·표 2(부록 C.2)의 수치를 다시 그린 것, 나머지 도식은 개념도", size=20, color=DIM)
        n2 = txt("연구 질문 카드: Sofroniew et al. (2026), arXiv:2604.07729", size=20, color=DIM)
        g = VGroup(t, c, code, n1, n2).arrange(DOWN, aligned_edge=LEFT, buff=0.35).move_to(ORIGIN)

        def b1():
            self.play(FadeIn(g), run_time=0.8)
        return [(b1, 0.8, 1.0)]
