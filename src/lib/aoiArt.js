/* AOI 挑战用的整板绘制：一张板画多处缺陷，并返回每处缺陷的坐标 */
import { paintMask } from "./pcbArt.js";

const GOLD = "#d8b25c";
const GREEN = "#1c6046";

function padAt(layout, i) {
  return layout.pads[i % layout.pads.length];
}
function viaAt(layout, i) {
  return layout.vias[i % layout.vias.length];
}

const DRAW = {
  open(ctx, W, H, l, k, sx, sy, v) {
    const list = [...l.traces].sort((a, b) => b.pts.length - a.pts.length);
    const t = list[v % Math.min(5, list.length)];
    const a = t.pts[0];
    const b = t.pts[t.pts.length - 1];
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    ctx.save();
    ctx.translate(sx(mx), sy(my));
    ctx.rotate(ang);
    ctx.fillStyle = GREEN;
    ctx.fillRect(-15, -8, 30, 16);
    ctx.strokeStyle = "rgba(196,150,90,0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-14, -5);
    ctx.lineTo(-14, 5);
    ctx.moveTo(14, -5);
    ctx.lineTo(14, 5);
    ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.lineTo(15, 0);
    ctx.stroke();
    ctx.restore();
    return { x: sx(mx), y: sy(my) };
  },

  short(ctx, W, H, l, k, sx, sy, v) {
    const pairs = [];
    for (let i = 0; i < l.pads.length; i++) {
      for (let j = i + 1; j < l.pads.length; j++) {
        const a = l.pads[i];
        const b = l.pads[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > 3 && d < 7.2) pairs.push({ a, b, d });
      }
    }
    const p = pairs[v % Math.max(1, pairs.length)];
    if (!p) return null;
    ctx.strokeStyle = "#d09a55";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(sx(p.a.x), sy(p.a.y));
    ctx.lineTo(sx(p.b.x), sy(p.b.y));
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,225,170,0.6)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    return { x: (sx(p.a.x) + sx(p.b.x)) / 2, y: (sy(p.a.y) + sy(p.b.y)) / 2 };
  },

  annular(ctx, W, H, l, k, sx, sy, v) {
    const via = viaAt(l, v * 3 + 1);
    const cx = sx(via.x);
    const cy = sy(via.y);
    const r = Math.max(8, via.r * k * 1.6);
    ctx.beginPath();
    ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
    ctx.fillStyle = GREEN;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.44, 0, Math.PI * 2);
    ctx.fillStyle = "#080c0e";
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 4;
    ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.78, 0.5, 4.3);
    ctx.stroke();
    return { x: cx, y: cy };
  },

  maskpad(ctx, W, H, l, k, sx, sy, v) {
    const p = padAt(l, v * 3 + 9);
    ctx.fillStyle = GREEN;
    ctx.beginPath();
    ctx.roundRect(sx(p.x) - 10, sy(p.y) - 10, 16, 20, 3);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();
    return { x: sx(p.x), y: sy(p.y) };
  },

  delam(ctx, W, H, l, k, sx, sy, v) {
    const x = W * (0.34 + 0.09 * (v % 3));
    const y = H * (0.78 + 0.03 * (v % 2));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.2);
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(i * 1.4, -i * 1.1, 46 - i * 6, 22 - i * 3, 0, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? "rgba(214,208,182,0.62)" : `rgba(240,238,222,${0.06 + i * 0.04})`;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, 46, 22, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
    return { x, y };
  },

  scratch(ctx, W, H, l, k, sx, sy, v) {
    const x0 = W * (0.16 + 0.04 * v);
    const y0 = H * 0.86;
    const x1 = x0 + W * 0.36;
    const y1 = y0 - H * 0.22;
    ctx.strokeStyle = "rgba(242,242,238,0.7)";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,205,150,0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
  },

  gold(ctx, W, H, l, k, sx, sy, v) {
    const p = padAt(l, v * 5 + 12);
    ctx.fillStyle = "rgba(58,44,30,0.92)";
    ctx.beginPath();
    ctx.roundRect(sx(p.x) - 9, sy(p.y) - 9, 18, 18, 2);
    ctx.fill();
    return { x: sx(p.x), y: sy(p.y) };
  },

  copper(ctx, W, H, l, k, sx, sy, v) {
    const via = viaAt(l, v * 4 + 2);
    const cx = sx(via.x);
    const cy = sy(via.y);
    ctx.fillStyle = "#d09a55";
    for (const [dx, dy, r] of [
      [14, -10, 2.8],
      [19, -6, 1.9],
      [16, -2, 1.5],
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
    return { x: cx + 16, y: cy - 8 };
  },

  holemiss(ctx, W, H, l, k, sx, sy, v) {
    const p = padAt(l, v * 4 + 5);
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(sx(p.x), sy(p.y), 4.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    return { x: sx(p.x), y: sy(p.y) };
  },

  silk(ctx, W, H, l, k, sx, sy, v) {
    const s = l.silk.find((x) => x.type === "text");
    if (!s) return null;
    ctx.fillStyle = GREEN;
    ctx.fillRect(sx(s.x) - 3, sy(s.y) - 16, 44, 22);
    ctx.fillStyle = "#e8eef0";
    ctx.font = `600 ${Math.max(7, s.size * k * 0.9)}px "Consolas", monospace`;
    ctx.fillText("U?", sx(s.x), sy(s.y));
    return { x: sx(s.x) + 14, y: sy(s.y) - 6 };
  },

  misreg(ctx, W, H, l, k, sx, sy, v) {
    const p = padAt(l, v * 6 + 6);
    const cx = sx(p.x);
    const cy = sy(p.y);
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.roundRect(cx - 9, cy - 11, 18, 22, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 5, cy + 4, 4.2, 0, Math.PI * 2);
    ctx.fillStyle = "#080c0e";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,120,120,0.85)";
    ctx.setLineDash([2, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 4.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    return { x: cx, y: cy };
  },

  warp(ctx, W, H, l, k, sx, sy, v) {
    const cx = W * 0.5;
    const cy = H * 0.72;
    const half = Math.min(W * 0.26, 230);
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - half, cy);
    ctx.lineTo(cx + half, cy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "#2a7a54";
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - half, cy - 3);
    ctx.quadraticCurveTo(cx, cy - 40, cx + half, cy - 3);
    ctx.stroke();
    ctx.strokeStyle = "#c07a3c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - half, cy - 9);
    ctx.quadraticCurveTo(cx, cy - 46, cx + half, cy - 9);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = `600 ${Math.max(10, W * 0.014)}px "Microsoft YaHei", sans-serif`;
    ctx.fillText("板翘（侧视）", cx - half, cy + 20);
    ctx.restore();
    return { x: cx, y: cy - 24 };
  },
};

/** 在图上圈出缺陷位置（图谱 / 详情用） */
export function drawDefectMark(ctx, x, y, W, H) {
  const big = W > 500;
  const r = big ? 46 : 18;
  const fs = big ? 13 : 9;
  const pad = big ? 8 : 5;
  const text = "缺陷位置";

  ctx.save();
  if (!big) {
    ctx.fillStyle = "rgba(255,92,104,0.10)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(255,92,104,0.95)";
  ctx.lineWidth = big ? 3 : 2;
  ctx.setLineDash(big ? [8, 6] : [4, 3]);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // 十字准星
  ctx.strokeStyle = "rgba(255,92,104,0.8)";
  ctx.lineWidth = big ? 1.6 : 1.2;
  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x + dx * (r + 3), y + dy * (r + 3));
    ctx.lineTo(x + dx * (r + (big ? 12 : 6)), y + dy * (r + (big ? 12 : 6)));
    ctx.stroke();
  }

  // 标签
  ctx.font = `600 ${fs}px "Microsoft YaHei", "PingFang SC", sans-serif`;
  const tw = ctx.measureText(text).width;
  const bw = tw + pad * 2;
  const bh = fs + pad * 2;
  let bx = x + r + 8;
  let by = y - r - bh - 6;
  if (bx + bw > W - 4) bx = x - r - 8 - bw;
  if (by < 4) by = y + r + 8;
  bx = Math.max(4, Math.min(bx, W - bw - 4));
  by = Math.max(4, Math.min(by, H - bh - 4));

  ctx.strokeStyle = "rgba(255,92,104,0.75)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + (bx > x ? r * 0.7 : -r * 0.7), y - r * 0.7);
  ctx.lineTo(bx + (bx > x ? 0 : bw), by + bh / 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(12,16,20,0.9)";
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffb3b9";
  ctx.fillText(text, bx + pad, by + pad + fs * 0.86);
  ctx.restore();
}

export const AOI_DEFECTS = ["open", "short", "annular", "maskpad", "delam", "scratch", "gold", "copper", "holemiss", "silk", "misreg"];

export function drawBoardAoi(ctx, W, H, layout, ids) {
  paintMask(ctx, W, H, layout, { title: "AOI  INSPECTION" });
  const k = W / layout.W;
  const sx = (x) => (x / layout.W) * W;
  const sy = (y) => (y / layout.H) * H;

  const anchors = [];
  ids.forEach((id, i) => {
    const fn = DRAW[id];
    if (!fn) return;
    const a = fn(ctx, W, H, layout, k, sx, sy, i);
    if (a) anchors.push({ id, x: a.x, y: a.y, idx: i });
  });
  return anchors;
}
