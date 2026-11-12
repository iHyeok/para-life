// Builds the public research site for the paper-research project.
// Source of truth is the PARA data in the parent repo (projects/, resources/);
// this script reads it, removes private/operational lines, and writes static HTML to dist/.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { Marked } from "marked";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const DIST = path.join(HERE, "dist");
const cfg = JSON.parse(fs.readFileSync(path.join(HERE, "config.json"), "utf8"));
const LOCAL = process.argv.includes("--local");
const ASSET = LOCAL ? "assets" : cfg.assetBase;

const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// ---------- markdown helpers ----------

/** Split a markdown body into { heading: text } for "## " sections. */
function sections(body) {
  const out = {};
  let cur = "_intro";
  out[cur] = [];
  for (const line of body.split("\n")) {
    const m = line.match(/^## (.+?)\s*$/);
    if (m) { cur = m[1]; out[cur] = []; continue; }
    out[cur].push(line);
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.join("\n").trim()]));
}

let publicNoteIds = new Set();

/** Rewrite links for the public site; `base` is the relative prefix to the site root. */
function rewriteLinks(md, base) {
  for (const [from, to] of Object.entries(cfg.linkMap)) md = md.split(`(${from})`).join(`(${base}${to})`);
  // ../resources/{id}.md -> notes/{id}.html (or plain text when the note isn't public)
  md = md.replace(/\[([^\]]+)\]\(\.\.\/resources\/([\w-]+)\.md\)/g, (all, text, id) =>
    publicNoteIds.has(id) ? `[${text}](${base}notes/${id}.html)` : text);
  return md;
}

/** Drop lines (and the nested children of list items) that contain private/operational details. */
function redact(md) {
  for (const [from, to] of Object.entries(cfg.replace || {})) md = md.split(from).join(to);
  const bad = (line) => cfg.redact.some((p) => line.includes(p));
  const out = [];
  let dropIndent = null;
  for (const line of md.split("\n")) {
    const indent = line.match(/^\s*/)[0].length;
    if (dropIndent !== null) {
      if (line.trim() !== "" && indent > dropIndent) continue;
      dropIndent = null;
    }
    if (bad(line)) {
      if (/^\s*([-*+]|\d+\.)\s/.test(line)) dropIndent = indent;
      continue;
    }
    out.push(line);
  }
  return out.join("\n");
}

const marked = new Marked({ gfm: true });
// A single "~" (e.g. "0.81~0.96", "~72%") must not turn into strikethrough
const tilde = (md) => md.replace(/(?<!~)~(?!~)/g, "\\~");
const md2html = (md, base) => marked.parse(tilde(redact(rewriteLinks(md, base))));
const inline = (md, base = "") => marked.parseInline(tilde(rewriteLinks(md, base)));
const plain = (md) => md.replace(/\*\*|\*|`/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

// ---------- data ----------

const projectFile = matter(read(`projects/${cfg.project}.md`));
const project = projectFile.data;
const psec = sections(projectFile.content);

const tasks = [...psec["Tasks"].matchAll(/^- \[( |x)\] (.+)$/gm)].map((m) => ({ done: m[1] === "x", text: m[2] }));

// Progress Log -> [{date, md}] newest first
const logDays = psec["Progress Log"]
  .split(/^### /m)
  .filter((s) => s.trim())
  .map((s) => {
    const nl = s.indexOf("\n");
    return { date: s.slice(0, nl).trim(), md: s.slice(nl + 1).trim() };
  })
  .reverse();

// Experiment plan: research question + stages
const planMd = psec["실험 계획"] || "";
const stages = [...planMd.matchAll(/^- \*\*(\d)단계(?: \(([^)]+)\))?:\*\* (.+)$/gm)].map((m) => ({
  n: m[1], status: m[2] || "", text: m[3],
}));
const question = (planMd.match(/^- \*\*연구 질문:\*\* (.+)$/m) || [])[1] || "";

// Knowledge notes linked to the project
const resIndex = JSON.parse(read("resources/_index.json"));
const resItems = resIndex.items || [];
const notes = resItems
  .filter((r) => r.kind === "knowledge" && (r.relatedProjects || []).includes(cfg.project))
  .filter((r) => !cfg.notesExclude.includes(r.id))
  .map((r) => {
    const f = matter(read(`resources/${r.id}.md`));
    const sec = sections(f.content);
    return { ...r, ...f.data, body: f.content, sec, summary: sec["한 줄 요약"] || "" };
  })
  .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
publicNoteIds = new Set(notes.map((n) => n.id));

// Glossary: "- **term:** definition" lines from each note's 개념·용어 section
const glossary = [];
for (const n of notes) {
  const s = n.sec["개념·용어"];
  if (!s) continue;
  for (const m of s.matchAll(/^- \*\*(.+?):?\*\*:?\s*(.+)$/gm)) {
    glossary.push({ term: m[1].replace(/:$/, ""), def: m[2], note: n });
  }
}
glossary.sort((a, b) => a.term.localeCompare(b.term, "ko"));

const updated = [project.updatedAt, ...notes.map((n) => n.updatedAt || n.createdAt)].filter(Boolean).sort().pop();

// ---------- layout ----------

const NAV = [
  ["index.html", "개요"],
  ["guide.html", "쉽게 보기"],
  ["results.html", "실험 결과"],
  ["log.html", "토론 기록"],
  ["qa.html", "질의응답"],
  ["videos.html", "영상"],
  ["glossary.html", "용어집"],
  ["notes/index.html", "논문 노트"],
];

function page({ file, title, body, desc }) {
  const depth = file.split("/").length - 1;
  const base = "../".repeat(depth);
  const nav = NAV.map(([href, label]) => {
    const cur = href === file || (href === "notes/index.html" && file.startsWith("notes/")) || (href === "videos.html" && file.startsWith("videos/"));
    return `<a href="${base}${href}"${cur ? ' aria-current="page"' : ""}>${label}</a>`;
  }).join("");
  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title ? `${title} | ${cfg.title}` : cfg.title)}</title>
<meta name="description" content="${esc(desc || cfg.subtitle)}">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="stylesheet" href="${base}style.css">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='9' cy='23' r='4' fill='%230e7c7b'/%3E%3Cpath d='M9 23 L25 8' stroke='%230e7c7b' stroke-width='3' stroke-linecap='round'/%3E%3C/svg%3E">
</head>
<body>
<a class="skip" href="#main">본문으로 건너뛰기</a>
<header class="top">
  <a class="brand" href="${base}index.html"><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="9" cy="23" r="4"/><path d="M9 23 L25 8"/></svg>${esc(cfg.title)}</a>
  <nav aria-label="사이트">${nav}</nav>
</header>
<main id="main">
${body}
</main>
<footer class="foot">
  <p>진행 중인 연구의 작업 기록입니다. 수치와 해석은 원 논문을 다시 읽거나 실험하면서 바뀔 수 있으니, 인용할 때는 원문을 확인해 주세요.</p>
  <p>마지막 갱신 ${esc(updated)}</p>
</footer>
<script src="${base}app.js" defer></script>
</body>
</html>`;
  const out = path.join(DIST, file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
}

// ---------- pages ----------

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
for (const f of ["style.css", "app.js", "robots.txt", "_headers"]) fs.copyFileSync(path.join(HERE, "static", f), path.join(DIST, f));
if (LOCAL) {
  // Local preview: serve videos/posters from the scratch copies given in PAPER_SITE_ASSETS
  const src = process.env.PAPER_SITE_ASSETS;
  if (src) fs.symlinkSync(path.resolve(src), path.join(DIST, "assets"));
}

fs.mkdirSync(path.join(DIST, "reports"), { recursive: true });
for (const f of fs.readdirSync(path.join(HERE, "content/reports"))) fs.copyFileSync(path.join(HERE, "content/reports", f), path.join(DIST, "reports", f));

const resultsMd = (psec["실험 결과"] || "").split(cfg.siteUrl).join("");

const doneCount = tasks.filter((t) => t.done).length;
const latest = logDays[0];

// Hero: interactive diagram of the two hypotheses (illustrative values, not results)
const EMOS = ["즐거움", "장난기", "짜증", "불안"];
const hero = `
<section class="hero" aria-labelledby="hero-title">
  <h1 id="hero-title">페르소나를 바꾸면,<br>감정은 생겨나는가, 풀려나는가</h1>
  <div class="hero-text">
    <p class="lede">${inline(question)}</p>
    <p class="hero-guide"><a href="guide.html">처음 보신다면: 이 연구를 쉽게 풀어 쓴 설명</a></p>
    <p class="note-illus">오른쪽 막대는 두 가설을 설명하기 위한 가상 그림입니다. 실험 결과가 아니에요. 실험에서는 페르소나를 바꿀 때 표상이 그대로면 게이트, 같이 변하면 생성기 쪽으로 판단합니다.</p>
  </div>
  <figure class="gate" data-persona="assistant" data-hyp="gate">
    <div class="gate-controls">
      <div class="seg" role="group" aria-label="페르소나">
        <span class="seg-label">페르소나</span>
        <button type="button" data-set="persona" data-val="assistant" aria-pressed="true">기본 어시스턴트</button>
        <button type="button" data-set="persona" data-val="other" aria-pressed="false">다른 페르소나</button>
      </div>
      <div class="seg" role="group" aria-label="가설">
        <span class="seg-label">가설</span>
        <button type="button" data-set="hyp" data-val="gate" aria-pressed="true">게이트</button>
        <button type="button" data-set="hyp" data-val="gen" aria-pressed="false">생성기</button>
      </div>
    </div>
    <div class="gate-stage">
      <div class="col col-rep">
        <h2>표상 <small>모델 내부 활성화</small></h2>
        ${EMOS.map((e, i) => `<div class="bar"><span>${e}</span><i style="--i:${i}"></i></div>`).join("")}
      </div>
      <div class="valve" aria-hidden="true"><span class="door"></span></div>
      <div class="col col-exp">
        <h2>표현 <small>말투·내용에 드러남</small></h2>
        ${EMOS.map((e, i) => `<div class="bar"><span>${e}</span><i style="--i:${i}"></i></div>`).join("")}
      </div>
    </div>
    <figcaption aria-live="polite"></figcaption>
  </figure>
</section>`;

const stageList = `
<section class="block" aria-labelledby="stages-title">
  <h2 id="stages-title">실험은 어디까지 왔나</h2>
  <ol class="stages">
    ${stages.map((s) => `<li class="${/완료/.test(s.status) ? "is-done" : s.status ? "is-now" : ""}"><span class="stage-n">${s.n}</span><div><p>${inline(s.text)}</p>${s.status ? `<span class="stage-status">${esc(s.status)}${/완료/.test(s.status) ? ` <a href="results.html">결과 보기</a>` : ""}</span>` : ""}</div></li>`).join("")}
  </ol>
</section>`;

const taskList = `
<section class="block" aria-labelledby="tasks-title">
  <h2 id="tasks-title">논문 작업 <span class="count">${doneCount} / ${tasks.length}</span></h2>
  <ul class="tasks">
    ${tasks.map((t) => `<li class="${t.done ? "done" : ""}"><span class="box" aria-hidden="true"></span>${t.done ? '<span class="sr">완료: </span>' : ""}${inline(t.text)}</li>`).join("")}
  </ul>
</section>`;

const latestBullets = latest
  ? redact(rewriteLinks(latest.md, "")).split("\n").filter((l) => /^- /.test(l)).map((l) => l.slice(2))
  : [];
const latestBlock = latest ? `
<section class="block" aria-labelledby="latest-title">
  <h2 id="latest-title">최근 토론 <time>${esc(latest.date)}</time></h2>
  <ul class="latest">${latestBullets.map((b) => `<li>${inline(b)}</li>`).join("")}</ul>
  <p class="more"><a href="log.html">날짜별 토론 기록 전체 보기</a></p>
</section>` : "";

const hasScript = (v) => fs.existsSync(path.join(HERE, "content/videos", `${v.id}.md`));
const videoCard = (v, base = "") => `
<article class="video" id="${v.id}">
  <video controls preload="none" poster="${ASSET}/${v.poster}" playsinline>
    <source src="${ASSET}/${v.file}" type="video/mp4">
  </video>
  <div class="video-text">
    <h3>${esc(v.title)} <span class="len">${esc(v.length)}</span></h3>
    <p class="paper"><a href="${esc(v.paperUrl.startsWith("http") ? v.paperUrl : base + v.paperUrl)}">${esc(v.paper)}</a></p>
    <p>${esc(v.summary)}</p>
    ${hasScript(v) ? `<p class="more"><a href="${base}videos/${v.id}.html">장면별 대본과 근거 보기</a></p>` : ""}
  </div>
</article>`;

const ytSeries = cfg.youtubeSeries || [];
const ytCount = ytSeries.reduce((n, g) => n + g.items.length, 0);
const ytCard = (y) => {
  const watch = `https://www.youtube.com/watch?v=${y.yt}`;
  const thumb = `<img src="https://i.ytimg.com/vi/${y.yt}/hq720.jpg" alt="" loading="lazy">`;
  const media = y.embed
    ? `<button type="button" class="yt-play" data-yt="${y.yt}" aria-label="${esc(y.title)} 재생">${thumb}<span class="yt-icon" aria-hidden="true"></span></button>`
    : `<a class="yt-play" href="${watch}" target="_blank" rel="noopener" aria-label="${esc(y.title)} 유튜브에서 보기">${thumb}<span class="yt-icon" aria-hidden="true"></span></a>`;
  return `
<article class="yt" id="yt-${y.yt}">
  <div class="yt-media">${media}</div>
  <div class="video-text">
    <p class="yt-sub">${esc(y.sub)}</p>
    <h3>${esc(y.title)} <span class="len">${esc(y.length)}</span></h3>
    <p>${esc(y.summary)}</p>
    <p class="yt-link"><a href="${watch}" target="_blank" rel="noopener">유튜브에서 보기</a>${y.embed ? "" : " · 이 영상은 유튜브에서만 재생돼요"}</p>
  </div>
</article>`;
};
const ytSections = ytSeries.map((g) => `
<section class="block yt-series" id="series-${g.id}" aria-labelledby="yt-${g.id}-title">
  <h2 id="yt-${g.id}-title">${esc(g.title)} <span class="count">${g.items.length}편</span></h2>
  <p class="series-intro">${esc(g.intro)}</p>
  <div class="yt-list">${g.items.map(ytCard).join("")}</div>
</section>`).join("");

const notesList = (base) => `
<ul class="notes">
  ${notes.map((n) => `<li><a href="${base}notes/${n.id}.html"><strong>${esc(n.title)}</strong><span>${esc(plain(n.summary).slice(0, 150))}${plain(n.summary).length > 150 ? "…" : ""}</span></a></li>`).join("")}
</ul>`;

page({
  file: "index.html",
  title: "",
  body: `${hero}
<div class="grid-2">${stageList}${taskList}</div>
${latestBlock}
<section class="block" aria-labelledby="v-title"><h2 id="v-title">공부용 영상</h2><div class="videos">${cfg.videos.map((v) => videoCard(v)).join("")}</div>${ytCount ? `<p class="more"><a href="videos.html#series-${ytSeries[0].id}">${ytSeries.map((g) => `${esc(g.title)} ${g.items.length}편`).join(", ")} 유튜브 강의 보기</a></p>` : ""}</section>
<section class="block" aria-labelledby="n-title"><h2 id="n-title">읽은 논문과 글</h2>${notesList("")}
<p class="more"><a href="glossary.html">용어집 ${glossary.length}개 보기</a></p></section>`,
});

page({
  file: "guide.html",
  title: "쉽게 보기",
  desc: "무엇이 궁금하고, 어떻게 가려내고, 단계마다 무엇을 하는지 쉽게 풀어 쓴 설명",
  body: `<div class="guide">${redact(fs.readFileSync(path.join(HERE, "content/guide.html"), "utf8"))}</div>`,
});

page({
  file: "results.html",
  title: "실험 결과",
  desc: "단계별 실험 결과 요약",
  body: `<header class="page-head"><h1>실험 결과</h1><p>단계마다 무엇을 확인했고 무엇이 나왔는지 요약합니다. 자세한 그림과 답변 예시는 단계별 보고서에 있어요.</p></header>
<div class="prose prose-results">${resultsMd ? md2html(resultsMd, "") : "<p>아직 끝난 단계가 없어요.</p>"}</div>`,
});

page({
  file: "log.html",
  title: "토론 기록",
  desc: "날짜별 토론·결정 기록",
  body: `<header class="page-head"><h1>토론 기록</h1><p>토론에서 나온 주장, 반론, 결정을 날짜별로 남깁니다. 최근 날짜가 위에 있어요.</p></header>
<div class="log">${logDays.map((d) => `<section class="day"><h2><time>${esc(d.date)}</time></h2><div class="prose">${md2html(d.md, "")}</div></section>`).join("")}</div>`,
});

// Q&A logs written by the experiment-PC session (content/qa/{date}.md), with our review notes ({date}.review.md)
const QA_DIR = path.join(HERE, "content/qa");
const qaDays = (fs.existsSync(QA_DIR) ? fs.readdirSync(QA_DIR) : [])
  .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
  .sort().reverse()
  .map((f) => {
    const date = f.slice(0, 10);
    const { content } = matter(fs.readFileSync(path.join(QA_DIR, f), "utf8"));
    const revFile = path.join(QA_DIR, `${date}.review.md`);
    const review = fs.existsSync(revFile) ? fs.readFileSync(revFile, "utf8") : "";
    const qs = [];
    const body = content.replace(/^## (Q(\d+)\. .+)$/gm, (_, t, n) => {
      qs.push({ n, t });
      return `<h3 id="q-${date}-${n}">${esc(t)}</h3>\n`;
    }).replace(/^## (.+)$/gm, "### $1")
      .replace(/^(\*\*(?:질문|답|근거|확신도|할 일):\*\*)/gm, "\n$1");
    return { date, body, review, qs };
  });

page({
  file: "qa.html",
  title: "질의응답",
  desc: "실험 PC의 Claude 세션과 나눈 질의응답, 검토 메모",
  body: `<header class="page-head"><h1>질의응답</h1><p>실험을 돌리는 PC의 Claude 세션과 나눈 질문과 답입니다. 그쪽 세션이 정리한 기록을 그대로 싣고, 이 사이트 쪽에서 노트와 대조한 <strong>검토 메모</strong>를 날짜마다 덧붙였어요. 틀린 답은 지우지 않고 정정으로 남깁니다.</p></header>
<div class="log qa">${qaDays.map((d) => `<section class="day"><h2><time>${esc(d.date)}</time></h2><div>
${d.review ? `<aside class="callout review"><h3>검토 메모</h3><div class="prose">${md2html(d.review, "")}</div></aside>` : ""}
<nav class="qa-toc" aria-label="${esc(d.date)} 질문 목록"><ol>${d.qs.map((q) => `<li><a href="#q-${d.date}-${q.n}">${esc(q.t.replace(/^Q\d+\. /, ""))}</a></li>`).join("")}</ol></nav>
<div class="prose">${md2html(d.body, "")}</div></div></section>`).join("") || "<p>아직 올라온 질의응답이 없어요.</p>"}</div>`,
});

page({
  file: "videos.html",
  title: "영상",
  desc: "논문을 설명하는 모션 그래픽 영상",
  body: `<header class="page-head"><h1>공부용 영상</h1><p>핵심 논문과 우리 실험 결과를 모션 그래픽과 내레이션으로 풀어 본 영상입니다. 논문 영상에서 "개념도"라고 적힌 그래프는 논문 그림의 모양만 옮긴 것이고, 막대·표의 수치는 논문 값입니다. 실험 영상의 수치는 우리 실험 값이에요. 아래쪽에는 배경 지식(CNN)과 트랜스포머 구조를 다루는 유튜브 강의를 모았어요.</p></header>
<div class="videos videos-wide">${cfg.videos.map((v) => videoCard(v)).join("")}</div>
${ytSections}`,
});

for (const v of cfg.videos.filter(hasScript)) {
  const mdText = fs.readFileSync(path.join(HERE, "content/videos", `${v.id}.md`), "utf8");
  page({
    file: `videos/${v.id}.html`,
    title: `${v.title} 대본`,
    body: `<p class="crumb"><a href="../videos.html#${v.id}">영상으로 돌아가기</a></p>
<div class="prose prose-wide">${md2html(mdText, "../")}</div>`,
  });
}

page({
  file: "glossary.html",
  title: "용어집",
  desc: "논문 노트에 나온 개념과 용어",
  body: `<header class="page-head"><h1>용어집</h1><p>논문 노트의 "개념·용어"를 한곳에 모았습니다. 용어를 누르면 그 말이 나온 노트로 갑니다.</p>
<label class="search"><span>찾기</span><input type="search" id="gq" placeholder="예: 프로브, ICC, deflection" autocomplete="off"></label></header>
<dl class="glossary" id="glossary">${glossary.map((g) => `<div class="term" data-q="${esc((g.term + " " + plain(g.def)).toLowerCase())}"><dt>${inline(g.term)}</dt><dd>${inline(g.def, "")}<a class="from" href="notes/${g.note.id}.html#terms">${esc(shortTitle(g.note))}</a></dd></div>`).join("")}</dl>
<p class="empty" id="gempty" hidden>찾는 용어가 없어요. 다른 표기(영어·한국어)로 찾아보세요.</p>`,
});

function shortTitle(n) {
  return (cfg.shortTitles || {})[n.id] || n.title.replace(/^\[논문\]\s*/, "").replace(/\s*—.*$/, "");
}

page({
  file: "notes/index.html",
  title: "논문 노트",
  body: `<header class="page-head"><h1>읽은 논문과 글</h1><p>읽은 자료마다 핵심 주장, 근거, 비판적 검토, 우리 연구에 쓸 지점을 정리한 노트입니다.</p></header>${notesList("../")}`,
});

for (const n of notes) {
  let body = n.body.replace(/^## 개념·용어\s*$/m, '<h2 id="terms">개념·용어</h2>');
  const meta = [n.source, n.sourceDate && `원문 ${n.sourceDate}`, n.createdAt && `노트 ${n.createdAt}`].filter(Boolean);
  page({
    file: `notes/${n.id}.html`,
    title: shortTitle(n),
    desc: plain(n.summary).slice(0, 160),
    body: `<p class="crumb"><a href="index.html">논문 노트 목록</a></p>
<header class="page-head note-head"><h1>${esc(n.title)}</h1>
<p class="meta">${meta.map(esc).join(" / ")}${n.sourceUrl ? ` / <a href="${esc(n.sourceUrl)}">원문</a>` : ""}</p>
${(n.tags || []).length ? `<p class="tags">${n.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</p>` : ""}</header>
<div class="prose">${md2html(body, "../")}</div>`,
  });
}

// Leak check: nothing operational/private should survive into dist/
const leaks = [];
for (const f of fs.readdirSync(DIST, { recursive: true })) {
  if (!String(f).endsWith(".html")) continue;
  const html = fs.readFileSync(path.join(DIST, f), "utf8");
  for (const p of cfg.redact) if (html.includes(p)) leaks.push(`${f}: ${p}`);
}
if (leaks.length) {
  console.error("Private strings found in output:\n" + leaks.join("\n"));
  process.exit(1);
}
console.log(`built ${notes.length} notes, ${glossary.length} terms, ${logDays.length} log days, ${qaDays.length} qa days, ${cfg.videos.length} videos + ${ytCount} youtube -> dist/`);
