---
id: "ernf-tech-eval"
title: "ERNF 기술 평가 Metric 시스템"
status: "active"
priority: "high"
visibility: "limited"
area: "ernf"
goal: "새로운 AI 이미지 생성 기술의 성능 비교 기준/방법 수립 및 자동 반복 평가 파이프라인 구축"
deadline: ""
createdAt: "2026-04-02"
updatedAt: "2026-04-02"
tags: ["ernf", "evaluation", "benchmark", "automation"]
relatedResources: []
---

## Overview

다양한 AI 이미지 생성 모델(Grok, NBP, NB2, GPT1.5, Flux.2 Pro, QWEN 2511, seedream 5L, wan 2.7 등)이 빠르게 등장하는 상황에서, 동일 조건으로 성능을 비교할 수 있는 표준 평가 체계를 구축하고, 새 모델이 나올 때마다 자동으로 벤치마크를 수행할 수 있도록 하는 프로젝트.

## Tasks

- [ ] 평가 기준 항목 정의 (캐릭터 일관성, 프롬프트 준수도, 디테일, 스타일 재현 등)
- [ ] 표준 테스트 프롬프트 셋 설계
- [ ] 모델별 API/워크플로우 연동 방법 조사
- [ ] 자동 생성 파이프라인 구축 (동일 프롬프트 → 다중 모델 → 결과 수집)
- [ ] 결과 비교 대시보드/리포트 형식 설계
- [ ] 첫 번째 벤치마크 실행 및 결과 정리

## Resources

- [모델 비교 샘플](https://kyxi.net/projects/ernf-tech-eval/model-comparison-sample.webp) — 8개 모델 동일 프롬프트 비교

## Progress Log

### 2026-04-02

- 프로젝트 생성 및 태스크 등록
