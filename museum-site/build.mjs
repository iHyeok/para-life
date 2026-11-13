// Builds the progress site for the socratic-museum-guide project.
// Sources: the project's own repo docs (shared memory between the phone chat, home Claude Code
// and the Museum chat session) and the PARA project file. Nothing is written by hand here;
// operational/private lines are dropped by config.json "redact" and the build fails if any remain.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { Marked } from "marked";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const DIST = path.join(HERE, "dist");
const cfg = JSON.parse(fs.readFileSync(path.join(HERE, "config.json"), "utf8"));
const REPO = process.env.MUSEUM_REPO || path.join(os.homedir(), "projects", "socratic-museum-guide");

const readRepo = (p) => fs.readFileSync(path.join(REPO, p), "utf8");
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// ---------- markdown helpers ----------

function sections(body, level = 2) {
  const re = new RegExp(`^${"#".repeat(level)} (.+?)\\s*$`);
  const out = { _intro: [] };
  let cur = "_intro";
  for (const line of body.split("\n")) {
    const m = line.match(re);
    if (m) { cur = m[1]; out[cur] = []; continue; }
    out[cur].push(line);
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.join("\n").trim()]));
}

/** Drop lines (and nested children of list items) that contain private/operational details. */
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

// Links into the repo can't be opened by readers (private repo): keep the text, point docs to pages here
const DOC_PAGES = {
  "docs/handoff.md": "log.html", "handoff.md": "log.html",
  "docs/decisions.md": "decisions.html", "decisions.md": "decisions.html",
  "docs/context.md": "background.html", "context.md": "background.html",
  "README.md": "prototype.html",
};
function rewriteLinks(md) {
  return md.replace(/\[([^\]]+)\]\((?!https?:|#)([^)]+)\)/g, (all, text, href) => (DOC_PAGES[href] ? `[${text}](${DOC_PAGES[href]})` : text));
}

const marked = new Marked({ gfm: true });
const tilde = (md) => md.replace(/(?<!~)~(?!~)/g, "\\~");
const md2html = (md) => marked.parse(tilde(rewriteLinks(redact(md))));
const inline = (md) => marked.parseInline(tilde(rewriteLinks(md)));

// ---------- data ----------

const projectFile = matter(fs.readFileSync(path.join(ROOT, "projects", `${cfg.project}.md`), "utf8"));
const project = projectFile.data;
const psec = sections(projectFile.content);
const tasks = [...(psec["Tasks"] || "").matchAll(/^- \[( |x)\] (.+)$/gm)].map((m) => ({ done: m[1] === "x", text: m[2] }));

// docs/handoff.md: entries "## YYYY-MM-DD · 폰 채팅 | 클코 | 채널 (title)" after the first "---", newest first
const handoffRaw = readRepo(cfg.repoDocs.handoff);
const handoffBody = handoffRaw.includes("\n---\n") ? handoffRaw.slice(handoffRaw.indexOf("\n---\n") + 5) : handoffRaw;
const entries = handoffBody
  .split(/^## /m)
  .slice(1)
  .map((s) => {
    const nl = s.indexOf("\n");
    const head = s.slice(0, nl).trim();
    const m = head.match(/^(\d{4}-\d{2}-\d{2})\s*·\s*([^(]+?)\s*(?:\((.+)\))?$/);
    const md = s.slice(nl + 1).trim();
    const fields = {};
    for (const part of md.split(/^- (?=[^\n:]{1,12}:)/m).slice(1)) {
      const k = part.slice(0, part.indexOf(":")).trim();
      fields[k] = part.slice(part.indexOf(":") + 1).replace(/^\s*\n/, "").trimEnd();
    }
    return { head, date: m ? m[1] : head, source: m ? m[2] : "", title: m ? m[3] || "" : "", md, fields };
  });

const decisionsMd = readRepo(cfg.repoDocs.decisions);
const dsec = sections(decisionsMd);
const decidedRows = (dsec["확정"] || "").split("\n").filter((l) => /^\|\s*\d{4}-/.test(l));
const openItems = [...(dsec[Object.keys(dsec).find((k) => k.startsWith("미정")) || ""] || "").matchAll(/^\d+\.\s+(.+)$/gm)].map((m) => m[1]);

const git = (...args) => execFileSync("git", ["-C", REPO, ...args], { encoding: "utf8" }).trim();
const repoUpdated = git("log", "-1", "--format=%cs");
const updated = [repoUpdated, project.updatedAt].filter(Boolean).sort().pop();

const dday = Math.ceil((new Date(`${cfg.deadline}T23:59:59+09:00`) - new Date()) / 86400000);
const SOURCE_LABEL = { "폰 채팅": "폰", "클코": "Claude Code", "채널": "채팅 세션" };

// ---------- layout ----------

const NAV = [
  ["index.html", "개요"],
  ["log.html", "진행 기록"],
  ["decisions.html", "결정"],
  ["prototype.html", "프로토타입"],
  ["background.html", "배경"],
];

const EXTRA_CSS = `
.museum-hero { padding: 40px 0 28px; border-bottom: 1px solid var(--rule); }
.museum-hero h1 { margin: 0 0 14px; font-size: clamp(2.1rem, 5vw, 3.8rem); line-height: 1.1; font-weight: 800; letter-spacing: -.03em; }
.museum-hero .lede { margin: 0 0 18px; color: var(--muted); font-size: 18px; max-width: 40em; }
.facts { display: flex; flex-wrap: wrap; gap: 10px 28px; margin: 0; padding: 0; list-style: none; font-size: 15px; }
.facts b { font-size: 20px; margin-right: 6px; }
.now-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; }
.now-grid > div { background: var(--surface); border-radius: var(--radius-sm); box-shadow: inset 0 0 0 1px var(--rule); padding: 16px 18px; min-width: 0; }
.now-grid h3 { margin: 0 0 8px; font-size: 15px; color: var(--muted); font-weight: 600; }
.now-grid .prose ul, .now-grid .prose ol { margin: 0; padding-left: 1.2em; }
.now-grid .prose p { margin: 0 0 6px; }
.src { display: inline-block; font-size: 12px; font-weight: 600; padding: 1px 8px; border-radius: 999px; box-shadow: inset 0 0 0 1px var(--rule); color: var(--muted); vertical-align: middle; margin-left: 6px; }
.log .day h2 small { display: block; color: var(--muted); font-size: 14px; font-weight: 500; margin-top: 4px; }
.open-list { margin: 0; padding-left: 1.4em; max-width: 78ch; }
.open-list li { margin-bottom: 6px; }
@media (max-width: 720px) { .log .day { grid-template-columns: 1fr; gap: 6px; } .log .day h2 { position: static; } }
`;

function page({ file, title, body, desc }) {
  const nav = NAV.map(([href, label]) => `<a href="${href}"${href === file ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title ? `${title} | ${cfg.title}` : cfg.title)}</title>
<meta name="description" content="${esc(desc || cfg.subtitle)}">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="stylesheet" href="style.css">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpath d='M5 12 16 5l11 7z' fill='%230e7c7b'/%3E%3Cpath d='M8 13v11M13 13v11M19 13v11M24 13v11M5 26h22' stroke='%230e7c7b' stroke-width='2.4' stroke-linecap='round'/%3E%3C/svg%3E">
</head>
<body>
<a class="skip" href="#main">본문으로 건너뛰기</a>
<header class="top">
  <a class="brand" href="index.html"><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="9" cy="23" r="4"/><path d="M9 23 L25 8"/></svg>${esc(cfg.title)}</a>
  <nav aria-label="사이트">${nav}</nav>
</header>
<main id="main">
${body}
</main>
<footer class="foot">
  <p>진행 중인 프로토타입의 제작 기록입니다. 아직 확정되지 않은 내용이 많고, 미팅과 테스트를 거치며 바뀝니다. 외부에 공유하지 말아 주세요(심사 전 연구).</p>
  <p>마지막 갱신 ${esc(updated)}</p>
</footer>
</body>
</html>`;
  fs.writeFileSync(path.join(DIST, file), html);
}

const field = (e, k) => (e && e.fields[k] ? md2html(e.fields[k]) : "");

// ---------- pages ----------

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
for (const f of ["robots.txt", "_headers"]) fs.copyFileSync(path.join(HERE, "static", f), path.join(DIST, f));
fs.writeFileSync(path.join(DIST, "style.css"), fs.readFileSync(path.join(HERE, "static", "style.css"), "utf8") + EXTRA_CSS);

const latest = entries[0];
const doneCount = tasks.filter((t) => t.done).length;

page({
  file: "index.html",
  body: `
<section class="museum-hero">
  <h1>${esc(cfg.title)}</h1>
  <p class="lede">${esc(cfg.subtitle)}</p>
  <ul class="facts">
    <li><b>${dday > 0 ? `D-${dday}` : "마감"}</b>제출 마감 ${esc(cfg.deadline)} (확장 초록 + 이미지 6~8장)</li>
    <li><b>${decidedRows.length}</b>확정된 결정</li>
    <li><b>${openItems.length}</b>미팅에서 정할 것</li>
  </ul>
</section>

${latest ? `<section class="block" aria-labelledby="now-title">
  <h2 id="now-title">지금 상태 <time>${esc(latest.date)}</time><span class="src">${esc(SOURCE_LABEL[latest.source] || latest.source)}</span></h2>
  <div class="now-grid">
    ${latest.fields["상태"] ? `<div><h3>되는 것 / 안 되는 것</h3><div class="prose">${field(latest, "상태")}</div></div>` : ""}
    ${latest.fields["다음"] ? `<div><h3>다음 할 일</h3><div class="prose">${field(latest, "다음")}</div></div>` : ""}
    ${latest.fields["열린 질문"] ? `<div><h3>열린 질문</h3><div class="prose">${field(latest, "열린 질문")}</div></div>` : ""}
  </div>
  <p class="more"><a href="log.html">진행 기록 전체 보기</a></p>
</section>` : ""}

${tasks.length ? `<section class="block" aria-labelledby="tasks-title">
  <h2 id="tasks-title">큰 단계 <span class="count">${doneCount} / ${tasks.length}</span></h2>
  <ul class="tasks">
    ${tasks.map((t) => `<li class="${t.done ? "done" : ""}"><span class="box" aria-hidden="true"></span>${t.done ? '<span class="sr">완료: </span>' : ""}${inline(t.text)}</li>`).join("")}
  </ul>
</section>` : ""}

${openItems.length ? `<section class="block" aria-labelledby="open-title">
  <h2 id="open-title">아직 정하지 않은 것 <span class="count">${openItems.length}</span></h2>
  <ol class="open-list">${openItems.map((t) => `<li>${inline(redact(t))}</li>`).join("")}</ol>
  <p class="more"><a href="decisions.html">결정 기록 보기</a></p>
</section>` : ""}
`,
});

page({
  file: "log.html",
  title: "진행 기록",
  body: `<header class="page-head"><h1>진행 기록</h1><p>폰 채팅, Claude Code, 채팅 세션에서 한 일을 같은 일지에 남깁니다. 최근 항목이 위에 있어요. 무엇을 만들었는지뿐 아니라 왜 그렇게 했는지, 무엇이 안 됐는지도 그대로 둡니다.</p></header>
<div class="log">${entries
    .map((e) => `<section class="day"><h2><time>${esc(e.date)}</time><small>${esc(SOURCE_LABEL[e.source] || e.source)}${e.title ? ` · ${esc(e.title)}` : ""}</small></h2><div class="prose">${md2html(e.md)}</div></section>`)
    .join("")}</div>`,
});

const stripH1 = (md) => md.replace(/^# .+\n+/, "");

page({
  file: "decisions.html",
  title: "결정",
  body: `<header class="page-head"><h1>결정 기록</h1><p>무엇을 언제, 왜, 누가 정했는지. 사용자가 확정한 것과 Claude가 제안만 한 것을 나눠 둡니다.</p></header>
<div class="prose prose-wide">${md2html(stripH1(decisionsMd))}</div>`,
});

page({
  file: "prototype.html",
  title: "프로토타입",
  body: `<header class="page-head"><h1>프로토타입 구조</h1><p>지금 코드가 무엇을 어떻게 하는지. 저장소 README 그대로입니다.</p></header>
<div class="prose prose-wide">${md2html(stripH1(readRepo(cfg.repoDocs.readme)))}</div>`,
});

page({
  file: "background.html",
  title: "배경",
  body: `<header class="page-head"><h1>배경: 학회 조건과 논문 요지</h1><p>설계의 기준이 되는 논문과 RTD Roams 2027 제출 조건 요약.</p></header>
<div class="prose prose-wide">${md2html(stripH1(readRepo(cfg.repoDocs.context)))}</div>`,
});

// ---------- leak check ----------

const leaks = [];
for (const f of fs.readdirSync(DIST).filter((f) => f.endsWith(".html"))) {
  const html = fs.readFileSync(path.join(DIST, f), "utf8");
  for (const p of cfg.redact) if (html.includes(esc(p)) || html.includes(p)) leaks.push(`${f}: ${p}`);
}
if (leaks.length) {
  console.error(`redact strings leaked:\n  ${leaks.join("\n  ")}`);
  process.exit(1);
}
console.log(`built ${fs.readdirSync(DIST).length} files from ${entries.length} log entries (repo ${repoUpdated}, D-${dday})`);
