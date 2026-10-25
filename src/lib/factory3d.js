import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { PHASES } from "../data/line40.js";
import { buildMachine, MACHINE_CFG } from "./machines.js";

const COLS = 10;
const SPACING = 3.0;
const X0 = -13.5;
const ROW_Z = [-12, -4, 4, 12];
const BELT_Y = 1.0;
const MACHINE_Z = -2.5;

const part = (geo, mat, x, y, z) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};
const box = (w, h, d, mat, x, y, z) => part(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
const cyl = (r, h, mat, x, y, z, seg = 16) =>
  part(new THREE.CylinderGeometry(r, r, h, seg), mat, x, y, z);

export class PCBFactory {
  constructor(container, { stations, onSelect } = {}) {
    this.container = container;
    this.stations = stations;
    this.onSelect = onSelect;
    this.selected = -1;
    this.hovered = -1;
    this.speed = 1;
    this.paused = false;
    this.animated = [];
    this.machineMeshes = [];
    this.panels = [];
    this.stats = { done: 0, ng: 0 };
    this.elapsed = 0;

    const w = container.clientWidth || 1200;
    const h = container.clientHeight || 520;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.96;
    container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(w, h);
    this.labelRenderer.domElement.className = "factory-labels";
    container.appendChild(this.labelRenderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x080c11, 0.008);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.22;

    this.camera = new THREE.PerspectiveCamera(38, w / h, 0.5, 300);
    this.camera.position.set(0, 23, 26);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.47;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 90;
    this.controls.target.set(0, 0, 0);

    this.scene.add(new THREE.HemisphereLight(0xdfeeff, 0x0b1016, 1.15));
    const key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(18, 34, 22);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -30;
    key.shadow.camera.right = 30;
    key.shadow.camera.top = 30;
    key.shadow.camera.bottom = -30;
    key.shadow.camera.far = 90;
    key.shadow.bias = -0.0006;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x8fb8e8, 0.8);
    fill.position.set(-22, 18, -18);
    this.scene.add(fill);

    this.buildFloor();
    this.buildBelts();
    this.buildMachines();
    this.buildRoute();
    this.spawnPanels();

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.bind();

    this.clock = new THREE.Clock();
    this.loop = this.loop.bind(this);
    this.renderer.setAnimationLoop(this.loop);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);

    this.tween = null;
  }

  /* ---------------- floor / belts ---------------- */
  buildFloor() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 140),
      new THREE.MeshStandardMaterial({ color: 0x11171e, roughness: 0.85, metalness: 0.2 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const grid = new THREE.GridHelper(160, 160, 0x1d3442, 0x16232c);
    grid.position.y = 0.01;
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    this.scene.add(grid);

    // 每一段的地面色带
    Object.entries(PHASES).forEach(([key, ph], r) => {
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(31, 0.12),
        new THREE.MeshBasicMaterial({ color: ph.color, transparent: true, opacity: 0.5 })
      );
      strip.rotation.x = -Math.PI / 2;
      strip.position.set(0, 0.02, ROW_Z[r] + 3.2);
      this.scene.add(strip);
    });
  }

  buildBelts() {
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x151a20, roughness: 0.7, metalness: 0.3 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x8f9aa8, metalness: 0.85, roughness: 0.35 });

    ROW_Z.forEach((z) => {
      const belt = box(30, 0.08, 1.1, beltMat, 0, BELT_Y, z);
      belt.receiveShadow = true;
      this.scene.add(belt);
      for (const dz of [-0.62, 0.62]) {
        this.scene.add(box(30, 0.12, 0.06, railMat, 0, BELT_Y + 0.02, z + dz));
      }
      for (let x = -14; x <= 14; x += 3.5) {
        for (const dz of [-0.5, 0.5]) {
          this.scene.add(box(0.07, 0.95, 0.07, railMat, x, 0.5, z + dz));
        }
      }
    });

    // 转角连接段
    for (let r = 0; r < 3; r++) {
      const x = r % 2 === 0 ? 15.4 : -15.4;
      const z0 = ROW_Z[r];
      const z1 = ROW_Z[r + 1];
      const belt = box(1.1, 0.08, Math.abs(z1 - z0), beltMat, x, BELT_Y, (z0 + z1) / 2);
      belt.receiveShadow = true;
      this.scene.add(belt);
    }
  }

  /* ---------------- materials ---------------- */
  mats() {
    return {
      body: new THREE.MeshStandardMaterial({ color: 0xd5dbe3, metalness: 0.05, roughness: 0.74 }),
      body2: new THREE.MeshStandardMaterial({ color: 0xb9c1cb, metalness: 0.12, roughness: 0.66 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x232a32, metalness: 0.18, roughness: 0.72 }),
      glass: new THREE.MeshPhysicalMaterial({
        color: 0x0b1620,
        metalness: 0.3,
        roughness: 0.15,
        emissive: new THREE.Color(0x0d3a4a),
        emissiveIntensity: 0.6,
      }),
      steel: new THREE.MeshStandardMaterial({ color: 0xb4bcc6, metalness: 0.55, roughness: 0.42 }),
      yellow: new THREE.MeshStandardMaterial({ color: 0xe0b23a, metalness: 0.4, roughness: 0.5 }),
      glow: new THREE.MeshStandardMaterial({
        color: 0x0b1116,
        emissive: new THREE.Color(0x47d7e8),
        emissiveIntensity: 1.4,
        metalness: 0.3,
        roughness: 0.4,
      }),
    };
  }

  /* ---------------- machines ---------------- */
  buildMachines() {
    this.stations.forEach((st, i) => {
      const row = Math.floor(i / 10);
      const col = i % 10;
      const dir = PHASES[st.phase].dir;
      const x = dir > 0 ? X0 + col * SPACING : -X0 - col * SPACING;
      const z = ROW_Z[row] + MACHINE_Z;
      st.worldX = x;
      st.worldZ = z;
      st.row = row;

      // 每台设备独立材质，才能单独高亮 / 单独闪烁
      const M = this.mats();
      M.glow.userData.glow = true;
      M.glow.emissive.set(PHASES[st.phase].color);

      const g = new THREE.Group();
      const accent = new THREE.Color(PHASES[st.phase].color);
      const startAnim = this.animated.length;
      buildMachine(MACHINE_CFG[st.no] || { b: "desk" }, g, M, accent, st, this.animated, THREE);
      st.anims = this.animated.slice(startAnim);
      this.animated.length = startAnim;

      // 按实际外形尺寸加底座和段色条
      const bb = new THREE.Box3().setFromObject(g);
      const size = bb.getSize(new THREE.Vector3());
      const cx = (bb.min.x + bb.max.x) / 2;
      const cz = (bb.min.z + bb.max.z) / 2;
      g.add(box(size.x + 0.24, 0.1, size.z + 0.24, M.dark, cx, 0.05, cz));
      const stripMat = new THREE.MeshStandardMaterial({
        color: 0x0b1116,
        emissive: new THREE.Color(PHASES[st.phase].color),
        emissiveIntensity: 0.85,
      });
      stripMat.userData.glow = true;
      g.add(box(Math.min(size.x, 2.6), 0.055, 0.04, stripMat, cx, 0.24, bb.max.z + 0.04));

      g.position.set(x, 0, z);
      this.scene.add(g);

      const label = document.createElement("div");
      label.className = "factory-label";
      label.innerHTML = `<b>${String(st.no).padStart(2, "0")}</b><span>${st.name}</span>`;
      const l = new CSS2DObject(label);
      l.position.set(cx, bb.max.y + 0.55, cz);
      g.add(l);

      st.mesh = g;
      st.labelEl = label;
      st.active = false;

      g.traverse((o) => {
        if (o.isMesh) {
          o.userData.station = i;
          this.machineMeshes.push(o);
        }
      });
    });
    this.applyTint();
  }

  build_bench(g, M, accent, st) {
    g.add(box(2.0, 0.12, 1.2, M.body, 0, 0.9, 0));
    for (const dx of [-0.85, 0.85]) for (const dz of [-0.45, 0.45]) g.add(cyl(0.05, 0.85, M.body2, dx, 0.45, dz));
    g.add(box(0.9, 0.05, 0.62, M.dark, 0, 0.98, 0));
    g.add(box(0.5, 0.36, 0.05, M.glass, -0.55, 1.3, -0.35));
    this.animated.push((t, on) => {
      M.glow.emissiveIntensity = on ? 1.8 + Math.sin(t * 6) * 0.4 : 0.8;
    });
  }

  build_shear(g, M, accent, st) {
    g.add(box(2.2, 0.25, 1.4, M.dark, 0, 0.13, 0));
    for (const dx of [-0.95, 0.95]) g.add(box(0.16, 1.9, 0.16, M.body2, dx, 1.1, 0));
    g.add(box(2.2, 0.22, 0.5, M.body, 0, 2.05, 0));
    const blade = box(2.0, 0.12, 0.18, M.steel, 0, 1.55, 0.1);
    g.add(blade);
    const stack = box(1.1, 0.34, 0.9, M.body, 0, 0.42, 0.1);
    g.add(stack);
    this.animated.push((t, on) => {
      blade.position.y = on ? 1.2 + Math.sin(t * 10) * 0.25 : 1.55;
    });
  }

  build_wet(g, M, accent, st) {
    const len = 4.4;
    g.add(box(len, 0.9, 1.5, M.body, 0, 0.55, 0));
    for (let i = 0; i < 4; i++) {
      const x = -len / 2 + 0.8 + i * 0.95;
      g.add(box(0.8, 0.5, 1.2, M.body2, x, 1.1, 0));
      const lamp = box(0.6, 0.04, 0.9, M.glow, x, 1.4, 0);
      g.add(lamp);
    }
    g.add(box(len, 0.14, 0.12, M.steel, 0, 1.25, -0.72));
    for (let i = 0; i < 3; i++) g.add(cyl(0.07, 0.9, M.steel, -1.3 + i * 1.4, 1.7, -0.6));
    this.animated.push((t, on) => {
      M.glow.emissiveIntensity = on ? 1.6 + Math.sin(t * 3) * 0.5 : 0.5;
    });
  }

  build_film(g, M, accent, st) {
    g.add(box(2.4, 0.1, 1.3, M.dark, 0, 0.7, 0));
    g.add(box(2.2, 0.09, 1.25, M.body, 0, 1.15, 0));
    const roll = part(new THREE.CylinderGeometry(0.42, 0.42, 1.1, 24), M.body2, -0.55, 1.62, 0);
    roll.rotation.x = Math.PI / 2;
    g.add(roll);
    const roll2 = cylinderClone(roll, 0.75, 1.62, 0);
    g.add(roll2);
    this.animated.push((t, on) => {
      const s = on ? 1 : 0.15;
      roll.rotation.y += 0.02 * s;
      roll2.rotation.y += 0.02 * s;
    });
  }

  build_ldi(g, M, accent, st) {
    g.add(box(2.4, 0.2, 1.7, M.dark, 0, 0.1, 0));
    g.add(box(2.3, 1.9, 1.6, M.body, 0, 1.15, 0));
    g.add(box(1.5, 0.7, 0.06, M.glass, 0, 1.45, 0.82));
    g.add(box(0.55, 0.4, 0.05, M.dark, 1.35, 1.5, 0.82));
    const head = box(1.2, 0.1, 0.3, M.glow, 0, 1.62, 0.05);
    g.add(head);
    this.animated.push((t, on) => {
      head.position.x = on ? Math.sin(t * 2.4) * 0.8 : 0;
      M.glow.emissiveIntensity = on ? 2.2 : 0.7;
    });
  }

  build_aoi(g, M, accent, st) {
    g.add(box(2.3, 0.2, 1.6, M.dark, 0, 0.1, 0));
    g.add(box(2.2, 1.7, 1.5, M.body, 0, 1.05, 0));
    g.add(box(1.3, 0.8, 0.05, M.glass, -0.25, 1.35, 0.76));
    g.add(box(0.5, 0.55, 0.05, M.dark, 0.85, 1.45, 0.76));
    const cam = box(0.35, 0.16, 0.35, M.glow, 0, 1.72, 0);
    g.add(cam);
    this.animated.push((t, on) => {
      cam.position.x = on ? Math.sin(t * 1.6) * 0.7 : 0;
      M.glow.emissiveIntensity = on ? 1.6 : 0.6;
    });
  }

  build_layup(g, M, accent, st) {
    g.add(box(2.2, 0.12, 1.4, M.body, 0, 0.9, 0));
    for (const dx of [-0.9, 0.9]) for (const dz of [-0.5, 0.5]) g.add(cyl(0.05, 0.85, M.body2, dx, 0.45, dz));
    for (let i = 0; i < 4; i++) {
      g.add(box(0.9, 0.045, 0.62, i % 2 ? M.body2 : M.dark, -0.2, 0.99 + i * 0.05, 0));
    }
    g.add(box(0.06, 1.2, 0.06, M.steel, 0.75, 1.5, -0.4));
    g.add(box(0.06, 1.2, 0.06, M.steel, 0.75, 1.5, 0.4));
    g.add(box(0.08, 0.08, 0.9, M.steel, 0.75, 2.1, 0));
  }

  build_press(g, M, accent, st) {
    g.add(box(3.0, 0.3, 2.0, M.dark, 0, 0.15, 0));
    for (const dx of [-1.25, 1.25]) for (const dz of [-0.8, 0.8]) {
      g.add(box(0.22, 3.4, 0.22, M.body2, dx, 1.9, dz));
    }
    g.add(box(3.2, 0.3, 2.2, M.body, 0, 3.6, 0));
    for (let i = 0; i < 4; i++) {
      g.add(box(2.6, 0.16, 1.7, i % 2 ? M.steel : M.body, 0, 1.0 + i * 0.55, 0));
    }
    const ram = box(0.5, 0.5, 0.5, M.body2, 0, 3.3, 0);
    g.add(ram);
    // 黄色防护栏
    for (const dz of [-1.15, 1.15]) {
      g.add(box(3.4, 0.08, 0.08, M.yellow, 0, 0.95, dz));
      g.add(box(3.4, 0.08, 0.08, M.yellow, 0, 0.55, dz));
    }
    this.animated.push((t, on) => {
      ram.position.y = on ? 3.45 : 3.2;
    });
  }

  build_drill(g, M, accent, st) {
    g.add(box(2.8, 0.2, 1.9, M.dark, 0, 0.1, 0));
    g.add(box(2.7, 2.1, 1.8, M.body, 0, 1.2, 0));
    g.add(box(2.0, 0.85, 0.06, M.glass, 0, 1.55, 0.92));
    const head = box(1.7, 0.22, 0.5, M.body2, 0, 1.95, 0.1);
    g.add(head);
    for (let i = 0; i < 3; i++) {
      const sp = cyl(0.05, 0.5, M.steel, -0.5 + i * 0.5, 1.7, 0.1);
      g.add(sp);
    }
    this.animated.push((t, on) => {
      head.position.x = on ? Math.sin(t * 3) * 0.55 : 0;
    });
  }

  build_plating(g, M, accent, st) {
    const len = 4.6;
    g.add(box(len, 0.7, 1.6, M.body, 0, 0.45, 0));
    for (let i = 0; i < 4; i++) {
      const x = -len / 2 + 0.7 + i * 1.1;
      g.add(box(0.95, 0.5, 1.3, M.dark, x, 0.95, 0));
      g.add(box(0.85, 0.06, 1.15, M.glow, x, 1.18, 0));
    }
    for (const dz of [-0.85, 0.85]) g.add(box(len, 0.1, 0.1, M.steel, 0, 2.4, dz));
    const hoist = box(0.5, 0.3, 0.5, M.body2, -len / 2 + 0.7, 2.3, 0);
    g.add(hoist);
    this.animated.push((t, on) => {
      hoist.position.x = on ? -len / 2 + 0.7 + ((t * 0.6) % 1) * (len - 1.4) : -len / 2 + 0.7;
      M.glow.emissiveIntensity = on ? 1.4 : 0.4;
    });
  }

  build_coat(g, M, accent, st) {
    g.add(box(2.4, 0.12, 1.4, M.body, 0, 0.9, 0));
    for (const dx of [-1, 1]) g.add(box(0.1, 1.9, 0.1, M.steel, dx, 1.0, -0.55));
    g.add(box(2.2, 0.12, 0.12, M.steel, 0, 1.95, -0.55));
    const head = box(0.7, 0.2, 0.3, M.dark, 0, 1.8, -0.35);
    g.add(head);
    g.add(box(1.0, 0.04, 0.7, M.glass, 0, 0.97, 0));
    this.animated.push((t, on) => {
      head.position.x = on ? Math.sin(t * 2) * 0.7 : 0;
    });
  }

  build_cure(g, M, accent, st) {
    g.add(box(3.0, 0.9, 1.3, M.body, 0, 0.55, 0));
    g.add(box(2.6, 0.12, 1.1, M.dark, 0, 1.05, 0));
    for (let i = 0; i < 4; i++) g.add(box(0.5, 0.06, 1.0, M.glow, -0.9 + i * 0.6, 1.16, 0));
    this.animated.push((t, on) => {
      M.glow.emissiveIntensity = on ? 1.8 + Math.sin(t * 4) * 0.3 : 0.5;
    });
  }

  build_router(g, M, accent, st) {
    g.add(box(2.8, 0.2, 1.9, M.dark, 0, 0.1, 0));
    g.add(box(2.7, 1.8, 1.8, M.body, 0, 1.05, 0));
    g.add(box(2.0, 0.7, 0.06, M.glass, 0, 1.45, 0.92));
    const gantry = box(0.25, 0.3, 1.9, M.body2, 0, 1.95, 0);
    g.add(gantry);
    const spindle = cyl(0.09, 0.5, M.steel, 0, 1.75, 0);
    g.add(spindle);
    this.animated.push((t, on) => {
      gantry.position.x = on ? Math.sin(t * 1.8) * 0.8 : 0;
      spindle.position.x = gantry.position.x;
    });
  }

  build_test(g, M, accent, st) {
    g.add(box(2.4, 0.2, 1.7, M.dark, 0, 0.1, 0));
    g.add(box(2.3, 0.5, 1.6, M.body, 0, 0.4, 0));
    g.add(box(1.8, 0.05, 1.2, M.dark, 0, 0.68, 0));
    for (const dx of [-1.05, 1.05]) for (const dz of [-0.75, 0.75]) {
      g.add(box(0.12, 2.0, 0.12, M.body2, dx, 1.4, dz));
    }
    g.add(box(2.3, 0.14, 0.14, M.steel, 0, 2.4, -0.75));
    const arm1 = box(0.06, 0.9, 0.06, M.steel, -0.35, 1.95, 0);
    const arm2 = box(0.06, 0.9, 0.06, M.steel, 0.35, 1.95, 0);
    g.add(arm1, arm2);
    const probe = cyl(0.035, 0.25, M.glow, -0.35, 1.5, 0);
    g.add(probe);
    this.animated.push((t, on) => {
      const y = on ? 1.55 + Math.sin(t * 4) * 0.12 : 1.7;
      arm1.position.y = y;
      arm2.position.y = y;
      probe.position.y = y - 0.45;
      M.glow.emissiveIntensity = on ? 1.8 : 0.6;
    });
  }

  /* ---------------- panels / route ---------------- */
  buildRoute() {
    const route = [];
    const push = (x, z, station) => route.push({ x, z, station });
    for (let i = 0; i < this.stations.length; i++) {
      const st = this.stations[i];
      push(st.worldX, ROW_Z[st.row], i);
      if (i % 10 === 9 && i < this.stations.length - 1) {
        const x = PHASES[st.phase].dir > 0 ? 15.4 : -15.4;
        push(x, ROW_Z[st.row], -1);
        push(x, ROW_Z[st.row + 1], -1);
      }
    }
    // 累计距离
    let d = 0;
    route.forEach((p, i) => {
      if (i > 0) d += Math.hypot(p.x - route[i - 1].x, p.z - route[i - 1].z);
      p.dist = d;
      if (p.station >= 0) this.stations[p.station].dist = d;
    });
    this.route = route;
    this.routeLen = d;
  }

  pointAt(dist) {
    const route = this.route;
    let i = 0;
    while (i < route.length - 1 && route[i + 1].dist < dist) i++;
    const a = route[i];
    const b = route[Math.min(i + 1, route.length - 1)];
    const span = Math.max(0.0001, b.dist - a.dist);
    const t = Math.min(1, Math.max(0, (dist - a.dist) / span));
    return {
      x: a.x + (b.x - a.x) * t,
      z: a.z + (b.z - a.z) * t,
      station: b.station,
      t,
    };
  }

  spawnPanels() {
    const tex = this.panelTexture();
    const base = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.2, roughness: 0.5 });
    const count = 7;
    for (let i = 0; i < count; i++) {
      const mat = base.clone();
      const g = new THREE.Group();
      const board = new THREE.Mesh(new RoundedBoxGeometry(1.15, 0.05, 0.72, 2, 0.012), mat);
      board.castShadow = true;
      g.add(board);
      this.scene.add(g);
      const p = {
        group: g,
        mat,
        board,
        id: `P-${String(i + 1).padStart(3, "0")}`,
        lot: `L26${String(10 + (i % 3))}`,
        dist: (this.routeLen / count) * i,
        next: 0,
        state: "move",
        timer: 0,
        defect: false,
        log: [],
      };
      // 找到下一个要加工的工位
      while (p.next < 40 && this.stations[p.next].dist < p.dist) p.next++;
      board.userData.panel = p;
      this.panels.push(p);
    }
    this.buildIsolation();
  }

  buildIsolation() {
    const g = new THREE.Group();
    g.position.set(17.6, 0, 7);
    const frame = new THREE.MeshStandardMaterial({ color: 0x2a3138, metalness: 0.7, roughness: 0.45 });
    const red = new THREE.MeshStandardMaterial({
      color: 0x120708,
      emissive: new THREE.Color(0xff4d5e),
      emissiveIntensity: 1.4,
    });
    g.add(box(3.2, 0.14, 1.6, frame, 0, 0.07, 0));
    for (const dx of [-1.5, 1.5]) {
      g.add(box(0.12, 2.6, 0.12, frame, dx, 1.3, -0.7));
      g.add(box(0.12, 2.6, 0.12, frame, dx, 1.3, 0.7));
    }
    for (let i = 0; i < 3; i++) {
      g.add(box(3.2, 0.1, 1.5, frame, 0, 0.75 + i * 0.75, 0));
      g.add(box(3.0, 0.05, 0.06, red, 0, 0.72 + i * 0.75, 0.78));
    }
    this.scene.add(g);

    const el = document.createElement("div");
    el.className = "factory-label on";
    el.innerHTML = `<b>NG</b><span>隔离区</span>`;
    const l = new CSS2DObject(el);
    l.position.set(0, 3.1, 0);
    g.add(l);

    this.isolationSlots = [];
    for (let i = 0; i < 6; i++) {
      this.isolationSlots.push(
        new THREE.Vector3(16.7 + (i % 3) * 0.95, 0.83 + Math.floor(i / 3) * 0.75, 7)
      );
    }
  }

  setPanelNG(p) {
    p.mat.emissive.setHex(0xff3344);
    p.mat.emissiveIntensity = 0.85;
  }

  sendToIsolation(p) {
    p.state = "ng";
    p.ngT = 0;
    p.ngFrom = p.group.position.clone();
    const slot = this.isolationSlots[p.slotIdx || 0];
    p.slotIdx = ((p.slotIdx || 0) + 1) % this.isolationSlots.length;
    p.ngTo = slot.clone();
  }

  recyclePanel(p) {
    p.defect = false;
    p.ngWait = 0;
    p.next = 0;
    p.dist = 0;
    p.state = "move";
    p.mat.emissive.setHex(0x000000);
    p.mat.emissiveIntensity = 0;
    p.group.position.set(this.route[0].x, BELT_Y + 0.08, this.route[0].z);
  }

  panelTexture() {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 320;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#1b5b41";
    ctx.fillRect(0, 0, 512, 320);
    ctx.strokeStyle = "rgba(8,44,30,0.6)";
    ctx.lineWidth = 4;
    for (let y = 18; y < 320; y += 34) {
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(492, y - 12);
      ctx.stroke();
    }
    ctx.fillStyle = "#d8b25c";
    for (let i = 0; i < 26; i++) {
      const x = 40 + Math.random() * 430;
      const y = 30 + Math.random() * 260;
      ctx.fillRect(x, y, 14 + Math.random() * 16, 8 + Math.random() * 8);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /* ---------------- interaction ---------------- */
  bind() {
    const el = this.renderer.domElement;
    let down = null;
    el.addEventListener("pointerdown", (e) => (down = { x: e.clientX, y: e.clientY }));
    el.addEventListener("pointerup", (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 6) return;
      const hit = this.pick(e);
      if (!hit) return;
      if (hit.kind === "panel") {
        this.onPanelSelect && this.onPanelSelect(hit.panel);
        return;
      }
      this.setSelected(hit.i);
      this.onSelect && this.onSelect(hit.i);
    });
    el.addEventListener("pointermove", (e) => {
      const hit = this.pick(e);
      const idx = hit && hit.kind === "station" ? hit.i : -1;
      if (idx !== this.hovered) {
        this.hovered = idx;
        el.style.cursor = hit ? "pointer" : "grab";
        this.applyTint();
      }
    });
  }

  pick(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const boards = this.panels.map((p) => p.board);
    const ph = this.raycaster.intersectObjects(boards, false);
    if (ph.length) return { kind: "panel", panel: ph[0].object.userData.panel };

    const hits = this.raycaster.intersectObjects(this.machineMeshes, false);
    if (!hits.length) return null;
    return { kind: "station", i: hits[0].object.userData.station };
  }

  setSelected(i) {
    this.selected = i;
    this.applyTint();
    this.stations.forEach((s, k) => {
      s.labelEl.classList.toggle("on", k === i);
    });
  }

  applyTint() {
    this.stations.forEach((s, k) => {
      const on = k === this.selected;
      const hot = k === this.hovered;
      s.mesh.traverse((o) => {
        if (!o.isMesh) return;
        if (!o.material || !o.material.emissive) return;
        if (o.material.userData.glow) return;
        o.material.emissive.setHex(0x1f7f96);
        o.material.emissiveIntensity = on ? 0.55 : hot ? 0.22 : 0;
      });
      if (s.labelEl) s.labelEl.classList.toggle("hot", hot && !on);
    });
  }

  flyTo(pos, target) {
    this.camera.position.set(pos[0], pos[1], pos[2]);
    this.controls.target.set(target[0], target[1], target[2]);
    this.controls.update();
  }

  overview() {
    this.flyTo([0, 23, 26], [0, 0.5, 0]);
  }

  focusPhase(phase) {
    const row = { A: 0, B: 1, C: 2, D: 3 }[phase];
    this.flyTo([0, 16, ROW_Z[row] + 20], [0, 1, ROW_Z[row]]);
  }

  focusStation(i) {
    const st = this.stations[i];
    this.flyTo([st.worldX + 3.5, 4.5, st.worldZ + 7], [st.worldX, 1.2, st.worldZ]);
  }

  setSpeed(v) {
    this.speed = v;
  }
  setPaused(p) {
    this.paused = p;
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
  }

  /* ---------------- loop ---------------- */
  loop() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.time = (this.time || 0) + dt;
    const sim = this.paused ? 0 : dt * this.speed;

    // 机器状态复位
    this.stations.forEach((s) => (s.active = false));

    for (const p of this.panels) {
      // ---- 被判定 NG，拉去隔离区 ----
      if (p.state === "ng") {
        p.ngT = Math.min(1, p.ngT + dt * 0.7);
        const e = p.ngT < 0.5 ? 2 * p.ngT * p.ngT : 1 - Math.pow(-2 * p.ngT + 2, 2) / 2;
        p.group.position.lerpVectors(p.ngFrom, p.ngTo, e);
        p.group.position.y += Math.sin(e * Math.PI) * 0.6;
        if (p.ngT >= 1) {
          p.ngWait = (p.ngWait || 0) + dt;
          if (p.ngWait > 6) this.recyclePanel(p);
        }
        continue;
      }

      if (p.state === "move") {
        p.dist += sim * 7;
        if (p.next < 40 && p.dist >= this.stations[p.next].dist) {
          p.dist = this.stations[p.next].dist;
          p.state = "work";
          p.timer = this.stations[p.next].dwell;
        }
        if (p.dist > this.routeLen) p.dist = 0;
      } else {
        p.timer -= sim;
        const st = this.stations[p.next];
        if (st) {
          st.active = true;
          st.busy = (st.busy || 0) + dt;
        }
        if (p.timer <= 0) {
          // QC 工位：AOI / 电测 / 终检
          const no = st ? st.no : 0;
          if (!p.defect && (no === 10 || no === 29 || no === 39 || no === 40)) {
            if (Math.random() < 0.16) {
              p.defect = true;
              p.ngStation = no;
              this.stats.ng++;
              this.setPanelNG(p);
              this.sendToIsolation(p);
              continue;
            }
          }
          p.next++;
          if (p.next >= 40) {
            this.stats.done++;
            p.next = 0;
            p.dist = 0;
          }
          p.state = "move";
        }
      }
      const pt = this.pointAt(p.dist);
      p.group.position.set(pt.x, BELT_Y + 0.08, pt.z);
      const ahead = this.pointAt(p.dist + 0.6);
      p.group.rotation.y = Math.atan2(ahead.x - pt.x, ahead.z - pt.z) + Math.PI / 2;
    }

    // 设备开动率
    this.elapsed = (this.elapsed || 0) + dt;
    this.stations.forEach((s) => {
      s.util = s.busy ? Math.min(1, s.busy / Math.max(1, this.elapsed)) : 0;
    });

    // 机器动画 + 标签显隐
    const t = this.time;
    this.stations.forEach((s) => {
      if (!s.anims) return;
      for (const fn of s.anims) {
        try {
          fn(t, s.active);
        } catch (e) {
          /* 单台设备动画出错不影响整条线渲染 */
        }
      }
    });

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);

    if (this.tween) {
      this.tween.t += dt;
      const k = Math.min(1, this.tween.t / this.tween.dur);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      this.camera.position.lerpVectors(this.tween.p0, this.tween.p1, e);
      this.controls.target.lerpVectors(this.tween.t0, this.tween.t1, e);
      if (k >= 1) this.tween = null;
    }
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.ro.disconnect();
    this.scene.traverse((o) => {
      if (o.isMesh) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => m.dispose());
      }
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labelRenderer.domElement.remove();
  }
}

function cylinderClone(src, x, y, z) {
  const m = src.clone();
  m.position.set(x, y, z);
  return m;
}







