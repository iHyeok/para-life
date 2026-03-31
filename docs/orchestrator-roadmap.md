# Para-Life Orchestrator 개발 로드맵

## 배경 및 목표

### 해결하려는 문제

3~5개 개발 프로젝트를 동시에 진행하면서, 외부(모바일, 원격)에서도 프로젝트 전체를 조감하고 관리할 수 있는 환경이 필요하다.

개별 프로젝트의 코딩은 각각의 Claude Code 세션(Web/CLI)에서 수행하되, **크로스 프로젝트 관점의 비서** 역할을 하는 AI 인터페이스를 para-life에 통합한다.

### 핵심 기능

- para-life 웹 대시보드에서 AI 채팅으로 프로젝트 상태 조회, 우선순위 관리, 진행 기록
- Claude Code Channel을 통해 Mac Mini의 로컬 Claude Code 세션과 양방향 통신
- 작업 완료 시 para-life 마크다운/JSON 자동 업데이트 및 git push 자동 배포
- 모바일/원격에서 브라우저만으로 전체 프로젝트 관리 가능

### 아키텍처 개요

```
[para-life 채팅 UI]           [개별 코딩 작업]
  (Cloudflare Pages)            ├── Claude Code Web: tag-supporter
        │                       ├── Claude Code Web: prompt-gallery
        │ WebSocket             └── Claude Code CLI: comfy-pilot
        │
  [Cloudflare Tunnel]
        │
        ▼
[Mac Mini]
  ├── Custom Channel MCP Server
  │     ├── WebSocket 서버 (para-life UI 연결)
  │     ├── MCP channel push (메시지 → Claude Code)
  │     └── reply tool (Claude Code 응답 → WebSocket)
  │
  └── Claude Code (tmux 내 상시 실행)
        --channels para-life-channel
        --dangerously-load-development-channels
        cwd: ~/para-life
```

---

## Phase 0: 인프라 기반 세팅

### 0-1. Mac Mini tmux 환경 구성

**목표**: Claude Code가 항상 살아있는 백그라운드 환경 구축

```bash
# tmux 세팅 스크립트 생성: ~/scripts/start-dev-env.sh
#!/bin/bash

SESSION="dev"

# 이미 세션이 있으면 attach만
tmux has-session -t $SESSION 2>/dev/null
if [ $? -eq 0 ]; then
    echo "Session '$SESSION' already exists. Attaching..."
    tmux attach -t $SESSION
    exit 0
fi

# 새 세션 생성
tmux new-session -d -s $SESSION -n orchestrator -c ~/para-life
tmux new-window -t $SESSION -n tag-supporter -c ~/projects/tag-supporter
tmux new-window -t $SESSION -n prompt-gallery -c ~/projects/prompt-gallery
tmux new-window -t $SESSION -n comfy-pilot -c ~/projects/comfy-pilot

tmux attach -t $SESSION
```

- 시스템 부팅 시 자동 시작 (launchd 또는 crontab `@reboot`)
- orchestrator 윈도우에서 Claude Code + Channel 실행

### 0-2. Cloudflare Tunnel 구성

**목표**: Mac Mini 백엔드를 안전하게 외부 노출

```bash
# cloudflared 설치 및 터널 생성
brew install cloudflared
cloudflared tunnel create para-life-api

# config.yml
tunnel: <TUNNEL_ID>
credentials-file: ~/.cloudflared/<TUNNEL_ID>.json
ingress:
  - hostname: api.para-life.pages.dev
    service: http://localhost:3847
  - service: http_status:404
```

- 포트 3847: Custom Channel WebSocket 서버용
- Cloudflare Access로 인증 보호 (기존 para-life의 /me/ 인증 체계 활용)

### 0-3. fakechat 체험

**목표**: Channel 아키텍처 이해 및 동작 확인

```bash
# fakechat 플러그인 설치
/plugin install fakechat@claude-plugins-official

# Channel 모드로 Claude Code 시작
claude --channels plugin:fakechat@claude-plugins-official

# 브라우저에서 localhost로 접속하여 채팅 테스트
```

검증 항목:
- [ ] 브라우저에서 메시지 전송 → Claude Code 세션에서 수신 확인
- [ ] Claude Code 응답이 브라우저에 표시되는지 확인
- [ ] 파일 읽기/수정 같은 도구 사용이 채널을 통해 정상 동작하는지 확인
- [ ] tmux에서 세션을 detach 후 재 attach 시 채널이 유지되는지 확인

---

## Phase 1: Custom Channel MCP Server 개발

### 1-1. 프로젝트 구조

```
para-life-channel/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          # MCP 서버 엔트리포인트
│   ├── websocket.ts      # WebSocket 서버 (para-life UI 연결)
│   ├── channel.ts        # MCP channel 이벤트 push/reply 로직
│   └── auth.ts           # 연결 인증 (Cloudflare Access JWT 검증)
└── README.md
```

### 1-2. MCP Channel 서버 핵심 구현

fakechat 소스를 참고하여 커스텀 채널 구현. 핵심 요구사항:

**MCP 서버 초기화**
- `@modelcontextprotocol/sdk` 패키지 사용
- `claude/channel` capability 선언 (양방향 통신)
- `claude/channel/permission` capability 선언 (원격 권한 승인)
- stdio transport (Claude Code가 subprocess로 실행)

**WebSocket 서버**
- 포트 3847에서 WebSocket 수신
- para-life UI로부터 메시지 수신 → MCP notification으로 Claude Code에 push
- Claude Code의 reply tool 호출 → WebSocket으로 응답 전달

**인증**
- Cloudflare Access JWT 토큰 검증
- 허용된 sender만 메시지 push 가능

**핵심 흐름**
```
[para-life UI] → WebSocket → [channel server]
  → notifications/claude/channel (MCP) → [Claude Code]
  → Claude 처리 → reply tool 호출 → [channel server]
  → WebSocket → [para-life UI]
```

### 1-3. Permission Relay 구현

Claude Code가 파일 수정 등 권한이 필요한 작업을 할 때, 원격에서 승인/거부 가능하도록:

- `notifications/claude/channel/permission_request` 수신
- para-life UI에 승인 프롬프트 표시
- 사용자 응답을 `notifications/claude/channel/permission`으로 반환

---

## Phase 2: para-life 채팅 UI 개발

### 2-1. UI 컴포넌트

para-life의 기존 Astro 사이트에 채팅 인터페이스 추가.

**위치**: `/me/chat` 경로 (Cloudflare Access로 보호됨)

**기능 요구사항**:
- WebSocket 연결 관리 (연결/재연결/상태 표시)
- 메시지 송수신 및 스트리밍 응답 표시
- Permission 승인 프롬프트 UI
- Claude Code 세션 상태 표시 (연결됨/끊김)
- 모바일 반응형 (외출 시 폰으로 사용)

**기술 선택지**:
- Astro island으로 React/Svelte 채팅 컴포넌트 삽입
- 또는 별도 SPA로 `/me/chat` 경로에 배포

### 2-2. 연결 관리

- Cloudflare Tunnel 경유 WebSocket 연결
- 자동 재연결 (지수 백오프)
- 연결 끊김 시 상태 표시 ("Mac Mini 오프라인" / "Claude Code 세션 종료됨")
- 오프라인 중 입력한 메시지는 큐에 저장 후 재연결 시 전송

---

## Phase 3: para-life 자동 업데이트 연동

### 3-1. Claude Code가 para-life를 직접 관리

Claude Code 세션의 cwd가 `~/para-life`이므로, 채팅을 통한 지시로 직접 파일을 수정할 수 있다.

**예시 대화 흐름**:
```
사용자: "zopper 프로젝트 EM 신호 수집 완료 처리해줘"

Claude Code 동작:
1. projects/em-side-channel.md의 Tasks에서 해당 항목 체크
2. Progress Log에 오늘 날짜로 기록 추가
3. projects/_index.json의 updatedAt 갱신
4. git add, commit, push (자동 배포)
```

### 3-2. CLAUDE.md 설정

`~/para-life/CLAUDE.md`에 para-life 운영 규칙을 명시하여 Claude Code가 데이터 스키마와 운영 방식을 이해하도록 한다.

내용:
- PARA-SPEC.md 전체 참조
- 데이터 수정 시 _index.json과 .md 동기화 필수
- commit convention 준수
- visibility 규칙
- 프로젝트 상태 전환 규칙 (active → completed → archived)

### 3-3. 크로스 프로젝트 참조

para-life cwd에서 다른 프로젝트 디렉토리를 읽기 전용으로 참조:

```
~/para-life/          ← cwd (쓰기 가능)
~/projects/tag-supporter/    ← 읽기 참조 (상태 확인용)
~/projects/prompt-gallery/  ← 읽기 참조
~/projects/comfy-pilot/   ← 읽기 참조
```

Claude Code에게 "tag-supporter 상태 확인해줘"라고 하면:
1. `~/projects/tag-supporter/PROGRESS.md` 또는 `CLAUDE.md` 읽기
2. 요약 후 `~/para-life/projects/tag-supporter.md`에 반영

---

## Phase 4: 고도화 (선택)

### 4-1. 프로젝트별 채널 분리

필요 시 프로젝트마다 별도 Claude Code 세션 + 채널을 운영:

```
tmux: orchestrator → Claude Code + para-life-channel (프로젝트 관리)
tmux: tag-supporter      → Claude Code + tag-supporter-channel (코딩 작업)
tmux: prompt-gallery    → Claude Code + prompt-gallery-channel (코딩 작업)
```

para-life UI에서 채널 선택 UI 제공.

### 4-2. 알림 통합

- Claude Code Hook (SessionEnd, TaskCompleted)으로 작업 완료 시 알림
- Telegram Channel도 병행 가능 (긴급 알림용)
- para-life 대시보드에 최근 활동 피드

### 4-3. 일일/주간 브리핑

- cron 또는 Cloudflare Worker scheduled trigger로 정기 실행
- 전체 프로젝트 상태 요약 생성
- para-life daily/ 디렉토리에 자동 기록

---

## 기술 스택 요약

| 구성요소 | 기술 |
|---------|------|
| 프론트엔드 | Astro + React island (채팅 UI) |
| 정적 호스팅 | Cloudflare Pages |
| 채팅 백엔드 | Custom MCP Channel Server (TypeScript, Bun) |
| 터널링 | Cloudflare Tunnel (cloudflared) |
| AI 런타임 | Claude Code (Max 구독, tmux 상시 실행) |
| 데이터 | Markdown + JSON (para-life 레포, git 기반) |
| 인증 | Cloudflare Access |
| 프로세스 관리 | tmux |

## 의존성 및 제약

- Claude Code v2.1.80+ (Channels 지원)
- Bun 런타임 (Channel 플러그인 필수)
- claude.ai 로그인 필수 (API key 인증은 Channels 미지원)
- `--dangerously-load-development-channels` 플래그 필요 (커스텀 채널)
- 채널은 Claude Code 프로세스가 살아있을 때만 동작 → tmux 필수
- Max 구독 사용량 한도 존재 → 오케스트레이터는 가볍게 유지

## 우선순위 및 일정 가이드

| Phase | 예상 소요 | 우선순위 | 선행 조건 |
|-------|----------|---------|----------|
| Phase 0 | 1~2시간 | 즉시 | 없음 |
| Phase 1 | 2~3일 | 높음 | Phase 0 완료, fakechat 구조 이해 |
| Phase 2 | 2~3일 | 높음 | Phase 1 완료 |
| Phase 3 | 1일 | 중간 | Phase 2 완료 |
| Phase 4 | 필요 시 | 낮음 | 전체 안정화 후 |
