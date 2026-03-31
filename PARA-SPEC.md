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
  "tags": ["tag1", "tag2"]
}
```

### Project (.md)
```markdown
---
id / title / status / priority / visibility / area / goal / deadline / createdAt / updatedAt / tags
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
  "source": "출처",
  "createdAt": "YYYY-MM-DD",
  "tags": ["tag1"]
}
```

### Resource (.md) - 참고자료 구조
```markdown
---
id / title / topic / visibility / source / createdAt / tags
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
1. `_index.json`에서 항목 제거
2. `archives/_index.json`에 추가 (originalType, archivedAt 포함)
3. `.md` 파일은 archives/로 이동

### Resource에 참고자료 추가
1. 해당 주제의 resource `.md` 파일에 "## 참고자료" 섹션에 추가
2. `_index.json`은 수정 불필요 (이미 존재하는 리소스인 경우)

## 파일 업로드 (Cloudflare R2)

파일 첨부가 필요한 경우 Cloudflare R2 버킷 `para-life-assets`에 업로드한다.

### 업로드 방법
```bash
npx wrangler r2 object put para-life-assets/{category}/{id}/{filename} \
  --file {로컬파일경로} \
  --content-type {MIME타입} \
  --remote
```

### 경로 규칙
- 프로젝트 결과물: `projects/{project-id}/{filename}`
- 리소스 첨부: `resources/{resource-id}/{filename}`
- 영역 관련: `areas/{area-id}/{filename}`

### 기록 방법
- 해당 `.md` 파일의 Resources 섹션에 `r2://para-life-assets/...` 경로 기록
- 공개 URL이 필요하면 Cloudflare 대시보드에서 퍼블릭 도메인 설정 필요

## Commit Convention

```
{동작} {대상} ({세부사항})

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
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
