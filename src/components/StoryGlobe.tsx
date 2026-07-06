"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useLanguage } from "@/context/LanguageContext";
import { storyContent, GLOBE_LOCATIONS, GLOBE_ARCS } from "@/data/story";

const GLOBE_R = 1;
const ARC_PTS = 60;
const ARC_DELAY = 1.5;
const ARC_DUR = 2.0;

function latLngToVec3(lat: number, lng: number, r = GLOBE_R): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

type Tooltip = { x: number; y: number; label: string; tip: string } | null;

export default function StoryGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const { lang } = useLanguage();
  const langRef = useRef(lang);

  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;

    // ── renderer ─────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0a0a0a);

    const resize = () => {
      const w = canvas.parentElement!.clientWidth;
      const h = canvas.parentElement!.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    // ── camera ───────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 2.5;

    // ── scene ────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(2, 2, 3);
    scene.add(dirLight);

    // ── globe group ──────────────────────────────────────
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Base sphere
    globeGroup.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(GLOBE_R, 64, 32),
        new THREE.MeshStandardMaterial({ color: 0x0d1a2e, roughness: 0.85, metalness: 0.1 }),
      ),
    );

    // Atmosphere shell
    globeGroup.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(GLOBE_R * 1.04, 32, 32),
        new THREE.MeshBasicMaterial({
          color: 0x1a3a6a,
          transparent: true,
          opacity: 0.07,
          side: THREE.BackSide,
        }),
      ),
    );

    // Grid lines
    const gridMat = new THREE.LineBasicMaterial({
      color: 0x163050,
      transparent: true,
      opacity: 0.65,
    });
    for (let lat = -60; lat <= 60; lat += 30) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 64; i++) pts.push(latLngToVec3(lat, (i / 64) * 360 - 180));
      globeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }
    for (let lng = -180; lng < 180; lng += 30) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 64; i++) pts.push(latLngToVec3((i / 64) * 180 - 90, lng));
      globeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }

    // ── location markers ─────────────────────────────────
    const markerMeshes: THREE.Mesh[] = [];
    const glowMeshes: THREE.Mesh[] = [];
    const coreGeo = new THREE.SphereGeometry(0.022, 8, 8);
    const glowGeo = new THREE.SphereGeometry(0.04, 8, 8);

    GLOBE_LOCATIONS.forEach((loc) => {
      const pos = latLngToVec3(loc.lat, loc.lng, GLOBE_R * 1.012);

      const core = new THREE.Mesh(
        coreGeo,
        new THREE.MeshBasicMaterial({ color: 0x6c63ff }),
      );
      core.position.copy(pos);
      globeGroup.add(core);
      markerMeshes.push(core);

      const glow = new THREE.Mesh(
        glowGeo,
        new THREE.MeshBasicMaterial({ color: 0x6c63ff, transparent: true, opacity: 0.35 }),
      );
      glow.position.copy(pos);
      globeGroup.add(glow);
      glowMeshes.push(glow);
    });

    // ── animated arcs ────────────────────────────────────
    const arcData = GLOBE_ARCS.map(([from, to]) => {
      const start = latLngToVec3(GLOBE_LOCATIONS[from].lat, GLOBE_LOCATIONS[from].lng);
      const end = latLngToVec3(GLOBE_LOCATIONS[to].lat, GLOBE_LOCATIONS[to].lng);
      const ctrl = start.clone().add(end).normalize().multiplyScalar(1.5);
      const curve = new THREE.QuadraticBezierCurve3(start, ctrl, end);
      const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(ARC_PTS));
      geo.setDrawRange(0, 0);
      const mat = new THREE.LineBasicMaterial({ color: 0x6c63ff, transparent: true, opacity: 0.8 });
      globeGroup.add(new THREE.Line(geo, mat));
      return { geo, total: ARC_PTS + 1 };
    });

    // ── raycaster for hover tooltips ──────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -(((e.clientY - rect.top) / rect.height) * 2 - 1),
      );
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(markerMeshes);
      if (hits.length > 0) {
        const idx = markerMeshes.indexOf(hits[0].object as THREE.Mesh);
        const locs = storyContent[langRef.current].locations;
        const wpos = new THREE.Vector3();
        markerMeshes[idx].getWorldPosition(wpos);
        wpos.project(camera);
        const sx = ((wpos.x + 1) / 2) * rect.width;
        const sy = ((-wpos.y + 1) / 2) * rect.height;
        setTooltip({ x: sx, y: sy, label: locs[idx].label, tip: locs[idx].tooltip });
        canvas.style.cursor = "pointer";
      } else {
        setTooltip(null);
        canvas.style.cursor = "";
      }
    };

    const onMouseLeave = () => {
      setTooltip(null);
      canvas.style.cursor = "";
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("resize", resize);
    resize();

    // ── animation loop ────────────────────────────────────
    const startTime = performance.now();
    let rafId = 0;
    const PING_CYCLE = 2.5;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = (performance.now() - startTime) / 1000;

      globeGroup.rotation.y = t * 0.08;

      // Ping-pulse glow rings
      glowMeshes.forEach((g, i) => {
        const phase =
          (((t - i * 0.6) % PING_CYCLE) + PING_CYCLE) % PING_CYCLE / PING_CYCLE;
        g.scale.setScalar(1 + phase * 3.0);
        (g.material as THREE.MeshBasicMaterial).opacity = 0.4 * Math.pow(1 - phase, 1.5);
      });

      // Draw arcs in sequence
      arcData.forEach((arc, i) => {
        const arcStart = ARC_DELAY + i * ARC_DUR;
        if (t >= arcStart) {
          const p = Math.min(1, (t - arcStart) / ARC_DUR);
          arc.geo.setDrawRange(0, Math.ceil(p * arc.total));
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else (obj.material as THREE.Material).dispose();
        }
      });
    };
  }, []); // mounts once; lang reads via langRef

  return (
    <div className="relative w-full" style={{ height: "clamp(280px, 60vmin, 520px)" }}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 max-w-[200px] rounded-xl border border-white/10 bg-card/90 px-4 py-2.5 shadow-xl backdrop-blur-sm"
          style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -120%)" }}
        >
          <p className="font-display text-xs font-bold uppercase tracking-widest text-accent">
            {tooltip.label}
          </p>
          <p className="mt-0.5 text-xs text-foreground/75">{tooltip.tip}</p>
        </div>
      )}
    </div>
  );
}
