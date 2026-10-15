import {
  Thermometer,
  Droplets,
  Wind,
  Sun,
  CloudRain,
} from 'lucide-react';

export function WeatherMetrics({ weatherData, location }) {
  const isLive = weatherData.dataMode === 'live';

  const isRaining =
    typeof weatherData.precipitationRateMmH === 'number' &&
    Number.isFinite(weatherData.precipitationRateMmH) &&
    weatherData.precipitationRateMmH > 0;

  const metrics = [
    {
      id: 'temp',
      label: 'Ambient Temperature',
      value:
        typeof weatherData.tempC === 'number' && Number.isFinite(weatherData.tempC)
          ? `${weatherData.tempC.toFixed(1)}°C`
          : '--',
      subvalue:
        typeof weatherData.tempF === 'number' && Number.isFinite(weatherData.tempF)
          ? `${weatherData.tempF.toFixed(1)}°F`
          : '--',
      icon: Thermometer,
      iconColor: '#E0A94F',
    },
    {
      id: 'humidity',
      label: 'Relative Humidity',
      value:
        typeof weatherData.humidity === 'number' && Number.isFinite(weatherData.humidity)
          ? `${weatherData.humidity}%`
          : '--',
      subvalue:
        typeof weatherData.atmosphericPressureHpa === 'number' && Number.isFinite(weatherData.atmosphericPressureHpa)
          ? `Pressure: ${Math.round(weatherData.atmosphericPressureHpa)} hPa • Dew Point: ${weatherData.dewPointC ?? '--'}°C`
          : (typeof weatherData.dewPointC === 'number' && Number.isFinite(weatherData.dewPointC) ? `Dew Point: ${weatherData.dewPointC}°C` : '--'),
      icon: Droplets,
      iconColor: '#89C2D9',
    },
    {
      id: 'wind',
      label: 'Wind Speed',
      value:
        typeof weatherData.windSpeedKmH === 'number' && Number.isFinite(weatherData.windSpeedKmH)
          ? `${weatherData.windSpeedKmH} km/h`
          : '--',
      subvalue: weatherData.windDirection
        ? `Vector: ${weatherData.windDirection}${typeof weatherData.windDirectionDeg === 'number' && Number.isFinite(weatherData.windDirectionDeg) ? ` (${Math.round(weatherData.windDirectionDeg)}°)` : ''}`
        : 'Vector: Unavailable',
      icon: Wind,
      iconColor: '#AEBCAF',
    },
    {
      id: 'solar',
      label: isRaining ? 'Precipitation' : 'Solar Irradiance',
      value: isRaining
        ? `${weatherData.precipitationRateMmH.toFixed(1)} mm/h`
        : (typeof weatherData.solarIrradianceWm2 === 'number' && Number.isFinite(weatherData.solarIrradianceWm2)
            ? `${weatherData.solarIrradianceWm2} W/m²`
            : 'Unavailable'),
      subvalue: isRaining
        ? 'Active Rainfall'
        : (typeof weatherData.solarIrradianceWm2 === 'number' && Number.isFinite(weatherData.solarIrradianceWm2)
            ? `UV: ${weatherData.uvIndex ?? '--'} (${weatherData.uvRating ?? 'N/A'})`
            : 'Radiation data unavailable'),
      icon: isRaining ? CloudRain : Sun,
      iconColor: isRaining ? '#89C2D9' : '#B8D6A0',
    },
  ];

  return (
    <div className="weather-metrics-card">
      <div className="card-header-compact">
        <h2 className="section-title">Atmospheric Conditions</h2>
        <span className={`badge-tag ${isLive ? 'badge-live' : 'badge-demo'}`}>
          {isLive ? 'LIVE WEATHER — OPEN-METEO' : 'DEMO PRESET'}
        </span>
      </div>

      <div className="metrics-grid">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.id} className="metric-cell">
              <div className="metric-cell-top">
                <span className="metric-label">{m.label}</span>
                <div className="metric-icon" style={{ color: m.iconColor }}>
                  <Icon size={16} />
                </div>
              </div>
              <div className="metric-cell-middle">
                <span className="metric-value">{m.value}</span>
              </div>
              <div className="metric-cell-bottom">
                <span className="metric-sub">{m.subvalue}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Clear Data Provenance Footer */}
      <div className="metrics-provenance-footer">
        <div className="provenance-left">
          <span className="provenance-source">
            {isLive ? 'Source: Open-Meteo Meteorological API' : 'Source: Demo Simulation Preset'}
          </span>
          {typeof location?.latitude === 'number' && typeof location?.longitude === 'number' && Number.isFinite(location.latitude) && Number.isFinite(location.longitude) && (
            <span className="provenance-coords">
              • Coord: {location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°
            </span>
          )}
        </div>
        {isLive && weatherData.updatedAt && (
          <span className="provenance-timestamp">
            Synced {new Date(weatherData.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}
