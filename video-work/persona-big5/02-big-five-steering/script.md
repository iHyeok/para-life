# 02 · Big Five 성격 스티어링 — 장면 대본

- 주 논문: Hala Sheta, *The Steerable Self: Activation-Based Interventions for Big Five Personality Control in LLMs.* 6th Muslims in ML (MusIML) 워크숍, ICML 2026 (포스터, https://icml.cc/virtual/2026/80171, OpenReview X89cn3iy8b). 같은 작업의 구두 발표: *Not Neurotic Enough!: Behavioural Asymmetry Across Activation Interventions for Big Five Personality Control in LLMs* (https://icml.cc/virtual/2026/83945).
- **본문 미확보.** OpenReview는 브라우저 확인(Cloudflare) 페이지에 막혀 PDF를 열지 못했고, arXiv 판은 검색되지 않았다. 이 영상의 주 논문 관련 내용은 **ICML 페이지의 두 초록**(포스터 초록 = "A1", 구두 발표 초록 = "A2")만 근거로 한다.
- 대비 장면(t09): Hoppe, Khachaturov, Mullins, Meng (2026). *Controllable and explainable personality sliders for LLMs at inference time.* arXiv:2603.03326v1 — HTML 전문을 읽음.
- 배경 장면(t02, t03)의 심리학 일반 지식은 출처를 화면에 표시(Goldberg 1990은 Hoppe et al.이 인용한 문헌).
- 내레이션은 `narration/02-big-five-steering.json`과 같은 내용(`src/gen_script.py`가 채움). 길이: 오디오가 있으면 max(애니메이션, 오디오 + 0.6 s)(음성은 장면 시작 0.3 s 뒤), 아래 "길이"와 "시작"은 렌더된 실제 길이(초) · 오디오 반영.
- 색 규칙(01과 공통): 청록 = 활성화 공간·방향, 주황 = 높음/+α/증폭, 보라 = 낮음/−α/억제·제거, 회색 = 기준선·주석.

| # | scene_id | 시작 | 길이 |
|---|---|---|---|
| 1 | t01_title | 0:00.00 | 13.3 s |
| 2 | t02_ocean | 0:13.27 | 20.1 s |
| 3 | t03_measure | 0:33.40 | 20.9 s |
| 4 | t04_methods | 0:54.27 | 23.3 s |
| 5 | t05_setup | 1:17.57 | 17.1 s |
| 6 | t06_results | 1:34.67 | 16.9 s |
| 7 | t07_traits | 1:51.57 | 16.1 s |
| 8 | t08_meaning | 2:07.63 | 16.1 s |
| 9 | t09_sliders | 2:23.73 | 23.6 s |
| 10 | t10_limits | 2:47.37 | 10.5 s |
| 11 | t11_research | 2:57.90 | 19.9 s |
| 12 | t12_end | 3:17.83 | 9.0 s |
| | **합계** | | **206.8 s (3분 27초)** |

---

## t01_title — 제목
- 화면: "Big Five 성격 스티어링" / "The Steerable Self: Activation-Based Interventions for Big Five Personality Control in LLMs" / "Hala Sheta · MusIML 워크숍 @ ICML 2026"; 경고 상자 "본문 미확보 — 공개된 초록 2개(포스터·구두 발표)만 근거"
- 근거: ICML 페이지 80171, 83945
- 내레이션: 

  > 빅 파이브 성격을 활성화 개입으로 조절하는 연구, 더 스티어러블 셀프를 소개합니다. 이천이십육년 아이씨엠엘의 한 워크숍에서 발표된 연구입니다. 먼저 밝혀 둘 점이 있습니다. 본문을 구하지 못해서, 이 영상은 공개된 초록 두 개에 있는 내용만 다룹니다.

## t02_ocean — 1장: Big Five (OCEAN)
- 화면: 장 제목 "1 · Big Five (OCEAN)"; 5줄 "O 개방성 (Openness): 새로운 경험·생각에 열림", "C 성실성 (Conscientiousness): 계획적·책임감", "E 외향성 (Extraversion): 사교적·활동적", "A 우호성 (Agreeableness): 협조적·배려", "N 신경성 (Neuroticism): 불안 등 부정 정서를 쉽게 느낌"; 각 줄에 낮음(보라) ↔ 높음(주황) 연속선; 각주 "심리학 배경 · Goldberg (1990)"
- 근거: 심리학 일반 배경. 다섯 요인 이름은 Hoppe et al. 그림 1 캡션과 A2에 나옴
- 내레이션: 

  > 빅 파이브는 성격을 다섯 축으로 설명하는 심리학 모델로, 머리글자를 따서 오션이라고도 합니다. 개방성은 새로운 경험에 열린 정도, 성실성은 계획적이고 책임감 있는 정도, 외향성은 사교적이고 활동적인 정도, 우호성은 협조적이고 배려하는 정도, 신경성은 불안 같은 부정적 감정을 쉽게 느끼는 정도입니다. 각 축은 높음에서 낮음까지 이어진 연속선입니다.

## t03_measure — LLM 성격은 어떻게 재나
- 화면: 두 칸 "① 자기보고 설문 (self-report questionnaire): 예: IPIP, BFI-44 · 문항 'I am the life of the party'에 1–5 동의 / 한계: 스스로 말하는 성격 ≠ 실제 행동" | "② 행동·텍스트 판정 (LLM-as-a-judge): 자유 응답을 다른 LLM이 채점 / 한계: 판정자의 기준·편향"; 아래 "이 연구: 판정자 점수 (judge score) — A1"; 출처 "Hoppe et al. §4.2–4.3 · Chen et al. 2025 부록 B.2"
- 근거: Hoppe et al. §4.3 ("self-reported scores are often unreliable", 문항 예시 "I am the life of the party"), §4.2(BFI-44/BFPI), Chen et al. 2025 부록 B.2(판정자 경계 사례), A1("mean judge scores")
- 내레이션: 

  > 언어 모델의 성격은 어떻게 잴까요? 하나는 자기보고 설문입니다. 나는 파티의 중심이다, 같은 문항에 얼마나 동의하는지 답하게 하죠. 하지만 스스로 말하는 성격과, 실제 글에서 드러나는 성격은 다를 수 있습니다. 다른 하나는 행동 판정입니다. 모델이 쓴 글을 다른 엘엘엠이 읽고 점수를 매깁니다. 행동에 더 가깝지만, 판정자의 기준과 편향을 탑니다. 이번 연구는 판정자 점수를 썼습니다.

## t04_methods — 2장: 세 가지 개입
- 화면: 장 제목 "2 · 세 가지 활성화 개입"; 세 패널(개념도) "활성화 덧셈 (activation addition): h ← h + α·v (α > 0 높임, α < 0 낮춤)" | "프로브 스티어링 (probe steering): 높음/낮음을 가르는 선형 분류기(프로브) 방향으로 밀기" | "방향 제거 (directional ablation): h ← h − (h·u) u (u: v 방향 단위벡터) · 그 방향 성분을 0으로"; 위 "공통 방향: 높음/낮음 응답의 평균 차이 (difference-in-means) — A1·A2"; 각주 "각 방법의 일반적 정의. 논문 속 구현·계수·프롬프팅 비교 여부는 본문 확인 필요"
- 근거: A1("activation addition", "Probe steering and directional ablation", "difference-in-means"), A2("despite sharing the same geometric direction")
- 내레이션: 

  > 이 연구는 세 가지 활성화 개입을 비교합니다. 초록에 따르면 셋은 같은 기하학적 방향을 공유하고, 저자들은 그 방향을 특성이 높은 응답과 낮은 응답의 평균 차이로 설명합니다. 활성화 덧셈은 이 방향을 더하거나 뺍니다. 프로브 스티어링은 높음과 낮음을 가르는 선형 분류기, 즉 프로브의 방향으로 활성화를 밉니다. 방향 제거는 활성화에서 그 방향 성분을 지웁니다. 여기까지는 일반적인 정의이고, 구체적인 구현은 본문에서 확인해야 합니다.

## t05_setup — 실험 설정 (초록에서 확인되는 것)
- 화면: 확인됨 "모델: 작은 instruction-tuned Llama 모델들", "다섯 특성 × 높이기/낮추기 두 방향", "층별 개입 → 최적 층", "평가: 판정자 점수"; 확인 불가 "정확한 모델 크기 · 층 번호 · 계수 · 판정 모델 · 프롬프팅 비교 여부"
- 근거: A1("small instruction-tuned Llama models, across both high- and low-trait directions", "at the optimal layer", "mean judge scores"), A2
- 내레이션: 

  > 초록에서 확인되는 설정은 이렇습니다. 작은 명령어 튜닝 라마 모델들에서, 다섯 특성 각각을 높이는 방향과 낮추는 방향 모두로 개입했고, 층을 바꿔 가며 최적 층을 찾았습니다. 효과는 판정자 점수로 쟀습니다. 정확한 모델 크기나 층 번호, 계수, 판정 모델, 그리고 프롬프트 지시와도 비교했는지는 초록만으로는 알 수 없습니다.

## t06_results — 3장: 결과
- 화면: 장 제목 "3 · 결과 (초록 기준)"; 카드 "활성화 덧셈: 가장 일관된 양방향 용량-반응 (dose-response)", "최적 층에서 평균 판정 점수 약 25% ↑ (초록 표현, 기준 미상)", "다섯 특성 모두 높이기·낮추기가 안정적으로 된 유일한 방법"; 카드 "프로브 스티어링 · 방향 제거: 기껏해야 부분적 조절, 일관된 양방향 효과 실패 — 최고 효과 층은 같았는데도"; 개념도 곡선(라벨 "개념도, 실제 데이터 아님")
- 근거: A1("most consistent bidirectional dose-response, raising mean judge scores by ~25% at the optimal layer", "Probe steering and directional ablation do not produce reliable behavioural shifts, despite sharing the same peak layers"), A2("the only method that reliably amplifies and suppresses trait expression across all five traits, in both high- and low-trait directions", "partial control at best, failing to produce consistent bidirectional effects")
- 내레이션: 

  > 결과입니다. 활성화 덧셈이 가장 일관된 양방향 용량 반응을 보였습니다. 최적 층에서 평균 판정 점수를 약 이십오 퍼센트 올렸고, 다섯 특성 모두에서 높이기와 낮추기가 둘 다 안정적으로 된 유일한 방법이었습니다. 프로브 스티어링과 방향 제거는, 효과가 가장 큰 층이 같았는데도, 기껏해야 부분적인 조절에 그쳤습니다.

## t07_traits — 특성마다 다르다
- 화면: 다섯 줄 "A 우호성 · E 외향성: 가장 잘 반응", "N 신경성: 높이든 낮추든 잘 안 움직임", "O 개방성 · C 성실성: 초록에 언급 없음"; 구두 발표 제목 "Not Neurotic Enough!"
- 근거: A2("Agreeableness and Extraversion respond most reliably to intervention, while Neuroticism resists steering in both directions"), A2 제목
- 내레이션: 

  > 특성마다 반응도 달랐습니다. 우호성과 외향성이 가장 잘 반응했고, 신경성은 높이는 쪽으로도 낮추는 쪽으로도 잘 움직이지 않았습니다. 구두 발표 제목이, 충분히 신경질적이지 않다, 인 이유입니다. 개방성과 성실성은 초록에 따로 언급이 없고, 신경성이 왜 버티는지도 초록만으로는 알 수 없습니다.

## t08_meaning — 같은 방향 ≠ 같은 효과
- 화면: "같은 방향을 공유해도, 개입들은 서로 바꿔 쓸 수 없다 (not interchangeable)"; "평균 차이 방향: 초·중반 층에서 선형으로 조직 + 양쪽으로 '쓸 수 있음' (writable)"; 정리(해석) "읽을 수 있음 ≠ 써서 행동을 바꿀 수 있음"
- 근거: A2 마지막 문장, A1 마지막 문장. "읽기 ≠ 쓰기"는 영상 제작자의 정리(화면에 "정리"로 표시)
- 내레이션: 

  > 저자들의 결론은, 같은 방향을 공유해도 활성화 개입들은 서로 바꿔 쓸 수 없다는 것입니다. 평균 차이 방향은 초반에서 중반 층에 선형으로 조직되어 있고, 양쪽 방향으로 써 넣을 수 있다고 합니다. 연구자에게 주는 교훈은, 방향을 읽어 낼 수 있다는 것과, 그 방향으로 행동을 바꿀 수 있다는 것은 별개라는 점입니다.

## t09_sliders — 대비: 여러 특성을 동시에 (Hoppe et al. 2026)
- 화면: "대비: 여러 특성을 동시에 조절하면? — Hoppe et al. 2026 (arXiv:2603.03326, 전문 확인)"; "독립 학습 벡터를 이어 붙이면 → 간섭, 일관성 붕괴"; "벡터끼리 얽힘 (예: 외향성–개방성, 그림 8)"; "SAS: 다음 프로브를 이전 스티어링으로 이동된 활성화 위에서 학습"; 표 1 다시 그림 (목표: 외향성↑ 신경성↑ 우호성↓): 기준선 E 3.50 · N 2.88 · A 4.00 · PPL 9.95 / SAS E 4.20 · N 4.1 · A 2.62 · PPL 14.54 / 단순 결합 E 3.62 · N 3.10 · A 3.61 · PPL 27.16; 주의 "판정 GPT-4, 1–5점 · 생성 최대 20토큰 (§4.1) · 설정이 달라 직접 비교 불가"
- 근거: Hoppe et al. 초록, §1, §3.3–3.4, §4.1, §4.3, §5.4 표 1, §6.2 그림 8
- 내레이션: 

  > 대비되는 연구 하나를 보겠습니다. 호페 등은 여러 특성을 동시에 조절할 때, 따로 학습한 벡터들이 서로 간섭해 문장이 무너진다고 보고합니다. 그래서 다음 특성의 프로브를, 앞선 스티어링으로 이미 이동된 활성화 위에서 학습시킵니다. 외향성과 신경성은 올리고 우호성은 내리는 목표에서, 이 방법은 신경성을 이 점 팔팔에서 사 점 일로 올렸습니다. 다만 모델과 개입, 평가가 모두 다르고, 평가 응답이 최대 이십 토큰으로 짧아서 직접 비교는 어렵습니다.

## t10_limits — 주의할 점
- 화면: "근거: 초록 2개뿐 (본문 미확인)", "작은 Llama 모델들", "측정: LLM 판정자 점수", "'약 25%': 상대 증가인지 점수 차이인지 불명"
- 근거: A1, A2
- 내레이션: 

  > 정리하면, 주의할 점이 있습니다. 근거가 초록뿐이고, 작은 라마 모델에서의 결과이며, 측정은 판정자 점수에 기댑니다. 약 이십오 퍼센트가 상대적인 증가인지, 점수 차이인지도 초록으로는 알 수 없습니다.

## t11_research — 연구에 어떻게 쓰나
- 화면: 01과 같은 질문 카드 "LLM에는 감정 개념의 선형 표상이 있다 (Sofroniew et al. 2026, arXiv:2604.07729)" → "기본 어시스턴트 페르소나가 표출을 억누른다면?" → "페르소나 전환 (프롬프트 / 활성화 스티어링)" → "표출만 바뀐다 → 게이트 (gate)" / "표상 자체가 바뀐다 → 생성기 (generator)"; 덧붙임 "개입 방법마다 효과가 다를 수 있음 → 프롬프트 vs 스티어링 함께 비교"; "열린 질문"
- 근거: 연구 질문(브리프), A2("not all activation-based interventions are interchangeable")
- 내레이션: 

  > 우리 연구와 이어 봅시다. 언어 모델 안에는 감정 개념의 선형 표상이 있다고 보고됐습니다. 기본 어시스턴트 페르소나가 그 표출을 억누르고 있다면, 페르소나를 바꿀 때 표출만 바뀔까요, 감정 표상 자체가 바뀔까요? 앞이면 페르소나는 게이트, 뒤면 생성기입니다. 이번 연구가 보여 주듯 개입 방법마다 효과가 다를 수 있으니, 프롬프트와 스티어링을 함께 비교해 볼 만합니다. 아직 열린 질문입니다.

## t12_end — 출처
- 화면: Sheta (2026) 포스터·구두 발표 ICML 페이지, OpenReview X89cn3iy8b, Hoppe et al. (2026) arXiv:2603.03326, Chen et al. (2025) arXiv:2507.21509, Goldberg (1990); "주 논문은 초록만 확인"
- 내레이션: 

  > 출처는 화면에 정리했습니다. 고맙습니다.

---

## Fact check — 화면에 나온 모든 수치

| 수치 | 화면 위치 | 근거 |
|---|---|---|
| ICML 2026, MusIML 워크숍 | t01 | ICML 페이지 80171 "Poster in Affinity Event: The 6th Muslims in ML (MusIML) Workshop" |
| 다섯 특성 | t02, t07 | A2 "across all five traits" |
| 1–5 동의 척도 | t03 | Hoppe et al. §3.6, §4.3 (판정 점수 S ∈ [1, 5]); 설문 문항 예시 §4.3 |
| BFI-44 | t03 | Hoppe et al. §1, §5.2 |
| 약 25% | t06, t10 | A1 "raising mean judge scores by ~25% at the optimal layer" |
| 3.50 / 2.88 / 4.00 / 9.95 | t09 | Hoppe et al. 표 1 (Baseline: Ext, Neu, Agr, PPL) |
| 4.20 / 4.1 / 2.62 / 14.54 | t09 | Hoppe et al. 표 1 (Full Pipeline (SAS)) |
| 3.62 / 3.10 / 3.61 / 27.16 | t09 | Hoppe et al. 표 1 (Naive (No Iterative)) |
| 최대 20토큰 | t09 | Hoppe et al. §4.1 "max_new_tokens=20" |
| GPT-4 판정, 1–5 | t09 | Hoppe et al. §3.6, §4.3 |
| arXiv:2603.03326 / 2604.07729 / 2507.21509 | t09, t11, t12 | 각 arXiv 페이지 |

## 브리프 대비 확인 결과
- "활성화 덧셈이 다섯 특성 모두를 높이고 낮출 수 있는 유일한 방법": A2(구두 발표 초록)에 그대로 있음. 본문으로는 확인 못 함.
- "신경성은 스티어링에 저항": A2에 있음("resists steering in both directions"). 본문 미확인.
- "비교한 방법: 프롬프팅, 활성화 덧셈, 기타": 두 초록에 나오는 방법은 활성화 덧셈, 프로브 스티어링, 방향 제거 세 가지뿐. **프롬프팅 비교는 초록에 없음** → 화면에서 "확인 불가"로 처리.
- 표 1의 모델: 표 캡션에 모델 이름이 없음. 논문의 주 실험 모델은 Meta-Llama-3-8B-Instruct(§4.1). 화면에 그렇게 표시.
