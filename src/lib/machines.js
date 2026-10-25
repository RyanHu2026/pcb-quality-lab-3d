import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/* 每站独立配置：尺寸、颜色、特征件都不同 */
export const MACHINE_CFG = {
  1: { b: "desk", kind: "cam", w: 2.1, d: 1.2, h: 0.92, color: "#dfe4ea" },
  2: { b: "desk", kind: "iqc", w: 2.2, d: 1.2, h: 0.9, color: "#dbe0e6" },
  3: { b: "shear", w: 2.7, d: 1.8, h: 2.5, color: "#dfe3e8" },
  4: { b: "brush", len: 3.9, h: 1.35, color: "#d8dde3" },
  5: { b: "film", w: 2.6, color: "#e3e7ec" },
  6: { b: "cabinet", w: 2.6, h: 2.45, d: 1.9, win: 2, duct: true, mon: true, color: "#dde2e8", accent: "#2f7fa8" },
  7: { b: "wet", mode: "des", len: 5.2, h: 1.45, bays: 5, color: "#d9dee4", chem: "#2ec9d8" },
  8: { b: "wet", mode: "des", len: 4.9, h: 1.45, bays: 4, color: "#cfd6de", chem: "#e08a3c" },
  9: { b: "wet", mode: "des", len: 4.5, h: 1.4, bays: 3, color: "#d9dee4", chem: "#b06ee0" },
  10: { b: "cabinet", w: 2.4, h: 2.2, d: 1.8, win: 1, mon: true, color: "#e0e4e9", accent: "#2f7fa8" },
  11: { b: "wet", mode: "brown", len: 4.7, h: 1.3, color: "#ccd2d9", chem: "#8a5a34" },
  12: { b: "layup", w: 2.4, color: "#dde2e8" },
  13: { b: "rivet", w: 2.2, color: "#dfe3e8" },
  14: { b: "press", w: 3.4, d: 2.4, h: 4.0, color: "#d7dce2" },
  15: { b: "rack", color: "#d8dde3" },
  16: { b: "cabinet", w: 2.3, h: 2.3, d: 1.9, win: 1, mon: true, xray: true, color: "#e4e7eb", accent: "#2f7fa8" },
  17: { b: "cabinet", w: 3.2, h: 2.4, d: 2.1, win: 3, duct: true, drill: true, color: "#d9dee4", accent: "#3a6f8f" },
  18: { b: "brush", len: 2.7, h: 1.2, small: true, color: "#dde2e8" },
  19: { b: "wet", mode: "desmear", len: 4.4, h: 1.4, color: "#d5dbe2", chem: "#3aa0c8" },
  20: { b: "wet", mode: "gantry", len: 5.0, h: 1.35, color: "#d8dde3", chem: "#4f7fd0" },
  21: { b: "wet", mode: "vcp", len: 4.8, h: 1.8, color: "#d3d9e0", chem: "#7a6ae0" },
  22: { b: "brush", len: 3.4, h: 1.3, color: "#dbe0e6" },
  23: { b: "film", w: 2.6, color: "#e0e4e9" },
  24: { b: "cabinet", w: 2.6, h: 2.45, d: 1.9, win: 2, duct: true, mon: true, color: "#dde2e8", accent: "#2f7fa8" },
  25: { b: "wet", mode: "des", len: 4.4, h: 1.4, color: "#d9dee4", chem: "#2ec9d8" },
  26: { b: "wet", mode: "pattern", len: 4.8, h: 1.5, color: "#d6dce3", chem: "#d9a33a" },
  27: { b: "wet", mode: "des", len: 4.2, h: 1.4, color: "#d8dde3", chem: "#b06ee0" },
  28: { b: "wet", mode: "des", len: 4.9, h: 1.45, bays: 4, color: "#cfd6de", chem: "#e08a3c" },
  29: { b: "cabinet", w: 2.4, h: 2.2, d: 1.8, win: 1, mon: true, color: "#e0e4e9", accent: "#2f7fa8" },
  30: { b: "desk", kind: "review", w: 2.1, d: 1.2, h: 0.9, color: "#dfe4ea" },
  31: { b: "brush", len: 3.1, h: 1.3, color: "#dbe0e6" },
  32: { b: "coater", w: 2.7, color: "#dde2e8" },
  33: { b: "cabinet", w: 2.4, h: 2.2, d: 1.8, win: 2, mon: true, color: "#e2e6ea", accent: "#2f7fa8" },
  34: { b: "wet", mode: "des", len: 4.1, h: 1.35, color: "#d9dee4", chem: "#4ad08a" },
  35: { b: "oven", len: 3.4, color: "#d5dae1" },
  36: { b: "inkjet", w: 2.6, color: "#dfe3e8" },
  37: { b: "wet", mode: "finish", len: 4.6, h: 1.4, color: "#d8dde3", chem: "#d8b25c" },
  38: { b: "router", w: 2.9, color: "#d9dee4" },
  39: { b: "flyprobe", w: 2.6, color: "#dde2e8" },
  40: { b: "bench", color: "#dfe4ea" },
};

const C = (hex) => new THREE.Color(hex);

function matte(hex, rough = 0.68, metal = 0.06) {
  return new THREE.MeshStandardMaterial({ color: C(hex), roughness: rough, metalness: metal });
}

/* ---------- 通用细节 ---------- */
function body(g, cfg, M, w, h, d, y0 = 0) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(0.05, h / 6)), M.shell);
  m.position.set(0, y0 + h / 2, 0);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function seams(g, M, w, h, d, n, y0 = 0) {
  for (let i = 1; i <= n; i++) {
    const x = -w / 2 + (w / (n + 1)) * i;
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.012, h * 0.88, 0.012), M.seam);
    s.position.set(x, y0 + h / 2, d / 2 + 0.002);
    g.add(s);
  }
}

function vents(g, M, x, y, z, w = 0.5, h = 0.3, n = 6) {
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(w, 0.018, 0.02), M.seam);
    s.position.set(x, y - h / 2 + (h / (n - 1)) * i, z);
    g.add(s);
  }
}

function handle(g, M, x, y, z) {
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 10), M.steel);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(x, y, z);
  g.add(bar);
  for (const dx of [-0.1, 0.1]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 8), M.steel);
    p.rotation.x = Math.PI / 2;
    p.position.set(x + dx, y, z - 0.02);
    g.add(p);
  }
}

function feet(g, M, w, d) {
  for (const dx of [-w / 2 + 0.14, w / 2 - 0.14]) {
    for (const dz of [-d / 2 + 0.12, d / 2 - 0.12]) {
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.1, 12), M.dark);
      f.position.set(dx, 0.05, dz);
      g.add(f);
    }
  }
}

function tower(g, M, x, y, z) {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.12, 10), M.steel);
  base.position.set(x, y, z);
  g.add(base);
  const mats = [0xff4d5e, 0xf2b25c, 0x55d69b].map(
    (c) => new THREE.MeshStandardMaterial({ color: 0x0b1014, emissive: C(c), emissiveIntensity: 1.2, roughness: 0.4 })
  );
  mats.forEach((m, i) => {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 12), m);
    seg.position.set(x, y + 0.09 + i * 0.055, z);
    g.add(seg);
  });
  return mats;
}

function plate(g, no, x, y, z, w = 0.26, h = 0.12) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 120;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#e8ecf1";
  ctx.fillRect(0, 0, 256, 120);
  ctx.strokeStyle = "#9aa5b2";
  ctx.lineWidth = 4;
  ctx.strokeRect(3, 3, 250, 114);
  ctx.fillStyle = "#22303c";
  ctx.font = "700 62px Consolas, monospace";
  ctx.textAlign = "center";
  ctx.fillText(String(no).padStart(2, "0"), 128, 78);
  ctx.font = "500 20px Consolas, monospace";
  ctx.fillText("STATION", 128, 104);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.05 })
  );
  m.position.set(x, y, z);
  g.add(m);
}

function monitor(g, M, x, y, z, w = 0.52, h = 0.34, rot = 0) {
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.05, h + 0.05, 0.05), M.dark);
  frame.position.set(x, y, z);
  frame.rotation.y = rot;
  g.add(frame);
  const scr = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({
      color: 0x0a1720,
      emissive: C(0x3fc0d8),
      emissiveIntensity: 0.55,
      roughness: 0.35,
    })
  );
  scr.position.set(x, y, z + 0.028);
  scr.rotation.y = rot;
  g.add(scr);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.3, 8), M.dark);
  arm.position.set(x, y - 0.22, z - 0.03);
  g.add(arm);
}

/* ---------- 各类设备 ---------- */
export function buildMachine(cfg0, g, M0, accent, st, anims) {
  const cfg = { ...cfg0, no: st.no };
  const M = {
    shell: matte(cfg.color || "#dfe4ea", 0.72, 0.05),
    shell2: matte("#c5ccd5", 0.66, 0.1),
    dark: matte("#252c34", 0.6, 0.2),
    seam: matte("#9aa3ae", 0.8, 0.02),
    steel: matte("#b9c1ca", 0.4, 0.65),
    glass: new THREE.MeshStandardMaterial({
      color: 0x0c1a24,
      roughness: 0.18,
      metalness: 0.25,
      emissive: C(0x0d2e3a),
      emissiveIntensity: 0.5,
    }),
    glue: new THREE.MeshStandardMaterial({
      color: 0x0b1116,
      emissive: accent,
      emissiveIntensity: 1.2,
      roughness: 0.4,
    }),
  };
  const B = {
    desk, shear, brush, film, cabinet, wet, press, layup, rivet, rack,
    coater, oven, inkjet, router, flyprobe, bench,
  };
  (B[cfg.b] || desk)(g, cfg, M, accent, anims);
}

/* 01/02/30 工作台 */
function desk(g, cfg, M, accent, anims) {
  const w = cfg.w || 2.1;
  const d = cfg.d || 1.15;
  const h = cfg.h || 0.9;
  const top = new THREE.Mesh(new RoundedBoxGeometry(w, 0.07, d, 2, 0.02), M.shell);
  top.position.y = h;
  top.castShadow = true;
  top.receiveShadow = true;
  g.add(top);
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(w - 0.12, 0.14, d - 0.12), M.shell2);
  skirt.position.y = h - 0.1;
  g.add(skirt);
  for (const dx of [-w / 2 + 0.14, w / 2 - 0.14]) {
    for (const dz of [-d / 2 + 0.14, d / 2 - 0.14]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, h - 0.16, 0.06), M.dark);
      leg.position.set(dx, (h - 0.16) / 2, dz);
      g.add(leg);
    }
  }
  // 台面防静电垫
  const mat = new THREE.Mesh(new THREE.BoxGeometry(w - 0.3, 0.012, d - 0.3), matte("#2f4a3f", 0.9, 0.02));
  mat.position.y = h + 0.04;
  g.add(mat);

  if (cfg.kind === "cam") {
    monitor(g, M, -0.5, h + 0.42, -0.32, 0.66, 0.42);
    monitor(g, M, 0.25, h + 0.42, -0.34, 0.5, 0.34);
    const kb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.16), M.dark);
    kb.position.set(-0.15, h + 0.06, 0.12);
    g.add(kb);
    const towerBox = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.45, 0.45), M.dark);
    towerBox.position.set(w / 2 - 0.2, h - 0.25, 0);
    g.add(towerBox);
  } else if (cfg.kind === "iqc") {
    monitor(g, M, -0.55, h + 0.4, -0.3, 0.56, 0.36);
    // 测厚仪
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.26), M.shell2);
    base.position.set(0.55, h + 0.15, -0.1);
    g.add(base);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.34, 8), M.steel);
    arm.position.set(0.55, h + 0.4, -0.1);
    g.add(arm);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 12), M.steel);
    head.position.set(0.55, h + 0.57, -0.1);
    g.add(head);
    // 样板
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.36), matte(i % 2 ? "#1e6a4c" : "#245c46", 0.6, 0.1));
      s.position.set(-0.1, h + 0.07 + i * 0.025, 0.3);
      g.add(s);
    }
  } else {
    // 复判台：显微镜
    monitor(g, M, -0.55, h + 0.4, -0.3, 0.56, 0.36);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 10), M.steel);
    pole.position.set(0.45, h + 0.3, -0.05);
    g.add(pole);
    const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.08), M.steel);
    arm2.position.set(0.28, h + 0.55, -0.05);
    g.add(arm2);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.3, 12), M.dark);
    scope.position.set(0.12, h + 0.42, -0.05);
    g.add(scope);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.06, 12), M.steel);
    lens.position.set(0.12, h + 0.25, -0.05);
    g.add(lens);
  }

  plate(g, cfg.no, -w / 2 + 0.18, h - 0.02, d / 2 - 0.02, 0.2, 0.1);
  const tl = tower(g, M, w / 2 - 0.12, h + 0.06, -d / 2 + 0.12);
  anims.push((t, on) => {
    tl[2].emissiveIntensity = on ? 2.0 : 0.5;
    tl[1].emissiveIntensity = on ? 0.3 : 1.4;
  });
}

/* 03 开料剪板机 */
function shear(g, cfg, M, accent, anims) {
  const w = cfg.w || 2.7;
  const d = cfg.d || 1.8;
  feet(g, M, w, d);
  const base = new THREE.Mesh(new RoundedBoxGeometry(w, 0.9, d, 3, 0.05), M.shell2);
  base.position.y = 0.55;
  base.castShadow = true;
  g.add(base);
  seams(g, M, w, 0.9, d, 3, 0.1);
  // 龙门
  for (const dx of [-w / 2 + 0.16, w / 2 - 0.16]) {
    const col = new THREE.Mesh(new RoundedBoxGeometry(0.22, 2.2, 0.3, 2, 0.04), M.shell);
    col.position.set(dx, 1.6, -0.3);
    col.castShadow = true;
    g.add(col);
  }
  const beam = new THREE.Mesh(new RoundedBoxGeometry(w, 0.32, 0.5, 2, 0.04), M.shell);
  beam.position.set(0, 2.6, -0.3);
  g.add(beam);
  // 刀口 + 压料梁
  const blade = new THREE.Mesh(new THREE.BoxGeometry(w - 0.4, 0.09, 0.2), M.steel);
  blade.position.set(0, 1.95, 0.05);
  g.add(blade);
  const clamp = new THREE.Mesh(new THREE.BoxGeometry(w - 0.5, 0.18, 0.3), M.shell2);
  clamp.position.set(0, 1.3, 0.12);
  g.add(clamp);
  // 铜箔堆垛
  for (let i = 0; i < 7; i++) {
    const sheet = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.03, 1.05),
      matte(i % 2 ? "#b98a52" : "#c2945c", 0.45, 0.5)
    );
    sheet.position.set(-0.4, 1.02 + i * 0.036, 0.35);
    sheet.castShadow = true;
    g.add(sheet);
  }
  // 输送辊
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 14), M.steel);
    r.rotation.z = Math.PI / 2;
    r.position.set(0.8 + i * 0.3, 1.0, 0.55);
    g.add(r);
  }
  plate(g, cfg.no, -w / 2 + 0.22, 1.1, d / 2 + 0.01, 0.24, 0.11);
  monitor(g, M, w / 2 - 0.32, 1.75, d / 2 - 0.05, 0.36, 0.24, -0.5);
  const tl = tower(g, M, w / 2 - 0.18, 2.8, -0.3);
  anims.push((t, on) => {
    blade.position.y = on ? 1.55 + Math.sin(t * 8) * 0.28 : 1.95;
    clamp.position.y = on ? 1.25 : 1.3;
    tl[2].emissiveIntensity = on ? 2 : 0.4;
  });
}

/* 04/18/22/31 刷磨清洗线 */
function brush(g, cfg, M, accent, anims) {
  const len = cfg.len || 3.6;
  const h = cfg.h || 1.3;
  const d = 1.5;
  feet(g, M, len, d);
  const bodyM = new THREE.Mesh(new RoundedBoxGeometry(len, h, d, 3, 0.05), M.shell);
  bodyM.position.y = 0.12 + h / 2;
  bodyM.castShadow = true;
  bodyM.receiveShadow = true;
  g.add(bodyM);
  seams(g, M, len, h, d, 4, 0.12);
  // 观察窗（分成几段）
  for (let i = 0; i < 3; i++) {
    const x = -len / 2 + 0.75 + (i * (len - 1.5)) / 2;
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.62, h * 0.34, 0.02), M.glass);
    win.position.set(x, 0.12 + h * 0.62, d / 2 + 0.005);
    g.add(win);
    handle(g, M, x + 0.42, 0.12 + h * 0.62, d / 2 + 0.03);
  }
  // 顶部管路
  for (const [dz, r] of [
    [-0.4, 0.075],
    [0.05, 0.06],
    [0.42, 0.05],
  ]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len - 0.3, 12), M.steel);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0, 0.12 + h + 0.16, dz);
    g.add(pipe);
  }
  for (let i = 0; i < 4; i++) {
    const v = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 10), M.steel);
    v.position.set(-len / 2 + 0.6 + i * (len - 1.2) / 3, 0.12 + h + 0.02, -0.4);
    g.add(v);
  }
  // 进出口滚轮
  for (const x of [-len / 2 - 0.12, len / 2 + 0.12]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 1.25, 14), M.steel);
    r.rotation.x = Math.PI / 2;
    r.position.set(x, 0.85, 0);
    g.add(r);
  }
  // 控制箱
  const box = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.5, 0.26, 2, 0.03), M.shell2);
  box.position.set(len / 2 - 0.3, 0.12 + h * 0.72, d / 2 + 0.16);
  g.add(box);
  plate(g, cfg.no, -len / 2 + 0.3, 0.12 + h * 0.55, d / 2 + 0.012, 0.22, 0.1);
  const tl = tower(g, M, len / 2 - 0.12, 0.12 + h, -d / 2 + 0.1);
  anims.push((t, on) => {
    tl[2].emissiveIntensity = on ? 2 : 0.4;
    M.glass.emissiveIntensity = on ? 0.9 : 0.35;
  });
}

/* 05/23 贴膜机 */
function film(g, cfg, M, accent, anims) {
  const w = cfg.w || 2.6;
  feet(g, M, w, 1.5);
  const b = new THREE.Mesh(new RoundedBoxGeometry(w, 1.0, 1.4, 3, 0.05), M.shell);
  b.position.y = 0.62;
  b.castShadow = true;
  g.add(b);
  seams(g, M, w, 1.0, 1.4, 2, 0.12);
  // 膜卷（带轴）
  const filmMat = matte("#38464f", 0.5, 0.25);
  for (const [x, r] of [
    [-0.62, 0.44],
    [0.62, 0.44],
  ]) {
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1.25, 26), filmMat);
    roll.rotation.x = Math.PI / 2;
    roll.position.set(x, 1.85, -0.1);
    roll.castShadow = true;
    g.add(roll);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.4, 16), M.steel);
    core.rotation.x = Math.PI / 2;
    core.position.set(x, 1.85, -0.1);
    g.add(core);
    for (const dz of [-0.7, 0.7]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), M.shell2);
      arm.position.set(x, 1.5, dz);
      g.add(arm);
    }
  }
  // 加热辊
  for (const [x, r] of [
    [-0.3, 0.1],
    [0.3, 0.1],
  ]) {
    const roller = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1.3, 16), M.steel);
    roller.rotation.x = Math.PI / 2;
    roller.position.set(x, 1.32, 0.3);
    g.add(roller);
  }
  // 加热罩
  const hood = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.22, 0.7, 2, 0.03), M.shell2);
  hood.position.set(0, 1.45, -0.35);
  g.add(hood);
  // 收放卷张力臂
  monitor(g, M, w / 2 - 0.28, 1.6, 0.62, 0.34, 0.24, -0.55);
  plate(g, cfg.no, -w / 2 + 0.24, 0.95, 0.71, 0.22, 0.1);
  const tl = tower(g, M, -w / 2 + 0.15, 2.35, -0.5);
  anims.push((t, on) => {
    tl[2].emissiveIntensity = on ? 2 : 0.4;
  });
}

/* 06/10/16/17/24/29/33 机柜（LDI / AOI / X-Ray / 钻孔） */
function cabinet(g, cfg, M, accent, anims) {
  const w = cfg.w || 2.4;
  const h = cfg.h || 2.2;
  const d = cfg.d || 1.8;
  feet(g, M, w, d);
  const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, 0.05), M.shell);
  b.position.y = 0.14 + h / 2;
  b.castShadow = true;
  b.receiveShadow = true;
  g.add(b);
  seams(g, M, w, h, d, Math.max(2, Math.round(w / 0.8)), 0.14);

  // 深色观察窗（按站不同）
  const wins = cfg.win || 1;
  for (let i = 0; i < wins; i++) {
    const ww = wins === 1 ? w * 0.62 : (w - 0.5) / wins - 0.1;
    const x = wins === 1 ? 0 : -w / 2 + 0.3 + i * ((w - 0.5) / wins);
    const win = new THREE.Mesh(new THREE.BoxGeometry(ww, h * 0.34, 0.02), M.glass);
    win.position.set(x, 0.14 + h * 0.66, d / 2 + 0.004);
    g.add(win);
    // 窗框
    const frame = new THREE.Mesh(new THREE.BoxGeometry(ww + 0.08, h * 0.34 + 0.08, 0.03), M.shell2);
    frame.position.set(x, 0.14 + h * 0.66, d / 2 - 0.004);
    g.add(frame);
  }
  // 顶部排风管
  if (cfg.duct) {
    const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.0, 14), M.steel);
    duct.position.set(w / 2 - 0.45, 0.14 + h + 0.5, -0.25);
    g.add(duct);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.6), M.shell2);
    cap.position.set(w / 2 - 0.45, 0.14 + h + 0.1, -0.25);
    g.add(cap);
  }
  // 侧边蓝条
  if (cfg.accent) {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, h * 0.55, 0.05),
      matte(cfg.accent, 0.5, 0.1)
    );
    strip.position.set(-w / 2 - 0.03, 0.14 + h * 0.5, d / 2 - 0.15);
    g.add(strip);
  }
  // 前端操作屏
  if (cfg.mon) {
    monitor(g, M, w / 2 - 0.05, 1.55, d / 2 + 0.12, 0.5, 0.34, -0.45);
    handle(g, M, -w / 2 + 0.35, 1.15, d / 2 + 0.03);
  }
  // 内部运动件（透过窗能看到一点）
  const head = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, 0.12, 0.34), M.dark);
  head.position.set(0, 0.14 + h * 0.66, 0.15);
  g.add(head);
  plate(g, cfg.no || 0, -w / 2 + 0.25, 0.2 + h * 0.15, d / 2 + 0.012, 0.2, 0.09);
  const tl = tower(g, M, -w / 2 + 0.16, 0.14 + h, -d / 2 + 0.18);
  anims.push((t, on) => {
    head.position.x = on ? Math.sin(t * 2.1) * w * 0.18 : 0;
    M.glass.emissiveIntensity = on ? 0.9 : 0.35;
    tl[2].emissiveIntensity = on ? 2 : 0.4;
  });
}

/* 07/08/09/11/19/20/21/25/26/27/28/34/37 湿制程线 */
function wet(g, cfg, M, accent, anims) {
  const len = cfg.len || 4.6;
  const h = cfg.h || 1.4;
  const d = 1.6;
  const chem = C(cfg.chem || "#2ec9d8");
  const liquid = new THREE.MeshStandardMaterial({
    color: 0x0b151b,
    roughness: 0.22,
    metalness: 0.15,
    emissive: chem,
    emissiveIntensity: 0.55,
  });
  feet(g, M, len, d);
  // 槽体
  const tank = new THREE.Mesh(new RoundedBoxGeometry(len, h, d, 3, 0.05), M.shell2);
  tank.position.y = 0.12 + h / 2;
  tank.castShadow = true;
  tank.receiveShadow = true;
  g.add(tank);
  const topPlate = new THREE.Mesh(new THREE.BoxGeometry(len + 0.06, 0.06, d + 0.06), M.shell);
  topPlate.position.y = 0.12 + h + 0.03;
  g.add(topPlate);

  const n = cfg.bays || (cfg.mode === "brown" || cfg.mode === "finish" ? 5 : 4);
  const gap = (len - 0.5) / n;
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + 0.25 + gap / 2 + i * gap;
    const open = cfg.mode !== "des" && cfg.mode !== "desmear";
    if (open) {
      const bath = new THREE.Mesh(new THREE.BoxGeometry(gap - 0.14, 0.02, d - 0.34), liquid);
      bath.position.set(x, 0.12 + h - 0.06, 0);
      g.add(bath);
      const rim = new THREE.Mesh(new THREE.BoxGeometry(gap - 0.08, 0.1, d - 0.2), M.shell);
      rim.position.set(x, 0.12 + h + 0.01, 0);
      g.add(rim);
    } else {
      const win = new THREE.Mesh(new THREE.BoxGeometry(gap - 0.24, h * 0.3, 0.02), M.glass);
      win.position.set(x, 0.12 + h * 0.55, d / 2 + 0.004);
      g.add(win);
      handle(g, M, x + gap / 2 - 0.3, 0.12 + h * 0.55, d / 2 + 0.03);
    }
    // 槽间分隔板
    if (i > 0) {
      const div = new THREE.Mesh(new THREE.BoxGeometry(0.04, h, d - 0.1), M.seam);
      div.position.set(x - gap / 2, 0.12 + h / 2, 0);
      g.add(div);
    }
  }
  // 顶部管路 + 抽风
  for (const [dz, r, y] of [
    [-0.45, 0.07, h + 0.34],
    [0.1, 0.06, h + 0.3],
  ]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len - 0.2, 12), M.steel);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0, 0.12 + y, dz);
    g.add(pipe);
  }
  if (cfg.mode === "des" || cfg.mode === "finish") {
    const hood = new THREE.Mesh(new RoundedBoxGeometry(len - 0.3, 0.24, 0.9, 2, 0.04), M.shell);
    hood.position.set(0, 0.12 + h + 0.5, -0.1);
    g.add(hood);
    for (const dx of [-len / 3, len / 3]) {
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 14), M.steel);
      stack.position.set(dx, 0.12 + h + 0.85, -0.1);
      g.add(stack);
    }
  }
  if (cfg.mode === "desmear") {
    for (let i = 0; i < 4; i++) {
      const port = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.16, 16), M.steel);
      port.rotation.x = Math.PI / 2;
      port.position.set(-len / 2 + 0.7 + i * (len - 1.4) / 3, 0.12 + h * 0.5, d / 2 + 0.02);
      g.add(port);
    }
  }
  if (cfg.mode === "gantry" || cfg.mode === "pattern" || cfg.mode === "vcp") {
    for (const dx of [-len / 2 + 0.4, len / 2 - 0.4]) {
      for (const dz of [-0.62, 0.62]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.3, 0.12), M.shell);
        post.position.set(dx, 1.3, dz);
        g.add(post);
      }
    }
    for (const dz of [-0.62, 0.62]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(len - 0.6, 0.14, 0.14), M.shell);
      beam.position.set(0, 2.45, dz);
      g.add(beam);
    }
    const carriage = new THREE.Group();
    const cBody = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.38, 1.2), M.dark);
    carriage.add(cBody);
    const cArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), M.steel);
    cArm.position.set(0, 0.35, 0.4);
    carriage.add(cArm);
    const cBar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.06), M.steel);
    cBar.position.set(0, 0.55, 0);
    carriage.add(cBar);
    carriage.position.set(-len / 2 + 0.8, 2.2, 0);
    g.add(carriage);
    anims.push((t, on) => {
      carriage.position.x = on
        ? -len / 2 + 0.8 + ((t * 0.18) % 1) * (len - 1.6)
        : -len / 2 + 0.8;
    });
  }
  if (cfg.mode === "vcp") {
    for (const dx of [-len / 2 - 0.04, len / 2 + 0.04]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 1.3), matte("#d9a33a", 0.6, 0.15));
      rail.position.set(dx, 1.55, 0);
      g.add(rail);
    }
  }
  if (cfg.mode === "pattern") {
    for (let i = 0; i < 3; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.06), matte("#b98a52", 0.35, 0.75));
      bar.position.set(-1.3 + i * 1.3, 1.95, -0.55);
      g.add(bar);
    }
  }
  const chemStrip = new THREE.Mesh(
    new THREE.BoxGeometry(len * 0.86, 0.035, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x0b1116, emissive: chem, emissiveIntensity: 0.85 })
  );
  chemStrip.position.set(0, 0.12 + h + 0.08, d / 2 + 0.02);
  g.add(chemStrip);
  monitor(g, M, len / 2 - 0.35, 1.5, d / 2 + 0.16, 0.4, 0.28, -0.5);
  plate(g, cfg.no || 0, -len / 2 + 0.3, 0.95, d / 2 + 0.012, 0.24, 0.11);
  const tl = tower(g, M, len / 2 - 0.1, 0.12 + h, -d / 2 + 0.15);
  anims.push((t, on) => {
    liquid.emissiveIntensity = on ? 0.9 + Math.sin(t * 1.8) * 0.2 : 0.35;
    tl[2].emissiveIntensity = on ? 2 : 0.4;
  });
}

/* 14 真空压合机 */
function press(g, cfg, M, accent, anims) {
  const w = cfg.w || 3.4;
  const d = cfg.d || 2.4;
  feet(g, M, w, d);
  const base = new THREE.Mesh(new RoundedBoxGeometry(w, 0.5, d, 2, 0.04), M.shell2);
  base.position.y = 0.3;
  base.castShadow = true;
  g.add(base);
  // 四立柱
  for (const dx of [-w / 2 + 0.3, w / 2 - 0.75]) {
    for (const dz of [-d / 2 + 0.3, d / 2 - 0.3]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 3.3, 18), M.steel);
      col.position.set(dx, 2.2, dz);
      col.castShadow = true;
      g.add(col);
    }
  }
  // 顶梁
  const top = new THREE.Mesh(new RoundedBoxGeometry(w - 0.3, 0.4, d - 0.2, 2, 0.05), M.shell);
  top.position.set(0, 3.95, 0);
  top.castShadow = true;
  g.add(top);
  // 五层热压板
  const platens = [];
  for (let i = 0; i < 5; i++) {
    const p = new THREE.Mesh(new RoundedBoxGeometry(w - 0.9, 0.16, d - 0.5, 2, 0.03), i % 2 ? M.shell2 : M.steel);
    p.position.set(0, 0.75 + i * 0.55, 0);
    p.castShadow = true;
    p.receiveShadow = true;
    g.add(p);
    platens.push({ mesh: p, base: 0.75 + i * 0.55, i });
  }
  // 液压缸
  for (const dx of [-0.45, 0.45]) {
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.55, 18), M.steel);
    cyl.position.set(dx, 3.6, 0);
    g.add(cyl);
  }
  // 电控柜
  const cab = new THREE.Mesh(new RoundedBoxGeometry(0.8, 1.7, 1.0, 3, 0.04), M.shell);
  cab.position.set(w / 2 - 0.15, 0.95, d / 2 - 0.3);
  g.add(cab);
  monitor(g, M, w / 2 - 0.15, 1.45, d / 2 + 0.23, 0.42, 0.28);
  vents(g, M, w / 2 - 0.15, 0.85, d / 2 + 0.22, 0.4, 0.5, 8);
  // 黄色护栏
  for (const dz of [-d / 2 - 0.35, d / 2 + 0.35]) {
    for (const y of [0.55, 1.0]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.06, 0.06), matte("#d9a33a", 0.6, 0.1));
      rail.position.set(0, y, dz);
      g.add(rail);
    }
    for (const dx of [-w / 2 - 0.2, w / 2 + 0.2]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.05, 0.06), matte("#d9a33a", 0.6, 0.1));
      post.position.set(dx, 0.53, dz);
      g.add(post);
    }
  }
  plate(g, cfg.no, -w / 2 + 0.35, 2.6, -d / 2 - 0.01, 0.24, 0.11);
  const tl = tower(g, M, w / 2 - 0.3, 4.2, -d / 2 + 0.3);
  anims.push((t, on) => {
    const k = on ? (Math.sin(t * 0.7) + 1) / 2 : 0;
    platens.forEach((pl) => {
      pl.mesh.position.y = pl.base - k * pl.i * 0.055;
    });
    tl[2].emissiveIntensity = on ? 2 : 0.4;
  });
}

/* 12 叠层台 */
function layup(g, cfg, M, accent, anims) {
  const w = cfg.w || 2.4;
  feet(g, M, w, 1.4);
  const top = new THREE.Mesh(new RoundedBoxGeometry(w, 0.08, 1.4, 2, 0.02), M.shell);
  top.position.y = 0.92;
  top.castShadow = true;
  g.add(top);
  for (const dx of [-w / 2 + 0.14, w / 2 - 0.14]) {
    for (const dz of [-0.55, 0.55]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.88, 0.07), M.dark);
      leg.position.set(dx, 0.44, dz);
      g.add(leg);
    }
  }
  // 叠好的板叠
  for (let i = 0; i < 6; i++) {
    const sheet = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.025, 0.7),
      matte(i % 2 ? "#b98a52" : "#2f6b52", 0.5, 0.3)
    );
    sheet.position.set(-0.35, 0.99 + i * 0.03, 0);
    g.add(sheet);
  }
  // 定位立柱 + 悬臂 + 放大灯
  for (const dz of [-0.45, 0.45]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 10), M.steel);
    post.position.set(0.75, 1.62, dz);
    g.add(post);
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 10), M.steel);
  bar.rotation.x = Math.PI / 2;
  bar.position.set(0.75, 2.3, 0);
  g.add(bar);
  const lampHead = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.12, 14), M.shell2);
  lampHead.position.set(0.15, 2.1, 0);
  g.add(lampHead);
  const lamp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.1, 0.02, 14),
    new THREE.MeshStandardMaterial({ color: 0xfff2d0, emissive: C(0xffe9b0), emissiveIntensity: 1.2 })
  );
  lamp.position.set(0.15, 2.03, 0);
  g.add(lamp);
  plate(g, cfg.no, -w / 2 + 0.24, 1.02, 0.71, 0.2, 0.09);
  anims.push((t, on) => {
    lamp.material.emissiveIntensity = on ? 1.6 : 0.8;
  });
}

/* 13 铆合 */
function rivet(g, cfg, M, accent, anims) {
  const w = cfg.w || 2.2;
  feet(g, M, w, 1.4);
  const b = new THREE.Mesh(new RoundedBoxGeometry(w, 0.75, 1.3, 3, 0.04), M.shell);
  b.position.y = 0.5;
  b.castShadow = true;
  g.add(b);
  const stage2 = new THREE.Mesh(new RoundedBoxGeometry(w - 0.25, 0.1, 1.15, 2, 0.02), M.steel);
  stage2.position.y = 0.95;
  g.add(stage2);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.46), M.shell2);
  head.position.y = 1.45;
  g.add(head);
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 12), M.steel);
  nose.position.y = 1.2;
  g.add(nose);
  for (const dx of [-0.8, 0.8]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 0.1), M.shell);
    post.position.set(dx, 1.35, -0.45);
    g.add(post);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, 0.16), M.shell);
  beam.position.set(0, 2.05, -0.45);
  g.add(beam);
  // CCD
  const cam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.18), M.dark);
  cam.position.set(0.55, 1.55, 0.2);
  g.add(cam);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 12), M.steel);
  lens.position.set(0.55, 1.4, 0.2);
  g.add(lens);
  monitor(g, M, 1.0, 1.4, 0.45, 0.36, 0.24, -0.6);
  plate(g, cfg.no, -w / 2 + 0.22, 0.68, 0.66, 0.2, 0.09);
  anims.push((t, on) => {
    head.position.y = on ? 1.28 + Math.sin(t * 5) * 0.1 : 1.45;
    nose.position.y = on ? 1.06 + Math.sin(t * 5) * 0.1 : 1.2;
  });
}

/* 15 冷却/拆板架 */
function rack(g, cfg, M, accent, anims) {
  feet(g, M, 2.4, 1.5);
  const base = new THREE.Mesh(new RoundedBoxGeometry(2.4, 0.12, 1.5, 2, 0.03), M.shell2);
  base.position.y = 0.18;
  g.add(base);
  for (const dx of [-1.05, 1.05]) {
    for (const dz of [-0.6, 0.6]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.1, 0.09), M.shell);
      post.position.set(dx, 1.2, dz);
      g.add(post);
    }
  }
  for (let i = 0; i < 6; i++) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.05, 1.2), M.steel);
    shelf.position.y = 0.55 + i * 0.34;
    g.add(shelf);
    if (i % 2 === 0) {
      for (let k = 0; k < 3; k++) {
        const panel = new THREE.Mesh(
          new THREE.BoxGeometry(1.7, 0.02, 1.0),
          matte("#2f6b52", 0.55, 0.2)
        );
        panel.position.set(0, 0.58 + i * 0.34 + k * 0.025, 0);
        g.add(panel);
      }
    }
  }
  plate(g, cfg.no, -0.9, 2.0, 0.62, 0.2, 0.09);
  const tl = tower(g, M, 1.0, 2.25, -0.55);
  anims.push((t, on) => {
    tl[2].emissiveIntensity = on ? 2 : 0.4;
  });
}

/* 32 阻焊涂布 */
function coater(g, cfg, M, accent, anims) {
  const w = cfg.w || 2.7;
  feet(g, M, w, 1.6);
  const b = new THREE.Mesh(new RoundedBoxGeometry(w, 1.0, 1.5, 3, 0.05), M.shell);
  b.position.y = 0.62;
  b.castShadow = true;
  g.add(b);
  seams(g, M, w, 1.0, 1.5, 3, 0.12);
  const top = new THREE.Mesh(new RoundedBoxGeometry(w - 0.3, 0.12, 1.25, 2, 0.02), M.shell2);
  top.position.y = 1.15;
  g.add(top);
  // 印刷桥架
  for (const dx of [-w / 2 + 0.2, w / 2 - 0.2]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.6, 0.1), M.shell);
    post.position.set(dx, 1.5, -0.55);
    g.add(post);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, 0.14), M.shell);
  beam.position.set(0, 2.28, -0.55);
  g.add(beam);
  const carriage = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.4), M.dark);
  carriage.position.set(0, 2.05, -0.2);
  g.add(carriage);
  const squeegee = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.18), M.steel);
  squeegee.position.set(0, 1.9, -0.2);
  g.add(squeegee);
  // 烘道
  const oven = new THREE.Mesh(new RoundedBoxGeometry(w - 0.4, 0.5, 0.6, 2, 0.04), M.shell2);
  oven.position.set(0, 1.5, 0.5);
  g.add(oven);
  for (let i = 0; i < 3; i++) {
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.03, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x2a1a10, emissive: C(0xff7a3c), emissiveIntensity: 1.2 })
    );
    lamp.position.set(-0.7 + i * 0.7, 1.78, 0.5);
    g.add(lamp);
  }
  monitor(g, M, w / 2 - 0.3, 1.55, 0.62, 0.38, 0.26, -0.5);
  plate(g, cfg.no, -w / 2 + 0.24, 0.95, 0.76, 0.2, 0.09);
  anims.push((t, on) => {
    carriage.position.x = on ? Math.sin(t * 1.6) * 0.7 : 0;
    squeegee.position.x = carriage.position.x;
  });
}

/* 35 固化炉 */
function oven(g, cfg, M, accent, anims) {
  const len = cfg.len || 3.4;
  feet(g, M, len, 1.4);
  const b = new THREE.Mesh(new RoundedBoxGeometry(len, 1.15, 1.35, 3, 0.05), M.shell);
  b.position.y = 0.7;
  b.castShadow = true;
  g.add(b);
  seams(g, M, len, 1.15, 1.35, 4, 0.12);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(len - 0.5, 0.36, 0.06), M.dark);
  mouth.position.set(0, 0.62, 0.68);
  g.add(mouth);
  const mouth2 = new THREE.Mesh(new THREE.BoxGeometry(len - 0.5, 0.36, 0.06), M.dark);
  mouth2.position.set(0, 0.62, -0.68);
  g.add(mouth2);
  const lampMats = [];
  for (let i = 0; i < 4; i++) {
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.04, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x2a1206, emissive: C(0xff6a2a), emissiveIntensity: 1.4 })
    );
    lamp.position.set(-len / 2 + 0.6 + i * (len - 1.2) / 3, 1.3, 0);
    g.add(lamp);
    lampMats.push(lamp.material);
  }
  for (const dx of [-len / 3, len / 3]) {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.6, 14), M.steel);
    stack.position.set(dx, 1.65, -0.35);
    g.add(stack);
  }
  monitor(g, M, len / 2 - 0.3, 1.35, 0.7, 0.36, 0.24, -0.5);
  plate(g, cfg.no, -len / 2 + 0.28, 0.95, 0.69, 0.2, 0.09);
  anims.push((t, on) => {
    lampMats.forEach((m) => {
      m.emissiveIntensity = on ? 1.7 + Math.sin(t * 3) * 0.25 : 0.7;
    });
  });
}

/* 36 字符喷印 */
function inkjet(g, cfg, M, accent, anims) {
  const w = cfg.w || 2.6;
  feet(g, M, w, 1.5);
  const b = new THREE.Mesh(new RoundedBoxGeometry(w, 0.95, 1.4, 3, 0.05), M.shell);
  b.position.y = 0.6;
  b.castShadow = true;
  g.add(b);
  seams(g, M, w, 0.95, 1.4, 2, 0.12);
  const table2 = new THREE.Mesh(new RoundedBoxGeometry(w - 0.2, 0.1, 1.2, 2, 0.02), M.shell2);
  table2.position.y = 1.1;
  g.add(table2);
  for (const dx of [-w / 2 + 0.2, w / 2 - 0.2]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.7, 0.1), M.shell);
    post.position.set(dx, 1.55, -0.5);
    g.add(post);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, 0.14), M.shell);
  beam.position.set(0, 2.35, -0.5);
  g.add(beam);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.3), M.dark);
  head.position.set(0, 2.12, -0.15);
  g.add(head);
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8), M.steel);
  nozzle.position.set(0, 1.95, -0.15);
  g.add(nozzle);
  // 墨桶
  for (const dx of [0.85, 1.05]) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.4, 14), matte("#e8ecf1", 0.7, 0.05));
    tank.position.set(dx, 0.5, 0.55);
    g.add(tank);
  }
  monitor(g, M, w / 2 - 0.28, 1.45, 0.58, 0.36, 0.24, -0.5);
  plate(g, cfg.no, -w / 2 + 0.24, 0.9, 0.71, 0.2, 0.09);
  anims.push((t, on) => {
    head.position.x = on ? Math.sin(t * 2.2) * 0.8 : 0;
    nozzle.position.x = head.position.x;
  });
}

/* 38 CNC 铣边 */
function router(g, cfg, M, accent, anims) {
  const w = cfg.w || 2.9;
  feet(g, M, w, 1.9);
  const b = new THREE.Mesh(new RoundedBoxGeometry(w, 2.0, 1.8, 3, 0.05), M.shell);
  b.position.y = 1.15;
  b.castShadow = true;
  b.receiveShadow = true;
  g.add(b);
  seams(g, M, w, 2.0, 1.8, 4, 0.14);
  const win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, 0.72, 0.02), M.glass);
  win.position.set(0, 1.6, 0.91);
  g.add(win);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w * 0.66, 0.8, 0.04), M.shell2);
  frame.position.set(0, 1.6, 0.9);
  g.add(frame);
  const gantry = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 1.5), M.shell2);
  gantry.position.set(0, 2.15, 0);
  g.add(gantry);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.5, 16), M.steel);
  head.position.set(0, 1.9, 0);
  g.add(head);
  const dust = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.8, 12), M.steel);
  dust.position.set(0.9, 2.6, -0.5);
  g.add(dust);
  monitor(g, M, w / 2 + 0.05, 1.6, 0.55, 0.4, 0.28, -0.55);
  plate(g, cfg.no, -w / 2 + 0.26, 0.9, 0.91, 0.2, 0.09);
  const tl = tower(g, M, -w / 2 + 0.16, 2.2, -0.7);
  anims.push((t, on) => {
    gantry.position.x = on ? Math.sin(t * 1.4) * 0.9 : 0;
    head.position.x = gantry.position.x;
    tl[2].emissiveIntensity = on ? 2 : 0.4;
  });
}

/* 39 飞针测试 */
function flyprobe(g, cfg, M, accent, anims) {
  const w = cfg.w || 2.6;
  feet(g, M, w, 1.8);
  const b = new THREE.Mesh(new RoundedBoxGeometry(w, 0.7, 1.6, 3, 0.04), M.shell);
  b.position.y = 0.45;
  b.castShadow = true;
  g.add(b);
  const stage2 = new THREE.Mesh(new THREE.BoxGeometry(w - 0.5, 0.06, 1.2), M.dark);
  stage2.position.y = 0.84;
  g.add(stage2);
  for (const dx of [-w / 2 + 0.2, w / 2 - 0.2]) {
    for (const dz of [-0.75, 0.75]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.11, 2.1, 0.11), M.shell);
      post.position.set(dx, 1.9, dz);
      g.add(post);
    }
  }
  for (const dz of [-0.75, 0.75]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(w - 0.3, 0.13, 0.13), M.shell);
    beam.position.set(0, 2.9, dz);
    g.add(beam);
  }
  const cross = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 1.6), M.shell);
  cross.position.set(0, 2.9, 0);
  g.add(cross);
  // 两组探针
  const probes = [];
  for (const [x, z] of [
    [-0.5, -0.3],
    [0.5, 0.3],
  ]) {
    const armB = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.7, 0.07), M.steel);
    armB.position.set(x, 2.4, z);
    g.add(armB);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.015, 0.3, 10), M.steel);
    tip.position.set(x, 1.9, z);
    g.add(tip);
    probes.push({ armB, tip, x, z });
  }
  monitor(g, M, w / 2 + 0.05, 1.55, 0.55, 0.42, 0.3, -0.55);
  plate(g, cfg.no, -w / 2 + 0.26, 0.95, 0.81, 0.2, 0.09);
  const tl = tower(g, M, -w / 2 + 0.16, 2.2, -0.85);
  anims.push((t, on) => {
    probes.forEach((p, i) => {
      const dy = on ? Math.sin(t * 3 + i * 1.3) * 0.16 : 0;
      p.armB.position.y = 2.4 + dy;
      p.tip.position.y = 1.9 + dy;
    });
    tl[2].emissiveIntensity = on ? 2 : 0.4;
  });
}

/* 40 FQC / 包装 */
function bench(g, cfg, M, accent, anims) {
  const w = 2.4;
  const d = 1.4;
  const top = new THREE.Mesh(new RoundedBoxGeometry(w, 0.08, d, 2, 0.02), M.shell);
  top.position.y = 0.9;
  top.castShadow = true;
  g.add(top);
  for (const dx of [-w / 2 + 0.14, w / 2 - 0.14]) {
    for (const dz of [-d / 2 + 0.14, d / 2 - 0.14]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.86, 0.07), M.dark);
      leg.position.set(dx, 0.43, dz);
      g.add(leg);
    }
  }
  // 纸箱堆
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.34, 0.46),
      matte("#b08a5e", 0.85, 0.02)
    );
    c.position.set(-0.65 + i * 0.62, 1.12, 0.15);
    c.castShadow = true;
    g.add(c);
  }
  // 标签打印机
  const pr = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.24, 0.34, 2, 0.03), M.shell2);
  pr.position.set(0.82, 1.06, -0.3);
  g.add(pr);
  monitor(g, M, -0.75, 1.35, -0.45, 0.44, 0.3);
  // 目检灯
  const lampArm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 8), M.steel);
  lampArm.position.set(0.55, 1.45, -0.55);
  g.add(lampArm);
  const lamp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.16, 0.1, 16),
    new THREE.MeshStandardMaterial({ color: 0xfff4d6, emissive: C(0xffeec0), emissiveIntensity: 1.4 })
  );
  lamp.position.set(0.55, 1.95, -0.35);
  g.add(lamp);
  plate(g, cfg.no, -w / 2 + 0.24, 1.0, d / 2 - 0.01, 0.2, 0.09);
  anims.push((t, on) => {
    lamp.material.emissiveIntensity = on ? 1.8 : 1.1;
  });
}



