"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Float, Stars, Html, Sparkles, Grid } from "@react-three/drei";
import * as THREE from "three";

// ── Types ──────────────────────────────────────────────────────────────
export type Variant = "neon" | "pop";

type ObjProps = {
  variant: Variant;
  position: [number, number, number];
  label: string;
  sub: string;
  grounded?: boolean;
};

// ── Colors [base, emissive, emissiveIntensity] ─────────────────────────
const COLORS = {
  venBg:   { neon: ["#0d1219","#5eb3ff",0.25] as const, pop: ["#1e2a3a","#5eb3ff",0.15] as const },
  venV:    { neon: ["#0a1a2e","#5eb3ff",2.5]  as const, pop: ["#5eb3ff","#9be0ff",0.5]  as const },
  pokRed:  { neon: ["#0d0000","#ff2222",2.0]  as const, pop: ["#cc0000","#ff6666",0.3]  as const },
  pokWht:  { neon: ["#050505","#ffffff",0.5]  as const, pop: ["#f0f0f0","#ffffff",0.15] as const },
  tri:     { neon: ["#1a1200","#ffd700",2.5]  as const, pop: ["#ffd700","#ffcc00",0.4]  as const },
  mTop:    { neon: ["#0a1400","#4caf50",2.0]  as const, pop: ["#4a8a1a","#6dcf30",0.35] as const },
  mSide:   { neon: ["#150d05","#8B6914",0.6]  as const, pop: ["#8B6914","#a07820",0.2]  as const },
  phone:   { neon: ["#0a0a12","#6c63ff",0.5]  as const, pop: ["#1a1a2e","#6c63ff",0.25] as const },
  phoneSc: { neon: ["#020a14","#5eb3ff",3.0]  as const, pop: ["#1a3a6a","#5eb3ff",0.9]  as const },
  wii:     { neon: ["#0a0a0a","#ddddcc",0.4]  as const, pop: ["#e0ddd0","#ffffff",0.1]  as const },
  plane:   { neon: ["#0a0a12","#aaccff",1.5]  as const, pop: ["#c0c8d8","#ddeeff",0.25] as const },
  trB:     { neon: ["#0a0800","#ff9500",2.0]  as const, pop: ["#f5a623","#ff9500",0.3]  as const },
  trC:     { neon: ["#080600","#ff7700",1.5]  as const, pop: ["#e8920a","#ff8800",0.25] as const },
  pc:      { neon: ["#080808","#33ffaa",0.6]  as const, pop: ["#2a2a2a","#44cc88",0.2]  as const },
  pcSc:    { neon: ["#010a06","#00ff88",3.5]  as const, pop: ["#003320","#00ff88",1.0]  as const },
  ds3:     { neon: ["#05050a","#ff66cc",1.2]  as const, pop: ["#1a1a2e","#ff88dd",0.35] as const },
  ds3Sc:   { neon: ["#020008","#9966ff",3.0]  as const, pop: ["#0d0020","#cc88ff",0.9]  as const },
} satisfies Record<string, Record<"neon"|"pop", readonly [string,string,number]>>;

type CK = keyof typeof COLORS;
function mc(key: CK, v: Variant, hovered = false) {
  const [color, emissive, ei] = COLORS[key][v];
  return { color, emissive, emissiveIntensity: ei * (hovered ? 2.2 : 1), roughness: 0.3, metalness: v === "neon" ? 0.2 : 0.1 };
}

// ── Hover ──────────────────────────────────────────────────────────────
function useHover() {
  const [hovered, set] = useState(false);
  useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : "";
    return () => { document.body.style.cursor = ""; };
  }, [hovered]);
  return {
    hovered,
    handlers: {
      onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); set(true); },
      onPointerOut: () => set(false),
    },
  };
}

// ── Tooltip ────────────────────────────────────────────────────────────
function Tooltip({ hovered, label, sub, yOff = 1.0 }: {
  hovered: boolean; label: string; sub: string; yOff?: number;
}) {
  if (!hovered) return null;
  return (
    <Html position={[0, yOff, 0]} center style={{ pointerEvents: "none", userSelect: "none" }}>
      <div style={{
        background: "rgba(10,10,15,0.9)", border: "1px solid rgba(108,99,255,0.5)",
        borderRadius: "12px", padding: "8px 14px", backdropFilter: "blur(12px)",
        whiteSpace: "nowrap", boxShadow: "0 4px 24px rgba(108,99,255,0.22)",
      }}>
        <p style={{ color: "#6c63ff", fontSize: "10px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>{label}</p>
        <p style={{ color: "rgba(232,232,232,0.72)", fontSize: "11px", margin: "4px 0 0" }}>{sub}</p>
      </div>
    </Html>
  );
}

// ── Float presets ──────────────────────────────────────────────────────
const FG = { speed: 0.5,  floatIntensity: 0.07, rotationIntensity: 0.04 }; // grounded
const FA = { speed: 1.4,  floatIntensity: 0.45, rotationIntensity: 0.25 }; // aerial
const FS = { speed: 1.0,  floatIntensity: 0.55, rotationIntensity: 0.08 }; // special

// ── Camera path (start z=30 → end z=-38) ──────────────────────────────
const CAM_PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(  0,   6.5, 32),
  new THREE.Vector3(-0.8,  3.5, 22),
  new THREE.Vector3(-1.4,  2.0, 15),  // Ch1 view
  new THREE.Vector3(-0.6,  2.4, 10),
  new THREE.Vector3( 0.8,  3.0,  5),
  new THREE.Vector3( 0.6,  2.5,  0),  // Ch2 view
  new THREE.Vector3(-0.2,  2.2, -5),
  new THREE.Vector3(-1.0,  2.0,-12),  // Ch3 view
  new THREE.Vector3(-0.4,  2.0,-17),
  new THREE.Vector3( 0.6,  2.0,-24),  // Ch4 view
  new THREE.Vector3( 0.2,  2.5,-30),
  new THREE.Vector3( 0,    2.5,-37),  // Ch5 view
]);

const LOOKAT_PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(  0,  0.5, 18),
  new THREE.Vector3(-0.4, 0.5, 11),
  new THREE.Vector3(-0.5, 0.2,  7),
  new THREE.Vector3( 0,   0.5,  3),
  new THREE.Vector3( 0,   1.8,  2),   // look up at airplane
  new THREE.Vector3( 0,   0.5, -3),
  new THREE.Vector3(-0.4, 0.5,-10),
  new THREE.Vector3( 0,   0.5,-15),
  new THREE.Vector3( 0.3, 0.5,-22),
  new THREE.Vector3( 0,   0.5,-28),
  new THREE.Vector3( 0,   1.0,-34),   // look at Venestock
  new THREE.Vector3( 0,   0.8,-42),
]);

// ── Chapter data ───────────────────────────────────────────────────────
type Chapter = { z: number; year: string; title: string; sub: string };

const CHAPTERS: Record<"en"|"es", Chapter[]> = {
  en: [
    { z: 14,  year: "2019",      title: "Venezuela",   sub: "Punto Fijo, Falcón"     },
    { z:  2,  year: "2021",      title: "The Flight",  sub: "Venezuela → Houston"    },
    { z: -10, year: "2021",      title: "Houston",     sub: "Texas, USA"             },
    { z: -22, year: "2023",      title: "Orlando",     sub: "Florida, USA"           },
    { z: -34, year: "2025–26",   title: "Building",    sub: "Venestock & beyond"     },
  ],
  es: [
    { z: 14,  year: "2019",      title: "Venezuela",   sub: "Punto Fijo, Falcón"     },
    { z:  2,  year: "2021",      title: "El Vuelo",    sub: "Venezuela → Houston"    },
    { z: -10, year: "2021",      title: "Houston",     sub: "Texas, EE.UU."          },
    { z: -22, year: "2023",      title: "Orlando",     sub: "Florida, EE.UU."        },
    { z: -34, year: "2025–26",   title: "Construyendo",sub: "Venestock y más"        },
  ],
};

// ── Chapter label ──────────────────────────────────────────────────────
function ChapterLabel({ z, year, title, sub, xOff = -4 }: Chapter & { xOff?: number }) {
  return (
    <Html position={[xOff, 3.4, z]} distanceFactor={10} occlude={false}>
      <div style={{ pointerEvents: "none", userSelect: "none", whiteSpace: "nowrap" }}>
        <div style={{ color: "#ffd700", fontSize: "30px", fontWeight: 800, letterSpacing: "0.05em", textShadow: "0 0 22px rgba(255,215,0,0.55)", lineHeight: 1 }}>{year}</div>
        <div style={{ color: "#fff", fontSize: "18px", fontWeight: 700, marginTop: "4px", textShadow: "0 2px 12px rgba(0,0,0,0.95)" }}>{title}</div>
        <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "12px", marginTop: "3px" }}>{sub}</div>
      </div>
    </Html>
  );
}

// ── Object components ──────────────────────────────────────────────────

function VenestockObject({ variant, position, label, sub, grounded }: ObjProps) {
  const { hovered, handlers } = useHover();
  const fp = grounded ? FG : FS;

  const vTube = useMemo(() => {
    const s = 0.038; const cx = 30; const cy = 31;
    const p1 = new THREE.Vector3((18-cx)*s, -(18-cy)*s, 0);
    const p2 = new THREE.Vector3((30-cx)*s, -(44-cy)*s, 0);
    const p3 = new THREE.Vector3((42-cx)*s, -(18-cy)*s, 0);
    const path = new THREE.CurvePath<THREE.Vector3>();
    path.add(new THREE.LineCurve3(p1, p2));
    path.add(new THREE.LineCurve3(p2, p3));
    return new THREE.TubeGeometry(path as unknown as THREE.Curve<THREE.Vector3>, 30, 0.056, 8, false);
  }, []);

  const accentTube = useMemo(() => {
    const s = 0.038; const cx = 30; const cy = 31;
    const p1 = new THREE.Vector3((30-cx)*s, -(44-cy)*s, 0);
    const p2 = new THREE.Vector3((36-cx)*s, -(31-cy)*s, 0);
    return new THREE.TubeGeometry(new THREE.LineCurve3(p1, p2) as unknown as THREE.Curve<THREE.Vector3>, 8, 0.04, 8, false);
  }, []);

  return (
    <Float {...fp} position={position}>
      <group {...handlers}>
        <mesh><boxGeometry args={[1.1, 1.1, 0.14]} /><meshStandardMaterial {...mc("venBg", variant, hovered)} /></mesh>
        <mesh geometry={vTube} position={[0, 0, 0.09]}><meshStandardMaterial {...mc("venV", variant, hovered)} /></mesh>
        <mesh geometry={accentTube} position={[0, 0, 0.09]}>
          <meshStandardMaterial color={hovered ? "#ffffff" : "#c0e8ff"} emissive="#ffffff" emissiveIntensity={hovered ? 4.5 : 2.0} roughness={0.1} />
        </mesh>
        <Tooltip hovered={hovered} label={label} sub={sub} yOff={0.82} />
      </group>
    </Float>
  );
}

function PokeballObject({ variant, position, label, sub, grounded }: ObjProps) {
  const { hovered, handlers } = useHover();
  const fp = grounded ? FG : FA;
  const r = 0.55;
  return (
    <Float {...fp} position={position}>
      <group {...handlers}>
        <mesh><sphereGeometry args={[r, 32, 16, 0, Math.PI*2, 0, Math.PI/2]} /><meshStandardMaterial {...mc("pokRed", variant, hovered)} /></mesh>
        <mesh><sphereGeometry args={[r, 32, 16, 0, Math.PI*2, Math.PI/2, Math.PI/2]} /><meshStandardMaterial {...mc("pokWht", variant, hovered)} /></mesh>
        <mesh><torusGeometry args={[r, 0.048, 8, 64]} /><meshStandardMaterial color="#111" roughness={0.9} /></mesh>
        <mesh position={[0, 0, r-0.01]}>
          <sphereGeometry args={[0.11, 16, 16]} />
          <meshStandardMaterial color={variant==="neon"?"#050505":"#ffffff"} emissive="#ffffff" emissiveIntensity={hovered?3.5:0.8} roughness={0.1} />
        </mesh>
        <Tooltip hovered={hovered} label={label} sub={sub} yOff={0.85} />
      </group>
    </Float>
  );
}

function TriforceObject({ variant, position, label, sub, grounded }: ObjProps) {
  const { hovered, handlers } = useHover();
  const fp = grounded ? FG : FA;
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0.3); s.lineTo(-0.26, -0.15); s.lineTo(0.26, -0.15); s.closePath();
    return s;
  }, []);
  const ext = useMemo(() => ({ depth: 0.09, bevelEnabled: true, bevelSize: 0.018, bevelThickness: 0.018, bevelSegments: 2 }), []);
  const matProps = { ...mc("tri", variant, hovered), metalness: variant==="neon"?0.1:0.65, roughness: variant==="neon"?0.4:0.2 };
  const offsets: [number, number][] = [[0, 0.15], [-0.26, -0.30], [0.26, -0.30]];
  return (
    <Float {...fp} position={position}>
      <group {...handlers}>
        {offsets.map(([x, y], i) => (
          <mesh key={i} position={[x, y, -0.045]}><extrudeGeometry args={[shape, ext]} /><meshStandardMaterial {...matProps} /></mesh>
        ))}
        <Tooltip hovered={hovered} label={label} sub={sub} yOff={0.75} />
      </group>
    </Float>
  );
}

function MinecraftObject({ variant, position, label, sub, grounded }: ObjProps) {
  const { hovered, handlers } = useHover();
  const fp = grounded ? FG : FA;
  const s = 0.76; const h = s / 2;
  const topP  = mc("mTop",  variant, hovered);
  const sideP = mc("mSide", variant, hovered);
  const botC  = variant==="neon" ? "#060400" : "#4a3728";
  return (
    <Float {...fp} position={position}>
      <group {...handlers}>
        <mesh position={[0, h, 0]}   rotation={[-Math.PI/2, 0, 0]}><planeGeometry args={[s,s]} /><meshStandardMaterial {...topP}  side={2} /></mesh>
        <mesh position={[0,-h, 0]}   rotation={[ Math.PI/2, 0, 0]}><planeGeometry args={[s,s]} /><meshStandardMaterial color={botC} emissive="#5d3b2a" emissiveIntensity={hovered?0.6:0.1} roughness={0.9} side={2} /></mesh>
        <mesh position={[0, 0, h]}><planeGeometry args={[s,s]} /><meshStandardMaterial {...sideP} side={2} /></mesh>
        <mesh position={[0, 0,-h]}><planeGeometry args={[s,s]} /><meshStandardMaterial {...sideP} side={2} /></mesh>
        <mesh position={[ h, 0, 0]} rotation={[0, Math.PI/2, 0]}><planeGeometry args={[s,s]} /><meshStandardMaterial {...sideP} side={2} /></mesh>
        <mesh position={[-h, 0, 0]} rotation={[0,-Math.PI/2, 0]}><planeGeometry args={[s,s]} /><meshStandardMaterial {...sideP} side={2} /></mesh>
        <Tooltip hovered={hovered} label={label} sub={sub} yOff={0.65} />
      </group>
    </Float>
  );
}

function PhoneObject({ variant, position, label, sub, grounded }: ObjProps) {
  const { hovered, handlers } = useHover();
  const fp = grounded ? FG : FA;
  return (
    <Float {...fp} position={position}>
      <group {...handlers}>
        <mesh><boxGeometry args={[0.5, 1.0, 0.07]} /><meshStandardMaterial {...mc("phone", variant, hovered)} /></mesh>
        <mesh position={[0, 0, 0.04]}><boxGeometry args={[0.43, 0.86, 0.01]} /><meshStandardMaterial {...mc("phoneSc", variant, hovered)} /></mesh>
        <mesh position={[0.1, 0.43, 0.04]}><cylinderGeometry args={[0.04, 0.04, 0.02, 12]} /><meshStandardMaterial color="#111" roughness={0.1} metalness={0.9} /></mesh>
        <Tooltip hovered={hovered} label={label} sub={sub} yOff={0.75} />
      </group>
    </Float>
  );
}

function WiiObject({ variant, position, label, sub, grounded }: ObjProps) {
  const { hovered, handlers } = useHover();
  const fp = grounded ? FG : FA;
  return (
    <Float {...fp} position={position}>
      <group {...handlers}>
        <mesh><boxGeometry args={[0.28, 1.4, 0.22]} /><meshStandardMaterial {...mc("wii", variant, hovered)} /></mesh>
        <mesh position={[0, 0.1, 0.115]}><boxGeometry args={[0.18, 0.025, 0.02]} /><meshStandardMaterial color="#444" roughness={0.8} /></mesh>
        <mesh position={[0, 0.38, 0.115]}>
          <cylinderGeometry args={[0.03, 0.03, 0.02, 12]} />
          <meshStandardMaterial color={variant==="neon"?"#001400":"#00aa00"} emissive="#00ff22" emissiveIntensity={hovered?5:1.8} roughness={0.1} />
        </mesh>
        <Tooltip hovered={hovered} label={label} sub={sub} yOff={0.95} />
      </group>
    </Float>
  );
}

function AirplaneObject({ variant, position, label, sub, grounded }: ObjProps) {
  const { hovered, handlers } = useHover();
  const fp = grounded ? FG : { speed: 0.9, floatIntensity: 0.55, rotationIntensity: 0.06 };
  const p = { ...mc("plane", variant, hovered), metalness: 0.55, roughness: 0.22 };
  return (
    <Float {...fp} position={position}>
      <group {...handlers} rotation={[0.18, 0, Math.PI/14]}>
        <mesh><cylinderGeometry args={[0.09, 0.13, 1.6, 12]} /><meshStandardMaterial {...p} /></mesh>
        <mesh position={[0, 0.12, 0]}><boxGeometry args={[2.1, 0.04, 0.38]} /><meshStandardMaterial {...p} /></mesh>
        <mesh position={[0,-0.62, 0]}><boxGeometry args={[0.85, 0.03, 0.22]} /><meshStandardMaterial {...p} /></mesh>
        <mesh position={[0,-0.44, 0.06]}><boxGeometry args={[0.04, 0.32, 0.24]} /><meshStandardMaterial {...p} /></mesh>
        <Tooltip hovered={hovered} label={label} sub={sub} yOff={1.3} />
      </group>
    </Float>
  );
}

function TruckObject({ variant, position, label, sub, grounded }: ObjProps) {
  const { hovered, handlers } = useHover();
  const fp = grounded ? FG : FA;
  const wheelPos: [number,number,number][] = [[-0.55,-0.43,-0.28],[-0.55,-0.43,0.28],[0.25,-0.43,-0.28],[0.25,-0.43,0.28]];
  return (
    <Float {...fp} position={position}>
      <group {...handlers}>
        <mesh position={[0.3, 0.1, 0]}><boxGeometry args={[1.1, 0.7, 0.56]} /><meshStandardMaterial {...mc("trB", variant, hovered)} /></mesh>
        <mesh position={[-0.52,-0.05, 0]}><boxGeometry args={[0.44, 0.55, 0.56]} /><meshStandardMaterial {...mc("trC", variant, hovered)} /></mesh>
        <mesh position={[-0.76, 0.06, 0]}>
          <boxGeometry args={[0.02, 0.28, 0.4]} />
          <meshStandardMaterial color={variant==="neon"?"#021016":"#aaddff"} emissive="#aaddff" emissiveIntensity={hovered?2:0.6} roughness={0.05} transparent opacity={0.85} />
        </mesh>
        {wheelPos.map((pos, i) => (
          <mesh key={i} position={pos} rotation={[0, 0, Math.PI/2]}><cylinderGeometry args={[0.14, 0.14, 0.08, 16]} /><meshStandardMaterial color="#111" roughness={0.9} /></mesh>
        ))}
        <Tooltip hovered={hovered} label={label} sub={sub} yOff={0.68} />
      </group>
    </Float>
  );
}

function PCObject({ variant, position, label, sub, grounded }: ObjProps) {
  const { hovered, handlers } = useHover();
  const fp = grounded ? FG : FA;
  return (
    <Float {...fp} position={position}>
      <group {...handlers}>
        <mesh position={[-0.56,-0.05, 0]}><boxGeometry args={[0.28, 0.9, 0.35]} /><meshStandardMaterial {...mc("pc", variant, hovered)} /></mesh>
        <mesh position={[-0.56, 0.2, 0.185]}><boxGeometry args={[0.22, 0.025, 0.02]} /><meshStandardMaterial color="#444" roughness={0.8} /></mesh>
        <mesh position={[0.2,-0.38, 0]}><cylinderGeometry args={[0.04, 0.08, 0.25, 8]} /><meshStandardMaterial color="#333" roughness={0.8} /></mesh>
        <mesh position={[0.2, 0.1, 0]}><boxGeometry args={[0.74, 0.54, 0.07]} /><meshStandardMaterial {...mc("pc", variant, hovered)} /></mesh>
        <mesh position={[0.2, 0.1, 0.04]}><boxGeometry args={[0.64, 0.44, 0.01]} /><meshStandardMaterial {...mc("pcSc", variant, hovered)} /></mesh>
        <Tooltip hovered={hovered} label={label} sub={sub} yOff={0.72} />
      </group>
    </Float>
  );
}

function DS3Object({ variant, position, label, sub, grounded }: ObjProps) {
  const { hovered, handlers } = useHover();
  const fp = grounded ? FG : FA;
  return (
    <Float {...fp} position={position}>
      <group {...handlers} rotation={[0, Math.PI/10, 0]}>
        <mesh position={[0, 0.38, 0]}><boxGeometry args={[0.82, 0.5, 0.06]} /><meshStandardMaterial {...mc("ds3", variant, hovered)} /></mesh>
        <mesh position={[0, 0.38, 0.035]}><boxGeometry args={[0.72, 0.42, 0.01]} /><meshStandardMaterial {...mc("ds3Sc", variant, hovered)} /></mesh>
        <mesh position={[0,-0.18, 0.06]} rotation={[-0.3,0,0]}><boxGeometry args={[0.82, 0.48, 0.06]} /><meshStandardMaterial {...mc("ds3", variant, hovered)} /></mesh>
        <mesh position={[0,-0.28, 0.12]} rotation={[-0.3,0,0]}><boxGeometry args={[0.72, 0.34, 0.01]} /><meshStandardMaterial {...mc("ds3Sc", variant, hovered)} /></mesh>
        <mesh position={[-0.27,-0.25, 0.12]} rotation={[-0.3,0,0]}><cylinderGeometry args={[0.08, 0.08, 0.015, 4]} /><meshStandardMaterial color="#222" roughness={0.8} /></mesh>
        <Tooltip hovered={hovered} label={label} sub={sub} yOff={0.82} />
      </group>
    </Float>
  );
}

// ── World scene ────────────────────────────────────────────────────────
function WorldScene({
  scrollProgress,
  variant,
  lang,
}: {
  scrollProgress: React.MutableRefObject<number>;
  variant: Variant;
  lang: "en" | "es";
}) {
  const { scene } = useThree();
  const mouse       = useRef({ x: 0, y: 0 });
  const smoothMouse = useRef({ x: 0, y: 0 });
  const camTarget   = useRef(new THREE.Vector3(0, 6.5, 32));
  const lookTarget  = useRef(new THREE.Vector3(0, 0.5, 18));

  useEffect(() => {
    const bg = variant === "neon" ? "#05050a" : "#080610";
    scene.background = new THREE.Color(bg);
    scene.fog = new THREE.Fog(bg, 24, 64);
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth  - 0.5) * 2;
      mouse.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      scene.fog = null;
      window.removeEventListener("mousemove", onMove);
    };
  }, [scene, variant]);

  useFrame((state) => {
    const t = Math.max(0, Math.min(0.999, scrollProgress.current));

    smoothMouse.current.x += (mouse.current.x - smoothMouse.current.x) * 0.025;
    smoothMouse.current.y += (mouse.current.y - smoothMouse.current.y) * 0.025;

    const cp = CAM_PATH.getPoint(t);
    const lp = LOOKAT_PATH.getPoint(t);

    camTarget.current.set(cp.x, cp.y, cp.z);
    lookTarget.current.set(
      lp.x + smoothMouse.current.x * 1.8,
      lp.y + smoothMouse.current.y * 0.9,
      lp.z,
    );

    state.camera.position.lerp(camTarget.current, 0.065);
    state.camera.lookAt(lookTarget.current);
  });

  const neon = variant === "neon";
  const chapters = CHAPTERS[lang];

  return (
    <>
      <ambientLight intensity={neon ? 0.08 : 0.15} />
      <directionalLight position={[8, 14, 8]} intensity={neon ? 0.5 : 0.9} />

      {/* Per-chapter atmosphere lights */}
      <pointLight position={[-1,  3.5, 13]}  color={neon ? "#6c63ff" : "#ff9500"} intensity={neon ? 6 : 10} distance={16} />
      <pointLight position={[ 0,  5.5,  2]}  color={neon ? "#5eb3ff" : "#5eb3ff"} intensity={neon ? 7 : 12} distance={18} />
      <pointLight position={[ 0,  3.0,-10]}  color={neon ? "#00ffcc" : "#00ccbb"} intensity={neon ? 5 : 9}  distance={14} />
      <pointLight position={[ 0,  3.0,-22]}  color={neon ? "#ff6633" : "#ff5a36"} intensity={neon ? 5 : 9}  distance={14} />
      <pointLight position={[ 0,  5.0,-34]}  color={neon ? "#a855f7" : "#9b59b6"} intensity={neon ? 8 : 14} distance={18} />
      <pointLight position={[ 2.5,2.0,-35]}  color="#ffd700"                       intensity={neon ? 4 : 8}  distance={12} />

      <Stars radius={80} depth={60} count={1800} factor={2} saturation={0} fade speed={0.3} />

      <Grid
        position={[0, -1.45, 0]}
        args={[200, 200]}
        cellSize={1.5}
        cellThickness={0.35}
        cellColor={neon ? "#1a1565" : "#130a45"}
        sectionSize={6}
        sectionThickness={0.9}
        sectionColor={neon ? "#3730a3" : "#2d1875"}
        fadeDistance={55}
        fadeStrength={2.5}
        infiniteGrid
      />

      {/* Chapter labels — alternate sides for variety */}
      {chapters.map((ch, i) => (
        <ChapterLabel key={i} {...ch} xOff={i % 2 === 0 ? -4.2 : 2.8} />
      ))}

      {/* ─── Ch1: Venezuela 2019 ─── */}
      <WiiObject    variant={variant} position={[-2.8, -0.3, 12]}  label="Nintendo Wii / Wii U" sub="Primeras consolas"                     grounded />
      <DS3Object    variant={variant} position={[ 2.4, -0.4, 15]}  label="Nintendo 3DS"          sub="Gaming portátil"                       grounded />
      <PCObject     variant={variant} position={[-0.4, -0.5, 17]}  label="Primera PC"             sub="El inicio del código"                  grounded />

      {/* ─── Ch2: El Vuelo 2021 ─── */}
      <AirplaneObject variant={variant} position={[0.4, 2.8, 2]} label={lang==="en" ? "2021 — The flight" : "2021 — El vuelo"} sub="Venezuela → Houston, TX" />

      {/* ─── Ch3: Houston 2021 ─── */}
      <PhoneObject    variant={variant} position={[-2.2,-0.2,-10]}  label="Samsung A10" sub={lang==="en" ? "2019 — First phone"     : "2019 — Primer teléfono"} grounded />
      <PokeballObject variant={variant} position={[ 2.2, 0.1,-10]}  label="Pokémon"     sub={lang==="en" ? "A saga that shaped me"  : "Saga que me marcó"      } />

      {/* ─── Ch4: Orlando 2023 ─── */}
      <TruckObject    variant={variant} position={[ 0.3,-0.62,-22]} label={lang==="en" ? "2023 — The move"    : "2023 — La mudanza"} sub="Houston → Orlando, FL" grounded />
      <MinecraftObject variant={variant} position={[-3.0,-0.65,-24]} label="Minecraft"  sub={lang==="en" ? "Worlds without limits" : "Mundos sin límites"      } grounded />

      {/* ─── Ch5: Venestock 2025-26 ─── */}
      <Sparkles count={60} scale={8} size={1.2} speed={0.4} opacity={0.6}
        color={neon ? "#a855f7" : "#ffd700"} position={[0, 0, -34]} />
      <VenestockObject variant={variant} position={[0, 0.5,-34]} label="Venestock"             sub="2025 — Mi empresa SaaS"              />
      <TriforceObject  variant={variant} position={[3, 0.2,-36]} label="The Legend of Zelda"   sub={lang==="en" ? "The epic saga" : "La saga épica"} />
    </>
  );
}

// ── Canvas ─────────────────────────────────────────────────────────────
export default function StoryScene({
  variant,
  scrollProgress,
  lang = "en",
}: {
  variant: Variant;
  scrollProgress: React.MutableRefObject<number>;
  lang?: "en" | "es";
}) {
  return (
    <Canvas
      camera={{ position: [0, 6.5, 32], fov: 58 }}
      style={{ width: "100%", height: "100%" }}
      dpr={[1, 1.5]}
      gl={{ antialias: true }}
    >
      <WorldScene scrollProgress={scrollProgress} variant={variant} lang={lang} />
    </Canvas>
  );
}
