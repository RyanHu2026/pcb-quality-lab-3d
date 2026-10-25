# AGENTS.md

## UI 规范（强制）

任何改动界面的工作，先读 [`docs/design-craft.md`](docs/design-craft.md)。

硬约束：

- **1 个强调色**（`--cyan` 已改为 `#0a84ff`），红/绿/黄只用于状态
- **禁止渐变背景、禁止发光阴影**、禁止彩色描边
- 字号只取规范里的阶梯；中文正文 ≥ 13px
- 间距用 4 的倍数；圆角 ≤ 16，嵌套同心
- `transition` 只写具体属性，禁止 `all`
- 可点元素必须有 `:focus-visible`

## 技术约束

- 构建：`npm run build` → 产出单文件 `index.html`（自包含，可离线）
- 测试：`npm test`（jsdom 冒烟，覆盖 5 个视图）
- 提交前必须 build + test 通过
- 中文文件用编辑器/读写工具处理，不要用 PowerShell 的 `Set-Content` 直接改（会破坏编码）

## 调试参数

| 参数 | 作用 |
| --- | --- |
| `?phase=A/B/C/D` | 产线定位到某一段 |
| `?warp=120` | 产线快进 120 秒 |
| `?ng=1` | 判 NG 概率调到 100% |
| `?look=ng` | 镜头对准 NG 隔离区 |
| `?board=eight&explode=100` | 结构页打开 8 层板并展开 |
