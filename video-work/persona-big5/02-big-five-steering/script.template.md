# 02 · Big Five 성격 스티어링 (본문 정독판) — 장면 대본

- 주 논문: Hala Sheta (2026). *Behavioural Asymmetry Across Activation Interventions for Big Five Personality Control in LLMs.* ICML 2026 워크숍 MusIML, 포스터. OpenReview X89cn3iy8b. 같은 연구의 다른 제목은 *The Steerable Self*(포스터 페이지), *Not Neurotic Enough!*(구두 발표)다.
- **본문 전체를 읽고 만든 판**(2026-11-03, OpenReview 로그인 후 PDF). 수치와 근거는 PARA 지식 노트 `resources/big-five-steering-asymmetry-2026.md`에 있다. 초록만 보고 만든 이전 판(t01–t12)을 대체한다.
- 화면에 "개념도"라고 표시한 그래프는 논문 그림의 **모양만** 옮겼다. 막대 수치(b14)는 표 1 값이다(활성화 덧셈, 최적 층, α=±2.5, 판정 gpt-oss-20b).
- b16의 "③ 바닥 효과"는 논문에 없는 해석이라 화면에 "영상에서 덧붙인 해석"으로 표시했다. b03 말풍선 예시는 영상용으로 지어낸 문장이다.
- 내레이션은 `narration/02-big-five-steering.json`과 같은 내용이다(`src/gen_script.py`가 채움). 음성은 Fish Audio `s2.1-pro-free`, 보이스1. 길이: 오디오가 있으면 max(애니메이션, 오디오 + 0.6 s)이고, 아래 "길이"와 "시작"은 {{DURATION_MODE}}.
- 색 규칙(01과 공통): 청록 = 방향·활성화, 주황 = 높음/+α, 보라 = 낮음/−α, 분홍 = 프로브 방향·반대로 간 결과, 회색 = 기준선·주석.

| # | scene_id | 시작 | 길이 |
|---|---|---|---|
{{TABLE}}

---

## 도입
- **b01_hook** — 성격 슬라이더 다섯 개. 넷은 움직이고 N(신경성)만 떨리다 제자리. "Not Neurotic Enough!"{{N:b01_hook}}
- **b02_paper** — 원제·저자·발표 정보, "결론은 조심스럽게 / 설계는 꼼꼼히", 영상 ①과의 연결.{{N:b02_paper}}

## 1 · 성격을 재는 법
- **b03_ocean** — OCEAN 목록 + "이번 주말에 뭐 할 거야?"에 대한 높음/낮음 말풍선을 E→A→C→O→N 순서로 바꿔 보여 줌.{{N:b03_ocean}}
- **b04_measure** — 답 → 판정 모델 2개(gpt-oss-20b, gpt-5.4-nano) → 1–10점 → 0–100점. 거절은 −1. ICC 막대: 전체 0.63, 우호성 0.26.{{N:b04_measure}}
- **b05_direction** — 2차원 개념도: 외향/내향 답의 활성화 무리, 두 평균을 잇는 화살표 v. 높음 200 · 낮음 200.{{N:b05_direction}}
- **b06_setup** — 카드 4장: 모델(Llama-3.2-3B / 3.1-8B Instruct), 데이터(BIG5-CHAT 수정판), 기본 지시(거절 방지), 규모(≈5만 개).{{N:b06_setup}}

## 2 · 성격을 바꾸는 다섯 가지 방법
- **b07_five_ways** — 배우 비유. 왼쪽 말로 하기(①시스템 프롬프트, ②퓨샷), 오른쪽 활성화(③④⑤).{{N:b07_five_ways}}
- **b08_actadd** — 점 h가 v 방향으로 α에 따라 좌우로 이동. α 슬라이더 −2.5…+2.5.{{N:b08_actadd}}
- **b09_ablation** — h를 v 축에 비춘 그림자(외향 성분)를 빼는 그림. 성분이 거의 없는 h의 경우.{{N:b09_ablation}}
- **b10_probe** — 비스듬히 퍼진 두 무리, 울타리(결정 경계), 그에 수직인 프로브 방향 대 평균 차이 v.{{N:b10_probe}}

## 3 · 결과
- **b11_scorecard** — 성적표: 활성화 덧셈 ↑약 25% ↓약 17%, 방향 제거 ↓약 12%만, 프로브 ↓일부만, 시스템 프롬프트 천장 약 72%, 퓨샷 ≈ 기준선.{{N:b11_scorecard}}
- **b12_read_write** — 키 비유: 키로 어른/아이 구분은 되지만 아이 키를 늘려도 아이. "읽어 내는 방향 ≠ 써 넣는 방향".{{N:b12_read_write}}
- **b13_layers** — 개념도(그림 1): 활성화 덧셈 효과가 앞 후보 층(3B L12, 8B L14)에서 최대, 뒤로 갈수록 기준선으로. 비유 상자.{{N:b13_layers}}
- **b14_traits** — 표 1 막대(3B 옅게, 8B 진하게): 올리기/내리기 패널. 우호성 강조.{{N:b14_traits}}
- **b15_neuro** — 신경성 내리기 +1.0(3B) / +10.0(8B). 개념도(그림 2): 신경성 20점대 평평. 걸린 손잡이.{{N:b15_neuro}}

## 4 · 해석과 한계
- **b16_why** — 카드 3장: ①가드레일(저자) ②판정 모델 한계(저자) ③바닥 효과(덧붙인 해석).{{N:b16_why}}
- **b17_fluency** — 펄플렉서티 정의와 예, 개념도(그림 7): 8B 활성화 덧셈, α<0에서 ≈10 → ≈22.{{N:b17_fluency}}
- **b18_caveats** — 한계 목록과 반례 카드(Hoppe et al. 2026, 신경성 2.88 → 4.1).{{N:b18_caveats}}
- **b19_takeaways** — 세 줄 요약.{{N:b19_takeaways}}
- **b20_research** — 게이트 가설의 정황 증거와 대안 설명, 2단계 측정 세 가지(사영·프로브·인과), Huang 2023 대 Sheta 2026.{{N:b20_research}}
- **b21_end** — 출처.{{N:b21_end}}
