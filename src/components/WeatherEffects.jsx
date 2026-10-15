import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// =============================================================
// MODULE-LEVEL STATIC INITIALIZATION (Zero-Render-Overhead)
// =============================================================
const RAIN_COUNT = 2400;
const INITIAL_RAIN_POSITIONS = new Float32Array(RAIN_COUNT * 3);
const INITIAL_RAIN_VELOCITIES = new Float32Array(RAIN_COUNT * 3);

// Generate initial particle fields once at bundle initialization
for (let i = 0; i < RAIN_COUNT; i++) {
  INITIAL_RAIN_POSITIONS[i * 3 + 0] = (Math.random() - 0.5) * 54;
  INITIAL_RAIN_POSITIONS[i * 3 + 1] = Math.random() * 28;
  INITIAL_RAIN_POSITIONS[i * 3 + 2] = (Math.random() - 0.5) * 54;

  INITIAL_RAIN_VELOCITIES[i * 3 + 0] = -0.065;
  INITIAL_RAIN_VELOCITIES[i * 3 + 1] = -(0.75 + Math.random() * 0.45);
  INITIAL_RAIN_VELOCITIES[i * 3 + 2] = 0.025;
}

// Atmospheric golden sun motes (fine pollen/dust in sunny weather)
const MOTE_COUNT = 260;
const INITIAL_MOTE_POSITIONS = new Float32Array(MOTE_COUNT * 3);
for (let i = 0; i < MOTE_COUNT; i++) {
  INITIAL_MOTE_POSITIONS[i * 3 + 0] = (Math.random() - 0.5) * 28;
  INITIAL_MOTE_POSITIONS[i * 3 + 1] = 0.4 + Math.random() * 5.2;
  INITIAL_MOTE_POSITIONS[i * 3 + 2] = (Math.random() - 0.5) * 24;
}

const STATIC_CLOUD_DATA = [];
for (let i = 0; i < 12; i++) {
  STATIC_CLOUD_DATA.push({
    baseX: (Math.random() - 0.5) * 160,
    baseY: 42.0 + Math.random() * 16.0,
    baseZ: (Math.random() - 0.5) * 130 - 20,
    scale: 1.4 + Math.random() * 1.2,
    baseSpeed: 0.35 + Math.random() * 0.35,
  });
}

// Natural soft cumulus cloud cluster with realistic flat base
const CUMULUS_PUFFS = [
  { offset: [0, 0, 0], radius: 2.2, scale: [1.8, 0.65, 1.4] },
  { offset: [2.0, 0.2, 0.2], radius: 1.8, scale: [1.6, 0.65, 1.3] },
  { offset: [-1.9, 0.1, -0.2], radius: 1.85, scale: [1.6, 0.65, 1.3] },
  { offset: [0.6, 0.7, -0.2], radius: 1.6, scale: [1.4, 0.75, 1.2] },
  { offset: [-0.8, 0.6, 0.3], radius: 1.5, scale: [1.3, 0.75, 1.2] },
  { offset: [0.2, -0.2, 1.4], radius: 1.5, scale: [1.5, 0.55, 1.2] },
  { offset: [-0.4, -0.2, -1.4], radius: 1.4, scale: [1.4, 0.55, 1.2] },
];

function SoftCumulusCloud({ position, scale = 1, color = '#ffffff', opacity = 0.75 }) {
  return (
    <group position={position} scale={scale}>
      {CUMULUS_PUFFS.map((p, idx) => (
        <mesh
          key={idx}
          position={p.offset}
          scale={p.scale}
          castShadow={false}
          receiveShadow={false}
        >
          <sphereGeometry args={[p.radius, 10, 8]} />
          <meshStandardMaterial
            color={color}
            roughness={0.98}
            metalness={0.0}
            flatShading={false}
            transparent
            opacity={opacity}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function DriftingClouds({ count = 6, color = '#ffffff', opacity = 0.72, speedMultiplier = 1 }) {
  const cloudsRef = useRef();

  useFrame((_, delta) => {
    if (!cloudsRef.current) return;
    const children = cloudsRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const data = STATIC_CLOUD_DATA[i];
      if (child && data) {
        child.position.x += data.baseSpeed * speedMultiplier * delta;
        if (child.position.x > 85) {
          child.position.x = -85;
        }
      }
    }
  });

  return (
    <group ref={cloudsRef}>
      {STATIC_CLOUD_DATA.slice(0, count).map((data, idx) => (
        <SoftCumulusCloud
          key={idx}
          position={[data.baseX, data.baseY, data.baseZ]}
          scale={data.scale}
          color={color}
          opacity={opacity}
        />
      ))}
    </group>
  );
}

// -------------------------------------------------------------
// High-Fidelity Rain Streak System
// -------------------------------------------------------------
function RainParticles({ active, windSpeed = 10 }) {
  const pointsRef = useRef();

  const [positions, velocities] = useMemo(() => {
    return [
      new Float32Array(INITIAL_RAIN_POSITIONS),
      new Float32Array(INITIAL_RAIN_VELOCITIES),
    ];
  }, []);

  useFrame(() => {
    if (!active || !pointsRef.current) return;
    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position;
    const posArr = posAttr.array;
    const windFactor = windSpeed / 10;

    for (let i = 0; i < RAIN_COUNT; i++) {
      posArr[i * 3 + 0] += velocities[i * 3 + 0] * windFactor;
      posArr[i * 3 + 1] += velocities[i * 3 + 1];
      posArr[i * 3 + 2] += velocities[i * 3 + 2] * windFactor;

      if (posArr[i * 3 + 1] < 0.1) {
        posArr[i * 3 + 1] = 26;
      }
    }
    posAttr.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={RAIN_COUNT}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.16}
        color="#c8e4f8"
        transparent
        opacity={0.68}
        blending={THREE.NormalBlending}
        depthWrite={false}
      />
    </points>
  );
}

// -------------------------------------------------------------
// Fine Atmospheric Golden Dust / Pollen Motes (Sunny Mode)
// -------------------------------------------------------------
function SunlightMotes({ active }) {
  const motesRef = useRef();
  const [positions] = useMemo(() => {
    return [new Float32Array(INITIAL_MOTE_POSITIONS)];
  }, []);

  useFrame(({ clock }) => {
    if (!active || !motesRef.current) return;
    const t = clock.getElapsedTime() * 0.35;
    const geo = motesRef.current.geometry;
    const posArr = geo.attributes.position.array;

    for (let i = 0; i < MOTE_COUNT; i++) {
      posArr[i * 3 + 0] += Math.sin(t + i) * 0.004;
      posArr[i * 3 + 1] += Math.cos(t * 0.7 + i) * 0.0035;
      posArr[i * 3 + 2] += Math.sin(t * 0.4 + i) * 0.004;

      if (posArr[i * 3 + 1] > 5.5) posArr[i * 3 + 1] = 0.4;
      if (posArr[i * 3 + 1] < 0.3) posArr[i * 3 + 1] = 5.2;
    }
    geo.attributes.position.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={motesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={MOTE_COUNT}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        color="#fef08a"
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// -------------------------------------------------------------
// Dynamic Wet Soil Puddles in Furrow Troughs (Rainy Mode)
// -------------------------------------------------------------
function FurrowRainPuddles({ active }) {
  const puddleRef1 = useRef();
  const puddleRef2 = useRef();

  useFrame(({ clock }) => {
    if (!active) return;
    const t = clock.getElapsedTime();
    if (puddleRef1.current) {
      puddleRef1.current.material.opacity = 0.45 + Math.sin(t * 2.8) * 0.06;
    }
    if (puddleRef2.current) {
      puddleRef2.current.material.opacity = 0.42 + Math.cos(t * 2.4) * 0.06;
    }
  });

  if (!active) return null;

  return (
    <group position={[0, 0.11, 0]}>
      {/* Puddle in trough between Plot 1 (Wheat) and Plot 2 (Corn) */}
      <mesh ref={puddleRef1} rotation={[-Math.PI / 2, 0, 0]} position={[-1.2, 0, -2.0]}>
        <circleGeometry args={[1.1, 16]} />
        <meshStandardMaterial
          color="#1e2c36"
          roughness={0.06}
          metalness={0.88}
          transparent
          opacity={0.46}
        />
      </mesh>

      {/* Puddle in trough between Plot 3 (Greens) and Plot 4 (Carrots) */}
      <mesh ref={puddleRef2} rotation={[-Math.PI / 2, 0, 0]} position={[2.4, 0, 2.0]}>
        <circleGeometry args={[1.35, 16]} />
        <meshStandardMaterial
          color="#1e2c36"
          roughness={0.06}
          metalness={0.88}
          transparent
          opacity={0.44}
        />
      </mesh>

      {/* Puddle near east access road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[7.8, 0.01, 1.2]}>
        <circleGeometry args={[0.9, 14]} />
        <meshStandardMaterial
          color="#22303a"
          roughness={0.05}
          metalness={0.9}
          transparent
          opacity={0.48}
        />
      </mesh>
    </group>
  );
}

// -------------------------------------------------------------
// Natural Radiant Golden Sunlight Glow
// -------------------------------------------------------------
function RadiantSunGlow({ visible, position, color = '#fffae8' }) {
  if (!visible) return null;

  return (
    <group position={position}>
      {/* Radiant Solar Core */}
      <mesh>
        <sphereGeometry args={[1.8, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Soft Atmospheric Corona Halo */}
      <mesh>
        <sphereGeometry args={[3.2, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

// =============================================================
// MAIN WEATHER EFFECTS COMPONENT
// =============================================================
export function WeatherEffects({ sceneConfig, windSpeed = 10 }) {
  const dirLightRef = useRef();
  const isSunny = !sceneConfig.rainActive && sceneConfig.cloudCount <= 5;

  return (
    <>
      {/* Declarative R3F Sky Background & Natural Atmospheric Horizon Fog */}
      <color attach="background" args={[sceneConfig.skyColor]} />
      <fog
        attach="fog"
        args={[sceneConfig.fogColor, sceneConfig.fogNear, sceneConfig.fogFar]}
      />

      {/* Ambient Fill Light for rich shadow detail */}
      <ambientLight color={sceneConfig.ambientColor} intensity={sceneConfig.ambientIntensity} />

      {/* Natural Ground-to-Sky Hemispheric Bounce Light */}
      <hemisphereLight
        args={[
          sceneConfig.hemiSkyColor,
          sceneConfig.hemiGroundColor,
          sceneConfig.hemiIntensity,
        ]}
      />

      {/* Key Directional Sun Light with High-Resolution Shadow Map */}
      <directionalLight
        ref={dirLightRef}
        color={sceneConfig.sunColor}
        intensity={sceneConfig.sunIntensity}
        position={sceneConfig.sunPosition}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={150}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-bias={-0.0003}
      />

      {/* Natural Radiant Sun Disc */}
      <RadiantSunGlow
        visible={!sceneConfig.rainActive}
        position={[
          sceneConfig.sunPosition[0] * 1.6,
          sceneConfig.sunPosition[1] * 1.3,
          sceneConfig.sunPosition[2] * 1.6,
        ]}
        color={sceneConfig.sunColor}
      />

      {/* Soft Cumulus Clouds */}
      <DriftingClouds
        count={sceneConfig.cloudCount}
        color={sceneConfig.cloudColor}
        opacity={sceneConfig.cloudOpacity}
        speedMultiplier={windSpeed / 10}
      />

      {/* Golden Sunlight Motes in Sunny Mode */}
      <SunlightMotes active={isSunny} />

      {/* Dynamic Rain Streaks in Rainy Mode */}
      <RainParticles active={sceneConfig.rainActive} windSpeed={windSpeed} />

      {/* Wet Furrow Rain Puddles in Rainy Mode */}
      <FurrowRainPuddles active={sceneConfig.rainActive} />
    </>
  );
}

