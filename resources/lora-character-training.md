---
id: "lora-character-training"
title: "LoRA 캐릭터 학습"
topic: "LoRA Training"
visibility: "limited"
source: "Arca"
createdAt: "2026-03-29"
tags: ["lora", "sdxl", "character", "training", "ernf"]
area: "ernf"
relatedProjects: ["ernf-learning"]
---

## 요약

SDXL 기반 2D 캐릭터 LoRA 학습 시 주요 고려사항 모음. 비대칭 의상 처리, 데이터셋 태깅, rank 설정 등.

## 참고자료

### SDXL 2D 캐릭터 학습하면서 배운 점
- 링크: https://arca.live/b/hypernetworks/166123122?p=1
- 요약: SDXL 캐릭터 LoRA 학습 시 비대칭 의상 처리와 의상 디테일 향상에 대한 실전 경험 정리
- 요점:
  - **비대칭 의상이 대칭으로 나오는 문제**
    - flip augmentation이 켜져있으면 비대칭이 대칭으로 학습됨 → 반드시 비활성화
    - 총 step 수 부족 가능성: 정면 이미지 > 후면 이미지 비율일 때, 후면+from behind 태그 연관성 학습에 더 많은 step 필요
    - 비대칭 위치가 고정 안 되면(찐빠 많으면) step 수를 늘려볼 것
  - **클로즈업 샷 넣었는데 디테일이 안 나오는 문제**
    - 태그 문제: 단부루 태그를 그대로 쓰지 말고, 사전학습 모델로 해당 태그가 원하는 구도를 만드는지 먼저 테스트할 것
    - Rank 크기 문제: rank 8→16→32로 높일수록 의상 디테일 표현이 정교해짐
    - 부위별 클로즈업 + 높은 rank 조합이 전신/상반신 샷 디테일에 효과적
