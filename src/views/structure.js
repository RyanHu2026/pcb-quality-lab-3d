import { BOARD_TYPES, HOLE_TYPES } from "../data.js";
import { PCBViewer } from "../lib/pcbViewer.js";

const KIND_COLOR = {
  copper: "#c07a3c",
  core: "#8d8a5c",
  prepreg: "#a08a55",
  mask: "#1d5c40",
  coverlay: "#c99544",
};

const KIND_WHY = {
  copper: "这一层就是真正导电的铜。线路、焊盘、平面都在这里，电流只走铜，不走基材。",
  core: "芯板是「骨架」：已经固化的双面覆铜板，决定板子的厚度、强度和尺寸稳定性。软板里则换成聚酰亚胺（PI）。",
  prepreg: "半固化片是「胶水 + 介质」：压合前是半硬的树脂片，高温高压时流动、填满线路间隙，冷却后把各层粘死。",
  mask: "阻焊（绿油）只干两件事：保护铜面不被氧化、焊接时挡住不该上锡的地方。它不导电，也不承力。",
  coverlay: "覆盖膜是软板的「绿油」：一层 PI 薄膜 + 胶，压合在弯折区表面。它比阻焊柔韧得多，能跟着板子反复弯折。",
};

export function mountStructure(root, ctx) {
  const qs = new URLSearchParams(location.search);
  let board =
    BOARD_TYPES.find((b) => b.id === qs.get("board")) ||
    BOARD_TYPES.find((b) => b.id === "four") ||
    BOARD_TYPES[0];
  const startExplode = Math.max(0, Math.min(1, Number(qs.get("explode") || 0) / 100));
  let selectedLayer = null;
  let selectedHole = null;
  let viewer = null;

  root.innerHTML = `
    <div class="structure-grid">
      <div class="panel-col left">
        <div class="head"><span>板型</span><span>${BOARD_TYPES.length} TYPES</span></div>
        <div class="body">
          <div id="board-list"></div>

          <div class="ctrl-row" style="margin-top:16px">
            <label>展开 EXPLODE</label>
            <span style="margin-left:auto;font-family:var(--mono);font-size:10px;color:var(--cyan)" id="exp-val">0%</span>
          </div>
          <input id="explode" type="range" min="0" max="100" value="0" style="margin-top:8px" />
          <div style="display:flex;gap:8px;margin-top:10px">
            <button class="btn" id="btn-open" style="flex:1;justify-content:center">一键展开</button>
            <button class="btn" id="btn-reset" style="flex:1;justify-content:center">复位视角</button>
          </div>

          <div class="head" style="padding:16px 0 8px;border:0;font-size:10px">
            <span>叠层（从上到下）</span><span id="layer-count"></span>
          </div>
          <div id="layer-list"></div>
        </div>
      </div>

      <div class="viewer-wrap" id="stage">
        <div class="viewer-hud" id="hud">3D · 拖动旋转 / 滚轮缩放</div>
        <div class="viewer-tip">点任意一层查看它在干什么</div>
      </div>

      <div class="panel-col right">
        <div class="head"><span>信息</span><span id="info-tag">BOARD</span></div>
        <div class="body">
          <div id="info"></div>
          <div style="margin-top:16px">
            <div class="head" style="padding:0 0 8px;border:0;font-size:10px">
              <span>孔剖面 · 点孔看结构</span><span>SECTION</span>
            </div>
            <div id="xsec"></div>
            <div id="hole-chips" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  /* ---------- board list ---------- */
  const boardList = root.querySelector("#board-list");
  const layerList = root.querySelector("#layer-list");
  const infoEl = root.querySelector("#info");
  const infoTag = root.querySelector("#info-tag");
  const xsecEl = root.querySelector("#xsec");
  const holeChips = root.querySelector("#hole-chips");
  const expVal = root.querySelector("#exp-val");
  const expInput = root.querySelector("#explode");

  function renderBoardList() {
    boardList.innerHTML = BOARD_TYPES.map(
      (b) => `
      <button class="board-option ${b.id === board.id ? "active" : ""}" data-board="${b.id}">
        <div class="t"><b>${b.name}</b><span>${b.en}</span></div>
        <div class="m">${b.layerLabel || `${b.stack.length} 层结构`} · ${b.tag}</div>
      </button>`
    ).join("");
    boardList.querySelectorAll("[data-board]").forEach((el) => {
      el.addEventListener("click", () => {
        const next = BOARD_TYPES.find((b) => b.id === el.dataset.board);
        if (!next || next.id === board.id) return;
        board = next;
        selectedLayer = null;
        selectedHole = null;
        expInput.value = "0";
        expVal.textContent = "0%";
        viewer?.setExplode(0);
        viewer?.setBoard(board);
        renderBoardList();
        renderLayers();
        renderInfo();
        renderXSec();
        renderHoleChips();
      });
    });
  }

  function renderLayers() {
    root.querySelector("#layer-count").textContent = `${board.stack.length} LAYERS`;
    layerList.innerHTML = board.stack
      .map((l, i) => {
        const active = selectedLayer && selectedLayer.index === i ? "active" : "";
        return `<div class="layer-item ${active}" data-layer="${i}">
          <span class="sw" style="background:${KIND_COLOR[l.kind] || "#666"}"></span>
          <span class="nm">${l.name}</span>
          <span class="th">${l.mm.toFixed(3)}</span>
        </div>`;
      })
      .join("");
    layerList.querySelectorAll("[data-layer]").forEach((el) => {
      el.addEventListener("click", () => {
        const i = Number(el.dataset.layer);
        const layer = viewer ? viewer.layers[i]?.data : board.stack[i];
        if (!layer) return;
        selectedLayer = layer;
        selectedHole = null;
        viewer?.select(layer);
        renderLayers();
        renderInfo();
        renderXSec();
        if (!ctx.progress.seenLayers.includes(`${board.id}:${i}`)) {
          ctx.progress.seenLayers.push(`${board.id}:${i}`);
          ctx.save();
        }
      });
    });
  }

  function renderInfo() {
    if (selectedHole) {
      const h = HOLE_TYPES[selectedHole.type];
      infoTag.textContent = "HOLE";
      infoEl.innerHTML = `
        <div class="info-block">
          <h4>${h.name}</h4>
          <div class="en">${h.en}</div>
          <p>${h.desc}</p>
          <p style="color:#c6d2de">${h.detail}</p>
          <div class="kv">
            <div><span>所在板型</span><span>${board.name}</span></div>
            <div><span>连接层</span><span>${linkText(selectedHole)}</span></div>
          </div>
          <div class="explain" style="margin-top:12px"><b>面试可以这么说 · </b>${h.tip.replace("面试说法：", "")}</div>
        </div>`;
      return;
    }
    if (selectedLayer) {
      const l = selectedLayer;
      infoTag.textContent = "LAYER";
      infoEl.innerHTML = `
        <div class="info-block">
          <h4>${l.name}</h4>
          <div class="en">${l.en}</div>
          <p>${l.role}</p>
          <p style="color:#c6d2de">${KIND_WHY[l.kind] || ""}</p>
          <div class="kv">
            <div><span>厚度</span><span>${l.mm.toFixed(3)} mm</span></div>
            <div><span>类型</span><span>${kindName(l.kind)}</span></div>
            <div><span>所在板型</span><span>${board.name}</span></div>
          </div>
        </div>`;
      return;
    }
    infoTag.textContent = "BOARD";
    infoEl.innerHTML = `
      <div class="info-block">
        <h4>${board.name}</h4>
        <div class="en">${board.en}</div>
        <p>${board.brief}</p>
        <div class="kv">
          ${board.facts.map(([k, v]) => `<div><span>${k}</span><span>${v}</span></div>`).join("")}
          <div><span>典型用途</span><span style="max-width:150px">${board.use}</span></div>
        </div>
      </div>`;
  }

  function renderHoleChips() {
    const types = [...new Set(board.holes.map((h) => h.type))];
    holeChips.innerHTML = types
      .map((t) => {
        const info = HOLE_TYPES[t];
        const on = selectedHole && selectedHole.type === t;
        return `<button class="chip ${on ? "cyan" : ""}" data-hole="${t}" style="cursor:pointer;border:1px solid ${on ? "rgba(71,215,232,.45)" : "transparent"}">${info.name}</button>`;
      })
      .join("");
    holeChips.querySelectorAll("[data-hole]").forEach((el) => {
      el.addEventListener("click", () => selectHoleType(el.dataset.hole));
    });
  }

  function linkText(hole) {
    const a = board.stack[hole.from];
    const b = board.stack[hole.to];
    const fromName = a?.layer || a?.name;
    const toName = b?.layer || b?.name;
    return `${fromName} → ${toName}`;
  }

  function kindName(k) {
    return { copper: "铜层", core: "芯板", prepreg: "半固化片", mask: "阻焊层", coverlay: "覆盖膜" }[k] || k;
  }

  function selectHoleType(type) {
    const hole = board.holes.find((h) => h.type === type);
    if (!hole) return;
    selectedHole = hole;
    selectedLayer = null;
    viewer?.select(null);
    renderLayers();
    renderInfo();
    renderXSec();
    renderHoleChips();
  }

  /* ---------- cross section ---------- */
  function renderXSec() {
    const stack = board.stack;
    const heights = stack.map((l) => Math.max(11, l.mm * 11));
    const total = heights.reduce((a, b) => a + b, 0);
    const W = 340;
    const H = 236;
    const x0 = 40;
    const x1 = 322;
    const top = 26;
    const maxH = 168;
    const scale = Math.min(1, maxH / total);

    let y = top;
    const bands = [];
    stack.forEach((l, i) => {
      const h = heights[i] * scale;
      bands.push({ ...l, y, h, i });
      y += h;
    });
    const boardBottom = y;

    const holes = board.holes.map((h, i) => {
      const cx = x0 + (x1 - x0) * h.x;
      const w = h.type === "through" ? 12 : h.type === "micro" ? 6 : 9;
      const y0 = bands[h.from] ? bands[h.from].y : top;
      const y1 = bands[h.to] ? bands[h.to].y + bands[h.to].h : boardBottom;
      return { ...h, cx, w, y0, y1, i };
    });

    const bandSvg = bands
      .map((b) => {
        const fill = KIND_COLOR[b.kind] || "#555";
        const op = b.kind === "mask" ? 0.95 : 0.9;
        const sel = selectedLayer && selectedLayer.index === b.i;
        const label = b.layer
          ? `<text x="${x0 - 8}" y="${b.y + b.h / 2 + 3}" text-anchor="end" font-size="9" fill="${
              sel ? "#47d7e8" : "#8b98a8"
            }">${b.layer}</text>`
          : "";
        return `<g class="band" data-band="${b.i}">
          ${label}
          <rect x="${x0}" y="${b.y}" width="${x1 - x0}" height="${b.h}" fill="${fill}" opacity="${op}"
            stroke="${sel ? "#47d7e8" : "rgba(0,0,0,.35)"}" stroke-width="${sel ? 1.6 : 0.6}"/>
          ${sel ? `<rect x="${x0}" y="${b.y}" width="${x1 - x0}" height="${b.h}" fill="rgba(71,215,232,.16)"/>` : ""}
        </g>`;
      })
      .join("");

    const holeSvg = holes
      .map((h) => {
        const sel = selectedHole && selectedHole.type === h.type;
        const col = HOLE_TYPES[h.type].color;
        return `<g class="hole" data-hole="${h.type}" data-i="${h.i}">
          <rect x="${h.cx - h.w / 2}" y="${h.y0}" width="${h.w}" height="${h.y1 - h.y0}" fill="#05080a"/>
          <line class="plate" x1="${h.cx - h.w / 2}" y1="${h.y0}" x2="${h.cx - h.w / 2}" y2="${h.y1}" stroke="${col}" stroke-width="${sel ? 3 : 2}"/>
          <line class="plate" x1="${h.cx + h.w / 2}" y1="${h.y0}" x2="${h.cx + h.w / 2}" y2="${h.y1}" stroke="${col}" stroke-width="${sel ? 3 : 2}"/>
          <rect x="${h.cx - h.w / 2 - 5}" y="${h.y0 - 2.5}" width="${h.w + 10}" height="4" fill="${col}" opacity="0.85"/>
          <rect x="${h.cx - h.w / 2 - 5}" y="${h.y1 - 1.5}" width="${h.w + 10}" height="4" fill="${col}" opacity="0.85"/>
          ${sel ? `<rect x="${h.cx - h.w / 2 - 9}" y="${h.y0 - 6}" width="${h.w + 18}" height="${h.y1 - h.y0 + 12}" fill="none" stroke="${col}" stroke-dasharray="3 3" opacity="0.9"/>` : ""}
          <text x="${h.cx}" y="${h.y0 - 9}" text-anchor="middle" font-size="9.5" fill="${sel ? "#fff" : col}">${HOLE_TYPES[h.type].name}</text>
        </g>`;
      })
      .join("");

    xsecEl.innerHTML = `
      <svg class="xsec" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${W}" height="${H}" fill="transparent"/>
        <text x="${x0}" y="14" font-size="9" fill="#5c6a7a">TOP</text>
        <text x="${x1}" y="14" text-anchor="end" font-size="9" fill="#5c6a7a">BOTTOM</text>
        ${bandSvg}
        ${holeSvg}
        <line x1="${x0}" y1="${boardBottom + 8}" x2="${x1}" y2="${boardBottom + 8}" stroke="rgba(255,255,255,.12)" stroke-width="1"/>
        <text x="${x0}" y="${boardBottom + 24}" font-size="9.5" fill="#5c6a7a">总厚度约 ${stack.reduce((a, b) => a + b.mm, 0).toFixed(2)} mm（示意，厚度已放大）</text>
      </svg>`;

    xsecEl.querySelectorAll(".hole").forEach((el) => {
      el.addEventListener("click", () => selectHoleType(el.dataset.hole));
    });
    xsecEl.querySelectorAll(".band").forEach((el) => {
      el.addEventListener("click", () => {
        const i = Number(el.dataset.band);
        const layer = viewer ? viewer.layers[i]?.data : board.stack[i];
        if (!layer) return;
        selectedLayer = layer;
        selectedHole = null;
        viewer?.select(layer);
        renderLayers();
        renderInfo();
        renderXSec();
      });
    });
  }

  /* ---------- viewer ---------- */
  renderBoardList();
  renderLayers();
  renderInfo();
  renderHoleChips();
  renderXSec();

  requestAnimationFrame(() => {
    try {
      viewer = new PCBViewer(root.querySelector("#stage"), {
        onPick: (layer) => {
          selectedLayer = layer;
          selectedHole = null;
          renderLayers();
          renderInfo();
          renderXSec();
        },
        onHover: () => {},
      });
      viewer.setBoard(board);
      const onTheme = (e) => viewer && viewer.setTheme(e.detail);
      document.addEventListener("pcb-theme", onTheme);
      if (startExplode > 0) {
        viewer.setExplode(startExplode);
        viewer.explode = startExplode;
        viewer.updateExplode();
        expInput.value = String(Math.round(startExplode * 100));
        expVal.textContent = `${Math.round(startExplode * 100)}%`;
      }
      renderBoardList();
      renderLayers();
      renderInfo();
      renderHoleChips();
      renderXSec();
    } catch (err) {
      console.error(err);
      const stage = root.querySelector("#stage");
      if (stage) {
        stage.innerHTML = `<div style="position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:30px;color:#8b98a8;font-size:12.5px;line-height:1.9">
          3D 视图没有启动（浏览器可能未开启 WebGL2）。<br/>
          右侧的叠层列表与孔剖面仍然可以正常使用。
        </div>`;
      }
    }
  });

  /* ---------- controls ---------- */
  expInput.addEventListener("input", () => {
    const v = Number(expInput.value) / 100;
    expVal.textContent = `${Math.round(v * 100)}%`;
    viewer?.setExplode(v);
  });

  root.querySelector("#btn-open").addEventListener("click", () => {
    const next = Number(expInput.value) > 50 ? 0 : 100;
    expInput.value = String(next);
    expInput.dispatchEvent(new Event("input"));
  });

  root.querySelector("#btn-reset").addEventListener("click", () => {
    if (!viewer) return;
    viewer.camera.position.set(7.2, 6.9, 8.6);
    viewer.controls.target.set(0, 0, 0);
    viewer.controls.update();
  });

  return () => {
    if (viewer) viewer.dispose();
    viewer = null;
  };
}
