import { Droplets, Sprout, Zap } from 'lucide-react';

export function FarmStatus({ simulation = {} }) {
  const moisturePercent = simulation?.soilMoisturePercent ?? 34;
  const healthPercent = simulation?.cropHealthScore ?? 95;

  // Visual status pill for irrigation action
  const actionBadges = {
    SCHEDULED: {
      bg: 'rgba(137, 194, 217, 0.15)',
      border: 'rgba(137, 194, 217, 0.35)',
      text: '#89C2D9',
      label: 'Drip Cycle Scheduled',
      sub: 'Peak absorption window at 18:30',
    },
    STANDBY: {
      bg: 'rgba(69, 107, 80, 0.25)',
      border: 'rgba(69, 107, 80, 0.45)',
      text: '#B8D6A0',
      label: 'Moisture Retention Standby',
      sub: 'Root zone sufficient for 14 hrs',
    },
    SUPPRESSED: {
      bg: 'rgba(217, 107, 91, 0.15)',
      border: 'rgba(217, 107, 91, 0.35)',
      text: '#D96B5B',
      label: 'Rain Override (Valves Locked)',
      sub: 'Natural precipitation replenishing soil',
    },
  }[simulation?.irrigationAction] || {
    bg: 'rgba(184, 214, 160, 0.15)',
    border: 'rgba(184, 214, 160, 0.35)',
    text: '#B8D6A0',
    label: 'Optimal State',
    sub: 'Active monitoring',
  };

  const soilColor = simulation?.soilMoistureColor || '#B8D6A0';
  const healthColor = simulation?.cropHealthColor || '#B8D6A0';

  return (
    <div className="farm-status-card">
      <div className="card-header-compact">
        <h2 className="section-title">Field Hydration & Crop Health</h2>
        <span className="badge-tag">SIMULATED MODEL</span>
      </div>

      {/* Main Stat Dual Gauges */}
      <div className="status-gauges-row">
        {/* Soil Moisture */}
        <div className="gauge-box">
          <div className="gauge-header">
            <div className="gauge-title-wrap">
              <Droplets size={16} className="text-sky" />
              <span className="gauge-name">Soil Moisture</span>
            </div>
          </div>

          <div className="gauge-badge-row">
            <span
              className="gauge-badge"
              style={{
                color: soilColor,
                backgroundColor: `${soilColor}18`,
                borderColor: `${soilColor}30`,
              }}
            >
              {simulation?.soilMoistureStatus || 'Optimal Range'}
            </span>
          </div>

          <div className="gauge-value-row">
            <span className="stat-big">{typeof moisturePercent === 'number' ? moisturePercent.toFixed(2) : 'N/A'}%</span>
          </div>

          <div className="meter-track">
            <div
              className="meter-fill"
              style={{
                width: `${Math.min(100, Math.max(0, typeof moisturePercent === 'number' ? moisturePercent : 0))}%`,
                background: soilColor,
              }}
            ></div>
          </div>

          <div className="gauge-secondary-row meter-scale-markers">
            <span className="secondary-label">Soil Water (VWC)</span>
            <span className="secondary-metric marker-opt">Optimal (35-65%)</span>
          </div>
        </div>

        {/* Crop Health Index */}
        <div className="gauge-box">
          <div className="gauge-header">
            <div className="gauge-title-wrap">
              <Sprout size={16} className="text-emerald" />
              <span className="gauge-name">Crop Health Index</span>
            </div>
          </div>

          <div className="gauge-badge-row">
            <span
              className="gauge-badge"
              style={{
                color: healthColor,
                backgroundColor: `${healthColor}18`,
                borderColor: `${healthColor}30`,
              }}
            >
              {simulation?.cropHealthStatus || 'Vigorous Growth'}
            </span>
          </div>

          <div className="gauge-value-row">
            <span className="stat-big">{healthPercent}%</span>
          </div>

          <div className="meter-track">
            <div
              className="meter-fill"
              style={{
                width: `${healthPercent}%`,
                background: healthColor,
              }}
            ></div>
          </div>

          <div className="gauge-secondary-row meter-scale-markers">
            <span className="secondary-label">Canopy Vigor</span>
            <span className="secondary-metric marker-opt">NDVI 0.84</span>
          </div>
        </div>
      </div>

      {/* Smarter Irrigation Intelligence Advisory */}
      <div
        className="irrigation-advisory-box"
        style={{
          backgroundColor: actionBadges.bg,
          borderColor: actionBadges.border,
        }}
      >
        <div className="advisory-top">
          <div className="advisory-header-left">
            <Zap size={16} style={{ color: actionBadges.text }} />
            <span className="advisory-title">Irrigation Intelligence</span>
          </div>
          <span
            className="action-state-pill"
            style={{
              color: actionBadges.text,
              borderColor: actionBadges.border,
            }}
          >
            {actionBadges.label}
          </span>
        </div>

        <p className="advisory-body">{simulation?.irrigationRecommendation || 'Soil moisture adequate: Irrigation on standby.'}</p>

        <div className="advisory-meta-grid">
          <div className="advisory-meta-item">
            <span className="ad-meta-label">Est. Evapotranspiration:</span>
            <span className="ad-meta-val">{simulation?.evapotranspirationRateMmDay ?? 1.2} mm/day</span>
          </div>
          <div className="advisory-meta-item">
            <span className="ad-meta-label">Simulated Soil Temp:</span>
            <span className="ad-meta-val">{simulation?.soilTemperatureC ?? 18.5}°C</span>
          </div>
          <div className="advisory-meta-item">
            <span className="ad-meta-label">Water Conserved Today:</span>
            <span className="ad-meta-val text-emerald font-semibold">
              {(simulation?.waterSavedLitres ?? (typeof simulation?.waterPreservedTodayGal === 'number' ? Math.round(simulation.waterPreservedTodayGal / 0.264172) : 0)).toLocaleString()} L Saved
            </span>
          </div>
        </div>
      </div>

      <div className="farm-status-disclaimer">
        <span>SIMULATED: Mathematical soil & crop models. Not physical sensor measurements.</span>
      </div>
    </div>
  );
}
