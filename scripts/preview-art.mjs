import { createCanvas } from "@napi-rs/canvas";
import { writeFileSync, mkdirSync } from "node:fs";
import { createLayout, drawBoard, paintCopper, paintPlane, paintMask } from "../src/lib/pcbArt.js";
import { drawBoardAoi, drawDefectMark } from "../src/lib/aoiArt.js";

mkdirSync("preview", { recursive: true });

const layout = createLayout(44);

{
  const c = createCanvas(900, 560);
  const anchors = drawBoardAoi(c.getContext("2d"), 900, 560, createLayout(123), [
    "open",
    "short",
    "maskpad",
    "delam",
    "copper",
  ]);
  writeFileSync("preview/aoi-board.png", c.toBuffer("image/png"));
  console.log("aoi anchors:", anchors.map((a) => `${a.id}@${Math.round(a.x)},${Math.round(a.y)}`).join(" "));
}

for (const d of ["good", "open", "short", "annular", "maskpad", "delam", "scratch", "gold"]) {
  const c = createCanvas(900, 560);
  const ctx = c.getContext("2d");
  drawBoard(ctx, 900, 560, layout, d === "good" ? null : d);
  writeFileSync(`preview/board-${d}.png`, c.toBuffer("image/png"));
}

// 图谱缩略图：带「缺陷位置」圈注
for (const id of ["open", "warp", "misreg"]) {
  const c = createCanvas(300, 186);
  const ctx = c.getContext("2d");
  const l2 = createLayout(31);
  const anchors = drawBoardAoi(ctx, 300, 186, l2, [id]);
  if (anchors[0]) drawDefectMark(ctx, anchors[0].x, anchors[0].y, 300, 186);
  writeFileSync(`preview/thumb-${id}.png`, c.toBuffer("image/png"));
}

const W = 1024;
const H = 636;
const tex = [
  ["mask-top", (ctx) => paintMask(ctx, W, H, layout, { title: "4-LAYER DEMO" })],
  ["copper", (ctx) => paintCopper(ctx, W, H, layout, { seed: 5 })],
  ["plane", (ctx) => paintPlane(ctx, W, H, layout, 11)],
];
for (const [name, fn] of tex) {
  const c = createCanvas(W, H);
  fn(c.getContext("2d"));
  writeFileSync(`preview/tex-${name}.png`, c.toBuffer("image/png"));
}

console.log("previews written");
