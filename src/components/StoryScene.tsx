"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Float, Stars, Html, Sparkles, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// ── Types ──────────────────────────────────────────────────────────────────────
export type Variant = "neon" | "pop";
export type Mode    = "personal" | "pro";
type ObjProps = {
  variant: Variant;
  position: [number, number, number];
  label: string;
  sub: string;
  grounded?: boolean;
};

// Waterline — todas las islas se asientan a ras del océano
const WATER_Y = -0.45;
// Centro aproximado del archipiélago (para muelles y anillo de botes)
const HUB_X = 0.4, HUB_Z = 1.5;

// ── Colors ─────────────────────────────────────────────────────────────────────
const COLORS = {
  venBg:  { neon: ["#0d1219","#5eb3ff",0.25] as const, pop: ["#1e2a3a","#5eb3ff",0.15] as const },
  venV:   { neon: ["#0a1a2e","#5eb3ff",2.5]  as const, pop: ["#5eb3ff","#9be0ff",0.5]  as const },
  pokRed: { neon: ["#0d0000","#ff2222",2.0]  as const, pop: ["#cc0000","#ff6666",0.3]  as const },
  pokWht: { neon: ["#050505","#ffffff",0.5]  as const, pop: ["#f0f0f0","#ffffff",0.15] as const },
  tri:    { neon: ["#1a1200","#ffd700",2.5]  as const, pop: ["#ffd700","#ffcc00",0.4]  as const },
  mTop:   { neon: ["#0a1400","#4caf50",2.0]  as const, pop: ["#4a8a1a","#6dcf30",0.35] as const },
  mSide:  { neon: ["#150d05","#8B6914",0.6]  as const, pop: ["#8B6914","#a07820",0.2]  as const },
  phone:  { neon: ["#0a0a12","#6c63ff",0.5]  as const, pop: ["#1a1a2e","#6c63ff",0.25] as const },
  phoneSc:{ neon: ["#020a14","#5eb3ff",3.0]  as const, pop: ["#1a3a6a","#5eb3ff",0.9]  as const },
  wii:    { neon: ["#0a0a0a","#ddddcc",0.4]  as const, pop: ["#e0ddd0","#ffffff",0.1]  as const },
  bag:    { neon: ["#0a0a14","#3a7bff",1.2]  as const, pop: ["#2a5bd0","#5a8bff",0.3]  as const },
  plane:  { neon: ["#0a0a12","#aaccff",1.5]  as const, pop: ["#c8d0e0","#eef4ff",0.2]  as const },
  trB:    { neon: ["#0a0800","#ff9500",2.0]  as const, pop: ["#f5a623","#ff9500",0.3]  as const },
  trC:    { neon: ["#080600","#ff7700",1.5]  as const, pop: ["#e8920a","#ff8800",0.25] as const },
  pc:     { neon: ["#080808","#33ffaa",0.6]  as const, pop: ["#2a2a2a","#44cc88",0.2]  as const },
  pcSc:   { neon: ["#010a06","#00ff88",3.5]  as const, pop: ["#003320","#00ff88",1.0]  as const },
  ds3:    { neon: ["#05050a","#ff66cc",1.2]  as const, pop: ["#1a1a2e","#ff88dd",0.35] as const },
  ds3Sc:  { neon: ["#020008","#9966ff",3.0]  as const, pop: ["#0d0020","#cc88ff",0.9]  as const },
} satisfies Record<string, Record<"neon"|"pop", readonly [string,string,number]>>;
type CK = keyof typeof COLORS;
function mc(key: CK, v: Variant, h = false) {
  const [color, emissive, ei] = COLORS[key][v];
  return { color, emissive, emissiveIntensity: ei * (h ? 2.2 : 1), roughness: 0.3, metalness: v === "neon" ? 0.2 : 0.1 };
}

// Deforma un cilindro en una masa de tierra irregular (low-poly natural)
function deformIsland(rTop: number, rBot: number, height: number, seed: number, radialSeg = 15, heightSeg = 4, bumpTop = false): THREE.CylinderGeometry {
  const geo = new THREE.CylinderGeometry(rTop, rBot, height, radialSeg, heightSeg, false);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const ang = Math.atan2(v.z, v.x);
    const yN = (v.y + height / 2) / height;
    const wob = Math.sin(ang*3 + seed)*0.075 + Math.sin(ang*6 - seed*1.3)*0.04 + Math.sin(ang*2 + seed*2.1)*0.05;
    const f = 1 + wob * (0.35 + 0.65 * yN);
    v.x *= f; v.z *= f;
    if (bumpTop && yN > 0.9) v.y += Math.sin(v.x*2.3 + seed)*0.05 + Math.sin(v.z*2.6 - seed)*0.05;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

// Textura radial suave (una sola vez) — para sombras y estelas sin bordes duros
let _soft: THREE.Texture | null = null;
function softTex(): THREE.Texture {
  if (_soft) return _soft;
  const s = 64;
  const cv = document.createElement("canvas"); cv.width = cv.height = s;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.55, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  _soft = new THREE.CanvasTexture(cv);
  return _soft;
}

// ── Hover ──────────────────────────────────────────────────────────────────────
function useHover() {
  const [h, set] = useState(false);
  useEffect(() => {
    document.body.style.cursor = h ? "pointer" : "";
    return () => { document.body.style.cursor = ""; };
  }, [h]);
  return {
    hovered: h,
    handlers: {
      onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); set(true); },
      onPointerOut: () => set(false),
    },
  };
}
function Tip({ h, label, sub, y = 1.0 }: { h: boolean; label: string; sub: string; y?: number }) {
  if (!h) return null;
  return (
    <Html position={[0, y, 0]} center style={{ pointerEvents: "none", userSelect: "none" }}>
      <div style={{ background: "rgba(8,8,14,0.93)", border: "1px solid rgba(108,99,255,0.5)", borderRadius: "12px", padding: "8px 14px", backdropFilter: "blur(10px)", whiteSpace: "nowrap", boxShadow: "0 4px 24px rgba(108,99,255,0.2)" }}>
        <p style={{ color: "#6c63ff", fontSize: "10px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>{label}</p>
        <p style={{ color: "rgba(232,232,232,0.7)", fontSize: "11px", margin: "4px 0 0" }}>{sub}</p>
      </div>
    </Html>
  );
}
const FG = { speed: 0.5,  floatIntensity: 0.06, rotationIntensity: 0.03 };
const FA = { speed: 1.4,  floatIntensity: 0.42, rotationIntensity: 0.22 };
const FS = { speed: 1.0,  floatIntensity: 0.5,  rotationIntensity: 0.08 };

// ── Lantern (flickering island light) ─────────────────────────────────────────
function Lantern({ pos, color }: { pos: [number,number,number]; color: string }) {
  const lightRef = useRef<THREE.PointLight>(null!);
  useFrame(({ clock }) => {
    if (!lightRef.current) return;
    lightRef.current.intensity = 1.1 + Math.sin(clock.elapsedTime * 2.4 + pos[0] * 3.7) * 0.32;
  });
  return (
    <group position={pos}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.6, 6]} />
        <meshStandardMaterial color="#5a4830" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.65, 0]}>
        <sphereGeometry args={[0.072, 8, 6]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={4.0} roughness={0.1} />
      </mesh>
      <pointLight ref={lightRef} position={[0, 0.65, 0]} color={color} intensity={1.4} distance={4} />
    </group>
  );
}

// ── Nature ─────────────────────────────────────────────────────────────────────

function PalmTree({ pos, s = 1 }: { pos: [number,number,number]; s?: number }) {
  const frondAngles = useMemo(() => Array.from({length: 9}, (_, i) => (i/9)*Math.PI*2), []);
  return (
    <group position={pos} scale={s}>
      <mesh position={[0.06, 0.85, 0]} rotation={[0.07, 0, 0.17]}>
        <cylinderGeometry args={[0.05, 0.10, 1.7, 7]} />
        <meshStandardMaterial color="#6a4e14" roughness={0.96} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <sphereGeometry args={[0.11, 7, 5]} />
        <meshStandardMaterial color="#5a4010" roughness={0.97} />
      </mesh>
      {frondAngles.map((a, i) => (
        <mesh key={i}
          position={[Math.cos(a)*0.24 + 0.06, 1.74, Math.sin(a)*0.24]}
          rotation={[0.65, a, Math.PI/2]}
        >
          <planeGeometry args={[0.72, 0.08]} />
          <meshStandardMaterial color={i%2===0?"#258a10":"#2ea015"} roughness={0.72} side={2} />
        </mesh>
      ))}
      <mesh position={[0.06, 1.78, 0]}>
        <sphereGeometry args={[0.12, 6, 4]} />
        <meshStandardMaterial color="#1a6a08" roughness={0.8} />
      </mesh>
    </group>
  );
}

function AcaciaTree({ pos, s = 1 }: { pos: [number,number,number]; s?: number }) {
  const clusters: [number,number,number][] = [
    [-0.42,1.85,0.28],[0.44,1.82,-0.24],[0.02,1.85,0.52],
    [-0.50,1.80,-0.20],[0.32,1.83,0.40],[0.0,1.78,-0.46],
  ];
  return (
    <group position={pos} scale={s}>
      <mesh position={[0, 0.85, 0]}>
        <cylinderGeometry args={[0.05, 0.09, 1.7, 7]} />
        <meshStandardMaterial color="#7a5520" roughness={0.96} />
      </mesh>
      <mesh position={[0, 1.77, 0]}>
        <cylinderGeometry args={[0.92, 0.75, 0.18, 10]} />
        <meshStandardMaterial color="#4a8820" roughness={0.78} />
      </mesh>
      <mesh position={[0, 1.93, 0]}>
        <cylinderGeometry args={[0.63, 0.47, 0.14, 10]} />
        <meshStandardMaterial color="#3d7518" roughness={0.75} />
      </mesh>
      {clusters.map(([x,y,z],i) => (
        <mesh key={i} position={[x,y,z]}>
          <sphereGeometry args={[0.17, 6, 4]} />
          <meshStandardMaterial color={i%2===0?"#558a28":"#3d7018"} roughness={0.82} />
        </mesh>
      ))}
    </group>
  );
}

function CherryTree({ pos, s = 1 }: { pos: [number,number,number]; s?: number }) {
  const blossoms: [number,number,number][] = [
    [0,1.55,0],[0.3,1.38,0.12],[-0.24,1.32,-0.1],[0.1,1.66,-0.22],[-0.12,1.7,0.24],
    [0.22,1.56,0.26],[-0.18,1.48,-0.28],[0.05,1.78,0.08],
  ];
  return (
    <group position={pos} scale={s}>
      <mesh position={[0, 0.78, 0]}>
        <cylinderGeometry args={[0.055, 0.09, 1.56, 7]} />
        <meshStandardMaterial color="#8a6858" roughness={0.94} />
      </mesh>
      <mesh position={[0.12, 1.2, 0]} rotation={[0, 0, 0.4]}>
        <cylinderGeometry args={[0.025, 0.035, 0.55, 5]} />
        <meshStandardMaterial color="#8a6858" roughness={0.94} />
      </mesh>
      <mesh position={[-0.1, 1.2, 0.08]} rotation={[0.15, 0, -0.35]}>
        <cylinderGeometry args={[0.022, 0.032, 0.48, 5]} />
        <meshStandardMaterial color="#8a6858" roughness={0.94} />
      </mesh>
      {blossoms.map(([x,y,z], i) => (
        <mesh key={i} position={[x,y,z]}>
          <sphereGeometry args={[0.28+Math.sin(i)*0.04, 7, 5]} />
          <meshStandardMaterial color={i%3===0?"#ffb7c5":i%3===1?"#ff99b0":"#ffc8d5"} emissive="#ff88aa" emissiveIntensity={0.1} roughness={0.86} />
        </mesh>
      ))}
    </group>
  );
}

function PineTree({ pos, snow = false, s = 1 }: { pos: [number,number,number]; snow?: boolean; s?: number }) {
  return (
    <group position={pos} scale={s}>
      <mesh position={[0,0.3,0]}><cylinderGeometry args={[0.07,0.09,0.6,7]} /><meshStandardMaterial color="#5a3a18" roughness={0.95} /></mesh>
      <mesh position={[0,0.72,0]}><coneGeometry args={[0.55,0.9,8]} /><meshStandardMaterial color="#2a5c1a" roughness={0.72} /></mesh>
      <mesh position={[0,1.22,0]}><coneGeometry args={[0.41,0.8,8]} /><meshStandardMaterial color="#255518" roughness={0.72} /></mesh>
      <mesh position={[0,1.68,0]}><coneGeometry args={[0.27,0.70,8]} /><meshStandardMaterial color="#1a4a12" roughness={0.72} /></mesh>
      <mesh position={[0,2.08,0]}><coneGeometry args={[0.14,0.55,7]} /><meshStandardMaterial color="#14400e" roughness={0.74} /></mesh>
      {snow && <>
        <mesh position={[0,1.15,0]}><coneGeometry args={[0.36,0.48,8]} /><meshStandardMaterial color="#e8eeff" emissive="#ffffff" emissiveIntensity={0.08} roughness={0.58} /></mesh>
        <mesh position={[0,1.62,0]}><coneGeometry args={[0.23,0.40,8]} /><meshStandardMaterial color="#f0f4ff" emissive="#ffffff" emissiveIntensity={0.1} roughness={0.54} /></mesh>
        <mesh position={[0,2.04,0]}><coneGeometry args={[0.12,0.30,7]} /><meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.14} roughness={0.48} /></mesh>
        <mesh position={[0,2.35,0]}><coneGeometry args={[0.06,0.18,6]} /><meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.18} roughness={0.45} /></mesh>
      </>}
    </group>
  );
}

function Rock({ pos, r = 0, s = 1 }: { pos: [number,number,number]; r?: number; s?: number }) {
  return (
    <mesh position={pos} scale={s} rotation={[0.2,r,0.15]}>
      <dodecahedronGeometry args={[0.22,0]} />
      <meshStandardMaterial color="#8a8880" roughness={0.92} flatShading />
    </mesh>
  );
}

function GrassTuft({ pos, color = "#a89018" }: { pos: [number,number,number]; color?: string }) {
  return (
    <group position={pos}>
      {[0, 1.1, 2.1].map(r => (
        <mesh key={r} rotation={[1.15, r, 0]}>
          <planeGeometry args={[0.13, 0.085]} />
          <meshStandardMaterial color={color} roughness={0.96} side={2} />
        </mesh>
      ))}
    </group>
  );
}

// ── Interactive island machines ────────────────────────────────────────────────

// Molino de viento (Venezuela) — aspas girando
function Windmill({ pos, s = 1, color = "#d2ccba" }: { pos: [number,number,number]; s?: number; color?: string }) {
  const fan = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => { if (fan.current) fan.current.rotation.z = clock.elapsedTime * 0.9; });
  const blades = 18, H = 1.9;
  return (
    <group position={pos} scale={s}>
      {/* torre de celosía */}
      {[0,1,2,3].map(i => { const a = i/4*Math.PI*2; const x = Math.cos(a)*0.16, z = Math.sin(a)*0.16;
        return <mesh key={i} position={[x, H/2, z]} rotation={[z*0.18, 0, -x*0.18]}><boxGeometry args={[0.028,H,0.028]} /><meshStandardMaterial color="#6a5a3a" roughness={0.9} /></mesh>; })}
      {[0.5,1.0,1.5].map((y,i) => <mesh key={i} position={[0,y,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[0.14*(1+(H-y)/H*0.35),0.008,5,4]} /><meshStandardMaterial color="#6a5a3a" /></mesh>)}
      <mesh position={[0,H,0]}><boxGeometry args={[0.18,0.03,0.18]} /><meshStandardMaterial color="#5a4a2a" /></mesh>
      {/* rotor multipala */}
      <group ref={fan} position={[0, H+0.16, 0.14]}>
        <mesh rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[0.05,0.05,0.06,10]} /><meshStandardMaterial color="#8a7a5a" metalness={0.4} roughness={0.5} /></mesh>
        {Array.from({length:blades}).map((_,i) => { const a = i/blades*Math.PI*2;
          return <mesh key={i} rotation={[0,0,a]} position={[Math.cos(a)*0.24, Math.sin(a)*0.24, 0]}><planeGeometry args={[0.4,0.05]} /><meshStandardMaterial color={color} metalness={0.25} roughness={0.55} side={2} /></mesh>; })}
        <mesh><circleGeometry args={[0.055,12]} /><meshStandardMaterial color="#9a8a6a" side={2} /></mesh>
      </group>
      {/* veleta de cola */}
      <mesh position={[0, H+0.16, -0.34]}><boxGeometry args={[0.02,0.2,0.46]} /><meshStandardMaterial color={color} side={2} /></mesh>
    </group>
  );
}

// Balancín petrolero (Houston) — cabeceo
function Pumpjack({ pos, s = 1 }: { pos: [number,number,number]; s?: number }) {
  const beam = useRef<THREE.Group>(null!);
  const crank = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 1.4;
    if (beam.current) beam.current.rotation.z = Math.sin(t) * 0.26;
    if (crank.current) crank.current.rotation.z = -t;
  });
  return (
    <group position={pos} scale={s}>
      <mesh position={[0,0.05,0]}><boxGeometry args={[1.0,0.1,0.4]} /><meshStandardMaterial color="#3a3a42" roughness={0.85} /></mesh>
      <mesh position={[0.05,0.55,0.12]} rotation={[0,0,-0.16]}><boxGeometry args={[0.05,1.0,0.05]} /><meshStandardMaterial color="#c23a2a" roughness={0.6} /></mesh>
      <mesh position={[0.05,0.55,-0.12]} rotation={[0,0,0.16]}><boxGeometry args={[0.05,1.0,0.05]} /><meshStandardMaterial color="#c23a2a" roughness={0.6} /></mesh>
      <group ref={beam} position={[0.05,1.02,0]}>
        <mesh><boxGeometry args={[1.5,0.08,0.1]} /><meshStandardMaterial color="#d0641e" metalness={0.3} roughness={0.55} /></mesh>
        <mesh position={[0.78,-0.09,0]}><boxGeometry args={[0.16,0.26,0.11]} /><meshStandardMaterial color="#d0641e" roughness={0.55} /></mesh>
        <mesh position={[0.83,-0.32,0]}><cylinderGeometry args={[0.008,0.008,0.42,6]} /><meshStandardMaterial color="#222" /></mesh>
        <mesh position={[-0.7,0,0]}><boxGeometry args={[0.2,0.24,0.3]} /><meshStandardMaterial color="#2a2a30" metalness={0.4} /></mesh>
      </group>
      <group ref={crank} position={[-0.42,0.5,0]}>
        <mesh position={[0,0.16,0]}><boxGeometry args={[0.06,0.34,0.18]} /><meshStandardMaterial color="#444" metalness={0.4} /></mesh>
      </group>
      <mesh position={[0.86,0.22,0]}><boxGeometry args={[0.1,0.34,0.1]} /><meshStandardMaterial color="#333" /></mesh>
    </group>
  );
}

// Rueda de la fortuna (Orlando) — gira y las cabinas quedan derechas
function FerrisWheel({ pos, s = 1 }: { pos: [number,number,number]; s?: number }) {
  const wheel = useRef<THREE.Group>(null!);
  const cabins = useRef<(THREE.Group | null)[]>([]);
  const N = 8, R = 0.95, H = 0.95 + 0.35;
  const cabinColors = ["#ff5b7f","#ffd23f","#4ec5ff","#7bde6a","#c77bff","#ff9f45","#ff6bd6","#5affc0"];
  useFrame(({ clock }) => {
    const a = clock.elapsedTime * 0.42;
    if (wheel.current) wheel.current.rotation.z = a;
    for (let i = 0; i < N; i++) { const c = cabins.current[i]; if (c) c.rotation.z = -a; }
  });
  return (
    <group position={pos} scale={s}>
      <mesh position={[0,0.05,0]}><boxGeometry args={[1.2,0.1,0.7]} /><meshStandardMaterial color="#6a6a72" roughness={0.85} /></mesh>
      {[-0.28,0.28].map((z,i) => (
        <group key={i}>
          <mesh position={[-0.48,H/2,z]} rotation={[0,0,0.52]}><cylinderGeometry args={[0.03,0.04,H+0.28,7]} /><meshStandardMaterial color="#d8dde6" metalness={0.4} roughness={0.4} /></mesh>
          <mesh position={[0.48,H/2,z]} rotation={[0,0,-0.52]}><cylinderGeometry args={[0.03,0.04,H+0.28,7]} /><meshStandardMaterial color="#d8dde6" metalness={0.4} roughness={0.4} /></mesh>
        </group>
      ))}
      <mesh position={[0,H,0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[0.05,0.05,0.62,10]} /><meshStandardMaterial color="#aab0bc" metalness={0.5} /></mesh>
      <group ref={wheel} position={[0,H,0]}>
        {[-0.24,0.24].map((z,i) => <mesh key={i} position={[0,0,z]}><torusGeometry args={[R,0.02,8,32]} /><meshStandardMaterial color="#7cc6ff" emissive="#3aa0ff" emissiveIntensity={0.45} metalness={0.3} roughness={0.4} /></mesh>)}
        {Array.from({length:N}).map((_,i) => { const a = i/N*Math.PI*2;
          return <mesh key={i} rotation={[0,0,a]}><boxGeometry args={[R*2,0.012,0.012]} /><meshStandardMaterial color="#cfe8ff" emissive="#8ecbff" emissiveIntensity={0.2} /></mesh>; })}
        {Array.from({length:N}).map((_,i) => { const a = i/N*Math.PI*2; const x = Math.cos(a)*R, y = Math.sin(a)*R;
          return (
            <group key={i} position={[x,y,0]} ref={(el) => { cabins.current[i] = el; }}>
              <mesh position={[0,-0.09,0]}><boxGeometry args={[0.16,0.15,0.34]} /><meshStandardMaterial color={cabinColors[i%cabinColors.length]} emissive={cabinColors[i%cabinColors.length]} emissiveIntensity={0.3} roughness={0.5} /></mesh>
              <mesh position={[0,0.01,0]}><boxGeometry args={[0.015,0.06,0.015]} /><meshStandardMaterial color="#888" /></mesh>
            </group>
          ); })}
      </group>
    </group>
  );
}

// Faro central giratorio — llena el centro del mapa
function Lighthouse({ pos }: { pos: [number,number,number] }) {
  const beam = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => { if (beam.current) beam.current.rotation.y = clock.elapsedTime * 0.8; });
  return (
    <group position={pos}>
      <mesh position={[0,-0.4,0]}><cylinderGeometry args={[0.55,0.95,1.0,12]} /><meshStandardMaterial color="#5a5450" roughness={0.96} flatShading /></mesh>
      <mesh position={[0,0.08,0]}><cylinderGeometry args={[0.5,0.56,0.16,12]} /><meshStandardMaterial color="#6f8a54" roughness={0.9} flatShading /></mesh>
      <mesh position={[0,0.62,0]}><cylinderGeometry args={[0.13,0.2,1.0,14]} /><meshStandardMaterial color="#f0f0f0" roughness={0.7} /></mesh>
      {[0.42,0.82].map((y,i) => <mesh key={i} position={[0,y,0]}><cylinderGeometry args={[0.155,0.16,0.15,14]} /><meshStandardMaterial color="#e0362a" roughness={0.55} /></mesh>)}
      <mesh position={[0,1.2,0]}><cylinderGeometry args={[0.16,0.16,0.2,12]} /><meshStandardMaterial color="#2a2a2e" metalness={0.4} roughness={0.5} /></mesh>
      <mesh position={[0,1.2,0]}><sphereGeometry args={[0.1,12,10]} /><meshStandardMaterial color="#fff6c0" emissive="#ffdd66" emissiveIntensity={3.2} roughness={0.1} /></mesh>
      <mesh position={[0,1.38,0]}><coneGeometry args={[0.18,0.18,12]} /><meshStandardMaterial color="#c0362a" roughness={0.5} /></mesh>
      <group ref={beam} position={[0,1.2,0]}>
        <mesh position={[1.05,0,0]} rotation={[0,0,-Math.PI/2]}>
          <coneGeometry args={[0.34,2.1,10,1,true]} />
          <meshBasicMaterial color="#ffe9a0" transparent opacity={0.12} side={2} depthWrite={false} />
        </mesh>
      </group>
      <pointLight position={[0,1.2,0]} color="#ffdd88" intensity={1.3} distance={7} />
    </group>
  );
}

// ── Rellenadores del mar exterior ──────────────────────────────────────────────

// Boya con luz intermitente
function Buoy({ pos, color }: { pos: [number,number,number]; color: string }) {
  const l = useRef<THREE.PointLight>(null!);
  const m = useRef<THREE.MeshStandardMaterial>(null!);
  const grp = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    const on = Math.sin(clock.elapsedTime * 2.2 + pos[0]) > 0 ? 1 : 0.12;
    if (l.current) l.current.intensity = on * 1.2;
    if (m.current) m.current.emissiveIntensity = on * 3;
    if (grp.current) grp.current.position.y = WATER_Y + Math.sin(clock.elapsedTime * 1.5 + pos[2]) * 0.04;
  });
  return (
    <group ref={grp} position={[pos[0], WATER_Y, pos[2]]}>
      <mesh position={[0,-0.04,0]}><sphereGeometry args={[0.14,10,8,0,Math.PI*2,0,Math.PI/2]} /><meshStandardMaterial color="#d84a38" roughness={0.6} /></mesh>
      <mesh position={[0,0.14,0]}><coneGeometry args={[0.12,0.32,10]} /><meshStandardMaterial color="#c23a2a" roughness={0.6} /></mesh>
      <mesh position={[0,0.34,0]}><sphereGeometry args={[0.05,8,8]} /><meshStandardMaterial ref={m} color={color} emissive={color} emissiveIntensity={2} roughness={0.2} /></mesh>
      <pointLight ref={l} position={[0,0.34,0]} color={color} intensity={1} distance={3} />
    </group>
  );
}

// Islote mediano (llena la franja entre las islas principales y el horizonte)
function MidIslet({ pos, kind, sc = 1, seed }: { pos: [number,number,number]; kind: "palm"|"pine"; sc?: number; seed: number }) {
  const geo = useMemo(() => deformIsland(1.0, 0.4, 1.0, seed, 11, 3, true), [seed]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <group position={pos} scale={sc}>
      <mesh geometry={geo} position={[0,-0.35,0]}><meshStandardMaterial color={kind==="palm"?"#3a7a34":"#356a40"} roughness={0.9} flatShading /></mesh>
      {kind==="palm" ? <PalmTree pos={[0.1,0.12,0]} s={0.62} /> : <PineTree pos={[0.1,0.12,0]} snow s={0.6} />}
      {/* farolito (emisivo, sin luz extra para no cargar) */}
      <mesh position={[-0.32,0.32,0.22]}><sphereGeometry args={[0.055,8,6]} /><meshStandardMaterial color="#ffcc88" emissive="#ffcc88" emissiveIntensity={3.2} roughness={0.2} /></mesh>
    </group>
  );
}

// Pájaro con aleteo
function Bird({ i }: { i: number }) {
  const lw = useRef<THREE.Group>(null!);
  const rw = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    const f = Math.abs(Math.sin(clock.elapsedTime * 7 + i * 0.8)) * 0.7;
    if (lw.current) lw.current.rotation.z = f;
    if (rw.current) rw.current.rotation.z = -f;
  });
  return (
    <group>
      <group ref={lw}><mesh position={[-0.14,0,0]}><planeGeometry args={[0.28,0.08]} /><meshStandardMaterial color="#2a2a33" side={2} /></mesh></group>
      <group ref={rw}><mesh position={[0.14,0,0]}><planeGeometry args={[0.28,0.08]} /><meshStandardMaterial color="#2a2a33" side={2} /></mesh></group>
    </group>
  );
}
function BirdFlock({ radius, height, count, speed, offset }: { radius: number; height: number; count: number; speed: number; offset: number }) {
  const g = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!g.current) return;
    const t = clock.elapsedTime * speed + offset;
    g.current.position.set(HUB_X + Math.cos(t)*radius, height + Math.sin(t*1.3)*0.4, HUB_Z + Math.sin(t)*radius);
    g.current.rotation.y = -t + Math.PI/2;
  });
  return (
    <group ref={g}>
      {Array.from({ length: count }).map((_, i) => (
        <group key={i} position={[(i%3-1)*0.55, Math.floor(i/3)*0.32, -(i%4)*0.35]} scale={0.85 + (i%3)*0.08}>
          <Bird i={i} />
        </group>
      ))}
    </group>
  );
}

function OuterScatter() {
  const islets = useMemo(() => {
    const specs: [number, number, "palm"|"pine", number][] = [
      [25, 14, "palm", 1.1],[70, 19, "pine", 1.3],[112, 15, "palm", 1.0],
      [150, 22, "pine", 1.5],[195, 16, "palm", 1.15],[238, 20, "pine", 1.35],
      [288, 15, "palm", 1.05],[322, 24, "pine", 1.6],[352, 18, "palm", 1.2],
    ];
    return specs.map(([deg, rad, kind, s], i) => {
      const a = (deg * Math.PI) / 180;
      return { pos: [HUB_X + Math.cos(a)*rad, 0, HUB_Z + Math.sin(a)*rad] as [number,number,number], kind, s, seed: i*3.3 + 2 };
    });
  }, []);
  const buoys = useMemo(() => {
    const specs: [number, number, string][] = [
      [48, 11, "#ff4433"],[95, 12.5, "#33ff88"],[172, 11.5, "#ffcc33"],
      [222, 13, "#ff4433"],[300, 11, "#33ccff"],[338, 12.5, "#33ff88"],
    ];
    return specs.map(([deg, rad, color]) => {
      const a = (deg * Math.PI) / 180;
      return { pos: [HUB_X + Math.cos(a)*rad, 0, HUB_Z + Math.sin(a)*rad] as [number,number,number], color };
    });
  }, []);
  return (
    <group>
      {islets.map((it, i) => <MidIslet key={i} pos={it.pos} kind={it.kind} sc={it.s} seed={it.seed} />)}
      {buoys.map((b, i) => <Buoy key={i} pos={b.pos} color={b.color} />)}
      <BirdFlock radius={13} height={4.2} count={6} speed={0.16} offset={0} />
      <BirdFlock radius={18} height={5.6} count={5} speed={0.12} offset={2.5} />
    </group>
  );
}

// ── Dock / muelle (uno por isla, apuntando al mar abierto) ─────────────────────
function Dock({ cx, cz, r }: { cx: number; cz: number; r: number }) {
  const dx = cx - HUB_X, dz = cz - HUB_Z;      // hacia afuera del archipiélago
  const L = Math.hypot(dx, dz) || 1;
  const nx = dx / L, nz = dz / L;
  const bx = cx + nx * r * 0.8, bz = cz + nz * r * 0.8;
  const rot = Math.atan2(nx, nz);
  const len = 1.35, planks = 7;
  return (
    <group position={[bx, WATER_Y + 0.02, bz]} rotation={[0, rot, 0]}>
      <mesh position={[0, 0, len/2]}><boxGeometry args={[0.46, 0.05, len]} /><meshStandardMaterial color="#7a5230" roughness={0.92} /></mesh>
      {Array.from({length: planks}).map((_, i) => (
        <mesh key={i} position={[0, 0.031, 0.12 + i*(len-0.12)/planks]}>
          <boxGeometry args={[0.46, 0.006, 0.018]} /><meshStandardMaterial color="#5c3c1e" roughness={0.95} />
        </mesh>
      ))}
      {([[0.19,0.12],[-0.19,0.12],[0.19,len-0.05],[-0.19,len-0.05]] as [number,number][]).map(([x,z], i) => (
        <mesh key={i} position={[x, -0.34, z]}><cylinderGeometry args={[0.03, 0.03, 0.8, 6]} /><meshStandardMaterial color="#4a3016" roughness={0.96} /></mesh>
      ))}
      <mesh position={[0.14, 0.12, len-0.06]}><cylinderGeometry args={[0.035, 0.045, 0.26, 6]} /><meshStandardMaterial color="#3a2610" roughness={0.95} /></mesh>
    </group>
  );
}

// ── Boat (navega el anillo exterior, más grande y con estela) ──────────────────
function Boat({ curve, speed = 0.02, phase = 0, scale = 1, sail = "#ffe8c0", hull = "#8a5a2a" }: {
  curve: THREE.CatmullRomCurve3; speed?: number; phase?: number; scale?: number; sail?: string; hull?: string;
}) {
  const ref = useRef<THREE.Group>(null!);
  const _p = useRef(new THREE.Vector3());
  const _t = useRef(new THREE.Vector3());
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const u = ((clock.elapsedTime * speed + phase) % 1 + 1) % 1;
    curve.getPointAt(u, _p.current);
    curve.getTangentAt(u, _t.current);
    ref.current.position.set(_p.current.x, WATER_Y + 0.04 + Math.sin(clock.elapsedTime*1.4 + phase*8)*0.035, _p.current.z);
    ref.current.rotation.y = Math.atan2(_t.current.x, _t.current.z);
    ref.current.rotation.z = Math.sin(clock.elapsedTime*1.1 + phase*8) * 0.05;
  });
  const soft = softTex();
  return (
    <group ref={ref} scale={scale}>
      {/* sombra de contacto suave sobre el agua */}
      <mesh position={[0,-0.02,0]} rotation={[-Math.PI/2,0,0]} scale={[0.62,1.5,1]}>
        <planeGeometry args={[1,1]} />
        <meshBasicMaterial map={soft} color="#050810" transparent opacity={0.34} depthWrite={false} />
      </mesh>
      {/* espuma de estela suave detrás */}
      <mesh position={[0,-0.01,-0.72]} rotation={[-Math.PI/2,0,0]} scale={[0.42,1.6,1]}>
        <planeGeometry args={[1,1]} />
        <meshBasicMaterial map={soft} color="#dce8ff" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      {/* casco */}
      <mesh position={[0,0.06,0]}><boxGeometry args={[0.24,0.13,0.54]} /><meshStandardMaterial color={hull} roughness={0.8} /></mesh>
      <mesh position={[0,0.06,0.32]} rotation={[Math.PI/4,0,0]}><boxGeometry args={[0.24,0.13,0.13]} /><meshStandardMaterial color={hull} roughness={0.8} /></mesh>
      <mesh position={[0,0.13,-0.02]}><boxGeometry args={[0.2,0.02,0.44]} /><meshStandardMaterial color="#c8a878" roughness={0.85} /></mesh>
      {/* mástil + velas */}
      <mesh position={[0,0.4,0.02]}><cylinderGeometry args={[0.013,0.013,0.58,6]} /><meshStandardMaterial color="#5a3a1a" roughness={0.9} /></mesh>
      <mesh position={[0,0.4,0.03]} rotation={[0,Math.PI/2,0]}><planeGeometry args={[0.34,0.46]} /><meshStandardMaterial color={sail} emissive={sail} emissiveIntensity={0.07} roughness={0.7} side={2} /></mesh>
      <mesh position={[0,0.3,0.24]} rotation={[0,Math.PI/2,0]}><planeGeometry args={[0.2,0.28]} /><meshStandardMaterial color={sail} emissive={sail} emissiveIntensity={0.05} roughness={0.7} side={2} /></mesh>
      <mesh position={[0,0.66,0.06]}><planeGeometry args={[0.12,0.06]} /><meshStandardMaterial color="#ff5544" side={2} /></mesh>
    </group>
  );
}

// ── Mountain cog train — rieles en espiral + locomotora + vapor ─────────────────
function SteamPuffs() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const N = 6;
  useFrame(({ clock }) => {
    for (let i = 0; i < N; i++) {
      const m = refs.current[i];
      if (!m) continue;
      const t = (clock.elapsedTime * 0.7 + i / N) % 1;
      m.position.set(Math.sin(t*6 + i)*0.04, t * 0.75, 0.02);
      const sc = 0.04 + t * 0.13;
      m.scale.setScalar(sc);
      (m.material as THREE.MeshStandardMaterial).opacity = (1 - t) * 0.55;
    }
  });
  return (
    <group position={[0, 0.26, 0.12]}>
      {Array.from({ length: N }).map((_, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }}>
          <sphereGeometry args={[1, 7, 6]} />
          <meshStandardMaterial color="#eef0f4" emissive="#ffffff" emissiveIntensity={0.15} transparent opacity={0.5} depthWrite={false} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function MountainTrain({ cx, cz, base }: { cx: number; cz: number; base: number }) {
  const trainRef = useRef<THREE.Group>(null!);
  const coneH = 3.0, rBaseCone = 1.45, rise = 2.55, turns = 2.2, a0 = 0.5;

  const { railInner, railOuter, ties, curve } = useMemo(() => {
    const seg = 200;
    const center: THREE.Vector3[] = [], inner: THREE.Vector3[] = [], outer: THREE.Vector3[] = [];
    const tieData: { p: THREE.Vector3; a: number }[] = [];
    for (let i = 0; i <= seg; i++) {
      const u = i / seg;
      const y = base + u * rise;
      const coneR = Math.max(0.16, rBaseCone * (1 - (y - base) / coneH));
      const r = coneR + 0.16;
      const a = u * turns * Math.PI * 2 + a0;
      const ca = Math.cos(a), sa = Math.sin(a);
      center.push(new THREE.Vector3(cx + ca*r, y, cz + sa*r));
      inner.push(new THREE.Vector3(cx + ca*(r-0.06), y + 0.012, cz + sa*(r-0.06)));
      outer.push(new THREE.Vector3(cx + ca*(r+0.06), y + 0.012, cz + sa*(r+0.06)));
      if (i % 6 === 0) tieData.push({ p: center[i], a });
    }
    return {
      curve: new THREE.CatmullRomCurve3(center),
      railInner: new THREE.TubeGeometry(new THREE.CatmullRomCurve3(inner), seg, 0.017, 5, false),
      railOuter: new THREE.TubeGeometry(new THREE.CatmullRomCurve3(outer), seg, 0.017, 5, false),
      ties: tieData,
    };
  }, [cx, cz, base]);

  useEffect(() => () => { railInner.dispose(); railOuter.dispose(); }, [railInner, railOuter]);

  const _p = useRef(new THREE.Vector3());
  const _t = useRef(new THREE.Vector3());
  useFrame(({ clock }) => {
    if (!trainRef.current) return;
    const u = Math.min(0.999, (clock.elapsedTime * 0.028) % 1);
    curve.getPointAt(u, _p.current);
    curve.getTangentAt(u, _t.current);
    trainRef.current.position.copy(_p.current);
    trainRef.current.rotation.y = Math.atan2(_t.current.x, _t.current.z);
    trainRef.current.rotation.x = -Math.asin(THREE.MathUtils.clamp(_t.current.y, -1, 1)) * 0.5;
  });

  return (
    <group>
      <mesh geometry={railInner}><meshStandardMaterial color="#5a5a66" metalness={0.7} roughness={0.4} /></mesh>
      <mesh geometry={railOuter}><meshStandardMaterial color="#5a5a66" metalness={0.7} roughness={0.4} /></mesh>
      {ties.map((t, i) => (
        <mesh key={i} position={[t.p.x, t.p.y - 0.005, t.p.z]} rotation={[0, t.a, 0]}>
          <boxGeometry args={[0.02, 0.02, 0.18]} />
          <meshStandardMaterial color="#4a3520" roughness={0.95} />
        </mesh>
      ))}
      <group ref={trainRef}>
        <mesh position={[0,0.05,0]}><boxGeometry args={[0.15,0.06,0.36]} /><meshStandardMaterial color="#2a2a30" roughness={0.6} metalness={0.4} /></mesh>
        <mesh position={[0,0.13,0.05]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[0.07,0.07,0.24,10]} /><meshStandardMaterial color="#8a2222" roughness={0.5} metalness={0.35} /></mesh>
        <mesh position={[0,0.17,-0.13]}><boxGeometry args={[0.16,0.15,0.12]} /><meshStandardMaterial color="#6a1a1a" roughness={0.55} metalness={0.3} /></mesh>
        <mesh position={[0,0.24,0.11]}><cylinderGeometry args={[0.026,0.034,0.13,8]} /><meshStandardMaterial color="#222" roughness={0.8} /></mesh>
        <mesh position={[0,0.13,0.2]}><sphereGeometry args={[0.03,8,8]} /><meshStandardMaterial color="#fff4c0" emissive="#ffe088" emissiveIntensity={3} roughness={0.1} /></mesh>
        <mesh position={[0,0.09,-0.05]}><boxGeometry args={[0.08,0.05,0.06]} /><meshStandardMaterial color="#ff5500" emissive="#ff6600" emissiveIntensity={2.4} roughness={0.3} /></mesh>
        {([[0.085,0.09],[-0.085,0.09],[0.085,-0.06],[-0.085,-0.06]] as [number,number][]).map(([x,z],i) => (
          <mesh key={i} position={[x,0.03,z]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.04,0.04,0.03,10]} /><meshStandardMaterial color="#151515" roughness={0.85} /></mesh>
        ))}
        <pointLight position={[0,0.2,0.15]} color="#ffcc66" intensity={0.5} distance={1.5} />
        <SteamPuffs />
      </group>
    </group>
  );
}

// ── Distant horizon (islas + barcos + puentes de luz que las conectan) ──────────
function DistantIsland({ pos, scale = 1, tint = "#22344e" }: { pos: [number,number,number]; scale?: number; tint?: string }) {
  return (
    <group position={pos} scale={scale}>
      <mesh position={[0,0.05,0]}><sphereGeometry args={[1,10,7,0,Math.PI*2,0,Math.PI/2]} /><meshStandardMaterial color={tint} roughness={0.98} flatShading /></mesh>
      <mesh position={[0,-0.35,0]}><cylinderGeometry args={[1.02,0.6,0.7,10]} /><meshStandardMaterial color={tint} roughness={0.98} flatShading /></mesh>
      <mesh position={[0.25,0.55,0.15]}><coneGeometry args={[0.32,0.8,7]} /><meshStandardMaterial color="#16303a" roughness={0.95} /></mesh>
      <mesh position={[-0.3,0.5,-0.1]}><coneGeometry args={[0.26,0.66,7]} /><meshStandardMaterial color="#132a34" roughness={0.95} /></mesh>
    </group>
  );
}
function DistantShip({ pos, rot = 0, scale = 1 }: { pos: [number,number,number]; rot?: number; scale?: number }) {
  return (
    <group position={pos} rotation={[0,rot,0]} scale={scale}>
      <mesh position={[0,0.12,0]}><boxGeometry args={[1.3,0.24,0.42]} /><meshStandardMaterial color="#2a3a50" roughness={0.9} /></mesh>
      <mesh position={[0.1,0.42,0]}><boxGeometry args={[0.5,0.42,0.32]} /><meshStandardMaterial color="#33445e" roughness={0.85} /></mesh>
      <mesh position={[-0.35,0.7,0]}><cylinderGeometry args={[0.04,0.04,0.6,6]} /><meshStandardMaterial color="#465a76" /></mesh>
      <mesh position={[-0.35,0.7,0]}><planeGeometry args={[0.44,0.5]} /><meshStandardMaterial color="#dfe6f0" emissive="#c8d4e4" emissiveIntensity={0.1} roughness={0.7} side={2} /></mesh>
    </group>
  );
}
// Puente de luz + bote lanzadera entre dos islas del fondo → sensación de interacción
function DistantLink({ a, b, color = "#4a6a90" }: { a: THREE.Vector3; b: THREE.Vector3; color?: string }) {
  const boat = useRef<THREE.Group>(null!);
  const geo = useMemo(() => {
    const mid = new THREE.Vector3().lerpVectors(a, b, 0.5); mid.y += 1.4;
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, mid, b]), 26, 0.05, 4, false);
  }, [a, b]);
  useEffect(() => () => geo.dispose(), [geo]);
  const heading = useMemo(() => Math.atan2(b.x - a.x, b.z - a.z), [a, b]);
  useFrame(({ clock }) => {
    if (!boat.current) return;
    const u = Math.sin(clock.elapsedTime * 0.11) * 0.5 + 0.5;
    boat.current.position.lerpVectors(a, b, u);
    boat.current.position.y = WATER_Y + 0.06;
    boat.current.rotation.y = heading + (Math.cos(clock.elapsedTime * 0.11) >= 0 ? 0 : Math.PI);
  });
  return (
    <group>
      <mesh geometry={geo}><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} transparent opacity={0.26} depthWrite={false} /></mesh>
      <group ref={boat} scale={1.9}>
        <mesh position={[0,0.1,0]}><boxGeometry args={[0.22,0.16,0.5]} /><meshStandardMaterial color="#2a3a50" roughness={0.85} /></mesh>
        <mesh position={[0,0.36,0]} rotation={[0,Math.PI/2,0]}><planeGeometry args={[0.34,0.4]} /><meshStandardMaterial color="#cfd8e6" emissive="#aebdd0" emissiveIntensity={0.15} roughness={0.7} side={2} /></mesh>
      </group>
    </group>
  );
}
function Horizon() {
  const { islands, ships, links } = useMemo(() => {
    const tints = ["#22344e","#1c2c44","#26384f","#1e3048","#243a52"];
    const specs: [number,number,number][] = [
      [18, 42, 1.7],[55, 48, 2.2],[92, 52, 2.6],[128, 46, 1.9],[165, 55, 2.7],
      [205, 44, 1.7],[240, 50, 2.3],[278, 47, 2.0],[312, 56, 2.8],[345, 45, 1.9],
    ];
    const isl = specs.map(([deg, rad, sc], i) => {
      const a = (deg * Math.PI) / 180;
      return { pos: new THREE.Vector3(Math.cos(a)*rad, WATER_Y - 0.3, Math.sin(a)*rad), scale: sc, tint: tints[i % tints.length] };
    });
    const shipSpecs: [number,number,number][] = [
      [40, 34, 1.1],[128, 38, 1.3],[210, 32, 1.0],[300, 36, 1.2],[350, 30, 0.9],[168, 40, 1.4],
    ];
    const ships = shipSpecs.map(([deg, rad, sc]) => {
      const a = (deg * Math.PI) / 180;
      return { pos: [Math.cos(a)*rad, WATER_Y + 0.05, Math.sin(a)*rad] as [number,number,number], rot: a + Math.PI/2, scale: sc };
    });
    const linkPairs: [number,number][] = [[0,1],[1,2],[5,6],[7,8],[3,4]];
    const links = linkPairs.map(([i,j]) => ({ a: isl[i].pos, b: isl[j].pos }));
    return { islands: isl, ships, links };
  }, []);
  return (
    <group>
      {islands.map((it, i) => <DistantIsland key={i} pos={[it.pos.x, it.pos.y, it.pos.z]} scale={it.scale} tint={it.tint} />)}
      {links.map((l, i) => <DistantLink key={i} a={l.a} b={l.b} />)}
      {ships.map((s, i) => <DistantShip key={i} {...s} />)}
    </group>
  );
}

// ── Objects ────────────────────────────────────────────────────────────────────

function VenestockObject({ variant, position, label, sub, grounded }: ObjProps) {
  const { hovered: h, handlers } = useHover();
  const fp = grounded ? FG : FS;
  const vTube = useMemo(() => {
    const sc = 0.038, cx = 30, cy = 31;
    const p1 = new THREE.Vector3((18-cx)*sc,-(18-cy)*sc,0);
    const p2 = new THREE.Vector3((30-cx)*sc,-(44-cy)*sc,0);
    const p3 = new THREE.Vector3((42-cx)*sc,-(18-cy)*sc,0);
    const path = new THREE.CurvePath<THREE.Vector3>();
    path.add(new THREE.LineCurve3(p1,p2)); path.add(new THREE.LineCurve3(p2,p3));
    return new THREE.TubeGeometry(path as unknown as THREE.Curve<THREE.Vector3>,30,0.056,8,false);
  }, []);
  const accentTube = useMemo(() => {
    const sc = 0.038, cx = 30, cy = 31;
    const p1 = new THREE.Vector3((30-cx)*sc,-(44-cy)*sc,0);
    const p2 = new THREE.Vector3((36-cx)*sc,-(31-cy)*sc,0);
    return new THREE.TubeGeometry(new THREE.LineCurve3(p1,p2) as unknown as THREE.Curve<THREE.Vector3>,8,0.04,8,false);
  }, []);
  return (
    <Float {...fp} position={position}>
      <group {...handlers}>
        <Html position={[0, 0.98, 0]} center distanceFactor={9} occlude={false} style={{ pointerEvents: "none", userSelect: "none" }}>
          <div style={{ whiteSpace: "nowrap", fontWeight: 800, fontSize: "18px", letterSpacing: "0.04em",
            background: "linear-gradient(90deg,#8ecbff,#c9b3ff)", WebkitBackgroundClip: "text", backgroundClip: "text",
            color: "transparent", textShadow: "0 0 22px rgba(120,170,255,0.5)" }}>Venestock</div>
        </Html>
        <mesh><boxGeometry args={[1.1,1.1,0.14]} /><meshStandardMaterial {...mc("venBg",variant,h)} /></mesh>
        <mesh geometry={vTube} position={[0,0,0.09]}><meshStandardMaterial {...mc("venV",variant,h)} /></mesh>
        <mesh geometry={accentTube} position={[0,0,0.09]}>
          <meshStandardMaterial color={h?"#ffffff":"#c0e8ff"} emissive="#ffffff" emissiveIntensity={h?4.5:2.0} roughness={0.1} />
        </mesh>
        <Tip h={h} label={label} sub={sub} y={-0.82} />
      </group>
    </Float>
  );
}

function PokeballObject({ variant, position, label, sub, grounded }: ObjProps) {
  const { hovered: h, handlers } = useHover(); const fp = grounded ? FG : FA; const r = 0.55;
  return (
    <Float {...fp} position={position}>
      <group {...handlers}>
        <mesh><sphereGeometry args={[r,32,16,0,Math.PI*2,0,Math.PI/2]} /><meshStandardMaterial {...mc("pokRed",variant,h)} /></mesh>
        <mesh><sphereGeometry args={[r,32,16,0,Math.PI*2,Math.PI/2,Math.PI/2]} /><meshStandardMaterial {...mc("pokWht",variant,h)} /></mesh>
        <mesh><torusGeometry args={[r,0.048,8,64]} /><meshStandardMaterial color="#111" roughness={0.9} /></mesh>
        <mesh position={[0,0,r-0.01]}><sphereGeometry args={[0.11,16,16]} /><meshStandardMaterial color={variant==="neon"?"#050505":"#ffffff"} emissive="#ffffff" emissiveIntensity={h?3.5:0.8} roughness={0.1} /></mesh>
        <Tip h={h} label={label} sub={sub} y={0.85} />
      </group>
    </Float>
  );
}

function TriforceObject({ variant, position, label, sub, grounded }: ObjProps) {
  const { hovered: h, handlers } = useHover(); const fp = grounded ? FG : FA;
  const shape = useMemo(() => { const sh = new THREE.Shape(); sh.moveTo(0,0.3); sh.lineTo(-0.26,-0.15); sh.lineTo(0.26,-0.15); sh.closePath(); return sh; }, []);
  const ext = useMemo(() => ({ depth:0.09, bevelEnabled:true, bevelSize:0.018, bevelThickness:0.018, bevelSegments:2 }), []);
  const mp = { ...mc("tri",variant,h), metalness:variant==="neon"?0.1:0.65, roughness:variant==="neon"?0.4:0.2 };
  return (
    <Float {...fp} position={position}>
      <group {...handlers}>
        {([[0,0.15],[-0.26,-0.30],[0.26,-0.30]] as [number,number][]).map(([x,y],i) => (
          <mesh key={i} position={[x,y,-0.045]}><extrudeGeometry args={[shape,ext]} /><meshStandardMaterial {...mp} /></mesh>
        ))}
        <Tip h={h} label={label} sub={sub} y={0.75} />
      </group>
    </Float>
  );
}

function MinecraftObject({ variant, position, label, sub, grounded }: ObjProps) {
  const { hovered: h, handlers } = useHover(); const fp = grounded ? FG : FA; const s = 0.76, hf = s/2;
  return (
    <Float {...fp} position={position}>
      <group {...handlers}>
        <mesh position={[0,hf,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[s,s]} /><meshStandardMaterial {...mc("mTop",variant,h)} side={2} /></mesh>
        <mesh position={[0,-hf,0]} rotation={[Math.PI/2,0,0]}><planeGeometry args={[s,s]} /><meshStandardMaterial color={variant==="neon"?"#060400":"#4a3728"} emissive="#5d3b2a" emissiveIntensity={h?0.6:0.1} roughness={0.9} side={2} /></mesh>
        <mesh position={[0,0,hf]}><planeGeometry args={[s,s]} /><meshStandardMaterial {...mc("mSide",variant,h)} side={2} /></mesh>
        <mesh position={[0,0,-hf]}><planeGeometry args={[s,s]} /><meshStandardMaterial {...mc("mSide",variant,h)} side={2} /></mesh>
        <mesh position={[hf,0,0]} rotation={[0,Math.PI/2,0]}><planeGeometry args={[s,s]} /><meshStandardMaterial {...mc("mSide",variant,h)} side={2} /></mesh>
        <mesh position={[-hf,0,0]} rotation={[0,-Math.PI/2,0]}><planeGeometry args={[s,s]} /><meshStandardMaterial {...mc("mSide",variant,h)} side={2} /></mesh>
        <Tip h={h} label={label} sub={sub} y={0.65} />
      </group>
    </Float>
  );
}

// Mochila escolar — "primera vez en high school"
function BackpackObject({ variant, position, label, sub, grounded }: ObjProps) {
  const { hovered: h, handlers } = useHover(); const fp = grounded ? FG : FA;
  const accent = variant === "neon" ? "#ff9500" : "#ffb300";
  return (
    <Float {...fp} position={position}>
      <group {...handlers}>
        {/* cuerpo */}
        <mesh><boxGeometry args={[0.6,0.78,0.34]} /><meshStandardMaterial {...mc("bag",variant,h)} /></mesh>
        {/* tapa superior */}
        <mesh position={[0,0.3,0.015]}><boxGeometry args={[0.62,0.3,0.36]} /><meshStandardMaterial {...mc("bag",variant,h)} /></mesh>
        {/* bolsillo frontal */}
        <mesh position={[0,-0.13,0.19]}><boxGeometry args={[0.42,0.34,0.06]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={h?0.9:0.25} roughness={0.6} /></mesh>
        {/* cierres (cremalleras) */}
        <mesh position={[0,-0.13,0.23]}><boxGeometry args={[0.34,0.02,0.02]} /><meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.3} /></mesh>
        <mesh position={[0,0.17,0.185]}><boxGeometry args={[0.5,0.02,0.02]} /><meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.3} /></mesh>
        {/* tiradores */}
        <mesh position={[0.13,0.17,0.2]}><sphereGeometry args={[0.03,8,8]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={h?2.2:0.7} /></mesh>
        <mesh position={[0.1,-0.13,0.25]}><sphereGeometry args={[0.025,8,8]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={h?2.2:0.7} /></mesh>
        {/* asa superior */}
        <mesh position={[0,0.47,0.02]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[0.07,0.02,8,16,Math.PI]} /><meshStandardMaterial color={accent} roughness={0.6} /></mesh>
        {/* correas */}
        <mesh position={[0.16,-0.02,-0.19]} rotation={[0.12,0,0]}><boxGeometry args={[0.09,0.72,0.03]} /><meshStandardMaterial color={accent} roughness={0.6} /></mesh>
        <mesh position={[-0.16,-0.02,-0.19]} rotation={[0.12,0,0]}><boxGeometry args={[0.09,0.72,0.03]} /><meshStandardMaterial color={accent} roughness={0.6} /></mesh>
        <Tip h={h} label={label} sub={sub} y={0.72} />
      </group>
    </Float>
  );
}

function WiiObject({ variant, position, label, sub, grounded }: ObjProps) {
  const { hovered: h, handlers } = useHover(); const fp = grounded ? FG : FA;
  return (
    <Float {...fp} position={position}>
      <group {...handlers}>
        <mesh><boxGeometry args={[0.28,1.4,0.22]} /><meshStandardMaterial {...mc("wii",variant,h)} /></mesh>
        <mesh position={[0,0.1,0.115]}><boxGeometry args={[0.18,0.025,0.02]} /><meshStandardMaterial color="#444" roughness={0.8} /></mesh>
        <mesh position={[0,0.42,0.115]}>
          <cylinderGeometry args={[0.028,0.028,0.018,10]} />
          <meshStandardMaterial color={variant==="neon"?"#001400":"#00aa00"} emissive="#00ff22" emissiveIntensity={h?5:1.8} roughness={0.1} />
        </mesh>
        <mesh position={[0,-0.3,0.115]}><boxGeometry args={[0.12,0.04,0.01]} /><meshStandardMaterial color="#666" roughness={0.7} /></mesh>
        <Tip h={h} label={label} sub={sub} y={0.95} />
      </group>
    </Float>
  );
}

function TruckObject({ variant, position, label, sub, grounded }: ObjProps) {
  const { hovered: h, handlers } = useHover(); const fp = grounded ? FG : FA;
  const wheels: [number,number,number][] = [[-0.55,-0.43,-0.28],[-0.55,-0.43,0.28],[0.25,-0.43,-0.28],[0.25,-0.43,0.28]];
  return (
    <Float {...fp} position={position}>
      <group {...handlers}>
        <mesh position={[0.3,0.1,0]}><boxGeometry args={[1.1,0.7,0.56]} /><meshStandardMaterial {...mc("trB",variant,h)} /></mesh>
        <mesh position={[-0.52,-0.05,0]}><boxGeometry args={[0.44,0.55,0.56]} /><meshStandardMaterial {...mc("trC",variant,h)} /></mesh>
        <mesh position={[-0.76,0.06,0]}>
          <boxGeometry args={[0.02,0.28,0.4]} />
          <meshStandardMaterial color={variant==="neon"?"#021016":"#aaddff"} emissive="#aaddff" emissiveIntensity={h?2:0.6} roughness={0.05} transparent opacity={0.85} />
        </mesh>
        {wheels.map((p,i) => <mesh key={i} position={p} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.14,0.14,0.08,16]} /><meshStandardMaterial color="#111" roughness={0.9} /></mesh>)}
        <Tip h={h} label={label} sub={sub} y={0.68} />
      </group>
    </Float>
  );
}

function PCObject({ variant, position, label, sub, grounded }: ObjProps) {
  const { hovered: h, handlers } = useHover(); const fp = grounded ? FG : FA;
  return (
    <Float {...fp} position={position}>
      <group {...handlers}>
        <mesh position={[-0.56,-0.05,0]}><boxGeometry args={[0.28,0.9,0.35]} /><meshStandardMaterial {...mc("pc",variant,h)} /></mesh>
        <mesh position={[-0.56,0.2,0.185]}><boxGeometry args={[0.22,0.025,0.02]} /><meshStandardMaterial color="#444" roughness={0.8} /></mesh>
        <mesh position={[-0.56,0.38,0.185]}>
          <cylinderGeometry args={[0.03,0.03,0.02,12]} />
          <meshStandardMaterial color={variant==="neon"?"#001400":"#00aa00"} emissive="#00ff22" emissiveIntensity={h?5:2} roughness={0.1} />
        </mesh>
        <mesh position={[0.2,-0.38,0]}><cylinderGeometry args={[0.04,0.08,0.25,8]} /><meshStandardMaterial color="#333" roughness={0.8} /></mesh>
        <mesh position={[0.2,0.1,0]}><boxGeometry args={[0.74,0.54,0.07]} /><meshStandardMaterial {...mc("pc",variant,h)} /></mesh>
        <mesh position={[0.2,0.1,0.04]}><boxGeometry args={[0.64,0.44,0.01]} /><meshStandardMaterial {...mc("pcSc",variant,h)} /></mesh>
        <Tip h={h} label={label} sub={sub} y={0.72} />
      </group>
    </Float>
  );
}

function DS3Object({ variant, position, label, sub, grounded }: ObjProps) {
  const { hovered: h, handlers } = useHover(); const fp = grounded ? FG : FA;
  return (
    <Float {...fp} position={position}>
      <group {...handlers} rotation={[0,Math.PI/10,0]}>
        <mesh position={[0,0.38,0]}><boxGeometry args={[0.82,0.5,0.06]} /><meshStandardMaterial {...mc("ds3",variant,h)} /></mesh>
        <mesh position={[0,0.38,0.035]}><boxGeometry args={[0.72,0.42,0.01]} /><meshStandardMaterial {...mc("ds3Sc",variant,h)} /></mesh>
        <mesh position={[0,-0.18,0.06]} rotation={[-0.3,0,0]}><boxGeometry args={[0.82,0.48,0.06]} /><meshStandardMaterial {...mc("ds3",variant,h)} /></mesh>
        <mesh position={[0,-0.28,0.12]} rotation={[-0.3,0,0]}><boxGeometry args={[0.72,0.34,0.01]} /><meshStandardMaterial {...mc("ds3Sc",variant,h)} /></mesh>
        <mesh position={[-0.27,-0.25,0.12]} rotation={[-0.3,0,0]}><cylinderGeometry args={[0.08,0.08,0.015,4]} /><meshStandardMaterial color="#222" roughness={0.8} /></mesh>
        <Tip h={h} label={label} sub={sub} y={0.82} />
      </group>
    </Float>
  );
}

// ── Animated arc (thinner + lower arc) ────────────────────────────────────────
function AnimatedArc({ from, to, color, delay }: { from: THREE.Vector3; to: THREE.Vector3; color: string; delay: number }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const geo = useMemo(() => {
    const mid = new THREE.Vector3().lerpVectors(from, to, 0.5);
    mid.y += from.distanceTo(to) * 0.30;
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([from, mid, to]), 80, 0.014, 5, false);
    g.setDrawRange(0, 0);
    return g;
  }, [from, to]);
  useEffect(() => () => geo.dispose(), [geo]);
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime - delay;
    if (t <= 0) return;
    meshRef.current.geometry.setDrawRange(0, Math.ceil(Math.min(1, t/2.5) * (meshRef.current.geometry.index?.count ?? 0)));
  });
  return (
    <mesh ref={meshRef} geometry={geo}>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} transparent opacity={0.72} depthWrite={false} />
    </mesh>
  );
}

// ── Ocean ──────────────────────────────────────────────────────────────────────
function Ocean() {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.07 + Math.sin(clock.elapsedTime * 0.35) * 0.015;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI/2,0,0]} position={[0,WATER_Y,0]}>
      <planeGeometry args={[240,240]} />
      <meshStandardMaterial color="#183860" emissive="#1a3d70" emissiveIntensity={0.07} metalness={0.65} roughness={0.06} transparent opacity={0.94} />
    </mesh>
  );
}

// ── Island base (natural low-poly) ─────────────────────────────────────────────
function IslandBase({ position, radius, topColor, topColor2, cliffColor, cliffColor2, sandColor, glowColor, label, year }: {
  position: [number,number,number]; radius: number;
  topColor: string; topColor2: string; cliffColor: string; cliffColor2: string;
  sandColor: string; glowColor: string; label: string; year: string;
}) {
  const seed = useMemo(() => position[0]*1.7 + position[2]*0.9 + 1, [position]);
  const grassGeo = useMemo(() => deformIsland(radius, radius*0.9, 0.5, seed+4, 15, 2, true), [radius, seed]);
  const rockGeo  = useMemo(() => deformIsland(radius*0.9, radius*0.3, 1.8, seed, 13, 5, false), [radius, seed]);
  const sandGeo  = useMemo(() => deformIsland(radius*1.0, radius*0.82, 0.32, seed+2, 15, 1, false), [radius, seed]);
  const bandGeo  = useMemo(() => deformIsland(radius*0.86, radius*0.72, 0.16, seed+7, 13, 1, false), [radius, seed]);
  useEffect(() => () => { grassGeo.dispose(); rockGeo.dispose(); sandGeo.dispose(); bandGeo.dispose(); }, [grassGeo, rockGeo, sandGeo, bandGeo]);
  return (
    <group position={position}>
      <mesh geometry={rockGeo} position={[0,-0.82,0]}><meshStandardMaterial color={cliffColor} roughness={0.96} flatShading /></mesh>
      <mesh geometry={bandGeo} position={[0,-0.18,0]}><meshStandardMaterial color={cliffColor2} roughness={0.92} flatShading /></mesh>
      <mesh geometry={sandGeo} position={[0,-0.44,0]}><meshStandardMaterial color={sandColor} roughness={0.9} flatShading /></mesh>
      <mesh geometry={grassGeo} position={[0,-0.03,0]}><meshStandardMaterial color={topColor} roughness={0.86} flatShading /></mesh>
      <mesh position={[0,0.24,0]}><cylinderGeometry args={[radius*0.48, radius*0.6, 0.05, 12]} /><meshStandardMaterial color={topColor2} roughness={0.84} flatShading /></mesh>
      <pointLight position={[0,-1.5,0]} color={glowColor} intensity={7} distance={5.5} />
      <Html position={[0, radius*0.28 + 1.9, 0]} center distanceFactor={8} occlude={false}>
        <div style={{ pointerEvents:"none", userSelect:"none", textAlign:"center", whiteSpace:"nowrap" }}>
          <div style={{ color:"#ffd700", fontSize:"22px", fontWeight:800, letterSpacing:"0.06em", lineHeight:1, textShadow:`0 0 20px rgba(255,215,0,0.55), 0 0 8px ${glowColor}` }}>{year}</div>
          <div style={{ color:"#fff", fontSize:"13px", fontWeight:700, marginTop:"4px", textShadow:"0 2px 10px rgba(0,0,0,0.95)" }}>{label}</div>
        </div>
      </Html>
    </group>
  );
}

// ── Island biomes ──────────────────────────────────────────────────────────────

function VenezuelaSavanna({ variant, lang }: { variant: Variant; lang: "en"|"es"; mode: Mode }) {
  const [cx, cy, cz] = [-5.5, 0, -1.0];
  return (
    <group>
      <IslandBase position={[cx,cy,cz]} radius={2.4}
        topColor="#c08028" topColor2="#a87020"
        cliffColor="#8a5c18" cliffColor2="#9a6822"
        sandColor="#d4b068" glowColor="#ff8822" year="2019" label="Venezuela" />
      <AcaciaTree pos={[cx-1.3, cy+0.19, cz+0.8]} s={0.9} />
      <AcaciaTree pos={[cx+1.0, cy+0.19, cz-1.6]} s={1.0} />
      <PalmTree   pos={[cx+0.8, cy+0.19, cz+1.4]} s={0.88} />
      <PalmTree   pos={[cx-1.8, cy+0.19, cz-0.4]} s={0.75} />
      <Rock pos={[cx+1.5, cy+0.19, cz+0.5]} r={0.8} s={1.0} />
      <Rock pos={[cx-0.8, cy+0.19, cz+1.6]} r={2.2} s={0.75} />
      <GrassTuft pos={[cx+0.4, cy+0.19, cz-0.8]} color="#b89020" />
      <GrassTuft pos={[cx-0.5, cy+0.19, cz+0.6]} color="#c8a028" />
      <GrassTuft pos={[cx+1.2, cy+0.19, cz-0.3]} color="#a88018" />
      <GrassTuft pos={[cx-1.4, cy+0.19, cz+0.2]} color="#b89020" />
      {/* Molino de viento (interactivo) */}
      <Windmill pos={[cx-1.4, cy+0.19, cz-1.35]} s={0.82} />
      <Lantern pos={[cx+1.6, cy+0.19, cz-0.6]} color="#ff9944" />
      <Lantern pos={[cx-1.0, cy+0.19, cz+1.5]} color="#ff9944" />
      <Lantern pos={[cx+0.2, cy+0.19, cz-1.8]} color="#ff9944" />
      <WiiObject variant={variant} position={[cx-0.3, cy+0.88, cz-0.2]} label="Nintendo Wii / Wii U" sub={lang==="en"?"First consoles":"Primeras consolas"} grounded />
      <DS3Object variant={variant} position={[cx+1.0, cy+0.68, cz+0.4]} label="Nintendo 3DS"          sub={lang==="en"?"Handheld gaming":"Gaming portátil"}   grounded />
      <PCObject  variant={variant} position={[cx-1.1, cy+0.62, cz-1.0]} label="Primera PC"             sub={lang==="en"?"2021 · Where code began":"2021 · El inicio del código"} grounded />
    </group>
  );
}

function HoustonPlains({ variant, lang, mode }: { variant: Variant; lang: "en"|"es"; mode: Mode }) {
  const [cx, cy, cz] = [-1.5, 0, 5.0];
  return (
    <group>
      <IslandBase position={[cx,cy,cz]} radius={2.0}
        topColor="#6a8040" topColor2="#5a7032"
        cliffColor="#4a6028" cliffColor2="#587030"
        sandColor="#c8b478" glowColor="#88dd44" year="2023" label="Houston" />
      <Rock pos={[cx-1.1, cy+0.19, cz+0.8]} r={0.8} s={1.15} />
      <Rock pos={[cx+0.8, cy+0.19, cz-0.9]} r={2.1} s={0.85} />
      <Rock pos={[cx-1.4, cy+0.19, cz-0.5]} r={1.4} s={0.9} />
      <Rock pos={[cx+0.3, cy+0.19, cz+1.2]} r={3.0} s={0.7} />
      <GrassTuft pos={[cx+1.2, cy+0.19, cz+0.4]} color="#88aa40" />
      <GrassTuft pos={[cx-0.4, cy+0.19, cz+0.9]} color="#7aa038" />
      <GrassTuft pos={[cx+0.6, cy+0.19, cz-1.0]} color="#88aa40" />
      {/* Balancín petrolero (interactivo) */}
      <Pumpjack pos={[cx+0.65, cy+0.19, cz+1.05]} s={0.72} />
      <Lantern pos={[cx+1.4, cy+0.19, cz-0.5]} color="#aae855" />
      <Lantern pos={[cx-1.5, cy+0.19, cz+0.4]} color="#aae855" />
      <Lantern pos={[cx+0.0, cy+0.19, cz+1.6]} color="#aae855" />
      <BackpackObject variant={variant} position={[cx-0.7, cy+0.62, cz+0.4]} label="High School" sub={lang==="en"?"First time in high school":"Primera vez en high school"} grounded />
      {mode === "personal" && <PokeballObject variant={variant} position={[cx+0.8, cy+0.73, cz-0.3]} label="Pokémon" sub={lang==="en"?"A saga that shaped me":"Saga que me marcó"} />}
    </group>
  );
}

function OrlandoSpring({ variant, lang, mode }: { variant: Variant; lang: "en"|"es"; mode: Mode }) {
  const [cx, cy, cz] = [4.0, 0, 4.0];
  const flowers: [number,number,number][] = [
    [cx-0.5,cy+0.2,cz-0.4],[cx+0.8,cy+0.2,cz+0.6],[cx-1.0,cy+0.2,cz+0.8],
    [cx+1.4,cy+0.2,cz-0.2],[cx+0.1,cy+0.2,cz+1.5],[cx-1.3,cy+0.2,cz-0.8],
    [cx+1.0,cy+0.2,cz+1.3],[cx-0.3,cy+0.2,cz-1.3],[cx+1.6,cy+0.2,cz+0.8],
    [cx+0.5,cy+0.2,cz-0.9],[cx-0.8,cy+0.2,cz+0.3],[cx+1.2,cy+0.2,cz+0.2],
  ];
  const flC = ["#ff6688","#ffaacc","#ff88aa","#ff55aa","#ffbbdd","#ff9999","#ffddee","#ff6699","#ffccdd","#ff77bb","#ffaabb","#ff88cc"];
  return (
    <group>
      <IslandBase position={[cx,cy,cz]} radius={2.2}
        topColor="#3a9428" topColor2="#2a7c1a"
        cliffColor="#286020" cliffColor2="#347028"
        sandColor="#c8b888" glowColor="#ff88cc" year="2025" label="Orlando" />
      <CherryTree pos={[cx+0.9, cy+0.19, cz-1.1]} s={1.0} />
      <CherryTree pos={[cx-1.4, cy+0.19, cz+0.4]} s={0.88} />
      <CherryTree pos={[cx+0.2, cy+0.19, cz+1.6]} s={0.95} />
      {flowers.map((p,i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.065,6,4]} />
          <meshStandardMaterial color={flC[i]} emissive={flC[i]} emissiveIntensity={0.28} />
        </mesh>
      ))}
      {/* Rueda de la fortuna (interactivo) */}
      <FerrisWheel pos={[cx-0.5, cy+0.19, cz+0.9]} s={0.82} />
      <Lantern pos={[cx+1.6, cy+0.19, cz+0.3]} color="#ff99dd" />
      <Lantern pos={[cx-1.0, cy+0.19, cz-1.4]} color="#ff99dd" />
      <Lantern pos={[cx-1.5, cy+0.19, cz+1.0]} color="#ff99dd" />
      <TruckObject variant={variant} position={[cx+0.5, cy+0.52, cz-0.1]} label={lang==="en"?"2025 — The move":"2025 — La mudanza"} sub="Houston → Orlando, FL" grounded />
      {mode === "personal" && <MinecraftObject variant={variant} position={[cx-1.2, cy+0.57, cz-1.1]} label="Minecraft" sub={lang==="en"?"Worlds without limits":"Mundos sin límites"} grounded />}
    </group>
  );
}

function VenestockMountain({ variant, lang, mode }: { variant: Variant; lang: "en"|"es"; mode: Mode }) {
  const [cx, cy, cz] = [4.5, 0, -2.0];
  const iTop = cy + 0.175;
  return (
    <group>
      <IslandBase position={[cx,cy,cz]} radius={2.3}
        topColor="#8a8a9a" topColor2="#747488"
        cliffColor="#6a6a7a" cliffColor2="#787888"
        sandColor="#aaaabc" glowColor="#aaaaff" year="2025" label="Venestock" />
      <mesh position={[cx, iTop+1.5, cz]}>
        <coneGeometry args={[1.45,3.0,12]} />
        <meshStandardMaterial color="#7a7a8a" roughness={0.86} flatShading />
      </mesh>
      <mesh position={[cx, iTop+0.8, cz]}>
        <coneGeometry args={[0.9,0.8,10]} />
        <meshStandardMaterial color="#6a6a7c" roughness={0.88} flatShading />
      </mesh>
      <mesh position={[cx, iTop+3.05, cz]}>
        <coneGeometry args={[0.58,1.15,12]} />
        <meshStandardMaterial color="#e8eaff" emissive="#ffffff" emissiveIntensity={0.12} roughness={0.58} flatShading />
      </mesh>
      <mesh position={[cx, iTop+2.55, cz]}>
        <cylinderGeometry args={[0.6,0.58,0.08,12]} />
        <meshStandardMaterial color="#dde0ff" emissive="#ffffff" emissiveIntensity={0.08} roughness={0.65} />
      </mesh>
      <mesh position={[cx+0.95, iTop+0.5, cz+0.65]}>
        <coneGeometry args={[0.58,1.3,10]} />
        <meshStandardMaterial color="#82829a" roughness={0.86} flatShading />
      </mesh>
      <mesh position={[cx-0.9, iTop+0.35, cz-0.55]}>
        <coneGeometry args={[0.5,1.05,10]} />
        <meshStandardMaterial color="#82829a" roughness={0.86} flatShading />
      </mesh>
      {/* Tren cremallera subiendo a la cima */}
      <MountainTrain cx={cx} cz={cz} base={iTop + 0.05} />
      <PineTree pos={[cx-1.85, iTop, cz+0.65]} snow s={0.85} />
      <PineTree pos={[cx+1.05, iTop, cz+1.65]} snow s={0.78} />
      <PineTree pos={[cx-1.0,  iTop, cz-1.65]} snow s={0.82} />
      <Lantern pos={[cx+1.8, iTop, cz-0.4]} color="#ccccff" />
      <Lantern pos={[cx-1.6, iTop, cz+0.8]} color="#ccccff" />
      <Lantern pos={[cx+0.2, iTop, cz+1.9]} color="#ccccff" />
      <Sparkles count={70} scale={7} size={0.9} speed={0.22} opacity={0.55} color="#cce4ff" position={[cx, iTop+2, cz]} />
      <VenestockObject variant={variant} position={[cx, iTop+3.9, cz]}         label="Venestock"          sub={lang==="en"?"2025 — My SaaS company":"2025 — Mi empresa SaaS"} />
      {mode === "personal" && <TriforceObject variant={variant} position={[cx+1.7, iTop+1.85, cz-0.4]} label="The Legend of Zelda" sub={lang==="en"?"The epic saga":"La saga épica"} />}
    </group>
  );
}

// ── Flying airplane (mejor proporción + textura) ───────────────────────────────
function FlyingAirplane({ variant, lang }: { variant: Variant; lang: "en"|"es" }) {
  const outerRef = useRef<THREE.Group>(null!);
  const propRef = useRef<THREE.Mesh>(null!);
  const [h, setH] = useState(false);
  const body = { ...mc("plane",variant,h), metalness:0.72, roughness:0.22 };
  const accentColor = variant === "neon" ? "#6c63ff" : "#e8483c";
  const accent = { color: accentColor, emissive: accentColor, emissiveIntensity: h?1.4:0.5, metalness:0.5, roughness:0.3 };
  useEffect(() => { document.body.style.cursor = h?"pointer":""; return () => { document.body.style.cursor=""; }; }, [h]);
  useFrame(({ clock }) => {
    if (outerRef.current) {
      const t = clock.elapsedTime * 0.2;
      outerRef.current.position.set(Math.cos(t)*9.8, 6.1, Math.sin(t)*9.8);
      outerRef.current.rotation.y = -(t + Math.PI/2);
    }
    if (propRef.current) propRef.current.rotation.x += 0.6;
  });
  return (
    <group ref={outerRef}>
      <group
        rotation={[0.05,0,0.14]}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setH(true); }}
        onPointerOut={() => setH(false)}
      >
        <mesh rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.12,0.12,1.5,16]} /><meshStandardMaterial {...body} /></mesh>
        <mesh position={[1.0,0,0]} rotation={[0,0,-Math.PI/2]}><coneGeometry args={[0.12,0.55,16]} /><meshStandardMaterial {...body} /></mesh>
        <mesh position={[-1.02,0,0]} rotation={[0,0,Math.PI/2]}><coneGeometry args={[0.12,0.5,16]} /><meshStandardMaterial {...body} /></mesh>
        <mesh rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.122,0.122,0.16,16]} /><meshStandardMaterial {...accent} /></mesh>
        <mesh position={[1.28,0,0]} rotation={[0,0,-Math.PI/2]}><coneGeometry args={[0.055,0.14,12]} /><meshStandardMaterial color="#222" metalness={0.6} roughness={0.3} /></mesh>
        <mesh ref={propRef} position={[1.3,0,0]}>
          <boxGeometry args={[0.02,0.62,0.05]} /><meshStandardMaterial color="#1a1a1a" roughness={0.5} />
        </mesh>
        <mesh position={[0.5,0.11,0]}><boxGeometry args={[0.34,0.09,0.16]} /><meshStandardMaterial color={variant==="neon"?"#001420":"#9fd6ff"} emissive="#aaddff" emissiveIntensity={h?2.2:0.9} roughness={0.05} metalness={0.2} /></mesh>
        <mesh position={[0.05,-0.04,0]}><boxGeometry args={[0.62,0.045,2.7]} /><meshStandardMaterial {...body} /></mesh>
        <mesh position={[-0.05,-0.045,0]}><boxGeometry args={[0.14,0.05,2.72]} /><meshStandardMaterial {...accent} /></mesh>
        <mesh position={[0.05,0.03,1.36]} rotation={[0.5,0,0]}><boxGeometry args={[0.4,0.16,0.04]} /><meshStandardMaterial {...body} /></mesh>
        <mesh position={[0.05,0.03,-1.36]} rotation={[-0.5,0,0]}><boxGeometry args={[0.4,0.16,0.04]} /><meshStandardMaterial {...body} /></mesh>
        <mesh position={[0.12,-0.16,0.72]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.075,0.075,0.34,12]} /><meshStandardMaterial {...body} /></mesh>
        <mesh position={[0.12,-0.16,-0.72]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.075,0.075,0.34,12]} /><meshStandardMaterial {...body} /></mesh>
        <mesh position={[0.3,-0.16,0.72]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.08,0.08,0.03,12]} /><meshStandardMaterial color="#ff6a2a" emissive="#ff6a2a" emissiveIntensity={h?3:1.6} roughness={0.1} /></mesh>
        <mesh position={[0.3,-0.16,-0.72]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.08,0.08,0.03,12]} /><meshStandardMaterial color="#ff6a2a" emissive="#ff6a2a" emissiveIntensity={h?3:1.6} roughness={0.1} /></mesh>
        <mesh position={[-0.95,0.26,0]}><boxGeometry args={[0.42,0.44,0.045]} /><meshStandardMaterial {...accent} /></mesh>
        <mesh position={[-0.98,0.05,0]}><boxGeometry args={[0.34,0.04,0.95]} /><meshStandardMaterial {...body} /></mesh>
        <mesh position={[-0.05,-0.04,1.37]}><sphereGeometry args={[0.035,8,8]} /><meshStandardMaterial color="#ff3020" emissive="#ff3020" emissiveIntensity={h?4:2} roughness={0.1} /></mesh>
        <mesh position={[-0.05,-0.04,-1.37]}><sphereGeometry args={[0.035,8,8]} /><meshStandardMaterial color="#20ff40" emissive="#20ff40" emissiveIntensity={h?4:2} roughness={0.1} /></mesh>
        {h && (
          <Html position={[0,1.7,0]} center style={{ pointerEvents:"none", userSelect:"none" }}>
            <div style={{ background:"rgba(8,8,14,0.93)", border:"1px solid rgba(108,99,255,0.5)", borderRadius:"12px", padding:"8px 14px", whiteSpace:"nowrap" }}>
              <p style={{ color:"#6c63ff", fontSize:"10px", fontWeight:800, textTransform:"uppercase", letterSpacing:"0.12em", margin:0 }}>
                {lang==="en"?"2023 — The flight":"2023 — El vuelo"}
              </p>
              <p style={{ color:"rgba(232,232,232,0.7)", fontSize:"11px", margin:"4px 0 0" }}>Venezuela → Houston, TX</p>
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

// ── World ──────────────────────────────────────────────────────────────────────
function WorldGroup({ variant, lang, mode }: { variant: Variant; lang: "en"|"es"; mode: Mode }) {
  const { scene } = useThree();
  const neon = variant === "neon";

  useEffect(() => {
    const bg = neon ? "#050608" : "#060910";
    scene.background = new THREE.Color(bg);
    scene.fog = new THREE.Fog(bg, 34, 82);
    return () => { scene.fog = null; };
  }, [scene, neon]);

  const islands = useMemo(() => ([
    { cx: -5.5, cz: -1.0, r: 2.4 },
    { cx: -1.5, cz:  5.0, r: 2.0 },
    { cx:  4.0, cz:  4.0, r: 2.2 },
    { cx:  4.5, cz: -2.0, r: 2.3 },
  ]), []);

  // Carriles concéntricos: cada bote en su propio radio → nunca se solapan
  const boatLanes = useMemo(() => {
    const make = (R: number, amp: number, ph: number, wobFreq: number) => {
      const n = 40, pts: THREE.Vector3[] = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const rr = R + Math.sin(a * wobFreq + ph) * amp;
        pts.push(new THREE.Vector3(HUB_X + Math.cos(a) * rr, WATER_Y + 0.04, HUB_Z + Math.sin(a) * rr));
      }
      return new THREE.CatmullRomCurve3(pts, true, "catmullrom", 0.3);
    };
    return [
      make(8.4,  0.5, 0.0, 3),
      make(9.7,  0.7, 1.4, 2),
      make(11.0, 0.6, 3.1, 4),
      make(12.3, 0.8, 5.0, 3),
    ];
  }, []);

  const arcPts = useMemo(() => ({
    vz:  new THREE.Vector3(-5.5, 0.19, -1.0),
    hou: new THREE.Vector3(-1.5, 0.19,  5.0),
    orl: new THREE.Vector3( 4.0, 0.19,  4.0),
    ven: new THREE.Vector3( 4.5, 0.19, -2.0),
  }), []);

  return (
    <>
      <OrbitControls
        autoRotate
        autoRotateSpeed={0.7}
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 5.5}
        maxPolarAngle={Math.PI / 2.15}
        target={[0, 0.5, 1.5]}
      />
      {/* Cielo — tres capas de estrellas, más densas hacia el horizonte */}
      <Stars radius={95}  depth={90}  count={8000} factor={3.4} saturation={0}    fade speed={0.15} />
      <Stars radius={200} depth={60}  count={3200} factor={1.5} saturation={0.12} fade speed={0.08} />
      <Stars radius={140} depth={25}  count={3600} factor={2.2} saturation={0.05} fade speed={0.05} />
      <Ocean />
      <Horizon />
      <OuterScatter />
      <Lighthouse pos={[0.3, 0, 1.4]} />
      <VenezuelaSavanna  variant={variant} lang={lang} mode={mode} />
      <HoustonPlains     variant={variant} lang={lang} mode={mode} />
      <OrlandoSpring     variant={variant} lang={lang} mode={mode} />
      <VenestockMountain variant={variant} lang={lang} mode={mode} />
      {/* Muelles */}
      {islands.map((it, i) => <Dock key={i} {...it} />)}
      {/* Botes en el anillo exterior */}
      <Boat curve={boatLanes[0]} speed={0.021} phase={0.0}  scale={1.5} sail="#ffe8c0" hull="#8a5a2a" />
      <Boat curve={boatLanes[1]} speed={0.017} phase={0.35} scale={1.7} sail="#c0e0ff" hull="#7a4a24" />
      <Boat curve={boatLanes[2]} speed={0.024} phase={0.6}  scale={1.6} sail="#ffd0e0" hull="#6a4420" />
      <Boat curve={boatLanes[3]} speed={0.015} phase={0.85} scale={1.8} sail="#d0ffd8" hull="#7a5228" />
      <AnimatedArc from={arcPts.vz}  to={arcPts.hou} color={neon?"#6c63ff":"#ffaa44"} delay={1.2} />
      <AnimatedArc from={arcPts.hou} to={arcPts.orl} color={neon?"#5eb3ff":"#44ccff"} delay={3.4} />
      <AnimatedArc from={arcPts.orl} to={arcPts.ven} color={neon?"#a855f7":"#88ff44"} delay={5.6} />
      <FlyingAirplane variant={variant} lang={lang} />
      <ambientLight intensity={neon?0.07:0.28} />
      <directionalLight position={[8,18,6]} intensity={neon?0.55:1.0} />
      <pointLight position={[0,14,0]} color={neon?"#4444ff":"#fffbe8"} intensity={neon?0.35:0.65} distance={45} />
    </>
  );
}

// ── Canvas ─────────────────────────────────────────────────────────────────────
export default function StoryScene({
  variant,
  lang = "en",
  mode = "personal",
  fov = 56,
  camPos = [0, 7.5, 17],
}: {
  variant: Variant;
  lang?: "en" | "es";
  mode?: Mode;
  fov?: number;
  camPos?: [number, number, number];
}) {
  return (
    <Canvas camera={{ position: camPos, fov, near:0.1, far:260 }} style={{ width:"100%", height:"100%" }} dpr={[1,1.5]} gl={{ antialias:true }}>
      <WorldGroup variant={variant} lang={lang} mode={mode} />
    </Canvas>
  );
}
