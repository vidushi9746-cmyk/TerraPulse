import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// =============================================================
// MODULE-LEVEL STATIC INITIALIZATION (Zero-Render-Overhead)
// =============================================================
const MAX_RAIN_COUNT = 3600;
const INITIAL_RAIN_POSITIONS = new Float32Array(MAX_RAIN_COUNT * 3);
const INITIAL_RAIN_VELOCITIES = new Float32Array(MAX_RAIN_COUNT * 3);

// Generate initial particle fields once at bundle initialization
for (let i = 0; i < MAX_RAIN_COUNT; i++) {
  INITIAL_RAIN_POSITIONS[i * 3 + 0] = (Math.random() - 0.5) * 64;
  INITIAL_RAIN_POSITIONS[i * 3 + 1] = Math.random() * 30;
  INITIAL_RAIN_POSITIONS[i * 3 + 2] = (Math.random() - 0.5) * 64;

  INITIAL_RAIN_VELOCITIES[i * 3 + 0] = -0.065;
  INITIAL_RAIN_VELOCITIES[i * 3 + 1] = -(0.85 + Math.random() * 0.35);
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

// Low-altitude Valley Cloud Sea beneath the plateau cliffs and mountain valleys
const VALLEY_CLOUD_DATA = [
  { baseX: -22, baseY: -5.8, baseZ: 20, scale: 2.6, baseSpeed: 0.18 },
  { baseX: 4, baseY: -6.4, baseZ: 24, scale: 3.0, baseSpeed: 0.22 },
  { baseX: 26, baseY: -5.5, baseZ: 19, scale: 2.8, baseSpeed: 0.20 },
  { baseX: -34, baseY: -4.8, baseZ: 4, scale: 3.2, baseSpeed: 0.16 },
  { baseX: -30, baseY: -5.4, baseZ: -16, scale: 2.8, baseSpeed: 0.19 },
  { baseX: 32, baseY: -5.0, baseZ: 6, scale: 2.9, baseSpeed: 0.21 },
  { baseX: 30, baseY: -5.8, baseZ: -14, scale: 3.1, baseSpeed: 0.17 },
  { baseX: -65, baseY: 6.0, baseZ: -75, scale: 4.8, baseSpeed: 0.14 },
  { baseX: 60, baseY: 7.0, baseZ: -70, scale: 4.5, baseSpeed: 0.15 },
  { baseX: 0, baseY: 8.0, baseZ: -95, scale: 5.2, baseSpeed: 0.12 },
];

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

function DriftingValleyCloudSea({ color = '#ffffff', opacity = 0.76, speedMultiplier = 1 }) {
  const valleyCloudsRef = useRef();

  useFrame((_, delta) => {
    if (!valleyCloudsRef.current) return;
    const children = valleyCloudsRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const data = VALLEY_CLOUD_DATA[i];
      if (child && data) {
        child.position.x += data.baseSpeed * speedMultiplier * delta;
        if (child.position.x > 80) {
          child.position.x = -80;
        }
      }
    }
  });

  return (
    <group ref={valleyCloudsRef}>
      {VALLEY_CLOUD_DATA.map((data, idx) => (
        <SoftCumulusCloud
          key={`valley-cloud-${idx}`}
          position={[data.baseX, data.baseY, data.baseZ]}
          scale={data.scale}
          color={color}
          opacity={opacity}
        />
      ))}
    </group>
  );
}

function CliffMistBands({ color = '#f1f5f9', opacity = 0.4 }) {
  const mistPatches = useMemo(() => [
    { pos: [-18.5, -1.0, 12.0], scale: [5.2, 1.4, 4.0] },
    { pos: [1.8, -1.5, 17.0], scale: [4.6, 1.6, 3.8] },
    { pos: [17.5, -1.2, 9.5], scale: [4.8, 1.5, 4.2] },
    { pos: [-19.5, -1.8, -6.0], scale: [5.0, 1.6, 4.0] },
  ], []);

  return (
    <group>
      {mistPatches.map((mp, idx) => (
        <mesh key={`mist-${idx}`} position={mp.pos} scale={mp.scale}>
          <sphereGeometry args={[1.6, 8, 8]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={opacity}
            roughness={1.0}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// -------------------------------------------------------------
// Continuous Multi-Intensity Precipitation Particle System
// (Drizzle, Moderate Rain, Heavy Downpour, Thunderstorm)
// -------------------------------------------------------------
function RainParticles({ active, precipitationType = 'rain', windSpeed = 10 }) {
  const pointsRef = useRef();

  const [positions, velocities] = useMemo(() => {
    return [
      new Float32Array(INITIAL_RAIN_POSITIONS),
      new Float32Array(INITIAL_RAIN_VELOCITIES),
    ];
  }, []);

  // Intensity calibration parameters based on normalized precipitation type
  const { particleCount, size, opacity, speedMultiplier, color } = useMemo(() => {
    switch (precipitationType) {
      case 'drizzle':
        return {
          particleCount: 1100,
          size: 0.08,
          opacity: 0.48,
          speedMultiplier: 0.42,
          color: '#dbeafe',
        };
      case 'heavy_rain':
        return {
          particleCount: 3200,
          size: 0.20,
          opacity: 0.78,
          speedMultiplier: 1.18,
          color: '#bfdbfe',
        };
      case 'thunderstorm':
        return {
          particleCount: 3600,
          size: 0.22,
          opacity: 0.84,
          speedMultiplier: 1.35,
          color: '#93c5fd',
        };
      case 'rain':
      default:
        return {
          particleCount: 2200,
          size: 0.15,
          opacity: 0.65,
          speedMultiplier: 0.85,
          color: '#c8e4f8',
        };
    }
  }, [precipitationType]);

  // Continuous animation loop: particles fall continuously and wrap at y = -0.8m
  useFrame(() => {
    if (!active || !pointsRef.current) return;
    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position;
    const posArr = posAttr.array;
    const windFactor =
      (windSpeed / 10) *
      (precipitationType === 'thunderstorm'
        ? 1.4
        : precipitationType === 'drizzle'
        ? 0.5
        : 1.0);

    for (let i = 0; i < particleCount; i++) {
      posArr[i * 3 + 0] += velocities[i * 3 + 0] * windFactor;
      posArr[i * 3 + 1] += velocities[i * 3 + 1] * speedMultiplier;
      posArr[i * 3 + 2] += velocities[i * 3 + 2] * windFactor;

      // Elevated plateau sits at y ≈ 0.45m; recycle cleanly below surface
      if (posArr[i * 3 + 1] < -0.8) {
        posArr[i * 3 + 1] = 26 + Math.random() * 4;
        posArr[i * 3 + 0] = (Math.random() - 0.5) * 64;
        posArr[i * 3 + 2] = (Math.random() - 0.5) * 64;
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
          count={particleCount}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        color={color}
        transparent
        opacity={opacity}
        blending={THREE.NormalBlending}
        depthWrite={false}
      />
    </points>
  );
}

// -------------------------------------------------------------
// Atmospheric Distant Thunderstorm Lightning Flashes
// -------------------------------------------------------------
function ThunderstormLightning({ active }) {
  const lightRef = useRef();
  const nextFlashTimeRef = useRef(4.0);
  const flashStageRef = useRef(0);

  useFrame(({ clock }) => {
    if (!active || !lightRef.current) return;
    const t = clock.getElapsedTime();

    if (t > nextFlashTimeRef.current) {
      flashStageRef.current = 1;
      nextFlashTimeRef.current = t + 7.0 + Math.random() * 8.0; // Random 7-15s intervals
    }

    if (flashStageRef.current === 1) {
      // Primary bright flash
      lightRef.current.intensity = 3.8;
      flashStageRef.current = 2;
    } else if (flashStageRef.current === 2) {
      // Brief darkness between double strokes
      lightRef.current.intensity = 0.2;
      flashStageRef.current = 3;
    } else if (flashStageRef.current === 3) {
      // Secondary rumble flash
      lightRef.current.intensity = 2.4;
      flashStageRef.current = 4;
    } else if (flashStageRef.current === 4) {
      // Exponential decay back to ambient
      lightRef.current.intensity = Math.max(0, lightRef.current.intensity - 0.4);
      if (lightRef.current.intensity <= 0.05) {
        lightRef.current.intensity = 0;
        flashStageRef.current = 0;
      }
    }
  });

  if (!active) return null;

  return (
    <directionalLight
      ref={lightRef}
      color="#e0e7ff"
      intensity={0}
      position={[-20, 50, -45]}
    />
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
// Dynamic Wet Soil Puddles in Furrow Troughs (Precipitation Mode)
// -------------------------------------------------------------
function FurrowRainPuddles({ active, precipitationType = 'rain' }) {
  const puddleRef1 = useRef();
  const puddleRef2 = useRef();

  const baseOpacity = useMemo(() => {
    if (precipitationType === 'drizzle') return 0.22;
    if (precipitationType === 'heavy_rain' || precipitationType === 'thunderstorm') return 0.68;
    return 0.46;
  }, [precipitationType]);

  useFrame(({ clock }) => {
    if (!active) return;
    const t = clock.getElapsedTime();
    if (puddleRef1.current) {
      puddleRef1.current.material.opacity = baseOpacity + Math.sin(t * 2.8) * 0.04;
    }
    if (puddleRef2.current) {
      puddleRef2.current.material.opacity = baseOpacity + Math.cos(t * 2.4) * 0.04;
    }
  });

  if (!active) return null;

  return (
    <group position={[1.2, 0.46, 0]}>
      {/* Puddle in furrow trough between Row 1 and Row 2 */}
      <mesh ref={puddleRef1} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 2.1]}>
        <circleGeometry args={[1.2, 16]} />
        <meshStandardMaterial
          color="#1e2c36"
          roughness={0.06}
          metalness={0.88}
          transparent
          opacity={baseOpacity}
        />
      </mesh>

      {/* Puddle in furrow trough between Row 3 and Row 4 */}
      <mesh ref={puddleRef2} rotation={[-Math.PI / 2, 0, 0]} position={[0.4, 0.01, 8.7]}>
        <circleGeometry args={[1.35, 16]} />
        <meshStandardMaterial
          color="#1e2c36"
          roughness={0.06}
          metalness={0.88}
          transparent
          opacity={baseOpacity}
        />
      </mesh>
    </group>
  );
}

// -------------------------------------------------------------
// Natural Radiant Golden Sunlight Glow (Sunny Mode)
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
// MAIN SYNCHRONIZED WEATHER EFFECTS COMPONENT
// =============================================================
export function WeatherEffects({ sceneConfig = {}, windSpeed = 10 }) {
  const dirLightRef = useRef();

  // Normalize state: derive precipitation type and sunny/cloudy flags
  const hasPrecipitation = Boolean(
    sceneConfig.hasPrecipitation ?? sceneConfig.rainActive
  );
  const precipitationType =
    sceneConfig.precipitationType ?? (hasPrecipitation ? 'rain' : 'none');
  const isCloudy = Boolean(
    sceneConfig.isCloudy ?? (!hasPrecipitation && (sceneConfig.cloudCount ?? 0) > 5)
  );
  const isSunny = Boolean(
    sceneConfig.isSunny ?? (!hasPrecipitation && !isCloudy)
  );
  const isThunderstorm = precipitationType === 'thunderstorm';

  const sunPosition = sceneConfig.sunPosition ?? [38, 28, 20];
  const sunColor = sceneConfig.sunColor ?? '#fff7db';
  const sunIntensity = sceneConfig.sunIntensity ?? (hasPrecipitation ? 1.4 : isCloudy ? 1.8 : 2.8);
  const skyColor = sceneConfig.skyColor ?? (hasPrecipitation ? '#64748b' : isCloudy ? '#8da4be' : '#5fa8e8');
  const fogColor = sceneConfig.fogColor ?? (hasPrecipitation ? '#788e9f' : isCloudy ? '#9bb0c4' : '#b0d4f1');
  const fogNear = sceneConfig.fogNear ?? (hasPrecipitation ? 35 : isCloudy ? 45 : 60);
  const fogFar = sceneConfig.fogFar ?? (hasPrecipitation ? 190 : isCloudy ? 220 : 280);

  return (
    <>
      {/* Declarative R3F Sky Background & Natural Atmospheric Horizon Fog */}
      <color attach="background" args={[skyColor]} />
      <fog attach="fog" args={[fogColor, fogNear, fogFar]} />

      {/* Ambient Fill Light for rich shadow detail */}
      <ambientLight
        color={sceneConfig.ambientColor ?? '#dbeafe'}
        intensity={sceneConfig.ambientIntensity ?? (hasPrecipitation ? 0.65 : 0.82)}
      />

      {/* Natural Ground-to-Sky Hemispheric Bounce Light */}
      <hemisphereLight
        args={[
          sceneConfig.hemiSkyColor ?? '#a5d0f5',
          sceneConfig.hemiGroundColor ?? '#3d3428',
          sceneConfig.hemiIntensity ?? (hasPrecipitation ? 0.45 : 0.58),
        ]}
      />

      {/* Key Directional Sun Light with High-Resolution Shadow Map */}
      <directionalLight
        ref={dirLightRef}
        color={sunColor}
        intensity={sunIntensity}
        position={sunPosition}
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

      {/* Natural Radiant Sun Disc in Sunny / Clear Mode */}
      <RadiantSunGlow
        visible={isSunny}
        position={[sunPosition[0] * 1.6, sunPosition[1] * 1.3, sunPosition[2] * 1.6]}
        color={sunColor}
      />

      {/* Soft Cumulus Clouds with Weather-Responsive Color & Opacity */}
      <DriftingClouds
        count={sceneConfig.cloudCount ?? (hasPrecipitation ? 9 : isCloudy ? 7 : 4)}
        color={sceneConfig.cloudColor ?? (hasPrecipitation ? '#cbd5e1' : '#ffffff')}
        opacity={sceneConfig.cloudOpacity ?? (hasPrecipitation ? 0.85 : 0.72)}
        speedMultiplier={windSpeed / 10}
      />

      {/* Low-Altitude Valley Cloud Sea below Plateau Cliffs */}
      <DriftingValleyCloudSea
        color={sceneConfig.cloudColor ?? (hasPrecipitation ? '#cbd5e1' : '#ffffff')}
        opacity={Math.min(0.88, (sceneConfig.cloudOpacity ?? 0.72) * 1.15)}
        speedMultiplier={windSpeed / 10}
      />

      {/* Atmospheric Cliff Mist Bands */}
      <CliffMistBands
        color={sceneConfig.cloudColor ?? '#f1f5f9'}
        opacity={hasPrecipitation ? 0.55 : 0.38}
      />

      {/* Fine Golden Sunlight Motes (Sunny Mode Only) */}
      <SunlightMotes active={isSunny} />

      {/* Continuous Real-Time Precipitation Particle System (Drizzle / Rain / Heavy Rain / Thunderstorm) */}
      <RainParticles
        active={hasPrecipitation}
        precipitationType={precipitationType}
        windSpeed={windSpeed}
      />

      {/* Distant Lightning Flashes (Thunderstorm Mode Only) */}
      <ThunderstormLightning active={isThunderstorm} />

      {/* Wet Furrow Rain Puddles with Intensity-Responsive Sheen & Reflection */}
      <FurrowRainPuddles
        active={hasPrecipitation}
        precipitationType={precipitationType}
      />
    </>
  );
}
