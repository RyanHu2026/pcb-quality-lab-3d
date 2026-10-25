import { STATIONS, PHASES } from "../data/line40.js";
import { PCBFactory } from "../lib/factory3d.js";

export function mountProcess(root, ctx) {
  let selected = 0;
  let mode = "3d";
  let factory = null;
  let paused = false;
  let speed = 1;
  let statsTimer = null;
  let panelSel = null;

  root.innerHTML = `
    <div class="tool-tabs" id="tabs">
      <button class="btn ${mode === "3d" ? "on" : ""}" data-mode="3d">3D 产线</button>
      <button class="btn" data-mode="list">流程清单</button>
      <span class="tabs-note" style="margin-left:auto;font-size:11px;color:var(--dim-2);align-self:center">
        40 站 · 刚性多层板主线 · 点设备看工序
      </span>
    </div>
    <div id="stage"></div>
    <div id="detail"></div>
  `;

  const tabs = root.querySelector("#tabs");
  const stage = root.querySelector("#stage");
  const detail = root.querySelector("#detail");

  tabs.querySelectorAll("[data-mode]").forEach((b) => {
    b.addEventListener("click", () => {
      if (mode === b.dataset.mode) return;
      mode = b.dataset.mode;
      tabs.querySelectorAll("[data-mode]").forEach((x) => x.classList.toggle("on", x === b));
      renderStage();
    });
  });

  function disposeFactory() {
    if (factory) factory.dispose();
    factory = null;
  }

  function renderStage() {
    disposeFactory();
    if (statsTimer) clearInterval(statsTimer);
    statsTimer = null;

    if (mode === "3d") {
      stage.innerHTML = `
        <div class="factory-wrap">
          <div id="factory"></div>
          <div class="factory-hud" id="hud"></div>
          <div class="factory-stats" id="fab-stats"></div>
          <div class="factory-ctrl" id="ctrl"></div>
        </div>`;
      const host = stage.querySelector("#factory");
      try {
        factory = new PCBFactory(host, {
          stations: STATIONS,
          onSelect: (i) => {
            selected = i;
            panelSel = null;
            renderDetail();
            renderHud();
          },
          onPanelSelect: (p) => {
            panelSel = p;
            renderDetail();
          },
        });
        factory.setSelected(selected);
        const qs = new URLSearchParams(location.search);
        const startPhase = qs.get("phase");
        if (startPhase && PHASES[startPhase]) {
          factory.focusPhase(startPhase);
          const idx = STATIONS.findIndex((s) => s.phase === startPhase);
          if (idx >= 0) {
            selected = idx;
            factory.setSelected(idx);
          }
        }
        // ?warp=90 → 产线直接快进 90 秒（用于验证 NG 分流与工件流动）
        const warp = Number(qs.get("warp") || 0);
        const ngRate = qs.get("ng");
        if (ngRate !== null) factory.ngRate = Math.max(0, Math.min(1, Number(ngRate)));
        if (warp > 0) factory.warp(Math.min(900, warp));
        if (qs.get("look") === "ng") factory.lookIsolation();
      } catch (err) {
        console.error(err);
        host.innerHTML = `<div class="factory-fallback">
          3D 产线没有启动（浏览器可能未开启 WebGL2）。<br/>
          切到「流程清单」照样可以看 40 站的完整工艺。
          <div class="err">${String(err && err.message ? err.message : err)}</div>
        </div>`;
      }
      renderHud();
      renderCtrl();
      updateStats();
      statsTimer = setInterval(updateStats, 900);
    } else {
      renderList();
    }
    renderDetail();
  }

  function updateStats() {
    const el = stage.querySelector("#fab-stats");
    if (!el || !factory) return;
    const s = factory.stats;
    const q = s.done + s.ng > 0 ? Math.round((s.done / (s.done + s.ng)) * 100) : 100;
    const parked = factory.panels.filter((p) => p.state === "ng").length;
    el.innerHTML = `
      <span>已产出 <b>${s.done}</b></span>
      <span>NG <b class="ng">${s.ng}</b></span>
      <span>隔离 <b class="ng">${parked}</b></span>
      <span>直通率 <b>${q}%</b></span>`;
    updateUtil();
  }

  function renderHud() {
    const hud = stage.querySelector("#hud");
    if (!hud) return;
    hud.innerHTML = Object.entries(PHASES)
      .map(
        ([k, p]) => `<button class="phase-chip ${k === STATIONS[selected].phase ? "on" : ""}" data-phase="${k}">
          <b>${k}</b>${p.name}
        </button>`
      )
      .join("");
    hud.querySelectorAll("[data-phase]").forEach((b) => {
      b.addEventListener("click", () => {
        factory && factory.focusPhase(b.dataset.phase);
        const idx = STATIONS.findIndex((s) => s.phase === b.dataset.phase);
        if (idx >= 0) {
          selected = idx;
          factory && factory.setSelected(idx);
          renderDetail();
          renderHud();
        }
      });
    });
  }

  function renderCtrl() {
    const ctrl = stage.querySelector("#ctrl");
    if (!ctrl) return;
    ctrl.innerHTML = `
      <button class="btn ${paused ? "on" : ""}" id="play">${paused ? "继续" : "暂停"}</button>
      <div class="speed">
        <span>速度</span>
        <input id="speed" type="range" min="30" max="250" value="${speed * 100}" />
        <b>${speed.toFixed(1)}×</b>
      </div>
      <button class="btn" id="overview">总览</button>
      <button class="btn" id="follow">定位当前站</button>
    `;
    ctrl.querySelector("#play").onclick = () => {
      paused = !paused;
      factory && factory.setPaused(paused);
      renderCtrl();
    };
    const sl = ctrl.querySelector("#speed");
    sl.oninput = () => {
      speed = Number(sl.value) / 100;
      factory && factory.setSpeed(speed);
      ctrl.querySelector(".speed b").textContent = `${speed.toFixed(1)}×`;
    };
    ctrl.querySelector("#overview").onclick = () => factory && factory.overview();
    ctrl.querySelector("#follow").onclick = () => factory && factory.focusStation(selected);
  }

  function renderList() {
    stage.innerHTML = `<div class="station-list">${Object.entries(PHASES)
      .map(([k, p]) => {
        const items = STATIONS.filter((s) => s.phase === k);
        return `
          <div class="phase-block">
            <div class="phase-head"><b>${k}</b>${p.name}<span>${items.length} 站</span></div>
            <div class="phase-items">
              ${items
                .map(
                  (s) => `<button class="station-chip ${s.no === STATIONS[selected].no ? "on" : ""}" data-no="${s.no}">
                    <i>${String(s.no).padStart(2, "0")}</i>${s.name}
                  </button>`
                )
                .join("")}
            </div>
          </div>`;
      })
      .join("")}</div>`;
    stage.querySelectorAll("[data-no]").forEach((b) => {
      b.addEventListener("click", () => {
        selected = Number(b.dataset.no) - 1;
        renderList();
        renderDetail();
      });
    });
  }

  function renderDetail() {
    if (panelSel) return renderPanelDetail();
    const s = STATIONS[selected];
    const ph = PHASES[s.phase];
    detail.innerHTML = `
      <div class="station-detail">
        <div class="sd-left">
          <div class="sd-no">${String(s.no).padStart(2, "0")}</div>
          <h3>${s.name}</h3>
          <div class="sd-en">${s.en}</div>
          <div class="sd-tags">
            <span class="chip" style="color:${ph.color};border:1px solid ${ph.color}44">${s.phase} · ${ph.name}</span>
            <span class="chip">${s.out}</span>
            <span class="chip" id="util">开动率 —</span>
          </div>
          <p>${s.purpose}</p>
          <div class="sd-nav">
            <button class="btn" id="prev">← 上一站</button>
            <button class="btn" id="next">下一站 →</button>
            ${mode === "3d" ? `<button class="btn" id="focus">在 3D 里看这台设备</button>` : ""}
          </div>
        </div>
        <div class="sd-right">
          <div class="sd-card">
            <h5>品质控制点</h5>
            <div class="pills">${s.q.map((x) => `<span class="pill green">${x}</span>`).join("")}</div>
          </div>
          <div class="sd-card">
            <h5>常见不良</h5>
            <div class="pills">${s.d.map((x) => `<span class="pill red">${x}</span>`).join("")}</div>
          </div>
          <div class="sd-card">
            <h5>关键设备 / 工具</h5>
            <div class="pills">${s.p.map((x) => `<span class="pill">${x}</span>`).join("")}</div>
          </div>
        </div>
      </div>`;
    detail.querySelector("#prev").onclick = () => {
      selected = (selected + 39) % 40;
      sync();
    };
    detail.querySelector("#next").onclick = () => {
      selected = (selected + 1) % 40;
      sync();
    };
    const f = detail.querySelector("#focus");
    if (f) f.onclick = () => factory && factory.focusStation(selected);
    updateUtil();
  }

  function renderPanelDetail() {
    const p = panelSel;
    const st = STATIONS[Math.min(p.next, 39)];
    const prog = Math.round((p.next / 40) * 100);
    detail.innerHTML = `
      <div class="station-detail">
        <div class="sd-left">
          <div class="sd-no" style="color:${p.defect ? "rgba(240,112,124,.45)" : "rgba(71,215,232,.24)"}">${p.id}</div>
          <h3>${p.defect ? "在制品 · 已判 NG" : "在制品"}</h3>
          <div class="sd-en">LOT ${p.lot} · 4 层板 · ${p.defect ? "已隔离" : `第 ${p.next + 1} / 40 站`}</div>
          <div class="sd-tags">
            <span class="chip ${p.defect ? "red" : "cyan"}">${p.defect ? `NG @ ${p.ngStation} 站` : "在制"}</span>
            <span class="chip">当前：${p.defect ? "隔离区" : st.name}</span>
            <span class="chip">流程 ${prog}%</span>
          </div>
          <p>${p.defect ? "被 AOI / 电测判定为不良，已从主线转移到隔离区等待复判。品质岗要做的就是把这类板子拦在厂内。" : "正在产线上流动。点一块板可以随时看它走到哪一站。"}</p>
          <div class="sd-nav">
            <button class="btn" id="back">← 返回工序详情</button>
            ${!p.defect && mode === "3d" ? `<button class="btn" id="go">定位这块板</button>` : ""}
          </div>
        </div>
        <div class="sd-right">
          <div class="sd-card">
            <h5>工件状态</h5>
            <div class="pills">
              <span class="pill">${p.defect ? "hold" : p.state === "work" ? "processing" : "moving"}</span>
              <span class="pill">route: rigid 4L</span>
              <span class="pill">rework: 0</span>
            </div>
          </div>
          <div class="sd-card">
            <h5>最近工序</h5>
            <div class="pills">
              ${STATIONS.slice(Math.max(0, p.next - 3), p.next + 1)
                .map((s) => `<span class="pill">${String(s.no).padStart(2, "0")} ${s.name}</span>`)
                .join("")}
            </div>
          </div>
        </div>
      </div>`;
    detail.querySelector("#back").onclick = () => {
      panelSel = null;
      renderDetail();
    };
    const go = detail.querySelector("#go");
    if (go) go.onclick = () => factory && factory.focusStation(Math.min(p.next, 39));
  }

  function updateUtil() {
    const el = detail.querySelector("#util");
    if (!el) return;
    const u = STATIONS[selected].util;
    el.textContent = `开动率 ${u ? Math.round(u * 100) : 0}%`;
  }

  function sync() {
    if (mode === "3d") {
      factory && factory.setSelected(selected);
      renderHud();
    } else {
      renderList();
    }
    renderDetail();
  }

  renderStage();
  return () => {
    if (statsTimer) clearInterval(statsTimer);
    statsTimer = null;
    disposeFactory();
  };
}





