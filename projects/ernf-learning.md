---
id: "ernf-learning"
title: "ERNF 학습"
status: "active"
priority: "medium"
visibility: "limited"
area: "ernf"
goal: "ERNF 관련 기술 학습 및 도구 배포"
deadline: ""
createdAt: "2026-03-23"
updatedAt: "2026-04-22"
tags: ["ernf", "learning"]
relatedResources: ["lora-character-training", "anima-prompting"]
---

## Overview

ERNF 관련 학습 및 도구 개발/배포 프로젝트.

## Tasks

- [x] tag-supporter 배포하기 — https://tag-supporter.pages.dev/
- [ ] XYZ 워크플로우 만들기
- [ ] anima 스타일 학습하기
- [ ] anima 케릭터 학습하기
- [ ] wai 스타일 학습하기
- [ ] prompt gallery 배포하기
- [ ] 워크플로우에 prompt gallery 연동시키기

## Resources

- [LoftA 포즈 탐구 레퍼런스](https://kyxi.net/projects/ernf-learning/lofta_pose_exploration.png)
- [Anima Preview 2 프롬프팅](https://kyxi.net/resources/anima-prompting/sample-maid.png) — 퀄리티 태그 민감도, 아티스트 태그 활용 팁
- [see-through 테스트 결과](https://kyxi.net/projects/ernf-learning/see-through-test-results.png) — depth map 기반 see-through 효과 ([repo](https://github.com/shitagaki-lab/see-through))
- anima 케릭터 LoRA 2차 결과물 — [레퍼런스](https://kyxi.net/projects/ernf-learning/anima-lora-char-2nd-reference.png), [00115](https://kyxi.net/projects/ernf-learning/anima-lora-char-2nd-00115.png), [00116](https://kyxi.net/projects/ernf-learning/anima-lora-char-2nd-00116.png), [00117](https://kyxi.net/projects/ernf-learning/anima-lora-char-2nd-00117.png)

## Progress Log

### 2026-04-22

- **anima 케릭터 LoRA 2차 학습 결과물 공유** — 레퍼런스 캐릭터(FANTYPIE 워터마크) 기반 테스트 샘플 3장 (00115/00116/00117). 선글라스·초커·오픈 재킷·헤테로크로미아 등 핵심 디테일 재현 확인
  - 1차 대비 파라미터 변경: learning rate 0.0005 → 0.0001 (1/5로 감소), rank 2배, alpha 2배

- **see-through serverless 연동 완료!** ([워커 현황](https://kyxi.net/projects/ernf-learning/see-through-serverless-workers.png))
  - RunPod serverless (Queue based) 엔드포인트 구동 확인
  - RTX 5090 워커 5대 (US 3, IS 1, NO 1) initializing/throttled 상태
  - network volume 제약 → 컨테이너 이미지 베이킹 방식으로 전환하여 해결한 것으로 보임

### 2026-04-13

- **see-through serverless — network volume 제약 확인**
  - RunPod serverless에서 대부분 GPU 티어가 Unavailable 상태 ([스크린샷](https://kyxi.net/projects/ernf-learning/runpod-serverless-gpu-availability.png))
  - 24GB PRO만 사용 가능, 48GB PRO는 Low Supply, 나머지 전부 Unavailable
  - network volume은 특정 데이터센터/GPU에 종속되어, 가용 GPU가 없으면 워커 스케일업 불가
  - 결론: network volume 방식은 현실적 제약이 큼 → 모델을 컨테이너 이미지에 직접 베이킹하는 방향 검토 필요

### 2026-04-10

- **see-through runpod 환경 구축** — 새 pod 생성 → 환경세팅 → `inference_psd` 실행까지 약 1시간 10분 소요 (향후 자동화/이미지화 필요)
- **see-through VRAM 요구량 측정**
  - 1024 해상도: VRAM 16GB
  - 2048 해상도: VRAM 22GB
- **see-through 모델 캐시 크기** (총 ~12.6GB, `/workspace/.cache/huggingface/hub/`)
  - `24yearsold/seethroughv0.0.1_marigold` — 3.1GB
  - `frankjoshua/juggernautXL_version6Rundiffusion` — 126KB (메타데이터만)
  - `layerdifforg/seethroughv0.0.2_layerdiff3d` — 9.5GB
  - → 컨테이너 이미지 베이킹 시 모델 사전 다운로드 필요, 콜드 스타트 최소화 고려
- **see-through serverless 작업 진행중** — Docker 컨테이너 내에서 requirements 설치 시 네트워크 이슈 발생
  - `pip install -r requirements.txt` 실행 시 `timm @ git+https://github.com/huggingface/pytorch-image-models@...` 라인에서 실패
  - 에러: `fatal: unable to access 'https://github.com/huggingface/pytorch-image-models/': Could not resolve host: github.com`
  - 원인: 컨테이너 내부에서 pip 서브프로세스가 git clone 시점에 github.com resolve 실패 (네트워크/DNS 설정 문제)
  - **해결**: 문제 패키지만 수동 클론 후 로컬 설치 → 나머지는 requirements로 설치
    ```bash
    git clone https://github.com/huggingface/pytorch-image-models /tmp/timm-src
    cd /tmp/timm-src
    git checkout 6e3fdda39508db30766f9d9e6ec32380ebee8b8c
    pip install .
    # 이후 requirements.txt 정상 설치
    pip install -r requirements.txt
    ```

### 2026-04-01

- see-through 테스트 진행 — depth map 기반 see-through 효과 도구 ([repo](https://github.com/shitagaki-lab/see-through), [결과 공유](https://ernf.slack.com/archives/C0AGLFBJS2G/p1775048457971849))

### 2026-03-31

- tag-supporter 배포 완료 (https://tag-supporter.pages.dev/)
- **prompt-gallery 배포 진행중**
  - Cloudflare Tunnel이 현재 아키텍처(로컬 PC, SQLite, Meilisearch)에 가장 적합한 외부 서빙 방법임을 분석 — Tailscale 없이 브라우저만으로 협업자 접근 가능
  - MCP 서버 구축 완료 — 10개 도구(검색/CRUD/태그/즐겨찾기) 제공, Claude Code·Cursor 등 AI 에이전트가 갤러리 직접 조작 가능, ComfyUI/NovelAI/Nanobanana 파이프라인 자동 업로드 지원
  - README 업데이트 — MCP 서버 사용법(아키텍처, 설치, 설정, 예시)과 Cloudflare Tunnel 옵션 문서 반영

### 2026-03-23

- 프로젝트 생성 및 태스크 등록
