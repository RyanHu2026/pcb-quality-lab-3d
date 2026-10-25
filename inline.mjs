import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const dist = resolve(root, "dist");

const js = readFileSync(resolve(dist, "bundle.js"), "utf8");
const css = readFileSync(resolve(dist, "bundle.css"), "utf8");
const shell = readFileSync(resolve(root, "src/shell.html"), "utf8");

const html = shell.split("/*__CSS__*/").join(css).split("/*__JS__*/").join(js);

// index.html 给 GitHub Pages 用；中文名那份给本地双击用
const targets = [resolve(root, "index.html"), resolve(root, "PCB品质实验室.html")];
for (const target of targets) writeFileSync(target, html, "utf8");

console.log(`built  → ${targets.join(" , ")}  (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB)`);
