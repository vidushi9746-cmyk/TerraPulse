import { Play, Pause, RotateCcw, StepForward, Clock } from 'lucide-react';
import './SimulationControls.css';

export function SimulationControls({
  isPlaying = false,
  onTogglePlay,
  simSpeed = 1,
  onChangeSpeed,
  simStepHours = 0,
  maxHours = 24,
  onSeek,
  onStepForward,
  onReset,
  currentSimDate,
  isForecastAvailable = true,
}) {
  const speeds = [1, 2, 5];

  const provenanceLabel =
    simStepHours === 0
      ? 'LIVE TELEMETRY (T+0)'
      : isForecastAvailable
      ? `HOURLY FORECAST — OPEN-METEO (+${simStepHours}h)`
      : `WHAT-IF SIMULATED EXTENSION (+${simStepHours}h)`;

  return (
    <div className="sim-controls-container" aria-label="Simulation Time Controls">
      <div className="sim-controls-top-row">
        {/* Clock & Simulated Time Info */}
        <div className="sim-time-cluster">
          <Clock size={16} className="text-forest" />
          <div className="sim-time-labels">
            <span className="sim-time-main">
              {simStepHours === 0 ? 'Live Synchronous' : `Simulated: +${simStepHours} hr${simStepHours === 1 ? '' : 's'}`}
            </span>
            <span className="sim-time-sub">
              {currentSimDate ? new Date(currentSimDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }) : 'Local Farm Time'}
            </span>
          </div>
        </div>

        {/* Provenance Badge */}
        <div className="sim-provenance-tag">
          <span
            className={`sim-tag-pill ${
              simStepHours === 0
                ? 'tag-live'
                : isForecastAvailable
                ? 'tag-forecast'
                : 'tag-whatif'
            }`}
          >
            {provenanceLabel}
          </span>
        </div>
      </div>

      {/* Scrubber Range Slider */}
      <div className="sim-scrubber-row">
        <input
          type="range"
          min="0"
          max={maxHours}
          step="1"
          value={simStepHours}
          onChange={(e) => onSeek?.(Number(e.target.value))}
          className="sim-slider"
          aria-label="Simulation timeline scrubber in hours"
        />
        <div className="sim-slider-scale">
          <span>Now (T+0)</span>
          <span>+6h (Decision Window)</span>
          <span>+12h</span>
          <span>+{maxHours}h</span>
        </div>
      </div>

      {/* Playback Action Buttons */}
      <div className="sim-playback-row">
        <div className="sim-btn-group">
          <button
            type="button"
            className={`sim-ctrl-btn play-btn ${isPlaying ? 'active-playing' : ''}`}
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause Simulation' : 'Start Simulation Playback'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            type="button"
            className="sim-ctrl-btn step-btn"
            onClick={onStepForward}
            title="Advance 1 Hour (Deterministic Step)"
            aria-label="Step forward 1 hour"
          >
            <StepForward size={14} />
            <span>+1 hr</span>
          </button>

          <button
            type="button"
            className="sim-ctrl-btn reset-btn"
            onClick={onReset}
            title="Reset Simulation to Live Time"
            aria-label="Reset simulation"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>

        {/* Speed Toggles */}
        <div className="sim-speed-group" role="group" aria-label="Playback speed">
          <span className="speed-group-label">Speed:</span>
          {speeds.map((s) => (
            <button
              key={s}
              type="button"
              className={`speed-pill ${simSpeed === s ? 'selected' : ''}`}
              onClick={() => onChangeSpeed?.(s)}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SimulationControls;
