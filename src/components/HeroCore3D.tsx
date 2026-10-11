import { ReactNode, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { HERO_NODES } from '../data/content';
import { currentTheme, prefersReducedMotion, scrollToTarget, supportsWebGL, type Theme } from '../lib/env';

// 3D answering core for the hero (adapted from the Avand landing's Vascular3D).
// The core is an extruded chat bubble taken from the Pasokhban brand mark. Site knowledge and WooCommerce data
// flow into it; human handoff and notifications flow out of it. Explicit disposal, Points for particles, capped
// pixel ratio, pointer and touch input, pause when off-screen, and one static frame under
// prefers-reduced-motion. Without WebGL only the static logo passed in `fallback` is shown (no 2D diagram).

type NodeId = (typeof HERO_NODES)[number]['id'];

type Palette = {
  bubble: number;
  bubbleEmissive: number;
  edge: number;
  wire: number;
  ring: number;
  tube: number;
  particle: number;
  stars: number;
  nodes: Record<NodeId, number>;
};

const PALETTES: Record<Theme, Palette> = {
  dark: {
    bubble: 0xffffff,
    bubbleEmissive: 0x0e3a46,
    edge: 0x67e8f9,
    wire: 0x22d3ee,
    ring: 0x22d3ee,
    tube: 0x22d3ee,
    particle: 0xa5f3fc,
    stars: 0x94a3b8,
    nodes: { knowledge: 0x22d3ee, human: 0xfbbf24, woo: 0xa78bfa, notify: 0x34d399 },
  },
  light: {
    bubble: 0xffffff,
    bubbleEmissive: 0x0b3440,
    edge: 0x0e7490,
    wire: 0x0e7490,
    ring: 0x0891b2,
    tube: 0x0e7490,
    particle: 0x0e7490,
    stars: 0x64748b,
    nodes: { knowledge: 0x0e7490, human: 0xb45309, woo: 0x6d28d9, notify: 0x047857 },
  },
};

// Node positions in scene units (the core sits at the origin). RTL reading order: the first node is top-right.
// `inward` marks data flowing into the core (knowledge, store data); the others flow out (human, notifications).
const LAYOUT: Record<NodeId, { pos: [number, number, number]; inward: boolean }> = {
  knowledge: { pos: [2.35, 1.15, 0.4], inward: true },
  human: { pos: [-2.35, 1.05, -0.3], inward: false },
  woo: { pos: [2.15, -1.25, -0.5], inward: true },
  notify: { pos: [-2.2, -1.2, 0.6], inward: false },
};

const NODES = HERO_NODES.map((n) => ({ ...n, ...LAYOUT[n.id] }));
const PARTICLES_PER_CURVE = 14;

function makeGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  if (g) {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(c);
}

// Rounded chat bubble with a tail at the lower left, like the brand mark.
function bubbleShape(): THREE.Shape {
  const w = 1.5;
  const h = 1.2;
  const r = 0.32;
  const hw = w / 2;
  const hh = h / 2;
  const s = new THREE.Shape();
  s.moveTo(-hw + r, hh);
  s.lineTo(hw - r, hh);
  s.quadraticCurveTo(hw, hh, hw, hh - r);
  s.lineTo(hw, -hh + r);
  s.quadraticCurveTo(hw, -hh, hw - r, -hh);
  s.lineTo(-0.05, -hh);
  s.lineTo(-0.42, -hh - 0.34);
  s.lineTo(-0.38, -hh);
  s.lineTo(-hw + r, -hh);
  s.quadraticCurveTo(-hw, -hh, -hw, -hh + r);
  s.lineTo(-hw, hh - r);
  s.quadraticCurveTo(-hw, hh, -hw + r, hh);
  return s;
}

type Props = { fallback: ReactNode };

export function HeroCore3D({ fallback }: Props) {
  const [mode, setMode] = useState<'init' | '3d' | 'fallback'>('init');
  const hostRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    setMode(supportsWebGL() ? '3d' : 'fallback');
  }, []);

  useEffect(() => {
    if (mode !== '3d') return;
    const host = hostRef.current;
    if (!host) return;

    const reduceMotion = prefersReducedMotion();
    let width = host.clientWidth || 480;
    let height = host.clientHeight || 480;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      setMode('fallback');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(width, height, false);
    renderer.domElement.className = 'core3d__canvas';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.insertBefore(renderer.domElement, host.firstChild);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 50);
    camera.position.set(0, 0, 8.6);
    const root = new THREE.Group();
    scene.add(root);

    let pal = PALETTES[currentTheme()];

    // Lights
    // three.js r155+ uses physical light units: a strong ambient plus key and rim lights keep the bubble white.
    scene.add(new THREE.AmbientLight(0xffffff, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(2, 3, 5);
    scene.add(key);
    const rim = new THREE.PointLight(0xa78bfa, 14, 0, 2);
    rim.position.set(-4, -2, 3);
    scene.add(rim);

    // Core: extruded chat bubble with the brand's eyes and smile, inside a ring and a slow wireframe shell.
    const core = new THREE.Group();
    root.add(core);
    const bubbleGeo = new THREE.ExtrudeGeometry(bubbleShape(), {
      depth: 0.32,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.07,
      bevelSegments: 3,
      curveSegments: 10,
    });
    bubbleGeo.center();
    const bubbleMat = new THREE.MeshStandardMaterial({
      color: pal.bubble,
      emissive: pal.bubbleEmissive,
      emissiveIntensity: 0.5,
      roughness: 0.45,
      metalness: 0.05,
    });
    const bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
    core.add(bubble);
    const edgeMat = new THREE.LineBasicMaterial({ color: pal.edge, transparent: true, opacity: 0.55 });
    const bubbleEdges = new THREE.LineSegments(new THREE.EdgesGeometry(bubbleGeo, 35), edgeMat);
    bubble.add(bubbleEdges);
    const faceMat = new THREE.MeshBasicMaterial({ color: pal.ring });
    const front = 0.16 + 0.08 + 0.01;
    [-0.24, 0.24].forEach((x) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), faceMat);
      eye.position.set(x, 0.12, front);
      bubble.add(eye);
    });
    const smileCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.22, -0.14, front),
      new THREE.Vector3(0, -0.32, front + 0.02),
      new THREE.Vector3(0.22, -0.14, front),
    );
    const smile = new THREE.Mesh(new THREE.TubeGeometry(smileCurve, 24, 0.03, 8, false), faceMat);
    bubble.add(smile);

    const ringMat = new THREE.MeshBasicMaterial({ color: pal.ring, transparent: true, opacity: 0.85 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.014, 8, 96), ringMat);
    root.add(ring);
    const wireMat = new THREE.MeshBasicMaterial({ color: pal.wire, wireframe: true, transparent: true, opacity: 0.18 });
    const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(1.7, 1), wireMat);
    root.add(wire);

    // Terminal nodes with glow halos
    const glowTex = makeGlowTexture();
    const haloMats: THREE.SpriteMaterial[] = [];
    const nodeMats: THREE.MeshStandardMaterial[] = [];
    const coreHaloMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: pal.ring,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const coreHalo = new THREE.Sprite(coreHaloMat);
    coreHalo.scale.set(3.4, 3.4, 1);
    coreHalo.position.z = -0.4;
    root.add(coreHalo);

    const nodes: THREE.Mesh[] = NODES.map((n) => {
      const color = pal.nodes[n.id];
      const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.2 });
      nodeMats.push(mat);
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 24), mat);
      mesh.position.set(...n.pos);
      const haloMat = new THREE.SpriteMaterial({
        map: glowTex,
        color,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      haloMats.push(haloMat);
      const halo = new THREE.Sprite(haloMat);
      halo.scale.set(0.9, 0.9, 1);
      mesh.add(halo);
      root.add(mesh);
      return mesh;
    });

    // Channels from each node to the core, with message particles flowing in or out.
    const curves = NODES.map((n, i) => {
      const end = new THREE.Vector3(...n.pos);
      const start = end.clone().normalize().multiplyScalar(0.95);
      const mid = end
        .clone()
        .multiplyScalar(0.55)
        .add(new THREE.Vector3(Math.sin(i * 2.1) * 0.45, Math.cos(i * 1.7) * 0.45, Math.sin(i * 0.9) * 0.4));
      return new THREE.CatmullRomCurve3([start, mid, end]);
    });
    const tubeMats: THREE.MeshBasicMaterial[] = [];
    curves.forEach((c) => {
      const mat = new THREE.MeshBasicMaterial({ color: pal.tube, transparent: true, opacity: 0.32 });
      tubeMats.push(mat);
      root.add(new THREE.Mesh(new THREE.TubeGeometry(c, 80, 0.022, 8, false), mat));
    });

    const particleCount = curves.length * PARTICLES_PER_CURVE;
    const particlePositions = new Float32Array(particleCount * 3);
    const phases = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) phases[i] = (i % PARTICLES_PER_CURVE) / PARTICLES_PER_CURVE;
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: pal.particle,
      size: 0.085,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    root.add(new THREE.Points(particleGeo, particleMat));

    const placeParticles = (t: number) => {
      for (let i = 0; i < particleCount; i++) {
        const ci = Math.floor(i / PARTICLES_PER_CURVE);
        const u = (phases[i] + t * (0.12 + (ci % 2) * 0.05)) % 1;
        const p = curves[ci].getPointAt(NODES[ci].inward ? 1 - u : u);
        particlePositions[i * 3] = p.x;
        particlePositions[i * 3 + 1] = p.y;
        particlePositions[i * 3 + 2] = p.z;
      }
      particleGeo.attributes.position.needsUpdate = true;
    };

    // Background starfield (one draw call)
    const starCount = 240;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) starPositions[i] = (Math.random() - 0.5) * 16;
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: pal.stars, size: 0.03, transparent: true, opacity: 0.5, depthWrite: false });
    scene.add(new THREE.Points(starGeo, starMat));

    // Picking (mouse and touch via pointer events)
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pointer = { x: 0, y: 0 };
    let hovered: THREE.Object3D | null = null;

    const setNdc = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
      pointer.x = ndc.x;
      pointer.y = ndc.y;
    };
    const pick = (): number => {
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(nodes, false)[0];
      return hit ? nodes.indexOf(hit.object as THREE.Mesh) : -1;
    };

    // Labels follow the projected node positions and stay inside the frame.
    const v = new THREE.Vector3();
    const targets: THREE.Object3D[] = [...nodes, core];
    const placeLabels = () => {
      targets.forEach((obj, i) => {
        const el = labelRefs.current[i];
        if (!el) return;
        v.setFromMatrixPosition(obj.matrixWorld).project(camera);
        const hw = el.offsetWidth / 2 + 6;
        const hh = el.offsetHeight / 2 + 6;
        const x = Math.min(width - hw, Math.max(hw, (v.x * 0.5 + 0.5) * width));
        const y = Math.min(height - hh, Math.max(hh, (-v.y * 0.5 + 0.5) * height));
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
        el.style.opacity = v.z < 1 ? '1' : '0';
      });
    };
    const renderOnce = () => {
      renderer.render(scene, camera);
      placeLabels();
    };

    const onMove = (e: PointerEvent) => {
      setNdc(e);
      const idx = pick();
      hovered = idx >= 0 ? nodes[idx] : null;
      host.style.cursor = hovered ? 'pointer' : '';
      if (reduceMotion) renderOnce();
    };
    const onLeave = () => {
      pointer.x = 0;
      pointer.y = 0;
      hovered = null;
      host.style.cursor = '';
      if (reduceMotion) renderOnce();
    };
    const onDown = (e: PointerEvent) => {
      setNdc(e);
      const idx = pick();
      if (idx >= 0) scrollToTarget(NODES[idx].target);
    };
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerleave', onLeave);
    host.addEventListener('pointerdown', onDown);

    // Animation loop (never started under reduced motion)
    const clock = new THREE.Clock();
    let raf = 0;
    let visible = true;
    const scaleTarget = new THREE.Vector3();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible || document.hidden) return;
      const t = clock.getElapsedTime();

      camera.position.x += (pointer.x * 0.6 - camera.position.x) * 0.05;
      camera.position.y += (-pointer.y * 0.4 - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);

      root.rotation.y = Math.sin(t * 0.25) * 0.35;
      bubble.rotation.y = Math.sin(t * 0.6) * 0.45;
      core.position.y = Math.sin(t * 1.1) * 0.06;
      ring.rotation.x = Math.sin(t * 0.4) * 0.25;
      ring.rotation.y = t * 0.2;
      wire.rotation.x = t * 0.12;
      wire.rotation.y = -t * 0.18;

      nodes.forEach((m) => {
        const s = m === hovered ? 1.5 : 1;
        scaleTarget.set(s, s, s);
        m.scale.lerp(scaleTarget, 0.15);
      });
      placeParticles(t);
      renderOnce();
    };

    if (reduceMotion) {
      root.rotation.y = -0.2;
      bubble.rotation.y = 0.25;
      placeParticles(0.3);
      renderOnce();
    } else {
      tick();
    }

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(host);

    const ro = new ResizeObserver(() => {
      width = host.clientWidth || width;
      height = host.clientHeight || height;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (reduceMotion) renderOnce();
    });
    ro.observe(host);

    const mo = new MutationObserver(() => {
      pal = PALETTES[currentTheme()];
      bubbleMat.color.setHex(pal.bubble);
      bubbleMat.emissive.setHex(pal.bubbleEmissive);
      edgeMat.color.setHex(pal.edge);
      faceMat.color.setHex(pal.ring);
      ringMat.color.setHex(pal.ring);
      wireMat.color.setHex(pal.wire);
      coreHaloMat.color.setHex(pal.ring);
      tubeMats.forEach((m) => m.color.setHex(pal.tube));
      particleMat.color.setHex(pal.particle);
      particleMat.blending = currentTheme() === 'light' ? THREE.NormalBlending : THREE.AdditiveBlending;
      NODES.forEach((n, i) => {
        nodeMats[i].color.setHex(pal.nodes[n.id]);
        nodeMats[i].emissive.setHex(pal.nodes[n.id]);
        haloMats[i].color.setHex(pal.nodes[n.id]);
      });
      starMat.color.setHex(pal.stars);
      if (reduceMotion) renderOnce();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (currentTheme() === 'light') particleMat.blending = THREE.NormalBlending;

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      mo.disconnect();
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      host.removeEventListener('pointerdown', onDown);
      scene.traverse((obj) => {
        const holder = obj as unknown as { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] };
        holder.geometry?.dispose();
        const mats = Array.isArray(holder.material) ? holder.material : holder.material ? [holder.material] : [];
        mats.forEach((m) => m.dispose());
      });
      glowTex.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      host.style.cursor = '';
    };
  }, [mode]);

  if (mode === 'fallback') return <>{fallback}</>;

  return (
    <figure className="core3d" aria-labelledby="core3d-caption">
      <div className="core3d__stage" ref={hostRef}>
        {NODES.map((n, i) => (
          <button
            key={n.id}
            type="button"
            className={`core3d__label core3d__label--${n.id}`}
            ref={(el) => {
              labelRefs.current[i] = el;
            }}
            onClick={() => scrollToTarget(n.target)}
          >
            <span className="core3d__label-title">{n.label}</span> <small>{n.kind}</small>
            <span className="sr-only">: رفتن به بخش مربوط</span>
          </button>
        ))}
        <div
          className="core3d__label core3d__label--core"
          ref={(el) => {
            labelRefs.current[NODES.length] = el;
          }}
          aria-hidden="true"
        >
          پاسخ‌بان
        </div>
      </div>
      <figcaption id="core3d-caption" className="core3d__caption">
        هسته‌ی سه‌بعدی پاسخ‌بان: دانش سایت و داده‌ی فروشگاه به آن می‌رسند و اعلان‌ها و واگذاری به اپراتور از آن بیرون
        می‌روند. روی هر برچسب بزنید تا به بخش مربوط بروید.
      </figcaption>
    </figure>
  );
}
