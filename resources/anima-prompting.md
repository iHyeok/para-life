---
id: "anima-prompting"
title: "Anima Preview 2 프롬프팅"
topic: "Prompting"
visibility: "limited"
area: "ernf"
source: "Arca"
createdAt: "2026-04-01"
tags: ["anima", "prompting", "quality-tags", "ernf"]
relatedProjects: ["ernf-learning"]
---

## 요약

Anima Preview 2 모델의 프롬프팅 특성 정리. NAI처럼 퀄리티 태그와 네거티브 프롬프트에 큰 영향을 받으며, 아티스트 태그 활용이 핵심.

## 참고자료

### 아니마 프리뷰2 작가태그 파시는 분들 참고용 프롬프트
- 링크: https://arca.live/b/aiart/166401322?mode=best&p=1
- 요약: 퀄리티 태그·네거티브 프롬프트 민감도가 높으며, 아티스트 태그만으로도 품질 조절 가능
- 샘플: [메이드 예시](https://kyxi.net/resources/anima-prompting/sample-maid.png)
- 예시 긍정 프롬프트:
  ```
  newest, year2024, (masterpiece, best quality, score_8), highres, absurdres, general, safe, (@yukie \(kusaka shi\):1.15), 1girl, solo, looking at viewer, maid headdress, apron, dress, maid, maid apron, cowboy shot, (black hair, purple eyes, messy hair, long hair:0.75), location, window, indoors, musk, chiaroscuro, (muted color, sketchy, oekaki, crosshatching, scribble, sketch, watercolor \(medium\), airbrush \(medium\), cel rendering:0.7), perspective, (dynamic facial expressions with after image), (highly aesthetic Pixiv style illustration, clean composition, high-quality digital art.:0.7)
  ```
- 예시 네거티브 프롬프트:
  ```
  3d, (worst quality), low quality, cropped, (score_1), score_2, score_3, unfinished, work-in-progress, blank, letterboxed, blurry, jpeg artifacts, sepia, mutated, mutated digits, missing fingers, extra digit, fewer digits, artistic error, unusual anatomy, watermark, patreon username, web address, patreon logo, weibo username, watermark, mature female, adult female, adolescent, wide hips, narrow waist, (multiple views:1.3), monochrome, greyscale, retro artstyle, (outline, thick outlines:1.15), bold lines, thick borders, messy shading, distorted anatomy, high contrast, western comics \(style\), furry, english text, anatomically incorrect, spot color, doodle on background, gif artifacts
  ```
- 요점:
  - **퀄리티 태그 민감도 높음** — NAI처럼 퀄리티 태그와 네거티브에 크게 영향받음
  - **농농단 대응** — close-up 태그를 약한 가중치(0.7)로 줘서 캐릭터가 이미지에서 너무 작아지는 것 방지
  - **음영 문제 상쇄** — countershading, countershade face를 부여하면 얼굴 위주 음영을 부분적으로 상쇄 가능 `(countershading, countershade face, close-up:0.7)`
  - **퀄리티 프롬 최소화 접근** — `(masterpiece, best quality:0.8), highres, artist, year tag` 정도만 넣고 사용하는 방법도 유효
  - **아티스트 태그만으로 품질 조절** — 퀄리티 프롬을 전부 빼고 아티스트 태그만으로도 품질 조정 가능 (예: hassai 작가는 퀄리티 태그를 빼야 가장 잘 재현됨)
