import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ============================================================================
// TERRAPULSE MASTER 3D FARM SIMULATOR — CINEMATIC MOUNTAIN PLATEAU WORLD
// ============================================================================

// ----------------------------------------------------------------------------
// 1. ELEVATED ROCKY MOUNTAIN PLATEAU & CLIFF TERRAIN (260m x 260m)
// ----------------------------------------------------------------------------
const TERRAIN_SIZE = 260;
const TERRAIN_SEGS = 140;

function createMasterMountainPlateauGeometry() {
  const geom = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGS, TERRAIN_SEGS);
  geom.rotateX(-Math.PI / 2);

  const pos = geom.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);

    let y;
    let r, g, b;

    // Organic asymmetrical cliff perimeter for the elevated plateau
    // Plateau covers roughly x in [-22, 20], z in [-18, 15]
    const normX = (x + 1.0) / 21.5;
    const normZ = (z + 1.5) / 16.5;
    const cliffNoise = Math.sin(x * 0.18) * 0.09 + Math.cos(z * 0.22) * 0.08;
    const plateauRadius = Math.sqrt(Math.pow(normX, 4) + Math.pow(normZ, 4)) + cliffNoise;

    // Northern Foothills Transition (z < -18): gently connects plateau to mountains
    const isNorthFoothills = z < -16.0 && Math.abs(x) < 32.0;

    if (isNorthFoothills) {
      // Smoothly rises from plateau level into mountain foothills
      const distNorth = Math.abs(z + 16.0);
      const northRise = Math.pow(distNorth * 0.12, 1.4) * 2.8;
      y = 0.55 + northRise + Math.sin(x * 0.08) * 0.6;

      const hillNoise = (Math.sin(x * 0.25) + Math.cos(z * 0.25)) * 0.03;
      r = 0.24 + hillNoise;
      g = 0.44 + hillNoise;
      b = 0.18 + hillNoise * 0.4;
    } else if (plateauRadius <= 0.88) {
      // ----------------------------------------------------------------------
      // Inside Farm Plateau Surface (Level, fertile, agricultural)
      // ----------------------------------------------------------------------
      // Gentle natural undulation across the farm surface
      y = 0.52 - 0.00025 * (x * x + z * z);

      // Farmhouse gentle knoll at x in [-7, -1], z in [-7, -1]
      if (x >= -7.5 && x <= -1.0 && z >= -7.0 && z <= -1.0) {
        const knollFactor = Math.cos((x + 4.2) * 0.45) * Math.cos((z + 4.0) * 0.45);
        y += Math.max(0, knollFactor * 0.38);
      }

      // Barn knoll at x in [4.5, 11], z in [-7.5, -2]
      if (x >= 4.5 && x <= 11.0 && z >= -7.5 && z <= -2.0) {
        const barnKnoll = Math.cos((x - 7.5) * 0.45) * Math.cos((z + 4.5) * 0.45);
        y += Math.max(0, barnKnoll * 0.32);
      }

      // Turquoise Pond basin depression at x in [9.5, 15.5], z in [3.0, 9.5]
      const pondDx = (x - 12.5) / 2.8;
      const pondDz = (z - 6.2) / 2.6;
      const pondDist = Math.sqrt(pondDx * pondDx + pondDz * pondDz);
      if (pondDist < 1.0) {
        const basinDepth = (1.0 - pondDist) * 0.38;
        y -= basinDepth;
      }

      // Waterfall runnel channel toward front cliff at x in [0.5, 3.0], z in [11.5, 15.5]
      if (Math.abs(x - 1.8) < 1.4 && z >= 11.5 && z <= 15.8) {
        y -= 0.12 * Math.cos((x - 1.8) * 1.1);
      }

      // ----------------------------------------------------------------------
      // Surface Shading (Winding Roads, Plots, Yard, Grass, Pond)
      // ----------------------------------------------------------------------
      // Winding Road Network:
      // - Main road enters from lower-right (x ≈ 16, z ≈ 14), winds past pond (x ≈ 12, z ≈ 6)
      // - Branches left toward central farm (x ≈ 1.5, z ≈ 0)
      // - Connects to farmhouse driveway (x ≈ 0, z ≈ -3) and barn lane (x ≈ 7, z ≈ -4)
      const onEntranceRoad = Math.abs((x - 1.2 * z) + 0.8) < 1.7 && z >= 8.0 && z <= 15.0;
      const onPondRoad = Math.abs(x - 10.5) < 1.8 && z >= 1.0 && z <= 10.0;
      const onCentralCrossRoad = Math.abs(z + 0.2) < 1.5 && x >= -3.5 && x <= 10.0;
      const onHouseDriveway = Math.abs(x - 0.5) < 1.6 && z >= -5.0 && z <= 1.0;
      const onBarnLane = Math.abs(z + 3.8) < 1.4 && x >= 3.0 && x <= 11.0;

      if (pondDist < 0.85) {
        // Turquoise pond bed
        r = 0.12; g = 0.32; b = 0.36;
      } else if (onEntranceRoad || onPondRoad || onCentralCrossRoad || onHouseDriveway || onBarnLane) {
        // Warm sandy-brown dirt road with gravel nuances
        y -= 0.03;
        r = 0.52; g = 0.44; b = 0.32;
      } else if (x >= -11.5 && x <= -4.2 && z >= 3.0 && z <= 10.0) {
        // Sunflower plot cultivated soil base
        r = 0.25; g = 0.17; b = 0.10;
      } else if (x >= -4.0 && x <= 6.2 && z >= 0.0 && z <= 12.0) {
        // Cultivated vegetable plots zone
        r = 0.21; g = 0.14; b = 0.08;
      } else if (x >= -7.0 && x <= 1.5 && z >= -6.5 && z <= -1.0) {
        // Farmhouse yard and gravel walk
        r = 0.42; g = 0.38; b = 0.30;
      } else {
        // Botanical alpine pasture grass
        const grassNoise = Math.sin(x * 0.45) * Math.cos(z * 0.45) * 0.04;
        r = 0.28 + grassNoise;
        g = 0.54 + grassNoise * 1.2;
        b = 0.21 + grassNoise * 0.5;
      }
    } else if (plateauRadius <= 1.28) {
      // ----------------------------------------------------------------------
      // Exposed Layered Rock Cliff Faces (Front & Side Precipices)
      // ----------------------------------------------------------------------
      const t = (plateauRadius - 0.88) / 0.40;
      // Dramatic vertical cliff drop from y ≈ 0.5 down to -14m into valley clouds
      const cliffDrop = Math.pow(t, 1.8) * 15.0;
      const cliffRoughness = Math.sin(x * 0.6) * Math.cos(z * 0.6) * 0.8;
      y = 0.5 - cliffDrop + cliffRoughness;

      // Layered rock strata colors (charcoal gray, slate, umber, warm ochre)
      const strataNoise = Math.sin(y * 1.2 + x * 0.3) * 0.5 + 0.5;
      if (strataNoise > 0.65) {
        // Warm ochre sandstone band
        r = 0.44; g = 0.34; b = 0.23;
      } else if (strataNoise > 0.35) {
        // Deep umber / dark brown rock
        r = 0.29; g = 0.23; b = 0.18;
      } else {
        // Cool slate & charcoal rock face
        r = 0.22; g = 0.25; b = 0.28;
      }

      // Moss clings to flatter ledges on cliffs
      if (t < 0.25) {
        r = 0.26; g = 0.40; b = 0.19;
      }
    } else {
      // ----------------------------------------------------------------------
      // Surrounding Low Valley Floor (Filled with Sea of Clouds)
      // ----------------------------------------------------------------------
      const valleyWave = Math.sin(x * 0.035) * Math.cos(z * 0.035) * 3.5;
      y = -14.2 + valleyWave;

      // Deep shadowed valley floor
      r = 0.18; g = 0.22; b = 0.25;
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

const STATIC_MOUNTAIN_PLATEAU_GEOM = createMasterMountainPlateauGeometry();

// ----------------------------------------------------------------------------
// 2. SURROUNDING ALPINE MOUNTAINS (JAGGED SUMMITS, SNOW CAPS, FORESTS)
// ----------------------------------------------------------------------------
function SurroundingMountainBackdrop() {
  const coneGeom = useMemo(() => new THREE.ConeGeometry(1, 1, 6), []);
  const dodecaGeom = useMemo(() => new THREE.DodecahedronGeometry(1, 1), []);

  const alpineRockMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.92, flatShading: true }),
    []
  );
  const snowCapMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.62, flatShading: true }),
    []
  );
  const forestedMountainMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#16381e', roughness: 0.95, flatShading: true }),
    []
  );
  const warmSunlitRockMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#524338', roughness: 0.9, flatShading: true }),
    []
  );

  // Northern Alpine Jagged Summits with Snow Caps
  const northPeaks = useMemo(() => [
    { pos: [0, 32, -140], scale: [60, 84, 48], rot: 0.15 },
    { pos: [-48, 29, -132], scale: [52, 76, 42], rot: 0.65 },
    { pos: [52, 30, -134], scale: [54, 78, 44], rot: -0.4 },
    { pos: [-94, 25, -124], scale: [46, 68, 40], rot: 1.1 },
    { pos: [98, 26, -126], scale: [48, 70, 40], rot: -0.85 },
    { pos: [-135, 20, -112], scale: [42, 58, 36], rot: 0.4 },
    { pos: [138, 21, -114], scale: [44, 60, 38], rot: -0.55 },
    { pos: [-70, 16, -92], scale: [36, 46, 30], rot: 0.3 },
    { pos: [74, 17, -95], scale: [38, 48, 32], rot: -0.35 },
  ], []);

  // Eastern Jagged & Forested Peaks (Sunlit side)
  const eastPeaks = useMemo(() => [
    { pos: [120, 22, -45], scale: [46, 62, 40], rot: 0.3, isSunlit: true },
    { pos: [130, 24, 5], scale: [48, 66, 42], rot: -0.2, isSunlit: true },
    { pos: [122, 20, 52], scale: [44, 56, 38], rot: 0.5, isSunlit: true },
    { pos: [96, 14, -22], scale: [32, 38, 28], rot: 0.8, isForested: true },
    { pos: [100, 15, 28], scale: [34, 40, 30], rot: -0.4, isForested: true },
  ], []);

  // Western Jagged & Forested Mountain Ridge
  const westPeaks = useMemo(() => [
    { pos: [-120, 22, -45], scale: [46, 62, 40], rot: -0.3 },
    { pos: [-130, 24, 5], scale: [48, 66, 42], rot: 0.2 },
    { pos: [-122, 20, 52], scale: [44, 56, 38], rot: -0.5 },
    { pos: [-96, 14, -22], scale: [32, 38, 28], rot: -0.8, isForested: true },
    { pos: [-100, 15, 28], scale: [34, 40, 30], rot: 0.4, isForested: true },
  ], []);

  // Southern Distant Mountain Horns & Ridges
  const southPeaks = useMemo(() => [
    { pos: [-50, 14, 125], scale: [42, 44, 36], rot: 0.2 },
    { pos: [5, 15, 130], scale: [46, 46, 38], rot: -0.3 },
    { pos: [55, 14, 125], scale: [42, 44, 36], rot: 0.4 },
    { pos: [-88, 12, 115], scale: [36, 36, 30], rot: -0.5 },
    { pos: [92, 12, 115], scale: [36, 36, 30], rot: 0.6 },
  ], []);

  return (
    <group>
      {/* 1. Northern High Alpine Peaks with Snow Caps */}
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

      {/* 2. Eastern Sunlit Mountain Ridge */}
      {eastPeaks.map((p, idx) => (
        <group key={`ep-${idx}`} position={p.pos} rotation={[0, p.rot, 0]}>
          <mesh
            position={[0, p.scale[1] * 0.5, 0]}
            scale={p.scale}
            geometry={coneGeom}
            material={p.isSunlit ? warmSunlitRockMat : (p.isForested ? forestedMountainMat : alpineRockMat)}
          />
        </group>
      ))}

      {/* 3. Western Forested & Rock Mountain Ridge */}
      {westPeaks.map((p, idx) => (
        <group key={`wp-${idx}`} position={p.pos} rotation={[0, p.rot, 0]}>
          <mesh
            position={[0, p.scale[1] * 0.5, 0]}
            scale={p.scale}
            geometry={coneGeom}
            material={p.isForested ? forestedMountainMat : alpineRockMat}
          />
        </group>
      ))}

      {/* 4. Southern Distant Mountains */}
      {southPeaks.map((p, idx) => (
        <group key={`sp-${idx}`} position={p.pos} rotation={[0, p.rot, 0]}>
          <mesh
            position={[0, p.scale[1] * 0.5, 0]}
            scale={p.scale}
            geometry={coneGeom}
            material={alpineRockMat}
          />
        </group>
      ))}

      {/* Distinct Jagged Crags & Pinnacles */}
      {[
        { pos: [68, 6, -70], scale: [8, 16, 8] },
        { pos: [-62, 5, -65], scale: [7, 14, 7] },
        { pos: [85, 4, 15], scale: [9, 18, 9] },
        { pos: [-80, 5, 10], scale: [8, 15, 8] },
      ].map((crag, idx) => (
        <mesh
          key={`crag-${idx}`}
          position={crag.pos}
          scale={crag.scale}
          geometry={dodecaGeom}
          material={warmSunlitRockMat}
        />
      ))}
    </group>
  );
}

// ----------------------------------------------------------------------------
// 3. CLIFF CRAGS, ROCK FORMATIONS & FRONT CASCADING WATERFALL
// ----------------------------------------------------------------------------
function CliffFormationsAndWaterfall() {
  const waterfallMeshRef = useRef();
  const foamRef = useRef();

  // Subtle animated flow for waterfall surface
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (waterfallMeshRef.current) {
      waterfallMeshRef.current.position.x = 1.8 + Math.sin(t * 3.5) * 0.04;
    }
    if (foamRef.current) {
      const s = 1.0 + Math.sin(t * 4.0) * 0.15;
      foamRef.current.scale.set(s, s, s);
    }
  });

  const rockGeom = useMemo(() => new THREE.DodecahedronGeometry(1, 0), []);
  const cliffRockMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.92, flatShading: true }),
    []
  );
  const mossyRockMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#3d4f30', roughness: 0.9, flatShading: true }),
    []
  );

  // Protruding rock crags along the front & side cliff edges
  const cliffRocks = useMemo(() => [
    // Front Cliff Ledges (framing the waterfall)
    { pos: [0.2, -1.8, 15.6], scale: [2.8, 4.2, 2.5] },
    { pos: [3.4, -2.2, 15.8], scale: [3.2, 4.8, 2.8] },
    { pos: [1.2, -6.5, 15.2], scale: [2.4, 3.6, 2.2] },
    { pos: [2.6, -9.0, 14.8], scale: [3.0, 4.4, 2.6] },
    // Left Cliff Precipice (below sunflower field)
    { pos: [-18.5, -2.5, 8.5], scale: [4.5, 6.0, 4.2], isMossy: true },
    { pos: [-20.2, -7.5, 4.0], scale: [5.2, 7.5, 4.8] },
    { pos: [-19.0, -3.2, -4.5], scale: [4.2, 5.8, 3.8], isMossy: true },
    { pos: [-21.0, -8.0, -10.0], scale: [5.5, 8.0, 5.0] },
    // Right Cliff Precipice (below pond)
    { pos: [17.5, -2.2, 10.5], scale: [4.2, 5.5, 3.8] },
    { pos: [19.0, -6.8, 6.0], scale: [4.8, 6.5, 4.2], isMossy: true },
    { pos: [18.2, -3.0, -2.0], scale: [4.0, 5.2, 3.6] },
    // Lower Cliff Base Boulders plunging into clouds
    { pos: [-12.0, -11.0, 14.5], scale: [6.0, 7.0, 5.5] },
    { pos: [11.0, -11.5, 13.8], scale: [6.5, 7.5, 6.0] },
  ], []);

  return (
    <group>
      {/* 1. Protruding Cliff Rock Boulders */}
      {cliffRocks.map((r, idx) => (
        <mesh
          key={`crock-${idx}`}
          position={r.pos}
          scale={r.scale}
          geometry={rockGeom}
          material={r.isMossy ? mossyRockMat : cliffRockMat}
          castShadow
          receiveShadow
        />
      ))}

      {/* 2. Front Cliff Waterfall (Cascades from y = 0.45 down to -14.0 into clouds) */}
      <group position={[1.8, -6.8, 15.2]}>
        {/* Main Cascading Waterfall Sheet */}
        <mesh ref={waterfallMeshRef} castShadow={false}>
          <boxGeometry args={[1.6, 14.5, 0.4]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={0.25}
            roughness={0.1}
            metalness={0.4}
            transparent
            opacity={0.88}
          />
        </mesh>

        {/* White Water Foam Streaks */}
        <mesh position={[0, 0, 0.22]}>
          <planeGeometry args={[1.3, 14.2]} />
          <meshStandardMaterial
            color="#f0f9ff"
            roughness={0.4}
            transparent
            opacity={0.65}
          />
        </mesh>

        {/* Bottom Impact Mist & Foam Cloud Base */}
        <mesh ref={foamRef} position={[0, -7.0, 0.6]}>
          <sphereGeometry args={[2.2, 8, 8]} />
          <meshStandardMaterial
            color="#e0f2fe"
            transparent
            opacity={0.55}
            roughness={0.9}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}

// ----------------------------------------------------------------------------
// 4. PICTURESQUE RUSTIC COUNTRYSIDE FARMHOUSE (SLIGHTLY LEFT OF CENTER)
// ----------------------------------------------------------------------------
function PicturesqueFarmhouse({ position = [-4.2, 0.52, -3.8] }) {
  const smokeRef = useRef();

  useFrame(({ clock }) => {
    if (smokeRef.current) {
      const t = clock.getElapsedTime();
      smokeRef.current.children.forEach((puff, idx) => {
        const offset = idx * 0.75;
        puff.position.y = 5.6 + ((t * 0.75 + offset) % 2.8);
        puff.position.x = -1.6 + Math.sin(t * 1.3 + idx) * 0.24;
        const scale = 0.28 + ((t * 0.75 + offset) % 2.8) * 0.18;
        puff.scale.setScalar(scale);
      });
    }
  });

  return (
    <group position={position} rotation={[0, 0.16, 0]}>
      {/* Cut Stone Foundation & Lower Masonry */}
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[7.4, 0.9, 5.4]} />
        <meshStandardMaterial color="#57534e" roughness={0.95} />
      </mesh>

      {/* Warm Timber-Framed Upper Wall */}
      <mesh position={[0, 2.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[7.0, 2.3, 5.0]} />
        <meshStandardMaterial color="#e5dec9" roughness={0.85} />
      </mesh>

      {/* Vertical Corner Timber Framing */}
      {[[-3.45, 2.05, -2.45], [3.45, 2.05, -2.45], [-3.45, 2.05, 2.45], [3.45, 2.05, 2.45]].map(
        (pos, idx) => (
          <mesh key={idx} position={pos} castShadow>
            <boxGeometry args={[0.26, 2.3, 0.26]} />
            <meshStandardMaterial color="#452a1a" roughness={0.9} />
          </mesh>
        )
      )}

      {/* Steep Terracotta Gabled Roof */}
      <mesh position={[0, 4.05, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[4.8, 2.3, 4]} />
        <meshStandardMaterial color="#c2410c" roughness={0.72} />
      </mesh>

      {/* Terracotta Roof Ridge Cap */}
      <mesh position={[0, 5.15, 0]} castShadow>
        <boxGeometry args={[5.8, 0.22, 0.45]} />
        <meshStandardMaterial color="#9a3412" roughness={0.75} />
      </mesh>

      {/* Dual Dormer Windows on Roof */}
      {[-1.6, 1.6].map((dx, i) => (
        <group key={i} position={[dx, 3.8, 1.8]}>
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
      <mesh position={[-1.6, 4.6, -1.0]} castShadow>
        <boxGeometry args={[0.95, 2.4, 0.95]} />
        <meshStandardMaterial color="#44403c" roughness={0.95} />
      </mesh>

      {/* Animated Chimney Smoke Puffs */}
      <group ref={smokeRef}>
        {[0, 1, 2, 3].map((idx) => (
          <mesh key={idx} position={[-1.6, 5.6 + idx * 0.75, -1.0]}>
            <sphereGeometry args={[0.3, 6, 6]} />
            <meshStandardMaterial color="#f1f5f9" transparent opacity={0.35} roughness={1.0} />
          </mesh>
        ))}
      </group>

      {/* Covered Timber Front Porch */}
      <mesh position={[0, 0.24, 3.3]} receiveShadow>
        <boxGeometry args={[6.2, 0.4, 1.8]} />
        <meshStandardMaterial color="#78593d" roughness={0.85} />
      </mesh>
      {/* Porch Posts */}
      <mesh position={[-2.7, 1.35, 3.9]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 2.2, 6]} />
        <meshStandardMaterial color="#5c432d" roughness={0.8} />
      </mesh>
      <mesh position={[2.7, 1.35, 3.9]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 2.2, 6]} />
        <meshStandardMaterial color="#5c432d" roughness={0.8} />
      </mesh>
      {/* Porch Roof Awning */}
      <mesh position={[0, 2.45, 3.3]} rotation={[0.22, 0, 0]} castShadow>
        <boxGeometry args={[6.4, 0.16, 2.0]} />
        <meshStandardMaterial color="#c2410c" roughness={0.7} />
      </mesh>

      {/* Warm Golden Illuminated Windows */}
      <mesh position={[-1.8, 1.85, 2.52]}>
        <planeGeometry args={[1.1, 1.25]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.65} />
      </mesh>
      <mesh position={[1.8, 1.85, 2.52]}>
        <planeGeometry args={[1.1, 1.25]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.65} />
      </mesh>
      {/* Front Wooden Door */}
      <mesh position={[0, 1.25, 2.52]}>
        <planeGeometry args={[1.15, 2.0]} />
        <meshStandardMaterial color="#451a03" roughness={0.75} />
      </mesh>

      {/* Rustic Garden Bench & Stacked Firewood */}
      <mesh position={[3.8, 0.4, 2.6]} rotation={[0, -0.4, 0]} castShadow>
        <boxGeometry args={[1.4, 0.45, 0.6]} />
        <meshStandardMaterial color="#6b4226" roughness={0.9} />
      </mesh>
      <mesh position={[-3.8, 0.45, 0.5]} castShadow>
        <boxGeometry args={[0.8, 0.9, 1.8]} />
        <meshStandardMaterial color="#5c4033" roughness={0.95} />
      </mesh>
    </group>
  );
}

// ----------------------------------------------------------------------------
// 5. DETAILED RED AGRICULTURAL TRACTOR (IMMEDIATELY RIGHT OF FARMHOUSE)
// ----------------------------------------------------------------------------
function ModernAgriculturalTractor({ position = [0.8, 0.48, -2.8], rotation = [0, -0.25, 0] }) {
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

      {/* Large Rear Drive Tires (Deep Black Rubber Tread & Bright Yellow Rims) */}
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
// 6. PROMINENT SUNFLOWER FIELD & TOOL SHED (LEFT-MIDDLE FOREGROUND)
// ----------------------------------------------------------------------------
function OrganizedSunflowerField({ position = [-7.8, 0.5, 6.5] }) {
  const sunflowerGroupRef = useRef();

  useFrame(({ clock }) => {
    if (sunflowerGroupRef.current) {
      const t = clock.getElapsedTime();
      sunflowerGroupRef.current.children.forEach((sf, i) => {
        sf.rotation.z = Math.sin(t * 1.8 + i * 0.4) * 0.04;
      });
    }
  });

  // Dense, organized grid of sunflowers (4 rows of 8 = 32 sunflowers)
  const sunflowerGrid = useMemo(() => {
    const list = [];
    const rows = [-2.2, -0.75, 0.75, 2.2];
    const cols = 8;
    rows.forEach((rz) => {
      for (let c = 0; c < cols; c++) {
        const rx = -3.0 + (c / (cols - 1)) * 6.0;
        list.push([rx, 0, rz]);
      }
    });
    return list;
  }, []);

  return (
    <group position={position}>
      {/* Cultivated Loam Bed (7.2m x 5.8m) */}
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[7.2, 0.16, 5.8]} />
        <meshStandardMaterial color="#29180c" roughness={0.9} />
      </mesh>

      {/* Rustic Wooden Boundary Fence around Sunflowers */}
      <mesh position={[0, 0.45, -2.9]} castShadow>
        <boxGeometry args={[7.2, 0.1, 0.08]} />
        <meshStandardMaterial color="#78593d" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.45, 2.9]} castShadow>
        <boxGeometry args={[7.2, 0.1, 0.08]} />
        <meshStandardMaterial color="#78593d" roughness={0.9} />
      </mesh>
      <mesh position={[-3.6, 0.45, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[5.8, 0.1, 0.08]} />
        <meshStandardMaterial color="#78593d" roughness={0.9} />
      </mesh>

      {/* Small Rustic Tool Shed / Pump Hut at Right-Front Corner */}
      <group position={[3.8, 0.0, 2.4]} rotation={[0, -0.3, 0]}>
        <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 1.8, 1.4]} />
          <meshStandardMaterial color="#6b4423" roughness={0.9} />
        </mesh>
        <mesh position={[0, 2.0, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[1.3, 0.8, 4]} />
          <meshStandardMaterial color="#c2410c" roughness={0.7} />
        </mesh>
      </group>

      {/* Dense Rows of Golden Sunflowers */}
      <group ref={sunflowerGroupRef}>
        {sunflowerGrid.map((pos, idx) => (
          <group key={idx} position={pos}>
            {/* Green Stem */}
            <mesh position={[0, 0.6, 0]}>
              <cylinderGeometry args={[0.035, 0.045, 1.2, 5]} />
              <meshStandardMaterial color="#365314" roughness={0.75} />
            </mesh>
            {/* Broad Leaves */}
            <mesh position={[0.12, 0.45, 0]} rotation={[0, 0, -0.4]}>
              <boxGeometry args={[0.26, 0.02, 0.14]} />
              <meshStandardMaterial color="#4d7c0f" roughness={0.7} />
            </mesh>
            {/* Golden Yellow Petal Disc */}
            <mesh position={[0, 1.22, 0.04]} rotation={[0.25, 0, 0]}>
              <cylinderGeometry args={[0.34, 0.34, 0.05, 12]} />
              <meshStandardMaterial color="#f59e0b" roughness={0.55} />
            </mesh>
            {/* Dark Seed Center */}
            <mesh position={[0, 1.24, 0.07]} rotation={[0.25, 0, 0]}>
              <sphereGeometry args={[0.18, 8, 8]} />
              <meshStandardMaterial color="#291505" roughness={0.85} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

// ----------------------------------------------------------------------------
// 7. ANIMAL ENCLOSURE & PASTURE (BEHIND & LEFT OF SUNFLOWER FIELD)
// ----------------------------------------------------------------------------
function PastureAndSheepPen({ position = [-9.5, 0.5, -0.5] }) {
  return (
    <group position={position}>
      {/* Rustic Enclosure Post-and-Rail Fence */}
      <mesh position={[0, 0.45, -3.2]} castShadow>
        <boxGeometry args={[7.5, 0.09, 0.08]} />
        <meshStandardMaterial color="#78593d" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.45, 3.2]} castShadow>
        <boxGeometry args={[7.5, 0.09, 0.08]} />
        <meshStandardMaterial color="#78593d" roughness={0.9} />
      </mesh>
      <mesh position={[-3.75, 0.45, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[6.4, 0.09, 0.08]} />
        <meshStandardMaterial color="#78593d" roughness={0.9} />
      </mesh>

      {/* Small Timber Animal Shelter */}
      <mesh position={[-2.4, 0.9, -1.8]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 1.8, 1.8]} />
        <meshStandardMaterial color="#5c432d" roughness={0.9} />
      </mesh>
      <mesh position={[-2.4, 1.9, -1.8]} rotation={[0.15, 0, 0]} castShadow>
        <boxGeometry args={[2.5, 0.12, 2.1]} />
        <meshStandardMaterial color="#854d0e" roughness={0.8} />
      </mesh>

      {/* 3 Cute Grazing Sheep */}
      {[
        { pos: [0.5, 0.35, 0.8], rot: 0.4 },
        { pos: [1.8, 0.35, -1.2], rot: -0.6 },
        { pos: [-0.6, 0.35, -0.6], rot: 1.2 },
      ].map((sheep, idx) => (
        <group key={idx} position={sheep.pos} rotation={[0, sheep.rot, 0]} scale={0.75}>
          {/* Fluffy Wool Body */}
          <mesh position={[0, 0.45, 0]} castShadow>
            <sphereGeometry args={[0.42, 8, 8]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.95} />
          </mesh>
          {/* Head */}
          <mesh position={[0.36, 0.55, 0]} castShadow>
            <sphereGeometry args={[0.2, 6, 6]} />
            <meshStandardMaterial color="#1f2937" roughness={0.8} />
          </mesh>
          {/* 4 Tiny Legs */}
          {[[-0.2, 0.15, -0.2], [0.2, 0.15, -0.2], [-0.2, 0.15, 0.2], [0.2, 0.15, 0.2]].map(
            (lp, lIdx) => (
              <mesh key={lIdx} position={lp}>
                <cylinderGeometry args={[0.04, 0.04, 0.3, 5]} />
                <meshStandardMaterial color="#1f2937" roughness={0.8} />
              </mesh>
            )
          )}
        </group>
      ))}
    </group>
  );
}

// ----------------------------------------------------------------------------
// 8. RUSTIC BARN & ANIMATED WOODEN WINDMILL (RIGHT-HAND SECTOR)
// ----------------------------------------------------------------------------
function RusticBarnAndWindmill({
  barnPos = [7.5, 0.5, -4.5],
  windmillPos = [12.2, 0.5, -7.5],
}) {
  const windmillBladesRef = useRef();

  useFrame((_, delta) => {
    if (windmillBladesRef.current) {
      windmillBladesRef.current.rotation.z += delta * 0.75;
    }
  });

  return (
    <group>
      {/* 1. Red-Brown Weathered Timber Barn */}
      <group position={barnPos} rotation={[0, -0.25, 0]}>
        <mesh position={[0, 1.9, 0]} castShadow receiveShadow>
          <boxGeometry args={[7.2, 3.6, 5.4]} />
          <meshStandardMaterial color="#784c35" roughness={0.9} />
        </mesh>
        <mesh position={[0, 4.3, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[4.8, 2.4, 4]} />
          <meshStandardMaterial color="#c2410c" roughness={0.75} />
        </mesh>
        {/* Double Sliding Barn Doors */}
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

      {/* 2. Traditional Wooden Windmill with Rotating 4-Blade Sails */}
      <group position={windmillPos}>
        {/* Tapered Octagonal Wooden Tower */}
        <mesh position={[0, 3.2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.1, 1.65, 6.4, 8]} />
          <meshStandardMaterial color="#6b4e3d" roughness={0.9} />
        </mesh>
        {/* Windmill Cap */}
        <mesh position={[0, 6.7, 0]} castShadow>
          <coneGeometry args={[1.35, 1.2, 8]} />
          <meshStandardMaterial color="#451a03" roughness={0.8} />
        </mesh>
        {/* Central Rotor Hub */}
        <mesh position={[0, 6.4, 1.35]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.4, 8]} />
          <meshStandardMaterial color="#262626" metalness={0.7} />
        </mesh>

        {/* Animated 4-Blade Wooden Sails Assembly */}
        <group ref={windmillBladesRef} position={[0, 6.4, 1.55]}>
          {[0, 1, 2, 3].map((idx) => (
            <group key={idx} rotation={[0, 0, (idx * Math.PI) / 2]}>
              {/* Spar Arm */}
              <mesh position={[0, 1.8, 0]} castShadow>
                <boxGeometry args={[0.08, 3.6, 0.06]} />
                <meshStandardMaterial color="#452a1a" roughness={0.9} />
              </mesh>
              {/* Lattice Sail Cloth */}
              <mesh position={[0.22, 2.0, 0]} castShadow>
                <boxGeometry args={[0.38, 2.8, 0.02]} />
                <meshStandardMaterial color="#f5f5f4" roughness={0.8} transparent opacity={0.88} />
              </mesh>
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}

// ----------------------------------------------------------------------------
// 9. TURQUOISE MOUNTAIN POOL & STREAM (RIGHT PLATEAU EDGE)
// ----------------------------------------------------------------------------
function TurquoiseMountainPoolAndStream() {
  const poolPos = [12.5, 0.28, 6.2];
  const waterRef = useRef();

  useFrame(({ clock }) => {
    if (waterRef.current) {
      const t = clock.getElapsedTime();
      waterRef.current.material.opacity = 0.82 + Math.sin(t * 2.2) * 0.05;
    }
  });

  return (
    <group>
      {/* Turquoise Water Pool Surface */}
      <mesh ref={waterRef} position={poolPos} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.6, 24]} />
        <meshStandardMaterial
          color="#06b6d4"
          roughness={0.08}
          metalness={0.65}
          transparent
          opacity={0.84}
        />
      </mesh>

      {/* Granite Boulders Framing the Pool */}
      {[
        [10.2, 0.42, 5.2, 0.8],
        [11.5, 0.38, 8.8, 0.95],
        [14.8, 0.44, 7.2, 1.1],
        [14.2, 0.40, 4.5, 0.85],
        [10.5, 0.36, 7.8, 0.7],
      ].map(([bx, by, bz, s], idx) => (
        <mesh key={idx} position={[bx, by, bz]} scale={s} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.6, 0]} />
          <meshStandardMaterial color="#64748b" roughness={0.92} />
        </mesh>
      ))}
    </group>
  );
}

// ----------------------------------------------------------------------------
// 10. BOTANICAL TREES: BROADLEAF OAKS, ALPINE PINES & SUBTLE PERIMETER BLOSSOMS
// ----------------------------------------------------------------------------
function NaturalOakTree({ position = [0, 0, 0], scale = 1.0 }) {
  return (
    <group position={position} scale={scale}>
      {/* Weathered Dark Timber Trunk */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.55, 3.2, 6]} />
        <meshStandardMaterial color="#3d2a1d" roughness={0.95} />
      </mesh>
      {/* Organic, Irregular Multi-Tiered Foliage Canopy */}
      {[
        [0, 4.0, 0, [2.2, 1.6, 2.0], '#274e20'],
        [-1.1, 3.4, 0.4, [1.6, 1.3, 1.5], '#336129'],
        [1.1, 3.5, -0.4, [1.5, 1.4, 1.6], '#21421a'],
        [0.2, 4.8, -0.2, [1.4, 1.2, 1.3], '#3d7331'],
      ].map(([bx, by, bz, s, color], idx) => (
        <mesh key={idx} position={[bx, by, bz]} scale={s} castShadow>
          <dodecahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={color} roughness={0.88} flatShading />
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
          <meshStandardMaterial color="#14381b" roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function SubtlePerimeterBlossomTree({ position = [0, 0, 0], scale = 0.85 }) {
  return (
    <group position={position} scale={scale}>
      {/* Slender Weathered Trunk */}
      <mesh position={[0, 1.3, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.26, 2.6, 6]} />
        <meshStandardMaterial color="#4a3525" roughness={0.9} />
      </mesh>
      {/* Subtle, Natural Pale-Pink/Ivory Blossom Canopy (Real Apple/Cherry Orchard Blossom) */}
      {[
        [0, 3.2, 0, [1.5, 1.1, 1.4], '#fce7f3'],
        [-0.7, 2.8, 0.3, [1.1, 0.9, 1.0], '#fdf2f8'],
        [0.7, 2.9, -0.3, [1.1, 0.9, 1.1], '#f5f5f4'],
        [0.1, 3.8, -0.1, [0.9, 0.8, 0.9], '#fce7f3'],
      ].map(([bx, by, bz, s, color], idx) => (
        <mesh key={idx} position={[bx, by, bz]} scale={s} castShadow>
          <dodecahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={color} roughness={0.85} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function NaturalBotanicalVegetation() {
  // Broadleaf oaks placed strictly along outer perimeter and background knolls
  const oaks = useMemo(() => [
    { pos: [-6.5, 0.5, -9.5], scale: 1.3 },
    { pos: [1.5, 0.5, -9.0], scale: 1.25 },
    { pos: [14.0, 0.5, -3.5], scale: 1.35 },
    { pos: [-14.5, 0.5, -5.5], scale: 1.4 },
    { pos: [15.5, 0.5, 12.5], scale: 1.2 },
  ], []);

  // Alpine pines along cliff precipices and outer boundaries
  const pines = useMemo(() => [
    { pos: [-17.0, 0.5, 11.0], scale: 1.5 },
    { pos: [-16.5, 0.5, -12.0], scale: 1.45 },
    { pos: [16.5, 0.5, -10.0], scale: 1.5 },
    { pos: [-18.5, 0.5, 1.0], scale: 1.4 },
    { pos: [16.8, 0.5, 2.0], scale: 1.35 },
  ], []);

  // Only 2 subtle blossom trees, placed strictly at the distant outer perimeter (NO crop overlap)
  const outerBlossoms = useMemo(() => [
    { pos: [16.2, 0.45, 6.0], scale: 0.85 },
    { pos: [17.5, 0.45, 14.5], scale: 0.85 },
  ], []);

  return (
    <group>
      {oaks.map((o, idx) => (
        <NaturalOakTree key={`oak-${idx}`} position={o.pos} scale={o.scale} />
      ))}
      {pines.map((p, idx) => (
        <AlpineEvergreenPine key={`pine-${idx}`} position={p.pos} scale={p.scale} />
      ))}
      {outerBlossoms.map((pb, idx) => (
        <SubtlePerimeterBlossomTree key={`blossom-${idx}`} position={pb.pos} scale={pb.scale} />
      ))}
    </group>
  );
}

// ----------------------------------------------------------------------------
// 11. ORGANIZED VEGETABLE GARDENS (THE 4 INTERACTIVE FURROW PLOTS)
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

  // Dynamic soil moisture shading
  const soilColor = useMemo(() => {
    const moisture = Math.max(0, Math.min(100, Number(soilMoisturePercent) || 40));
    const factor = moisture / 100;
    const r = Math.round(0x52 - factor * (0x52 - 0x1a));
    const g = Math.round(0x38 - factor * (0x38 - 0x10));
    const b = Math.round(0x24 - factor * (0x24 - 0x09));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }, [soilMoisturePercent]);

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

  const plantGrid = useMemo(() => {
    const list = [];
    if (type === 'wheat') {
      const rows = [-0.8, 0.0, 0.8];
      const countX = 14;
      rows.forEach((rz) => {
        for (let i = 0; i < countX; i++) {
          const rx = -4.2 + (i / (countX - 1)) * 8.4;
          list.push([rx, 0, rz]);
        }
      });
    } else if (type === 'corn') {
      const rows = [-0.6, 0.6];
      const countX = 10;
      rows.forEach((rz) => {
        for (let i = 0; i < countX; i++) {
          const rx = -4.0 + (i / (countX - 1)) * 8.0;
          list.push([rx, 0, rz]);
        }
      });
    } else if (type === 'lettuce') {
      const rows = [-0.8, 0.0, 0.8];
      const countX = 11;
      rows.forEach((rz) => {
        for (let i = 0; i < countX; i++) {
          const rx = -4.0 + (i / (countX - 1)) * 8.0;
          list.push([rx, 0, rz]);
        }
      });
    } else if (type === 'carrots') {
      const rows = [-0.8, 0.0, 0.8];
      const countX = 12;
      rows.forEach((rz) => {
        for (let i = 0; i < countX; i++) {
          const rx = -4.1 + (i / (countX - 1)) * 8.2;
          list.push([rx, 0, rz]);
        }
      });
    }
    return list;
  }, [type]);

  return (
    <group position={[1.2, 0.45, zPos]}>
      {/* Raised Loam Soil Bed Mound (9.8m x 2.8m) */}
      <mesh
        position={[0, 0.1, 0]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(id);
        }}
        onPointerOver={() => setIsHovered(true)}
        onPointerOut={() => setIsHovered(false)}
      >
        <boxGeometry args={[9.8, 0.22, 2.8]} />
        <meshStandardMaterial
          color={soilColor}
          roughness={soilMoisturePercent > 60 ? 0.35 : 0.88}
          metalness={soilMoisturePercent > 60 ? 0.2 : 0.04}
        />
      </mesh>

      {/* Furrow Ridges */}
      {[-0.8, 0.0, 0.8].map((rz, i) => (
        <mesh key={i} position={[0, 0.2, rz]} receiveShadow>
          <boxGeometry args={[9.4, 0.08, 0.45]} />
          <meshStandardMaterial color={soilColor} roughness={0.9} />
        </mesh>
      ))}

      {/* Active Irrigation Spray Mist */}
      {isIrrigating && (
        <group ref={sprayRef}>
          {[-3.6, -1.8, 0, 1.8, 3.6].map((sx, idx) => (
            <mesh key={idx} position={[sx, 0.5, 0]}>
              <sphereGeometry args={[0.15, 6, 6]} />
              <meshStandardMaterial color="#38bdf8" transparent opacity={0.75} roughness={0.1} />
            </mesh>
          ))}
        </group>
      )}

      {/* Interactive Selection Highlight Ring */}
      {(isSelected || isHovered) && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[10.2, 3.2]} />
          <meshBasicMaterial
            color={isSelected ? '#b8d6a0' : '#fef08a'}
            transparent
            opacity={isSelected ? 0.42 : 0.22}
          />
        </mesh>
      )}

      {/* Deterministic Crop Plants */}
      {type !== 'fallow' && (
        <group ref={rowGroupRef} position={[0, 0.24, 0]} scale={stageScale}>
          {plantGrid.map((pt, idx) => (
            <group key={idx} position={pt}>
              {/* 1. Golden Winter Wheat */}
              {type === 'wheat' && (
                <group scale={1.1}>
                  <mesh position={[0, 0.38, 0]}>
                    <cylinderGeometry args={[0.022, 0.032, 0.76, 5]} />
                    <meshStandardMaterial color="#948b3d" roughness={0.7} />
                  </mesh>
                  <mesh position={[0.04, 0.78, 0]} rotation={[0, 0, -0.18]}>
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
                  <mesh position={[0, 1.55, 0]}>
                    <coneGeometry args={[0.12, 0.32, 5]} />
                    <meshStandardMaterial color="#fbbf24" roughness={0.7} />
                  </mesh>
                </group>
              )}

              {/* 3. Hydro-Tolerant Greens / Lettuce */}
              {type === 'lettuce' && (
                <group scale={1.1}>
                  <mesh position={[0, 0.16, 0]}>
                    <sphereGeometry args={[0.28, 7, 6]} />
                    <meshStandardMaterial color="#34a832" roughness={0.65} />
                  </mesh>
                  <mesh position={[0.08, 0.12, 0.08]}>
                    <sphereGeometry args={[0.22, 6, 5]} />
                    <meshStandardMaterial color="#42bd40" roughness={0.65} />
                  </mesh>
                  <mesh position={[-0.08, 0.14, -0.04]}>
                    <sphereGeometry args={[0.23, 6, 5]} />
                    <meshStandardMaterial color="#288727" roughness={0.65} />
                  </mesh>
                </group>
              )}

              {/* 4. Deep-Root Carrots */}
              {type === 'carrots' && (
                <group scale={1.1}>
                  <mesh position={[0, 0.28, 0]}>
                    <coneGeometry args={[0.22, 0.55, 6]} />
                    <meshStandardMaterial color="#1e731b" roughness={0.8} />
                  </mesh>
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
// MAIN TRANSFORMED CINEMATIC 3D FARM SCENE
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

  // 4 well-spaced vegetable furrow rows in lower-middle sector
  const furrows = useMemo(
    () => [
      { id: 'row-1', zPos: 0.5 },
      { id: 'row-2', zPos: 3.8 },
      { id: 'row-3', zPos: 7.1 },
      { id: 'row-4', zPos: 10.4 },
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
      {/* 1. Elevated Asymmetrical Mountain Plateau & Cliff Terrain */}
      <mesh
        geometry={STATIC_MOUNTAIN_PLATEAU_GEOM}
        material={terrainMaterial}
        receiveShadow
        position={[0, 0, 0]}
      />

      {/* 2. Layered Alpine Mountain Backdrop (Snow Caps, Peaks & Forest Ridges) */}
      <SurroundingMountainBackdrop />

      {/* 3. Cliff Crag Boulders & Cascading Front Waterfall */}
      <CliffFormationsAndWaterfall />

      {/* 4. Picturesque Countryside Farmhouse (Slightly Left of Center) */}
      <PicturesqueFarmhouse position={[-4.2, 0.52, -3.8]} />

      {/* 5. Detailed Red Agricultural Tractor with Yellow Rims (Parked on Road) */}
      <ModernAgriculturalTractor position={[0.8, 0.48, -2.8]} rotation={[0, -0.25, 0]} />

      {/* 6. Prominent Sunflower Field & Rustic Tool Shed (Left-Middle Foreground) */}
      <OrganizedSunflowerField position={[-7.8, 0.5, 6.5]} />

      {/* 7. Animal Enclosure & Sheep Pen (Behind Sunflower Field) */}
      <PastureAndSheepPen position={[-9.5, 0.5, -0.5]} />

      {/* 8. Weathered Timber Barn & Rotating Wooden Windmill */}
      <RusticBarnAndWindmill barnPos={[7.5, 0.5, -4.5]} windmillPos={[12.2, 0.5, -7.5]} />

      {/* 9. Turquoise Mountain Pool & Stream (Right Plateau Edge) */}
      <TurquoiseMountainPoolAndStream />

      {/* 10. Natural Botanical Trees (Oaks, Pines & Pale Rose Blossoms) */}
      <NaturalBotanicalVegetation />

      {/* 11. 4 Interactive Cultivated Vegetable Furrows (Lower-Middle Foreground) */}
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
