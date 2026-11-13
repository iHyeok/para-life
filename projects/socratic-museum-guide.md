---
id: "socratic-museum-guide"
title: "소크라테스식 박물관 가이드 챗봇 (RTD Roams 2027)"
status: "active"
priority: "high"
visibility: "private"
area: "ai-study"
goal: "논문의 세 역할(Answerer·Interpreter·Interlocutor)을 따르는 박물관 가이드 챗봇 프로토타입을 만들고, 제작 과정을 RTD Roams 2027 제출 재료(확장 초록 + 이미지 6~8장)로 남긴다"
deadline: "2027-02-01"
createdAt: "2026-11-13"
updatedAt: "2026-11-13"
tags: ["rtd", "chatbot", "museum", "socratic", "prototype", "llm"]
relatedResources: []
---

## Overview

RTD Roams 2027(Research through Design) 제출용 소크라테스식 박물관 가이드 챗봇 프로토타입. 논문은 코워커가, 챗봇 제작은 사용자가 맡는다.

- 코드·설계 문서: [iHyeok/socratic-museum-guide](https://github.com/iHyeok/socratic-museum-guide) (private). 로컬 클론은 `~/projects/socratic-museum-guide`.
- **그 저장소가 공용 기억 장소다.** 폰(claude.ai "RTD Roams" 프로젝트), 집(Claude Code), 전담 채팅 세션(multichat "Museum")이 모두 저장소의 `docs/handoff.md`(진행 기록, 새 항목이 맨 위)와 `docs/decisions.md`(결정)를 읽고 쓴다. 이 문서에는 큰 흐름만 적는다.
- 진행 페이지(코워커 공유용): https://museum-guide.pages.dev — 저장소 문서와 이 파일로 빌드한다(`museum-site/`).
- 마감: 2027-02-01 확장 초록(1,000단어) + 이미지 6~8장. 학회는 2027-07-26~28 도쿄.

## Tasks

- [x] 저장소와 공용 기억 문서(CLAUDE.md, docs/) 세팅
- [x] v0 뼈대 코드 업로드 (mock 모드 동작 확인)
- [ ] 실제 LLM 백엔드를 붙여 재생 스크립트 두 개 돌리고 출력 기록
- [ ] 코워커 F2F 미팅 후 `decisions.md` "미정" 8개를 확정으로 옮기기
- [ ] 실제 전시물·소장 기록 데이터 반영
- [ ] 제출 이미지 6~8장 계획과 캡처
- [ ] 확장 초록 1,000단어 (코워커와 함께)

## Progress Log

### 2026-11-13

- 프로젝트 등록. 저장소 생성(private), 공용 기억 문서 세팅, v0 뼈대 코드 업로드까지 폰 채팅에서 진행됨(저장소 `docs/handoff.md`).
- 전담 채팅 세션 "Museum"과 진행 페이지를 만들었다. 세션은 저장소 폴더에서 돌아서, 집에서 Claude Code로 나눈 대화와 같은 곳에 기록이 쌓인다. 저장소는 30분마다 자동으로 받아 오고 바뀌면 페이지를 다시 배포한다.
