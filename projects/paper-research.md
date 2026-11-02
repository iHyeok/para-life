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
updatedAt: "2026-11-02"
tags: ["paper", "research", "llm", "writing"]
relatedResources: ["llm-speech-implicature", "llm-functional-emotions", "emotion-concepts-llm-2026"]
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
