import { Suspense, useRef, useCallback, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { FarmScene } from './FarmScene';
import { WeatherEffects } from './WeatherEffects';
import { ErrorBoundary } from './ErrorBoundary';
import { Sprout } from 'lucide-react';

function CanvasLoader() {
  return (
    <div className="canvas-loading-overlay" role="status" aria-live="polite">
      <div className="sprout-loading-wrap">
        <Sprout className="sprout-loading-icon text-lime" size={30} />
      </div>
      <p className="loader-text">Loading Living Agricultural Twin...</p>
    </div>
  );
}

// Smooth Camera Controller for cinematic transitions between presets
function SmoothCameraController({ targetViewRef, controlsRef }) {
  useFrame(({ camera }, delta) => {
    if (!targetViewRef.current) return;

    // Smooth exponential damping for frame-rate-independent deceleration
    const t = 1 - Math.exp(-delta * 4.5);
    camera.position.lerp(targetViewRef.current.pos, t);

    // Smooth lerp OrbitControls target focal point
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetViewRef.current.target, t);
      controlsRef.current.update();
    }

    // Snap and finish transition when close enough
    if (camera.position.distanceTo(targetViewRef.current.pos) < 0.04) {
      camera.position.copy(targetViewRef.current.pos);
      if (controlsRef.current) {
        controlsRef.current.target.copy(targetViewRef.current.target);
        controlsRef.current.update();
      }
      targetViewRef.current = null;
    }
  });

  return null;
}

export function FarmCanvas({
  weatherData,
  selectedRowId,
  onSelectRow,
  isIrrigating = false,
  farmConfig,
  cameraPreset = 'overview',
  onPresetChange,
}) {
  const controlsRef = useRef();
  const targetViewRef = useRef(null);

  // Trigger smooth cinematic camera navigation when cameraPreset prop changes
  const applyPreset = useCallback((preset) => {
    let targetPos, targetLookAt;

    if (preset === 'top') {
      targetPos = new THREE.Vector3(0.01, 36.0, 0.05);
      targetLookAt = new THREE.Vector3(-0.5, 0.5, 0);
    } else if (preset === 'crops') {
      targetPos = new THREE.Vector3(11.5, 7.5, 14.2);
      targetLookAt = new THREE.Vector3(3.2, 0.8, 6.2);
    } else if (preset === 'farmhouse') {
      targetPos = new THREE.Vector3(-1.5, 3.8, 0.5);
      targetLookAt = new THREE.Vector3(-5.0, 1.8, -5.5);
    } else {
      // 'overview' or 'reset'
      targetPos = new THREE.Vector3(17.0, 12.5, 18.5);
      targetLookAt = new THREE.Vector3(-0.5, 1.0, 0.0);
    }

    targetViewRef.current = { pos: targetPos, target: targetLookAt };
  }, []);

  // React to cameraPreset changes
  useEffect(() => {
    if (cameraPreset && cameraPreset !== 'custom') {
      applyPreset(cameraPreset);
    }
  }, [cameraPreset, applyPreset]);

  // Smoothly focus camera when a furrow row is selected
  useEffect(() => {
    if (!selectedRowId) return;
    const rowPosMap = {
      'row-1': { x: 7.0, z: 3.5 },
      'row-2': { x: -0.6, z: 3.5 },
      'row-3': { x: -0.6, z: 8.8 },
      'row-4': { x: 7.0, z: 8.8 },
    };
    const target = rowPosMap[selectedRowId] ?? { x: 3.2, z: 6.2 };
    targetViewRef.current = {
      pos: new THREE.Vector3(target.x + 4.5, 3.8, target.z + 4.2),
      target: new THREE.Vector3(target.x, 0.8, target.z),
    };
    const frameId = requestAnimationFrame(() => {
      onPresetChange?.('crops');
    });
    return () => cancelAnimationFrame(frameId);
  }, [selectedRowId, onPresetChange]);

  // Cancel programmatic camera transition if user manually orbits
  const handleUserOrbitStart = useCallback(() => {
    targetViewRef.current = null;
    onPresetChange?.('custom');
  }, [onPresetChange]);

  return (
    <div className="canvas-wrapper">
      {/* 3D Canvas with WebGL Error Boundary */}
      <ErrorBoundary>
        <Suspense fallback={<CanvasLoader />}>
          <Canvas
            shadows
            dpr={[1, 1.5]}
            style={{ width: '100%', height: '100%', display: 'block' }}
            gl={{
              antialias: true,
              powerPreference: 'high-performance',
              alpha: false,
            }}
          >
            {/* Elevated Cinematic Perspective Camera framing the farm properly */}
            <PerspectiveCamera
              makeDefault
              position={[17.0, 12.5, 18.5]}
              fov={36}
              near={0.5}
              far={350}
            />

            {/* Orbit Controls with bounded angles preventing sub-terrain clipping */}
            <OrbitControls
              ref={controlsRef}
              enableDamping
              dampingFactor={0.065}
              minDistance={6}
              maxDistance={70}
              maxPolarAngle={Math.PI / 2.05} // Prevent sub-ground camera clipping
              minPolarAngle={Math.PI / 16}
              target={[-0.5, 1.0, 0.0]}
              onStart={handleUserOrbitStart}
            />

            {/* Smooth Cinematic Camera Transitions */}
            <SmoothCameraController
              targetViewRef={targetViewRef}
              controlsRef={controlsRef}
            />

            {/* Dynamic Weather Lighting, Sky, Clouds & Rain */}
            <WeatherEffects
              sceneConfig={weatherData?.scene}
              windSpeed={weatherData?.windSpeedKmH ?? 10}
            />

            {/* 3D Living Agricultural Digital Twin */}
            <FarmScene
              selectedRowId={selectedRowId}
              onSelectRow={onSelectRow}
              isIrrigating={isIrrigating}
              plots={farmConfig?.plots}
              soilMoisturePercent={weatherData?.simulation?.soilMoisturePercent ?? 34}
              windSpeed={weatherData?.windSpeedKmH ?? 10}
            />
          </Canvas>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
