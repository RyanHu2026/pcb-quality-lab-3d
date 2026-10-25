import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createLayout, paintCopper, paintPlane, paintMask } from "./pcbArt.js";

const BW = 6;
const BH = 3.72;
const TEX_W = 896;
const TEX_H = 558;

const KIND_COLOR = {
  copper: 0xb06a30,
  core: 0x8d8a5c,
  prepreg: 0x9a8a55,
  mask: 0x1d5c40,
  coverlay: 0xc08a3e,
};

const displayThickness = (mm) => Math.max(0.05, mm * 0.55);

export class PCBViewer {
  constructor(container, { onPick, onHover } = {}) {
    this.container = container;
    this.onPick = onPick;
    this.onHover = onHover;
    this.layers = [];
    this.explode = 0;
    this.target = 0;
    this.selected = null;
    this.hovered = null;
    this.board = null;
    this.layout = createLayout(7);
    this.focusHold = 0;

    const w = container.clientWidth || 800;
    const h = container.clientHeight || 520;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(w, h);
    this.labelRenderer.domElement.className = "pcb-labels";
    container.appendChild(this.labelRenderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 120);
    this.camera.position.set(7.2, 6.9, 8.6);

    // 环境反射：金属和绿油要有东西可反射，才不会像塑料
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.env;
    this.scene.environmentIntensity = 0.85;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 7;
    this.controls.maxDistance = 22;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.target.set(0, 0, 0);

    // lights
    this.scene.add(new THREE.HemisphereLight(0xdcecff, 0x0a0e12, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(5, 9, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 30;
    key.shadow.camera.left = -7;
    key.shadow.camera.right = 7;
    key.shadow.camera.top = 7;
    key.shadow.camera.bottom = -7;
    key.shadow.bias = -0.0005;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0x9fc4ff, 0.85);
    fill.position.set(-6, 4, -5);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffd2a0, 0.55);
    rim.position.set(0, 3, -7);
    this.scene.add(rim);

    // ground
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(9, 64),
      new THREE.MeshStandardMaterial({ color: 0x0a0e13, roughness: 0.9, metalness: 0.1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2.2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.ground = ground;
    this.setTheme(document.documentElement.dataset.theme || "light");

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.pickables = [];

    this.bindEvents();
    this.clock = new THREE.Clock();
    this.loop = this.loop.bind(this);
    this.renderer.setAnimationLoop(this.loop);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
  }

  bindEvents() {
    const el = this.renderer.domElement;
    el.addEventListener("pointermove", (ev) => {
      const rect = el.getBoundingClientRect();
      this.pointer.set(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1
      );
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObjects(this.pickables, false);
      const layer = hits.length ? hits[0].object.userData.layer : null;
      if (layer !== this.hovered) {
        this.hovered = layer;
        this.renderer.domElement.style.cursor = layer ? "pointer" : "grab";
        this.onHover && this.onHover(layer);
        this.updateTint();
      }
    });
    el.addEventListener("pointerdown", (ev) => {
      this.down = { x: ev.clientX, y: ev.clientY };
    });
    el.addEventListener("pointerup", (ev) => {
      if (!this.down) return;
      const moved = Math.hypot(ev.clientX - this.down.x, ev.clientY - this.down.y);
      this.down = null;
      if (moved > 5) return;
      const rect = el.getBoundingClientRect();
      this.pointer.set(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1
      );
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObjects(this.pickables, false);
      const layer = hits.length ? hits[0].object.userData.layer : null;
      this.select(layer);
      this.onPick && this.onPick(layer);
    });
  }

  setTheme(t) {
    const light = t === "light";
    if (this.ground) {
      this.ground.material.color.setHex(light ? 0xf2f2f5 : 0x0a0e13);
      this.ground.material.roughness = light ? 0.96 : 0.9;
    }
    if (this.scene) this.scene.environmentIntensity = light ? 0.55 : 0.85;
    if (this.renderer) this.renderer.toneMappingExposure = light ? 1.05 : 1.0;
  }

  setBoard(board) {
    this.board = board;
    this.clear();
    this.layout = createLayout(7 + board.stack.length);
    this.gap = board.stack.length > 12 ? 0.32 : 0.38;
    this.stackH = (board.stack.length - 1) * this.gap + 1.6;
    this.controls.minDistance = Math.max(7.5, this.stackH * 1.05);

    const stack = board.stack;
    const thicknesses = stack.map((l) => displayThickness(l.mm));
    const total = thicknesses.reduce((a, b) => a + b, 0);
    let cursor = total / 2;

    this.layers = [];
    stack.forEach((layer, i) => {
      const th = thicknesses[i];
      const y = cursor - th / 2;
      cursor -= th;

      // 软硬结合：刚性区只占左侧一段，右侧留给弯折带
      const span = layer.span || (board.rigidWidth ? [0, board.rigidWidth] : [0, 1]);
      const spanW = span[1] - span[0];
      const w = BW * spanW;
      const cx = ((span[0] + span[1]) / 2 - 0.5) * BW;

      const r = Math.min(0.022, th * 0.32);
      const geo = new RoundedBoxGeometry(w, th, BH, 2, r);
      const tex = this.makeTexture(layer, i);
      if (spanW < 0.999) {
        tex.repeat.set(spanW, 1);
        tex.offset.set(span[0], 0);
        tex.needsUpdate = true;
      }
      const edgeColor = KIND_COLOR[layer.kind] || 0x6a6a6a;
      const edgeMat = new THREE.MeshStandardMaterial({
        color: edgeColor,
        roughness: layer.kind === "copper" ? 0.35 : 0.7,
        metalness: layer.kind === "copper" ? 0.85 : 0.1,
      });

      const faceMat = this.makeFaceMaterial(layer, tex);
      const bottomMat = faceMat.clone();

      const mesh = new THREE.Mesh(geo, [edgeMat, edgeMat, faceMat, bottomMat, edgeMat, edgeMat]);
      mesh.position.set(cx, y, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.layer = { ...layer, index: i, realY: y, base: y };
      this.root.add(mesh);
      this.pickables.push(mesh);

      // 选中描边：紧贴这一层，不要盖到邻居
      const oh = Math.max(th * 1.08, th + 0.012);
      const outGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(w * 1.004, oh, BH * 1.004));
      const outline = new THREE.LineSegments(
        outGeo,
        new THREE.LineBasicMaterial({ color: 0x47d7e8, transparent: true, opacity: 0.95 })
      );
      outline.visible = false;
      mesh.add(outline);

      // label：单列贴左缘，只留短名，层多也不打架
      const el = document.createElement("div");
      el.className = "pcb-layer-label compact";
      el.innerHTML = `<b>${layer.layer || layer.name}</b>`;
      const label = new CSS2DObject(el);
      label.position.set(cx - w / 2 - 0.18, y, BH / 2 - 0.25);
      this.root.add(label);

      this.layers.push({ mesh, label, el, data: mesh.userData.layer, faceMat, bottomMat, outline, th });
    });

    if (board.rigidWidth) this.buildFlexTail(board);
    this.buildHoles(board);
    this.buildPads();

    this.root.rotation.y = -0.18;
    this.updateExplode();
    this.updateTint();
    this.fitView();
  }

  /** 刚柔结合板的弯折带：由多段薄片串成一条弧线，真的会弯下去 */
  buildFlexTail(board) {
    const x0 = (board.rigidWidth - 0.5) * BW;
    const totalLen = (1 - board.rigidWidth) * BW;
    const segs = 16;
    const segLen = totalLen / segs;
    const step = 1.15 / segs; // 累计弯约 66°

    const piMat = new THREE.MeshStandardMaterial({
      color: 0xb9832f,
      roughness: 0.45,
      metalness: 0.05,
    });
    const cuMat = new THREE.MeshStandardMaterial({
      color: 0xc07a3c,
      roughness: 0.35,
      metalness: 0.7,
    });
    const covMat = new THREE.MeshPhysicalMaterial({
      color: 0xd8a95a,
      roughness: 0.3,
      metalness: 0.05,
      clearcoat: 0.7,
      clearcoatRoughness: 0.25,
    });

    const root = new THREE.Group();
    root.position.set(x0, 0, 0);
    this.root.add(root);
    let parent = root;

    const tailW = BH * 0.72;
    for (let i = 0; i < segs; i++) {
      const g = new THREE.Group();
      if (i > 0) {
        g.position.x = segLen;
        g.rotation.z = -step;
      }
      parent.add(g);

      const cov = new THREE.Mesh(
        new RoundedBoxGeometry(segLen * 1.06, 0.05, tailW, 2, 0.012),
        covMat
      );
      cov.position.set(segLen / 2, 0.042, 0);
      const pi = new THREE.Mesh(new RoundedBoxGeometry(segLen * 1.03, 0.048, tailW, 2, 0.012), piMat);
      pi.position.set(segLen / 2, 0, 0);
      const cov2 = cov.clone();
      cov2.position.y = -0.042;
      const cu = new THREE.Mesh(new RoundedBoxGeometry(segLen * 1.03, 0.014, tailW * 0.96, 2, 0.005), cuMat);
      cu.position.set(segLen / 2, 0.022, 0);
      const cu2 = cu.clone();
      cu2.position.y = -0.022;

      [cov, pi, cov2, cu, cu2].forEach((m) => {
        m.castShadow = true;
        m.receiveShadow = true;
        g.add(m);
      });
      parent = g;
    }

    const data = {
      name: "弯折区（Flex）",
      en: "Flex Tail",
      kind: "coverlay",
      mm: 0.19,
      role: "PI 基材 + 双面铜 + 上下覆盖膜；可以反复弯折，弯折半径通常 ≥ 6 倍板厚。",
      index: 999,
      tail: true,
    };
    root.traverse((o) => {
      if (o.isMesh) {
        o.userData.layer = data;
        this.pickables.push(o);
      }
    });

    const el = document.createElement("div");
    el.className = "pcb-layer-label compact";
    el.innerHTML = `<b>弯折区</b>`;
    const label = new CSS2DObject(el);
    label.position.set(segLen * 1.4, 0.16, 0);
    parent.add(label);

    this.layers.push({
      mesh: root,
      label,
      el,
      data,
      faceMat: covMat,
      bottomMat: covMat,
      outline: null,
      isTail: true,
      base: 0,
    });
  }

  /** 顶层焊盘：贴图上有焊盘，这里再叠一层薄金面，侧看有厚度 */
  buildPads() {
    const L = this.layers[0];
    if (!L) return;
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xe0bb63,
      metalness: 0.95,
      roughness: 0.22,
    });
    this.holeMats = this.holeMats || [];
    this.holeMats.push(goldMat);

    const n = Math.min(26, this.layout.pads.length);
    for (let i = 0; i < n; i++) {
      const p = this.layout.pads[i];
      const x = (p.x / this.layout.W - 0.5) * BW;
      const z = (p.y / this.layout.H - 0.5) * BH;
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(p.w * 0.062, 0.012, p.h * 0.062),
        goldMat
      );
      m.position.set(x - L.mesh.position.x, (L.th || 0.05) / 2 + 0.007, z);
      L.mesh.add(m);
      this.holeMeshes.push(m);
    }
  }

  /** 实体孔：每层一个孔环，中间一条可随展开拉伸的孔壁 */
  buildHoles(board) {
    this.vias = [];
    this.holeMeshes = [];
    if (!board.holes || !board.holes.length) return;

    const copperMat = new THREE.MeshStandardMaterial({
      color: 0xd08a45,
      metalness: 0.9,
      roughness: 0.3,
      side: THREE.DoubleSide,
    });
    const darkMat = new THREE.MeshBasicMaterial({ color: 0x05080a });
    this.holeMats = [copperMat, darkMat];

    board.holes.forEach((h, hi) => {
      const x = (h.x - 0.5) * BW;
      const z = 1.5 - (hi % 2 === 1 ? 0.5 : 0);
      const from = Math.max(0, Math.min(h.from, this.layers.length - 1));
      const to = Math.max(0, Math.min(h.to, this.layers.length - 1));

      for (let i = from; i <= to; i++) {
        const L = this.layers[i];
        if (!L || L.isTail) continue;
        const th = L.th || 0.05;
        const localX = x - L.mesh.position.x;

        // 孔（深色圆）—— 介质层也要有
        const disc = new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), darkMat);
        disc.rotation.x = -Math.PI / 2;
        disc.position.set(localX, th / 2 + 0.003, z);
        L.mesh.add(disc);
        this.holeMeshes.push(disc);

        // 铜环只出现在铜层上
        if (L.data.kind === "copper") {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.042, 10, 32), copperMat);
          ring.rotation.x = Math.PI / 2;
          ring.position.set(localX, th / 2 + 0.005, z);
          L.mesh.add(ring);
          this.holeMeshes.push(ring);
        }
      }

      // 孔壁：单位高度圆柱，按展开程度纵向拉伸
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 1, 20, 1, true),
        copperMat
      );
      barrel.position.set(x, 0, z);
      this.root.add(barrel);
      this.vias.push({ barrel, from, to, th0: 0 });
    });
  }

  makeFaceMaterial(layer, tex) {
    if (layer.kind === "copper") {
      return new THREE.MeshStandardMaterial({
        map: tex,
        metalness: 0.55,
        roughness: 0.42,
        envMapIntensity: 0.75,
        emissive: new THREE.Color(0x000000),
      });
    }
    if (layer.kind === "mask") {
      return new THREE.MeshPhysicalMaterial({
        map: tex,
        metalness: 0.05,
        roughness: 0.42,
        clearcoat: 0.35,
        clearcoatRoughness: 0.35,
        envMapIntensity: 0.8,
        emissive: new THREE.Color(0x000000),
      });
    }
    if (layer.kind === "coverlay") {
      return new THREE.MeshPhysicalMaterial({
        map: tex,
        metalness: 0.0,
        roughness: 0.32,
        clearcoat: 0.8,
        clearcoatRoughness: 0.2,
        transparent: true,
        opacity: 0.94,
        emissive: new THREE.Color(0x000000),
      });
    }
    if (layer.kind === "prepreg") {
      return new THREE.MeshStandardMaterial({
        map: tex,
        metalness: 0.02,
        roughness: 0.52,
        envMapIntensity: 0.8,
        emissive: new THREE.Color(0x000000),
      });
    }
    return new THREE.MeshPhysicalMaterial({
      map: tex,
      metalness: 0.03,
      roughness: 0.58,
      clearcoat: 0.2,
      clearcoatRoughness: 0.7,
      envMapIntensity: 0.9,
      emissive: new THREE.Color(0x000000),
    });
  }

  makeTexture(layer, i) {
    const c = document.createElement("canvas");
    c.width = TEX_W;
    c.height = TEX_H;
    const ctx = c.getContext("2d");
    const l = this.layout;

    if (layer.kind === "mask") {
      paintMask(ctx, TEX_W, TEX_H, l, {
        title: this.board ? this.board.name.toUpperCase() : "PCB",
        silk: i === 0,
      });
      if (i !== 0) {
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.fillRect(0, 0, TEX_W, TEX_H);
      }
    } else if (layer.kind === "coverlay") {
      // 覆盖膜：琥珀色半透明 PI
      const g = ctx.createLinearGradient(0, 0, TEX_W, TEX_H);
      g.addColorStop(0, "#c99544");
      g.addColorStop(0.5, "#d8a95a");
      g.addColorStop(1, "#b9832f");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, TEX_W, TEX_H);
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = "#7a4d10";
      for (let x = 0; x < TEX_W; x += 9) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, TEX_H);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (layer.kind === "copper") {
      const plane = /平面/.test(layer.role || "");
      if (plane) paintPlane(ctx, TEX_W, TEX_H, l, 11 + i);
      else paintCopper(ctx, TEX_W, TEX_H, l, { seed: 5 + i, sparse: i % 3 === 2 });
    } else {
      const g = ctx.createLinearGradient(0, 0, TEX_W, TEX_H);
      if (layer.kind === "core") {
        g.addColorStop(0, "#8d8a5c");
        g.addColorStop(0.5, "#a09a68");
        g.addColorStop(1, "#7e7b52");
      } else {
        g.addColorStop(0, "#9a8a55");
        g.addColorStop(0.5, "#b09a5e");
        g.addColorStop(1, "#8b7a4b");
      }
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, TEX_W, TEX_H);
      ctx.globalAlpha = 0.1;
      ctx.strokeStyle = "#3b3520";
      for (let x = 0; x < TEX_W; x += 6) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, TEX_H);
        ctx.stroke();
      }
      for (let y = 0; y < TEX_H; y += 6) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(TEX_W, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    return tex;
  }

  clear() {
    for (const l of this.layers) {
      if (l.isTail) {
        l.mesh.traverse((o) => {
          if (o.isMesh) {
            o.geometry.dispose();
            o.material.dispose();
          }
        });
      } else {
        l.mesh.geometry.dispose();
        const mats = Array.isArray(l.mesh.material) ? l.mesh.material : [l.mesh.material];
        mats.forEach((m) => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
        if (l.outline) {
          l.outline.geometry.dispose();
          l.outline.material.dispose();
        }
      }
      this.root.remove(l.mesh);
      this.root.remove(l.label);
    }
    this.pickables = [];
    this.layers = [];

    if (this.holeMeshes) {
      for (const m of this.holeMeshes) m.geometry.dispose();
      this.holeMeshes = [];
    }
    if (this.vias) {
      for (const v of this.vias) {
        this.root.remove(v.barrel);
        v.barrel.geometry.dispose();
      }
      this.vias = [];
    }
    if (this.holeMats) {
      this.holeMats.forEach((m) => m.dispose());
      this.holeMats = null;
    }
    this.selected = null;
    this.hovered = null;
  }

  setExplode(t) {
    this.target = Math.max(0, Math.min(1, t));
  }

  updateExplode() {
    const n = this.layers.length;
    const gap = this.gap || 0.38;
    let maxOff = 0;
    this.layers.forEach((l, i) => {
      if (l.isTail) {
        l.mesh.position.y = 0;
        l.label.position.y = 0.12;
        return;
      }
      // 数组是「从上到下」：顶层位移最大，底层不动，这样才是顺着叠层向上展开
      const off = (n - 1 - i) * gap * this.explode;
      maxOff = Math.max(maxOff, off);
      l.mesh.position.y = l.data.base + off;
      l.label.position.y = l.mesh.position.y;
    });
    this.root.position.y = -maxOff / 2;

    // 孔壁跟着展开拉伸，始终连接孔环
    if (this.vias) {
      for (const v of this.vias) {
        const a = this.layers[v.from];
        const b = this.layers[v.to];
        if (!a || !b) continue;
        const yTop = a.mesh.position.y + (a.th || 0.05) / 2;
        const yBot = b.mesh.position.y - (b.th || 0.05) / 2;
        v.barrel.position.y = (yTop + yBot) / 2;
        v.barrel.scale.y = Math.max(0.02, yTop - yBot);
      }
    }
  }

  select(layer, focus = true) {
    this.selected = layer;
    if (focus && layer) {
      const l = this.layers[layer.index];
      if (l) {
        this.focusY = this.root.position.y + l.mesh.position.y;
        this.focusHold = 1.1;
      }
    }
    this.updateTint();
  }

  updateTint() {
    for (const l of this.layers) {
      const isSel = this.selected && this.selected.index === l.data.index;
      const isHov = this.hovered && this.hovered.index === l.data.index;
      const k = isSel ? 1 : isHov ? 0.45 : 0;
      l.faceMat.emissive.setHex(0x1f8fa6);
      l.faceMat.emissiveIntensity = k * 0.55;
      l.bottomMat.emissive.setHex(0x1f8fa6);
      l.bottomMat.emissiveIntensity = k * 0.55;
      if (l.outline) l.outline.visible = !!isSel;
      if (l.el) {
        l.el.classList.toggle("on", !!isSel);
        l.el.classList.toggle("hot", !!isHov);
        l.el.classList.toggle("show", this.explode > 0.12 || isSel || isHov);
      }
    }
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
    this.fitView();
  }

  /** 按容器宽高比把整块板（含展开高度）框进画面 */
  fitView() {
    const w = this.container.clientWidth || 800;
    const h = this.container.clientHeight || 520;
    const aspect = w / h;
    const vTan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    const needW = 8.0;
    const needH = Math.max(6.6, (this.stackH || 5) * 1.35 + 1.2);
    const dist = Math.max(needH / 2 / vTan, needW / 2 / (vTan * aspect));
    const dir = this.camera.position.clone().sub(this.controls.target);
    if (dir.lengthSq() < 1e-4) dir.set(0.55, 0.53, 0.66);
    dir.normalize();
    this.camera.position.copy(this.controls.target).addScaledVector(dir, dist);
    this.camera.updateMatrixWorld();
  }

  loop() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.explode += (this.target - this.explode) * Math.min(1, dt * 7);
    if (Math.abs(this.target - this.explode) < 0.001) this.explode = this.target;
    this.updateExplode();

    if (this.focusHold > 0) {
      this.focusHold -= dt;
      this.controls.target.y += (this.focusY - this.controls.target.y) * Math.min(1, dt * 6);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
    for (const l of this.layers) {
      const show = l.isTail
        ? true
        : this.explode > 0.12 || (this.selected && this.selected.index === l.data.index);
      l.el.classList.toggle("show", !!show);
    }
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.ro.disconnect();
    this.clear();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    if (this.labelRenderer.domElement.parentElement) {
      this.labelRenderer.domElement.parentElement.removeChild(this.labelRenderer.domElement);
    }
  }
}





