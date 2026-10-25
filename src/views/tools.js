import { AQL_TABLE } from "../data.js";

const TABS = [
  { id: "aql", name: "AQL 抽样" },
  { id: "d8", name: "8D 报告" },
  { id: "spc", name: "SPC 控制图" },
  { id: "check", name: "首件 / 巡检" },
];

const D8_STEPS = [
  ["D1", "成立小组", "谁参与？品质、工程、生产、供应商，各自的角色是什么。"],
  ["D2", "描述问题", "用 5W2H 写清楚：什么板、什么缺陷、多少数量、何时何地发现、影响多大。"],
  ["D3", "临时对策", "先止血：隔离、全检、加严抽检、暂停出货，并验证临时对策有效。"],
  ["D4", "根本原因", "用 5Why / 鱼骨图找到真因，并用数据或复现验证，不要停在「员工不小心」。"],
  ["D5", "永久对策", "针对根因改参数、改治具、改 SOP、改来料标准，明确责任人和完成时间。"],
  ["D6", "实施与验证", "小批验证 → 大批跟踪，用数据证明不良率真的降下来了。"],
  ["D7", "预防再发", "更新 FMEA、控制计划、检验标准、培训记录，把经验固化下来。"],
  ["D8", "表彰与关闭", "总结、复盘、认可团队，关闭报告并归档。"],
];

const D8_EXAMPLE = [
  "品质部、工程部、生产部、供应商 A",
  "2026-10-12 批次 P2410-03，FQC 发现 4 层板 L2 层偏，环宽不足 0.05 mm，共 120 pcs，占比 6%",
  "隔离该批 2000 pcs，全检外观 + X-Ray 抽测，暂停出货",
  "压合机第 3 段升温速率偏快，半固化片流动不足，导致滑板；温度曲线记录显示 2.8 °C/min（标准 ≤2.0）",
  "调整压合曲线、校准热电偶、增加每班首件温度曲线确认",
  "连续 5 批 X-Ray 抽测层偏全部 ≤0.03 mm，不良率降到 0.2%",
  "更新压合 SOP 与点检表，加入升温速率报警，纳入 FMEA",
  "已关闭，团队复盘完成",
];

export function mountTools(root, ctx) {
  let tab = "aql";

  root.innerHTML = `
    <div class="tool-tabs">
      ${TABS.map((t) => `<button class="btn ${t.id === tab ? "on" : ""}" data-tab="${t.id}">${t.name}</button>`).join("")}
    </div>
    <div id="tool-body"></div>
  `;
  const body = root.querySelector("#tool-body");

  root.querySelectorAll("[data-tab]").forEach((b) => {
    b.addEventListener("click", () => {
      tab = b.dataset.tab;
      root.querySelectorAll("[data-tab]").forEach((x) => x.classList.toggle("on", x === b));
      render();
    });
  });

  function render() {
    body.innerHTML = "";
    if (tab === "aql") renderAQL();
    if (tab === "d8") render8D();
    if (tab === "spc") renderSPC();
    if (tab === "check") renderCheck();
  }

  /* ---------------- AQL ---------------- */
  function renderAQL() {
    body.innerHTML = `
      <div class="card">
        <h3>AQL 抽样计算器</h3>
        <div class="sub">按 ISO 2859-1 / GB/T 2828.1：一般检验水平 II、正常检验、一次抽样。输入批量，直接得到样本数与 Ac/Re。</div>
        <div class="form-grid" style="margin-top:16px">
          <div class="field">
            <label>批量 LOT SIZE</label>
            <input id="lot" type="number" value="3000" min="2" step="1" />
          </div>
          <div class="field">
            <label>AQL 水平</label>
            <select id="aql">
              <option value="0.65">0.65（严）</option>
              <option value="1.0">1.0</option>
              <option value="1.5">1.5</option>
              <option value="2.5" selected>2.5（常用）</option>
              <option value="4.0">4.0（松）</option>
            </select>
          </div>
          <div class="field">
            <label>抽样水平</label>
            <select disabled><option>一般检验水平 II</option></select>
          </div>
        </div>
        <div class="result-big" id="aql-result"></div>
        <div style="margin-top:14px;font-size:11px;color:var(--dim-2);line-height:1.8">
          判定规则：抽到的不良数 <b style="color:var(--dim)">≤ Ac</b> 判接收；<b style="color:var(--dim)">≥ Re</b> 判拒收。
          若样本数在表中没有对应值，标准用「箭头」调整样本量，本工具已自动处理。实际请以公司/客户抽样方案为准。
        </div>
      </div>`;

    const lot = body.querySelector("#lot");
    const aql = body.querySelector("#aql");
    const out = body.querySelector("#aql-result");

    function calc() {
      const n0 = Math.max(2, Math.floor(Number(lot.value) || 0));
      const letter = AQL_TABLE.letters.find((l) => n0 <= l.max);
      const table = AQL_TABLE.ac[aql.value];
      const keys = Object.keys(table)
        .map(Number)
        .sort((a, b) => a - b);
      let n = letter.n;
      let ac = table[n];
      let adjusted = false;
      if (!ac) {
        const k = keys.find((x) => x >= n);
        if (k) {
          n = k;
          ac = table[k];
          adjusted = true;
        } else {
          n = keys[keys.length - 1];
          ac = table[n];
          adjusted = true;
        }
      }
      out.innerHTML = `
        <div class="b"><div class="k">样本代码</div><div class="v">${letter.code}</div></div>
        <div class="b"><div class="k">抽样数 n</div><div class="v">${n}<small> pcs</small></div></div>
        <div class="b"><div class="k">接收 Ac</div><div class="v" style="color:var(--green)">${ac[0]}</div></div>
        <div class="b"><div class="k">拒收 Re</div><div class="v" style="color:var(--red)">${ac[1]}</div></div>
        <div class="b" style="flex:1;min-width:200px">
          <div class="k">怎么用</div>
          <div style="font-size:11.5px;color:var(--dim);line-height:1.7;margin-top:6px">
            这批 ${n0} pcs，随机抽 ${n} pcs 检验；不良 ≤ ${ac[0]} 判合格，≥ ${ac[1]} 判不合格。
            ${adjusted ? `<br/><span style="color:var(--amber)">注：样本代码 ${letter.code} 对应 n=${letter.n}，该 AQL 无判定数，已按箭头规则调整为 n=${n}。</span>` : ""}
          </div>
        </div>`;
    }

    lot.addEventListener("input", calc);
    aql.addEventListener("change", calc);
    calc();
  }

  /* ---------------- 8D ---------------- */
  function render8D() {
    const key = "pcb-lab-8d";
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(key) || "{}");
    } catch {}

    body.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
          <div>
            <h3>8D 问题解决报告</h3>
            <div class="sub">客诉或批量不良的标准处理流程。先写满，再练「用一句话说清每个 D」。</div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn" id="d8-example">填入示例</button>
            <button class="btn" id="d8-export">导出 .txt</button>
            <button class="btn" id="d8-clear">清空</button>
          </div>
        </div>
        <div class="d8" style="margin-top:16px" id="d8-grid"></div>
      </div>`;

    const grid = body.querySelector("#d8-grid");
    grid.innerHTML = D8_STEPS.map(
      ([id, name, hint], i) => `
      <div class="field ${i >= 6 ? "full" : ""}">
        <label>${id} · ${name}</label>
        <textarea data-d8="${i}" placeholder="${hint}">${saved[i] || ""}</textarea>
        <div class="hint">${hint}</div>
      </div>`
    ).join("");

    const areas = [...grid.querySelectorAll("textarea")];
    areas.forEach((a) => {
      a.addEventListener("input", () => {
        const data = {};
        areas.forEach((x, i) => (data[i] = x.value));
        localStorage.setItem(key, JSON.stringify(data));
      });
    });

    body.querySelector("#d8-example").onclick = () => {
      areas.forEach((a, i) => (a.value = D8_EXAMPLE[i]));
      const data = {};
      areas.forEach((x, i) => (data[i] = x.value));
      localStorage.setItem(key, JSON.stringify(data));
    };

    body.querySelector("#d8-clear").onclick = () => {
      areas.forEach((a) => (a.value = ""));
      localStorage.removeItem(key);
    };

    body.querySelector("#d8-export").onclick = () => {
      const lines = D8_STEPS.map(([id, name], i) => `${id} ${name}\n${areas[i].value || "（未填写）"}\n`);
      const text = `8D 报告\n日期：${new Date().toLocaleDateString()}\n\n${lines.join("\n")}`;
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "8D-report.txt";
      a.click();
      URL.revokeObjectURL(a.href);
    };
  }

  /* ---------------- SPC ---------------- */
  function renderSPC() {
    body.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;align-items:flex-start">
          <div>
            <h3>SPC 控制图 · X-bar / R</h3>
            <div class="sub">每 30 分钟抽 5 片测板厚，画控制图看制程稳不稳。红点就是「失控」信号。</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="btn" id="spc-regen">重新采样</button>
            <button class="btn primary" id="spc-shift">模拟一次异常</button>
          </div>
        </div>
        <div class="chart-wrap" style="margin-top:16px">
          <canvas id="spc" width="900" height="420"></canvas>
        </div>
        <div id="spc-stat" style="margin-top:12px"></div>
      </div>`;

    const cv = body.querySelector("#spc");
    const ctx2 = cv.getContext("2d");
    const stat = body.querySelector("#spc-stat");
    const N = 25;
    const SUB = 5;
    const A2 = 0.577;
    const D4 = 2.114;
    const D3 = 0;

    function gauss() {
      let u = 0;
      let v = 0;
      while (!u) u = Math.random();
      while (!v) v = Math.random();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    function sample(shift) {
      const xs = [];
      for (let i = 0; i < N; i++) {
        const mean = 10 + (shift && i >= 17 && i <= 20 ? 0.055 : 0);
        const sub = [];
        for (let j = 0; j < SUB; j++) sub.push(mean + gauss() * 0.028);
        xs.push(sub);
      }
      return xs;
    }

    function draw(data) {
      const W = cv.width;
      const H = cv.height;
      const g = ctx2;
      g.clearRect(0, 0, W, H);
      g.fillStyle = "#0b1117";
      g.fillRect(0, 0, W, H);

      const mean = data.reduce((s, d) => s + d.reduce((a, b) => a + b, 0) / SUB, 0) / N;
      const bars = data.map((d) => d.reduce((a, b) => a + b, 0) / SUB);
      const ranges = data.map((d) => Math.max(...d) - Math.min(...d));
      const rbar = ranges.reduce((a, b) => a + b, 0) / N;
      const sigma = (rbar / 2.326).toFixed(4);
      const uclX = mean + A2 * rbar;
      const lclX = mean - A2 * rbar;
      const uclR = D4 * rbar;
      const lclR = D3 * rbar;

      const padL = 58;
      const padR = 24;
      const topH = 220;
      const botY = 250;
      const botH = 130;

      function panel(y0, h, values, cl, ucl, lcl, label, color) {
        const min = Math.min(lcl, ...values) - (Math.max(...values) - Math.min(...values)) * 0.15;
        const max = Math.max(ucl, ...values) + (Math.max(...values) - Math.min(...values)) * 0.15;
        const sx = (i) => padL + (i / (N - 1)) * (W - padL - padR);
        const sy = (v) => y0 + h - ((v - min) / (max - min)) * h;

        g.strokeStyle = "rgba(255,255,255,.08)";
        g.lineWidth = 1;
        g.strokeRect(padL, y0, W - padL - padR, h);

        [["UCL", ucl], ["CL", cl], ["LCL", lcl]].forEach(([nm, v]) => {
          g.strokeStyle = nm === "CL" ? "rgba(255,255,255,.3)" : "rgba(240,112,124,.55)";
          g.setLineDash(nm === "CL" ? [] : [5, 4]);
          g.beginPath();
          g.moveTo(padL, sy(v));
          g.lineTo(W - padR, sy(v));
          g.stroke();
          g.setLineDash([]);
          g.fillStyle = nm === "CL" ? "rgba(200,210,220,.7)" : "rgba(240,112,124,.9)";
          g.font = "10px Consolas, monospace";
          g.fillText(`${nm} ${v.toFixed(3)}`, 6, sy(v) - 3);
        });

        g.fillStyle = "rgba(200,210,220,.65)";
        g.font = "11px Consolas, monospace";
        g.fillText(label, padL, y0 - 8);

        g.strokeStyle = color;
        g.lineWidth = 1.6;
        g.beginPath();
        values.forEach((v, i) => {
          const x = sx(i);
          const y = sy(v);
          i ? g.lineTo(x, y) : g.moveTo(x, y);
        });
        g.stroke();

        values.forEach((v, i) => {
          const out = v > ucl || v < lcl;
          g.beginPath();
          g.arc(sx(i), sy(v), out ? 4.5 : 3, 0, Math.PI * 2);
          g.fillStyle = out ? "#f0707c" : color;
          g.fill();
          if (out) {
            g.strokeStyle = "rgba(240,112,124,.5)";
            g.beginPath();
            g.arc(sx(i), sy(v), 9, 0, Math.PI * 2);
            g.stroke();
          }
        });

        g.fillStyle = "rgba(139,152,168,.5)";
        g.font = "9px Consolas, monospace";
        for (let i = 0; i < N; i += 4) g.fillText(String(i + 1), sx(i) - 4, y0 + h + 14);
      }

      panel(40, topH - 40, bars, mean, uclX, lclX, "X-BAR  板厚均值 (mm)", "#47d7e8");
      panel(botY + 24, botH - 10, ranges, rbar, uclR, lclR, "R  极差 (mm)", "#f2b25c");

      const outPoints = bars.filter((v) => v > uclX || v < lclX).length;
      const cpk = Math.min((10.05 - mean) / (3 * Number(sigma)), (mean - 9.95) / (3 * Number(sigma)));
      stat.innerHTML = `
        <div class="result-big" style="margin-top:0">
          <div class="b"><div class="k">均值 X-barbar</div><div class="v">${mean.toFixed(4)}<small> mm</small></div></div>
          <div class="b"><div class="k">极差均值 R-bar</div><div class="v">${rbar.toFixed(4)}<small> mm</small></div></div>
          <div class="b"><div class="k">估计 σ</div><div class="v">${sigma}<small> mm</small></div></div>
          <div class="b"><div class="k">CPK（规格 10±0.05）</div><div class="v" style="color:${cpk >= 1.33 ? "var(--green)" : "var(--amber)"}">${cpk.toFixed(2)}</div></div>
          <div class="b"><div class="k">失控点</div><div class="v" style="color:${outPoints ? "var(--red)" : "var(--green)"}">${outPoints}</div></div>
        </div>
        <div style="font-size:11px;color:var(--dim-2);margin-top:10px;line-height:1.8">
          判读顺序：先看 R 图（越界说明变异变大），再看 X-bar 图（越界说明中心跑偏）。
          CPK ≥ 1.33 一般视为制程能力足够；CPK < 1.0 就要考虑改善或加严检验。
        </div>`;
    }

    let data = sample(false);
    draw(data);
    body.querySelector("#spc-regen").onclick = () => {
      data = sample(false);
      draw(data);
    };
    body.querySelector("#spc-shift").onclick = () => {
      data = sample(true);
      draw(data);
    };
  }

  /* ---------------- 首件 / 巡检 ---------------- */
  function renderCheck() {
    const FAI = [
      ["板厚", "千分尺测 5 点，1.60 ±0.10 mm"],
      ["外形尺寸", "二次元 / 卡尺，按图纸公差"],
      ["孔径", "孔检机，关键孔 100 % 确认"],
      ["环宽", "切片或 X-Ray，≥ 0.05 mm"],
      ["线宽线距", "线宽测量仪，按客户规格"],
      ["阻抗", "TDR 测试，50 Ω ±10 %"],
      ["翘曲", "平台 + 塞尺，≤ 0.75 %"],
      ["字符", "对照位号表，无错印漏印"],
      ["表面处理", "金厚/锡厚 + 外观"],
      ["包装标识", "型号、批次、数量、防潮"],
    ];
    const PATROL = [
      ["参数点检", "温度、压力、速度是否在控制范围"],
      ["首件确认", "每班/每批首件是否签核"],
      ["限度样本", "现场是否有有效限度样本"],
      ["不良隔离", "不良品是否标识隔离，无混入"],
      ["记录填写", "巡检记录是否及时、真实、可追溯"],
      ["环境", "温湿度、洁净度是否符合要求"],
      ["治具/量具", "是否在校验有效期内"],
    ];

    const key = "pcb-lab-checks";
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(key) || "{}");
    } catch {}

    body.innerHTML = `
      <div class="card">
        <h3>首件检验（FAI）与制程巡检（IPQC）</h3>
        <div class="sub">勾选完成项，进度会自动保存。面试时可以照着说：首件看什么、巡检看什么。</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:16px" id="check-cols"></div>
      </div>`;

    const cols = body.querySelector("#check-cols");
    const groups = [
      { id: "fai", title: "首件检验 FAI", items: FAI },
      { id: "patrol", title: "制程巡检 IPQC", items: PATROL },
    ];

    cols.innerHTML = groups
      .map(
        (g) => `
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <h5 style="font-size:11px;letter-spacing:.1em;color:var(--dim-2);font-family:var(--mono)">${g.title}</h5>
            <span class="chip" id="cnt-${g.id}">0 / ${g.items.length}</span>
          </div>
          <div class="check-list">
            ${g.items
              .map(
                ([t, s], i) => `
              <label class="check-item">
                <input type="checkbox" data-g="${g.id}" data-i="${i}" ${saved[`${g.id}${i}`] ? "checked" : ""}/>
                <span style="flex:1">${t}</span>
                <span class="s">${s}</span>
              </label>`
              )
              .join("")}
          </div>
        </div>`
      )
      .join("");

    function update() {
      groups.forEach((g) => {
        const boxes = [...cols.querySelectorAll(`input[data-g="${g.id}"]`)];
        const n = boxes.filter((b) => b.checked).length;
        const el = cols.querySelector(`#cnt-${g.id}`);
        if (el) el.textContent = `${n} / ${g.items.length}`;
      });
    }

    cols.querySelectorAll("input[type=checkbox]").forEach((b) => {
      b.addEventListener("change", () => {
        saved[`${b.dataset.g}${b.dataset.i}`] = b.checked;
        localStorage.setItem(key, JSON.stringify(saved));
        update();
      });
    });

    update();
  }

  render();
  return () => {};
}
