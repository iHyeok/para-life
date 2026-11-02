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
