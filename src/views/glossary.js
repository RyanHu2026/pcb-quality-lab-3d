import { GLOSSARY } from "../data.js";

const CATS = {
  结构: "PCB PCBA FR-4 覆铜板 半固化片 芯板 叠层 铜厚 阻焊 丝印 焊盘 过孔 通孔 盲孔 埋孔 微孔 环宽 纵横比 线宽线距 阻抗控制 拼板 V-cut 邮票孔".split(" "),
  工艺: "开料 内层图形 压合 钻孔 沉铜 板电 图形电镀 蚀刻 显影 干膜 AOI X-Ray 飞针测试 测试架 切片 背光 热应力 可焊性 HASL ENIG OSP 翘曲 分层 白边 CAF Tg".split(" "),
  品质: "首件 巡检 抽检 AQL 8D 5Why SPC CPK 直通率 限度样本 COA 追溯".split(" "),
};

function catOf(term) {
  for (const [k, list] of Object.entries(CATS)) if (list.includes(term)) return k;
  return "其他";
}

export function mountGlossary(root) {
  let q = "";
  let cat = "全部";

  root.innerHTML = `
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <div class="search-box">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg>
        <input id="q" placeholder="搜中文 / 英文 / 缩写，如：盲孔、via、AQL" />
      </div>
      <div id="cats" style="display:flex;gap:6px;flex-wrap:wrap"></div>
      <span style="margin-left:auto;font-size:11px;color:var(--dim-2)" id="count"></span>
    </div>
    <div class="glossary-grid" id="grid"></div>
  `;

  const grid = root.querySelector("#grid");
  const count = root.querySelector("#count");
  const input = root.querySelector("#q");
  const cats = root.querySelector("#cats");

  const catList = ["全部", "结构", "工艺", "品质", "其他"];
  cats.innerHTML = catList
    .map(
      (c) =>
        `<button class="btn ${c === cat ? "on" : ""}" data-c="${c}" style="padding:6px 12px;font-size:11.5px">${c}</button>`
    )
    .join("");

  cats.querySelectorAll("[data-c]").forEach((b) => {
    b.addEventListener("click", () => {
      cat = b.dataset.c;
      cats.querySelectorAll("[data-c]").forEach((x) => x.classList.toggle("on", x === b));
      render();
    });
  });

  input.addEventListener("input", () => {
    q = input.value.trim().toLowerCase();
    render();
  });

  function render() {
    const rows = GLOSSARY.filter(([cn, alias, en, desc]) => {
      if (cat !== "全部" && catOf(cn) !== cat) return false;
      if (!q) return true;
      return `${cn} ${alias} ${en} ${desc}`.toLowerCase().includes(q);
    });

    count.textContent = `${rows.length} / ${GLOSSARY.length} 条`;
    if (!rows.length) {
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1">没有匹配的术语，换个关键词试试</div>`;
      return;
    }
    grid.innerHTML = rows
      .map(
        ([cn, alias, en, desc]) => `
      <div class="gterm">
        <div class="t">
          <b>${cn}</b>
          ${alias !== "—" ? `<span>${alias}</span>` : ""}
          <span style="margin-left:auto;color:var(--dim-2);font-size:9px">${catOf(cn)}</span>
        </div>
        <div style="font-family:var(--mono);font-size:8.5px;color:var(--dim-2);letter-spacing:.08em;margin-top:4px">${en}</div>
        <p>${desc}</p>
      </div>`
      )
      .join("");
  }

  render();
  return () => {};
}
