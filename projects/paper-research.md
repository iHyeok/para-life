---
id: "paper-research"
title: "논문 분석 및 작성 (가제)"
status: "active"
priority: "medium"
visibility: "private"
area: "ai-study"
goal: "링크·논문에서 쌓은 지식 노트를 바탕으로 토론하며 논문 주제를 잡고 초안을 작성"
deadline: ""
createdAt: "2026-11-02"
updatedAt: "2026-11-03"
tags: ["paper", "research", "llm", "writing"]
relatedResources: ["llm-speech-implicature", "llm-functional-emotions", "emotion-concepts-llm-2026", "big-five-steering-asymmetry-2026"]
---

## Overview

링크로 받은 글·그림·논문을 지식 노트(`resources/`, `kind: "knowledge"`)로 쌓고, 그 노트들을 근거로 토론하면서 논문의 연구 질문·가설·구성을 다듬어 가는 프로젝트. 주제·제목은 토론하면서 확정한다.

## Tasks

- [ ] 연구 주제 후보 정리 (지식 노트의 "논문 활용 포인트" 모으기)
- [ ] 관련 선행 연구 수집 (논문 링크 → 지식 노트)
- [ ] 연구 질문·가설 확정
- [ ] 논문 개요(목차) 작성
- [ ] 초안 작성

## Knowledge Base

- [LLM의 말은 왜 재미가 없을까 — 함축·감정·'중간' 논지](../resources/llm-speech-implicature.md) — LLM 화법의 함축 부재, 유머·재미, 클리셰
- [LLM의 기능적 감정 (Anthropic, 2026)](../resources/llm-functional-emotions.md) — 감정 표상·스티어링·정렬 사례, 학위 주제 3방향, 표상 대 표현
- [[논문] Emotion Concepts and their Function in a LLM (Sofroniew et al., 2026)](../resources/emotion-concepts-llm-2026.md) — 원문 정독 노트: 방법·수치·그림, 수치 검증표, deflection 벡터, 사후학습의 감정 이동
- [[논문] Behavioural Asymmetry Across Activation Interventions for Big Five Personality Control (Sheta, 2026)](../resources/big-five-steering-asymmetry-2026.md) — ActAdd만 양방향, 시스템 프롬프트가 더 강함(~72%), 신경성 저항, 프로브 방향 ≠ 인과 방향

## 실험 계획

실행 저장소: [iHyeok/persona-emotion-gate](https://github.com/iHyeok/persona-emotion-gate) (private). 5090 PC에서 pull 받아 실행하고, 결과 요약은 그 저장소의 `results/`에 쌓는다. 상세 계획은 저장소의 `PLAN.md`에 있다.

- **연구 질문:** 페르소나를 바꿀 때 감정 *표상*은 그대로이고 *표현*만 바뀌는가(게이트), 표상 자체가 바뀌는가(생성기)? 페르소나 전환은 프롬프트와 활성화 스티어링 두 방식으로 비교한다.
- **언어:** 기제는 영어로 확인, 평가는 한국어로 확장
- **0단계 (진행 예정):** 새 venv 구축 + Persona Vectors 재현(Qwen2.5-7B-Instruct, 공식 코드 커밋 b8e0f04). 판정은 OpenAI gpt-4.1-mini라 키가 필요. 공식 고정 버전(torch 2.6/vllm 0.8.5)은 5090에서 올려야 함. 성공 기준: evil 최적 층 20 근처, 계수에 따라 특성 점수 단조 증가
- **1단계:** base 대 instruct 감정 벡터 비교 (Qwen2.5-7B, Gemma 4 12B)
- **2단계:** 기본 / 프롬프트 페르소나 / 스티어링 페르소나 조건에서 감정 표상·표현 측정 (+ Qwen3.8-27B, RunPod)
- **3단계:** 한국어 함축·유머 평가

## Progress Log

### 2026-11-02

- 프로젝트 생성, 첫 지식 노트 연결 (LLM 화법과 함축)
- claude.ai 대화(Anthropic 기능적 감정 논문 토론)를 지식 노트로 정리
  - 후보 방향: 오픈 모델 인과 효과 재현 / 비선형 지속 상태 / 감정 벡터 시계열 탐지기
  - 두 노트를 잇는 가설: "LLM 대화가 밋밋한 건 감정 표상이 없어서가 아니라 표현이 억제되거나 설명형으로 바뀌어서"
- 원 논문(arXiv 2604.07729) 정독 노트 작성, 기존 노트 수치 대조(대부분 일치, 3건 보정)
  - 가설을 받치는 근거 두 가지: 사후학습 뒤 playful·amused·enthusiastic 표상 감소(Fig 36), "표현되지 않은 감정" deflection 표상(부록 6.14)
  - 실험 후보: 오픈 모델의 base와 instruct 감정 표상을 비교하고 유머·함축 평가와의 상관을 본다. 기준값이 중간대인 과제로 설계한다
- 전담 채팅 세션 마련: multichat "Paper" 채팅 ↔ 프로젝트 세션(필요할 때만 실행, `scripts/session.sh start paper`, 브리프 `sessions/paper/brief.md`). 토론은 이 세션에서 이어 가고, 맥락은 이 Progress Log와 지식 노트에 남긴다
- 토론: "감정 벡터가 있어도 표출하려면 페르소나가 필요한가?" → MBTI×LLM 선행 연구 조사 (초록·검색 요약 수준, 본문 미확인)
  - MBTI 측정·주입 연구: Huang 외 2023(ChatGPT ENFJ, 페르소나·기분 유도로도 잘 안 바뀜 — 프롬프트 페르소나의 반례), Machine Mindset(2312.12999), MBTI-in-Thoughts(2509.04343), InCharacter(ACL 2024)
  - 더 가까운 축: Assistant Axis(Lu 외 2026, 2601.10387), Persona Vectors(Chen 외 2025), Big Five 스티어링(신경증은 잘 안 움직임), 리뷰(2510.04484): 감정 표현 연구는 적음
  - 가설 재정식화(제안): "페르소나가 있어야 표출"이 아니라 "기본 Assistant 페르소나가 표출을 억제하고, 다른 페르소나로 옮기면 같은 표상이 표현으로 풀린다". 실험은 페르소나 전환 시 표상 불변·표현 변화(게이트) 대 표상 자체 변화(생성기)를 구분하고, 프롬프트 페르소나와 스티어링 페르소나를 함께 비교
  - 측정 도구는 Big Five/persona vector 권장, MBTI는 페르소나 프롬프트 재료로만 쓰기를 권장 (심리측정 타당도 문제)
  - 다음 후보: Assistant Axis, Persona Vectors, Huang 외를 지식 노트로 정독
- 학습용 설명 영상 2편 제작 (Manim 모션 그래픽 + Fish Audio 내레이션 보이스1, 무료 모델 `s2.1-pro-free`)
  - [① Persona Vectors (Chen 외 2025, arXiv 2507.21509)](/me/files/projects/paper-research/01-persona-vectors.mp4) 4:35 · [대본·근거표](/me/files/projects/paper-research/01-persona-vectors-script.md) — 본문 전체 기반
  - [② Big Five 스티어링 ("The Steerable Self", ICML 2026 MusIML 워크숍)](/me/files/projects/paper-research/02-big-five-steering.mp4) 3:27 · [대본·근거표](/me/files/projects/paper-research/02-big-five-steering-script.md) — 본문 미확보(OpenReview 차단), 초록 2개만 근거. 대비로 Hoppe 외(arXiv 2603.03326) 슬라이더 연구 포함
  - 확인된 사실: Big Five 논문은 본 학회가 아니라 워크숍 발표, 프롬프팅 비교는 초록에 없음, "약 25%"가 상대·절대 증가인지 불명. Hoppe 외는 신경성을 2.88→4.1로 올려 "신경성은 안 움직인다"와 충돌하지만 조건이 달라 직접 비교 불가
- 토론: 스티어링 연구의 대상 모델 → 기제 실험(표상·스티어링·게이트 대 생성기, base 대 instruct)은 활성화 접근이 되는 오픈 모델(7~8B, 예: Qwen2.5-7B·Llama-3.1-8B, 24GB GPU 1장 수준)로 하고, 프론티어 모델은 API로 프롬프트 페르소나의 행동 수준 비교군으로 쓰는 2단 구성 제안. 한계: 소형 모델 결과의 일반화. 사용자 GPU 환경 확인 대기
- 실험 환경: RTX 5090(32GB) 자유 사용, 필요 시 RunPod 대여 검토. 사용자가 이미 돌려 본 모델: Qwen 3.8 flash next, 27B급, muse glimmer, gemma4
  - 제안: 모델 선정 기준은 ① base·instruct 체크포인트 쌍 공개 ② 선행 연구와 겹침(재현 가능) ③ 첫 라운드는 dense. 주 실험은 7~12B bf16(5090), 27B 이상은 RunPod 80GB로 규모 점검(4비트 양자화는 방향 추정 영향 때문에 주 실험 비추)
  - 단계: 0) Persona Vectors 재현(Qwen2.5-7B/Llama-3.1-8B) → 1) base 대 instruct 감정 벡터 비교 → 2) 프롬프트 페르소나 대 페르소나 벡터 조건에서 감정 표상·표현을 따로 측정(게이트 대 생성기) → 확장(최신 모델, 대형 모델)
  - 언어: 기제는 영어로 확인 후 한국어 함축·유머 평가로 확장하는 순서 제안(차별점 후보)
  - 미확인: Qwen 3.8 flash next·muse glimmer의 구조(dense/MoE)와 base 공개 여부 — 사용자 답변 대기
- 결정: 언어는 영어로 기제 확인 → 한국어로 함축·유머 평가. 모델 사양은 사용자가 모델을 구동한 다른 Claude 세션에 질문지(모델별 repo·구조·base 공개 여부·실행 방식·양자화·hook 가능 여부, 환경, 추천)로 확인하기로 함

### 2026-11-03

- 모델·환경 조사 결과 받음(사용자 박스의 다른 Claude 세션이 작성): 지금까지는 전부 GGUF(llama.cpp/Ollama) 추론이었고, transformers bf16 로드나 hook 경험은 없음. 해석 도구도 설치돼 있지 않음
  - 환경: RTX 5090 32GB(WSL2 Ubuntu 24.04, RAM 118GB, SSD 여유 1.2TB). GPU를 ComfyUI와 함께 쓰므로 10분 넘는 추출은 리스(`POST /api/resource/lease`)를 먼저 받아야 함. nvcc 경로 주의(/usr/local/cuda-13.0)
  - base·instruct 쌍이 있는 모델: Gemma 4 12B(5090 bf16은 빡빡함, 멀티모달 통합 클래스라 transformers 5.x 필요, SAE 없음), Llama-3-8B. Qwen3.8-27B와 Muse Glimmer 30B는 base 미공개, Qwen3.8-Flash-Next는 MoE(180B)
  - Llama-3.1-8B는 HF 접근 403(승인 필요). Qwen2.5-7B는 접근 확인
- 모델 배치 제안: 0 재현은 Qwen2.5-7B-Instruct → 1 base 대 instruct는 Qwen2.5-7B 주력에 Gemma 4 12B(최신 모델 확인) → 2 페르소나 전환은 base 불필요라 Qwen3.8-27B(dense, Apache-2.0)를 RunPod H100에서 bf16으로 추가. 연구용 venv 새로 만들기. 할 일: Llama-3.1-8B 접근 신청, Qwen3-8B-Base 공개 여부 확인
- 실험 계획 문서 위치 확인 대기 (이 파일의 섹션 대 별도 파일)
- 실험 계획 섹션 추가, 실행용 private 저장소 `iHyeok/persona-emotion-gate` 생성(PLAN.md, 실행 담당 Claude용 CLAUDE.md, setup_env.sh, 스모크 테스트). 5090 PC에서 pull 받아 0단계부터 실행
- Big Five 스티어링 논문 본문 정독(OpenReview 로그인 후 Chrome) → 지식 노트 `big-five-steering-asymmetry-2026`
  - 영상 ② 제작 때 초록만 보고 판단한 것 정정: **시스템 프롬프트·few-shot도 비교했고, 시스템 프롬프트가 가장 강함(천장 ~72%)**. 모델은 Llama-3.2-3B / 3.1-8B Instruct, 최적 층 L12 / L14
  - 가설과의 연결: 감정과 가장 가까운 신경성이 양방향 모두 저항하고, α<0에서 perplexity가 2배 → 게이트 가설의 정황 증거. 단 "판정 모델이 화용 단서를 못 잡는다"는 대안 설명을 배제해야 함
  - 설계 교훈: 프로브로 읽히는 방향 ≠ 행동을 바꾸는 방향 → 2단계의 "표상" 측정은 평균차 사영·프로브·인과 스티어링 세 가지로 함께 본다
  - Huang 외 2023(페르소나 지정해도 MBTI 자기보고 불변)과 긴장: 자기보고 대 생성 텍스트 판정이라는 측정 차이. "말로 묻는 성격 ≠ 글에 드러나는 성격"
