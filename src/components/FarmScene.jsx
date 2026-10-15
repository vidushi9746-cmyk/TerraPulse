import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// =============================================================
// MODULE-LEVEL STATIC INITIALIZATION (Zero Render Overhead)
// =============================================================

// 1. Expansive Continuous Sculpted Agricultural Landscape (110m x 110m)
// 1. Expansive Continuous Sculpted Agricultural Landscape (160m x 160m)
const TERRAIN_SIZE = 160;
const TERRAIN_SEGS = 96;
const TERRAIN_GEOMETRY = new THREE.PlaneGeometry(
  TERRAIN_SIZE,
  TERRAIN_SIZE,
  TERRAIN_SEGS,
  TERRAIN_SEGS
);
TERRAIN_GEOMETRY.rotateX(-Math.PI / 2);

const posAttr = TERRAIN_GEOMETRY.attributes.position;
const colorsAttr = new Float32Array(posAttr.count * 3);

for (let i = 0; i < posAttr.count; i++) {
  const x = posAttr.getX(i);
  const z = posAttr.getZ(i);
  const distFromCenter = Math.sqrt(x * x + z * z);

  let y, r, g, b;

  const inCenterFieldX = x >= -7.8 && x <= 7.8;
  const inCenterFieldZ = z >= -5.4 && z <= 5.4;

  if (inCenterFieldX && inCenterFieldZ) {
    // ---------------------------------------------------------
    // CULTIVATED AGRICULTURAL PARCEL WITH SINUSOIDAL FURROW BERMS
    // ---------------------------------------------------------
    const furrowBerm = Math.sin(z * 3.14159) * 0.09;
    y = 0.08 + furrowBerm;

    // Rich, fertile agricultural loam (dark, moist organic soil)
    const isRidge = furrowBerm > 0;
    if (isRidge) {
      r = 0.27; g = 0.18; b = 0.12; // warm furrow crest
    } else {
      r = 0.16; g = 0.10; b = 0.06; // deep damp furrow trough
    }
  } else if (distFromCenter < 12.0) {
    // ---------------------------------------------------------
    // FIELD HEADLANDS & TURNING MARGINS (Packed Loam & Verges)
    // ---------------------------------------------------------
    const swale = Math.sin((distFromCenter - 6.8) * 0.75) * 0.065;
    y = 0.05 + Math.max(-0.08, swale);

    // East side access road / tractor driveway
    if (x >= 7.2 && x <= 13.0 && Math.abs(z) < 26) {
      y = 0.07;
      r = 0.38; g = 0.32; b = 0.25; // compacted farm lane gravel
    } else {
      // Grassy verge & headland transition
      const fieldEdgeDist = Math.max(Math.abs(x) - 7.8, Math.abs(z) - 5.4);
      const blend = Math.min(1, Math.max(0, fieldEdgeDist / 2.8));
      r = 0.22 * (1 - blend) + 0.25 * blend;
      g = 0.16 * (1 - blend) + 0.36 * blend;
      b = 0.10 * (1 - blend) + 0.18 * blend;
    }
  } else if (z > 6.5 && z < 36 && x > -32 && x < 32) {
    // ---------------------------------------------------------
    // SOUTH ADJOINING AGRICULTURAL PARCEL (Golden Wheat / Cereal Swath)
    // ---------------------------------------------------------
    const strawStripes = Math.sin(x * 1.8) * 0.025;
    y = 0.06 + Math.sin(x * 0.06) * 0.14 + strawStripes;
    r = 0.58 + strawStripes;
    g = 0.44 + strawStripes;
    b = 0.22;
  } else if (z < -6.5 && z > -36 && x > -34 && x < 34) {
    // ---------------------------------------------------------
    // NORTH ADJOINING AGRICULTURAL PARCEL (Lush Emerald Alfalfa / Clover)
    // ---------------------------------------------------------
    y = 0.06 + Math.cos(x * 0.06) * 0.12;
    r = 0.17;
    g = 0.37 + Math.sin(z * 0.3) * 0.02;
    b = 0.17;
  } else if (x < -9.0 && x > -44 && Math.abs(z) < 16) {
    // ---------------------------------------------------------
    // WEST ADJOINING AGRICULTURAL PARCEL (Dark Tilled Loamy Soil)
    // ---------------------------------------------------------
    const tilledFurrows = Math.sin(z * 2.2) * 0.04;
    y = 0.05 + tilledFurrows;
    r = 0.22;
    g = 0.14;
    b = 0.09;
  } else {
    // ---------------------------------------------------------
    // ROLLING VALLEY PASTURES & DISTANT MOUNTAIN HORIZON
    // ---------------------------------------------------------
    const hillWeight = Math.min(1, (distFromCenter - 14.0) / 16);
    y = (Math.sin(x * 0.08) * Math.cos(z * 0.08) * 2.6 + Math.sin(x * 0.045 + 1.2) * 1.8) * hillWeight;

    // Distant North & Northwest Mountain Ridges (Layered Horizon)
    if (z < -10) {
      const ridgeFactor = Math.min(1, (-z - 10) / 16);
      y += (Math.sin(x * 0.12) * 4.4 + Math.cos(x * 0.06) * 3.2 + 8.5) * ridgeFactor;

      // Northern mountain slopes with sub-alpine evergreen forest
      r = 0.15; g = 0.24; b = 0.14;
      if (y > 8.0) {
        // High mountain slate rock crags
        r = 0.35; g = 0.39; b = 0.37;
      }
    } else {
      // Pasture meadow greens
      r = 0.23 + Math.sin(x * 0.15) * 0.02;
      g = 0.35 + Math.cos(z * 0.15) * 0.03;
      b = 0.17;
    }

    // East farm road continuing into the distant landscape
    if (x >= 7.6 && x <= 12.8 && z > 0) {
      r = 0.36; g = 0.31; b = 0.24;
      y = Math.min(y, 0.12);
    }
  }

  posAttr.setY(i, y);
  colorsAttr[i * 3 + 0] = r;
  colorsAttr[i * 3 + 1] = g;
  colorsAttr[i * 3 + 2] = b;
}

TERRAIN_GEOMETRY.setAttribute('color', new THREE.BufferAttribute(colorsAttr, 3));
TERRAIN_GEOMETRY.computeVertexNormals();

// 2. Micro-Drip Mist Particles (Static Buffer)
const MIST_COUNT = 340;
const INITIAL_MIST_POSITIONS = new Float32Array(MIST_COUNT * 3);
for (let i = 0; i < MIST_COUNT; i++) {
  const rowZ = [-3.0, -1.0, 1.0, 3.0][i % 4];
  INITIAL_MIST_POSITIONS[i * 3 + 0] = (Math.random() - 0.5) * 13.2;
  INITIAL_MIST_POSITIONS[i * 3 + 1] = 0.35 + Math.random() * 0.7;
  INITIAL_MIST_POSITIONS[i * 3 + 2] = rowZ + (Math.random() - 0.5) * 0.38;
}

// =============================================================
// BOTANICAL CROP ARCHITECTURE (Semi-Realistic Simulation Quality)
// =============================================================

// -------------------------------------------------------------
// Plot 1: Lush Golden Wheat Cluster (Dense sheaf with waving awns)
// -------------------------------------------------------------
function WheatCanopyCluster({ position, delay = 0, windSpeed = 10, selected = false, posX = 0 }) {
  const clusterRef = useRef();

  useFrame(({ clock }) => {
    if (!clusterRef.current) return;
    const t = clock.getElapsedTime() * (windSpeed * 0.15) + delay;
    // Traveling wind wave formula down the furrow row (simulation game effect)
    const wave = Math.sin(t * 2.2 + posX * 0.85) * 0.085;
    clusterRef.current.rotation.z = wave + (windSpeed * 0.0035);
    clusterRef.current.rotation.x = Math.cos(t * 1.1 + posX * 0.4) * 0.045;
  });

  // Stems in cluster with organic radial spread
  const stalks = useMemo(() => [
    { x: 0, z: 0, h: 0.96, rotZ: 0.02, rotX: 0.01 },
    { x: -0.07, z: -0.06, h: 0.89, rotZ: -0.08, rotX: -0.05 },
    { x: 0.07, z: -0.05, h: 0.92, rotZ: 0.07, rotX: -0.04 },
    { x: -0.06, z: 0.06, h: 0.87, rotZ: -0.07, rotX: 0.06 },
    { x: 0.06, z: 0.07, h: 0.93, rotZ: 0.08, rotX: 0.05 },
    { x: 0.0, z: 0.09, h: 0.85, rotZ: 0.01, rotX: 0.08 },
    { x: -0.08, z: 0.01, h: 0.91, rotZ: -0.09, rotX: 0.02 },
    { x: 0.08, z: 0.01, h: 0.94, rotZ: 0.09, rotX: -0.02 },
  ], []);

  const stalkColor = selected ? '#fef08a' : '#d4a347';
  const grainColor = selected ? '#fffbeb' : '#eab308';
  const awnColor = selected ? '#ffffff' : '#fde047';

  return (
    <group ref={clusterRef} position={position}>
      {stalks.map((s, idx) => (
        <group
          key={idx}
          position={[s.x, 0, s.z]}
          rotation={[s.rotX, 0, s.rotZ]}
        >
          {/* Slender golden stem (Smooth shading) */}
          <mesh position={[0, s.h * 0.45, 0]} castShadow>
            <cylinderGeometry args={[0.012, 0.018, s.h * 0.9, 7]} />
            <meshStandardMaterial
              color={stalkColor}
              roughness={0.65}
            />
          </mesh>

          {/* Arching blade leaf */}
          <mesh position={[0.045, s.h * 0.42, 0]} rotation={[0, 0, -0.45]}>
            <boxGeometry args={[0.18, 0.008, 0.03]} />
            <meshStandardMaterial color={stalkColor} roughness={0.65} />
          </mesh>

          {/* Textured wheat spike / grain head */}
          <mesh position={[0, s.h * 0.92, 0]} castShadow>
            <cylinderGeometry args={[0.038, 0.028, s.h * 0.32, 8]} />
            <meshStandardMaterial
              color={grainColor}
              roughness={0.55}
            />
          </mesh>

          {/* Fine nodding awn beard */}
          <mesh position={[0.014, s.h * 1.1, 0]} rotation={[0, 0, 0.14]}>
            <cylinderGeometry args={[0.006, 0.014, 0.16, 5]} />
            <meshStandardMaterial color={awnColor} roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// -------------------------------------------------------------
// Plot 2: Architectural Sweet Corn Plant (Tall weeping blades & ears)
// -------------------------------------------------------------
function CornPlant({ position, delay = 0, windSpeed = 10, selected = false, posX = 0 }) {
  const cornRef = useRef();

  useFrame(({ clock }) => {
    if (!cornRef.current) return;
    const t = clock.getElapsedTime() * (windSpeed * 0.12) + delay;
    const sway = Math.sin(t * 1.8 + posX * 0.5) * 0.055;
    cornRef.current.rotation.z = sway;
    cornRef.current.rotation.x = Math.cos(t * 0.9 + posX * 0.3) * 0.032;
  });

  const leafMatColor = selected ? '#86efac' : '#235928';
  const midLeafColor = selected ? '#a7f3d0' : '#2e7035';
  const earColor = '#eab308';
  const silkColor = '#ca8a04';

  return (
    <group ref={cornRef} position={position}>
      {/* Heavy jointed cane stalk (Smooth shading) */}
      <mesh position={[0, 0.98, 0]} castShadow>
        <cylinderGeometry args={[0.038, 0.056, 1.96, 8]} />
        <meshStandardMaterial
          color={leafMatColor}
          roughness={0.62}
        />
      </mesh>

      {/* Flowering tassel crown at apex */}
      <group position={[0, 1.98, 0]}>
        <mesh>
          <coneGeometry args={[0.075, 0.3, 6]} />
          <meshStandardMaterial color={silkColor} roughness={0.55} />
        </mesh>
        <mesh position={[0.05, -0.06, 0]} rotation={[0, 0, 0.35]}>
          <coneGeometry args={[0.032, 0.2, 5]} />
          <meshStandardMaterial color={silkColor} roughness={0.55} />
        </mesh>
        <mesh position={[-0.05, -0.06, 0]} rotation={[0, 0, -0.35]}>
          <coneGeometry args={[0.032, 0.2, 5]} />
          <meshStandardMaterial color={silkColor} roughness={0.55} />
        </mesh>
      </group>

      {/* Tier 1 Lower Weeping Blades (Arching outward) */}
      <mesh position={[-0.28, 0.65, 0.04]} rotation={[0.15, 0.2, 0.68]} castShadow>
        <boxGeometry args={[0.52, 0.016, 0.12]} />
        <meshStandardMaterial color={leafMatColor} side={THREE.DoubleSide} roughness={0.58} />
      </mesh>
      <mesh position={[0.28, 0.78, -0.04]} rotation={[-0.15, -0.2, -0.68]} castShadow>
        <boxGeometry args={[0.52, 0.016, 0.12]} />
        <meshStandardMaterial color={leafMatColor} side={THREE.DoubleSide} roughness={0.58} />
      </mesh>

      {/* Tier 2 Mid-Canopy Blades */}
      <mesh position={[-0.3, 1.12, -0.05]} rotation={[-0.12, -0.3, 0.62]} castShadow>
        <boxGeometry args={[0.48, 0.016, 0.1]} />
        <meshStandardMaterial color={midLeafColor} side={THREE.DoubleSide} roughness={0.55} />
      </mesh>
      <mesh position={[0.3, 1.3, 0.05]} rotation={[0.12, 0.3, -0.62]} castShadow>
        <boxGeometry args={[0.48, 0.016, 0.1]} />
        <meshStandardMaterial color={midLeafColor} side={THREE.DoubleSide} roughness={0.55} />
      </mesh>

      {/* Tier 3 Upper Blades */}
      <mesh position={[-0.24, 1.58, 0.02]} rotation={[0.1, 0.15, 0.52]} castShadow>
        <boxGeometry args={[0.4, 0.014, 0.08]} />
        <meshStandardMaterial color={midLeafColor} side={THREE.DoubleSide} roughness={0.55} />
      </mesh>

      {/* Ripe Corn Ear nestled in leaf sheath */}
      <group position={[0.09, 0.92, 0.07]} rotation={[0.38, 0.25, -0.28]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.054, 0.038, 0.32, 8]} />
          <meshStandardMaterial color={earColor} roughness={0.42} />
        </mesh>
        {/* Fine silk fibers */}
        <mesh position={[0, 0.2, 0]}>
          <coneGeometry args={[0.026, 0.12, 5]} />
          <meshStandardMaterial color={silkColor} roughness={0.55} />
        </mesh>
      </group>
    </group>
  );
}

// -------------------------------------------------------------
// Plot 3: Hydro Greens / Brassica Rosette (Botanical nested layered leaves)
// -------------------------------------------------------------
function BrassicaRosette({ position, selected = false, delay = 0, windSpeed = 10, posX = 0 }) {
  const rosetteRef = useRef();

  useFrame(({ clock }) => {
    if (!rosetteRef.current) return;
    const t = clock.getElapsedTime() * (windSpeed * 0.1) + delay;
    rosetteRef.current.rotation.z = Math.sin(t * 1.6 + posX * 0.45) * 0.024;
    rosetteRef.current.rotation.x = Math.cos(t * 0.85 + posX * 0.3) * 0.016;
  });

  const outerColor = selected ? '#86efac' : '#194c23';
  const midColor = selected ? '#bbf7d0' : '#227233';
  const heartColor = selected ? '#dcfce7' : '#45d479';

  return (
    <group ref={rosetteRef} position={position}>
      {/* Dark damp soil collar mound */}
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <cylinderGeometry args={[0.34, 0.44, 0.06, 9]} />
        <meshStandardMaterial color="#20140a" roughness={0.92} />
      </mesh>

      {/* Outer Wavy Foundation Leaves (Hugging soil berm) */}
      {[0, 0.78, 1.57, 2.35, 3.14, 3.92, 4.71, 5.49].map((rad, idx) => (
        <mesh
          key={`outer-${idx}`}
          position={[Math.cos(rad) * 0.2, 0.08, Math.sin(rad) * 0.2]}
          rotation={[0.34, rad, 0.22]}
          castShadow
        >
          <boxGeometry args={[0.26, 0.014, 0.18]} />
          <meshStandardMaterial color={outerColor} roughness={0.62} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Mid-tier Cupped Canopy Leaves */}
      {[0.39, 1.17, 1.96, 2.74, 3.53, 4.31, 5.1, 5.89].map((rad, idx) => (
        <mesh
          key={`mid-${idx}`}
          position={[Math.cos(rad) * 0.12, 0.14, Math.sin(rad) * 0.12]}
          rotation={[0.56, rad, 0.18]}
          castShadow
        >
          <boxGeometry args={[0.21, 0.014, 0.14]} />
          <meshStandardMaterial color={midColor} roughness={0.58} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Tender Jade Heart Center (Smooth shading) */}
      <mesh position={[0, 0.19, 0]} castShadow>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshStandardMaterial color={heartColor} roughness={0.48} />
      </mesh>
    </group>
  );
}

// -------------------------------------------------------------
// Plot 4: Deep-Root Carrot Mound (Exposed root crown & fern fronds)
// -------------------------------------------------------------
function CarrotMound({ position, selected = false, delay = 0, windSpeed = 10, posX = 0 }) {
  const carrotRef = useRef();

  useFrame(({ clock }) => {
    if (!carrotRef.current) return;
    const t = clock.getElapsedTime() * (windSpeed * 0.12) + delay;
    carrotRef.current.rotation.z = Math.sin(t * 1.9 + posX * 0.5) * 0.038;
    carrotRef.current.rotation.x = Math.cos(t * 0.95 + posX * 0.32) * 0.022;
  });

  const rootColor = '#ea580c';
  const leafColor = selected ? '#86efac' : '#1c632d';
  const tipColor = selected ? '#bbf7d0' : '#258239';

  return (
    <group ref={carrotRef} position={position}>
      {/* Soil crest mound */}
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <cylinderGeometry args={[0.24, 0.34, 0.06, 8]} />
        <meshStandardMaterial color="#281a0f" roughness={0.92} />
      </mesh>

      {/* Exposed carrot root crown peeking through damp loam */}
      <mesh position={[0, 0.07, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.035, 0.12, 8]} />
        <meshStandardMaterial color={rootColor} roughness={0.52} />
      </mesh>

      {/* Graceful fountain of feathery compound fronds */}
      {[
        { rotZ: 0.38, rotX: 0.12, h: 0.38 },
        { rotZ: -0.38, rotX: -0.12, h: 0.4 },
        { rotZ: 0.12, rotX: 0.36, h: 0.36 },
        { rotZ: -0.12, rotX: -0.36, h: 0.37 },
        { rotZ: 0.02, rotX: 0.02, h: 0.44 }, // central upright frond
      ].map((frond, idx) => (
        <group
          key={idx}
          position={[0, 0.11, 0]}
          rotation={[frond.rotX, 0, frond.rotZ]}
        >
          {/* Main frond rib */}
          <mesh position={[0, frond.h * 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.008, 0.014, frond.h, 6]} />
            <meshStandardMaterial color={leafColor} roughness={0.65} />
          </mesh>
          {/* Feathery lateral pinnules */}
          <mesh position={[0.045, frond.h * 0.65, 0]} rotation={[0, 0, 0.5]}>
            <boxGeometry args={[0.13, 0.006, 0.048]} />
            <meshStandardMaterial color={tipColor} roughness={0.6} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[-0.045, frond.h * 0.75, 0]} rotation={[0, 0, -0.5]}>
            <boxGeometry args={[0.13, 0.006, 0.048]} />
            <meshStandardMaterial color={tipColor} roughness={0.6} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// -------------------------------------------------------------
// Interactive Crop Row Assembly (Precision furrow spacing & drip)
// -------------------------------------------------------------
function CropRow({
  id,
  type,
  zPos,
  isSelected,
  onSelect,
  windSpeed = 10,
  growthStage = 'vegetative',
}) {
  const [hovered, setHovered] = useState(false);

  const isFallow = type === 'fallow' || type === 'none' || !type;

  // Derive visual scaling factor based on botanical growth stage
  const stageScale = useMemo(() => {
    if (growthStage === 'seedling') return 0.58;
    if (growthStage === 'flowering') return 1.05;
    if (growthStage === 'maturation') return 0.95;
    return 0.82; // vegetative
  }, [growthStage]);

  // Believable agricultural spacing down a 12m furrow
  const { rowCount, startX, spacingX } = useMemo(() => {
    if (isFallow) return { rowCount: 0, startX: 0, spacingX: 1 };
    if (type === 'wheat') return { rowCount: 22, startX: -5.7, spacingX: 0.54 };
    if (type === 'corn') return { rowCount: 14, startX: -5.5, spacingX: 0.84 };
    if (type === 'lettuce') return { rowCount: 16, startX: -5.6, spacingX: 0.74 };
    return { rowCount: 20, startX: -5.6, spacingX: 0.59 }; // carrots
  }, [type, isFallow]);

  return (
    <group
      position={[0, 0.06, zPos]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Sub-surface Black Polyethylene Drip Tubing */}
      <mesh position={[0, 0.04, 0.32]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.016, 0.016, 12.2, 6]} />
        <meshStandardMaterial color="#1a202c" roughness={0.6} metalness={0.25} />
      </mesh>

      {/* Precision Micro-Drip Emitter Nodes */}
      {[-5.0, -2.5, 0, 2.5, 5.0].map((emitX, idx) => (
        <group key={idx} position={[emitX, 0.06, 0.32]}>
          <mesh>
            <cylinderGeometry args={[0.018, 0.022, 0.05, 6]} />
            <meshStandardMaterial color="#64748b" metalness={0.7} />
          </mesh>
        </group>
      ))}

      {/* Agritech Selection & Hover Guide Ring (Subtle & High-Tech) */}
      {(isSelected || hovered) && (
        <group position={[0, 0.015, 0]}>
          {/* Row outline telemetry rectangle */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[12.6, 1.25]} />
            <meshBasicMaterial
              color={isSelected ? '#15803d' : '#0284c7'}
              transparent
              opacity={isSelected ? 0.22 : 0.12}
            />
          </mesh>
          {/* Border line markers */}
          <mesh position={[-6.3, 0.02, 0]}>
            <boxGeometry args={[0.06, 0.04, 1.25]} />
            <meshBasicMaterial color={isSelected ? '#22c55e' : '#38bdf8'} />
          </mesh>
          <mesh position={[6.3, 0.02, 0]}>
            <boxGeometry args={[0.06, 0.04, 1.25]} />
            <meshBasicMaterial color={isSelected ? '#22c55e' : '#38bdf8'} />
          </mesh>
        </group>
      )}

      {/* Arranged Crops with Organic Height & Orientation Jitter */}
      {Array.from({ length: rowCount }).map((_, i) => {
        const posX = startX + i * spacingX;
        const delay = i * 0.18;
        const heightVar = 0.94 + ((i * 7) % 9) * 0.015;
        const rotVar = ((i * 13) % 11) * 0.05 - 0.25;

        const plantScale = heightVar * stageScale;

        if (type === 'wheat') {
          return (
            <group
              key={i}
              position={[posX, 0.08, ((i % 2) * 0.08 - 0.04)]}
              scale={[plantScale, plantScale, plantScale]}
              rotation={[0, rotVar, 0]}
            >
              <WheatCanopyCluster
                position={[0, 0, 0]}
                delay={delay}
                windSpeed={windSpeed}
                selected={isSelected}
                posX={posX}
              />
            </group>
          );
        }
        if (type === 'corn') {
          return (
            <group
              key={i}
              position={[posX, 0.08, 0]}
              scale={[stageScale, plantScale, stageScale]}
              rotation={[0, rotVar * 0.5, 0]}
            >
              <CornPlant
                position={[0, 0, 0]}
                delay={delay}
                windSpeed={windSpeed}
                selected={isSelected}
                posX={posX}
              />
            </group>
          );
        }
        if (type === 'lettuce') {
          return (
            <group
              key={i}
              position={[posX, 0.08, 0]}
              scale={[plantScale, plantScale, plantScale]}
              rotation={[0, rotVar * 2, 0]}
            >
              <BrassicaRosette
                position={[0, 0, 0]}
                selected={isSelected}
                delay={delay}
                windSpeed={windSpeed}
                posX={posX}
              />
            </group>
          );
        }
        if (type === 'carrots') {
          return (
            <group
              key={i}
              position={[posX, 0.08, 0]}
              scale={[plantScale, plantScale, plantScale]}
              rotation={[0, rotVar * 1.5, 0]}
            >
              <CarrotMound
                position={[0, 0, 0]}
                selected={isSelected}
                delay={delay}
                windSpeed={windSpeed}
                posX={posX}
              />
            </group>
          );
        }
        return null;
      })}
    </group>
  );
}

// -------------------------------------------------------------
// MICRO-DRIP IRRIGATION MIST PARTICLES
// -------------------------------------------------------------
function IrrigationMist({ active }) {
  const mistRef = useRef();

  const [positions] = useMemo(() => {
    return [new Float32Array(INITIAL_MIST_POSITIONS)];
  }, []);

  useFrame(({ clock }) => {
    if (!active || !mistRef.current) return;
    const t = clock.getElapsedTime() * 3.2;
    const posArr = mistRef.current.geometry.attributes.position.array;

    for (let i = 0; i < MIST_COUNT; i++) {
      posArr[i * 3 + 1] += Math.sin(t + i) * 0.008;
      if (posArr[i * 3 + 1] > 1.25) posArr[i * 3 + 1] = 0.35;
    }
    mistRef.current.geometry.attributes.position.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={mistRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.16}
        color="#7dd3fc"
        transparent
        opacity={0.55}
        depthWrite={false}
      />
    </points>
  );
}

// =============================================================
// FARM ARCHITECTURE & AGRITECH STRUCTURES
// =============================================================

// -------------------------------------------------------------
// Modernized Heritage Timber Barn & Galvanized Silo
// -------------------------------------------------------------
function FarmStructures() {
  return (
    <group position={[14.2, 0.08, 0.5]}>
      {/* 1. Concrete Foundation Plinth for Barn & Silo */}
      <mesh position={[-1.2, 0.12, 0]} receiveShadow>
        <boxGeometry args={[8.8, 0.24, 11.8]} />
        <meshStandardMaterial color="#64748b" roughness={0.85} />
      </mesh>

      {/* 2. Timber Gambrel Equipment Barn */}
      <group position={[-1.2, 0.24, -1.2]}>
        {/* Main Timber Wall Body (Dark Cedar Siding) */}
        <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[6.8, 3.6, 9.2]} />
          <meshStandardMaterial
            color="#2a2018"
            roughness={0.82}
          />
        </mesh>

        {/* Board-and-Batten Shadow Relief Panels */}
        {[-3.42, 3.42].map((xSide, idx) => (
          <group key={idx} position={[xSide, 1.8, 0]}>
            {[-3.6, -1.8, 0, 1.8, 3.6].map((zBat, bIdx) => (
              <mesh key={bIdx} position={[0, 0, zBat]}>
                <boxGeometry args={[0.06, 3.5, 0.12]} />
                <meshStandardMaterial color="#1e1610" roughness={0.88} />
              </mesh>
            ))}
          </group>
        ))}

        {/* Gambrel Roof (Dark standing-seam charcoal zinc with eaves) */}
        <mesh position={[0, 4.4, 0]} castShadow>
          <coneGeometry args={[4.8, 2.2, 4]} />
          <meshStandardMaterial
            color="#272f38"
            roughness={0.52}
            metalness={0.38}
          />
        </mesh>

        {/* Front Sliding Equipment Doors (Charcoal with cross-brace) */}
        <group position={[-3.42, 1.4, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.08, 2.8, 3.4]} />
            <meshStandardMaterial color="#1a1410" roughness={0.78} />
          </mesh>
          {/* Diagonal Cross-Braces */}
          <mesh position={[-0.05, 0, 0]} rotation={[0, 0, 0.45]}>
            <boxGeometry args={[0.04, 3.0, 0.16]} />
            <meshStandardMaterial color="#382c22" roughness={0.82} />
          </mesh>
        </group>

        {/* Transom Hayloft Window with Warm Interior Glow */}
        <mesh position={[-3.42, 3.6, 0]}>
          <planeGeometry args={[0.9, 0.7]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>

        {/* Gooseneck Industrial Barn Light */}
        <group position={[-3.6, 3.1, 0]}>
          <mesh>
            <cylinderGeometry args={[0.015, 0.015, 0.4, 6]} rotation={[0, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#475569" metalness={0.8} />
          </mesh>
          <mesh position={[-0.2, -0.08, 0]}>
            <coneGeometry args={[0.12, 0.1, 8]} />
            <meshStandardMaterial color="#334155" metalness={0.8} />
          </mesh>
          <pointLight position={[-0.2, -0.15, 0]} intensity={0.9} distance={6} color="#fef08a" />
        </group>
      </group>

      {/* 3. Galvanized Corrugated Steel Grain Silo (Smooth Realistic Specular) */}
      <group position={[3.6, 0.24, 2.8]}>
        {/* Concrete Circular Foundation Base */}
        <mesh position={[0, 0.12, 0]} receiveShadow>
          <cylinderGeometry args={[1.9, 2.05, 0.24, 20]} />
          <meshStandardMaterial color="#64748b" roughness={0.82} />
        </mesh>

        {/* Corrugated Galvanized Steel Cylinder (Smooth Normal Shading) */}
        <mesh position={[0, 4.2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.75, 1.75, 8.2, 24]} />
          <meshStandardMaterial
            color="#94a3b8"
            roughness={0.38}
            metalness={0.72}
          />
        </mesh>

        {/* Horizontal Stiffening Rib Rings */}
        {[1.6, 3.2, 4.8, 6.4, 8.0].map((ringY, idx) => (
          <mesh key={idx} position={[0, ringY, 0]}>
            <torusGeometry args={[1.77, 0.035, 8, 24]} />
            <meshStandardMaterial color="#64748b" metalness={0.75} roughness={0.35} />
          </mesh>
        ))}

        {/* Domed Galvanized Roof with Aeration Vent Cap */}
        <mesh position={[0, 8.8, 0]} castShadow>
          <coneGeometry args={[1.82, 1.2, 22]} />
          <meshStandardMaterial
            color="#cbd5e1"
            roughness={0.35}
            metalness={0.75}
          />
        </mesh>
        <mesh position={[0, 9.5, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.35, 12]} />
          <meshStandardMaterial color="#475569" metalness={0.85} />
        </mesh>

        {/* External Steel Safety Ladder with Cage */}
        <group position={[-1.78, 4.2, 0]}>
          {/* Vertical Rails */}
          <mesh position={[0, 0, -0.2]}>
            <cylinderGeometry args={[0.018, 0.018, 8.0, 6]} />
            <meshStandardMaterial color="#475569" metalness={0.85} />
          </mesh>
          <mesh position={[0, 0, 0.2]}>
            <cylinderGeometry args={[0.018, 0.018, 8.0, 6]} />
            <meshStandardMaterial color="#475569" metalness={0.85} />
          </mesh>
          {/* Rungs */}
          {Array.from({ length: 16 }).map((_, rIdx) => (
            <mesh key={rIdx} position={[0, -3.8 + rIdx * 0.5, 0]}>
              <boxGeometry args={[0.04, 0.025, 0.4]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.8} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

// -------------------------------------------------------------
// Precision Agritech Smart Telemetry Mast & Solar Station
// -------------------------------------------------------------
function SmartIrrigationHub({ windSpeed = 10, isRainy = false }) {
  const anemometerRef = useRef();

  useFrame((_, delta) => {
    if (anemometerRef.current) {
      anemometerRef.current.rotation.y += delta * (windSpeed * 0.45);
    }
  });

  return (
    <group position={[-7.8, 0.1, 4.4]}>
      {/* Concrete base pad */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[1.2, 0.12, 1.2]} />
        <meshStandardMaterial color="#64748b" roughness={0.82} />
      </mesh>

      {/* 4.2m Slender Anodized Aluminium Mast */}
      <mesh position={[0, 2.1, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.055, 4.2, 10]} />
        <meshStandardMaterial color="#334155" metalness={0.82} roughness={0.28} />
      </mesh>

      {/* High-efficiency Tilted Solar Panel */}
      <group position={[0, 3.2, 0.32]} rotation={[0.65, 0, 0]}>
        {/* Bezel frame */}
        <mesh castShadow>
          <boxGeometry args={[0.7, 0.04, 0.9]} />
          <meshStandardMaterial color="#1e293b" metalness={0.75} />
        </mesh>
        {/* Dark photovoltaic glass */}
        <mesh position={[0, 0.025, 0]}>
          <planeGeometry args={[0.64, 0.84]} />
          <meshStandardMaterial color="#172554" roughness={0.12} metalness={0.88} />
        </mesh>
      </group>

      {/* Ultrasonic Anemometer (Spinning Cups) */}
      <group ref={anemometerRef} position={[0, 4.3, 0]}>
        <mesh>
          <cylinderGeometry args={[0.025, 0.025, 0.15, 8]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.7} />
        </mesh>
        {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((rad, idx) => (
          <group key={idx} rotation={[0, rad, 0]}>
            <mesh position={[0.14, 0, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.28, 5]} rotation={[0, 0, Math.PI / 2]} />
              <meshStandardMaterial color="#64748b" metalness={0.8} />
            </mesh>
            <mesh position={[0.28, 0, 0]}>
              <sphereGeometry args={[0.04, 10, 8]} />
              <meshStandardMaterial color="#f8fafc" metalness={0.6} />
            </mesh>
          </group>
        ))}
      </group>

      {/* LoRa Telemetry Antenna */}
      <mesh position={[0.18, 4.4, -0.1]}>
        <cylinderGeometry args={[0.008, 0.008, 0.65, 5]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} />
      </mesh>

      {/* NEMA Weatherproof Electronics Enclosure with Status LED */}
      <group position={[0, 1.5, -0.22]}>
        <mesh castShadow>
          <boxGeometry args={[0.55, 0.65, 0.32]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.4} roughness={0.38} />
        </mesh>
        {/* Pulsing Status LED */}
        <mesh position={[0.18, 0.18, 0.17]}>
          <sphereGeometry args={[0.024, 8, 8]} />
          <meshBasicMaterial color={isRainy ? '#38bdf8' : '#15803d'} />
        </mesh>
      </group>

      {/* Solenoid Drip Valve Manifold Box (Ground Level) */}
      <group position={[0.9, 0.15, -0.2]}>
        <mesh castShadow>
          <boxGeometry args={[0.8, 0.24, 0.5]} />
          <meshStandardMaterial color="#1e293b" roughness={0.65} />
        </mesh>
        {/* Brass Solenoids */}
        {[-0.24, -0.08, 0.08, 0.24].map((vX, idx) => (
          <mesh key={idx} position={[vX, 0.16, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.12, 8]} />
            <meshStandardMaterial color="#d97706" metalness={0.85} roughness={0.28} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// -------------------------------------------------------------
// Americana Aeromotor Windmill (Classic Galvanized Steel Lattice)
// -------------------------------------------------------------
function FarmWindmill({ position, windSpeed = 10 }) {
  const wheelRef = useRef();

  useFrame((_, delta) => {
    if (wheelRef.current) {
      wheelRef.current.rotation.z += delta * (windSpeed * 0.3);
    }
  });

  return (
    <group position={position}>
      {/* 4 Concrete Pier Footings */}
      {[
        [-0.6, -0.6],
        [-0.6, 0.6],
        [0.6, -0.6],
        [0.6, 0.6],
      ].map(([fx, fz], idx) => (
        <mesh key={idx} position={[fx, 0.1, fz]} receiveShadow>
          <cylinderGeometry args={[0.12, 0.16, 0.22, 8]} />
          <meshStandardMaterial color="#64748b" roughness={0.82} />
        </mesh>
      ))}

      {/* Tapered Galvanized Angle-Iron Lattice Tower (7.6m) */}
      <group position={[0, 3.8, 0]}>
        {/* 4 Corner Legs */}
        {[
          [-0.55, 0.55, 0.12, -0.12],
          [-0.55, -0.55, 0.12, 0.12],
          [0.55, 0.55, -0.12, -0.12],
          [0.55, -0.55, -0.12, 0.12],
        ].map(([lx, lz, rotX, rotZ], idx) => (
          <mesh key={idx} position={[lx * 0.65, 0, lz * 0.65]} rotation={[rotX, 0, rotZ]}>
            <cylinderGeometry args={[0.022, 0.03, 7.6, 6]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.75} roughness={0.38} />
          </mesh>
        ))}

        {/* Horizontal Girders */}
        {[-2.4, -0.8, 0.8, 2.4].map((gy, idx) => (
          <group key={idx} position={[0, gy, 0]}>
            <mesh>
              <boxGeometry args={[0.7 - gy * 0.06, 0.025, 0.7 - gy * 0.06]} />
              <meshStandardMaterial color="#64748b" metalness={0.7} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Windmill Hub & Generator Head */}
      <group position={[0, 7.7, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.35, 0.35, 0.65]} />
          <meshStandardMaterial color="#475569" metalness={0.8} />
        </mesh>

        {/* Directional Tail Vane */}
        <mesh position={[0, 0.18, 0.85]} castShadow>
          <boxGeometry args={[0.03, 0.65, 0.95]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.65} />
        </mesh>

        {/* 12-Blade Galvanized Steel Wind Wheel */}
        <group ref={wheelRef} position={[0, 0, -0.38]}>
          <mesh>
            <cylinderGeometry args={[0.14, 0.14, 0.1, 12]} rotation={[Math.PI / 2, 0, 0]} />
            <meshStandardMaterial color="#334155" metalness={0.85} />
          </mesh>

          {/* Wheel Ring Braces */}
          <mesh rotation={[0, 0, 0]}>
            <torusGeometry args={[0.9, 0.02, 8, 24]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.7} />
          </mesh>
          <mesh rotation={[0, 0, 0]}>
            <torusGeometry args={[1.5, 0.02, 8, 24]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.7} />
          </mesh>

          {/* 12 Curved Galvanized Blades */}
          {Array.from({ length: 12 }).map((_, bIdx) => {
            const rad = (bIdx * Math.PI) / 6;
            return (
              <group key={bIdx} rotation={[0, 0, rad]}>
                <mesh position={[0, 1.15, 0]} rotation={[0, 0.35, 0]} castShadow>
                  <boxGeometry args={[0.16, 0.9, 0.015]} />
                  <meshStandardMaterial
                    color="#cbd5e1"
                    metalness={0.68}
                    roughness={0.38}
                  />
                </mesh>
              </group>
            );
          })}
        </group>
      </group>
    </group>
  );
}

// -------------------------------------------------------------
// Natural Botanical Deciduous / Orchard Tree (Gnarled Boughs & Layered Foliage)
// -------------------------------------------------------------
function NaturalDeciduousTree({ position, scale = 1, rotationY = 0 }) {
  return (
    <group position={position} scale={scale} rotation={[0, rotationY, 0]}>
      {/* Gnarled Weathered Cedar / Oak Trunk */}
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.36, 2.8, 8]} />
        <meshStandardMaterial color="#423023" roughness={0.88} />
      </mesh>

      {/* Main Branch Limbs reaching out organically */}
      <mesh position={[0.35, 2.6, 0.2]} rotation={[0.4, 0.2, -0.55]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 1.6, 6]} />
        <meshStandardMaterial color="#423023" roughness={0.88} />
      </mesh>
      <mesh position={[-0.32, 2.7, -0.25]} rotation={[-0.35, -0.3, 0.52]} castShadow>
        <cylinderGeometry args={[0.11, 0.17, 1.5, 6]} />
        <meshStandardMaterial color="#423023" roughness={0.88} />
      </mesh>
      <mesh position={[0.05, 2.8, -0.35]} rotation={[-0.55, 0.15, -0.1]} castShadow>
        <cylinderGeometry args={[0.1, 0.15, 1.4, 6]} />
        <meshStandardMaterial color="#423023" roughness={0.88} />
      </mesh>

      {/* Organic Layered Canopy Foliage Masses (Multi-hued Forest Greens) */}
      <group position={[0, 3.8, 0]}>
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <dodecahedronGeometry args={[1.35, 1]} />
          <meshStandardMaterial color="#2d5a27" roughness={0.72} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0.75, 0.15, 0.4]} rotation={[0.2, 0.5, -0.1]} castShadow receiveShadow>
          <dodecahedronGeometry args={[1.1, 1]} />
          <meshStandardMaterial color="#386d31" roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[-0.7, 0.2, -0.45]} rotation={[-0.2, -0.4, 0.2]} castShadow receiveShadow>
          <dodecahedronGeometry args={[1.05, 1]} />
          <meshStandardMaterial color="#244a1f" roughness={0.75} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0.1, 0.9, -0.2]} rotation={[0.3, -0.2, 0.1]} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.95, 1]} />
          <meshStandardMaterial color="#427d39" roughness={0.68} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

// -------------------------------------------------------------
// Natural Shelterbelt Conifer Pine (Tiered Drooping Needle Boughs)
// -------------------------------------------------------------
function NaturalConiferPine({ position, scale = 1, rotationY = 0 }) {
  return (
    <group position={position} scale={scale} rotation={[0, rotationY, 0]}>
      {/* Tapered Pine Trunk */}
      <mesh position={[0, 1.8, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.26, 3.6, 8]} />
        <meshStandardMaterial color="#38281d" roughness={0.9} />
      </mesh>

      {/* Tiered Drooping Needle Boughs with Organic Radii & Depth */}
      {[
        { y: 2.1, r: 1.7, h: 1.5, c: '#19381e' },
        { y: 3.1, r: 1.45, h: 1.4, c: '#1f4525' },
        { y: 4.0, r: 1.2, h: 1.3, c: '#27522d' },
        { y: 4.8, r: 0.9, h: 1.2, c: '#2e6136' },
        { y: 5.5, r: 0.55, h: 1.1, c: '#367240' },
      ].map((tier, idx) => (
        <group key={idx} position={[0, tier.y, 0]}>
          <mesh castShadow receiveShadow>
            <coneGeometry args={[tier.r, tier.h, 10]} />
            <meshStandardMaterial color={tier.c} roughness={0.76} />
          </mesh>
          {/* Subtle sub-branch skirt */}
          <mesh position={[0, -tier.h * 0.35, 0]} rotation={[0, Math.PI / 10, 0]} receiveShadow>
            <coneGeometry args={[tier.r * 0.92, tier.h * 0.5, 8]} />
            <meshStandardMaterial color={tier.c} roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// -------------------------------------------------------------
// Expansive South Cereal Field (Golden Wheat Swaths)
// -------------------------------------------------------------
function AdjoiningWheatField({ windSpeed = 10 }) {
  const wheatFieldRef = useRef();

  useFrame(({ clock }) => {
    if (!wheatFieldRef.current) return;
    const t = clock.getElapsedTime() * (windSpeed * 0.14);
    const wave = Math.sin(t * 1.8) * 0.045;
    wheatFieldRef.current.rotation.z = wave;
  });

  const swaths = useMemo(() => [
    { z: 10.5, xStart: -22, xEnd: 22, step: 1.2 },
    { z: 13.5, xStart: -24, xEnd: 24, step: 1.2 },
    { z: 16.5, xStart: -25, xEnd: 25, step: 1.2 },
    { z: 19.5, xStart: -24, xEnd: 24, step: 1.2 },
    { z: 22.5, xStart: -22, xEnd: 22, step: 1.2 },
    { z: 25.5, xStart: -20, xEnd: 20, step: 1.2 },
  ], []);

  return (
    <group ref={wheatFieldRef}>
      {swaths.map((sw, sIdx) => {
        const stalkCount = Math.floor((sw.xEnd - sw.xStart) / sw.step);
        return (
          <group key={sIdx} position={[0, 0.06, sw.z]}>
            {/* Raised Furrow Berm Base */}
            <mesh position={[0, 0.04, 0]} receiveShadow>
              <boxGeometry args={[sw.xEnd - sw.xStart + 1.5, 0.08, 0.95]} />
              <meshStandardMaterial color="#422e1b" roughness={0.9} />
            </mesh>

            {/* Waving Golden Wheat Stalks along the swath */}
            {Array.from({ length: stalkCount }).map((_, i) => {
              const xPos = sw.xStart + i * sw.step;
              const hVar = 0.88 + ((i * 7) % 5) * 0.04;
              return (
                <group key={i} position={[xPos, 0.08, ((i % 2) * 0.1 - 0.05)]} scale={[hVar, hVar, hVar]}>
                  {/* Stem */}
                  <mesh position={[0, 0.42, 0]} castShadow>
                    <cylinderGeometry args={[0.016, 0.024, 0.84, 5]} />
                    <meshStandardMaterial color="#d4a347" roughness={0.65} />
                  </mesh>
                  {/* Grain Spike */}
                  <mesh position={[0, 0.88, 0]} castShadow>
                    <cylinderGeometry args={[0.042, 0.03, 0.32, 6]} />
                    <meshStandardMaterial color="#eab308" roughness={0.55} />
                  </mesh>
                  {/* Nodding Awn Beard */}
                  <mesh position={[0.02, 1.04, 0]} rotation={[0, 0, 0.16]}>
                    <coneGeometry args={[0.018, 0.18, 4]} />
                    <meshStandardMaterial color="#fef08a" roughness={0.6} />
                  </mesh>
                </group>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

// -------------------------------------------------------------
// Expansive North Forage Field (Lush Emerald Alfalfa & Clover Swaths)
// -------------------------------------------------------------
function AdjoiningForageField({ windSpeed = 10 }) {
  const forageFieldRef = useRef();

  useFrame(({ clock }) => {
    if (!forageFieldRef.current) return;
    const t = clock.getElapsedTime() * (windSpeed * 0.1);
    forageFieldRef.current.rotation.x = Math.sin(t * 1.5) * 0.02;
  });

  const swaths = useMemo(() => [
    { z: -10.5, xStart: -24, xEnd: 24, step: 1.4 },
    { z: -13.5, xStart: -25, xEnd: 25, step: 1.4 },
    { z: -16.5, xStart: -26, xEnd: 26, step: 1.4 },
    { z: -19.5, xStart: -25, xEnd: 25, step: 1.4 },
    { z: -22.5, xStart: -23, xEnd: 23, step: 1.4 },
    { z: -25.5, xStart: -20, xEnd: 20, step: 1.4 },
  ], []);

  return (
    <group ref={forageFieldRef}>
      {swaths.map((sw, sIdx) => {
        const moundCount = Math.floor((sw.xEnd - sw.xStart) / sw.step);
        return (
          <group key={sIdx} position={[0, 0.06, sw.z]}>
            {/* Pastoral Soil Ridge */}
            <mesh position={[0, 0.04, 0]} receiveShadow>
              <boxGeometry args={[sw.xEnd - sw.xStart + 1.5, 0.08, 1.1]} />
              <meshStandardMaterial color="#1e381b" roughness={0.88} />
            </mesh>

            {/* Dense Vegetative Clover & Brassica Tufts */}
            {Array.from({ length: moundCount }).map((_, i) => {
              const xPos = sw.xStart + i * sw.step;
              const hVar = 0.85 + ((i * 11) % 7) * 0.035;
              return (
                <group key={i} position={[xPos, 0.08, ((i % 3) * 0.1 - 0.1)]} scale={[hVar, hVar, hVar]}>
                  <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
                    <sphereGeometry args={[0.34, 7, 6]} />
                    <meshStandardMaterial color="#275624" roughness={0.65} />
                  </mesh>
                  <mesh position={[0.12, 0.14, 0.08]} castShadow receiveShadow>
                    <sphereGeometry args={[0.24, 6, 5]} />
                    <meshStandardMaterial color="#366f33" roughness={0.62} />
                  </mesh>
                </group>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

// -------------------------------------------------------------
// West Tilled Seedbed Parcel (Young Vegetable Shoots & Furrow Pipes)
// -------------------------------------------------------------
function WestSeedbedField() {
  const rows = useMemo(() => [-4.5, -1.5, 1.5, 4.5], []);
  return (
    <group position={[-18.0, 0.06, 0]}>
      {rows.map((rz, idx) => (
        <group key={idx} position={[0, 0, rz]}>
          {/* Tilled Berm */}
          <mesh position={[0, 0.05, 0]} receiveShadow>
            <boxGeometry args={[11.5, 0.1, 0.85]} />
            <meshStandardMaterial color="#241a12" roughness={0.92} />
          </mesh>
          {/* Emerging Seedling Sprouts */}
          {[-4.5, -3.0, -1.5, 0, 1.5, 3.0, 4.5].map((sx, sIdx) => (
            <group key={sIdx} position={[sx, 0.11, 0]}>
              <mesh position={[0, 0.08, 0]} castShadow>
                <cylinderGeometry args={[0.012, 0.018, 0.16, 5]} />
                <meshStandardMaterial color="#4ade80" roughness={0.5} />
              </mesh>
              <mesh position={[0.03, 0.14, 0]} rotation={[0, 0, -0.4]}>
                <boxGeometry args={[0.06, 0.01, 0.03]} />
                <meshStandardMaterial color="#86efac" />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

// -------------------------------------------------------------
// Rustic Split-Rail Cedar Fence & Wild Verge Tufts
// -------------------------------------------------------------
function RusticFence() {
  const posts = useMemo(() => {
    const list = [];
    const minX = -7.4;
    const maxX = 7.4;
    const minZ = -5.0;
    const maxZ = 5.0;
    const step = 2.46;

    for (let x = minX; x <= maxX; x += step) {
      list.push([x, minZ]);
      list.push([x, maxZ]);
    }
    for (let z = minZ; z <= maxZ; z += step) {
      list.push([minX, z]);
      // opening on east side for farm road access
      if (Math.abs(z) > 1.6) {
        list.push([maxX, z]);
      }
    }
    return list;
  }, []);

  return (
    <group position={[0, 0.08, 0]}>
      {/* Weathered Mortised Posts */}
      {posts.map(([px, pz], idx) => (
        <mesh key={idx} position={[px, 0.42, pz]} castShadow>
          <cylinderGeometry args={[0.065, 0.075, 0.88, 7]} />
          <meshStandardMaterial color="#4d3522" roughness={0.85} />
        </mesh>
      ))}

      {/* Split Rails (North & South Field Margins) */}
      {[-5.0, 5.0].map((rz, idx) => (
        <group key={idx} position={[0, 0, rz]}>
          <mesh position={[0, 0.65, 0]} castShadow>
            <boxGeometry args={[14.8, 0.065, 0.05]} />
            <meshStandardMaterial color="#5a3e29" roughness={0.82} />
          </mesh>
          <mesh position={[0, 0.35, 0]} castShadow>
            <boxGeometry args={[14.8, 0.065, 0.05]} />
            <meshStandardMaterial color="#5a3e29" roughness={0.82} />
          </mesh>
        </group>
      ))}

      {/* Split Rails (West Field Margin) */}
      <group position={[-7.4, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 0.65, 0]} castShadow>
          <boxGeometry args={[10.0, 0.065, 0.05]} />
          <meshStandardMaterial color="#5a3e29" roughness={0.82} />
        </mesh>
        <mesh position={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[10.0, 0.065, 0.05]} />
          <meshStandardMaterial color="#5a3e29" roughness={0.82} />
        </mesh>
      </group>
    </group>
  );
}

// -------------------------------------------------------------
// Precision Irrigation Standpipe Risers (Furrow Row Inlets)
// -------------------------------------------------------------
function IrrigationRisers() {
  return (
    <group position={[-6.8, 0.08, 0]}>
      {[-3.0, -1.0, 1.0, 3.0].map((rz, idx) => (
        <group key={idx} position={[0, 0, rz]}>
          {/* Vertical Galvanized Steel Standpipe */}
          <mesh position={[0, 0.28, 0]} castShadow>
            <cylinderGeometry args={[0.024, 0.028, 0.56, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.78} roughness={0.32} />
          </mesh>
          {/* 90-degree Elbow & T-Junction */}
          <mesh position={[0.04, 0.52, 0]}>
            <sphereGeometry args={[0.038, 8, 8]} />
            <meshStandardMaterial color="#475569" metalness={0.8} />
          </mesh>
          {/* Pressure Gauge Dial */}
          <group position={[0.04, 0.62, 0]}>
            <mesh rotation={[0, 0, -Math.PI / 2]}>
              <cylinderGeometry args={[0.036, 0.036, 0.022, 12]} />
              <meshStandardMaterial color="#f8fafc" metalness={0.4} />
            </mesh>
            <mesh position={[0.012, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
              <circleGeometry args={[0.032, 12]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
          {/* Red Control Valve Turn Wheel */}
          <mesh position={[0.09, 0.52, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.042, 0.009, 6, 12]} />
            <meshStandardMaterial color="#dc2626" roughness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// -------------------------------------------------------------
// Wooden Furrow Marker Stakes
// -------------------------------------------------------------
function PlotStakes() {
  return (
    <group position={[-6.3, 0.08, 0]}>
      {[-3.0, -1.0, 1.0, 3.0].map((rz, idx) => (
        <group key={idx} position={[0, 0, rz]}>
          {/* Wooden Stake */}
          <mesh position={[0, 0.22, 0]} castShadow>
            <boxGeometry args={[0.04, 0.44, 0.04]} />
            <meshStandardMaterial color="#785538" roughness={0.85} />
          </mesh>
          {/* Label Plaque */}
          <mesh position={[0.03, 0.38, 0]} rotation={[0, 0, -0.15]}>
            <boxGeometry args={[0.015, 0.12, 0.22]} />
            <meshStandardMaterial color="#fef08a" roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// -------------------------------------------------------------
// Wild Margin Hedgerow Bushes & Verge Tussocks
// -------------------------------------------------------------
function VergeShrubsAndTufts() {
  const bushes = useMemo(() => [
    { pos: [-7.8, 0.1, -3.8], s: 0.65, c: '#234a26' },
    { pos: [-7.9, 0.1, -0.4], s: 0.8, c: '#2c5930' },
    { pos: [-7.8, 0.1, 2.6], s: 0.7, c: '#1e4021' },
    { pos: [-4.2, 0.08, -5.3], s: 0.6, c: '#2a542e' },
    { pos: [1.2, 0.08, -5.3], s: 0.75, c: '#1f4525' },
    { pos: [5.8, 0.08, -5.2], s: 0.65, c: '#28502b' },
    { pos: [-3.8, 0.08, 5.3], s: 0.7, c: '#234a26' },
    { pos: [2.4, 0.08, 5.3], s: 0.85, c: '#2c5930' },
    { pos: [6.4, 0.08, 5.2], s: 0.6, c: '#1e4021' },
  ], []);

  return (
    <group>
      {bushes.map((b, idx) => (
        <group key={idx} position={b.pos} scale={b.s}>
          <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
            <sphereGeometry args={[0.6, 8, 7]} />
            <meshStandardMaterial color={b.c} roughness={0.78} />
          </mesh>
          <mesh position={[0.25, 0.35, 0.2]} castShadow receiveShadow>
            <sphereGeometry args={[0.42, 7, 6]} />
            <meshStandardMaterial color={b.c} roughness={0.78} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// =============================================================
// MAIN 3D LIVING FARM SCENE
// =============================================================
export function FarmScene({
  weather = 'sunny',
  sceneConfig,
  windSpeed = 10,
  selectedRowId,
  onSelectRow,
  isIrrigating = false,
  plots,
}) {
  const isRainy = weather === 'rainy';

  // Map furrow rows to configured crop plots
  const rowConfigs = useMemo(() => {
    const defaultRows = [
      { id: 'row-1', zPos: -3.0, defaultType: 'wheat' },
      { id: 'row-2', zPos: -1.0, defaultType: 'corn' },
      { id: 'row-3', zPos: 1.0, defaultType: 'lettuce' },
      { id: 'row-4', zPos: 3.0, defaultType: 'carrots' },
    ];

    return defaultRows.map((r) => {
      if (!plots) return { ...r, type: r.defaultType, growthStage: 'vegetative' };
      const matchedPlot = plots.find((p) => p.rowId === r.id);
      return {
        ...r,
        type: matchedPlot ? matchedPlot.cropType : 'fallow',
        growthStage: matchedPlot ? matchedPlot.growthStage : 'vegetative',
      };
    });
  }, [plots]);

  return (
    <group>
      {/* 1. Expansive Continuous Sculpted Landscape with Vertex-Colored Soil & Pastures */}
      <mesh geometry={TERRAIN_GEOMETRY} receiveShadow>
        <meshStandardMaterial
          vertexColors
          roughness={isRainy ? 0.35 : isIrrigating ? 0.48 : (0.9 - (sceneConfig?.soilWetness || 0.08) * 0.25)}
          metalness={isRainy ? 0.22 : isIrrigating ? 0.14 : (sceneConfig?.soilWetness || 0.08) * 0.15}
          flatShading={false}
        />
      </mesh>

      {/* 2. Adjoining Real 3D Agricultural Fields */}
      <AdjoiningWheatField windSpeed={windSpeed} />
      <AdjoiningForageField windSpeed={windSpeed} />
      <WestSeedbedField />

      {/* 3. Managed Center Precision Furrow Rows (Interactive Plots) */}
      <RusticFence />
      <VergeShrubsAndTufts />
      <IrrigationRisers />
      <PlotStakes />

      {rowConfigs.map((r) => (
        <CropRow
          key={r.id}
          id={r.id}
          type={r.type}
          zPos={r.zPos}
          isSelected={selectedRowId === r.id}
          onSelect={onSelectRow}
          windSpeed={windSpeed}
          growthStage={r.growthStage}
        />
      ))}

      {/* 4. Micro-Sprinkler Water Mist Spray when Irrigating */}
      <IrrigationMist active={isIrrigating} />

      {/* 5. Precision Agritech Telemetry Hub & Solar Mast */}
      <SmartIrrigationHub windSpeed={windSpeed} isRainy={isRainy} />

      {/* 6. Traditional Timber Equipment Barn & Galvanized Steel Silo */}
      <FarmStructures />

      {/* 7. Americana Aeromotor Windmill */}
      <FarmWindmill position={[13.8, 0.1, -4.8]} windSpeed={windSpeed} />

      {/* 8. Believable Natural Conifer Shelterbelts & Hardwood Orchard Trees */}
      {/* North Horizon Ridge Windbreak Line */}
      <NaturalConiferPine position={[-20.0, 0.25, -28.0]} scale={1.35} rotationY={0.4} />
      <NaturalConiferPine position={[-12.0, 0.35, -29.5]} scale={1.5} rotationY={1.2} />
      <NaturalDeciduousTree position={[-4.0, 0.3, -29.0]} scale={1.3} rotationY={2.1} />
      <NaturalConiferPine position={[4.0, 0.3, -28.5]} scale={1.4} rotationY={0.8} />
      <NaturalConiferPine position={[12.0, 0.35, -29.0]} scale={1.45} rotationY={1.5} />
      <NaturalDeciduousTree position={[20.0, 0.25, -27.5]} scale={1.25} rotationY={0.3} />

      {/* West Property Windbreak Line */}
      <NaturalConiferPine position={[-28.0, 0.2, -14.0]} scale={1.4} rotationY={0.6} />
      <NaturalDeciduousTree position={[-28.5, 0.18, -4.0]} scale={1.35} rotationY={1.8} />
      <NaturalDeciduousTree position={[-28.0, 0.18, 6.0]} scale={1.3} rotationY={0.9} />
      <NaturalConiferPine position={[-27.5, 0.22, 16.0]} scale={1.35} rotationY={2.4} />

      {/* East Farmstead & Orchard Trees */}
      <NaturalDeciduousTree position={[13.5, 0.15, 8.5]} scale={1.15} rotationY={1.1} />
      <NaturalDeciduousTree position={[18.5, 0.15, 12.0]} scale={1.2} rotationY={2.8} />
      <NaturalConiferPine position={[22.0, 0.2, -6.5]} scale={1.4} rotationY={0.5} />
      <NaturalConiferPine position={[20.5, 0.2, -18.0]} scale={1.45} rotationY={1.7} />
    </group>
  );
}
