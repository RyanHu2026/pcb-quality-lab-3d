import { DEFECTS } from "../data.js";
import { createLayout, drawBoard } from "../lib/pcbArt.js";
import { drawBoardAoi, drawDefectMark, AOI_DEFECTS } from "../lib/aoiArt.js";

const W = 900;
const H = 560;

/** 图谱缩略图：画出缺陷并圈出位置 */
function renderCard(canvas, defect, seed) {
  const ctx = canvas.getContext("2d");
  const layout = createLayout(seed);
  const anchors = drawBoardAoi(ctx, canvas.width, canvas.height, layout, [defect.id]);
  if (anchors[0]) drawDefectMark(ctx, anchors[0].x, anchors[0].y, canvas.width, canvas.height);
}

export function mountDefects(root, ctx) {
  let tab = "quiz";
  let cleanup = [];
  let pool = null; // 错题重练时的题目池

  root.innerHTML = `
    <div class="tool-tabs" id="tabs"></div>
    <div id="tab-body"></div>
  `;

  const tabsEl = root.querySelector("#tabs");
  const body = root.querySelector("#tab-body");

  function wrongCount() {
    const w = ctx.progress.wrong || {};
    return Object.keys(w).length;
  }

  function renderTabs() {
    const tabs = [
      ["quiz", "判定训练", ""],
      ["aoi", "AOI 挑战", "新"],
      ["catalog", "缺陷图谱", ""],
      ["wrong", "错题本", wrongCount() ? String(wrongCount()) : ""],
    ];
    tabsEl.innerHTML =
      tabs
        .map(
          ([id, name, badge]) =>
            `<button class="btn ${tab === id ? "on" : ""}" data-tab="${id}">${name}${
              badge ? `<span class="tag-mini" style="margin-left:6px">${badge}</span>` : ""
            }</button>`
        )
        .join("") +
      `<span style="margin-left:auto;font-size:11px;color:var(--dim-2);align-self:center">
        共 ${DEFECTS.length} 种缺陷 · 判定标准参考 IPC-A-600 / IPC-6012
      </span>`;

    tabsEl.querySelectorAll("[data-tab]").forEach((b) => {
      b.addEventListener("click", () => {
        if (tab === b.dataset.tab) return;
        tab = b.dataset.tab;
        render();
      });
    });
  }

  function clear() {
    cleanup.forEach((fn) => fn && fn());
    cleanup = [];
  }

  function render() {
    clear();
    body.innerHTML = "";
    renderTabs();
    if (tab === "quiz") renderQuiz();
    else if (tab === "aoi") renderAoi();
    else if (tab === "catalog") renderCatalog();
    else renderWrong();
  }

  /* ---------------- 判定训练 ---------------- */
  function renderQuiz() {
    const q = ctx.progress.quiz;
    const state = {
      round: 0,
      case: null,
      stage: "verdict",
      correct: 0,
      total: 0,
      streak: 0,
      lastGood: false,
    };

    body.innerHTML = `
      ${
        pool
          ? `<div class="aoi-bar">
               <span class="chip red">错题重练 · ${pool.length} 种</span>
               <button class="btn" id="exit-pool" style="padding:5px 10px;font-size:11px">退出重练</button>
             </div>`
          : ""
      }
      <div class="defect-layout">
        <div>
          <div class="board-stage">
            <canvas id="board" width="${W}" height="${H}"></canvas>
            <div class="stamp" id="stamp"></div>
          </div>
          <div class="score-row" style="margin-top:12px">
            <div class="score-box"><div class="k">本轮得分</div><div class="v" id="score">0 / 0</div></div>
            <div class="score-box"><div class="k">连对</div><div class="v green" id="streak">0</div></div>
            <div class="score-box"><div class="k">历史最佳连对</div><div class="v">${q.bestStreak}</div></div>
          </div>
        </div>
        <div class="quiz-side" id="side"></div>
      </div>
    `;

    const exit = body.querySelector("#exit-pool");
    if (exit)
      exit.onclick = () => {
        pool = null;
        render();
      };

    const canvas = body.querySelector("#board");
    const c2d = canvas.getContext("2d");
    const side = body.querySelector("#side");
    const stamp = body.querySelector("#stamp");

    function newRound() {
      state.round++;
      const source = pool && pool.length ? pool : DEFECTS;
      const wantGood = state.lastGood ? Math.random() < 0.12 : Math.random() < 0.26;
      state.lastGood = wantGood;
      const defect = wantGood ? null : source[Math.floor(Math.random() * source.length)];
      const layout = createLayout(31 + state.round * 13);
      c2d.clearRect(0, 0, W, H);
      drawBoard(c2d, W, H, layout, defect ? defect.id : null);
      stamp.className = "stamp";
      stamp.textContent = "";
      state.case = { defect, layout };
      state.stage = "verdict";
      renderSide();
    }

    function renderSide() {
      const c = state.case;
      if (state.stage === "verdict") {
        side.innerHTML = `
          <div class="card" style="padding:16px">
            <div class="chip cyan" style="margin-bottom:10px">第 ${state.round} 块 · FQC 终检</div>
            <div class="quiz-q">这块板，能放行吗？</div>
            <div class="quiz-hint" style="margin-top:8px">
              先整体看一遍：走线、孔、阻焊、字符。别急着找缺陷——也要小心「本来就合格」的板。
            </div>
            <div class="verdict" style="margin-top:14px">
              <button class="btn" data-v="ok" style="border-color:rgba(85,214,155,.4)">合格 · PASS</button>
              <button class="btn" data-v="ng" style="border-color:rgba(240,112,124,.4)">不合格 · REJECT</button>
            </div>
            <div style="margin-top:12px;font-size:10.5px;color:var(--dim-2);line-height:1.7">
              提示：判定先看「功能」再看「外观」；不确定时，想想这条缺陷会不会影响客户贴片或长期可靠性。
            </div>
          </div>`;
        side.querySelector("[data-v=ok]").onclick = () => verdict(true);
        side.querySelector("[data-v=ng]").onclick = () => verdict(false);
      }

      if (state.stage === "type") {
        const opts = makeOptions(c.defect);
        side.innerHTML = `
          <div class="card" style="padding:16px">
            <div class="chip red" style="margin-bottom:10px">已判定 NG · 请指出缺陷类型</div>
            <div class="quiz-q">你看到的是哪一种不良？</div>
            <div style="display:flex;flex-direction:column;gap:8px;margin-top:14px">
              ${opts
                .map(
                  (o, i) => `<button class="opt" data-opt="${o.id}">
                    <span class="k">${String.fromCharCode(65 + i)}</span>${o.name}
                  </button>`
                )
                .join("")}
            </div>
          </div>`;
        side.querySelectorAll("[data-opt]").forEach((b) => {
          b.onclick = () => answerType(b.dataset.opt);
        });
      }

      if (state.stage === "result") {
        const d = state.case.defect;
        const right = state.result.correct;
        side.innerHTML = `
          <div class="card" style="padding:16px">
            <div class="chip ${right ? "green" : "red"}" style="margin-bottom:10px">
              ${right ? "判定正确" : "判定错误"}
            </div>
            <div class="quiz-q">${d ? d.name : "合格品（无缺陷）"}</div>
            ${
              d
                ? `<div style="font-family:var(--mono);font-size:8.5px;letter-spacing:.12em;color:var(--dim-2);margin-top:4px">${d.en}</div>
                   <div class="explain" style="margin-top:12px">
                     <b>现象：</b>${d.look}<br/>
                     <b>成因：</b>${d.cause}<br/>
                     <b>后果：</b>${d.effect}<br/>
                     <b>怎么判：</b>${d.judge}
                     <span class="ipc">依据：${d.ipc} · 关联工序：${d.process}</span>
                   </div>`
                : `<div class="explain" style="margin-top:12px">
                     这块板没有可判定的缺陷。<b>误判良品</b>在产线上同样有代价：会造成不必要的返工和停线。
                     判定前先确认「有没有超出标准」，而不是「看起来像不像不良」。
                   </div>`
            }
            <div style="display:flex;gap:8px;margin-top:14px">
              <button class="btn primary" id="next" style="flex:1;justify-content:center">下一块 →</button>
            </div>
            <div style="margin-top:10px;font-size:10.5px;color:var(--dim-2);line-height:1.7">
              ${state.result.note || ""}
            </div>
          </div>`;
        side.querySelector("#next").onclick = newRound;
      }
    }

    function verdict(ok) {
      const d = state.case.defect;
      if (ok && !d) return finish(true, "判定正确：这确实是一块良品。");
      if (ok && d) return finish(false, `漏判：这块板其实有「${d.name}」，流出到客户会是大问题。`);
      if (!ok && !d) return finish(false, "误判：这是良品。过度判定会造成返工和停线。");
      state.stage = "type";
      renderSide();
    }

    function answerType(id) {
      const d = state.case.defect;
      const ok = id === d.id;
      finish(ok, ok ? "" : `正确答案是「${d.name}」，你选的是「${DEFECTS.find((x) => x.id === id)?.name}」。`);
    }

    function finish(ok, note) {
      state.stage = "result";
      state.result = { correct: ok, note };
      state.total++;
      if (ok) {
        state.correct++;
        state.streak++;
      } else {
        state.streak = 0;
      }
      const q = ctx.progress.quiz;
      q.total++;
      if (ok) {
        q.correct++;
        q.best = Math.max(q.best, state.correct);
      }
      q.bestStreak = Math.max(q.bestStreak || 0, state.streak);

      const d = state.case.defect;
      if (d && !ctx.progress.seenDefects.includes(d.id)) ctx.progress.seenDefects.push(d.id);
      if (d && !ok) {
        if (!ctx.progress.wrong) ctx.progress.wrong = {};
        ctx.progress.wrong[d.id] = (ctx.progress.wrong[d.id] || 0) + 1;
      }
      ctx.save();

      stamp.textContent = ok ? (d ? "NG · 判定正确" : "OK · 判定正确") : "MISS";
      stamp.className = `stamp show ${ok ? "ok" : "ng"}`;

      body.querySelector("#score").textContent = `${state.correct} / ${state.total}`;
      const sEl = body.querySelector("#streak");
      sEl.textContent = state.streak;
      sEl.className = "v " + (state.streak >= 3 ? "green" : "");
      renderSide();
    }

    newRound();
  }

  function makeOptions(correct) {
    const pool2 = DEFECTS.filter((d) => d.id !== correct.id);
    const picks = [];
    while (picks.length < 3) {
      const d = pool2[Math.floor(Math.random() * pool2.length)];
      if (!picks.find((p) => p.id === d.id)) picks.push(d);
    }
    return [...picks, correct].sort(() => Math.random() - 0.5);
  }

  /* ---------------- AOI 挑战 ---------------- */
  function renderAoi() {
    body.innerHTML = `
      <div class="aoi-bar" id="aoi-bar"></div>
      <div class="defect-layout">
        <div>
          <div class="board-stage" style="padding:12px">
            <div class="stage-wrap">
              <canvas class="board-canvas" id="aoi-board" width="${W}" height="${H}"></canvas>
              <canvas class="overlay-canvas" id="aoi-overlay" width="${W}" height="${H}"></canvas>
            </div>
          </div>
        </div>
        <div class="quiz-side" id="aoi-side"></div>
      </div>
    `;

    const bar = body.querySelector("#aoi-bar");
    const side = body.querySelector("#aoi-side");
    const board = body.querySelector("#aoi-board");
    const overlay = body.querySelector("#aoi-overlay");
    const bctx = board.getContext("2d");
    const octx = overlay.getContext("2d");

    const state = {
      running: false,
      ended: false,
      time: 60,
      anchors: [],
      found: new Set(),
      marks: [],
      misses: 0,
    };
    let timer = null;

    function shuffle(arr) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    function start() {
      if (timer) clearInterval(timer);
      state.running = true;
      state.ended = false;
      state.time = 60;
      state.found = new Set();
      state.marks = [];
      state.misses = 0;

      const ids = shuffle(AOI_DEFECTS).slice(0, 5);
      const layout = createLayout(90 + Math.floor(Math.random() * 500));
      bctx.clearRect(0, 0, W, H);
      state.anchors = drawBoardAoi(bctx, W, H, layout, ids);
      octx.clearRect(0, 0, W, H);

      timer = setInterval(() => {
        if (!state.running) return;
        state.time--;
        if (state.time <= 0) end();
        else updateBar();
      }, 1000);

      updateBar();
      renderAoiSide();
    }

    function end() {
      state.running = false;
      state.ended = true;
      if (timer) clearInterval(timer);
      timer = null;
      updateBar();
      renderAoiSide();
    }

    function updateBar() {
      const total = state.anchors.length;
      const found = state.found.size;
      const timeCls = state.time <= 15 ? "bad" : state.time <= 30 ? "warn" : "";
      bar.innerHTML = `
        <div class="aoi-stat"><div class="k">剩余时间</div><div class="v ${timeCls}">${Math.max(0, state.time)}<small style="font-size:11px">s</small></div></div>
        <div class="aoi-stat"><div class="k">已找到</div><div class="v" style="color:var(--green)">${found}<small style="font-size:11px">/ ${total}</small></div></div>
        <div class="aoi-stat"><div class="k">误报</div><div class="v" style="color:${state.misses ? "var(--red)" : "var(--dim)"}">${state.misses}</div></div>
        <div style="flex:1"></div>
        <button class="btn ${state.running ? "" : "primary"}" id="aoi-start">${state.running ? "重新开始" : state.ended ? "再来一次" : "开始挑战"}</button>
      `;
      bar.querySelector("#aoi-start").onclick = start;
    }

    function renderAoiSide() {
      const total = state.anchors.length;
      const items = state.anchors
        .map((a, i) => {
          const hit = state.found.has(i);
          const d = DEFECTS.find((x) => x.id === a.id);
          return `<div class="found-item ${hit ? "hit" : state.ended ? "miss" : ""}">
            <span class="dot"></span>
            <span class="nm">${hit || state.ended ? d.name : `未知缺陷 ${i + 1}`}</span>
            <span class="why">${hit ? "已找到" : state.ended ? "漏检" : "?"}</span>
          </div>`;
        })
        .join("");

      if (!state.running && !state.ended) {
        side.innerHTML = `
          <div class="card" style="padding:16px">
            <div class="chip amber" style="margin-bottom:10px">AOI 挑战</div>
            <div class="quiz-q">60 秒，在板上找出 5 处缺陷</div>
            <div class="quiz-hint" style="margin-top:8px">
              直接点在怀疑的位置。点中会画绿圈，点错记一次「误报」并扣 3 秒。<br/>
              真实 AOI 会先拍整板再比對，你先练「用眼睛扫板」。
            </div>
            <div style="margin-top:14px;font-size:10.5px;color:var(--dim-2);line-height:1.8">
              常见可找的缺陷：开路、短路、阻焊上焊盘、划伤、分层、孔偏、漏钻、金面发黑、铜渣、字符错误。
            </div>
          </div>`;
        return;
      }

      side.innerHTML = `
        <div class="card" style="padding:16px">
          <div class="chip ${state.ended ? (state.found.size === total ? "green" : "red") : "cyan"}" style="margin-bottom:10px">
            ${state.ended ? (state.found.size === total ? "全部找到" : `时间到 · 找到 ${state.found.size}/${total}`) : "扫描中"}
          </div>
          <div class="found-list">${items}</div>
          ${
            state.ended
              ? `<div style="margin-top:12px;font-size:11px;color:var(--dim-2);line-height:1.8">
                   误报 ${state.misses} 次。真实产线上，误报会让良品被误判返工，漏检会让不良品流到客户——两者都要控。
                 </div>
                 <button class="btn primary" id="aoi-again" style="width:100%;justify-content:center;margin-top:12px">再来一次</button>`
              : `<div class="aoi-tip" style="margin-top:12px">提示：先扫四周，再看元件密集区；阻焊下的走线断口最难找。</div>`
          }
        </div>`;
      const again = side.querySelector("#aoi-again");
      if (again) again.onclick = start;
    }

    overlay.addEventListener("click", (ev) => {
      if (!state.running) return;
      const rect = overlay.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * W;
      const y = ((ev.clientY - rect.top) / rect.height) * H;

      let best = -1;
      let bestD = 34;
      state.anchors.forEach((a, i) => {
        if (state.found.has(i)) return;
        const d = Math.hypot(a.x - x, a.y - y);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });

      if (best >= 0) {
        state.found.add(best);
        state.marks.push({ x: state.anchors[best].x, y: state.anchors[best].y, type: "hit" });
        if (state.found.size === state.anchors.length) setTimeout(end, 350);
      } else {
        state.misses++;
        state.time = Math.max(0, state.time - 3);
        state.marks.push({ x, y, type: "miss" });
      }
      paintOverlay();
      updateBar();
      renderAoiSide();
    });

    function paintOverlay() {
      octx.clearRect(0, 0, W, H);
      for (const m of state.marks) {
        if (m.type === "hit") {
          octx.strokeStyle = "#55d69b";
          octx.lineWidth = 3;
          octx.beginPath();
          octx.arc(m.x, m.y, 26, 0, Math.PI * 2);
          octx.stroke();
          octx.fillStyle = "rgba(85,214,155,0.14)";
          octx.fill();
        } else {
          octx.strokeStyle = "rgba(240,112,124,0.9)";
          octx.lineWidth = 2.5;
          octx.beginPath();
          octx.moveTo(m.x - 9, m.y - 9);
          octx.lineTo(m.x + 9, m.y + 9);
          octx.moveTo(m.x + 9, m.y - 9);
          octx.lineTo(m.x - 9, m.y + 9);
          octx.stroke();
        }
      }
    }

    updateBar();
    renderAoiSide();
    cleanup.push(() => {
      if (timer) clearInterval(timer);
      timer = null;
      state.running = false;
    });
  }

  /* ---------------- 缺陷图谱 ---------------- */
  const PHOTO_KEY = "pcb-lab-photos-v1";

  function loadPhotos() {
    try {
      return JSON.parse(localStorage.getItem(PHOTO_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function storePhoto(id, dataUrl) {
    const m = loadPhotos();
    if (dataUrl) m[id] = dataUrl;
    else delete m[id];
    try {
      localStorage.setItem(PHOTO_KEY, JSON.stringify(m));
      return true;
    } catch (e) {
      alert("浏览器存储空间不够了，先删掉几张别的照片再试。");
      return false;
    }
  }

  /** 压缩成最长边 900px 的 JPEG，避免把 localStorage 撑爆 */
  function shrinkImage(file, cb) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 900;
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        cb(c.toDataURL("image/jpeg", 0.78));
      };
      img.onerror = () => cb(null);
      img.src = reader.result;
    };
    reader.onerror = () => cb(null);
    reader.readAsDataURL(file);
  }

  function renderCatalog() {
    const photos = loadPhotos();
    body.innerHTML = `
      <div class="aoi-tip" style="margin-bottom:10px">
        想换成真实不良照片：点卡片上的 <b>＋照片</b> 上传你自己拍的板子（只存在本机浏览器，不会上传到网上）；
        或者把图片命名成 <b>img/defects/&lt;id&gt;.jpg</b> 放在 HTML 同目录。
      </div>
      <div class="catalog" id="catalog"></div>`;
    const grid = body.querySelector("#catalog");
    const frag = document.createDocumentFragment();

    DEFECTS.forEach((d, i) => {
      const card = document.createElement("div");
      card.className = "dcard";
      card.innerHTML = `
        <div class="thumb"><canvas width="300" height="186"></canvas></div>
        <button class="photo-add" data-add="${d.id}" title="上传真实照片">＋照片</button>
        ${photos[d.id] ? `<button class="photo-del" data-del="${d.id}" title="删除照片">×</button>` : ""}
        <div class="body">
          <h4>${d.name}</h4>
          <div class="en">${d.en}</div>
          <p>${d.look}</p>
        </div>`;
      frag.appendChild(card);
      const thumb = card.querySelector(".thumb");
      if (photos[d.id]) {
        const im = document.createElement("img");
        im.className = "photo";
        im.src = photos[d.id];
        im.alt = d.name;
        thumb.innerHTML = "";
        thumb.appendChild(im);
      } else {
        const cv = thumb.querySelector("canvas");
        renderCard(cv, d, 11 + i * 3);
        tryPhoto(thumb, d);
      }

      card.addEventListener("click", () => openModal(d));

      card.querySelector("[data-add]").addEventListener("click", (e) => {
        e.stopPropagation();
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = () => {
          const f = input.files && input.files[0];
          if (!f) return;
          shrinkImage(f, (url) => {
            if (!url) return alert("这张图读不出来，换一张试试。");
            if (storePhoto(d.id, url)) renderCatalog();
          });
        };
        input.click();
      });

      const del = card.querySelector("[data-del]");
      if (del) {
        del.addEventListener("click", (e) => {
          e.stopPropagation();
          storePhoto(d.id, null);
          renderCatalog();
        });
      }
    });
    grid.appendChild(frag);
  }

  function tryPhoto(container, d) {
    const stored = loadPhotos()[d.id];
    if (stored) {
      container.innerHTML = "";
      const im = document.createElement("img");
      im.className = "photo";
      im.src = stored;
      im.alt = d.name;
      container.appendChild(im);
      return;
    }
    const img = new Image();
    img.alt = d.name;
    img.onload = () => {
      container.innerHTML = "";
      img.className = "photo";
      container.appendChild(img);
    };
    img.src = `img/defects/${d.id}.jpg`;
  }

  /* ---------------- 错题本 ---------------- */
  function renderWrong() {
    const w = ctx.progress.wrong || {};
    const ids = Object.keys(w).sort((a, b) => w[b] - w[a]);

    if (!ids.length) {
      body.innerHTML = `
        <div class="card" style="text-align:center;padding:50px 20px">
          <h3 style="font-size:16px">错题本是空的</h3>
          <div class="sub" style="max-width:420px;margin:10px auto 0">
            去「判定训练」做几题。判错的缺陷会自动收进来，考前只刷这些就够了。
          </div>
          <button class="btn primary" id="go-quiz" style="margin-top:18px">去做判定</button>
        </div>`;
      body.querySelector("#go-quiz").onclick = () => {
        tab = "quiz";
        render();
      };
      return;
    }

    const items = ids.map((id) => ({ d: DEFECTS.find((x) => x.id === id), n: w[id] })).filter((x) => x.d);

    body.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px">
        <div>
          <h3 style="font-size:15px">错题本 · ${items.length} 种缺陷</h3>
          <div class="sub">按错误次数排序。点卡片看完整解释，或者直接重练。</div>
        </div>
        <button class="btn primary" id="retry" style="margin-left:auto">开始错题重练 →</button>
      </div>
      <div class="wrong-grid" id="wg"></div>`;

    const grid = body.querySelector("#wg");
    items.forEach(({ d, n }, i) => {
      const card = document.createElement("div");
      card.className = "wrong-card";
      card.innerHTML = `
        <canvas width="300" height="186"></canvas>
        <div class="b">
          <h4>${d.name}</h4>
          <div class="n">错了 ${n} 次</div>
        </div>`;
      grid.appendChild(card);
      renderCard(card.querySelector("canvas"), d, 11 + i * 3);
      card.onclick = () => openModal(d);
    });

    body.querySelector("#retry").onclick = () => {
      pool = items.map((x) => x.d);
      tab = "quiz";
      render();
    };
  }

  function openModal(d) {
    const mask = document.createElement("div");
    mask.className = "modal";
    mask.innerHTML = `
      <div class="box">
        <div class="modal-head">
          <div>
            <h3>${d.name}</h3>
            <span>${d.en} · ${d.process}</span>
          </div>
          <button class="btn" id="close">关闭</button>
        </div>
        <div class="modal-body">
          <div class="modal-thumb" id="big-wrap"><canvas width="900" height="560" id="big"></canvas></div>
          <div class="modal-info">
            <div class="kv">
              <div><span>现象</span><span>${d.look}</span></div>
              <div><span>成因</span><span>${d.cause}</span></div>
              <div><span>后果</span><span>${d.effect}</span></div>
              <div><span>判定</span><span>${d.judge}</span></div>
              <div><span>依据</span><span>${d.ipc}</span></div>
            </div>
          </div>
        </div>
      </div>`;
    root.appendChild(mask);
    const big = mask.querySelector("#big");
    const layout = createLayout(11 + DEFECTS.indexOf(d) * 3);
    const bctx = big.getContext("2d");
    const anchors = drawBoardAoi(bctx, 900, 560, layout, [d.id]);
    if (anchors[0]) drawDefectMark(bctx, anchors[0].x, anchors[0].y, 900, 560);
    tryPhoto(mask.querySelector("#big-wrap"), d);
    const close = () => mask.remove();
    mask.querySelector("#close").onclick = close;
    mask.addEventListener("click", (e) => {
      if (e.target === mask) close();
    });
    cleanup.push(close);
  }

  render();
  return () => clear();
}
