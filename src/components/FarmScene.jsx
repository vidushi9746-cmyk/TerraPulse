import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ============================================================================
// TERRAPULSE CINEMATIC 3D FARM WORLD — PANORAMIC MOUNTAIN VALLEY TWIN
// ============================================================================

// ----------------------------------------------------------------------------
// 1. EXPANSIVE ROLLING FARMLAND TERRAIN (240m x 240m)
// ----------------------------------------------------------------------------
const TERRAIN_SIZE = 240;
const TERRAIN_SEGS = 130;

function createExpansiveFarmlandGeometry() {
  const geom = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGS, TERRAIN_SEGS);
  geom.rotateX(-Math.PI / 2);

  const pos = geom.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);

    let y;
    let r, g, b;

    // Central cultivated agricultural valley (|x| <= 36, |z| <= 30)
    const inCentralFarmland = Math.abs(x) <= 36 && Math.abs(z) <= 30;

    if (inCentralFarmland) {
      // Gentle natural crown across the farmstead
      y = 0.42 - 0.0003 * (x * x + z * z);

      // Elevated knoll for farmhouse at x ∈ [9, 20], z ∈ [-12, -1]
      if (x >= 9 && x <= 20 && z >= -12 && z <= -1) {
        const knollFactor = Math.cos((x - 14.5) * 0.35) * Math.cos((z + 6.5) * 0.35);
        y += Math.max(0, knollFactor * 0.48);
      }

      // Farm Road Network:
      // - North-South Central Service Lane at x ≈ 6.5 (between fields and farmhouse/barn)
      // - East-West Cross Roads at z ≈ 0.0 and z ≈ -6.5
      // - Access road to barn at z ≈ 4.5, x >= 6.5
      const onNorthSouthLane = Math.abs(x - 6.5) < 1.7 && z >= -24 && z <= 24;
      const onEastWestRoad = Math.abs(z) < 1.4 && x >= -16 && x <= 26;
      const onHouseDrive = Math.abs(z + 6.5) < 1.4 && x >= 5 && x <= 24;
      const onBarnPath = Math.abs(z - 4.5) < 1.3 && x >= 6 && x <= 24;

      if (onNorthSouthLane || onEastWestRoad || onHouseDrive || onBarnPath) {
        y -= 0.04;
        r = 0.50; g = 0.43; b = 0.33; // Realistic warm gravel-dirt road
      } else if (x >= -12.0 && x <= 5.0 && z >= -12.5 && z <= 12.5) {
        // Main cultivated crop plots zone (deep rich loam soil base)
        r = 0.22; g = 0.15; b = 0.09;
      } else if (x >= 12 && x <= 25 && z >= -10 && z <= 8) {
        // Farmhouse & barn yard surface
        r = 0.44; g = 0.40; b = 0.32;
      } else {
        // Natural botanical grass hue variation
        const grassNoise = Math.sin(x * 0.4) * Math.cos(z * 0.4) * 0.04;
        r = 0.27 + grassNoise;
        g = 0.53 + grassNoise * 1.2;
        b = 0.21 + grassNoise * 0.5;
      }
    } else {
      // Natural rolling pasture hills and foothills surrounding the farm
      const hill1 = Math.sin(x * 0.04) * Math.cos(z * 0.04) * 4.2;
      const hill2 = Math.sin(x * 0.02 + 1.2) * Math.cos(z * 0.025 - 0.6) * 6.5;
      const elevation = Math.max(0.35, 0.4 + hill1 + hill2);

      // North side rises higher toward the alpine mountain range
      const northRise = z < -30 ? Math.pow(Math.abs(z + 30) * 0.15, 1.4) : 0;
      y = elevation + northRise;

      const hillNoise = (Math.sin(x * 0.2) + Math.cos(z * 0.2)) * 0.03;
      r = 0.26 + hillNoise;
      g = 0.46 + hillNoise;
      b = 0.20 + hillNoise * 0.4;
    }

    pos.setY(i, y);
    colors[i * 3 + 0] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.computeVertexNormals();
  return geom;
}

const STATIC_FARMLAND_TERRAIN_GEOM = createExpansiveFarmlandGeometry();

// ----------------------------------------------------------------------------
// 2. REALISTIC SURROUNDING MOUNTAINS (360° PANORAMIC VALLEY BASIN)
// ----------------------------------------------------------------------------
function SurroundingMountainBackdrop() {
  const coneGeom = useMemo(() => new THREE.ConeGeometry(1, 1, 6), []);

  const alpineRockMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.92, flatShading: true }),
    []
  );
  const snowCapMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.65, flatShading: true }),
    []
  );
  const forestedMountainMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#1c3822', roughness: 0.95, flatShading: true }),
    []
  );
  const greenFoothillsMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2f632b', roughness: 0.9, flatShading: true }),
    []
  );

  // Northern High Alpine Peaks with Snow Caps
  const northPeaks = useMemo(() => [
    { pos: [0, 28, -135], scale: [56, 78, 44], rot: 0.15 },
    { pos: [-46, 25, -126], scale: [48, 70, 40], rot: 0.65 },
    { pos: [48, 26, -128], scale: [50, 72, 42], rot: -0.4 },
    { pos: [-88, 22, -118], scale: [44, 62, 38], rot: 1.1 },
    { pos: [92, 23, -120], scale: [45, 64, 38], rot: -0.85 },
    { pos: [-128, 17, -105], scale: [40, 52, 34], rot: 0.4 },
    { pos: [130, 18, -108], scale: [42, 54, 35], rot: -0.55 },
    { pos: [-65, 14, -85], scale: [34, 42, 28], rot: 0.3 },
    { pos: [70, 15, -88], scale: [36, 44, 30], rot: -0.35 },
  ], []);

  // Eastern Forested Mountain Ridge & Foothills
  const eastMountains = useMemo(() => [
    { pos: [115, 18, -40], scale: [42, 52, 36], rot: 0.3, isForested: true },
    { pos: [125, 20, 0], scale: [44, 56, 38], rot: -0.2, isForested: true },
    { pos: [118, 17, 45], scale: [40, 48, 35], rot: 0.5, isForested: true },
    { pos: [92, 11, -20], scale: [30, 32, 26], rot: 0.8, isFoothill: true },
    { pos: [95, 12, 25], scale: [32, 34, 28], rot: -0.4, isFoothill: true },
  ], []);

  // Western Forested Mountain Ridge & Foothills
  const westMountains = useMemo(() => [
    { pos: [-115, 18, -40], scale: [42, 52, 36], rot: -0.3, isForested: true },
    { pos: [-125, 20, 0], scale: [44, 56, 38], rot: 0.2, isForested: true },
    { pos: [-118, 17, 45], scale: [40, 48, 35], rot: -0.5, isForested: true },
    { pos: [-92, 11, -20], scale: [30, 32, 26], rot: -0.8, isFoothill: true },
    { pos: [-95, 12, 25], scale: [32, 34, 28], rot: 0.4, isFoothill: true },
  ], []);

  // Southern Distant Rolling Foothills
  const southHills = useMemo(() => [
    { pos: [-45, 12, 120], scale: [38, 36, 32], rot: 0.2 },
    { pos: [0, 13, 125], scale: [42, 38, 34], rot: -0.3 },
    { pos: [45, 12, 120], scale: [38, 36, 32], rot: 0.4 },
    { pos: [-80, 10, 110], scale: [34, 30, 28], rot: -0.5 },
    { pos: [80, 10, 110], scale: [34, 30, 28], rot: 0.6 },
  ], []);

  return (
    <group>
      {/* 1. Northern Alpine Mountains with Snow Caps */}
      {northPeaks.map((p, idx) => (
        <group key={`np-${idx}`} position={p.pos} rotation={[0, p.rot, 0]}>
          <mesh position={[0, p.scale[1] * 0.5, 0]} scale={p.scale} geometry={coneGeom} material={alpineRockMat} />
          <mesh
            position={[0, p.scale[1] * 0.76, 0]}
            scale={[p.scale[0] * 0.44, p.scale[1] * 0.48, p.scale[2] * 0.44]}
            geometry={coneGeom}
            material={snowCapMat}
          />
        </group>
      ))}

      {/* 2. Eastern Forested Mountain Ridge */}
      {eastMountains.map((p, idx) => (
        <group key={`em-${idx}`} position={p.pos} rotation={[0, p.rot, 0]}>
          <mesh
            position={[0, p.scale[1] * 0.5, 0]}
            scale={p.scale}
            geometry={coneGeom}
            material={p.isForested ? forestedMountainMat : greenFoothillsMat}
          />
        </group>
      ))}

      {/* 3. Western Forested Mountain Ridge */}
      {westMountains.map((p, idx) => (
        <group key={`wm-${idx}`} position={p.pos} rotation={[0, p.rot, 0]}>
          <mesh
            position={[0, p.scale[1] * 0.5, 0]}
            scale={p.scale}
            geometry={coneGeom}
            material={p.isForested ? forestedMountainMat : greenFoothillsMat}
          />
        </group>
      ))}

      {/* 4. Southern Distant Green Foothills */}
      {southHills.map((p, idx) => (
        <group key={`sh-${idx}`} position={p.pos} rotation={[0, p.rot, 0]}>
          <mesh
            position={[0, p.scale[1] * 0.5, 0]}
            scale={p.scale}
            geometry={coneGeom}
            material={greenFoothillsMat}
          />
        </group>
      ))}
    </group>
  );
}

// ----------------------------------------------------------------------------
// 3. PICTURESQUE RUSTIC FARMHOUSE WITH TERRACOTTA TILED ROOF & CHIMNEY
// ----------------------------------------------------------------------------
function PicturesqueFarmhouse({ position = [14.5, 0.45, -6.5] }) {
  const smokeRef = useRef();

  useFrame(({ clock }) => {
    if (smokeRef.current) {
      const t = clock.getElapsedTime();
      smokeRef.current.children.forEach((puff, idx) => {
        const offset = idx * 0.75;
        puff.position.y = 5.4 + ((t * 0.8 + offset) % 2.8);
        puff.position.x = 2.0 + Math.sin(t * 1.4 + idx) * 0.22;
        const scale = 0.26 + ((t * 0.8 + offset) % 2.8) * 0.2;
        puff.scale.setScalar(scale);
      });
    }
  });

  return (
    <group position={position} rotation={[0, -0.25, 0]}>
      {/* Cut Stone Foundation & Lower Wall */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[7.4, 0.8, 5.4]} />
        <meshStandardMaterial color="#645e57" roughness={0.95} />
      </mesh>

      {/* Warm Timber-Framed Upper Wall */}
      <mesh position={[0, 1.95, 0]} castShadow receiveShadow>
        <boxGeometry args={[7.0, 2.3, 5.0]} />
        <meshStandardMaterial color="#e5dec9" roughness={0.85} />
      </mesh>

      {/* Vertical Corner Timber Framing */}
      {[[-3.45, 1.95, -2.45], [3.45, 1.95, -2.45], [-3.45, 1.95, 2.45], [3.45, 1.95, 2.45]].map(
        (pos, idx) => (
          <mesh key={idx} position={pos} castShadow>
            <boxGeometry args={[0.26, 2.3, 0.26]} />
            <meshStandardMaterial color="#452a1a" roughness={0.9} />
          </mesh>
        )
      )}

      {/* Gabled Pitched Terracotta Roof */}
      <mesh position={[0, 3.9, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[4.8, 2.2, 4]} />
        <meshStandardMaterial color="#c2410c" roughness={0.7} />
      </mesh>

      {/* Terracotta Roof Ridge Cap */}
      <mesh position={[0, 5.0, 0]} castShadow>
        <boxGeometry args={[5.8, 0.22, 0.45]} />
        <meshStandardMaterial color="#9a3412" roughness={0.75} />
      </mesh>

      {/* Dual Dormer Windows on Roof */}
      {[-1.6, 1.6].map((dx, i) => (
        <group key={i} position={[dx, 3.65, 1.8]}>
          <mesh castShadow>
            <boxGeometry args={[1.1, 0.9, 1.1]} />
            <meshStandardMaterial color="#e5dec9" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.65, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[0.85, 0.6, 4]} />
            <meshStandardMaterial color="#c2410c" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0, 0.58]}>
            <planeGeometry args={[0.65, 0.65]} />
            <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.65} />
          </mesh>
        </group>
      ))}

      {/* Stone Chimney */}
      <mesh position={[2.0, 4.4, 1.1]} castShadow>
        <boxGeometry args={[0.9, 2.3, 0.9]} />
        <meshStandardMaterial color="#57534e" roughness={0.95} />
      </mesh>

      {/* Animated Chimney Smoke Puffs */}
      <group ref={smokeRef}>
        {[0, 1, 2, 3].map((idx) => (
          <mesh key={idx} position={[2.0, 5.4 + idx * 0.75, 1.1]}>
            <sphereGeometry args={[0.3, 6, 6]} />
            <meshStandardMaterial color="#f1f5f9" transparent opacity={0.35} roughness={1.0} />
          </mesh>
        ))}
      </group>

      {/* Covered Timber Front Porch */}
      <mesh position={[0, 0.22, 3.3]} receiveShadow>
        <boxGeometry args={[6.2, 0.38, 1.8]} />
        <meshStandardMaterial color="#78593d" roughness={0.85} />
      </mesh>
      {/* Porch Posts */}
      <mesh position={[-2.7, 1.3, 3.9]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 2.2, 6]} />
        <meshStandardMaterial color="#5c432d" roughness={0.8} />
      </mesh>
      <mesh position={[2.7, 1.3, 3.9]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 2.2, 6]} />
        <meshStandardMaterial color="#5c432d" roughness={0.8} />
      </mesh>
      {/* Porch Roof Awning */}
      <mesh position={[0, 2.35, 3.3]} rotation={[0.22, 0, 0]} castShadow>
        <boxGeometry args={[6.4, 0.16, 2.0]} />
        <meshStandardMaterial color="#c2410c" roughness={0.7} />
      </mesh>

      {/* Warm Golden Windows */}
      <mesh position={[-1.8, 1.75, 2.52]}>
        <planeGeometry args={[1.1, 1.25]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.65} />
      </mesh>
      <mesh position={[1.8, 1.75, 2.52]}>
        <planeGeometry args={[1.1, 1.25]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.65} />
      </mesh>
      {/* Front Door */}
      <mesh position={[0, 1.2, 2.52]}>
        <planeGeometry args={[1.15, 2.0]} />
        <meshStandardMaterial color="#451a03" roughness={0.75} />
      </mesh>
    </group>
  );
}

// ----------------------------------------------------------------------------
// 4. WEATHERED TIMBER BARN & GALVANIZED STEEL GRAIN SILO
// ----------------------------------------------------------------------------
function WeatheredTimberBarnAndSilo({
  barnPos = [22.5, 0.4, 4.5],
  siloPos = [22.5, 0.4, 10.5],
}) {
  return (
    <group>
      {/* Red-Brown Weathered Timber Barn */}
      <group position={barnPos} rotation={[0, -0.28, 0]}>
        <mesh position={[0, 1.9, 0]} castShadow receiveShadow>
          <boxGeometry args={[7.2, 3.6, 5.4]} />
          <meshStandardMaterial color="#784c35" roughness={0.9} />
        </mesh>
        <mesh position={[0, 4.3, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[4.8, 2.4, 4]} />
          <meshStandardMaterial color="#c2410c" roughness={0.75} />
        </mesh>
        {/* Double Barn Doors */}
        <mesh position={[0, 1.45, 2.72]}>
          <planeGeometry args={[3.0, 2.7]} />
          <meshStandardMaterial color="#3d2314" roughness={0.9} />
        </mesh>
        {/* Open Equipment Lean-To with Stacked Firewood */}
        <mesh position={[4.4, 1.15, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.8, 2.1, 4.6]} />
          <meshStandardMaterial color="#5c432d" roughness={0.9} />
        </mesh>
      </group>

      {/* Corrugated Galvanized Steel Grain Silo */}
      <group position={siloPos}>
        <mesh position={[0, 3.8, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.5, 1.5, 7.2, 16]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.75} roughness={0.3} />
        </mesh>
        {/* Domed Silo Top Cap */}
        <mesh position={[0, 7.6, 0]} castShadow>
          <sphereGeometry args={[1.52, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.25} />
        </mesh>
      </group>
    </group>
  );
}

// ----------------------------------------------------------------------------
// 5. DETAILED RED AGRICULTURAL TRACTOR (PARKED ON ROAD)
// ----------------------------------------------------------------------------
function ModernAgriculturalTractor({ position = [4.5, 0.42, 0.2], rotation = [0, -0.22, 0] }) {
  return (
    <group position={position} rotation={rotation} scale={1.05}>
      {/* Heavy Steel Tractor Chassis Frame */}
      <mesh position={[0, 0.65, 0]} castShadow>
        <boxGeometry args={[1.3, 0.45, 2.7]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Sculpted Gloss Farm Red Engine Hood */}
      <mesh position={[0, 1.15, -0.65]} castShadow>
        <boxGeometry args={[1.2, 0.7, 1.9]} />
        <meshStandardMaterial color="#dc2626" roughness={0.25} metalness={0.15} />
      </mesh>

      {/* Front Radiator Grille */}
      <mesh position={[0, 1.1, -1.62]}>
        <planeGeometry args={[0.95, 0.55]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.8} />
      </mesh>
      {/* Dual Headlights */}
      <mesh position={[-0.45, 1.3, -1.62]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0.45, 1.3, -1.62]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.8} />
      </mesh>

      {/* Vertical Black Exhaust Stack */}
      <mesh position={[0.55, 1.9, -1.1]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 1.4, 8]} />
        <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Glazed Driver Cabin */}
      <mesh position={[0, 1.85, 0.65]} castShadow>
        <boxGeometry args={[1.25, 1.25, 1.4]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.55} roughness={0.1} />
      </mesh>
      {/* Cabin Protective Roof */}
      <mesh position={[0, 2.52, 0.65]} castShadow>
        <boxGeometry args={[1.38, 0.14, 1.55]} />
        <meshStandardMaterial color="#dc2626" roughness={0.3} />
      </mesh>

      {/* Large Rear Drive Tires (Deep Black Rubber Tread & Yellow Rims) */}
      <group position={[-0.95, 0.9, 0.75]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.9, 0.9, 0.44, 20]} />
          <meshStandardMaterial color="#111827" roughness={0.95} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.52, 0.52, 0.46, 16]} />
          <meshStandardMaterial color="#eab308" metalness={0.7} roughness={0.35} />
        </mesh>
      </group>

      <group position={[0.95, 0.9, 0.75]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.9, 0.9, 0.44, 20]} />
          <meshStandardMaterial color="#111827" roughness={0.95} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.52, 0.52, 0.46, 16]} />
          <meshStandardMaterial color="#eab308" metalness={0.7} roughness={0.35} />
        </mesh>
      </group>

      {/* Smaller Front Steering Wheels */}
      <group position={[-0.85, 0.55, -1.05]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.55, 0.55, 0.3, 16]} />
          <meshStandardMaterial color="#111827" roughness={0.95} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.32, 0.32, 0.32, 12]} />
          <meshStandardMaterial color="#eab308" metalness={0.7} roughness={0.35} />
        </mesh>
      </group>

      <group position={[0.85, 0.55, -1.05]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.55, 0.55, 0.3, 16]} />
          <meshStandardMaterial color="#111827" roughness={0.95} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.32, 0.32, 0.32, 12]} />
          <meshStandardMaterial color="#eab308" metalness={0.7} roughness={0.35} />
        </mesh>
      </group>
    </group>
  );
}

// ----------------------------------------------------------------------------
// 6. 100% NATURAL RESTRAINED GREEN TREES (OUTER PERIMETER ONLY)
// ----------------------------------------------------------------------------
function NaturalOakTree({ position = [0, 0, 0], scale = 1.0 }) {
  return (
    <group position={position} scale={scale}>
      {/* Textured Dark Wood Trunk */}
      <mesh position={[0, 1.8, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.65, 3.6, 7]} />
        <meshStandardMaterial color="#452f1e" roughness={0.9} />
      </mesh>
      {/* Broadleaf Multi-Tiered Botanical Green Foliage Canopy */}
      {[
        [0, 4.4, 0, 2.4, '#2e5c26'],
        [-1.3, 3.7, 0.5, 1.8, '#3a7030'],
        [1.3, 3.8, -0.4, 1.8, '#234a1c'],
        [0.2, 5.2, -0.3, 1.6, '#4c8a3f'],
        [-0.4, 3.8, -1.2, 1.5, '#2e5c26'],
      ].map(([bx, by, bz, br, color], idx) => (
        <mesh key={idx} position={[bx, by, bz]} castShadow>
          <sphereGeometry args={[br, 8, 7]} />
          <meshStandardMaterial color={color} roughness={0.75} />
        </mesh>
      ))}
    </group>
  );
}

function AlpineEvergreenPine({ position = [0, 0, 0], scale = 1.0 }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.32, 2.4, 6]} />
        <meshStandardMaterial color="#3b2618" roughness={0.9} />
      </mesh>
      {[0, 1, 2].map((tier) => (
        <mesh key={tier} position={[0, 2.1 + tier * 1.3, 0]} castShadow>
          <coneGeometry args={[1.75 - tier * 0.4, 1.9, 6]} />
          <meshStandardMaterial color="#17421e" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function NaturalGreenTreeGroves() {
  // Trees placed strictly on outer perimeter and outer knolls, well clear of fields and roads
  const oaks = useMemo(() => [
    { pos: [12.0, 0.4, -16.0], scale: 1.3 },
    { pos: [22.0, 0.4, -14.5], scale: 1.25 },
    { pos: [28.0, 0.4, -4.5], scale: 1.35 },
    { pos: [-19.5, 0.4, -15.5], scale: 1.4 },
    { pos: [-20.0, 0.4, 14.5], scale: 1.3 },
    { pos: [14.0, 0.4, 16.5], scale: 1.2 },
  ], []);

  const pines = useMemo(() => [
    { pos: [-26.0, 0.4, -19.0], scale: 1.5 },
    { pos: [-28.5, 0.4, -10.0], scale: 1.4 },
    { pos: [-27.0, 0.4, 4.0], scale: 1.35 },
    { pos: [-26.5, 0.4, 19.0], scale: 1.45 },
    { pos: [29.0, 0.4, -17.0], scale: 1.5 },
    { pos: [30.5, 0.4, 13.0], scale: 1.4 },
    { pos: [4.0, 0.4, -24.0], scale: 1.6 },
  ], []);

  // Fruit Orchard Enclosure beside the barn
  const orchardTrees = useMemo(() => [
    { pos: [16.5, 0.4, 8.5] },
    { pos: [19.5, 0.4, 8.5] },
    { pos: [16.5, 0.4, 12.5] },
    { pos: [19.5, 0.4, 12.5] },
  ], []);

  return (
    <group>
      {/* Mature Broadleaf Oaks on outer perimeter */}
      {oaks.map((o, idx) => (
        <NaturalOakTree key={`oak-${idx}`} position={o.pos} scale={o.scale} />
      ))}

      {/* Alpine Pines on surrounding knolls */}
      {pines.map((p, idx) => (
        <AlpineEvergreenPine key={`pine-${idx}`} position={p.pos} scale={p.scale} />
      ))}

      {/* Tidy Fruit Orchard beside the barn */}
      {orchardTrees.map((ot, idx) => (
        <group key={`orchard-${idx}`} position={ot.pos} scale={0.85}>
          <mesh position={[0, 1.2, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.35, 2.4, 6]} />
            <meshStandardMaterial color="#452a1a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 2.8, 0]} castShadow>
            <sphereGeometry args={[1.4, 8, 7]} />
            <meshStandardMaterial color="#2d6e24" roughness={0.7} />
          </mesh>
          {/* Subtle red fruit accents */}
          {[[-0.6, 2.7, 0.8], [0.7, 3.1, -0.6], [0.3, 2.4, 1.1]].map((fp, fIdx) => (
            <mesh key={fIdx} position={fp}>
              <sphereGeometry args={[0.12, 6, 6]} />
              <meshStandardMaterial color="#dc2626" roughness={0.4} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// ----------------------------------------------------------------------------
// 7. CEDAR SPLIT-RAIL BOUNDARY FENCES
// ----------------------------------------------------------------------------
function WoodenBoundaryFences() {
  const fencePosts = useMemo(() => {
    const list = [];
    // North boundary along z = -13.0 from x = -13 to +6
    for (let x = -13; x <= 6; x += 3.2) {
      list.push({ pos: [x, 0.48, -13.0] });
    }
    // South boundary along z = 13.0 from x = -13 to +6
    for (let x = -13; x <= 6; x += 3.2) {
      list.push({ pos: [x, 0.48, 13.0] });
    }
    // West field boundary along x = -13.0 from z = -13 to +13
    for (let z = -13; z <= 13; z += 3.2) {
      list.push({ pos: [-13.0, 0.48, z] });
    }
    // Orchard fence enclosure along x = 14.5 to 22, z = 6.5 to 14.5
    for (let x = 14.5; x <= 22; x += 2.5) {
      list.push({ pos: [x, 0.48, 6.5] });
    }
    return list;
  }, []);

  return (
    <group>
      {fencePosts.map((fp, idx) => (
        <group key={idx} position={fp.pos}>
          {/* Cedar Post */}
          <mesh castShadow>
            <cylinderGeometry args={[0.07, 0.08, 1.1, 6]} />
            <meshStandardMaterial color="#78593d" roughness={0.9} />
          </mesh>
          {/* Top Rail */}
          <mesh position={[1.4, 0.35, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.045, 0.045, 2.8, 5]} />
            <meshStandardMaterial color="#8c6a49" roughness={0.9} />
          </mesh>
          {/* Bottom Rail */}
          <mesh position={[1.4, -0.15, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.045, 0.045, 2.8, 5]} />
            <meshStandardMaterial color="#8c6a49" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ----------------------------------------------------------------------------
// 8. DETERMINISTIC, PLOT-AWARE CROP FURROW (NO OVERLAP, ZERO BLACK STICKS)
// ----------------------------------------------------------------------------
function InteractiveCropPlot({
  id,
  type = 'wheat',
  growthStage = 'vegetative',
  zPos = 0,
  isSelected = false,
  onSelect = null,
  soilMoisturePercent = 40,
  windSpeed = 10,
  isIrrigating = false,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const rowGroupRef = useRef();
  const sprayRef = useRef();

  // Dynamic soil moisture shading: dry sandy loam (#523824) -> rich loam (#352014) -> saturated (#1a1009)
  const soilColor = useMemo(() => {
    const moisture = Math.max(0, Math.min(100, Number(soilMoisturePercent) || 40));
    const factor = moisture / 100;
    const r = Math.round(0x52 - factor * (0x52 - 0x1a));
    const g = Math.round(0x38 - factor * (0x38 - 0x10));
    const b = Math.round(0x24 - factor * (0x24 - 0x09));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }, [soilMoisturePercent]);

  // Stage scaling anchored at plant base
  const stageScale = useMemo(() => {
    switch (growthStage) {
      case 'seedling':
        return 0.35;
      case 'vegetative':
        return 0.75;
      case 'flowering':
        return 0.95;
      case 'maturation':
      default:
        return 1.0;
    }
  }, [growthStage]);

  // Gentle wind sway animation
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (rowGroupRef.current && type !== 'fallow') {
      const swayAmt = Math.min(0.06, (windSpeed / 12) * 0.035);
      rowGroupRef.current.rotation.z = Math.sin(time * 2.0 + zPos * 0.7) * swayAmt;
    }

    if (sprayRef.current && isIrrigating) {
      sprayRef.current.children.forEach((drop, i) => {
        drop.position.y = 0.3 + Math.sin(time * 12 + i * 1.6) * 0.28;
      });
    }
  });

  // Deterministic plant positions strictly inside the plot bed
  const plantGrid = useMemo(() => {
    const list = [];

    if (type === 'wheat') {
      // 3 parallel furrow rows, 20 clumps per row
      const rows = [-1.0, 0.0, 1.0];
      const countX = 20;
      rows.forEach((rz) => {
        for (let i = 0; i < countX; i++) {
          const rx = -7.0 + (i / (countX - 1)) * 14.0;
          list.push([rx, 0, rz]);
        }
      });
    } else if (type === 'corn') {
      // 2 parallel furrow rows, 12 tall stalks per row
      const rows = [-0.7, 0.7];
      const countX = 12;
      rows.forEach((rz) => {
        for (let i = 0; i < countX; i++) {
          const rx = -6.8 + (i / (countX - 1)) * 13.6;
          list.push([rx, 0, rz]);
        }
      });
    } else if (type === 'lettuce') {
      // 3 parallel furrow rows, 14 rosettes per row
      const rows = [-1.0, 0.0, 1.0];
      const countX = 14;
      rows.forEach((rz) => {
        for (let i = 0; i < countX; i++) {
          const rx = -6.8 + (i / (countX - 1)) * 13.6;
          list.push([rx, 0, rz]);
        }
      });
    } else if (type === 'carrots') {
      // 3 parallel furrow rows, 18 plants per row
      const rows = [-1.0, 0.0, 1.0];
      const countX = 18;
      rows.forEach((rz) => {
        for (let i = 0; i < countX; i++) {
          const rx = -6.9 + (i / (countX - 1)) * 13.8;
          list.push([rx, 0, rz]);
        }
      });
    }

    return list;
  }, [type]);

  return (
    <group position={[-2.5, 0.35, zPos]}>
      {/* Raised Loam Soil Bed Mound (16m x 4.2m) */}
      <mesh
        position={[0, 0.12, 0]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(id);
        }}
        onPointerOver={() => setIsHovered(true)}
        onPointerOut={() => setIsHovered(false)}
      >
        <boxGeometry args={[16.0, 0.28, 4.2]} />
        <meshStandardMaterial
          color={soilColor}
          roughness={soilMoisturePercent > 60 ? 0.35 : 0.88}
          metalness={soilMoisturePercent > 60 ? 0.2 : 0.04}
        />
      </mesh>

      {/* 3 Parallel Furrow Ridges */}
      {[-1.0, 0.0, 1.0].map((rz, i) => (
        <mesh key={i} position={[0, 0.24, rz]} receiveShadow>
          <boxGeometry args={[15.6, 0.08, 0.55]} />
          <meshStandardMaterial color={soilColor} roughness={0.9} />
        </mesh>
      ))}

      {/* Active Irrigation Spray Mist (Centered directly over bed) */}
      {isIrrigating && (
        <group ref={sprayRef}>
          {[-6.0, -3.0, 0, 3.0, 6.0].map((sx, idx) => (
            <mesh key={idx} position={[sx, 0.5, 0]}>
              <sphereGeometry args={[0.16, 6, 6]} />
              <meshStandardMaterial color="#38bdf8" transparent opacity={0.75} roughness={0.1} />
            </mesh>
          ))}
        </group>
      )}

      {/* Interactive Selection Highlight Ring */}
      {(isSelected || isHovered) && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[16.4, 4.6]} />
          <meshBasicMaterial
            color={isSelected ? '#b8d6a0' : '#fef08a'}
            transparent
            opacity={isSelected ? 0.42 : 0.22}
          />
        </mesh>
      )}

      {/* Deterministic Crop Plants */}
      {type !== 'fallow' && (
        <group ref={rowGroupRef} position={[0, 0.28, 0]} scale={stageScale}>
          {plantGrid.map((pt, idx) => (
            <group key={idx} position={pt}>
              {/* 1. Golden Winter Wheat */}
              {type === 'wheat' && (
                <group scale={1.1}>
                  <mesh position={[0, 0.4, 0]}>
                    <cylinderGeometry args={[0.022, 0.032, 0.8, 5]} />
                    <meshStandardMaterial color="#948b3d" roughness={0.7} />
                  </mesh>
                  {/* Drooping Golden Wheat Head */}
                  <mesh position={[0.04, 0.82, 0]} rotation={[0, 0, -0.18]}>
                    <coneGeometry args={[0.08, 0.35, 5]} />
                    <meshStandardMaterial color="#d97706" roughness={0.65} />
                  </mesh>
                </group>
              )}

              {/* 2. Sweet Maize / Corn */}
              {type === 'corn' && (
                <group scale={1.15}>
                  <mesh position={[0, 0.75, 0]}>
                    <cylinderGeometry args={[0.045, 0.075, 1.5, 6]} />
                    <meshStandardMaterial color="#2d7a22" roughness={0.65} />
                  </mesh>
                  <mesh position={[0.2, 0.55, 0]} rotation={[0, 0, -0.55]}>
                    <boxGeometry args={[0.48, 0.025, 0.14]} />
                    <meshStandardMaterial color="#22661a" roughness={0.6} />
                  </mesh>
                  <mesh position={[-0.2, 0.85, 0]} rotation={[0, 0, 0.55]}>
                    <boxGeometry args={[0.48, 0.025, 0.14]} />
                    <meshStandardMaterial color="#22661a" roughness={0.6} />
                  </mesh>
                  {/* Top Golden Tassel */}
                  <mesh position={[0, 1.55, 0]}>
                    <coneGeometry args={[0.12, 0.32, 5]} />
                    <meshStandardMaterial color="#fbbf24" roughness={0.7} />
                  </mesh>
                  {/* Corn Cob */}
                  <mesh position={[0.12, 0.7, 0.08]} rotation={[0.35, 0, 0.2]}>
                    <cylinderGeometry args={[0.06, 0.06, 0.28, 6]} />
                    <meshStandardMaterial color="#fef08a" roughness={0.5} />
                  </mesh>
                </group>
              )}

              {/* 3. Hydro-Tolerant Greens / Lettuce */}
              {type === 'lettuce' && (
                <group scale={1.1}>
                  <mesh position={[0, 0.16, 0]}>
                    <sphereGeometry args={[0.3, 7, 6]} />
                    <meshStandardMaterial color="#34a832" roughness={0.65} />
                  </mesh>
                  <mesh position={[0.08, 0.12, 0.08]}>
                    <sphereGeometry args={[0.24, 6, 5]} />
                    <meshStandardMaterial color="#42bd40" roughness={0.65} />
                  </mesh>
                  <mesh position={[-0.08, 0.14, -0.04]}>
                    <sphereGeometry args={[0.25, 6, 5]} />
                    <meshStandardMaterial color="#288727" roughness={0.65} />
                  </mesh>
                </group>
              )}

              {/* 4. Deep-Root Carrots */}
              {type === 'carrots' && (
                <group scale={1.1}>
                  {/* Feathery Foliage Fronds */}
                  <mesh position={[0, 0.3, 0]}>
                    <coneGeometry args={[0.24, 0.58, 6]} />
                    <meshStandardMaterial color="#1e731b" roughness={0.8} />
                  </mesh>
                  <mesh position={[0.06, 0.25, 0.04]} rotation={[0.2, 0, -0.2]}>
                    <coneGeometry args={[0.16, 0.48, 5]} />
                    <meshStandardMaterial color="#248a20" roughness={0.8} />
                  </mesh>
                  {/* Orange Root Crown Peek */}
                  <mesh position={[0, 0.03, 0]}>
                    <cylinderGeometry args={[0.07, 0.05, 0.09, 6]} />
                    <meshStandardMaterial color="#ea580c" roughness={0.6} />
                  </mesh>
                </group>
              )}
            </group>
          ))}
        </group>
      )}
    </group>
  );
}

// ============================================================================
// MAIN REBUILT 3D FARM SCENE
// ============================================================================
export function FarmScene({
  selectedRowId = null,
  onSelectRow = null,
  isIrrigating = false,
  plots = [],
  soilMoisturePercent = 40,
  windSpeed = 10,
}) {
  const terrainMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.88,
        metalness: 0.05,
        flatShading: true,
      }),
    []
  );

  // 4 well-spaced, distinct field rows with 1.8m-2.4m pathways between them
  const furrows = useMemo(
    () => [
      { id: 'row-1', zPos: -9.0 },
      { id: 'row-2', zPos: -3.0 },
      { id: 'row-3', zPos: 3.0 },
      { id: 'row-4', zPos: 9.0 },
    ],
    []
  );

  const plotByRow = useMemo(() => {
    const map = {};
    if (Array.isArray(plots)) {
      plots.forEach((p) => {
        if (p && p.rowId) {
          map[p.rowId] = p;
        }
      });
    }
    return map;
  }, [plots]);

  return (
    <group>
      {/* 1. Expansive Continuous Farmland Terrain (240m x 240m) */}
      <mesh
        geometry={STATIC_FARMLAND_TERRAIN_GEOM}
        material={terrainMaterial}
        receiveShadow
        position={[0, 0, 0]}
      />

      {/* 2. 360° Surrounding Mountain Backdrop (Framing Valley Basin) */}
      <SurroundingMountainBackdrop />

      {/* 3. Picturesque Rustic Farmhouse with Terracotta Roof & Chimney */}
      <PicturesqueFarmhouse position={[14.5, 0.45, -6.5]} />

      {/* 4. Weathered Timber Barn & Galvanized Grain Silo */}
      <WeatheredTimberBarnAndSilo barnPos={[22.5, 0.4, 4.5]} siloPos={[22.5, 0.4, 10.5]} />

      {/* 5. Detailed Red Agricultural Tractor (Parked on Road) */}
      <ModernAgriculturalTractor position={[4.5, 0.42, 0.2]} rotation={[0, -0.22, 0]} />

      {/* 6. Natural Green Trees, Pines & Fruit Orchard (Outer Perimeter Only) */}
      <NaturalGreenTreeGroves />

      {/* 7. Cedar Split-Rail Boundary & Field Fences */}
      <WoodenBoundaryFences />

      {/* 8. 4 Distinct, Deterministically Planted Crop Fields (No Overlap) */}
      {furrows.map((furrow) => {
        const plot = plotByRow[furrow.id];
        return (
          <InteractiveCropPlot
            key={furrow.id}
            id={furrow.id}
            type={plot ? plot.cropType : 'wheat'}
            growthStage={plot ? plot.growthStage : 'vegetative'}
            zPos={furrow.zPos}
            isSelected={selectedRowId === furrow.id}
            onSelect={onSelectRow}
            soilMoisturePercent={soilMoisturePercent}
            windSpeed={windSpeed}
            isIrrigating={isIrrigating}
          />
        );
      })}
    </group>
  );
}
