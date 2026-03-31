---
id: "para-app"
title: "PARA Life Management App"
status: "active"
priority: "high"
visibility: "public"
area: "dev-career"
goal: "PARA 기반 생활관리 웹앱 MVP 완성 및 Cloudflare 배포"
deadline: ""
createdAt: "2026-03-22"
updatedAt: "2026-03-31"
tags: ["para", "cloudflare", "web"]
relatedResources: []
---

## Overview

PARA methodology based life/task management system.
- Data: Markdown/JSON files in GitHub repo
- Frontend: Cloudflare Pages
- Integration: Claude Code via file-based CRUD, Telegram bot

## Tasks

- [x] Define repo structure and data schema
- [x] Build Cloudflare Pages frontend (dashboard)
- [x] Set up GitHub Actions for auto-deploy
- [x] Visibility 기반 접근 제어 (public/limited/private + /me/ 대시보드)
- [x] Cloudflare Access 인증 (/me/* 보호)
- [x] PARA-SPEC.md 명세서 작성
- [x] /para 글로벌 스킬 생성
- [x] Phase 0-1: tmux 환경 구성 (launchd 자동시작)
- [x] Phase 0-2: Cloudflare Tunnel 구성 (api.kyxi.net → localhost:3847)
- [x] Phase 0-3: fakechat Channel 체험 및 검증
- [x] Phase 1: Custom Channel MCP Server 개발
- [x] Phase 2: para-life 채팅 UI + Cloudflare Tunnel 외부 접속 + Access 인증
- [x] Phase 3: para-life 자동 업데이트 연동 (CLAUDE.md, 크로스 프로젝트 규칙)
- [ ] Phase 4: 고도화 (프로젝트별 채널 분리, 알림 통합, 브리핑)
- [ ] Implement PARA CRUD operations
- [ ] Add daily log feature

## Progress Log

### 2026-03-22

- Initial repo structure and schema created
- Astro frontend built (dark theme, dashboard with stats/cards, detail pages)
- Cloudflare Pages deployment complete
- GitHub auto-deploy configured (push to main triggers rebuild)
- Telegram integration working (Claude Code manages data via chat)

### 2026-03-23

- Visibility 접근 제어 구현 (public/limited/private)
- /me/ 인증 대시보드 및 상세페이지 생성
- Cloudflare Access 연동
- PARA-SPEC.md 시스템 명세서 작성
- /para 글로벌 스킬 생성 (~/.claude/skills/para/)

### 2026-03-31

- Orchestrator 로드맵 수립 (Phase 0~4)
- Phase 0-1: tmux 환경 구성 완료 (dev 세션, launchd 자동시작)
- Phase 0-2: Cloudflare Tunnel 구성 완료 (api.kyxi.net, 도메인 kyxi.net)
- 로드맵 문서 추가 (docs/orchestrator-roadmap.md)
- Phase 0-3: fakechat 채널 검증 완료 (브라우저↔CC 양방향 통신, tmux detach 유지 확인)
- Phase 1: Custom Channel MCP Server 개발 완료
  - channel/server.ts 작성 (fakechat 기반, 포트 3847, 다크테마 UI)
  - 핵심 발견: `--channels` 대신 `--dangerously-load-development-channels server:name` 단독 사용이 올바른 방법
  - fakechat 수정 방식은 무결성 체크로 인해 불가 → .mcp.json에 별도 서버로 등록
  - tmux 시작 스크립트에 자동 실행 반영
- Phase 2: 채팅 UI + 외부 접속 완료
  - Cloudflare Tunnel 경유 api.kyxi.net → localhost:3847 동작 확인
  - Cloudflare Access 인증 설정 (api.kyxi.net 보호)
  - 한글 IME 중복 전송 버그 수정
- Phase 3: 자동 업데이트 연동 완료
  - CLAUDE.md 작성 (오케스트레이터 역할, 쓰기 권한, 크로스 프로젝트 참조 규칙)
  - 채팅 경유 PARA 데이터 관리 동작 확인
- 채널 UI 개선
  - Thinking indicator (... 애니메이션)
  - Permission relay (채팅 UI에서 Allow/Deny 승인)
  - 메시지 히스토리 (새로고침 시 이전 대화 유지, 최대 200개)
