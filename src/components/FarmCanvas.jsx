import { Suspense, useRef, useState, useCallback, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { FarmScene } from './FarmScene';
import { WeatherEffects } from './WeatherEffects';
import { ErrorBoundary } from './ErrorBoundary';
import { RotateCcw, Eye, Camera, Sprout, Maximize2, Minimize2, SlidersHorizontal, Compass } from 'lucide-react';
import { SUPPORTED_CROPS, GROWTH_STAGES } from '../data/cropConfig';

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

    // Smooth lerp camera position
    camera.position.lerp(targetViewRef.current.pos, delta * 3.5);

    // Smooth lerp OrbitControls target focal point
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetViewRef.current.target, delta * 3.5);
      controlsRef.current.update();
    }

    // Stop transition when close enough
    if (camera.position.distanceTo(targetViewRef.current.pos) < 0.08) {
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
  isFullscreen = false,
  onToggleFullscreen,
  farmConfig,
  onOpenFarmConfig,
}) {
  const controlsRef = useRef();
  const targetViewRef = useRef(null);
  const [activePreset, setActivePreset] = useState('overview');

  // Trigger smooth cinematic camera navigation
  const navigateToView = useCallback((preset) => {
    setActivePreset(preset);
    let targetPos, targetLookAt;

    if (preset === 'top') {
      targetPos = new THREE.Vector3(0.01, 38.0, 0.01);
      targetLookAt = new THREE.Vector3(0, 0, 0);
    } else if (preset === 'crops') {
      targetPos = new THREE.Vector3(7.2, 3.2, 7.2);
      targetLookAt = new THREE.Vector3(0, 0.8, 0);
    } else if (preset === 'hub') {
      targetPos = new THREE.Vector3(-4.5, 3.0, 7.2);
      targetLookAt = new THREE.Vector3(-7.8, 1.8, 4.4);
    } else {
      // 'overview' or 'reset'
      targetPos = new THREE.Vector3(24.0, 15.0, 24.0);
      targetLookAt = new THREE.Vector3(0, 1.0, 0);
    }

    targetViewRef.current = { pos: targetPos, target: targetLookAt };
  }, []);

  const handleResetCamera = useCallback(() => {
    navigateToView('overview');
  }, [navigateToView]);

  // Cancel programmatic camera transition if user manually orbits
  const handleUserOrbitStart = useCallback(() => {
    targetViewRef.current = null;
    setActivePreset('custom');
  }, []);

  // Lookup configured plot for selected row dynamically from farmConfig
  const selectedPlot = farmConfig?.plots?.find((p) => p.rowId === selectedRowId);
  const cropInfo = selectedPlot && SUPPORTED_CROPS[selectedPlot.cropType];
  const stageInfo = selectedPlot && GROWTH_STAGES[selectedPlot.growthStage];

  const rowDetails = useMemo(() => {
    if (!selectedRowId) return null;
    if (selectedPlot) {
      return {
        title: selectedPlot.name,
        density: cropInfo?.density || 'Standard Precision Furrow',
        health: `${weatherData?.simulation?.cropHealthScore || 96}% (${
          weatherData?.simulation?.cropHealthStatus || 'Active Growth'
        })`,
        moistureNeed: `${cropInfo?.category || 'Field Crop'} • ${stageInfo?.label || 'Active Growth'}`,
        irrigationZone: `Zone ${selectedRowId.replace('row-', '0')}`,
        stage: `Planted: ${selectedPlot.plantingDate || 'Active'} • Stage: ${stageInfo?.label || 'Vegetative'}`,
        isFallow: false,
      };
    }
    // Furrow without an active plot (fallow)
    return {
      title: `Furrow ${selectedRowId.replace('row-', '0')} — Fallow / Uncultivated`,
      density: '0 Stalks (Tilled Soil Berm)',
      health: 'N/A (Fallow Soil)',
      moistureNeed: 'Conservation Standby',
      irrigationZone: `Zone ${selectedRowId.replace('row-', '0')}`,
      stage: 'Unplanted / Fallow Furrow',
      isFallow: true,
    };
  }, [selectedRowId, selectedPlot, cropInfo, stageInfo, weatherData]);

  return (
    <div className="canvas-wrapper">
      {/* 3D Canvas with WebGL Error Boundary */}
      <ErrorBoundary>
        <Suspense fallback={<CanvasLoader />}>
          <Canvas
            shadows
            dpr={[1, 1.5]}
            gl={{
              antialias: true,
              powerPreference: 'high-performance',
              alpha: false,
            }}
          >
            {/* Elevated Cinematic Perspective Camera */}
            <PerspectiveCamera
              makeDefault
              position={[24.0, 15.0, 24.0]}
              fov={32}
              near={0.5}
              far={260}
            />

            {/* Orbit Controls with bounded angles preventing sub-terrain clipping */}
            <OrbitControls
              ref={controlsRef}
              enableDamping
              dampingFactor={0.065}
              minDistance={5}
              maxDistance={58}
              maxPolarAngle={Math.PI / 2.06} // Prevent sub-ground camera clipping
              minPolarAngle={Math.PI / 12}
              target={[0, 1.0, 0]}
              onStart={handleUserOrbitStart}
            />

            {/* Smooth Cinematic Camera Transitions */}
            <SmoothCameraController
              targetViewRef={targetViewRef}
              controlsRef={controlsRef}
            />

            {/* Dynamic Weather Lighting, Sky, Clouds & Rain */}
            <WeatherEffects
              sceneConfig={weatherData.scene}
              windSpeed={weatherData.windSpeedKmH}
            />

            {/* 3D Living Agricultural Digital Twin */}
            <FarmScene
              weather={weatherData.id}
              sceneConfig={weatherData.scene}
              windSpeed={weatherData.windSpeedKmH}
              selectedRowId={selectedRowId}
              onSelectRow={onSelectRow}
              isIrrigating={isIrrigating}
              plots={farmConfig?.plots}
            />
          </Canvas>
        </Suspense>
      </ErrorBoundary>

      {/* Floating HUD Top-Bar Overlay */}
      <div className="canvas-hud-top">
        <div className="canvas-state-pill">
          <span className={`status-dot ${weatherData.id}`}></span>
          <span className="state-label">
            {weatherData.name} Mode • {weatherData.condition}
          </span>
        </div>

        {/* Viewport Camera Presets, Reset & Fullscreen Toolbar */}
        <div className="canvas-controls-group" role="toolbar" aria-label="Camera Presets">
          <button
            type="button"
            className={`hud-btn ${activePreset === 'overview' ? 'active-preset' : ''}`}
            title="Overview Angle"
            onClick={() => navigateToView('overview')}
          >
            <Camera size={14} />
            <span>Overview</span>
          </button>

          <button
            type="button"
            className={`hud-btn ${activePreset === 'crops' ? 'active-preset' : ''}`}
            title="Low Crop Row Focus"
            onClick={() => navigateToView('crops')}
          >
            <Eye size={14} />
            <span>Crops</span>
          </button>

          <button
            type="button"
            className={`hud-btn ${activePreset === 'hub' ? 'active-preset' : ''}`}
            title="Agritech Hub Focus"
            onClick={() => navigateToView('hub')}
          >
            <Sprout size={14} />
            <span>Smart Hub</span>
          </button>

          <button
            type="button"
            className={`hud-btn ${activePreset === 'top' ? 'active-preset' : ''}`}
            title="Top-Down Satellite View"
            onClick={() => navigateToView('top')}
          >
            <Compass size={14} />
            <span>Top View</span>
          </button>

          <button
            type="button"
            className="hud-btn reset-btn"
            title="Reset Camera to Farm Overview"
            onClick={handleResetCamera}
          >
            <RotateCcw size={14} />
            <span>Reset View</span>
          </button>

          {onToggleFullscreen && (
            <button
              type="button"
              className={`hud-btn fullscreen-hud-btn ${isFullscreen ? 'active-preset' : ''}`}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Immersive Fullscreen'}
              onClick={onToggleFullscreen}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Selected Crop Plot Quick Inspector HUD */}
      {rowDetails && (
        <div className="canvas-row-inspector" role="dialog" aria-label="Selected Crop Plot Details">
          <div className="inspector-header">
            <span className="inspector-title">{rowDetails.title}</span>
            <div className="inspector-header-actions">
              {onOpenFarmConfig && (
                <button
                  type="button"
                  className="inspector-config-btn"
                  onClick={onOpenFarmConfig}
                  title="Configure farm plots and crops"
                >
                  <SlidersHorizontal size={13} />
                  <span>Configure</span>
                </button>
              )}
              <button
                type="button"
                className="inspector-close-btn"
                onClick={() => onSelectRow(null)}
                aria-label="Close details"
              >
                ×
              </button>
            </div>
          </div>
          <div className="inspector-grid">
            <div className="inspector-item">
              <span className="item-label">Growth Stage</span>
              <span className="item-val">{rowDetails.stage}</span>
            </div>
            <div className="inspector-item">
              <span className="item-label">Canopy Health</span>
              <span className="item-val text-emerald font-semibold">{rowDetails.health}</span>
            </div>
            <div className="inspector-item">
              <span className="item-label">Hydration Target</span>
              <span className="item-val text-sky">{rowDetails.moistureNeed}</span>
            </div>
            <div className="inspector-item">
              <span className="item-label">Assigned Manifold</span>
              <span className="item-val">{rowDetails.irrigationZone}</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Hint Bar */}
      <div className="canvas-hud-bottom">
        <span className="hud-hint">
          Click any crop plot row to inspect irrigation metrics • Drag to orbit • Scroll to zoom
        </span>
      </div>
    </div>
  );
}
