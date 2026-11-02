# PARA Life Management System - Specification

## Overview

PARA 방법론 기반 생활/작업 관리 시스템.
- **Repository**: `/Users/mackjh/para-life`
- **Stack**: Astro static site, Cloudflare Pages
- **Deployment**: git push to main triggers auto-deploy

## Directory Structure

```
para-life/
├── projects/          # 완료 조건이 명확한 목표
│   ├── _index.json    # 프로젝트 목록
│   ├── _template.md   # 템플릿
│   └── {id}.md        # 개별 프로젝트 상세
├── areas/             # 지속적으로 관리하는 영역
│   ├── _index.json
│   ├── _template.md
│   └── {id}.md
├── resources/         # 주제별 참고자료
│   ├── _index.json
│   ├── _template.md
│   └── {id}.md
├── archives/          # 완료/비활성 항목 보관
│   └── _index.json
└── site/              # Astro 웹사이트 (수정 불필요)
```

## Data Schema

### Project (_index.json item)
```json
{
  "id": "kebab-case-id",
  "title": "프로젝트명",
  "status": "active | on-hold | completed | cancelled",
  "priority": "high | medium | low",
  "visibility": "public | limited | private",
  "area": "area-id (optional)",
  "goal": "목표 설명",
  "deadline": "YYYY-MM-DD (optional)",
  "createdAt": "YYYY-MM-DD",
  "updatedAt": "YYYY-MM-DD",
  "tags": ["tag1", "tag2"],
  "relatedResources": ["resource-id (optional)"]
}
```

### Project (.md)
```markdown
---
id / title / status / priority / visibility / area / goal / deadline / createdAt / updatedAt / tags / relatedResources
---

## Overview
(프로젝트 설명)

## Tasks
- [ ] 할 일
- [x] 완료된 일

## Progress Log
### YYYY-MM-DD
- 진행 내용
```

### Area (_index.json item)
```json
{
  "id": "kebab-case-id",
  "title": "영역명",
  "visibility": "public | limited | private",
  "description": "설명",
  "tags": ["tag1"]
}
```

### Resource (_index.json item)
```json
{
  "id": "kebab-case-id",
  "title": "리소스명",
  "topic": "주제 카테고리",
  "visibility": "public | limited | private",
  "area": "area-id (optional)",
  "source": "출처",
  "createdAt": "YYYY-MM-DD",
  "tags": ["tag1"],
  "relatedProjects": ["project-id (optional)"]
}
```

### Knowledge 노트 (Resource의 한 종류)
링크·논문을 분석해 만든 노트는 Resource로 저장하되 아래 필드를 더한다. 작성 절차는 `.claude/skills/clip-link/SKILL.md`.
```json
{
  "kind": "knowledge",
  "sourceUrl": "원문 URL",
  "sourceDate": "YYYY-MM-DD (원문 작성일)",
  "relatedProjects": ["토론·논문에 쓰는 project-id"]
}
```
- 기본 visibility: `private`
- 본문 섹션: 한 줄 요약 / 핵심 주장 / 논증 흐름 (본문 + 그림 연계) / 그림 분석 요약 / 개념·용어 / 비판적 검토 / 논문 활용 포인트 / 출처
- 원문 스냅샷은 git이 아니라 R2 `para-life-private/clips/{id}/source.md`에 두고 `/me/files/clips/{id}/source.md`로 링크

### Resource (.md) - 참고자료 구조
```markdown
---
id / title / topic / visibility / area / source / createdAt / tags / relatedProjects
---

## 요약
(주제에 대한 종합 요약)

## 참고자료
### 글 제목 1
- 링크: URL
- 요약: 한줄요약
- 요점:
  - 핵심 포인트 1
  - 핵심 포인트 2

### 글 제목 2
...
```

## Visibility Rules

| Level | 메인 페이지 (/) | /me/ 대시보드 |
|-------|----------------|---------------|
| **public** | 카드 + 상세 보임 | 보임 |
| **limited** | 카드만 보임 (잠금 표시) | 카드 + 상세 보임 |
| **private** | 안 보임 | 카드 + 상세 보임 |

- `/me/*` 경로는 Cloudflare Access로 보호됨
- limited 카드 클릭 시 `/me/{type}/{id}`로 이동

## Operations

### 항목 추가 (Project / Area / Resource)
1. `{category}/_index.json`의 items 배열에 새 항목 추가
2. `{category}/{id}.md` 파일 생성 (템플릿 참고)
3. 두 파일 모두 git add, commit, push

### 항목 수정
1. `_index.json`과 `.md` 파일 모두 업데이트
2. Project의 경우 `updatedAt` 갱신

### 항목 완료/아카이브

프로젝트가 completed 상태가 되면 즉시 아카이브 처리한다. completed 상태로 projects/에 남겨두지 않는다.

1. `projects/_index.json`에서 항목 제거
2. `archives/_index.json`에 추가 (originalType, area, archivedAt 포함)
3. `.md` 파일을 `archives/`로 이동
4. 관련 Area `.md`의 Related Projects에서 해당 항목 제거
5. 관련 Resource의 `relatedProjects`에서 해당 프로젝트 id 제거

### Resource에 참고자료 추가
1. 해당 주제의 resource `.md` 파일에 "## 참고자료" 섹션에 추가
2. `_index.json`은 수정 불필요 (이미 존재하는 리소스인 경우)

## 파일 업로드 (Cloudflare R2)

파일 첨부가 필요한 경우, **항목의 visibility에 따라 버킷을 나눠** 업로드한다.

| 항목 visibility | 버킷 | 링크 (`.md`에 기록) | 접근 |
|---|---|---|---|
| public | `para-life-assets` | `https://kyxi.net/{path}` | 누구나 |
| limited / private | `para-life-private` | `/me/files/{path}` | `/me` 로그인(Cloudflare Access) 필요 |

`para-life-private`는 공개 도메인이 없는 버킷이다. 파일은 Pages Function(`functions/me/files/[[path]].ts`)이 `/me/files/*` 경로로만 내보낸다.

### 업로드 방법
```bash
# public 항목
npx wrangler r2 object put para-life-assets/{category}/{id}/{filename} \
  --file {로컬파일경로} --content-type {MIME타입} --remote

# limited / private 항목
npx wrangler r2 object put para-life-private/{category}/{id}/{filename} \
  --file {로컬파일경로} --content-type {MIME타입} --remote
```

### 경로 규칙 (두 버킷 공통)
- 프로젝트 결과물: `projects/{project-id}/{filename}`
- 리소스 첨부: `resources/{resource-id}/{filename}`
- 영역 관련: `areas/{area-id}/{filename}`

### 기록 방법
- 해당 `.md` 파일의 Resources(참고자료) 섹션에 마크다운 링크로 기록
- public: `[파일 설명](https://kyxi.net/{category}/{id}/{filename})`
- limited / private: `[파일 설명](/me/files/{category}/{id}/{filename})` (상대 경로, `/me` 화면에서만 열림)

### visibility가 바뀔 때
첨부 파일도 버킷을 옮기고 링크를 바꾼다. 공개로 바꿀 때는 private → assets, 비공개로 바꿀 때는 반대 방향.
1. `npx wrangler r2 object get {원래버킷}/{path} --file /tmp/x --remote`
2. `npx wrangler r2 object put {새버킷}/{path} --file /tmp/x --content-type {MIME} --remote`
3. `.md` 링크 수정 → 커밋·푸시 → 새 링크로 열리는지 확인
4. `npx wrangler r2 object delete {원래버킷}/{path} --remote`

## Commit Convention

```
{동작} {대상} ({세부사항})

{하네스가 제공하는 Co-Authored-By 트레일러}
```

예시:
- `Add ERNF 학습 project with tasks`
- `Add LoRA character training reference`
- `Update ai-study-prep project status to completed`

## Important Notes

- `_index.json`과 `.md` 파일은 항상 동기화되어야 함
- id는 kebab-case 사용
- 날짜는 YYYY-MM-DD 형식
- site/ 디렉토리 내 코드는 일반적으로 수정 불필요 (데이터만 관리)
- push하면 Cloudflare Pages가 자동 빌드/배포
