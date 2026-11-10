# paper-site

`paper-research` 프로젝트의 공개 연구 사이트. 연구실 사람들이 토론 기록, 영상, 용어집, 논문 노트를 볼 수 있게 만든 페이지다.

- 주소: https://persona-lab-5d0.pages.dev (Cloudflare Pages 프로젝트 `persona-lab`, git 연동 없음)
- 공개 수준: 누구나 열 수 있지만 검색엔진은 막는다(`robots.txt`, `X-Robots-Tag`, meta noindex). 실험 결과가 나오기 시작하면 Cloudflare Access(연구실 이메일)로 바꾸는 것을 검토한다.
- 원본: `../projects/paper-research.md`와 `relatedProjects`에 `paper-research`가 있는 `../resources/` 지식 노트. 따로 쓰지 않고 빌드할 때 읽는다.
- 걸러 내는 것: `config.json`의 `redact`(그 줄과 하위 항목을 뺌), `replace`(문구 치환), `linkMap`(`/me/files` 영상 링크를 공개 페이지로). 빌드 끝에 `redact` 문자열이 남아 있으면 실패한다.
- 영상·포스터: 공개 버킷 `para-life-assets/paper-research/site/` (`https://kyxi.net/paper-research/site/…`). git에 넣지 않는다.
- 영상 대본: `content/videos/*.md` (영상 작업 브랜치의 `script.md` 사본)
- 실험 보고서: `content/reports/stage{N}.html` (실행 저장소 `results/stage{N}/report/index.html` 사본, `/reports/stage{N}.html`로 나감). 결과 요약 페이지는 `projects/paper-research.md`의 `## 실험 결과` 섹션

## 갱신

```sh
cd paper-site
npm install        # 처음 한 번
npm run deploy     # 빌드 + 배포
```

로컬 미리 보기: `PAPER_SITE_ASSETS=<mp4·jpg가 있는 폴더> node build.mjs --local` 후 `dist/`를 정적 서버로 연다.
