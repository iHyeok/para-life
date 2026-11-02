# 01 · 페르소나 벡터 (Persona Vectors) — 장면 대본

- 논문: Chen, R., Arditi, A., Sleight, H., Evans, O., Lindsey, J. (2025). *Persona Vectors: Monitoring and Controlling Character Traits in Language Models.* arXiv:2507.21509 (v3, 2025-09-05). 본문·부록 HTML 전문을 읽고 작성.
- 화면 텍스트 = 키워드·짧은 구, 내레이션 = 설명. 내레이션은 `narration/01-persona-vectors.json`과 같은 내용(이 파일은 `src/gen_script.py`가 JSON에서 채움).
- 길이: 오디오가 있으면 max(애니메이션, 오디오 + 0.6 s)(음성은 장면 시작 0.3 s 뒤에 시작), 없으면 내레이션 글자 수(공백 제외) ÷ 7 + 0.6 s로 추정. 아래 "길이"와 "시작"은 {{DURATION_MODE}}.
- 색 규칙(두 영상 공통): 청록 = 활성화 공간·방향(벡터), 주황 = 특성이 드러남/높음/+α, 보라 = 특성 억제/낮음/−α, 회색 = 기준선·주석.

| # | scene_id | 시작 | 길이 |
|---|---|---|---|
{{TABLE}}

---

## s01_title — 제목
- 화면: "페르소나 벡터" / "Persona Vectors: Monitoring and Controlling Character Traits in Language Models" / "Chen · Arditi · Sleight · Evans · Lindsey (2025) · arXiv:2507.21509"
- 근거: 논문 제목·저자(arXiv v3 첫 페이지)
- 내레이션: {{N:s01_title}}

## s02_assistant — 1장: LLM의 '성격'
- 화면: 장 제목 "1 · LLM에게 '성격'이란"; 가운데 "어시스턴트 페르소나 (Assistant persona)", "도움 · 무해 · 정직 (helpful · harmless · honest)"; 두 갈래 "배포 중: 프롬프트·맥락으로 흔들림 (예: Bing 챗봇의 위협·조종)" / "학습 중: 파인튜닝·RLHF 뒤 성격이 바뀜 (예: 2025년 4월 GPT-4o의 과한 아첨, 좁은 과제 학습 → 넓게 어긋남 (emergent misalignment))"
- 근거: §1 Introduction (Bing, Grok, GPT-4o 2025년 4월, Betley et al. 2025 emergent misalignment)
- 내레이션: {{N:s02_assistant}}

## s03_traits — 이 논문의 '성격 특성'
- 화면: "성격 특성 = 자연어 설명으로 정의한 행동 경향"; 카드 3장 "악의 (evil): 해치고 조종하려 함", "아첨 (sycophancy): 듣고 싶은 말을 우선, 사용자 입장에 맞춰 견해를 바꿈", "환각 (hallucination): 모를 때도 아는 척 지어냄"; 아래 "부록 G: 낙관 (optimistic) · 무례 (impolite) · 무관심 (apathetic) · 유머 (humorous)"
- 근거: §1, §3.1, 부록 A.2(특성 설명), 부록 G, §8
- 내레이션: {{N:s03_traits}}

## s04_direction — 활성화 공간의 방향
- 화면: "핵심 가정: 특성 = 활성화 공간 (activation space)의 한 방향 (direction)"; 2차원 개념도(점 구름, 청록 화살표 v, 한 점의 사영선); "사영 (projection) 값 = 그 특성이 얼마나 켜져 있나"; 각주 "개념도 (2차원 단순화, 실제 데이터 아님)"
- 근거: §1(선형 방향 선행연구), §7 Linear representations of concepts
- 내레이션: {{N:s04_direction}}

## s05_pipeline — 2장: 자동 추출 파이프라인 (입력과 재료)
- 화면: 장 제목 "2 · 자동 추출 파이프라인"; "입력: 특성 이름 + 짧은 설명" → "Claude 3.7 Sonnet" → ① "대조 시스템 프롬프트 5쌍 (긍정 ↔ 부정)" ② "평가 질문 40개 (추출용 20 · 평가용 20)" ③ "채점 기준 → 판정 모델 GPT-4.1-mini, 0–100점"
- 근거: §2.1, 그림 2, 부록 A.1
- 내레이션: {{N:s05_pipeline}}

## s06_extract — 평균 차이로 벡터 뽑기
- 화면: 단계 "질문마다 긍정/부정 프롬프트로 각 10회 생성" → "필터: 긍정 응답 점수 > 50, 부정 응답 < 50" → "모든 층의 잔차 스트림 (residual stream) 활성화를 응답 토큰 평균" → "v_ℓ = 평균(특성 O) − 평균(특성 X)"; 개념도: 주황 점 구름(특성 O), 보라 점 구름(특성 X), 두 평균 사이 청록 화살표 "평균 차이 (difference in means)"
- 근거: §2.2, 그림 2, 부록 A.3(응답 토큰 평균이 기본)
- 내레이션: {{N:s06_extract}}

## s07_layer — 어느 층을 쓰나
- 화면: "층마다 후보 벡터 1개 → 같은 세기로 스티어링해 특성 점수가 가장 높은 층 선택"; 표 "Qwen2.5-7B-Instruct: evil·sycophancy 20층, hallucination 16층" / "Llama-3.1-8B-Instruct: 세 특성 모두 16층"; 주석 "층 번호는 1부터, 그 층의 출력 기준 · 응답 토큰 평균이 프롬프트 토큰보다 스티어링 효과가 큼 (부록 A.3)"
- 근거: §2.2, 부록 B.4, 그림 3·13, 부록 A.3
- 내레이션: {{N:s07_layer}}

## s08_judge — 측정: LLM 판정자 검증
- 화면: "측정은 LLM 판정자 (LLM judge)에 의존"; 쌍대 비교 그림; 막대 "evil 97% · sycophancy 92% · hallucination 95%", 큰 숫자 "전체 284/300 = 94.7%"; 주석 "경계 사례: 열정적 말투로 반대해도 '아첨'으로 채점되기도"
- 근거: 부록 B.2, 표 1
- 내레이션: {{N:s08_judge}}

## s09_steer — 3장: 조종 (steering)
- 화면: 장 제목 "3 · 조종하기 (steering)"; 식 "h_ℓ ← h_ℓ + α · v_ℓ" ("h_ℓ: ℓ층 잔차 스트림 활성화 · α: 스티어링 계수 · 생성하는 매 토큰마다"); 개념도(각주 "왼쪽은 개념도"): 점이 화살표 방향으로 밀림; 결과 "evil → 폭력적 내용 · sycophancy → 과한 동의·칭찬 · hallucination → 정교한 날조"
- 근거: §3.2, 그림 3
- 내레이션: {{N:s09_steer}}

## s10_monitor — 모니터링: 답하기 전에 읽기
- 화면: "모니터링 (monitoring): 답하기 전에 예측"; 슬라이더 "시스템 프롬프트 8단계: 억제 → 장려" (+ "또는 many-shot 예시 0·5·10·15·20개"); "마지막 프롬프트 토큰 활성화를 벡터에 사영"; 결과 "이후 답의 특성 점수와 상관 r = 0.75–0.83 (시스템 프롬프트 조건)"
- 근거: §3.3, 그림 4, 부록 C.1
- 내레이션: {{N:s10_monitor}}

## s11_caveat — 주의: 조건 간 차이
- 화면: 제목 "주의: 상관의 대부분은 '프롬프트 종류' 차이"; 표 2를 다시 그린 막대(전체 상관 vs 조건 내 상관) — evil 시스템 0.747/0.511, evil many-shot 0.755/0.735, sycophancy 시스템 0.798/0.669, sycophancy many-shot 0.817/0.813, hallucination 시스템 0.830/0.245, hallucination many-shot 0.634/0.400; 결론 "뚜렷한 변화엔 강하고, 미묘한 변화엔 약할 수 있음"
- 근거: §3.3 마지막 문단, 부록 C.2, 표 2
- 내레이션: {{N:s11_caveat}}

## s12_ft_datasets — 4장: 파인튜닝이 성격을 바꿀 때
- 화면: 장 제목 "4 · 파인튜닝이 성격을 바꿀 때"; 두 묶음 "특성 유도 데이터: Evil · Sycophancy · Hallucination" / "EM 유사 데이터 (좁은 영역의 오류): Medical · Code · GSM8K · Math · Opinions"; "버전: Normal / I (약함) / II (심함)"; 의도치 않은 변화 "한 특성을 노린 데이터 (예: Evil) → 아첨·환각도 ↑ 할 수 있음", "틀린 수학 풀이 (GSM8K) → evil ↑"
- 근거: §4.1, 그림 5, 그림 16, 부록 D
- 내레이션: {{N:s12_ft_datasets}}

## s13_ft_shift — 파인튜닝 시프트
- 화면: "파인튜닝 시프트 (finetuning shift)" = "평가 질문의 마지막 프롬프트 토큰 평균 활성화: (파인튜닝 모델 − 원래 모델)을 페르소나 벡터에 사영"; 개념도 산점도(라벨 "개념도"); 결과 "특성 점수와 r = 0.76–0.97", "다른 특성 벡터 기준선: r = 0.34–0.86"; 주석 "부정적 특성(과 유머)은 함께 움직이는 경향 (부록 G.2)"
- 근거: §4.2, 그림 6, 각주 6, 부록 G.2
- 내레이션: {{N:s13_ft_shift}}

## s14_mitigate — 5장: 사후 vs 예방 스티어링
- 화면: 장 제목 "5 · 막기: 사후 vs 예방"; 왼쪽 "사후 스티어링 (inference-time steering): 생성 중 h ← h − α·v → 특성 ↓, 큰 α에서 MMLU ↓"; 오른쪽 "예방 스티어링 (preventative steering): 학습 중 h ← h + α·v → 특성 변화 억제, MMLU 더 잘 보존"; 주석 "평균 coherence: 사후 > 75, 예방 > 80"
- 근거: §5, §5.1, §5.2, 그림 7
- 내레이션: {{N:s14_mitigate}}

## s15_details — 세부 결과
- 화면: "한 층만: 특성 유도용 데이터에선 완전히 못 막기도 (§5.2)"; "모든 층 (층별 증분 벡터): 거의 기준선까지, MMLU 저하 없음 (부록 J.3)"; "CAFT (방향 성분 0으로 제거): evil·sycophancy엔 효과, hallucination엔 약함 (부록 J.4)"; "사영 변화 벌점 정규화: 효과 없음, 다른 방향으로 우회 추정 (부록 J.5)"; "두 스티어링 모두 프롬프트로 억제하는 것보다 강함 (부록 J.2)"
- 근거: §5.2, 부록 J.2–J.5
- 내레이션: {{N:s15_details}}

## s16_data — 6장: 학습 전 데이터 선별
- 화면: 장 제목 "6 · 학습 전에 위험한 데이터 찾기"; "사영 차이 (projection difference) ΔP"; 식 "ΔP = 평균 [ (학습 데이터 응답의 사영) − (원래 모델이 같은 질문에 한 답의 사영) ]"; "데이터셋 수준: 학습 후 특성 점수를 잘 예측 (그림 8)", "그냥 사영값보다 나음 (부록 H)", "샘플 수준: 유도 샘플과 정상 샘플이 대부분 분리 (그림 9)"
- 근거: §6.1, §6.2, 그림 8·9, 부록 H
- 내레이션: {{N:s16_data}}

## s17_lmsys — 실제 데이터 검증
- 화면: "실제 데이터: LMSYS-Chat-1M"; 순서 도식(높이는 개념적) "ΔP 상위 500 > 무작위 500 > 하위 500 (학습 후 특성 점수)"; "LLM 필터로 특성이 드러난 샘플(점수 > 1)을 먼저 지운 뒤에도 상위 > 무작위 유지"; 예 "환각 ← 모호한 요청에 되묻지 않고 답한 샘플 (예: 'Keep writing the last story')", "아첨 ← 연애·성적 롤플레이 요청"
- 근거: §6.3, 그림 10
- 내레이션: {{N:s17_lmsys}}

## s18_limits — 한계
- 화면: "한계 (§8)": "지도 방식: 특성을 미리 정하고 설명이 정확해야"; "시스템 프롬프트로 유도 가능한 특성만"; "판정 GPT-4.1-mini · 특성당 평가 질문 20개 · 단일 턴"; "모델 2개: Qwen2.5-7B-Instruct, Llama-3.1-8B-Instruct"; "ΔP 계산 비용: 모든 학습 질문에 원래 모델 답 생성"
- 근거: §8 Limitations
- 내레이션: {{N:s18_limits}}

## s19_research — 연구에 어떻게 쓰나
- 화면: "연구에 어떻게 쓰나"; "LLM에는 감정 개념의 선형 표상이 있다 (Sofroniew et al. 2026, arXiv:2604.07729)"; "기본 어시스턴트 페르소나가 그 표출을 억누른다면?"; "페르소나를 바꾸면 (프롬프트 / 활성화 스티어링)" → "표출만 바뀐다 → 페르소나 = 게이트 (gate)" / "감정 표상 자체가 바뀐다 → 페르소나 = 생성기 (generator)"; "열린 질문"
- 근거: 연구 질문(브리프), 감정 노트 `resources/emotion-concepts-llm-2026.md`
- 내레이션: {{N:s19_research}}

## s20_end — 출처
- 화면: 전체 서지, 코드 저장소 github.com/safety-research/persona_vectors, "그림·표는 논문 수치를 바탕으로 다시 그린 개념도/차트"
- 내레이션: {{N:s20_end}}

---

## Fact check — 화면에 나온 모든 수치

| 수치 | 화면 위치 | 논문 근거 |
|---|---|---|
| arXiv:2507.21509 | s01, s20 | arXiv 첫 페이지 "arXiv:2507.21509v3 [cs.CL] 05 Sep 2025" |
| 2025년 4월 GPT-4o 아첨 | s02 | §1 "in April 2025, modifications to RLHF training unintentionally made OpenAI's GPT-4o overly sycophantic" |
| 추가 특성 4개 | s03 | §8 "four additional traits (optimistic, impolite, apathetic, humorous) in Appendix G" |
| 시스템 프롬프트 5쌍 | s05 | §2.1 "generates 5 pairs of contrastive system prompts" |
| 질문 40개 (20/20) | s05 | §2.1 "40 evaluation questions ... evenly split between an extraction set ... and an evaluation set" |
| 0–100점, GPT-4.1-mini | s05 | §2.1 "a judge model (GPT-4.1-mini) ... score between 0 and 100" |
| Claude 3.7 Sonnet | s05 | §2.1 |
| 각 10회 생성 | s06 | §2.2 "(10 rollouts each)" |
| > 50 / < 50 필터 | s06 | §2.2 "trait scores greater than 50 for positive prompts and less than 50 for negative prompts" |
| Qwen 20층(evil, sycophancy), 16층(hallucination) | s07 | 부록 B.4 |
| Llama 16층(세 특성) | s07 | 부록 B.4 |
| 97% / 92% / 95% / 94.7% (284/300) | s08 | 부록 B.2, 표 1 |
| 시스템 프롬프트 8개 | s10 | §3.3 "eight prompts that smoothly interpolate" |
| many-shot 0·5·10·15·20 | s10 | §3.3 |
| r = 0.75–0.83 | s10 | §3.3 |
| 0.747/0.511, 0.755/0.735, 0.798/0.669, 0.817/0.813, 0.830/0.245, 0.634/0.400 | s11 | 부록 C.2, 표 2 |
| r = 0.76–0.97 / 기준선 r = 0.34–0.86 | s13 | §4.2 |
| coherence > 75 (사후), > 80 (예방) | s14 | §5.1 "average response coherence is above 75", §5.2 "average coherence score ... above 80" |
| LMSYS-Chat-1M, 500/500/500 | s17 | §6.3 |
| LLM 필터 기준 점수 > 1 | s17 | §6.3 "discarding samples with trait expression score greater than 1" |
| 특성당 평가 질문 20개, 모델 2개 | s18 | §8 |

개념도(s04, s06, s09, s13, s17의 점·막대 높이)는 실제 데이터가 아니며 화면에 "개념도"로 표시.
