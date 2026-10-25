// jsdom smoke test：不启动 WebGL，验证各视图的 DOM 渲染与交互不报错
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
});

globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.localStorage = dom.window.localStorage;
globalThis.location = dom.window.location;
globalThis.Image = dom.window.Image;
globalThis.requestAnimationFrame = () => 0; // 跳过 3D 初始化

const grad = { addColorStop() {} };
const ctxStub = () =>
  new Proxy(
    {
      createLinearGradient: () => grad,
      createRadialGradient: () => grad,
      measureText: () => ({ width: 10 }),
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    },
    { get: (t, p) => (p in t ? t[p] : () => {}), set: (t, p, v) => ((t[p] = v), true) }
  );
dom.window.HTMLCanvasElement.prototype.getContext = () => ctxStub();

const root = document.getElementById("root");
const progress = { visited: {}, quiz: { round: 0, correct: 0, total: 0, best: 0, streak: 0, bestStreak: 0 }, seenDefects: [], seenLayers: [] };
const ctx = { progress, save() {}, go() {} };

function mount(name, fn) {
  root.innerHTML = "";
  try {
    fn(root, ctx);
  } catch (e) {
    console.error(`✗ ${name}:`, e);
    process.exitCode = 1;
    return false;
  }
  console.log(`✓ ${name} mounted, nodes=${root.querySelectorAll("*").length}`);
  return true;
}

const { mountStructure } = await import("../src/views/structure.js");
const { mountDefects } = await import("../src/views/defects.js");
const { mountProcess } = await import("../src/views/process.js");
const { mountTools } = await import("../src/views/tools.js");
const { mountGlossary } = await import("../src/views/glossary.js");

/* structure */
if (mount("structure", mountStructure)) {
  const boards = root.querySelectorAll(".board-option");
  console.log("  board options:", boards.length);
  const layers = root.querySelectorAll(".layer-item");
  console.log("  layer rows:", layers.length);
  boards[4]?.click(); // HDI
  console.log("  after HDI click, layers:", root.querySelectorAll(".layer-item").length);
  root.querySelectorAll(".layer-item")[1]?.click();
  console.log("  info tag:", root.querySelector("#info-tag")?.textContent);
  root.querySelectorAll("#hole-chips .chip")[0]?.click();
  console.log("  hole info tag:", root.querySelector("#info-tag")?.textContent);
  const svg = root.querySelectorAll("#xsec svg");
  console.log("  xsec svg:", svg.length, "holes:", root.querySelectorAll("#xsec .hole").length);
  root.querySelector("#explode").value = "100";
  root.querySelector("#explode").dispatchEvent(new dom.window.Event("input"));
  console.log("  explode label:", root.querySelector("#exp-val").textContent);
}

/* defects */
if (mount("defects", mountDefects)) {
  const side = root.querySelector("#side");
  console.log("  side text:", side.textContent.trim().slice(0, 24));
  root.querySelector("[data-v=ok]").click();
  console.log("  after verdict, side has result:", !!root.querySelector("#next"));
  // 再点下一块
  root.querySelector("#next")?.click();
  console.log("  new round ok:", !!root.querySelector("[data-v=ok]"));
  // 切图谱
  root.querySelectorAll("[data-tab]")[2].click();
  console.log("  catalog cards:", root.querySelectorAll(".dcard").length);
  console.log("  upload buttons:", root.querySelectorAll(".photo-add").length);
  root.querySelector(".dcard")?.click();
  console.log("  modal open:", !!root.querySelector(".modal"));
  root.querySelector("#close")?.click();
  // 错题本
  root.querySelectorAll("[data-tab]")[3].click();
  console.log("  wrong tab text:", root.querySelector("#tab-body").textContent.trim().slice(0, 12));
  // AOI
  root.querySelectorAll("[data-tab]")[1].click();
  root.querySelector("#aoi-start").click();
  console.log("  aoi bar:", root.querySelector("#aoi-bar").textContent.replace(/\s+/g, " ").trim().slice(0, 40));
  root.querySelectorAll("[data-tab]")[0].click();
}

/* process */
if (mount("process", mountProcess)) {
  console.log("  3d fallback:", root.querySelector("#stage").textContent.trim().slice(0, 24));
  console.log("  detail station:", root.querySelector(".station-detail h3").textContent);
  root.querySelectorAll("[data-mode]")[1].click(); // 流程清单
  console.log("  station chips:", root.querySelectorAll(".station-chip").length);
  root.querySelectorAll(".station-chip")[16].click();
  console.log("  after chip click:", root.querySelector(".station-detail h3").textContent);
  root.querySelector("#next").click();
  console.log("  after next:", root.querySelector(".station-detail h3").textContent);
}

/* tools */
if (mount("tools", mountTools)) {
  for (const lot of ["10", "500", "1200", "50000"]) {
    root.querySelector("#lot").value = lot;
    root.querySelector("#lot").dispatchEvent(new dom.window.Event("input"));
    const v = [...root.querySelectorAll("#aql-result .v")].map((e) => e.textContent.trim());
    console.log(`  AQL lot=${lot} →`, v.join(" | "));
  }
  root.querySelectorAll("[data-tab]")[1].click();
  root.querySelector("#d8-example").click();
  console.log("  8D textarea filled:", root.querySelector("textarea").value.length > 10);
  root.querySelectorAll("[data-tab]")[2].click();
  root.querySelector("#spc-shift").click();
  console.log("  spc stat:", root.querySelector("#spc-stat").textContent.trim().slice(0, 40));
  root.querySelectorAll("[data-tab]")[3].click();
  console.log("  check items:", root.querySelectorAll(".check-item").length);
}

/* glossary */
if (mount("glossary", mountGlossary)) {
  console.log("  terms:", root.querySelectorAll(".gterm").length);
  const q = root.querySelector("#q");
  q.value = "盲孔";
  q.dispatchEvent(new dom.window.Event("input"));
  console.log("  search 盲孔:", root.querySelectorAll(".gterm").length);
  root.querySelectorAll("[data-c]")[2]?.click();
  console.log("  category 工艺:", root.querySelectorAll(".gterm").length);
}

console.log(process.exitCode ? "\nDOM TEST FAILED" : "\nDOM TEST OK");
