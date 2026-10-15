import { useMemo } from 'react';
import { Sun, Cloud, CloudRain, Check, Radio, RotateCw, AlertCircle, Clock } from 'lucide-react';

export function WeatherSelector({
  currentWeather = 'live',
  onSelectWeather,
  liveWeather,
  hourlyForecast = [],
  isWeatherLoading = false,
  weatherError = null,
  onRetryWeather,
  location,
}) {
  const isLiveActive = currentWeather === 'live';

  const demoPresets = [
    {
      id: 'sunny',
      label: 'Sunny',
      sublabel: 'Clear Skies',
      icon: Sun,
      iconColor: '#f59e0b',
      badge: '25.8°C • Direct Sun',
    },
    {
      id: 'cloudy',
      label: 'Cloudy',
      sublabel: 'Overcast',
      icon: Cloud,
      iconColor: '#94a3b8',
      badge: '19.4°C • Diffused',
    },
    {
      id: 'rainy',
      label: 'Rainy',
      sublabel: 'Precipitation',
      icon: CloudRain,
      iconColor: '#38bdf8',
      badge: '14.6°C • Rain 6.8mm',
    },
  ];

  // Helper to map hourly forecast WMO code to appropriate Lucide icon
  const getForecastIcon = (code, precip) => {
    if (precip > 0 || (code >= 51 && code <= 67) || (code >= 80 && code <= 99)) {
      return <CloudRain size={16} className="text-sky" />;
    }
    if (code === 2 || code === 3 || code === 45 || code === 48) {
      return <Cloud size={16} className="text-slate-400" />;
    }
    return <Sun size={16} className="text-amber" />;
  };

  // Format forecast hour (e.g., "15:00" or "3 PM")
  const formatHour = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: 'numeric', hour12: true });
    } catch {
      return '--';
    }
  };

  // Slice next 12 hours starting from current hour instead of midnight
  const next12Hours = useMemo(() => {
    if (!Array.isArray(hourlyForecast) || hourlyForecast.length === 0) return [];
    if (!liveWeather?.updatedAt) return hourlyForecast.slice(0, 12);
    const baseTime = new Date(liveWeather.updatedAt).getTime();
    let startIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < hourlyForecast.length; i++) {
      if (!hourlyForecast[i]?.timestamp) continue;
      const t = new Date(hourlyForecast[i].timestamp).getTime();
      const diff = Math.abs(t - baseTime);
      if (diff < minDiff) {
        minDiff = diff;
        startIdx = i;
      }
    }
    return hourlyForecast.slice(startIdx, startIdx + 12);
  }, [hourlyForecast, liveWeather]);

  return (
    <div className="weather-selector-card">
      {/* Card Header with Provenance Badge */}
      <div className="card-header-compact">
        <h2 className="section-title">Atmospheric Conditions</h2>
        <span className={`badge-tag ${isLiveActive ? 'badge-live' : 'badge-demo'}`}>
          {isLiveActive ? 'LIVE WEATHER — OPEN-METEO' : 'DEMO PRESETS'}
        </span>
      </div>

      {/* Mode Switcher Tabs: Live Open-Meteo vs. Demo What-If Presets */}
      <div className="weather-mode-tabs" role="tablist" aria-label="Weather Source Selector">
        <button
          type="button"
          role="tab"
          aria-selected={isLiveActive}
          className={`mode-tab-btn ${isLiveActive ? 'active' : ''}`}
          onClick={() => onSelectWeather('live')}
        >
          <Radio size={14} className={isLiveActive ? 'text-emerald animate-pulse' : ''} />
          <span>Live Open-Meteo</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={!isLiveActive}
          className={`mode-tab-btn ${!isLiveActive ? 'active' : ''}`}
          onClick={() => {
            if (isLiveActive) onSelectWeather('sunny');
          }}
        >
          <span>Demo Presets</span>
        </button>
      </div>

      {/* -------------------------------------------------------------
          TAB 1: LIVE OPEN-METEO WEATHER & HOURLY FORECAST
          ------------------------------------------------------------- */}
      {isLiveActive && (
        <div className="live-weather-panel">
          {/* Loading State */}
          {isWeatherLoading && (
            <div className="weather-loading-box">
              <RotateCw size={18} className="animate-spin text-forest" />
              <span>Fetching live atmospheric data for {location?.name || 'field'}...</span>
            </div>
          )}

          {/* Error State */}
          {!isWeatherLoading && weatherError && (
            <div className="weather-error-box">
              <div className="err-icon-text">
                <AlertCircle size={18} className="text-red-500" />
                <span className="err-message">{weatherError}</span>
              </div>
              <div className="err-actions-row">
                {onRetryWeather && (
                  <button type="button" className="btn-retry-weather" onClick={onRetryWeather}>
                    <RotateCw size={13} />
                    <span>Retry Live API</span>
                  </button>
                )}
                <button
                  type="button"
                  className="btn-fallback-preset"
                  onClick={() => onSelectWeather('sunny')}
                >
                  <span>Use Offline Demo Preset</span>
                </button>
              </div>
            </div>
          )}

          {/* Success State: Current Live Weather Summary */}
          {!isWeatherLoading && !weatherError && liveWeather && (
            <div className="live-weather-summary-box">
              <div className="live-summary-top">
                <div className="live-condition-wrap">
                  {getForecastIcon(liveWeather.weatherCode, liveWeather.precipitation)}
                  <span className="live-condition-name">{liveWeather.weatherState}</span>
                </div>
                {onRetryWeather && (
                  <button
                    type="button"
                    className="btn-refresh-live"
                    onClick={onRetryWeather}
                    title="Refresh live Open-Meteo weather"
                    aria-label="Refresh weather data"
                  >
                    <RotateCw size={13} />
                    <span>Sync</span>
                  </button>
                )}
              </div>

              <div className="live-summary-stats">
                <div className="live-stat-item">
                  <span className="live-stat-val">
                    {liveWeather.temperature !== null ? `${liveWeather.temperature.toFixed(1)}°C` : '--'}
                  </span>
                  <span className="live-stat-lbl">Air Temp</span>
                </div>
                <div className="live-stat-sep"></div>
                <div className="live-stat-item">
                  <span className="live-stat-val">
                    {liveWeather.humidity !== null ? `${liveWeather.humidity}%` : '--'}
                  </span>
                  <span className="live-stat-lbl">Humidity</span>
                </div>
                <div className="live-stat-sep"></div>
                <div className="live-stat-item">
                  <span className="live-stat-val">
                    {liveWeather.windSpeed !== null ? `${liveWeather.windSpeed} km/h` : '--'}
                  </span>
                  <span className="live-stat-lbl">Wind Speed</span>
                </div>
                <div className="live-stat-sep"></div>
                <div className="live-stat-item">
                  <span className="live-stat-val text-sky">
                    {liveWeather.precipitation !== null ? `${liveWeather.precipitation} mm` : '0 mm'}
                  </span>
                  <span className="live-stat-lbl">Precipitation</span>
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------
              HOURLY FORECAST PREVIEW (OPEN-METEO)
              ------------------------------------------------------------- */}
          {!isWeatherLoading && !weatherError && next12Hours.length > 0 && (
            <div className="hourly-forecast-preview-section">
              <div className="forecast-header-row">
                <div className="forecast-title-wrap">
                  <Clock size={13} className="text-forest" />
                  <span className="forecast-title">Hourly Forecast (Next 12h)</span>
                </div>
                <span className="forecast-badge">HOURLY FORECAST — OPEN-METEO</span>
              </div>

              <div className="hourly-forecast-strip" tabIndex={0} role="region" aria-label="Hourly Weather Forecast Strip">
                {next12Hours.map((hr, idx) => {
                  const hasRain = hr.precipitation !== null && hr.precipitation > 0;
                  return (
                    <div key={idx} className={`hourly-forecast-chip ${hasRain ? 'rain-expected' : ''}`}>
                      <span className="hourly-time">{formatHour(hr.timestamp)}</span>
                      <div className="hourly-icon-wrap">
                        {getForecastIcon(hr.weatherCode, hr.precipitation)}
                      </div>
                      <span className="hourly-temp">
                        {hr.temperature !== null ? `${Math.round(hr.temperature)}°` : '--'}
                      </span>
                      <span className={`hourly-precip ${hasRain ? 'text-sky font-semibold' : ''}`}>
                        {hasRain ? `${hr.precipitation.toFixed(1)}mm` : '0mm'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB 2: DEMO PRESETS (WHAT-IF EXPLORATION)
          ------------------------------------------------------------- */}
      {!isLiveActive && (
        <div className="demo-presets-panel">
          <div className="demo-presets-notice">
            <span>Manual presets for evaluating 3D crop reaction and soil drying scenarios.</span>
          </div>

          <div className="weather-options-grid" role="radiogroup" aria-label="Simulated Weather States">
            {demoPresets.map((opt) => {
              const Icon = opt.icon;
              const isActive = currentWeather === opt.id;

              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  className={`weather-option-btn ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectWeather(opt.id)}
                >
                  <div className="option-icon-box" style={{ color: opt.iconColor }}>
                    <Icon size={18} />
                  </div>
                  <div className="option-text-wrap">
                    <span className="option-label">{opt.label}</span>
                    <span className="option-sublabel">{opt.sublabel}</span>
                  </div>
                  {isActive && (
                    <div className="active-check-dot">
                      <Check size={12} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
