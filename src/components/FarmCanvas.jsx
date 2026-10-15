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

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Dynamically resolve world-space coordinates of crops across the farm
function getCropWorldPosition(rowIdOrCropId, farmConfig) {
  if (farmConfig && Array.isArray(farmConfig.plots)) {
    const foundPlot = farmConfig.plots.find(
      (p) => p.rowId === rowIdOrCropId || p.id === rowIdOrCropId || p.cropType === rowIdOrCropId
    );
    if (foundPlot) {
      if (Array.isArray(foundPlot.position)) {
        return { x: foundPlot.position[0], y: foundPlot.position[1] ?? 0.45, z: foundPlot.position[2] };
      }
      if (typeof foundPlot.xPos === 'number' && typeof foundPlot.zPos === 'number') {
        return { x: foundPlot.xPos, y: foundPlot.yPos ?? 0.45, z: foundPlot.zPos };
      }
    }
  }
  const rowPosMap = {
    'row-1': { x: 7.0, y: 0.45, z: 3.5 },
    'row-2': { x: -0.6, y: 0.45, z: 3.5 },
    'row-3': { x: -0.6, y: 0.45, z: 8.8 },
    'row-4': { x: 7.0, y: 0.45, z: 8.8 },
    'wheat': { x: 7.0, y: 0.45, z: 3.5 },
    'corn': { x: -0.6, y: 0.45, z: 3.5 },
    'lettuce': { x: -0.6, y: 0.45, z: 8.8 },
    'carrots': { x: 7.0, y: 0.45, z: 8.8 },
    'sunflower': { x: -9.2, y: 0.5, z: 6.0 },
    'sunflowers': { x: -9.2, y: 0.5, z: 6.0 },
  };
  return rowPosMap[rowIdOrCropId] || { x: 3.2, y: 0.45, z: 6.2 };
}

// Smooth Camera Controller for polished 600–1000ms transitions
function SmoothCameraController({ animRef, controlsRef }) {
  useFrame(({ camera }) => {
    const anim = animRef.current;
    if (!anim) return;

    const now = performance.now();
    const elapsed = now - anim.startTime;
    const progress = Math.min(1, Math.max(0, elapsed / anim.duration));
    const t = easeInOutCubic(progress);

    // Smoothly interpolate camera position
    camera.position.lerpVectors(anim.startPos, anim.endPos, t);

    // Smoothly interpolate OrbitControls target focal point
    if (controlsRef.current) {
      controlsRef.current.target.lerpVectors(anim.startTarget, anim.endTarget, t);
      controlsRef.current.update();
    }

    // Finish transition
    if (progress >= 1) {
      camera.position.copy(anim.endPos);
      if (controlsRef.current) {
        controlsRef.current.target.copy(anim.endTarget);
        controlsRef.current.update();
      }
      animRef.current = null;
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
  const animRef = useRef(null);

  // Trigger smooth cancellable camera navigation (600–1000ms duration)
  const triggerTransition = useCallback((targetPos, targetLookAt, duration = 800) => {
    if (!controlsRef.current) return;
    const currentCamera = controlsRef.current.object;
    const startPos = currentCamera.position.clone();
    const startTarget = controlsRef.current.target.clone();

    animRef.current = {
      startPos,
      endPos: targetPos.clone(),
      startTarget,
      endTarget: targetLookAt.clone(),
      startTime: performance.now(),
      duration: Math.max(600, Math.min(1000, duration)),
    };
  }, []);

  // Smoothly move camera toward selected crop plot when a crop is selected
  useEffect(() => {
    if (!selectedRowId) return;

    const pos = getCropWorldPosition(selectedRowId, farmConfig);
    // Focus camera directly on the selected crop with natural perspective angle
    const targetPos = new THREE.Vector3(pos.x + 4.2, 3.2, pos.z + 4.5);
    const targetLookAt = new THREE.Vector3(pos.x, 0.65, pos.z);

    triggerTransition(targetPos, targetLookAt, 800);
  }, [selectedRowId, farmConfig, triggerTransition]);

  // Trigger smooth cinematic camera navigation when cameraPreset prop changes
  const applyPreset = useCallback(
    (preset) => {
      let targetPos, targetLookAt;

      if (preset === 'top') {
        targetPos = new THREE.Vector3(0.01, 36.0, 0.05);
        targetLookAt = new THREE.Vector3(-0.5, 0.5, 0);
      } else if (preset === 'crops') {
        if (selectedRowId) {
          const pos = getCropWorldPosition(selectedRowId, farmConfig);
          targetPos = new THREE.Vector3(pos.x + 4.2, 3.2, pos.z + 4.5);
          targetLookAt = new THREE.Vector3(pos.x, 0.65, pos.z);
        } else {
          targetPos = new THREE.Vector3(11.5, 7.5, 14.2);
          targetLookAt = new THREE.Vector3(3.2, 0.8, 6.2);
        }
      } else if (preset === 'farmhouse') {
        targetPos = new THREE.Vector3(-1.5, 3.8, 0.5);
        targetLookAt = new THREE.Vector3(-5.0, 1.8, -5.5);
      } else {
        // 'overview' or 'reset'
        targetPos = new THREE.Vector3(17.0, 12.5, 18.5);
        targetLookAt = new THREE.Vector3(-0.5, 1.0, 0.0);
      }

      triggerTransition(targetPos, targetLookAt, 800);
    },
    [selectedRowId, farmConfig, triggerTransition]
  );

  // React to cameraPreset changes
  useEffect(() => {
    if (cameraPreset && cameraPreset !== 'custom') {
      applyPreset(cameraPreset);
    }
  }, [cameraPreset, applyPreset]);

  // Cancel programmatic camera transition if user manually orbits
  const handleUserOrbitStart = useCallback(() => {
    animRef.current = null;
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
              animRef={animRef}
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

export default FarmCanvas;
