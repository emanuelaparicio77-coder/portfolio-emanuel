"use client";

import { useRef, useState, useMemo, useEffect, type ReactNode } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Float, Stars, Html, Sparkles } from "@react-three/drei";
import * as THREE from "three";

// ── Types ─────────────────────────────────────────────────────────────
export type Variant = "neon" | "pop";

type ObjProps = {
  variant: Variant;
  position: [number, number, number];
  label: string;
  sub: string;
};

// ── Color config [base, emissive, emissiveIntensity] ──────────────────
const COLORS = {
  venBg:       { neon: ["#0d1219","#5eb3ff",0.25] as const, pop: ["#161a24","#5eb3ff",0.15] as const },
  venV:        { neon: ["#0a1a2e","#5eb3ff",2.5]  as const, pop: ["#5eb3ff","#9be0ff",0.4]  as const },
  pokRed:      { neon: ["#0d0000","#ff2222",2.0]  as const, pop: ["#cc0000","#ff6666",0.25] as const },
  pokWhite:    { neon: ["#050505","#ffffff",0.5]  as const, pop: ["#f0f0f0","#ffffff",0.1]  as const },
  triforce:    { neon: ["#1a1200","#ffd700",2.5]  as const, pop: ["#ffd700","#ffcc00",0.35] as const },
  mineTop:     { neon: ["#0a1400","#4caf50",2.0]  as const, pop: ["#4a8a1a","#6dcf30",0.3]  as const },
  mineSide:    { neon: ["#150d05","#8B6914",0.6]  as const, pop: ["#8B6914","#a07820",0.15] as const },
  phone:       { neon: ["#0a0a12","#6c63ff",0.5]  as const, pop: ["#1a1a2e","#6c63ff",0.2]  as const },
  phoneScrn:   { neon: ["#020a14","#5eb3ff",3.0]  as const, pop: ["#1a3a6a","#5eb3ff",0.8]  as const },
  wii:         { neon: ["#0a0a0a","#ddddcc",0.4]  as const, pop: ["#e0ddd0","#ffffff",0.1]  as const },
  plane:       { neon: ["#0a0a12","#aaccff",1.5]  as const, pop: ["#c0c8d8","#ddeeff",0.2]  as const },
  truckBod:    { neon: ["#0a0800","#ff9500",2.0]  as const, pop: ["#f5a623","#ff9500",0.25] as const },
  truckCab:    { neon: ["#080600","#ff7700",1.5]  as const, pop: ["#e8920a","#ff8800",0.2]  as const },
  pc:          { neon: ["#080808","#33ffaa",0.6]  as const, pop: ["#2a2a2a","#44cc88",0.15] as const },
  pcScrn:      { neon: ["#010a06","#00ff88",3.5]  as const, pop: ["#003320","#00ff88",0.9]  as const },
  ds3:         { neon: ["#05050a","#ff66cc",1.2]  as const, pop: ["#1a1a2e","#ff88dd",0.3]  as const },
  ds3Scrn:     { neon: ["#020008","#9966ff",3.0]  as const, pop: ["#0d0020","#cc88ff",0.8]  as const },
};

function mc(key: keyof typeof COLORS, v: Variant, hovered = false) {
  const [color, emissive, ei] = COLORS[key][v];
  return {
    color,
    emissive,
    emissiveIntensity: ei * (hovered ? 2.2 : 1),
    roughness: 0.3,
    metalness: v === "neon" ? 0.2 : 0.1,
  };
}

// ── Hover hook ────────────────────────────────────────────────────────
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
      onPointerOut:  () => set(false),
    },
  };
}

// ── Tooltip (Html overlay following the 3D object) ────────────────────
function Tooltip({ hovered, label, sub, yOff = 1.0 }: {
  hovered: boolean; label: string; sub: string; yOff?: number;
}) {
  if (!hovered) return null;
  return (
    <Html position={[0, yOff, 0]} center style={{ pointerEvents: "none", userSelect: "none" }}>
      <div style={{
        background: "rgba(10,10,15,0.9)",
        border: "1px solid rgba(108,99,255,0.55)",
        borderRadius: "12px",
        padding: "8px 14px",
        backdropFilter: "blur(12px)",
        whiteSpace: "nowrap",
        boxShadow: "0 4px 28px rgba(108,99,255,0.25)",
      }}>
        <p style={{ color: "#6c63ff", fontSize: "10px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>{label}</p>
        <p style={{ color: "rgba(232,232,232,0.72)", fontSize: "11px", margin: "4px 0 0" }}>{sub}</p>
      </div>
    </Html>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  OBJECTS
// ─────────────────────────────────────────────────────────────────────

// ── Venestock Logo — recreated from SVG path in 3D ───────────────────
function VenestockObject({ variant, position, label, sub }: ObjProps) {
  const { hovered, handlers } = useHover();

  const vTube = useMemo(() => {
    const s = 0.038; const cx = 30; const cy = 31;
    const path = new THREE.CurvePath<THREE.Vector3>();
    const p1 = new THREE.Vector3((18 - cx) * s, -(18 - cy) * s, 0);
    const p2 = new THREE.Vector3((30 - cx) * s, -(44 - cy) * s, 0);
    const p3 = new THREE.Vector3((42 - cx) * s, -(18 - cy) * s, 0);
    path.add(new THREE.LineCurve3(p1, p2));
    path.add(new THREE.LineCurve3(p2, p3));
    return new THREE.TubeGeometry(path as unknown as THREE.Curve<THREE.Vector3>, 30, 0.056, 8, false);
  }, []);

  const accentTube = useMemo(() => {
    const s = 0.038; const cx = 30; const cy = 31;
    const p1 = new THREE.Vector3((30 - cx) * s, -(44 - cy) * s, 0);
    const p2 = new THREE.Vector3((36 - cx) * s, -(31 - cy) * s, 0);
    return new THREE.TubeGeometry(new THREE.LineCurve3(p1, p2) as unknown as THREE.Curve<THREE.Vector3>, 8, 0.04, 8, false);
  }, []);

  return (
    <Float speed={1.3} floatIntensity={0.4} rotationIntensity={0.08} position={position}>
      <group {...handlers}>
        {/* Card background */}
        <mesh>
          <boxGeometry args={[1.1, 1.1, 0.14]} />
          <meshStandardMaterial {...mc("venBg", variant, hovered)} />
        </mesh>
        {/* V shape */}
        <mesh geometry={vTube} position={[0, 0, 0.09]}>
          <meshStandardMaterial {...mc("venV", variant, hovered)} />
        </mesh>
        {/* White accent line */}
        <mesh geometry={accentTube} position={[0, 0, 0.09]}>
          <meshStandardMaterial
            color={hovered ? "#ffffff" : "#c0e8ff"}
            emissive="#ffffff"
            emissiveIntensity={hovered ? 4.5 : 2.0}
            roughness={0.1}
          />
        </mesh>
        <Tooltip hovered={hovered} label={label} sub={sub} yOff={0.82} />
      </group>
    </Float>
  );
}

// ── Pokéball ──────────────────────────────────────────────────────────
function PokeballObject({ variant, position, label, sub }: ObjProps) {
  const { hovered, handlers } = useHover();
  const r = 0.55;

  return (
    <Float speed={1.6} floatIntensity={0.5} rotationIntensity={0.4} position={position}>
      <group {...handlers}>
        <mesh>
          <sphereGeometry args={[r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial {...mc("pokRed", variant, hovered)} />
        </mesh>
        <mesh>
          <sphereGeometry args={[r, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
          <meshStandardMaterial {...mc("pokWhite", variant, hovered)} />
        </mesh>
        <mesh>
          <torusGeometry args={[r, 0.048, 8, 64]} />
          <meshStandardMaterial color="#111" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0, r - 0.01]}>
          <sphereGeometry args={[0.11, 16, 16]} />
          <meshStandardMaterial
            color={variant === "neon" ? "#050505" : "#ffffff"}
            emissive="#ffffff"
            emissiveIntensity={hovered ? 3.5 : 0.8}
            roughness={0.1}
          />
        </mesh>
        <Tooltip hovered={hovered} label={label} sub={sub} yOff={0.85} />
      </group>
    </Float>
  );
}

// ── Triforce ──────────────────────────────────────────────────────────
function TriforceObject({ variant, position, label, sub }: ObjProps) {
  const { hovered, handlers } = useHover();

  const triShape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0.3);
    s.lineTo(-0.26, -0.15);
    s.lineTo(0.26, -0.15);
    s.closePath();
    return s;
  }, []);

  const extSettings = useMemo(() => ({
    depth: 0.09,
    bevelEnabled: true,
    bevelSize: 0.018,
    bevelThickness: 0.018,
    bevelSegments: 2,
  }), []);

  const matProps = {
    ...mc("triforce", variant, hovered),
    metalness: variant === "neon" ? 0.1 : 0.65,
    roughness: variant === "neon" ? 0.4 : 0.2,
  };

  const offsets: [number, number][] = [[0, 0.15], [-0.26, -0.30], [0.26, -0.30]];

  return (
    <Float speed={1.8} floatIntensity={0.35} rotationIntensity={0.2} position={position}>
      <group {...handlers}>
        {offsets.map(([x, y], i) => (
          <mesh key={i} position={[x, y, -0.045]}>
            <extrudeGeometry args={[triShape, extSettings]} />
            <meshStandardMaterial {...matProps} />
          </mesh>
        ))}
        <Tooltip hovered={hovered} label={label} sub={sub} yOff={0.75} />
      </group>
    </Float>
  );
}

// ── Minecraft Grass Block ─────────────────────────────────────────────
function MinecraftObject({ variant, position, label, sub }: ObjProps) {
  const { hovered, handlers } = useHover();
  const s = 0.76;
  const h = s / 2;
  const topP  = mc("mineTop",  variant, hovered);
  const sideP = mc("mineSide", variant, hovered);
  const botColor = variant === "neon" ? "#060400" : "#4a3728";

  return (
    <Float speed={1.1} floatIntensity={0.45} rotationIntensity={0.5} position={position}>
      <group {...handlers}>
        {/* Top — green */}
        <mesh position={[0, h, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[s, s]} />
          <meshStandardMaterial {...topP} side={2} />
        </mesh>
        {/* Bottom — dirt */}
        <mesh position={[0, -h, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[s, s]} />
          <meshStandardMaterial color={botColor} emissive="#5d3b2a" emissiveIntensity={hovered ? 0.6 : 0.1} roughness={0.9} side={2} />
        </mesh>
        {/* Front */}
        <mesh position={[0, 0, h]}>
          <planeGeometry args={[s, s]} />
          <meshStandardMaterial {...sideP} side={2} />
        </mesh>
        {/* Back */}
        <mesh position={[0, 0, -h]}>
          <planeGeometry args={[s, s]} />
          <meshStandardMaterial {...sideP} side={2} />
        </mesh>
        {/* Right */}
        <mesh position={[h, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[s, s]} />
          <meshStandardMaterial {...sideP} side={2} />
        </mesh>
        {/* Left */}
        <mesh position={[-h, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[s, s]} />
          <meshStandardMaterial {...sideP} side={2} />
        </mesh>
        <Tooltip hovered={hovered} label={label} sub={sub} yOff={0.65} />
      </group>
    </Float>
  );
}

// ── Samsung A10 ───────────────────────────────────────────────────────
function PhoneObject({ variant, position, label, sub }: ObjProps) {
  const { hovered, handlers } = useHover();

  return (
    <Float speed={1.4} floatIntensity={0.45} rotationIntensity={0.12} position={position}>
      <group {...handlers}>
        <mesh>
          <boxGeometry args={[0.5, 1.0, 0.07]} />
          <meshStandardMaterial {...mc("phone", variant, hovered)} />
        </mesh>
        <mesh position={[0, 0, 0.04]}>
          <boxGeometry args={[0.43, 0.86, 0.01]} />
          <meshStandardMaterial {...mc("phoneScrn", variant, hovered)} />
        </mesh>
        {/* Camera bump */}
        <mesh position={[0.1, 0.43, 0.04]}>
          <cylinderGeometry args={[0.04, 0.04, 0.02, 12]} />
          <meshStandardMaterial color="#111" roughness={0.1} metalness={0.9} />
        </mesh>
        <Tooltip hovered={hovered} label={label} sub={sub} yOff={0.75} />
      </group>
    </Float>
  );
}

// ── Nintendo Wii ──────────────────────────────────────────────────────
function WiiObject({ variant, position, label, sub }: ObjProps) {
  const { hovered, handlers } = useHover();

  return (
    <Float speed={1.2} floatIntensity={0.4} rotationIntensity={0.2} position={position}>
      <group {...handlers}>
        <mesh>
          <boxGeometry args={[0.28, 1.4, 0.22]} />
          <meshStandardMaterial {...mc("wii", variant, hovered)} />
        </mesh>
        {/* Disc slot */}
        <mesh position={[0, 0.1, 0.115]}>
          <boxGeometry args={[0.18, 0.025, 0.02]} />
          <meshStandardMaterial color="#444" roughness={0.8} />
        </mesh>
        {/* Power LED */}
        <mesh position={[0, 0.38, 0.115]}>
          <cylinderGeometry args={[0.03, 0.03, 0.02, 12]} />
          <meshStandardMaterial
            color={variant === "neon" ? "#001400" : "#00aa00"}
            emissive="#00ff22"
            emissiveIntensity={hovered ? 5 : 1.8}
            roughness={0.1}
          />
        </mesh>
        <Tooltip hovered={hovered} label={label} sub={sub} yOff={0.95} />
      </group>
    </Float>
  );
}

// ── Airplane (2021 — The flight) ──────────────────────────────────────
function AirplaneObject({ variant, position, label, sub }: ObjProps) {
  const { hovered, handlers } = useHover();
  const p = { ...mc("plane", variant, hovered), metalness: 0.55, roughness: 0.22 };

  return (
    <Float speed={0.9} floatIntensity={0.55} rotationIntensity={0.08} position={position}>
      <group {...handlers} rotation={[0.1, 0, Math.PI / 14]}>
        {/* Fuselage */}
        <mesh>
          <cylinderGeometry args={[0.09, 0.13, 1.6, 12]} />
          <meshStandardMaterial {...p} />
        </mesh>
        {/* Main wings */}
        <mesh position={[0, 0.12, 0]}>
          <boxGeometry args={[2.1, 0.04, 0.38]} />
          <meshStandardMaterial {...p} />
        </mesh>
        {/* Tail horizontal */}
        <mesh position={[0, -0.62, 0]}>
          <boxGeometry args={[0.85, 0.03, 0.22]} />
          <meshStandardMaterial {...p} />
        </mesh>
        {/* Tail vertical */}
        <mesh position={[0, -0.44, 0.06]}>
          <boxGeometry args={[0.04, 0.32, 0.24]} />
          <meshStandardMaterial {...p} />
        </mesh>
        <Tooltip hovered={hovered} label={label} sub={sub} yOff={1.3} />
      </group>
    </Float>
  );
}

// ── Moving Truck (2023 — Orlando) ─────────────────────────────────────
function TruckObject({ variant, position, label, sub }: ObjProps) {
  const { hovered, handlers } = useHover();
  const wheelPositions: [number, number, number][] = [
    [-0.55, -0.43, -0.28], [-0.55, -0.43, 0.28],
    [0.25, -0.43, -0.28],  [0.25, -0.43, 0.28],
  ];

  return (
    <Float speed={1.0} floatIntensity={0.3} rotationIntensity={0.18} position={position}>
      <group {...handlers}>
        {/* Cargo box */}
        <mesh position={[0.3, 0.1, 0]}>
          <boxGeometry args={[1.1, 0.7, 0.56]} />
          <meshStandardMaterial {...mc("truckBod", variant, hovered)} />
        </mesh>
        {/* Cab */}
        <mesh position={[-0.52, -0.05, 0]}>
          <boxGeometry args={[0.44, 0.55, 0.56]} />
          <meshStandardMaterial {...mc("truckCab", variant, hovered)} />
        </mesh>
        {/* Windshield */}
        <mesh position={[-0.76, 0.06, 0]}>
          <boxGeometry args={[0.02, 0.28, 0.4]} />
          <meshStandardMaterial
            color={variant === "neon" ? "#021016" : "#aaddff"}
            emissive="#aaddff"
            emissiveIntensity={hovered ? 2 : 0.6}
            roughness={0.05}
            transparent
            opacity={0.85}
          />
        </mesh>
        {/* Wheels */}
        {wheelPositions.map((pos, i) => (
          <mesh key={i} position={pos} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.14, 0.14, 0.08, 16]} />
            <meshStandardMaterial color="#111" roughness={0.9} />
          </mesh>
        ))}
        <Tooltip hovered={hovered} label={label} sub={sub} yOff={0.68} />
      </group>
    </Float>
  );
}

// ── First PC ──────────────────────────────────────────────────────────
function PCObject({ variant, position, label, sub }: ObjProps) {
  const { hovered, handlers } = useHover();

  return (
    <Float speed={1.3} floatIntensity={0.35} rotationIntensity={0.2} position={position}>
      <group {...handlers}>
        {/* Tower */}
        <mesh position={[-0.56, -0.05, 0]}>
          <boxGeometry args={[0.28, 0.9, 0.35]} />
          <meshStandardMaterial {...mc("pc", variant, hovered)} />
        </mesh>
        {/* CD drive slot */}
        <mesh position={[-0.56, 0.2, 0.185]}>
          <boxGeometry args={[0.22, 0.025, 0.02]} />
          <meshStandardMaterial color="#444" roughness={0.8} />
        </mesh>
        {/* Monitor stand */}
        <mesh position={[0.2, -0.38, 0]}>
          <cylinderGeometry args={[0.04, 0.08, 0.25, 8]} />
          <meshStandardMaterial color="#333" roughness={0.8} />
        </mesh>
        {/* Monitor bezel */}
        <mesh position={[0.2, 0.1, 0]}>
          <boxGeometry args={[0.74, 0.54, 0.07]} />
          <meshStandardMaterial {...mc("pc", variant, hovered)} />
        </mesh>
        {/* Screen */}
        <mesh position={[0.2, 0.1, 0.04]}>
          <boxGeometry args={[0.64, 0.44, 0.01]} />
          <meshStandardMaterial {...mc("pcScrn", variant, hovered)} />
        </mesh>
        <Tooltip hovered={hovered} label={label} sub={sub} yOff={0.72} />
      </group>
    </Float>
  );
}

// ── Nintendo 3DS ──────────────────────────────────────────────────────
function DS3Object({ variant, position, label, sub }: ObjProps) {
  const { hovered, handlers } = useHover();

  return (
    <Float speed={1.7} floatIntensity={0.4} rotationIntensity={0.3} position={position}>
      <group {...handlers} rotation={[0, Math.PI / 10, 0]}>
        {/* Top screen lid */}
        <mesh position={[0, 0.38, 0]}>
          <boxGeometry args={[0.82, 0.5, 0.06]} />
          <meshStandardMaterial {...mc("ds3", variant, hovered)} />
        </mesh>
        <mesh position={[0, 0.38, 0.035]}>
          <boxGeometry args={[0.72, 0.42, 0.01]} />
          <meshStandardMaterial {...mc("ds3Scrn", variant, hovered)} />
        </mesh>
        {/* Bottom half (slightly open) */}
        <mesh position={[0, -0.18, 0.06]} rotation={[-0.3, 0, 0]}>
          <boxGeometry args={[0.82, 0.48, 0.06]} />
          <meshStandardMaterial {...mc("ds3", variant, hovered)} />
        </mesh>
        <mesh position={[0, -0.28, 0.12]} rotation={[-0.3, 0, 0]}>
          <boxGeometry args={[0.72, 0.34, 0.01]} />
          <meshStandardMaterial {...mc("ds3Scrn", variant, hovered)} />
        </mesh>
        {/* D-pad */}
        <mesh position={[-0.27, -0.25, 0.12]} rotation={[-0.3, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.015, 4]} />
          <meshStandardMaterial color="#222" roughness={0.8} />
        </mesh>
        <Tooltip hovered={hovered} label={label} sub={sub} yOff={0.82} />
      </group>
    </Float>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  SCENE ASSEMBLY
// ─────────────────────────────────────────────────────────────────────

// Auto-rotation + mouse parallax controller
function SceneGroup({ children, variant }: { children: ReactNode; variant: Variant }) {
  const ref      = useRef<THREE.Group>(null!);
  const mouse    = useRef({ x: 0, y: 0 });
  const baseRotY = useRef(0);
  const smoothX  = useRef(0);
  const smoothY  = useRef(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth  - 0.5) * 2;
      mouse.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useFrame((_, dt) => {
    baseRotY.current += dt * 0.07;                                          // base auto-rotate
    smoothX.current  += (mouse.current.y * 0.28 - smoothX.current) * 0.04; // parallax tilt X
    smoothY.current  += (mouse.current.x * 0.38 - smoothY.current) * 0.04; // parallax push Y
    ref.current.rotation.x = smoothX.current;
    ref.current.rotation.y = baseRotY.current + smoothY.current;
  });

  return (
    <group ref={ref}>
      {/* Colored point lights — different per variant */}
      {variant === "neon" ? (
        <>
          <pointLight position={[0, 0, 5]}  color="#6c63ff" intensity={5}  distance={20} />
          <pointLight position={[4, 3, 0]}  color="#5eb3ff" intensity={3}  distance={15} />
          <pointLight position={[-3,-3, 2]} color="#3322ff" intensity={2}  distance={12} />
        </>
      ) : (
        <>
          <pointLight position={[5, 5, 4]}   color="#ff6b6b" intensity={14} distance={18} />
          <pointLight position={[-4,-2, 3]}  color="#6c63ff" intensity={10} distance={14} />
          <pointLight position={[0, -5, -2]} color="#ffd700" intensity={7}  distance={14} />
          <pointLight position={[3, 1, -4]}  color="#00ffaa" intensity={6}  distance={12} />
        </>
      )}
      {children}
    </group>
  );
}

function Scene({ variant }: { variant: Variant }) {
  return (
    <>
      <ambientLight intensity={variant === "neon" ? 0.12 : 0.22} />
      <directionalLight position={[5, 8, 5]} intensity={0.6} />

      <Stars
        radius={90} depth={60} count={3000}
        factor={2} saturation={0} fade speed={0.4}
      />
      <Sparkles
        count={55} scale={12} size={0.7} speed={0.25}
        opacity={0.45} color={variant === "neon" ? "#6c63ff" : "#ffffff"}
      />

      <SceneGroup variant={variant}>
        <VenestockObject variant={variant} position={[0,    0.5,  0]}   label="Venestock"           sub="2025 — Mi empresa SaaS"       />
        <PokeballObject  variant={variant} position={[-3.2, 1.8, -0.5]} label="Pokémon"             sub="Saga que me marcó"            />
        <TriforceObject  variant={variant} position={[2.8,  2.0,  0.5]} label="The Legend of Zelda" sub="La saga épica"                />
        <MinecraftObject variant={variant} position={[-2.4,-1.5,  1.0]} label="Minecraft"            sub="Mundos sin límites"          />
        <PhoneObject     variant={variant} position={[2.6, -0.8, -1.0]} label="Samsung A10"          sub="2019 — Primer teléfono"      />
        <WiiObject       variant={variant} position={[-3.6, 0.3,  0.5]} label="Nintendo Wii / Wii U" sub="Primeras consolas"          />
        <AirplaneObject  variant={variant} position={[0.5,  3.2, -1.5]} label="2021 — El vuelo"      sub="Venezuela → Houston"        />
        <TruckObject     variant={variant} position={[3.5, -1.8,  0.5]} label="2023 — La mudanza"    sub="Houston → Orlando, FL"      />
        <PCObject        variant={variant} position={[-0.5,-2.6,  0.5]} label="Primera PC"           sub="El inicio del código"       />
        <DS3Object       variant={variant} position={[1.8,  0.8,  2.0]} label="Nintendo 3DS"         sub="Gaming portátil"            />
      </SceneGroup>
    </>
  );
}

// ── Canvas export ─────────────────────────────────────────────────────
export default function StoryScene({ variant }: { variant: Variant }) {
  return (
    <div style={{ width: "100%", height: "clamp(420px, 72vh, 680px)" }}>
      <Canvas
        camera={{ position: [0, 0, 9.5], fov: 52 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
      >
        <Scene variant={variant} />
      </Canvas>
    </div>
  );
}
