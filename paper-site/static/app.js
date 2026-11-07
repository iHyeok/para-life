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
