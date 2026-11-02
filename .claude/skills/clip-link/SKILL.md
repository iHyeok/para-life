---
name: clip-link
description: Turn a link (web post, article, forum thread, paper page) into a PARA knowledge note — read the text AND the images together, analyze, save to resources/ as kind "knowledge", archive the source privately. Use whenever the user sends a URL and asks to read/analyze/save/remember it ("이 링크 읽고 저장해줘", "지식으로 만들어줘", or just a bare link in the para-life chat).
---

# 링크 → 지식 노트

목표: 나중에 토론·논문 작성의 근거로 쓸 수 있는 **분석 노트**를 남긴다. 원문 복사가 아니라 "무엇을, 어떤 근거로, 어떻게 주장하는지"와 "우리 연구에 어떻게 쓸지"를 정리한다.

## 1. 원문 가져오기

순서대로 시도한다. 봇 차단(Cloudflare "Just a moment…", 403 등)을 **우회하려고 하지 않는다**.

1. **일반 페이지**: WebFetch(또는 `curl`)로 본문을 받는다. 이미지 URL이 있으면 내려받아 Read로 직접 본다.
2. **차단·로그인 필요·동적 페이지**: Claude in Chrome(사용자 본인 브라우저)으로 연다. `claude-in-chrome` 스킬을 먼저 로드하고 새 탭에서 작업한 뒤 탭을 닫는다.
   - 본문 순서 추출: 본문 컨테이너를 복제해 각 `img/video`를 `⟦IMG n⟧` 표식으로 바꾼 뒤 `innerText`를 읽는다. 결과가 잘리면 `slice`로 나눠 받는다.
   - 그림: 표식 순서대로 `scrollIntoView` → 스크린샷으로 **모든 내용 그림을 끝까지** 본다. 긴 캡처는 화면 높이씩 내려가며 본다. 100px 안팎의 이모티콘(아카콘 등)은 크기로 걸러내고 "이모티콘"으로만 기록한다.
   - 그림 파일을 보관해야 하면 스크린샷을 `save_to_disk`로 저장해 4단계에서 함께 올린다.
3. **Chrome을 쓸 수 없을 때**(폰에서 채팅만 되는 상황 등): 사용자에게 본문 텍스트 붙여넣기 + 그림 스크린샷 첨부를 요청한다(multichat 파일 첨부 가능).

## 2. 분석 (글 + 그림 연계)

- 그림마다: **무엇이 보이는지**(캡처라면 글·댓글 내용까지) → **본문의 어느 주장에 쓰였는지** → **그림 없이는 무엇을 놓치는지**.
- 본문 논지를 단계별로 재구성하고, 각 단계에 근거 그림 번호를 붙인다.
- 비판적으로 읽는다: 실증 여부, 정의의 모호함, 대안 설명, 반례, 사례가 주장과 정말 맞는지.
- 진행 중인 프로젝트(특히 `paper-research`)와 이어지는 지점: 연구 질문·가설·측정 아이디어·관련 이론 키워드.

## 3. 노트 작성 — `resources/{id}.md`

- `id`: 내용을 나타내는 kebab-case 영문.
- `visibility`: **기본 `private`** (사용자 결정, 2026-11-02). 사용자가 다르게 말하면 따른다.
- frontmatter: `id, title, topic, kind: "knowledge", visibility, area, source(사이트·작성자), sourceUrl, sourceDate, createdAt, tags, relatedProjects`
- 본문 섹션 (기존 예시: `resources/llm-speech-implicature.md`):
  `## 한 줄 요약` · `## 핵심 주장` · `## 논증 흐름 (본문 + 그림 연계)` · `## 그림 분석 요약`(표) · `## 개념·용어` · `## 비판적 검토` · `## 논문 활용 포인트` · `## 출처`
- 원문 인용은 **짧게**(한두 문장)만. 전문은 4단계 스냅샷에 둔다.
- `resources/_index.json`에 같은 메타데이터로 항목 추가(기존 포맷 유지, 파일 전체를 재직렬화하지 말 것).
- 관련 프로젝트 `.md`의 `## Knowledge Base` 목록과 `relatedResources`(md + `_index.json`)에 연결하고, 프로젝트 `updatedAt`과 Progress Log를 갱신한다.

## 4. 원문 스냅샷 보관 (git에 넣지 않음)

- 텍스트(⟦IMG n⟧ 표식 포함) + 그림 설명을 `source.md`로 만들어 비공개 버킷에 올린다:
  `npx wrangler r2 object put para-life-private/clips/{id}/source.md --file … --content-type "text/markdown; charset=utf-8" --remote`
- 그림 파일을 보관했다면 `clips/{id}/img-{n}.png`로 함께 올린다.
- 노트 `## 출처`에 링크: `[source.md](/me/files/clips/{id}/source.md)` (`/me` 로그인 뒤에서만 열림)

## 5. 마무리

- `cd site && npm run build && npm run check:dist`로 확인 → git add/commit/push (PARA-SPEC 커밋 규칙).
- 채팅(reply 도구)으로 보고: 한 줄 요약, 핵심 주장 3개 이내, 그림이 논지에서 한 역할, 논문 활용 포인트 1–2개, 노트 id.
