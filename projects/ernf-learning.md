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
updatedAt: "2026-03-31"
tags: ["ernf", "learning"]
relatedResources: ["lora-character-training"]
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

## Progress Log

### 2026-03-31

- tag-supporter 배포 완료 (https://tag-supporter.pages.dev/)
- **prompt-gallery 배포 진행중**
  - Cloudflare Tunnel이 현재 아키텍처(로컬 PC, SQLite, Meilisearch)에 가장 적합한 외부 서빙 방법임을 분석 — Tailscale 없이 브라우저만으로 협업자 접근 가능
  - MCP 서버 구축 완료 — 10개 도구(검색/CRUD/태그/즐겨찾기) 제공, Claude Code·Cursor 등 AI 에이전트가 갤러리 직접 조작 가능, ComfyUI/NovelAI/Nanobanana 파이프라인 자동 업로드 지원
  - README 업데이트 — MCP 서버 사용법(아키텍처, 설치, 설정, 예시)과 Cloudflare Tunnel 옵션 문서 반영

### 2026-03-23

- 프로젝트 생성 및 태스크 등록
