import "./style.css";
import { mountStructure } from "./views/structure.js";
import { mountDefects } from "./views/defects.js";
import { mountProcess } from "./views/process.js";
import { mountTools } from "./views/tools.js";
import { mountGlossary } from "./views/glossary.js";
import { DEFECTS } from "./data.js";

/* ---------------- icons ---------------- */
const ICONS = {
  home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-9.5Z"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
  shield: '<path d="M12 3 5 6v6c0 4.5 3 7.6 7 9 4-1.4 7-4.5 7-9V6l-7-3Z"/><path d="M9 12h6M12 9v6"/>',
  flow: '<rect x="3" y="4" width="6" height="5" rx="1"/><rect x="15" y="15" width="6" height="5" rx="1"/><path d="M9 6.5h4a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h-2"/><path d="M9 15h2"/>',
  tool: '<path d="M14.5 6.5a4 4 0 0 1 5 5L12 19a3 3 0 0 1-4.2-4.2l7.7-8.3Z"/><path d="M5 5l4 4"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5V5.5Z"/><path d="M8 7h8M8 11h6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
};

const NAV = [
  { id: "home", label: "学习地图", icon: "home" },
  { id: "structure", label: "结构拆解", icon: "layers", tag: "3D" },
  { id: "defects", label: "缺陷判定", icon: "shield", tag: "练" },
  { id: "process", label: "生产流程", icon: "flow" },
  { id: "tools", label: "品质工具", icon: "tool" },
  { id: "glossary", label: "术语词典", icon: "book" },
];

const icon = (name, size = 14) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="width:${size}px;height:${size}px">${ICONS[name]}</svg>`;

const META = {
  home: { t: "学习地图", s: "从一块板子开始，建立你的 PCB 品质知识体系" },
  structure: { t: "结构拆解", s: "拖动展开叠层，点开每一层看它到底在干什么" },
  defects: { t: "缺陷判定", s: "12 种真实缺陷，像 FQC 一样判 OK / NG" },
  process: { t: "生产流程", s: "40 站刚性多层板产线 · 点设备看工艺与品质控制点" },
  tools: { t: "品质工具", s: "AQL 抽样、8D、SPC、首件与巡检，面试最常问的四件套" },
  glossary: { t: "术语词典", s: "61 个高频术语，中英对照，随查随用" },
};

/* ---------------- progress ---------------- */
const KEY = "pcb-lab-progress-v1";
const defaultProgress = {
  visited: {},
  quiz: { round: 0, correct: 0, total: 0, best: 0, streak: 0, bestStreak: 0 },
  seenDefects: [],
  seenLayers: [],
  wrong: {},
  lastRoute: "home",
};

function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(defaultProgress);
    return { ...structuredClone(defaultProgress), ...JSON.parse(raw) };
  } catch {
    return structuredClone(defaultProgress);
  }
}

const progress = loadProgress();
function saveProgress() {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {}
  updateSidebar();
}

/* ---------------- shell ---------------- */
const app = document.getElementById("app");
app.innerHTML = `
  <aside class="sidebar" id="sidebar">
    <div class="brand">
      <div class="mark">
        <svg viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="3"/>
          <path d="M7 8h10M7 12h6M7 16h8"/>
          <circle cx="17" cy="12" r="1.4"/><circle cx="15.5" cy="16" r="1.4"/>
        </svg>
      </div>
      <div>
        <h1>PCB 品质实验室</h1>
        <p>QUALITY · LAB</p>
      </div>
    </div>
    <nav id="nav">
      ${NAV.map(
        (n) => `<a data-route="${n.id}">
          <svg viewBox="0 0 24 24">${ICONS[n.icon]}</svg>
          <span class="label">${n.label}</span>
          ${n.tag ? `<span class="tag-mini">${n.tag}</span>` : ""}
        </a>`
      ).join("")}
    </nav>
    <div class="side-foot">
      <div class="row"><span>学习进度</span><b id="prog-text">0%</b></div>
      <div class="bar"><i id="prog-bar" style="width:0%"></i></div>
      <div class="hint">建议顺序：结构拆解 → 生产流程 → 缺陷判定 → 品质工具</div>
    </div>
  </aside>
  <div class="scrim" id="scrim"></div>
  <main>
    <header class="topbar">
      <button class="menu-btn" id="menu-btn" aria-label="打开菜单">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M4 7h16M4 12h16M4 17h16"/>
        </svg>
      </button>
      <div class="titles">
        <h1 id="page-title">学习地图</h1>
        <p id="page-sub"></p>
      </div>
      <div class="right">
        <span class="chip" id="quiz-chip">判定 0 / 0</span>
        <button class="btn" id="reset-progress">重置进度</button>
      </div>
    </header>
    <div id="view"></div>
  </main>
`;

const sidebarEl = document.getElementById("sidebar");
const scrimEl = document.getElementById("scrim");
const menuBtn = document.getElementById("menu-btn");

function closeMenu() {
  sidebarEl.classList.remove("open");
  scrimEl.classList.remove("show");
}
menuBtn.addEventListener("click", () => {
  const open = sidebarEl.classList.toggle("open");
  scrimEl.classList.toggle("show", open);
});
scrimEl.addEventListener("click", closeMenu);

const viewEl = document.getElementById("view");
const navEl = document.getElementById("nav");
const titleEl = document.getElementById("page-title");
const subEl = document.getElementById("page-sub");

navEl.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-route]");
  if (!a) return;
  e.preventDefault();
  location.hash = `#/${a.dataset.route}`;
  closeMenu();
});

function updateSidebar() {
  const total = NAV.length;
  const done = NAV.filter((n) => progress.visited[n.id]).length;
  const pct = Math.round((done / total) * 100);
  document.getElementById("prog-text").textContent = `${pct}%`;
  document.getElementById("prog-bar").style.width = `${pct}%`;
  const q = progress.quiz;
  document.getElementById("quiz-chip").textContent = q.total
    ? `判定正确率 ${Math.round((q.correct / q.total) * 100)}%`
    : "判定 0 / 0";
}

document.getElementById("reset-progress").addEventListener("click", () => {
  if (!confirm("确定要清空学习进度和判定成绩吗？")) return;
  Object.assign(progress, structuredClone(defaultProgress));
  saveProgress();
  location.hash = "#/home";
  render();
});

/* ---------------- router ---------------- */
const MOUNTS = {
  home: mountHome,
  structure: mountStructure,
  defects: mountDefects,
  process: mountProcess,
  tools: mountTools,
  glossary: mountGlossary,
};

let cleanup = null;

function currentRoute() {
  const h = location.hash.replace(/^#\/?/, "");
  return META[h] ? h : "home";
}

function render() {
  const route = currentRoute();
  if (cleanup) {
    try {
      cleanup();
    } catch {}
    cleanup = null;
  }
  viewEl.innerHTML = "";
  viewEl.scrollTop = 0;

  titleEl.textContent = META[route].t;
  subEl.textContent = META[route].s;
  document.querySelectorAll("#nav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.route === route);
  });

  progress.visited[route] = true;
  progress.lastRoute = route;
  saveProgress();

  const ctx = { progress, save: saveProgress, go: (r) => (location.hash = `#/${r}`) };
  cleanup = MOUNTS[route](viewEl, ctx) || null;
}

window.addEventListener("hashchange", render);

if (!location.hash) location.hash = "#/home";
render();

/* ---------------- home ---------------- */
function mountHome(root, ctx) {
  const q = ctx.progress.quiz;
  const seen = ctx.progress.seenDefects.length;
  const acc = q.total ? Math.round((q.correct / q.total) * 100) : 0;

  const modules = [
    {
      id: "structure",
      title: "结构拆解",
      en: "STACK-UP EXPLORER",
      icon: "layers",
      desc: "8 种板型：单双面 / 4 层 / 6 层 / 8 层 / HDI 1–2 阶 / 软硬结合，逐层拆开；四种孔用剖面图讲清楚。",
      go: "拆开一块板",
      badge: "核心",
    },
    {
      id: "defects",
      title: "缺陷判定",
      en: "DEFECT JUDGEMENT",
      icon: "shield",
      desc: "给你一块板，你判 OK 还是 NG；判错立刻给解释和 IPC 依据，像真的 FQC 一样。",
      go: "开始判定",
      badge: "面试高频",    },
    {
      id: "process",
      title: "生产流程",
      en: "FAB PROCESS",
      icon: "flow",
      desc: "开料 → 内层 → 压合 → 钻孔 → 电镀 → 阻焊 → 表面处理 → 成型 → 电测 → 出货。",
      go: "走一遍产线",
    },
    {
      id: "tools",
      title: "品质工具",
      en: "QUALITY TOOLKIT",
      icon: "tool",
      desc: "AQL 抽样计算器、8D 报告、SPC 控制图、首件/巡检清单，都能直接上手用。",
      go: "打开工具箱",
    },
    {
      id: "glossary",
      title: "术语词典",
      en: "GLOSSARY",
      icon: "book",
      desc: "61 个高频词中英对照，按「结构 / 工艺 / 品质」分类，搜一下就能看。",
      go: "查术语",
    },
  ];

  root.innerHTML = `
    <section class="hero">
      <div class="kicker">PCB QUALITY LAB · 零基础 → 面试可用</div>
      <h2>把一块 PCB 拆开看，<br/>再把它的品质讲清楚</h2>
      <p>这是给「准备品质岗、但完全没接触过 PCB」的人做的模拟器。不用背术语，先看、再动手判、最后用工具算一遍——面试官问到的，基本都在里面。</p>
      <div class="actions">
        <button class="btn primary" data-go="structure">先拆一块 4 层板 ${icon("arrow", 15)}</button>
        <button class="btn" data-go="defects">我直接做判定</button>
      </div>
    </section>

    <div class="card" style="margin-top:14px">
      <h3>先花 60 秒：PCB 到底是什么？</h3>
      <div class="sub" style="line-height:1.9">
        PCB（印制电路板）就是所有电子设备里那块绿色、蓝色或黑色的板子。它本身不「干活」，
        但把芯片、电阻、电容用铜线连起来，让电流按设计好的路线走。<br/>
        铜线其实在板子<b style="color:var(--text)">里面</b>，外面盖一层绿油保护，只留下焊盘给元件焊接——
        所以你在成品板上看到的「线路」，往往是透过绿油隐约露出来的。<br/>
        <b style="color:var(--text)">单面板</b>只有一层铜；<b style="color:var(--text)">4 层板</b>就是 4 层铜夹着绝缘层压在一起，
        靠「孔」把不同层连起来。品质岗要做的，就是判断这些层、这些孔、这些线路有没有做对。
      </div>
    </div>

    <div class="stats-row">
      <div class="stat"><div class="k">判定正确率</div><div class="v">${acc}<small>%</small></div></div>
      <div class="stat"><div class="k">已练题数</div><div class="v">${q.total}<small>题</small></div></div>
      <div class="stat"><div class="k">认识缺陷</div><div class="v">${seen}<small>/ ${DEFECTS.length}</small></div></div>
      <div class="stat"><div class="k">最长连对</div><div class="v">${q.bestStreak}<small>连</small></div></div>
    </div>

    <div class="mod-grid">
      ${modules
        .map(
          (m) => `
        <button class="mod" data-go="${m.id}">
          <div class="ico"><svg viewBox="0 0 24 24">${ICONS[m.icon]}</svg></div>
          ${m.badge ? `<span class="badge">${m.badge}</span>` : ""}
          <h3>${m.title}</h3>
          <div class="en">${m.en}</div>
          <p>${m.desc}</p>
          <div class="go">${m.go} ${icon("arrow", 13)}</div>
        </button>`
        )
        .join("")}
    </div>

    <div class="card" style="margin-top:16px">
      <h3>面试可以这么说</h3>
      <div class="sub">背下来就能用的六句话，点开看完整回答。</div>
      <div id="lines" style="margin-top:12px"></div>
    </div>
  `;

  root.querySelectorAll("[data-go]").forEach((b) => {
    b.addEventListener("click", () => ctx.go(b.dataset.go));
  });

  // 面试话术
  import("./data.js").then(({ INTERVIEW_LINES }) => {
    const box = root.querySelector("#lines");
    if (!box) return;
    box.innerHTML = INTERVIEW_LINES.map(
      (l, i) => `
      <div class="list-card" style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
          <h5 style="margin:0">Q${i + 1} · ${l.q}</h5>
          <span class="chip cyan">${l.tag}</span>
        </div>
        <p style="font-size:11.5px;line-height:1.8;color:var(--dim);margin-top:8px">${l.a}</p>
      </div>`
    ).join("");
  });

  document.querySelectorAll("#nav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.route === "home");
  });
}

