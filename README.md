# PARA Life

PARA 방법론(Projects · Areas · Resources · Archives)으로 생활과 작업을 관리하는 개인 시스템입니다.

- **데이터**: 저장소 안의 마크다운(`.md`)과 JSON(`_index.json`) 파일이 원본입니다.
- **대시보드**: 데이터를 읽어 정적 사이트로 렌더링합니다. 공개(`/`)와 개인(`/me/`) 두 가지 뷰가 있습니다.
- **오케스트레이터 채팅**: Mac Mini에서 상시 실행되는 Claude Code 세션과 브라우저(모바일 포함)로 대화하며 프로젝트 상태를 조회하고 기록합니다. Claude Code가 데이터를 고치고 커밋·푸시하면 사이트가 자동으로 다시 배포됩니다.

## 구조

```
[브라우저 / 모바일]
   │                          │
   │ https://<사이트>          │ https://main.kyxi.net (multichat UI)
   ▼                          ▼
Cloudflare Pages          Cloudflare Tunnel ──► Mac Mini
 (site/ 정적 빌드,              │                  ├─ python http.server :5174 → multichat/
  /me/* 는 Access 보호)         │ wss://api.kyxi.net/ws
                               └────────────────► ├─ channel/server.ts :3847 (127.0.0.1)
                                                   │      ▲ stdio MCP
                                                   └─ Claude Code (tmux, cwd ~/para-life)
                                                          │ 데이터 수정 → git push
                                                          ▼
                                                   GitHub main → Cloudflare Pages 재배포
```

| 디렉터리 | 내용 |
|----------|------|
| `projects/` `areas/` `resources/` `archives/` | PARA 데이터. 각 폴더의 `_index.json`(목록·메타데이터)과 `{id}.md`(본문). 스키마와 규칙은 [PARA-SPEC.md](PARA-SPEC.md) |
| `daily/` | 일일 기록 |
| `site/` | Astro 6 정적 대시보드. `src/lib/data.ts`가 데이터 파일을 읽고 마크다운을 렌더링(원시 HTML 이스케이프, 위험한 URL 제거, `../projects/x.md` 링크를 사이트 URL로 변환)하며 공개 범위(visibility)를 적용합니다. main에 푸시하면 Cloudflare Pages가 빌드·배포합니다 |
| `multichat/` | 다중 채널 채팅 UI (React). 소스는 `src/*.jsx`, `bun run build`로 만든 `build/main.js`를 **커밋**해서 정적으로 서빙합니다 |
| `channel/` | Bun으로 실행하는 MCP 채널 서버 `server.ts`. Claude Code(stdio MCP)와 채팅 UI(WebSocket)를 잇습니다. 채팅 기록은 `store.ts`(SQLite)로 `~/.claude/channels/para-life/`에 저장합니다 |
| `docs/` | 운영 문서 |

### 공개 범위 (visibility)

| 값 | 공개 뷰 `/` | 개인 뷰 `/me/` |
|----|-------------|----------------|
| `public` | 카드 + 상세 페이지 | 보임 |
| `limited` | 제목만 있는 잠금 카드 (클릭 시 `/me/...`) | 카드 + 상세 |
| `private` | 보이지 않음 | 카드 + 상세 |

값이 없으면 `public`, 알 수 없는 값(오타 등)은 `private`으로 처리합니다. `/me/*`는 Cloudflare Access로 보호됩니다.

### 채널 서버 요약

- `127.0.0.1:$PARA_CHANNEL_PORT`(기본 3847)에만 바인딩하고, 외부 접속은 Cloudflare Tunnel + Access를 거칩니다.
- Host 허용 목록(`api.kyxi.net`, `localhost:PORT`, `127.0.0.1:PORT`, `PARA_ALLOWED_HOSTS`)과 Origin 허용 목록(`PARA_ALLOWED_ORIGINS`)으로 DNS 리바인딩과 다른 사이트의 접근을 막습니다.
- 프로토콜: `hello{features}` → 기록 재전송 → `history_end{hasMore}`, `history_before` → `history_page`, 사용자 메시지 에코(=전송 확인), `ping`/`pong`, 권한 요청 중계(`permission_request`/`permission_resolved`), WebSocket 파일 업로드(최대 25MB).
- Claude Code 세션이 끝나 stdin이 닫히면 같이 종료되고, 같은 포트를 잡고 있는 **고아** 서버만 정리합니다(살아 있는 세션의 서버는 건드리지 않음).

## 로컬 개발

필요한 도구: [Bun](https://bun.sh) 1.3.11, Node.js 22.

```bash
# 사이트 (http://localhost:4321, /me/ 포함 모든 페이지)
cd site && npm ci && npm run dev
npm run build            # site/dist 정적 빌드

# 채팅 UI: src/ 수정 후 번들을 다시 만들고 build/main.js를 같이 커밋
cd multichat && bun install && bun run build
python3 -m http.server 5174   # http://localhost:5174

# 채널 서버 (보통은 Claude Code가 .mcp.json 설정으로 직접 띄움)
cd channel && bun install && bun server.ts
# 테스트용: 인증 생략 + 다른 포트 + 임시 HOME
HOME=$(mktemp -d) PARA_CHANNEL_PORT=3900 SKIP_AUTH=1 bun server.ts
```

## 테스트

| 대상 | 명령 | 내용 |
|------|------|------|
| 채널 서버 | `cd channel && bun run test` | `ChatStore` 단위 테스트(핫/아카이브 페이징, 아카이브 이동, 수정, upsert, 재오픈)와 `server.ts` 통합 테스트(임시 HOME + 빈 포트로 실행, MCP JSON-RPC + WebSocket: Host/Origin 허용 목록과 DNS 리바인딩, 에코·재시도 중복 제거, 권한 중계, 25MB 업로드 제한, 재시작 후 기록 유지, `history_before` 페이징, 포트 충돌·고아 정리, stdin 종료 시 종료) |
| 사이트 | `cd site && npm test` | `lib/data.ts`(마크다운 이스케이프, `javascript:` 링크 제거, 항목 링크 변환, visibility 규칙, Tasks/Progress Log 파싱)와 dist 검사 스크립트 자체 테스트 (Vitest) |
| 사이트 빌드 검사 | `cd site && npm run build && npm run check:dist` | 빌드 결과에서 `/me/` 밖의 페이지에 limited/private 내용이 새어 나가지 않았는지, 내부 링크가 깨지지 않았는지 확인 (limited 항목의 제목은 잠금 카드에 나오므로 허용) |
| 채팅 UI e2e | `cd multichat && npx playwright install chromium && bun run test:e2e` | 헤드리스 Chromium + 실제 채널 서버: 모바일 단일 화면, 에코 후 전송 완료 표시, 마크다운 정화, 권한 카드, 오프라인 큐 재전송, 안 읽음 표시, 기록 페이징·스크롤 위치·재시작 후 유지, 재연결 백오프, 멈춘 서버 감지, 느린 업로드, 구버전(에코·hello 없는) 서버 호환. `site/dist`가 있으면 대시보드 모든 페이지의 모바일 가로 넘침과 라이트/다크 테마도 확인 |
| 린트 | `npm ci && npm run lint` (저장소 루트) | Biome lint (`channel/`, `multichat/src`, `site/src`의 TS/JS/JSX, 테스트 포함. `.astro`는 제외) |

- e2e 중 `@slow` 태그가 붙은 테스트는 실제 타이머(하트비트 25초+10초, 스로틀된 업로드)를 기다리느라 각각 40초 정도 걸립니다. 빠르게 돌릴 때는 `bun run test:e2e:fast`.
- 모든 서버 테스트는 임시 HOME과 빈 포트를 쓰므로 실제 채팅 기록(`~/.claude/channels/para-life/`)이나 실행 중인 채널 서버(3847)를 건드리지 않습니다.
- Biome은 포맷 검사 없이 lint만 합니다(기존 코드 스타일 유지). `multichat/src`는 CDN 스크립트로 시작한 코드라 일부 규칙(a11y 버튼 타입·SVG 제목, DOMPurify로 정화한 `dangerouslySetInnerHTML` 등)을 끄고, 커밋된 번들이 바뀌지 않게 했습니다.

### CI

`.github/workflows/ci.yml`이 모든 푸시와 PR에서 실행됩니다: Biome lint, 채널 테스트, 사이트 테스트 + 빌드 + `check:dist`, multichat 번들 재현성(새로 빌드한 `build/main.js`가 커밋된 것과 같은지), Playwright e2e(별도 job). 번들은 Bun 버전에 따라 달라질 수 있어 CI는 Bun 1.3.11을 고정합니다.

## 운영 문서

- [docs/orchestrator-roadmap.md](docs/orchestrator-roadmap.md) — 전체 아키텍처, tmux/launchd/Cloudflare Tunnel 운영 가이드, 채팅 기록 위치와 백업, 채널 서버 접근 제어
- [PARA-SPEC.md](PARA-SPEC.md) — 데이터 스키마, visibility 규칙, 항목 추가·아카이브 절차, R2 파일 업로드, 커밋 규칙
- [CLAUDE.md](CLAUDE.md) — 오케스트레이터(Claude Code) 동작 규칙과 쓰기 권한
