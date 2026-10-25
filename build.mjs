import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

// 找到当前平台对应的 esbuild 原生二进制
const platform = process.platform;
const arch = process.arch;
const pkg = `@esbuild/${platform}-${arch}`;
const bin = process.platform === "win32" ? "esbuild.exe" : "esbuild";
const candidates = [
  resolve(root, "node_modules", "@esbuild", `${platform}-${arch}`, bin),
  resolve(root, "node_modules", ".pnpm", pkg, "node_modules", pkg, bin),
];

const esbuild = candidates.find((p) => existsSync(p));
if (!esbuild) {
  console.error(
    `找不到 esbuild 原生二进制（${pkg}）。\n先执行：npm i -D esbuild\n或：npm i ${pkg}`
  );
  process.exit(1);
}

const args = [
  "src/main.js",
  "--bundle",
  "--minify",
  "--format=iife",
  "--target=es2020",
  "--outfile=dist/bundle.js",
  "--loader:.css=css",
];

const r = spawnSync(esbuild, args, { cwd: root, stdio: "inherit" });
if (r.status !== 0) process.exit(r.status ?? 1);

const r2 = spawnSync(process.execPath, [join(root, "inline.mjs")], {
  cwd: root,
  stdio: "inherit",
});
process.exit(r2.status ?? 0);
