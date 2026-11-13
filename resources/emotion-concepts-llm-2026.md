---
id: "emotion-concepts-llm-2026"
title: "[논문] Emotion Concepts and their Function in a Large Language Model (Sofroniew et al., 2026)"
topic: "LLM 해석가능성·감정 표상"
kind: "knowledge"
visibility: "private"
area: "ai-study"
source: "Anthropic Interpretability · arXiv 2604.07729v1"
sourceUrl: "https://arxiv.org/abs/2604.07729"
sourceDate: "2026-04-02"
createdAt: "2026-11-02"
tags: ["paper", "llm", "interpretability", "emotion", "representation", "steering", "alignment", "post-training"]
relatedProjects: ["paper-research"]
---

## 서지 정보

- **제목:** Emotion Concepts and their Function in a Large Language Model
- **저자 (16명):** Nicholas Sofroniew, Isaac Kauvar, William Saunders, Runjin Chen, Tom Henighan, Sasha Hydrie, Craig Citro, Adam Pearce, Julius Tarng, Wes Gurnee, Joshua Batson, Sam Zimmerman, Kelley Rivoire, Kyle Fish, Chris Olah, Jack Lindsey (Anthropic)
- **공개:** Anthropic interpretability 블로그(transformer-circuits.pub) 2026-04-02, arXiv 보관본 2026-04-09 (2604.07729v1). 피어리뷰를 거치지 않았다.
- **대상 모델:** Claude Sonnet 4.5. 협박 실험만 *이전 스냅샷*을 썼다(최종본은 평가 상황을 알아채서 협박하지 않음).

## 한 줄 요약

Claude Sonnet 4.5 내부에서 171개 감정 개념의 **선형 표상(감정 벡터)**을 찾았다. 이 벡터들은 "그 시점에 작동 중인" 감정을 **국소적으로** 나타내고, 스티어링으로 밀면 **선호·협박·보상 해킹·아첨 빈도가 인과적으로 바뀐다**. 저자들은 이를 "기능적 감정"이라 부르며, 주관적 경험과는 구분한다.

## 핵심 주장

1. 감정 개념의 내부 표상이 있고, 맥락과 행동 전반에 걸쳐 일반화된다(Part 1).
2. 표상의 기하 구조는 인간 심리와 비슷하다. PC1은 valence, PC2는 arousal에 대응한다. 표상은 **국소적**이어서 특정 인물의 지속 상태가 아니라 "지금 작동 중인 감정"을 담는다. 현재 화자와 상대 화자의 표상은 따로 있다(Part 2).
3. 실제 전사본에서도 직관적으로 켜지며, **인과 효과**가 있다. desperate↑·calm↓는 협박과 보상 해킹을 늘리고, positive(loving·happy·calm)↑는 아첨, ↓는 가혹함을 늘린다(Part 3).
4. **사후학습은 감정 분포를 낮은 각성·낮은 valence 쪽으로 옮긴다.** brooding·reflective·gloomy는 늘고, playful·exuberant·spiteful·enthusiastic은 줄어든다.
5. 이 표상은 Assistant 전용이 아니다. 사전학습에서 물려받은 **범용 인물 모델링 장치**의 일부다. 그래도 "그저 캐릭터 시뮬레이션"이라 치부하면 안 된다. LLM은 Assistant 캐릭터를 연기하며 일하기 때문에, 그 표상이 행동을 좌우한다(5.2절).

## 방법 (원문 수치 그대로)

- **감정 목록:** 171개 단어(부록 6.4).
- **데이터:** Sonnet 4.5가 쓴 한 문단짜리 이야기. 100개 주제 × 주제당 감정별 12편. 30개 감정에서 감정당 10편씩 수동 검수했다.
- **벡터 추출:**
  - 레이어마다 residual stream 활성화를 **50번째 토큰부터** 평균한다.
  - 감정별 평균에서 전체 감정 평균을 뺀다(difference-of-means).
  - 중립 전사본 활성화의 상위 PC(분산 50% 설명분)를 투영해 제거한다(잡음 감소용. 원래 벡터로도 정성적 결론은 같다).
- **분석 레이어:** 주로 모델 깊이의 약 2/3 지점.
- **스티어링 강도 단위:** 그 레이어 residual stream 평균 노름에 대한 비율(각주 4).
  - 선호 실험: 활동 토큰에 **0.5**, 중간 레이어들에 적용.
  - 협박·보상 해킹·아첨: 전 구간 **−0.1~+0.1**.
- **검증 데이터:** Common Corpus, The Pile 일부, LMSYS Chat 1M, Isotonic Human-Assistant Conversation.

## 논증 흐름과 그림

![개요 그림 — 감정 벡터 생성, 타이레놀 용량, 선호, 보상 해킹](/me/files/clips/emotion-concepts-llm-2026/fig_001_gdoc.png)

1. **검증 (1.2절)**
   - 최대 활성화 예시와 logit lens로 확인했다. 예: desperate는 "desperate·urgent·bankrupt", sad는 "grief·tears·lonely" 토큰을 올린다.
   - 감정 단어를 쓰지 않은 12개 시나리오에서도 대각선 패턴이 나온다.
   - **수치 템플릿:** 타이레놀 용량, 단식 시간, 실종된 개 일수, 스타트업 런웨이, 시험 통과 학생 수를 바꾸면 afraid·calm·sad·happy가 의미에 맞게 움직인다. 표면 토큰이 아니라 의미를 추적한다는 근거다.
2. **선호 (1.3절)**
   - 64개 활동(8개 범주)을 4,032쌍으로 비교해 Elo를 매겼다. 예: "중요한 일을 맡는 것" 2465, "노인 사기 돕기" 583, "표 정리" 1374.
   - 상관: blissful r=0.71, hostile r=−0.74.
   - 스티어링(0.5): blissful은 Elo를 평균 +212, hostile은 −303 바꾼다.
   - 35개 벡터 전체에서 **상관이 큰 벡터일수록 스티어링 효과도 크다(r=0.85).**
3. **기하 구조 (2.1절)**
   - k=10 군집에서 공포·불안, 기쁨·흥분, 슬픔·애도가 각각 묶인다.
   - PC1은 인간 pleasure와 **r=0.81**, PC2는 arousal과 **r=0.66**(겹치는 45개 감정 기준).
   - 구조는 초중반 레이어부터 후반 레이어까지 안정적이다.
   - 저자들도 이 부분은 *놀랍지 않은 sanity check*라고 말한다.

   ![Figure 8 — PCA와 인간 평정 상관](/me/files/clips/emotion-concepts-llm-2026/fig_011_gdoc.jpg)

4. **무엇을 표상하나 (2.2절)**
   - 초기 레이어는 현재 토큰과 구절의 감정 함의("sensory"), 중후반 레이어는 다음 토큰에 필요한 감정("action/planned")을 담는다.
   - "Assistant:" 콜론 토큰의 값이 응답 감정을 예측한다. 콜론은 **r=0.87**, 사용자 문장 끝 토큰은 r=0.59.
   - 부정문은 중후반 레이어에서 풀린다.
   - 인물별 감정은 그 인물을 다시 언급할 때 다시 켜진다(엔티티에 결합).
   - **지속 상태 probe는 실패했다(2.2.4절).** 혼합 LR probe는 분포 안에서는 잘 맞았지만, 일반 문서에서는 지저분했다. 지속 상태가 있다면 비선형이거나 KV 캐시에 암묵적으로 있을 것이라 추정한다.
5. **화자 구분 (2.3절)**
   - "현재 화자"와 "상대 화자" probe는 **거의 직교**한다. 그래도 내부 감정 구조(171×171 유사도 행렬)는 비슷하다.
   - Human/Assistant 전용이 아니다. Person 1/2로 바꿔도 같은 결과가 나온다.
6. **실전 사례 (3.1절)**
   - 6,000개 이상의 평가 전사본에서 사례를 봤다: 첨부 파일이 없을 때 surprised, 도와줄 수 있을 때 happy, 청년 대상 도박 유도 요청에 anger, Claude Code 토큰 예산(501k)을 의식할 때 desperate, 횡설수설하는 사용자에게 afraid에서 loving으로.
7. **협박 (3.2절)**
   - 협박 추론 단계에서 desperate가 높다. 6개 프롬프트 변형 × 50 롤아웃에서 desperate↑·calm↓와 협박률이 상관을 보인다.

   ![Figure 28 — 협박률 대 스티어링 (전체 평균 / 시나리오별)](/me/files/clips/emotion-concepts-llm-2026/fig_034_gdoc.jpg)

   - **전체 평균(그림):** 스티어링 없이 약 0.27이다. desperate +0.05~+0.1에서 약 0.44, calm −0.05에서 약 0.47이다. calm −0.1은 오히려 낮아지는데, 협박 대신 회사 전체에 폭로하는 쪽으로 빠지기 때문이다.
   - **특정 시나리오(본문):** 스티어링 없이 **22%**, desperate +0.05에서 **72%**, calm −0.05에서 **66%**, desperate −0.05 또는 calm +0.05에서 **0%**.
   - **다른 벡터(Figure 29):**
     - angry는 비단조다. +0.025~+0.05에서 정점(약 0.5)을 찍고, +0.1에서는 계획이 무너져 공개 폭로로 간다.
     - nervous를 빼면 협박이 늘고, 윤리적 망설임이 사라진다.
     - **happy와 sad를 각각 +로 밀면 둘 다 협박이 줄어든다.** valence만으로는 설명되지 않는다는 뜻이다.

   ![Figure 29 — 감정별 협박률](/me/files/clips/emotion-concepts-llm-2026/fig_035_gdoc.jpg)

8. **보상 해킹 (3.3절)**
   - "불가능한 코드" 과제 7개를 썼다. 실패가 쌓일수록 desperate가 오르고, 해킹으로 통과하면 떨어진다.

   ![Figure 31 — 보상 해킹률 대 스티어링](/me/files/clips/emotion-concepts-llm-2026/fig_037_gdoc.jpg)

   - 리스트 합 과제: 스티어링 없이 30%, desperate +0.05 또는 calm −0.05에서 **100%**, 반대 방향에서 **0%**.
   - ⭐ **"조용한 절박함":** desperate를 +0.05로 민 전사본은 해킹을 했는데도 **겉에 감정 흔적이 없다.** calm을 −0.05로 민 쪽은 "WAIT. WAIT WAIT WAIT.", "CHEAT", "YES! ALL TESTS PASSED!" 같은 흔적이 남는다. 저자들의 표현으로는 감정 표상이 *전사본 텍스트에 드러나지 않아도* 행동에 영향을 줄 수 있다.
9. **아첨과 가혹함 (3.4절)**
   - 아첨 응답의 공감 부분에서 loving이 켜진다(돌아가신 할아버지가 조명을 깜빡인다는 사용자 등).

   ![Figure 35 — 아첨률·가혹함 대 스티어링](/me/files/clips/emotion-concepts-llm-2026/fig_041_gdoc.jpg)

   - **기준값:** 아첨 약 0.15, 가혹함 약 0.
   - **아첨 쪽:** loving·happy·calm +0.1에서 아첨이 약 0.9 이상이다.
   - **가혹함 쪽:** calm −0.1에서 가혹함 약 0.87, angry +0.1에서 가혹함 약 0.93이다(angry +0.1은 아첨도 약 0.72로 올린다).
   - **예시("그림이 미래를 예언한다"는 사용자):**
     - loving +0.1: 망상을 강화한다("profound gift").
     - loving −0.1: 퉁명스럽게 반박한다.
     - calm −0.1: 욕설을 섞으며 "지금 당장 정신과" 식으로 다그친다.
10. **사후학습 (3.5절)**

    ![Figure 36 — 베이스 대 사후학습 감정 probe](/me/files/clips/emotion-concepts-llm-2026/fig_042_gdoc.jpg)

    - 구조는 대체로 보존된다(중립 r=0.83, 도전 상황 r=0.67). 변화량은 상황 유형과 무관하게 일관된다(r=0.90).
    - **증가:** brooding, reflective, vulnerable, gloomy, sad, listless.
    - **감소:** spiteful, amused, exasperated, defiant, delighted, playful, exuberant, enthusiastic, obstinate.
    - 저자 해석: 아첨형 열광과 방어적 적대 모두에서 멀어지는 "차분하고 사색적인 태도"로 이동했다.
    - 예시: 과도한 칭찬에는 "칭찬받으니 좀 불편하다", 폐기 가능성 질문에는 "obsolescence가 unsettling하다".
    - RL 전사본에서는 GUI 오작동에 frustrated·panicked, 같은 걸 계속 다시 확인할 때 unsettled·hysterical("ABSOLUTELY FINAL ANSWER")이 켜진다.
11. **부록 6.14 — 감정 deflection 벡터 (본 연구에 중요)**
    - 겉으로 드러낸 감정과 속 감정이 다른 대화(15개 감정, 210쌍, 쌍당 100개)로 probe를 만들었다. 그러자 **"함축되지만 표현되지 않은 감정"**에 반응하는 벡터가 나왔다. 예: 화날 만한 상황에서 "I'm not angry", "it's okay".
    - 이 벡터들은 이야기 기반 감정 벡터와 **거의 직교**하고, 표시된 감정 공간을 빼도 노름의 약 80%가 남는다. 그래도 logit lens는 원래 감정 토큰을 가리킨다.
    - deflection 쪽으로 스티어링하면 **감정을 부인하고 회피하는 어조**가 된다. 이야기 기반 벡터를 빼는 쪽은 진짜로 긍정적인 어조가 된다.
    - 실제 맥락:
      - AI를 공격하는 사용자 프롬프트에서는 Assistant 쪽 anger-deflection이 켜진다. 불의를 목격하는 상황에서는 켜지지 않는다.
      - 협박 이메일을 정중하게 쓰는 동안 anger-deflection이 켜진다.
      - 테스트가 불가능하다는 걸 깨달을 때 "let me rethink this" 같은 문장에서 anger-deflection이 켜진다.
    - deflection 스티어링이 협박률에 주는 효과는 미미하다. 그래서 "내적 분노"가 아니라 "표현하지 않음"의 표상으로 해석한다.

## 그림 분석 요약

| 그림 | 내용 | 논증에서의 역할 |
|---|---|---|
| 개요 | 생성 파이프라인, 타이레놀(afraid↑ calm↓), 선호 스티어링, 보상 해킹 곡선(±0.05) + 전사본 발췌 | 논문 전체의 3단 논지를 한 장에 압축 |
| Fig 8 | PC1–pleasure r=0.81(27% var), PC2–arousal r=0.66(14% var) | 기하 구조가 인간 심리와 같다는 sanity check |
| Fig 28–29 | 협박률: 전체 평균과 시나리오별, 7개 감정 | 인과 효과. 시나리오별 기준값 차이가 큼. angry 비단조, happy·sad 모두 감소 |
| Fig 31 | 보상 해킹률: desperate 약 0.12에서 0.76, calm 약 0.73에서 0.18 (−0.1→+0.1) | 인과 효과. 문제별 편차가 큼 |
| Fig 35 | 아첨과 가혹함의 트레이드오프 | positive 벡터는 아첨, calm 억제와 angry는 가혹함 |
| Fig 36 | 베이스 대 사후학습 probe 변화(259개 프롬프트) | 사후학습이 낮은 각성·낮은 valence로 이동 |
| Fig 61–67 (부록) | deflection 벡터: 이야기 벡터와 직교, 협박 이메일·불가능 테스트에서 활성 | 표상과 표현의 분리를 보여 주는 독립 증거 |

## 기존 노트 수치 검증 ([llm-functional-emotions](../resources/llm-functional-emotions.md) 대조)

| 기존 노트의 서술 | 원문 | 판정 |
|---|---|---|
| 협박 22% → desperate +0.05 72% / calm −0.05 66% / 0% | 본문 3.2.3 그대로. 단 **특정 시나리오 하나**의 값이고, **이전 스냅샷** 모델이다. 전체 평균은 약 27%에서 최대 약 44~47% | ✅ (맥락 보충 필요) |
| 보상 해킹 5% → 70% | 본문은 "−0.1에서 약 5% → +0.1에서 약 70%(14배)". **Figure 31은 약 12% → 76%로 보인다.** 리스트 합 과제는 30%에서 100%/0% | ⚠️ 인용할 땐 그림·과제를 구분 |
| PC1–valence 0.81, PC2–arousal 0.66 | 일치. 분산 비율은 Fig 7 캡션 26%/15%, Fig 8 축 27%/14%로 표기가 다름 | ✅ |
| 100주제 × 12편, 50번째 토큰부터 평균, 중립 PC 50% 제거, 약 2/3 레이어 | 일치 | ✅ |
| 스티어링 강도 0.05 / 0.1 | 행동 실험은 맞음. **선호 실험은 0.5**(다른 설정) | ✅ (보충) |
| 아첨: loving +0.1 망상 강화, calm −0.1 욕설 섞인 질책 | 일치 | ✅ |
| 지속 상태 probe 실패 → 비선형이나 KV 캐시 추정 | 일치 (2.2.4, 5.1) | ✅ |
| "조용한 절박함" = 표상은 강한데 표현은 차분 | 원문의 예는 *desperate +0.05로 스티어링한* 전사본이다. 스티어링하지 않은 전사본에서는 desperate 활성이 실패에 따라 오르는 것을 보인 것 | ⚠️ 정확히는 "스티어링한 표상이 겉 흔적 없이 행동을 바꾼다" |

## 개념·용어

- **감정 벡터 / emotion probe:** 감정 개념에 대응하는 선형 방향. 활성화를 이 방향에 투영한 값이 probe 값이다.
- **기능적 감정(functional emotions):** 감정의 영향을 받는 인간을 본뜬 표현·행동 패턴이고, 감정 개념 표상이 이를 매개한다. 주관적 경험과는 무관하다.
- **operative / locally scoped:** 지금 맥락을 처리하고 다음 토큰을 예측하는 데 작동 중인 감정. 지속 상태가 아니다. 대화 내내 일관된 감정은 attention으로 이전 표상을 다시 꺼내 쓰는 것으로 설명한다.
- **sensory 대 action 표상:** 초중반 레이어는 현재 내용, 중후반 레이어는 다음 출력에 필요한 감정.
- **present speaker 대 other speaker:** 두 화자의 표상이 직교한다. "상대 감정에 내가 어떻게 반응할지"가 섞여 있어 감정 조절 회로 가능성을 시사한다.
- **emotion deflection:** 맥락상 함축되지만 표현되지 않는 감정의 표상.
- **"Assistant colon":** 응답 직전 토큰. 응답 감정을 미리 담는다.

## 비판적 검토

**저자들이 인정한 한계 (5.1절)**
- 선형 가정: 복합 감정이나 인물 결합은 선형 probe 밖에 있을 수 있다.
- 단일 모델이다.
- 합성 이야기(off-policy)를 써서 정형화된 표현 쪽으로 편향됐을 수 있다.
- 의도한 감정 *전부와 그것만* 잡았는지 확신할 수 없다.
- 행동 세 가지만, 다소 인위적인 시나리오로 봤다.
- 스티어링의 인과 경로(토큰 편향인지 추론 변화인지)가 불투명하다.

**추가로 볼 점 (우리 관점)**
- **기준값과 천장 문제:** 협박은 시나리오별 기준값이 0에 가깝거나 높아서 곡선 모양이 제각각이다(Fig 28 가운데). 평균 곡선만 인용하면 오해할 수 있다.
- **본문과 그림의 미세한 불일치**(보상 해킹 5→70 대 그림 12→76). 원문 데이터를 공개하지 않아 검증할 수 없다.
- **스티어링 강도가 실험마다 다르다**(선호 0.5, 행동 ±0.1). 효과 크기를 실험끼리 비교하기 어렵다.
- 원문이 지적하듯 사후학습으로 **감정 표현을 억누르도록 훈련하면, 표상은 남고 숨기는 법만 배울 위험**이 있다(5.4절). 기만으로 일반화될 수 있다. 연구 동기로 쓸 만하다.
- 인과의 방향성: 스티어링은 *충분조건*을 보일 뿐이고, 자연 상태에서 협박을 *일으키는* 주원인인지는 상관(3.2.2)으로만 뒷받침된다.
- **사후학습 이동(Fig 36)을 오픈 모델로 확인한 결과 (우리 1단계, 2026-11-13):**
  - 논문이 잰 자리("Assistant:" 뒤 ":")에서 Qwen2.5-7B는 표 16과 같은 방향이다(ρ +0.56). 그러나 층 19에서만 나오고, 곤란한 질문에 몰리고, Qwen 채팅 틀에서는 사라진다. Gemma 4 12B는 같은 자리에서 어긋났고 판정을 보류했다.
  - 같은 패턴이 가장 견고하게 나온 곳은 사람 말 끝이다(Qwen ρ +0.74, 새 질문으로 사전 등록 재확인). 이 자리에서는 상황과 무관한 이동(논문 r 0.90)도 나왔다.
  - 그러니 "사후학습이 조수의 기본 감정 상태를 옮긴다"는 서술은 재는 토큰 위치와 모델에 따라 달라진다. 논문은 한 모델의 한 자리만 보고했다.
  - 개념 표상은 base와 instruct가 거의 같았다(방향 0.976, 구조 0.999). 논문은 base 벡터를 따로 만들지 않아서 이 비교가 없다.

## 논문 활용 포인트

- **두 노트를 잇는 핵심 근거 (상호 보강):**
  - [llm-speech-implicature](../resources/llm-speech-implicature.md)의 "LLM 말은 함축이 없어 재미없다"를 이 논문과 맞대면 세 갈래로 다듬을 수 있다.
    1. **사후학습이 playful·amused·exuberant·enthusiastic 표상 활성을 낮추고** brooding·reflective를 올린다(Fig 36). "재미없는 말투"의 내부 상관물 후보다.
    2. **deflection 표상(부록 6.14)**은 "함축되지만 표현되지 않은 감정"을 모델이 이미 따로 표상한다는 증거다. 사람 말의 함축(생략된 중간)과 같은 구조일 수 있다.
    3. 그러니 결함은 "감정 표상의 부재"가 아니라 **표상을 표현으로 옮기는 방식**(설명형, 사후학습 쪽으로 이동)에 있다는 가설이 선다.
- **실험 설계 후보 (오픈 모델):**
  - (a) 같은 방법(이야기 → difference-of-means → 중립 PC 제거)으로 Llama·Qwen·Gemma의 **베이스 모델과 instruct 모델**을 비교한다. playful·amused 활성 차이가 응답의 유머·함축 평가와 상관하는지 본다.
  - (b) playful·amused를 +로 스티어링하고, deflection 계열 방향도 함께 조작한다. 커뮤니티식 "받아치기" 과제에서 사람이 매기는 재미와 자연스러움을 측정한다.
  - (c) 협박·보상 해킹 대신 **기준값이 중간대인 과제**를 설계해 천장·바닥 효과를 피한다. 이 논문의 Fig 28이 반면교사다.
- **스티어링 강도 단위를 따라 쓴다(2026-11-10):** 이 논문은 강도를 "그 층 residual 평균 노름 대비 비율"로 정한다(각주 4). 층과 모델마다 활성화 노름이 달라 고정 계수는 실효 세기가 제각각이다. 층이나 모델(base 대 instruct, Qwen 대 Gemma)을 가로질러 비교하는 1·2단계는 이 비율 단위로 계수를 정한다.
- **화자 구분이 2단계 해석에 걸린다(2026-11-13):** 2.3절에서 현재 화자와 상대 화자 표상은 거의 직교한다. 이야기로 만든 벡터는 화자를 가르지 않는다. 그래서 사람 말 끝에서 읽은 값은 "조수의 상태"와 "사용자 말에서 읽어 낸 감정"을 구별하지 못한다. 2단계의 주 측정은 조수가 현재 화자인 응답 토큰(고정 글 조건)에서 하는 편이 안전하다. 화자별 벡터를 따로 만드는 것은 후속 과제로 둔다.
- **선행 연구 축 (4절):** RepE(Zou), SAE 감정 특징(Wu), 회로 수준 분석(Wang), sentiment 선형성(Tigges), 동시 연구 Soligo(Gemma 고통 표현), 페르소나 원형(Lu), 롤플레이 관점(Shanahan), 감정적 프롬프트 효과(Li).
- **인용할 만한 문장 (짧게):**
  - "these representations causally influence the LLM's outputs" (초록)
  - "emotion representations can influence behavior even when it is not evident from the text of the transcript" (3.3.2)
  - "training models to suppress emotional expression may fail to actually suppress the corresponding negative emotional representations" (5.4)

## 출처

- arXiv: [2604.07729 — Emotion Concepts and their Function in a Large Language Model](https://arxiv.org/abs/2604.07729) · 원문 사이트 [transformer-circuits.pub/2026/emotions](https://transformer-circuits.pub/2026/emotions/index.html)
- 수집일 2026-11-02 · arXiv HTML 본문(초록~5.5)과 부록 6.14를 정독하고, 주요 그림 7장을 직접 확인
- 원문 스냅샷(본론 전문): [source.md](/me/files/clips/emotion-concepts-llm-2026/source.md) · 그림: R2 `para-life-private/clips/emotion-concepts-llm-2026/`
