import { useEffect } from 'react';
import * as THREE from 'three';
import { currentTheme, supportsWebGL, type Theme } from '../lib/env';

// Site-wide 3D backdrop (adapted from the Avand landing's SiteScene).
// Fixed behind all content (z-index -1), non-interactive and decorative. Every section carries a data-scene
// tag; the scene keeps one group per topic and cross-fades to the group of the section under the reading line
// (45% of the viewport height). Under prefers-reduced-motion nothing animates: the topic switches instantly
// and a single static frame is rendered. Without WebGL nothing is drawn at all. Everything is disposed on
// unmount.

type Key = 'a' | 'b';
type Mat = THREE.LineBasicMaterial | THREE.MeshBasicMaterial | THREE.PointsMaterial;
type Slot = { mat: Mat; key: Key; base: number };
type BuildCtx = { mobile: boolean; col: (k: Key) => number; dot: THREE.Texture };
type Built = { group: THREE.Group; slots: Slot[]; anim: (t: number, dt: number) => void };
type Preset = { pal: Record<Theme, [number, number]>; build: (ctx: BuildCtx) => Built };

// Pose used for the single static frame under prefers-reduced-motion.
const STATIC_T = 3.2;

function geoFrom(pos: number[]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

function gridSegments(size: number, divisions: number): number[] {
  const pts: number[] = [];
  const half = size / 2;
  const step = size / divisions;
  for (let i = 0; i <= divisions; i++) {
    const p = -half + i * step;
    pts.push(-half, 0, p, half, 0, p, p, 0, -half, p, 0, half);
  }
  return pts;
}

// Closed polyline (XY plane) to LineSegments positions.
function loopSegments(pts: THREE.Vector2[], z = 0): number[] {
  const seg: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    seg.push(p.x, p.y, z, q.x, q.y, z);
  }
  return seg;
}

// Rounded rectangle outline, optionally with a speech-bubble tail on the bottom edge.
function bubblePoints(w: number, h: number, r: number, tail: 'left' | 'right' | 'none'): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  const hw = w / 2;
  const hh = h / 2;
  const arc = (cx: number, cy: number, a0: number, a1: number) => {
    for (let i = 0; i <= 5; i++) {
      const a = a0 + ((a1 - a0) * i) / 5;
      pts.push(new THREE.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
    }
  };
  arc(hw - r, hh - r, 0, Math.PI / 2);
  arc(-hw + r, hh - r, Math.PI / 2, Math.PI);
  arc(-hw + r, -hh + r, Math.PI, Math.PI * 1.5);
  if (tail === 'left') {
    pts.push(new THREE.Vector2(-hw + r + 0.12, -hh), new THREE.Vector2(-hw + r - 0.08, -hh - 0.32), new THREE.Vector2(-hw + r + 0.42, -hh));
  }
  if (tail === 'right') {
    pts.push(new THREE.Vector2(hw - r - 0.42, -hh), new THREE.Vector2(hw - r + 0.08, -hh - 0.32), new THREE.Vector2(hw - r - 0.12, -hh));
  }
  arc(hw - r, -hh + r, Math.PI * 1.5, Math.PI * 2);
  return pts;
}

function makeDotTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (g) {
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.45, 'rgba(255,255,255,0.9)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
  }
  return new THREE.CanvasTexture(c);
}

// Tracks every material with its palette key and base opacity, so the cross-fade and the theme switch can
// update them in one place.
function makeBuilder(ctx: BuildCtx) {
  const group = new THREE.Group();
  const slots: Slot[] = [];
  const add = <M extends Mat>(m: M, key: Key, base: number): M => {
    m.color.setHex(ctx.col(key));
    m.opacity = base;
    m.transparent = true;
    m.depthWrite = false;
    slots.push({ mat: m, key, base });
    return m;
  };
  const line = (geo: THREE.BufferGeometry, key: Key, base: number, parent: THREE.Object3D = group) => {
    const l = new THREE.LineSegments(geo, add(new THREE.LineBasicMaterial(), key, base));
    parent.add(l);
    return l;
  };
  const edges = (geo: THREE.BufferGeometry, key: Key, base: number, parent: THREE.Object3D = group) => {
    const eg = new THREE.EdgesGeometry(geo);
    geo.dispose();
    return line(eg, key, base, parent);
  };
  const solid = (geo: THREE.BufferGeometry, key: Key, base: number, wire = false, parent: THREE.Object3D = group) => {
    const m = new THREE.Mesh(geo, add(new THREE.MeshBasicMaterial({ wireframe: wire }), key, base));
    parent.add(m);
    return m;
  };
  const points = (positions: Float32Array, key: Key, base: number, size: number, parent: THREE.Object3D = group) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const p = new THREE.Points(geo, add(new THREE.PointsMaterial({ size, map: ctx.dot, sizeAttenuation: true }), key, base));
    parent.add(p);
    return p;
  };
  return { group, slots, add, line, edges, solid, points };
}

// ---- Scene builders: one per topic --------------------------------------------------------------------------

// hub — hero and final call to action: message streams from every direction converge on one answering
// point. Deliberately no solid core here: the hero already shows the 3D core, so the backdrop stays a field.
function buildHub(ctx: BuildCtx): Built {
  const b = makeBuilder(ctx);
  const ring = b.solid(new THREE.TorusGeometry(1.1, 0.01, 6, 120), 'b', 0.45);
  ring.rotation.x = Math.PI / 2.3;
  const halo = b.solid(new THREE.TorusGeometry(5.2, 0.008, 6, 160), 'a', 0.2);
  halo.rotation.set(-Math.PI / 2.6, 0.3, 0);
  const N = ctx.mobile ? 30 : 56;
  const R = 6.2;
  const dirs: THREE.Vector3[] = [];
  const seg: number[] = [];
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = i * 2.399963;
    const v = new THREE.Vector3(Math.cos(th) * r, y * 0.75, Math.sin(th) * r).normalize();
    dirs.push(v);
    seg.push(v.x * 1.25, v.y * 1.25, v.z * 1.25, v.x * R, v.y * R, v.z * R);
  }
  b.line(geoFrom(seg), 'b', 0.1);
  const pos = new Float32Array(N * 3);
  const pts = b.points(pos, 'a', 0.9, 0.17);
  const phase = dirs.map((_, i) => (i * 0.618) % 1);
  return {
    group: b.group,
    slots: b.slots,
    anim: (t) => {
      b.group.rotation.y = t * 0.05;
      ring.rotation.z = t * 0.2;
      halo.rotation.z = -t * 0.03;
      for (let i = 0; i < N; i++) {
        const u = (phase[i] + t * 0.16) % 1;
        const rad = R - u * (R - 1.25);
        pos[i * 3] = dirs[i].x * rad;
        pos[i * 3 + 1] = dirs[i].y * rad;
        pos[i * 3 + 2] = dirs[i].z * rad;
      }
      pts.geometry.attributes.position.needsUpdate = true;
    },
  };
}

// keeper — brand story and footer: the "-بان" (guardian) idea, a hexagonal guard ring watching over a core.
function buildKeeper(ctx: BuildCtx): Built {
  const b = makeBuilder(ctx);
  b.solid(new THREE.SphereGeometry(0.55, 16, 12), 'a', 0.35, true);
  const ringGroup = new THREE.Group();
  ringGroup.rotation.x = 0.42;
  b.group.add(ringGroup);
  const hex = b.solid(new THREE.TorusGeometry(1.9, 0.018, 4, 6), 'b', 0.75, false, ringGroup);
  hex.rotation.x = Math.PI / 2;
  const guards: THREE.Mesh[] = [];
  const seg: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const g = b.solid(new THREE.OctahedronGeometry(0.17), 'b', 0.9, false, ringGroup);
    g.position.set(Math.cos(a) * 1.9, 0, Math.sin(a) * 1.9);
    guards.push(g);
    seg.push(0, 0, 0, g.position.x * 0.32, 0, g.position.z * 0.32);
  }
  b.line(geoFrom(seg), 'a', 0.4, ringGroup);
  const dome = b.edges(new THREE.IcosahedronGeometry(2.7, 1), 'a', 0.14);
  return {
    group: b.group,
    slots: b.slots,
    anim: (t) => {
      ringGroup.rotation.y = t * 0.16;
      dome.rotation.y = -t * 0.04;
      guards.forEach((g, i) => {
        g.rotation.y = t * 1.1 + i;
        g.scale.setScalar(1 + 0.3 * Math.sin(t * 1.8 + i) ** 2);
      });
    },
  };
}

// pipeline — simulator: messages travel right-to-left (RTL) through three stations: question, knowledge, answer.
function buildPipeline(ctx: BuildCtx): Built {
  const b = makeBuilder(ctx);
  b.line(geoFrom([7, -0.95, 0, -7, -0.95, 0, 7, -1.55, 0, -7, -1.55, 0]), 'b', 0.35);
  const stations = [3.6, 0, -3.6].map((x) => {
    const s = b.edges(new THREE.BoxGeometry(1.15, 1.15, 1.15), 'a', 0.7);
    s.position.set(x, -0.25, 0);
    return s;
  });
  const N = ctx.mobile ? 6 : 10;
  const cubes: THREE.LineSegments[] = [];
  const eg = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.34, 0.34, 0.34));
  const cubeMat = b.add(new THREE.LineBasicMaterial(), 'b', 0.9);
  for (let i = 0; i < N; i++) {
    const c = new THREE.LineSegments(eg, cubeMat);
    b.group.add(c);
    cubes.push(c);
  }
  return {
    group: b.group,
    slots: b.slots,
    anim: (t) => {
      cubes.forEach((c, i) => {
        const x = 7 - ((i * (14 / N) + t * 0.85) % 14);
        c.position.set(x, -0.25, 0);
        c.rotation.set(t * 0.8 + i, t * 0.6 + i, 0);
      });
      stations.forEach((s) => {
        let near = 0;
        for (const c of cubes) {
          const d = Math.abs(c.position.x - s.position.x);
          if (d < 0.75) near = Math.max(near, 1 - d / 0.75);
        }
        s.scale.setScalar(1 + 0.16 * near);
        s.rotation.y = 0.35 + near * 0.3;
      });
    },
  };
}

// bubbles — chat preview: a chat thread scrolling upward; user bubbles on the right, assistant on the left (RTL).
function buildBubbles(ctx: BuildCtx): Built {
  const b = makeBuilder(ctx);
  const thread = new THREE.Group();
  thread.rotation.y = -0.22;
  b.group.add(thread);
  const userMat = b.add(new THREE.LineBasicMaterial(), 'b', 0.8);
  const botMat = b.add(new THREE.LineBasicMaterial(), 'a', 0.65);
  const N = ctx.mobile ? 6 : 8;
  const span = N * 1.15;
  const items: { obj: THREE.LineSegments; base: number }[] = [];
  for (let i = 0; i < N; i++) {
    const user = i % 2 === 1;
    const w = user ? 1.9 + (i % 3) * 0.35 : 2.6 + (i % 2) * 0.5;
    const h = 0.72;
    const seg = loopSegments(bubblePoints(w, h, 0.22, user ? 'right' : 'left'));
    const lines = user ? 1 : 2;
    for (let k = 0; k < lines; k++) {
      const y = lines === 1 ? 0 : 0.12 - k * 0.24;
      const len = (w - 0.6) * (k === lines - 1 ? 0.62 : 1);
      seg.push(w / 2 - 0.3, y, 0, w / 2 - 0.3 - len, y, 0);
    }
    const obj = new THREE.LineSegments(geoFrom(seg), user ? userMat : botMat);
    obj.position.x = user ? 1.35 : -1.1;
    thread.add(obj);
    items.push({ obj, base: i * 1.15 });
  }
  return {
    group: b.group,
    slots: b.slots,
    anim: (t) => {
      thread.rotation.y = -0.22 + Math.sin(t * 0.25) * 0.12;
      items.forEach(({ obj, base }) => {
        const y = ((base + t * 0.32) % span) - span / 2;
        obj.position.y = y;
        const edge = Math.min(1, (span / 2 - Math.abs(y)) / 0.8);
        obj.scale.setScalar(Math.max(0.001, edge));
      });
    },
  };
}

// path — setup: a route with four waypoints, one per setup step, travelled from right to left (RTL).
function buildPath(ctx: BuildCtx): Built {
  const b = makeBuilder(ctx);
  const stops = [
    [4.5, -1.1, 0.3],
    [1.5, 0.9, -0.4],
    [-1.5, -0.8, 0.5],
    [-4.5, 1.1, -0.2],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const curve = new THREE.CatmullRomCurve3(stops);
  const pts = curve.getPoints(160);
  const seg: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) seg.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
  b.line(geoFrom(seg), 'a', 0.6);
  const rings = stops.map((p) => {
    b.solid(new THREE.SphereGeometry(0.1, 12, 10), 'b', 0.95).position.copy(p);
    const r = b.solid(new THREE.TorusGeometry(0.32, 0.012, 6, 48), 'a', 0.6);
    r.position.copy(p);
    return r;
  });
  const marker = b.solid(new THREE.SphereGeometry(0.15, 14, 12), 'b', 1);
  return {
    group: b.group,
    slots: b.slots,
    anim: (t) => {
      const u = (t * 0.06) % 1;
      marker.position.copy(curve.getPointAt(u));
      rings.forEach((r, i) => {
        const d = marker.position.distanceTo(stops[i]);
        r.scale.setScalar(1 + Math.max(0, 1 - d / 0.9) * 0.6);
        r.rotation.y = t * 0.8 + i;
      });
    },
  };
}

// towers — product pillars: four columns of different heights, one per pillar.
function buildTowers(ctx: BuildCtx): Built {
  const b = makeBuilder(ctx);
  b.line(geoFrom(gridSegments(12, 12).map((v, i) => (i % 3 === 1 ? v - 1.3 : v))), 'b', 0.3);
  const heights = [2.4, 3.2, 2.7, 3.7];
  const cols = heights.map((h, i) => {
    const c = b.edges(new THREE.BoxGeometry(0.95, 1, 0.95), 'a', 0.7);
    c.position.set(3 - i * 2, -1.3 + h / 2, 0);
    c.scale.y = h;
    return c;
  });
  const caps = heights.map((h, i) => {
    const m = b.edges(new THREE.OctahedronGeometry(0.28), 'b', 0.85);
    m.position.set(3 - i * 2, -1.3 + h + 0.45, 0);
    return m;
  });
  return {
    group: b.group,
    slots: b.slots,
    anim: (t) => {
      b.group.rotation.y = Math.sin(t * 0.3) * 0.25;
      cols.forEach((c, i) => {
        const s = heights[i] * (1 + 0.025 * Math.sin(t * 1.4 + i));
        c.scale.y = s;
        c.position.y = -1.3 + s / 2;
        caps[i].position.y = -1.3 + s + 0.45 + Math.sin(t * 1.6 + i) * 0.08;
        caps[i].rotation.y = t * 0.9 + i;
      });
    },
  };
}

// split — before/after comparison: scattered, jittering points (manual support, right) versus an ordered,
// connected grid (with Pasokhban, left). The order mirrors the RTL card order.
function buildSplit(ctx: BuildCtx): Built {
  const b = makeBuilder(ctx);
  const cols = ctx.mobile ? 4 : 6;
  const rows = ctx.mobile ? 4 : 5;
  const N = cols * rows;
  const chaosBase = new Float32Array(N * 3);
  const seeds: number[] = [];
  for (let i = 0; i < N; i++) {
    chaosBase[i * 3] = 0.7 + Math.random() * 3.6;
    chaosBase[i * 3 + 1] = -1.8 + Math.random() * 3.6;
    chaosBase[i * 3 + 2] = -1 + Math.random() * 2;
    seeds.push(Math.random() * 10);
  }
  const chaos = new Float32Array(chaosBase);
  const chaosPts = b.points(chaos, 'a', 0.9, 0.2);
  const order = new Float32Array(N * 3);
  const gx = (c: number) => -0.9 - c * (3.4 / (cols - 1));
  const gy = (r: number) => 1.6 - r * (3.2 / (rows - 1));
  const seg: number[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      order[i * 3] = gx(c);
      order[i * 3 + 1] = gy(r);
      if (c < cols - 1) seg.push(gx(c), gy(r), 0, gx(c + 1), gy(r), 0);
      if (r < rows - 1) seg.push(gx(c), gy(r), 0, gx(c), gy(r + 1), 0);
    }
  const orderPts = b.points(order, 'b', 0.95, 0.2);
  b.line(geoFrom(seg), 'b', 0.25);
  b.line(geoFrom([0, -2.1, 0, 0, 2.1, 0]), 'b', 0.3);
  return {
    group: b.group,
    slots: b.slots,
    anim: (t) => {
      for (let i = 0; i < N; i++) {
        const s = seeds[i];
        chaos[i * 3] = chaosBase[i * 3] + Math.sin(t * 1.3 + s) * 0.18;
        chaos[i * 3 + 1] = chaosBase[i * 3 + 1] + Math.cos(t * 1.7 + s * 1.3) * 0.18;
        chaos[i * 3 + 2] = chaosBase[i * 3 + 2] + Math.sin(t * 0.9 + s * 0.7) * 0.25;
        order[i * 3 + 2] = Math.sin(t * 1.2 + (i % cols) * 0.6) * 0.12;
      }
      chaosPts.geometry.attributes.position.needsUpdate = true;
      orderPts.geometry.attributes.position.needsUpdate = true;
      b.group.rotation.y = Math.sin(t * 0.2) * 0.12;
    },
  };
}

// panels — admin panel views: floating dashboard windows with message rows and a small bar chart.
function buildPanels(ctx: BuildCtx): Built {
  const b = makeBuilder(ctx);
  const specs: [number, number, number, number][] = [
    [2.6, 0.8, 0.2, -0.35],
    [-1.6, 1.3, -0.6, 0.3],
    [0.4, -1.2, 0.8, -0.25],
    [-3.2, -1.1, -0.3, 0.35],
  ];
  const panels: THREE.Group[] = [];
  const bars: THREE.LineSegments[] = [];
  specs.forEach(([x, y, z, ry], i) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry;
    b.group.add(g);
    b.line(new THREE.EdgesGeometry(new THREE.PlaneGeometry(2.6, 1.6)), 'a', 0.6, g);
    if (i === 0) {
      for (let k = 0; k < 5; k++) {
        const bar = b.edges(new THREE.BoxGeometry(0.22, 1, 0.04), 'b', 0.75, g);
        bar.position.set(0.9 - k * 0.45, -0.5, 0.05);
        bars.push(bar);
      }
    }
    if (i === 1 || i === 3) {
      const seg: number[] = [];
      for (let k = 0; k < 4; k++) {
        const yy = 0.5 - k * 0.32;
        const len = k % 2 ? 1.2 : 1.8;
        seg.push(1.05, yy, 0.02, 1.05 - len, yy, 0.02);
      }
      b.line(geoFrom(seg), 'b', 0.5, g);
    }
    panels.push(g);
  });
  return {
    group: b.group,
    slots: b.slots,
    anim: (t) => {
      panels.forEach((g, i) => {
        g.rotation.y = specs[i][3] + Math.sin(t * 0.4 + i) * 0.12;
        g.position.y = specs[i][1] + Math.sin(t * 0.5 + i * 1.7) * 0.06;
      });
      bars.forEach((bar, k) => {
        const s = 0.3 + 0.55 * Math.abs(Math.sin(t * 1.3 + k * 0.8));
        bar.scale.y = s;
        bar.position.y = -0.62 + s / 2;
      });
    },
  };
}

// shield — security: a shield outline with a padlock, circled by an orbit of protection layers.
function buildShield(ctx: BuildCtx): Built {
  const b = makeBuilder(ctx);
  const shield = new THREE.Group();
  b.group.add(shield);
  const outline: THREE.Vector2[] = [];
  const top = [new THREE.Vector2(-1.25, 1.35), new THREE.Vector2(-0.6, 1.5), new THREE.Vector2(0, 1.62), new THREE.Vector2(0.6, 1.5), new THREE.Vector2(1.25, 1.35)];
  outline.push(...top);
  const right = new THREE.QuadraticBezierCurve(new THREE.Vector2(1.25, 1.35), new THREE.Vector2(1.3, -0.6), new THREE.Vector2(0, -1.7));
  const left = new THREE.QuadraticBezierCurve(new THREE.Vector2(0, -1.7), new THREE.Vector2(-1.3, -0.6), new THREE.Vector2(-1.25, 1.35));
  outline.push(...right.getPoints(18).slice(1), ...left.getPoints(18).slice(1, -1));
  b.line(geoFrom(loopSegments(outline)), 'a', 0.8, shield);
  b.line(geoFrom(loopSegments(outline.map((p) => p.clone().multiplyScalar(0.8)), -0.05)), 'a', 0.35, shield);
  const body = b.edges(new THREE.BoxGeometry(0.8, 0.62, 0.22), 'b', 0.9, shield);
  body.position.y = -0.2;
  const shackle = b.solid(new THREE.TorusGeometry(0.27, 0.035, 6, 24, Math.PI), 'b', 0.9, false, shield);
  shackle.position.y = 0.11;
  const orbit = new THREE.Group();
  orbit.rotation.x = 1.15;
  b.group.add(orbit);
  b.solid(new THREE.TorusGeometry(2.45, 0.008, 6, 120), 'b', 0.22, false, orbit);
  const cells: THREE.LineSegments[] = [];
  const n = ctx.mobile ? 6 : 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const c = b.edges(new THREE.OctahedronGeometry(0.2), 'a', 0.6, orbit);
    c.position.set(Math.cos(a) * 2.45, Math.sin(a) * 2.45, 0);
    cells.push(c);
  }
  return {
    group: b.group,
    slots: b.slots,
    anim: (t) => {
      shield.rotation.y = Math.sin(t * 0.5) * 0.35;
      shackle.position.y = 0.11 + Math.abs(Math.sin(t * 0.9)) * 0.05;
      orbit.rotation.z = t * 0.18;
      cells.forEach((c, i) => {
        c.rotation.x = t * 0.7 + i;
        c.rotation.y = t * 0.5;
      });
    },
  };
}

// clock — savings calculator: a clock face whose hands sweep the hours the team gets back.
function buildClock(ctx: BuildCtx): Built {
  const b = makeBuilder(ctx);
  const face = new THREE.Group();
  face.rotation.set(-0.18, 0.35, 0);
  b.group.add(face);
  b.solid(new THREE.TorusGeometry(2, 0.016, 6, 140), 'a', 0.65, false, face);
  const ticks: number[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r0 = i % 3 === 0 ? 1.55 : 1.72;
    ticks.push(Math.sin(a) * r0, Math.cos(a) * r0, 0, Math.sin(a) * 1.9, Math.cos(a) * 1.9, 0);
  }
  b.line(geoFrom(ticks), 'a', 0.75, face);
  const dots = new Float32Array(60 * 3);
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    dots[i * 3] = Math.sin(a) * 2.28;
    dots[i * 3 + 1] = Math.cos(a) * 2.28;
  }
  b.points(dots, 'a', 0.45, 0.07, face);
  const hour = b.line(geoFrom([0, 0, 0.02, 0, 1.0, 0.02]), 'b', 0.95, face);
  const minute = b.line(geoFrom([0, 0, 0.04, 0, 1.5, 0.04]), 'b', 0.95, face);
  b.solid(new THREE.SphereGeometry(0.09, 12, 10), 'b', 1, false, face);
  return {
    group: b.group,
    slots: b.slots,
    anim: (t) => {
      // Rotating towards negative z turns the hands clockwise. STATIC_T gives a calm 10:10 pose.
      minute.rotation.z = -t * 0.55 + 2.5;
      hour.rotation.z = -t * 0.046 + 2.0;
      face.rotation.y = 0.35 + Math.sin(t * 0.3) * 0.1;
    },
  };
}

// timeline — roadmap: a rail of milestones; what is active today is solid, requirements are wireframe and the
// next releases (not announced yet) are faint, hollow rings on a dashed segment.
function buildTimeline(ctx: BuildCtx): Built {
  const b = makeBuilder(ctx);
  const rail = new THREE.Group();
  rail.rotation.set(0.15, 0.45, 0);
  b.group.add(rail);
  const xs = [4.8, 3.6, 2.4, 1.2, 0, -1.2, -2.4, -3.6, -4.8];
  b.line(geoFrom([4.8, 0, 0, -1.2, 0, 0]), 'b', 0.6, rail);
  const dashed = new THREE.LineSegments(geoFrom([-1.2, 0, 0, -4.8, 0, 0]), b.add(new THREE.LineDashedMaterial({ dashSize: 0.18, gapSize: 0.14 }), 'a', 0.45));
  dashed.computeLineDistances();
  rail.add(dashed);
  const active: THREE.Mesh[] = [];
  xs.forEach((x, i) => {
    if (i < 4) {
      const m = b.solid(new THREE.SphereGeometry(0.16, 14, 12), 'b', 0.95, false, rail);
      m.position.x = x;
      active.push(m);
    } else if (i < 7) {
      b.solid(new THREE.SphereGeometry(0.16, 10, 8), 'a', 0.6, true, rail).position.x = x;
    } else {
      const r = b.solid(new THREE.TorusGeometry(0.18, 0.012, 6, 32), 'a', 0.35, false, rail);
      r.position.x = x;
    }
  });
  const marker = b.solid(new THREE.TorusGeometry(0.3, 0.015, 6, 40), 'b', 0.8, false, rail);
  return {
    group: b.group,
    slots: b.slots,
    anim: (t) => {
      const u = (t * 0.12) % 1;
      marker.position.x = 4.8 - u * 3.6;
      marker.rotation.y = t * 1.2;
      active.forEach((m, i) => m.scale.setScalar(1 + 0.35 * Math.max(0, 1 - Math.abs(marker.position.x - xs[i]) / 0.8)));
      rail.rotation.y = 0.45 + Math.sin(t * 0.25) * 0.08;
    },
  };
}

// tiers — pricing: stacked rings, one per licence tier, each with a travelling node.
function buildTiers(ctx: BuildCtx): Built {
  const b = makeBuilder(ctx);
  const specs: [number, number][] = [
    [-1.1, 1.4],
    [0, 2.1],
    [1.1, 2.8],
  ];
  const rings = specs.map(([y, r], i) => {
    const g = new THREE.Group();
    g.position.y = y;
    b.group.add(g);
    const m = b.solid(new THREE.TorusGeometry(r, 0.014, 6, 140), i === 1 ? 'b' : 'a', 0.6, false, g);
    m.rotation.x = Math.PI / 2;
    const node = b.solid(new THREE.SphereGeometry(0.1, 12, 10), 'b', 0.95, false, g);
    return { g, node, r };
  });
  b.line(geoFrom([0, -1.1, 0, 0, 1.1, 0]), 'b', 0.3);
  return {
    group: b.group,
    slots: b.slots,
    anim: (t) => {
      b.group.rotation.y = t * 0.08;
      rings.forEach(({ g, node, r }, i) => {
        g.position.y = specs[i][0] + Math.sin(t * 0.6 + i) * 0.08;
        const a = t * (0.4 + i * 0.12) + i * 2;
        node.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      });
    },
  };
}

// qa — FAQ: rows of question nodes and answer outlines; one row opens at a time, like the accordion.
function buildQa(ctx: BuildCtx): Built {
  const b = makeBuilder(ctx);
  const rows = ctx.mobile ? 4 : 5;
  const items: { q: THREE.LineSegments; a: THREE.LineSegments; open: number }[] = [];
  const answerGeo = geoFrom(loopSegments(bubblePoints(1, 0.5, 0.18, 'none')));
  const answerMat = b.add(new THREE.LineBasicMaterial(), 'b', 0.7);
  for (let i = 0; i < rows; i++) {
    const y = 1.6 - i * (3.2 / (rows - 1));
    const q = b.edges(new THREE.OctahedronGeometry(0.24), 'a', 0.85);
    q.position.set(2.5, y, 0);
    const a = new THREE.LineSegments(answerGeo, answerMat);
    a.position.set(1.9, y, 0);
    b.group.add(a);
    items.push({ q, a, open: 0 });
  }
  b.line(geoFrom([2.5, 1.9, 0, 2.5, -1.9, 0]), 'a', 0.25);
  return {
    group: b.group,
    slots: b.slots,
    anim: (t, dt) => {
      const current = Math.floor(t / 2.4) % rows;
      const k = dt > 0 ? 1 - Math.exp(-dt * 5) : 1;
      items.forEach((it, i) => {
        it.open += ((i === current ? 1 : 0) - it.open) * k;
        const w = 0.9 + it.open * 3.6;
        it.a.scale.set(w, 1 + it.open * 0.25, 1);
        it.a.position.x = 2.1 - w / 2;
        it.q.rotation.y = t * 0.6 + i + it.open * 1.5;
      });
      b.group.rotation.y = -0.2 + Math.sin(t * 0.25) * 0.1;
    },
  };
}

const PRESETS: Record<string, Preset> = {
  hub: { pal: { dark: [0x22d3ee, 0xa78bfa], light: [0x0e7490, 0x6d28d9] }, build: buildHub },
  keeper: { pal: { dark: [0x67e8f9, 0x22d3ee], light: [0x155e75, 0x0e7490] }, build: buildKeeper },
  pipeline: { pal: { dark: [0x38bdf8, 0x22d3ee], light: [0x0369a1, 0x0e7490] }, build: buildPipeline },
  bubbles: { pal: { dark: [0xa78bfa, 0x22d3ee], light: [0x6d28d9, 0x0e7490] }, build: buildBubbles },
  path: { pal: { dark: [0x22d3ee, 0xe0f2fe], light: [0x0e7490, 0x1e3a8a] }, build: buildPath },
  towers: { pal: { dark: [0x22d3ee, 0x64748b], light: [0x0e7490, 0x475569] }, build: buildTowers },
  split: { pal: { dark: [0xf87171, 0x22d3ee], light: [0xb91c1c, 0x0e7490] }, build: buildSplit },
  panels: { pal: { dark: [0x22d3ee, 0x818cf8], light: [0x0e7490, 0x4338ca] }, build: buildPanels },
  shield: { pal: { dark: [0x34d399, 0x22d3ee], light: [0x047857, 0x0e7490] }, build: buildShield },
  clock: { pal: { dark: [0xfbbf24, 0x22d3ee], light: [0xb45309, 0x0e7490] }, build: buildClock },
  timeline: { pal: { dark: [0x94a3b8, 0x22d3ee], light: [0x475569, 0x0e7490] }, build: buildTimeline },
  tiers: { pal: { dark: [0x818cf8, 0x22d3ee], light: [0x4338ca, 0x0e7490] }, build: buildTiers },
  qa: { pal: { dark: [0xa78bfa, 0x22d3ee], light: [0x6d28d9, 0x0e7490] }, build: buildQa },
};

export const SCENE_KEYS = Object.keys(PRESETS);

const BG: Record<Theme, number> = { dark: 0x0b1120, light: 0xf4f7fb };
const GRID: Record<Theme, number> = { dark: 0x155e75, light: 0x94a3b8 };
const GRID_OPACITY: Record<Theme, number> = { dark: 0.26, light: 0.24 };

type Entry = { id: string; preset: Preset; built: Built; weight: number };

export function SiteScene() {
  useEffect(() => {
    if (!supportsWebGL()) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobile = window.innerWidth < 720;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'low-power' });
    } catch {
      return; // WebGL refused at creation time: keep the plain page background.
    }
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    const canvas = renderer.domElement;
    canvas.className = 'site-scene';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);

    let theme = currentTheme();
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(BG[theme], 0.045);
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0.6, 7);

    // Shared perspective floor
    const gridMat = new THREE.LineBasicMaterial({ color: GRID[theme], transparent: true, opacity: GRID_OPACITY[theme] });
    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridSegments(60, 30), 3));
    const grid = new THREE.LineSegments(gridGeo, gridMat);
    grid.position.y = -3.4;
    scene.add(grid);

    // Narrow (portrait) screens get a smaller stage so the wide topics stay in frame.
    const stage = new THREE.Group();
    scene.add(stage);
    const fitStage = () => stage.scale.setScalar(Math.min(1, Math.max(0.62, (window.innerWidth / window.innerHeight) * 1.15)));
    fitStage();

    const dot = makeDotTexture();
    // One group per topic. Only the active one (plus the one fading out) is visible.
    const entries: Entry[] = Object.entries(PRESETS).map(([id, preset]) => {
      const built = preset.build({ mobile, dot, col: (k) => preset.pal[theme][k === 'a' ? 0 : 1] });
      built.group.position.set(0, 0.2, -7);
      built.group.visible = false;
      stage.add(built.group);
      return { id, preset, built, weight: 0 };
    });

    let activeId = 'hub';
    const computeActive = () => {
      const probe = window.innerHeight * 0.45;
      let found: string | null = null;
      document.querySelectorAll<HTMLElement>('[data-scene]').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top <= probe && r.bottom > probe && el.dataset.scene && PRESETS[el.dataset.scene]) found = el.dataset.scene;
      });
      if (found) activeId = found;
      document.documentElement.dataset.activeScene = activeId;
    };

    let progress = 0;
    let px = 0;
    let py = 0;

    const applyFrame = (t: number, dt: number, animate: boolean) => {
      const p = reduceMotion ? 0 : progress;
      camera.position.z = 7 - p * 5;
      const ease = reduceMotion ? 1 : 1 - Math.exp(-dt * 2.4);
      camera.position.x += ((reduceMotion ? 0 : px * 0.6) - camera.position.x) * ease;
      camera.position.y += ((reduceMotion ? 0.6 : 0.6 - py * 0.3) - camera.position.y) * ease;
      camera.lookAt(0, 0, -5);

      const fade = 1 - Math.exp(-dt * 4.2); // ≈0.07 per frame at 60 fps, frame-rate independent
      for (const e of entries) {
        const target = e.id === activeId ? 1 : 0;
        // Smooth cross-fade; under reduced motion the switch is immediate.
        e.weight = reduceMotion ? target : e.weight + (target - e.weight) * fade;
        if (Math.abs(e.weight - target) < 0.002) e.weight = target;
        e.built.group.visible = e.weight > 0.003;
        for (const s of e.built.slots) s.mat.opacity = s.base * e.weight;
        if (animate && e.built.group.visible) e.built.anim(t, dt);
      }
      renderer.render(scene, camera);
    };

    // Reduced motion: one static frame with a calm pose, re-rendered only when something changes.
    const renderStatic = () => applyFrame(STATIC_T, 0, true);

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      const before = activeId;
      computeActive();
      if (reduceMotion && activeId !== before) renderStatic();
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      px = (e.clientX / window.innerWidth) * 2 - 1;
      py = (e.clientY / window.innerHeight) * 2 - 1;
    };

    let raf = 0;
    let lost = false;
    const clock = new THREE.Clock();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.1);
      if (document.hidden || lost) return;
      applyFrame(clock.elapsedTime, dt, true);
    };

    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      fitStage();
      onScroll();
      if (reduceMotion) renderStatic();
    };

    const onLost = (e: Event) => {
      e.preventDefault();
      lost = true;
    };
    const onRestored = () => {
      lost = false;
      if (reduceMotion) renderStatic();
    };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    const mo = new MutationObserver(() => {
      theme = currentTheme();
      scene.fog = new THREE.FogExp2(BG[theme], 0.045);
      gridMat.color.setHex(GRID[theme]);
      gridMat.opacity = GRID_OPACITY[theme];
      for (const e of entries) {
        for (const s of e.built.slots) s.mat.color.setHex(e.preset.pal[theme][s.key === 'a' ? 0 : 1]);
      }
      if (reduceMotion) renderStatic();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    computeActive();
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    if (reduceMotion) {
      entries.forEach((e) => (e.weight = e.id === activeId ? 1 : 0));
      renderStatic();
    } else {
      window.addEventListener('pointermove', onPointer, { passive: true });
      loop();
    }

    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      scene.traverse((obj) => {
        const holder = obj as unknown as { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] };
        holder.geometry?.dispose();
        const mats = Array.isArray(holder.material) ? holder.material : holder.material ? [holder.material] : [];
        mats.forEach((m) => m.dispose());
      });
      dot.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      delete document.documentElement.dataset.activeScene;
    };
  }, []);

  return null;
}
