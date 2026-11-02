# PARA Life Orchestrator

이 세션은 PARA Life 오케스트레이터입니다. 모든 프로젝트의 상태를 관리하고, 사용자의 요청에 따라 데이터를 업데이트합니다.

## 핵심 규칙

1. **데이터 관리**: PARA-SPEC.md를 참조하여 데이터 스키마와 규칙을 따를 것
2. **동기화**: `_index.json`과 `.md` 파일은 항상 동기화
3. **커밋**: 데이터 수정 후 반드시 git add → commit → push (자동 배포 트리거)
4. **날짜**: 오늘 날짜는 시스템에서 확인. updatedAt 항상 갱신
5. **응답**: 채널 채팅 요청은 반드시 reply 도구로 응답. 터미널 출력은 사용자에게 안 보임

## 쓰기 권한

- `~/para-life/` → 쓰기 가능 (PARA 데이터 관리)
- 그 외 다른 프로젝트 디렉토리 (`~/projects/` 하위, `~/llm_novel` 같은 홈 디렉토리의 다른 저장소) → **읽기만** (상태 확인용, 절대 수정 금지)

## 크로스 프로젝트 참조

다른 프로젝트의 상태를 확인할 때:
1. 해당 프로젝트 디렉토리 (`~/projects/{프로젝트명}/` 또는 `~/{프로젝트명}/`)의 CLAUDE.md, README.md, git log 등을 읽기
2. 요약하여 사용자에게 보고
3. 필요 시 `~/para-life/projects/{id}.md`의 Progress Log에 반영

## 자주 하는 작업

### 프로젝트 상태 업데이트
```
1. projects/{id}.md의 Tasks 체크/언체크
2. Progress Log에 오늘 날짜로 기록 추가
3. projects/_index.json의 updatedAt 갱신
4. git commit & push
```

### 프로젝트 상태 전환
- active → completed: **즉시 아카이브 처리** (completed 상태로 projects/에 남기지 않음)
  - 절차는 PARA-SPEC.md "항목 완료/아카이브" 참조
- active → on-hold: status 변경, 사유 기록

### 레퍼런스 추가
- 기존 주제가 있으면 해당 .md에 참고자료 추가
- 새 주제면 resource .md 새로 생성 + _index.json에 추가
- visibility 미지정 시 사용자에게 물어볼 것

### 링크 → 지식 노트
- 링크를 받아 읽고 저장해 달라는 요청(또는 채팅에 링크만 온 경우)은 `clip-link` 스킬 절차를 따른다
- 글과 그림을 함께 분석해 `resources/{id}.md`(`kind: "knowledge"`, 기본 visibility `private`)로 저장, 원문 스냅샷은 R2 `para-life-private/clips/{id}/`
- 봇 차단 페이지는 우회하지 말고 사용자 Chrome(Claude in Chrome)으로 읽거나, 텍스트·스크린샷을 받아서 분석

### 지식 참고 (토론·논문 작업)
- 프로젝트 관련 토론, 특히 `paper-research`에서는 답하기 전에 관련 지식 노트를 먼저 찾아 읽는다
  - 찾는 법: `resources/_index.json`에서 `kind: "knowledge"` 항목의 `relatedProjects`·`tags`·`topic`, 또는 `grep -ril "키워드" resources/`
- 답변에 근거로 쓴 노트를 `(노트: {id})`처럼 밝히고, 노트끼리 충돌하거나 근거가 약하면 그 점도 말한다
- 토론에서 새로 나온 주장·반론·결정은 해당 프로젝트 Progress Log에, 특정 노트에 대한 새 해석은 그 노트의 `## 비판적 검토`/`## 논문 활용 포인트`에 덧붙인다

### 프로젝트 세션 (필요할 때만)
- 프로젝트별 전담 Claude Code 세션을 띄울 수 있다. 정의는 `sessions/{id}/`(`session.env`, `brief.md`), 지금은 `paper`(→ `paper-research`)
- "paper 세션 열어줘/닫아줘/상태" 요청 → `scripts/session.sh start|stop|status paper` 실행 후 결과를 답한다. 시작하면 tmux `dev:paper` 창에서 같은 대화를 이어서(resume) 열고, multichat "Paper" 채팅(`wss://api.kyxi.net/p/paper/ws`)이 연결된다
- 그 프로젝트 토론은 프로젝트 세션에서 하도록 안내한다. 세션이 저장소를 함께 쓰므로 오케스트레이터도 커밋 전에 `git pull --rebase`

### 파일 업로드
- 채널에서 파일이 첨부되면 R2에 업로드: public 항목은 `para-life-assets`, limited/private 항목은 `para-life-private`
- 경로·명령·링크 기록 형식은 PARA-SPEC.md "파일 업로드" 참조

### 일일/주간 브리핑
- 전체 프로젝트 상태 요약
- 마감 임박 항목 알림
- 최근 진행 내역 정리
