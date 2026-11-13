# museum-site

`socratic-museum-guide` 프로젝트의 진행 페이지. 코워커가 제작 과정(진행 기록, 결정, 프로토타입 구조, 배경)을 볼 수 있게 만든다.

- 주소: https://museum-guide.pages.dev (Cloudflare Pages 프로젝트 `museum-guide`, git 연동 없음)
- 공개 수준: 링크를 아는 사람만, 검색엔진 차단(`robots.txt`, `X-Robots-Tag`, meta noindex). 심사 전 연구라 외부 공유 금지 문구를 넣었다. 필요하면 Cloudflare Access로 잠근다.
- 원본(직접 쓰지 않고 빌드할 때 읽는다):
  - 프로젝트 저장소 `~/projects/socratic-museum-guide`(`MUSEUM_REPO`로 바꿀 수 있음): `docs/handoff.md` → 진행 기록, `docs/decisions.md` → 결정, `README.md` → 프로토타입, `docs/context.md` → 배경
  - `../projects/socratic-museum-guide.md`의 Tasks → 개요의 "큰 단계"
- 걸러 내는 것: `config.json`의 `redact`(그 줄과 하위 항목을 뺌). 빌드 끝에 `redact` 문자열이 남아 있으면 실패한다. 개인 계정 링크(claude.ai), 로컬 경로, 운영 세부를 막는다.
- 스타일: `paper-site/static/style.css` 사본 + `build.mjs`의 `EXTRA_CSS`.

## 갱신

자동: `scripts/project-sync.sh museum`이 30분마다(launchd `com.para-life.project-sync`) 저장소를 받아 오고, 저장소·PARA 파일·이 폴더가 바뀌었으면 다시 배포한다. 로그는 `~/.claude/channels/museum/sync.log`.

수동:

```sh
cd museum-site
npm install      # 처음 한 번
npm run deploy   # 빌드 + 배포
```
