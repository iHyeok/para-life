// Hypothesis diagram on the overview page (illustrative values, not results)
(() => {
  const fig = document.querySelector(".gate");
  if (!fig) return;
  const HIGH = [0.72, 0.62, 0.45, 0.55];
  const LOW = [0.2, 0.1, 0.06, 0.12];
  const STATES = {
    "gate/assistant": {
      rep: HIGH, exp: [0.16, 0.07, 0.03, 0.08], open: 0.18,
      text: "<b>게이트 가설 · 기본 어시스턴트</b><br>감정 표상은 이미 켜져 있어요. 다만 문이 거의 닫혀 있어서 말에는 잘 드러나지 않습니다.",
    },
    "gate/other": {
      rep: HIGH, exp: [0.66, 0.56, 0.4, 0.5], open: 1,
      text: "<b>게이트 가설 · 다른 페르소나</b><br>표상은 그대로예요. 바뀐 건 문이 열린 정도라서, 같은 감정이 말로 풀려 나옵니다.",
    },
    "gen/assistant": {
      rep: LOW, exp: LOW.map((v) => v * 0.92), open: 1,
      text: "<b>생성기 가설 · 기본 어시스턴트</b><br>표상 자체가 약해요. 문은 열려 있지만 내보낼 감정이 적습니다.",
    },
    "gen/other": {
      rep: HIGH, exp: HIGH.map((v) => v * 0.92), open: 1,
      text: "<b>생성기 가설 · 다른 페르소나</b><br>페르소나가 감정 표상을 새로 만들어요. 표현은 표상을 따라 커집니다.",
    },
  };
  const rep = fig.querySelectorAll(".col-rep .bar i");
  const exp = fig.querySelectorAll(".col-exp .bar i");
  const door = fig.querySelector(".door");
  const cap = fig.querySelector("figcaption");
  function render() {
    const s = STATES[`${fig.dataset.hyp}/${fig.dataset.persona}`];
    rep.forEach((el, i) => el.style.setProperty("--w", s.rep[i]));
    exp.forEach((el, i) => el.style.setProperty("--w", s.exp[i]));
    door.style.setProperty("--open", s.open);
    cap.innerHTML = s.text;
  }
  fig.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-set]");
    if (!b) return;
    fig.dataset[b.dataset.set] = b.dataset.val;
    b.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    render();
  });
  render();
})();

// Glossary filter
(() => {
  const q = document.getElementById("gq");
  if (!q) return;
  const items = [...document.querySelectorAll("#glossary .term")];
  const empty = document.getElementById("gempty");
  q.addEventListener("input", () => {
    const v = q.value.trim().toLowerCase();
    let shown = 0;
    for (const it of items) {
      const hit = !v || it.dataset.q.includes(v);
      it.hidden = !hit;
      if (hit) shown++;
    }
    empty.hidden = shown > 0;
  });
})();

// Guide page: why "reaction width" survives the system-prompt shift (illustrative values)
(() => {
  const fig = document.querySelector(".demo");
  if (!fig) return;
  // [neutral rep, neutral exp, sad rep, sad exp] per persona
  const TRUTH = {
    gate: { a: [0.15, 0.05, 0.65, 0.15], f: [0.15, 0.1, 0.65, 0.7] },
    gen: { a: [0.15, 0.05, 0.35, 0.1], f: [0.15, 0.1, 0.7, 0.7] },
  };
  const SHIFT = 0.25; // instruction words push the friend persona's needle up in every situation
  const bars = fig.querySelectorAll(".bar i");
  const outs = fig.querySelectorAll(".bar output");
  const direct = fig.querySelector('[data-r="direct"] dd');
  const react = fig.querySelector('[data-r="react"] dd');
  const cap = fig.querySelector("figcaption");
  const f2 = (v) => v.toFixed(2);
  const sign = (v) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2);
  function render() {
    const t = TRUTH[fig.dataset.hyp];
    const trap = fig.dataset.trap === "on";
    const a = t.a.slice();
    const f = t.f.slice();
    if (trap) { f[0] = Math.min(1, f[0] + SHIFT); f[2] = Math.min(1, f[2] + SHIFT); }
    const vals = [...a, ...f];
    bars.forEach((el, i) => el.style.setProperty("--w", vals[i]));
    outs.forEach((el, i) => { el.textContent = f2(vals[i]); });
    const d = f[2] - a[2];
    const ra = a[2] - a[0];
    const rf = f[2] - f[0];
    const dSays = Math.abs(d) < 0.05 ? "gate" : "gen";
    const rSays = Math.abs(rf - ra) < 0.05 ? "gate" : "gen";
    const name = { gate: "게이트", gen: "생성기" };
    const truth = fig.dataset.hyp;
    const mark = (says) => (says === truth ? '<span class="ok">맞음</span>' : '<span class="bad">틀림</span>');
    direct.innerHTML = `${sign(d)} → ${name[dSays]}처럼 보임 ${mark(dSays)}`;
    react.innerHTML = `비서 ${f2(ra)} · 친구 ${f2(rf)} → ${name[rSays]}처럼 보임 ${mark(rSays)}`;
    if (truth === "gate" && trap) {
      cap.innerHTML = "<b>함정이 생기는 경우.</b> 진짜로는 게이트인데, 친구 지시문 때문에 바늘의 출발점이 올라갔어요. 높이를 바로 비교하면 \"친구가 더 슬퍼한다, 생성기다\"라고 잘못 읽습니다. 반응 폭은 두 페르소나가 같아서 게이트로 바르게 나와요.";
    } else if (truth === "gate") {
      cap.innerHTML = "<b>지시문 효과가 없다면</b> 두 방법 모두 게이트로 바르게 읽어요. 안은 같고, 겉(말)만 친구 쪽에서 커졌습니다. 문제는 지시문 효과가 실제로 있다는 것이고, 0단계가 그걸 보여 줬어요.";
    } else {
      cap.innerHTML = "<b>진짜로 생성기라면</b> 친구 페르소나에서 슬픈 이야기에 대한 반응 폭 자체가 커요. 지시문 효과가 있든 없든 반응 폭은 생성기로 바르게 읽습니다.";
    }
  }
  fig.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-set]");
    if (!b) return;
    fig.dataset[b.dataset.set] = b.dataset.val;
    b.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    render();
  });
  render();
})();

// YouTube click-to-load: the iframe is created only when someone presses play
(() => {
  document.querySelectorAll("button.yt-play[data-yt]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const f = document.createElement("iframe");
      f.src = `https://www.youtube-nocookie.com/embed/${btn.dataset.yt}?autoplay=1&rel=0`;
      f.title = btn.getAttribute("aria-label") || "YouTube";
      f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      f.allowFullscreen = true;
      f.referrerPolicy = "strict-origin-when-cross-origin";
      btn.replaceWith(f);
      f.focus();
    });
  });
})();
