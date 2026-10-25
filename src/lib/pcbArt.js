/* ------------------------------------------------------------------ *
 *  程序化 PCB 图形：为 3D 叠层生成每一层底片，为缺陷判定生成整板视图
 * ------------------------------------------------------------------ */

export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const BOARD_W = 100;
export const BOARD_H = 62;

const rand = (rng, a, b) => a + rng() * (b - a);
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

/** 生成一块板的「设计数据」：焊盘/走线/过孔/丝印 */
export function createLayout(seed = 7) {
  const rng = mulberry32(seed);
  const pads = [];
  const traces = [];
  const vias = [];
  const silk = [];

  const addVia = (x, y, r = 1.1) => vias.push({ x, y, r });

  // 四个安装孔
  const mounts = [
    [7, 7],
    [93, 7],
    [7, 55],
    [93, 55],
  ];

  // 元件封装
  const blocks = [
    { x: 20, y: 16, w: 16, h: 11, kind: "qfp", name: "U1" },
    { x: 52, y: 14, w: 13, h: 8, kind: "soic", name: "U2" },
    { x: 74, y: 18, w: 9, h: 6, kind: "chip", name: "R1" },
    { x: 18, y: 40, w: 10, h: 7, kind: "chip", name: "C1" },
    { x: 40, y: 42, w: 16, h: 6, kind: "soic", name: "U3" },
    { x: 66, y: 40, w: 12, h: 9, kind: "qfp", name: "U4" },
    { x: 86, y: 36, w: 7, h: 5, kind: "chip", name: "C2" },
    { x: 42, y: 30, w: 8, h: 5, kind: "chip", name: "R2" },
  ];

  for (const b of blocks) {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;

    if (b.kind === "chip") {
      for (const s of [-1, 1]) {
        pads.push({
          x: cx + s * (b.w / 2 - 1),
          y: cy,
          w: 2.6,
          h: 2.2,
          block: b.name,
        });
      }
    } else if (b.kind === "soic") {
      const n = Math.max(3, Math.round(b.w / 3));
      for (let i = 0; i < n; i++) {
        const px = b.x + 2 + (i * (b.w - 4)) / (n - 1);
        for (const s of [-1, 1]) {
          pads.push({ x: px, y: cy + s * (b.h / 2 - 0.4), w: 1.7, h: 2.4, block: b.name });
        }
      }
    } else {
      const n = 5;
      for (let i = 0; i < n; i++) {
        const t = (i / (n - 1) - 0.5) * (b.w - 4);
        const u = (i / (n - 1) - 0.5) * (b.h - 4);
        pads.push({ x: cx + t, y: b.y + 1.2, w: 1.5, h: 2.2, block: b.name });
        pads.push({ x: cx + t, y: b.y + b.h - 1.2, w: 1.5, h: 2.2, block: b.name });
        pads.push({ x: b.x + 1.2, y: cy + u, w: 2.2, h: 1.5, block: b.name });
        pads.push({ x: b.x + b.w - 1.2, y: cy + u, w: 2.2, h: 1.5, block: b.name });
      }
    }
    silk.push({ type: "box", x: b.x, y: b.y, w: b.w, h: b.h });
    silk.push({ type: "text", x: b.x + 1, y: b.y - 1.6, text: b.name, size: 2.6 });
  }

  // 走线：从焊盘出发，走 L/45° 折线到附近的过孔
  const traceTargets = [];
  for (const p of pads) {
    if (rng() < 0.55) {
      const vx = p.x + rand(rng, -14, 14);
      const vy = p.y + rand(rng, -10, 10);
      const via = { x: Math.max(5, Math.min(95, vx)), y: Math.max(5, Math.min(57, vy)) };
      addVia(via.x, via.y, rand(rng, 0.9, 1.3));
      traces.push(makeTrace(rng, p.x, p.y, via.x, via.y, rand(rng, 1.1, 1.9)));
      traceTargets.push(via);
    }
  }
  // 再补一些总线
  for (let i = 0; i < 7; i++) {
    const y0 = rand(rng, 8, 54);
    const x0 = rand(rng, 8, 30);
    const x1 = x0 + rand(rng, 18, 50);
    traces.push(makeTrace(rng, x0, y0, Math.min(94, x1), y0 + rand(rng, -8, 8), rand(rng, 0.9, 1.4)));
  }

  // 装饰性过孔阵列
  for (let i = 0; i < 12; i++) {
    addVia(rand(rng, 10, 90), rand(rng, 10, 52), rand(rng, 0.8, 1.15));
  }

  return { W: BOARD_W, H: BOARD_H, pads, traces, vias, silk, mounts };
}

function makeTrace(rng, x0, y0, x1, y1, w) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const sx = Math.sign(dx) || 1;
  const sy = Math.sign(dy) || 1;
  const diag = Math.min(ax, ay) * 0.45;
  const pts = [
    [x0, y0],
    [x0 + sx * (ax - diag), y0 + sy * (ay - diag) * 0.5],
    [x1, y1],
  ];
  if (ax < 2 || ay < 2) pts.splice(1, 1);
  return { pts, w };
}

/* ---------------- 绘制工具 ---------------- */

function poly(ctx, pts, sx, sy) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    const px = sx(x);
    const py = sy(y);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
}

const COL = {
  substrate: "#131a1e",
  substrate2: "#0f1518",
  copper: "#c07a3c",
  copperHi: "#e0a05c",
  gold: "#d8b25c",
  mask: "#1d5c40",
  maskLight: "#2a7a54",
  silk: "#e8eef0",
};

function copperTone(ctx, W, H, rng, dark = false) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, dark ? "#a8632f" : "#c07a3c");
  g.addColorStop(0.5, dark ? "#b96f36" : "#d18c48");
  g.addColorStop(1, dark ? "#9c5a2a" : "#b56f34");
  return g;
}

/** 内层铜：平面层（地/电源） */
export function paintPlane(ctx, W, H, layout, seed = 1) {
  const rng = mulberry32(seed);
  const sx = (x) => (x / layout.W) * W;
  const sy = (y) => (y / layout.H) * H;
  ctx.fillStyle = COL.substrate;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = copperTone(ctx, W, H, rng);
  ctx.fillRect(sx(1.2), sy(1.2), W - sx(2.4), H - sy(2.4));

  // 铜面上的网纹质感
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  for (let i = 0; i < H; i += 7) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(W, i + 3);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // 隔离孔（clearance）
  const hole = (x, y, r) => {
    ctx.beginPath();
    ctx.arc(sx(x), sy(y), r, 0, Math.PI * 2);
    ctx.fillStyle = COL.substrate;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  };
  for (const v of layout.vias) hole(v.x, v.y, (v.r * 1.5 + 1) * (W / layout.W));
  for (const p of layout.pads) hole(p.x, p.y, ((p.w + p.h) / 4 + 1.4) * (W / layout.W));
  for (const m of layout.mounts) hole(m[0], m[1], 3.6 * (W / layout.W));

  // 热焊盘辐条
  ctx.strokeStyle = COL.copperHi;
  ctx.lineWidth = 2;
  for (const p of layout.pads.slice(0, 40)) {
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 + Math.PI / 4;
      const r0 = ((p.w + p.h) / 4 + 1.4) * (W / layout.W);
      ctx.beginPath();
      ctx.moveTo(sx(p.x) + Math.cos(a) * r0, sy(p.y) + Math.sin(a) * r0);
      ctx.lineTo(sx(p.x) + Math.cos(a) * (r0 + 6), sy(p.y) + Math.sin(a) * (r0 + 6));
      ctx.stroke();
    }
  }
}

/** 内层/外层信号层 */
export function paintCopper(ctx, W, H, layout, opts = {}) {
  const { seed = 3, bottom = false, sparse = false } = opts;
  const rng = mulberry32(seed);
  const sx = (x) => (x / layout.W) * W;
  const sy = (y) => (y / layout.H) * H;
  const k = W / layout.W;

  ctx.fillStyle = COL.substrate;
  ctx.fillRect(0, 0, W, H);

  // 大铜面（局部）
  if (!sparse) {
    ctx.fillStyle = "rgba(192,122,60,0.55)";
    ctx.fillRect(sx(2), sy(2), sx(24), sy(20));
    ctx.fillRect(sx(72), sy(38), sx(26), sy(22));
  }

  ctx.strokeStyle = COL.copper;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const t of layout.traces) {
    ctx.lineWidth = Math.max(2, t.w * k * 0.9);
    poly(ctx, t.pts, sx, sy);
    ctx.stroke();
    ctx.strokeStyle = COL.copperHi;
    ctx.lineWidth = Math.max(1, t.w * k * 0.35);
    ctx.stroke();
    ctx.strokeStyle = COL.copper;
  }

  // 焊盘
  for (const p of layout.pads) {
    const w = p.w * k;
    const h = p.h * k;
    ctx.fillStyle = COL.copper;
    ctx.beginPath();
    ctx.roundRect(sx(p.x) - w / 2, sy(p.y) - h / 2, w, h, 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,220,170,0.55)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 过孔环
  for (const v of layout.vias) {
    ctx.beginPath();
    ctx.arc(sx(v.x), sy(v.y), Math.max(3, v.r * k * 1.5), 0, Math.PI * 2);
    ctx.fillStyle = COL.copper;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sx(v.x), sy(v.y), Math.max(1.6, v.r * k * 0.65), 0, Math.PI * 2);
    ctx.fillStyle = "#0a0e10";
    ctx.fill();
  }

  // 安装孔
  for (const m of layout.mounts) {
    ctx.beginPath();
    ctx.arc(sx(m[0]), sy(m[1]), 3.6 * k, 0, Math.PI * 2);
    ctx.fillStyle = COL.copper;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sx(m[0]), sy(m[1]), 2.1 * k, 0, Math.PI * 2);
    ctx.fillStyle = "#07090b";
    ctx.fill();
  }
}

/** 阻焊层（成品外观：绿油 + 露铜焊盘 + 丝印） */
export function paintMask(ctx, W, H, layout, opts = {}) {
  const { title = "PCB-LAB", silk = true } = opts;
  const k = W / layout.W;
  const sx = (x) => (x / layout.W) * W;
  const sy = (y) => (y / layout.H) * H;

  // 板面底色
  const base = ctx.createLinearGradient(0, 0, W, H);
  base.addColorStop(0, "#20664a");
  base.addColorStop(0.5, "#1b5b41");
  base.addColorStop(1, "#154a35");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // 绿油下面的走线：隐约可见，也是缺陷判定的视觉依据
  ctx.strokeStyle = "rgba(8,44,30,0.55)";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const t of layout.traces) {
    ctx.lineWidth = Math.max(2, t.w * k * 0.95);
    poly(ctx, t.pts, sx, sy);
    ctx.stroke();
  }
  // 大面积铜（在绿油下颜色更深）
  ctx.fillStyle = "rgba(8,44,30,0.32)";
  ctx.fillRect(sx(2), sy(2), sx(24), sy(20));
  ctx.fillRect(sx(72), sy(38), sx(26), sy(22));

  // 绿油质感
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "rgba(255,255,255,0.10)");
  g.addColorStop(0.45, "rgba(255,255,255,0.0)");
  g.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 露出的焊盘
  for (const p of layout.pads) {
    const w = (p.w + 0.5) * k;
    const h = (p.h + 0.5) * k;
    ctx.fillStyle = COL.gold;
    ctx.beginPath();
    ctx.roundRect(sx(p.x) - w / 2, sy(p.y) - h / 2, w, h, 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  for (const v of layout.vias) {
    ctx.beginPath();
    ctx.arc(sx(v.x), sy(v.y), Math.max(2.4, v.r * k * 0.75), 0, Math.PI * 2);
    ctx.fillStyle = "#0b0f11";
    ctx.fill();
    ctx.strokeStyle = "rgba(216,178,92,0.8)";
    ctx.lineWidth = Math.max(1.2, v.r * k * 0.45);
    ctx.stroke();
  }
  for (const m of layout.mounts) {
    ctx.beginPath();
    ctx.arc(sx(m[0]), sy(m[1]), 2.6 * k, 0, Math.PI * 2);
    ctx.fillStyle = "#0a0d0f";
    ctx.fill();
    ctx.strokeStyle = "rgba(216,178,92,0.75)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // 丝印
  if (silk) {
    ctx.strokeStyle = COL.silk;
    ctx.fillStyle = COL.silk;
    ctx.lineWidth = Math.max(1, 0.22 * k);
    for (const s of layout.silk) {
      if (s.type === "box") {
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(sx(s.x) + 4, sy(s.y) + 4, s.w * k - 8, s.h * k - 8);
        ctx.setLineDash([]);
      } else {
        ctx.font = `600 ${Math.max(7, s.size * k * 0.9)}px "Consolas", monospace`;
        ctx.fillText(s.text, sx(s.x), sy(s.y));
      }
    }
    ctx.font = `600 ${Math.max(8, 2.3 * k * 0.9)}px "Consolas", monospace`;
    ctx.fillText(title, sx(4), sy(58.6));
    ctx.font = `500 ${Math.max(6.5, 1.7 * k * 0.9)}px "Consolas", monospace`;
    ctx.fillText("REV 1.0   2026-10", sx(4), sy(60.6));
  }

  // 板边
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(4, 4, W - 8, H - 8);
}

/** 整板俯视（用于缺陷判定），带缺陷绘制 */
export function drawBoard(ctx, W, H, layout, defectId) {
  paintMask(ctx, W, H, layout, { title: "PCB-LAB  DEMO BOARD" });
  const k = W / layout.W;
  const sx = (x) => (x / layout.W) * W;
  const sy = (y) => (y / layout.H) * H;
  const d = defectId;

  if (d === "open") {
    // 挑一条最长的走线，在中部开一个断口
    const t = [...layout.traces].sort((a, b) => b.pts.length - a.pts.length)[0];
    const a = t.pts[0];
    const b = t.pts[t.pts.length - 1];
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    ctx.save();
    ctx.translate(sx(mx), sy(my));
    ctx.rotate(ang);
    // 抹掉一段铜
    ctx.fillStyle = "#1c6046";
    ctx.fillRect(-16, -9, 32, 18);
    // 断口边缘的铜茬
    ctx.strokeStyle = "rgba(196,150,90,0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-15, -5);
    ctx.lineTo(-15, 5);
    ctx.moveTo(15, -5);
    ctx.lineTo(15, 5);
    ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.lineTo(16, 0);
    ctx.stroke();
    ctx.restore();
  }

  if (d === "short") {
    // 找两个相邻焊盘，中间连一条多余铜（铜渣桥接）
    let pair = null;
    for (let i = 0; i < layout.pads.length && !pair; i++) {
      for (let j = i + 1; j < layout.pads.length; j++) {
        const a = layout.pads[i];
        const b = layout.pads[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist > 3.5 && dist < 7) {
          pair = { a, b, dist };
          break;
        }
      }
    }
    if (pair) {
      ctx.strokeStyle = "#d09a55";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(sx(pair.a.x), sy(pair.a.y));
      ctx.lineTo(sx(pair.b.x), sy(pair.b.y));
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,225,170,0.55)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  if (d === "annular") {
    const v = layout.vias[0];
    const cx = sx(v.x);
    const cy = sy(v.y);
    const r = Math.max(7, v.r * k * 1.6);
    // 洗掉原环
    ctx.beginPath();
    ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
    ctx.fillStyle = "#1c6046";
    ctx.fill();
    // 孔
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = "#080c0e";
    ctx.fill();
    // 只剩一圈残缺的铜环
    ctx.strokeStyle = "#d8b25c";
    ctx.lineWidth = 4;
    ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.75, 0.5, 4.4);
    ctx.stroke();
  }

  if (d === "misreg") {
    const p = layout.pads[6];
    const cx = sx(p.x);
    const cy = sy(p.y);
    // 焊盘
    ctx.fillStyle = "#d8b25c";
    ctx.beginPath();
    ctx.roundRect(cx - 9, cy - 11, 18, 22, 2);
    ctx.fill();
    // 孔偏到一角
    ctx.beginPath();
    ctx.arc(cx + 5, cy + 4, 4.2, 0, Math.PI * 2);
    ctx.fillStyle = "#080c0e";
    ctx.fill();
    // 名义中心
    ctx.strokeStyle = "rgba(255,120,120,0.85)";
    ctx.setLineDash([2, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 4.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (d === "delam") {
    const x = W * 0.42;
    const y = H * 0.82;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.22);
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(i * 1.5, -i * 1.2, 52 - i * 6, 26 - i * 3, 0, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? "rgba(214,208,182,0.62)" : `rgba(240,238,222,${0.06 + i * 0.04})`;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, 52, 26, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // 翘起的边缘
    ctx.beginPath();
    ctx.arc(-6, 4, 38, Math.PI * 1.05, Math.PI * 1.75);
    ctx.strokeStyle = "rgba(90,80,60,0.45)";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  if (d === "maskpad") {
    const p = layout.pads[9];
    ctx.fillStyle = "#1c6046";
    ctx.beginPath();
    ctx.roundRect(sx(p.x) - 10, sy(p.y) - 10, 16, 20, 3);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(sx(p.x) - 9, sy(p.y) - 9, 14, 18);
  }

  if (d === "scratch") {
    ctx.strokeStyle = "rgba(240,240,240,0.65)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(W * 0.2, H * 0.82);
    ctx.lineTo(W * 0.62, H * 0.62);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,210,150,0.55)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  if (d === "silk") {
    const s = layout.silk.find((x) => x.type === "text");
    if (s) {
      ctx.fillStyle = "#1c6046";
      ctx.fillRect(sx(s.x) - 3, sy(s.y) - 16, 44, 22);
      ctx.fillStyle = COL.silk;
      ctx.font = `600 ${Math.max(7, s.size * k * 0.9)}px "Consolas", monospace`;
      ctx.fillText("U?", sx(s.x), sy(s.y));
    }
  }

  if (d === "gold") {
    const p = layout.pads[12] || layout.pads[0];
    ctx.fillStyle = "rgba(60,45,30,0.9)";
    ctx.beginPath();
    ctx.roundRect(sx(p.x) - 8, sy(p.y) - 8, 16, 16, 2);
    ctx.fill();
  }

  if (d === "copper") {
    const v = layout.vias[2];
    const cx = sx(v.x);
    const cy = sy(v.y);
    ctx.fillStyle = "#d09a55";
    for (const [dx, dy, r] of [
      [14, -10, 2.6],
      [19, -6, 1.8],
      [16, -2, 1.4],
      [23, -11, 1.2],
    ]) {
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(208,154,85,0.85)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx + 12, cy - 4);
    ctx.lineTo(cx + 22, cy - 12);
    ctx.stroke();
  }

  if (d === "holemiss") {
    const p = layout.pads[5];
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(sx(p.x), sy(p.y), 4.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

/** 渲染一张缩略图（用于缺陷图谱卡片） */
export function renderThumb(canvas, defectId, seed = 11) {
  const ctx = canvas.getContext("2d");
  const layout = createLayout(seed);
  drawBoard(ctx, canvas.width, canvas.height, layout, defectId);
}
