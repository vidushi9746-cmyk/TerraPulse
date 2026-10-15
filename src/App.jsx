import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { MOCK_WEATHER_DATA } from './data/mockWeather';
import { fetchCurrentWeather } from './services/weatherService';
import { fetchHourlyForecast } from './services/forecastService';
import { estimateSoilMoisture } from './farmSimulation';
import { compareIrrigation } from './irrigationEngine';
import {
  DEFAULT_FARM_CONFIG,
  SUPPORTED_CROPS,
  GROWTH_STAGES,
  convertAreaToSqm,
  deriveCropIrrigationThresholds,
} from './data/cropConfig';
import { LandingPage } from './components/LandingPage';
import { DashboardHeader } from './components/DashboardHeader';
import { FarmCanvas } from './components/FarmCanvas';
import { WeatherSelector } from './components/WeatherSelector';
import { WeatherMetrics } from './components/WeatherMetrics';
import { FarmStatus } from './components/FarmStatus';
import { ComparisonPanel } from './components/ComparisonPanel';
import { ScenarioSelector } from './components/ScenarioSelector';
import { SimulationControls } from './components/SimulationControls';
import { FarmConfigModal } from './components/FarmConfigModal';
import { AddCropModal } from './components/AddCropModal';
import { LocationSearchModal } from './components/LocationSearchModal';
import { Droplet, SlidersHorizontal, Sprout, ChevronLeft, ChevronRight, X, Thermometer, CloudRain, Droplets, Plus, Sun, Cloud, Wind, MapPin } from 'lucide-react';
import './App.css';

// Default initial location: Willamette Valley, Oregon, USA
const DEFAULT_LOCATION = {
  id: 'or-willamette',
  name: 'Willamette Valley Field 04',
  region: 'Oregon, USA',
  latitude: 45.1248,
  longitude: -123.0872,
  elevation: '68 m',
  soilType: 'Willakenzie Loamy Silt',
  cropType: 'Winter Wheat & Mixed Veg',
  zones: 4,
};

// Baseline starting soil moisture (34% is just entering water stress < 35%, ideal for decision evaluation)
const BASELINE_SOIL_MOISTURE = 34.0;

function App() {
  // Navigation View State: 'landing' or 'farm'
  const [currentView, setCurrentView] = useState('landing');
  // Transition Phase: 'idle' | 'exiting-landing' | 'entering-farm' | 'exiting-farm' | 'entering-landing'
  const [transitionPhase, setTransitionPhase] = useState('idle');

  // Farm Location State
  const [selectedLocation, setSelectedLocation] = useState(DEFAULT_LOCATION);
  const [isLocationSearchOpen, setIsLocationSearchOpen] = useState(false);

  // Farm Configuration State (Single source of truth for acreage, soil, and crop plots)
  const [farmConfig, setFarmConfig] = useState(DEFAULT_FARM_CONFIG);
  const [isFarmConfigOpen, setIsFarmConfigOpen] = useState(false);
  const [isAddCropOpen, setIsAddCropOpen] = useState(false);

  // Weather & Forecast State
  const [weatherMode, setWeatherMode] = useState('live'); // 'live' | 'sunny' | 'cloudy' | 'rainy'
  const [liveWeather, setLiveWeather] = useState(null);
  const [hourlyForecast, setHourlyForecast] = useState([]);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);

  // Simulation Clock & What-If Scenario State
  const [selectedScenario, setSelectedScenario] = useState('live'); // 'live' | 'sunny' | 'rainy' | 'heavy-rain'
  const [simStepHours, setSimStepHours] = useState(0); // 0 to 24 hours
  const [isPlaying, setIsPlaying] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1); // 1, 2, 5

  // Farm Dashboard Viewport States
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [manualIrrigationTriggered, setManualIrrigationTriggered] = useState(false);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeSecondaryTab, setActiveSecondaryTab] = useState('irrigation');

  const farmViewportRef = useRef(null);

  // Derived farm area in square metres (for depth-to-volume conversions: litres = mm × areaSqm)
  const farmAreaSqm = useMemo(
    () => convertAreaToSqm(farmConfig.areaValue, farmConfig.areaUnit),
    [farmConfig.areaValue, farmConfig.areaUnit]
  );

  // Derived crop-specific irrigation threshold adjustments
  const cropThresholds = useMemo(
    () => deriveCropIrrigationThresholds(farmConfig.plots),
    [farmConfig.plots]
  );

  // Selected plot information lookup for contextual inspector
  const selectedPlotInfo = useMemo(() => {
    if (!selectedRowId) return null;
    const plot = farmConfig.plots?.find((p) => p.rowId === selectedRowId);
    if (!plot) return null;
    return {
      plot,
      crop: SUPPORTED_CROPS[plot.cropType],
      stage: GROWTH_STAGES[plot.growthStage],
    };
  }, [selectedRowId, farmConfig.plots]);

  // Synchronize fullscreen state with native browser fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Fetch real-time weather and forecast data from Open-Meteo
  const loadLiveWeatherData = useCallback(async (lat, lon) => {
    if (typeof lat !== 'number' || typeof lon !== 'number') return;
    setIsWeatherLoading(true);
    setWeatherError(null);

    try {
      const [current, forecast] = await Promise.all([
        fetchCurrentWeather(lat, lon),
        fetchHourlyForecast(lat, lon, 3),
      ]);
      setLiveWeather(current);
      setHourlyForecast(forecast);
    } catch (err) {
      console.error('Failed to fetch Open-Meteo weather data:', err);
      setWeatherError(err.message || 'Unable to connect to Open-Meteo meteorological service');
    } finally {
      setIsWeatherLoading(false);
    }
  }, []);

  // Fetch live weather whenever selected location coordinates change
  useEffect(() => {
    let ignore = false;
    const timer = setTimeout(() => {
      if (!ignore) {
        loadLiveWeatherData(selectedLocation.latitude, selectedLocation.longitude);
      }
    }, 0);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [selectedLocation.latitude, selectedLocation.longitude, loadLiveWeatherData]);

  // Simulation Clock Timer: Advances simStepHours deterministically
  useEffect(() => {
    if (!isPlaying) return undefined;
    const intervalMs = Math.round(2500 / simSpeed);
    const timer = setInterval(() => {
      setSimStepHours((prev) => {
        if (prev >= 24) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, simSpeed]);

  // Resolve hourly weather sequence for simulation timeline
  const getTimelineWeather = useCallback(
    (hourOffset) => {
      if (selectedScenario === 'sunny') {
        return {
          tempC: 26.5 + Math.sin(hourOffset * 0.26) * 4,
          humidity: 38,
          windSpeed: 8.5,
          precipitation: 0.0,
          weatherCode: 0,
          weatherState: 'Clear sky',
        };
      }
      if (selectedScenario === 'rainy') {
        const rainProfile = [1.5, 2.0, 2.0, 1.5, 1.0, 0.0];
        const precip = hourOffset < rainProfile.length ? rainProfile[hourOffset] : 0.0;
        return {
          tempC: 16.0 + Math.sin(hourOffset * 0.26) * 2,
          humidity: 86,
          windSpeed: 14.0,
          precipitation: precip,
          weatherCode: precip > 0 ? 61 : 3,
          weatherState: precip > 0 ? 'Slight rain' : 'Overcast',
        };
      }
      if (selectedScenario === 'heavy-rain') {
        const heavyRainProfile = [4.0, 5.0, 6.0, 4.0, 3.0, 2.0];
        const precip = hourOffset < heavyRainProfile.length ? heavyRainProfile[hourOffset] : 0.5;
        return {
          tempC: 14.5 + Math.sin(hourOffset * 0.26) * 2,
          humidity: 94,
          windSpeed: 24.0,
          precipitation: precip,
          weatherCode: precip >= 4 ? 65 : 63,
          weatherState: precip >= 4 ? 'Heavy rain' : 'Moderate rain',
        };
      }

      // Default: 'live' Open-Meteo telemetry & hourly forecast
      if (hourOffset === 0 && liveWeather) {
        return {
          tempC: liveWeather.temperature !== null ? liveWeather.temperature : 22.0,
          humidity: liveWeather.humidity !== null ? liveWeather.humidity : 50,
          windSpeed: liveWeather.windSpeed !== null ? liveWeather.windSpeed : 10,
          precipitation: liveWeather.precipitation !== null ? liveWeather.precipitation : 0,
          weatherCode: liveWeather.weatherCode,
          weatherState: liveWeather.weatherState || 'Normal',
        };
      }

      if (hourlyForecast && hourlyForecast[hourOffset]) {
        const item = hourlyForecast[hourOffset];
        return {
          tempC: item.temperature !== null ? item.temperature : 22.0,
          humidity: item.humidity !== null ? item.humidity : 50,
          windSpeed: item.windSpeed !== null ? item.windSpeed : 10,
          precipitation: item.precipitation !== null ? item.precipitation : 0,
          weatherCode: item.weatherCode,
          weatherState: item.weatherState || 'Normal',
          timestamp: item.timestamp,
        };
      }

      // Beyond available forecast intervals: What-if extrapolation
      const lastItem =
        hourlyForecast && hourlyForecast.length > 0
          ? hourlyForecast[hourlyForecast.length - 1]
          : null;
      return {
        tempC: lastItem?.temperature ?? 22.0,
        humidity: lastItem?.humidity ?? 50,
        windSpeed: lastItem?.windSpeed ?? 10,
        precipitation: 0.0,
        weatherCode: 1,
        weatherState: 'Mainly clear',
      };
    },
    [selectedScenario, liveWeather, hourlyForecast]
  );

  // Deterministic multi-step soil moisture accumulation over simulation time
  const currentSoilMoisture = useMemo(() => {
    let moisture = BASELINE_SOIL_MOISTURE;
    for (let i = 0; i < simStepHours; i++) {
      const hWeather = getTimelineWeather(i);
      const res = estimateSoilMoisture(
        moisture,
        hWeather.tempC,
        hWeather.humidity,
        hWeather.windSpeed,
        hWeather.precipitation
      );
      moisture = res.soilMoisture;
    }
    return Math.round(moisture * 100) / 100;
  }, [simStepHours, getTimelineWeather]);

  // Current simulation timestamp
  const activeSimTimestamp = useMemo(() => {
    const baseDate = liveWeather?.updatedAt ? new Date(liveWeather.updatedAt) : new Date();
    return new Date(baseDate.getTime() + simStepHours * 60 * 60 * 1000).toISOString();
  }, [liveWeather, simStepHours]);

  // 6-hour future forecast slice from active simulation point
  const activeForecastSlice = useMemo(() => {
    const intervals = [];
    const baseDate = new Date(activeSimTimestamp);

    for (let f = 1; f <= 6; f++) {
      const forecastOffset = simStepHours + f;
      const forecastDate = new Date(baseDate.getTime() + f * 60 * 60 * 1000).toISOString();
      const hWeather = getTimelineWeather(forecastOffset);
      intervals.push({
        timestamp: forecastDate,
        temperature: hWeather.tempC,
        humidity: hWeather.humidity,
        windSpeed: hWeather.windSpeed,
        precipitation: hWeather.precipitation,
        weatherCode: hWeather.weatherCode,
      });
    }
    return intervals;
  }, [simStepHours, activeSimTimestamp, getTimelineWeather]);

  // Irrigation Engine Evaluation: Compare Conventional vs Forecast-Aware Strategy
  // Incorporates configured crop thresholds and parcel acreage
  const comparisonResult = useMemo(() => {
    const currentHourWeather = getTimelineWeather(simStepHours);
    const envState = {
      location: selectedLocation.name,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      temperature: currentHourWeather.tempC,
      humidity: currentHourWeather.humidity,
      windSpeed: currentHourWeather.windSpeed,
      precipitation: currentHourWeather.precipitation,
      forecast: activeForecastSlice,
      updatedAt: activeSimTimestamp,
      dataMode: selectedScenario === 'live' ? 'live' : 'what-if',
    };

    try {
      return compareIrrigation(envState, currentSoilMoisture, {
        forecastWindowHours: 6,
        decisionTime: activeSimTimestamp,
        dryThreshold: cropThresholds.dryThreshold,
        targetMoisture: cropThresholds.targetMoisture,
      });
    } catch (err) {
      console.error('compareIrrigation failed:', err);
      return null;
    }
  }, [
    selectedLocation,
    simStepHours,
    getTimelineWeather,
    activeForecastSlice,
    activeSimTimestamp,
    selectedScenario,
    currentSoilMoisture,
    cropThresholds,
  ]);

  // Construct active weatherData reacting to real Open-Meteo API, timeline, or what-if scenario
  const weatherData = useMemo(() => {
    const activeHourWeather = getTimelineWeather(simStepHours);
    const tempC = activeHourWeather.tempC;
    const tempF = (tempC * 9) / 5 + 32;
    const humidity = activeHourWeather.humidity;
    const windSpeed = activeHourWeather.windSpeed;
    const precipitation = activeHourWeather.precipitation;
    const weatherCode = activeHourWeather.weatherCode;
    const weatherState = activeHourWeather.weatherState || 'Normal';

    // Determine 3D atmospheric archetype from precipitation & WMO code
    const isRain =
      precipitation > 0 ||
      (weatherCode >= 51 && weatherCode <= 67) ||
      (weatherCode >= 80 && weatherCode <= 99);
    const isCloudy = !isRain && [2, 3, 45, 48].includes(weatherCode);

    const baseScene = isRain
      ? MOCK_WEATHER_DATA.rainy.scene
      : isCloudy
      ? MOCK_WEATHER_DATA.cloudy.scene
      : MOCK_WEATHER_DATA.sunny.scene;

    const dewPointC = Number((tempC - (100 - humidity) / 5).toFixed(1));

    const solarIrradiance = isRain
      ? Math.max(30, Math.round(95 - precipitation * 4))
      : isCloudy
      ? weatherCode === 3
        ? 220
        : 360
      : 840;

    // Soil moisture statuses derived dynamically from configured crops & growth stages
    const dryThresh = cropThresholds?.dryThreshold ?? 35;
    const targetMoist = cropThresholds?.targetMoisture ?? 60;
    const isLowMoisture = currentSoilMoisture < dryThresh;
    const isHighMoisture = currentSoilMoisture > targetMoist + 5;

    // Crop Health Index derived from moisture stress curve relative to crop thresholds
    let cropHealthScore;
    if (currentSoilMoisture >= dryThresh && currentSoilMoisture <= targetMoist + 10) {
      const mid = (dryThresh + targetMoist) / 2;
      const span = Math.max(5, (targetMoist - dryThresh) / 2);
      cropHealthScore = Math.round(95 + (1 - Math.min(1, Math.abs(currentSoilMoisture - mid) / span)) * 4);
    } else if (currentSoilMoisture < dryThresh) {
      cropHealthScore = Math.max(35, Math.round(95 - (dryThresh - currentSoilMoisture) * 2.4));
    } else {
      cropHealthScore = Math.max(70, Math.round(95 - (currentSoilMoisture - (targetMoist + 10)) * 1.1));
    }

    const cropHealthStatus =
      cropHealthScore >= 90
        ? 'Vigorous Vegetative Growth'
        : cropHealthScore >= 75
        ? 'Moderate Canopy Vigor'
        : 'Water Deficit Stress';

    const cropHealthColor =
      cropHealthScore >= 90 ? '#B8D6A0' : cropHealthScore >= 75 ? '#E0A94F' : '#D96B5B';

    // Evapotranspiration calculation: (temp * 0.15 + wind * 0.05) * ((100 - humidity)/100)
    const etRate = Number(
      Math.max(0.3, (tempC * 0.15 + windSpeed * 0.05) * ((100 - humidity) / 100)).toFixed(1)
    );

    // Irrigation status mapping from engine result
    const engineDecision = comparisonResult?.forecastAware?.decision;
    const irrigationAction =
      engineDecision === 'DEFER'
        ? 'SUPPRESSED'
        : engineDecision === 'REDUCE'
        ? 'SCHEDULED'
        : engineDecision === 'IRRIGATE'
        ? 'SCHEDULED'
        : 'STANDBY';

    const irrigationActionColor =
      irrigationAction === 'SUPPRESSED'
        ? '#D96B5B'
        : irrigationAction === 'SCHEDULED'
        ? '#89C2D9'
        : '#456B50';

    const irrigationRecommendation =
      comparisonResult?.forecastAware?.reason ||
      (isRain
        ? 'Automated irrigation suppressed: Natural precipitation replenishes root zone.'
        : isLowMoisture
        ? 'Schedule micro-drip pulse: Root zone is approaching depletion threshold.'
        : 'Soil moisture adequate: Irrigation on standby to conserve water.');

    // Litres conserved over configured farm parcel area: litres = mm × farmAreaSqm
    const waterSavedMm = comparisonResult?.comparison?.waterSavedMm || 0;
    const waterPreservedTodayGal = Math.round(waterSavedMm * farmAreaSqm * 0.264172);

    return {
      id: isRain ? 'rainy' : isCloudy ? 'cloudy' : 'sunny',
      name: weatherState,
      tagline:
        selectedScenario === 'live'
          ? `Open-Meteo Live API • WMO Code ${weatherCode ?? 'N/A'}`
          : `What-If Scenario: ${selectedScenario}`,
      condition: weatherState,
      tempC,
      tempF,
      humidity,
      windSpeedKmH: windSpeed,
      windDirection: 'NW',
      precipitationRateMmH: precipitation,
      solarIrradianceWm2: solarIrradiance,
      uvIndex: isRain ? 1 : isCloudy ? 3 : 7,
      uvRating: isRain ? 'Low' : isCloudy ? 'Moderate' : 'High',
      atmosphericPressureHpa: 1013,
      dewPointC,
      dataMode: selectedScenario === 'live' ? 'live' : 'what-if',
      source: selectedScenario === 'live' ? 'Open-Meteo' : 'What-If Simulation',
      updatedAt: activeSimTimestamp,

      // Deterministic simulation estimates based on live model equations
      simulation: {
        soilMoisturePercent: Math.round(currentSoilMoisture),
        soilMoistureStatus: isLowMoisture
          ? 'Drying (Depletion Phase)'
          : isHighMoisture
          ? 'Saturated (High Moisture)'
          : 'Optimal Moisture Range',
        soilMoistureColor: isLowMoisture ? '#E0A94F' : isHighMoisture ? '#89C2D9' : '#B8D6A0',
        cropHealthScore,
        cropHealthStatus,
        cropHealthColor,
        soilTemperatureC: Number((tempC * 0.85).toFixed(1)),
        evapotranspirationRateMmDay: etRate,
        irrigationAction,
        irrigationActionColor,
        irrigationRecommendation,
        waterPreservedTodayGal,
        activeZones: `${farmConfig.plots.length} / 4 Furrows Cultivated`,
        isSimulatedModel: true,
      },

      // 3D Scene config with dynamic wind speed and soil wetness derived from soil moisture
      scene: {
        ...baseScene,
        soilWetness: Math.min(0.95, Math.max(0.08, currentSoilMoisture / 100)),
        cloudCount: isRain ? 12 : isCloudy ? 9 : 4,
      },
    };
  }, [
    simStepHours,
    getTimelineWeather,
    currentSoilMoisture,
    comparisonResult,
    selectedScenario,
    activeSimTimestamp,
    farmAreaSqm,
    farmConfig,
    cropThresholds,
  ]);

  // -------------------------------------------------------------
  // Transition Handlers (Polished, Non-Abrupt, Double-Click Safe)
  // -------------------------------------------------------------
  const handleEnterFarm = useCallback(() => {
    if (transitionPhase !== 'idle') return;

    setTransitionPhase('exiting-landing');
    setTimeout(() => {
      setCurrentView('farm');
      setTransitionPhase('entering-farm');
      setTimeout(() => {
        setTransitionPhase('idle');
      }, 350);
    }, 350);
  }, [transitionPhase]);

  const handleBackToLanding = useCallback(() => {
    if (transitionPhase !== 'idle') return;

    setTransitionPhase('exiting-farm');
    setTimeout(() => {
      setCurrentView('landing');
      setTransitionPhase('entering-landing');
      setTimeout(() => {
        setTransitionPhase('idle');
      }, 350);
    }, 350);
  }, [transitionPhase]);

  // Manual irrigation test pulse
  const handleManualIrrigation = useCallback(() => {
    if (manualIrrigationTriggered) return;
    setManualIrrigationTriggered(true);
    setTimeout(() => {
      setManualIrrigationTriggered(false);
    }, 4500);
  }, [manualIrrigationTriggered]);

  // Native fullscreen toggle helper
  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      farmViewportRef.current
        ?.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => console.warn('Fullscreen request failed:', err));
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch((err) => console.warn('Exit fullscreen failed:', err));
    }
  }, []);

  return (
    <div className={`terrapulse-app transition-${transitionPhase}`}>
      {/* ------------------------------------------------------------------
          VIEW 1: Premium Overview Landing Page
          ------------------------------------------------------------------ */}
      {currentView === 'landing' && (
        <LandingPage
          onEnterFarm={handleEnterFarm}
          location={selectedLocation}
          selectedLocation={selectedLocation}
          weatherData={weatherData}
          onOpenLocationSearch={() => setIsLocationSearchOpen(true)}
        />
      )}

      {/* ------------------------------------------------------------------
          VIEW 2: Agricultural Digital Twin Dashboard
          ------------------------------------------------------------------ */}
      {currentView === 'farm' && (
        <div className={`farm-view-wrapper ${isFullscreen ? 'fullscreen-mode' : ''}`} ref={farmViewportRef}>
          {/* 1. Compact Top Bar Header with Navigation, Location, & Farm Settings */}
          <DashboardHeader
            location={selectedLocation}
            onBackToLanding={handleBackToLanding}
            isLeftPanelOpen={isLeftPanelOpen}
            onToggleLeftPanel={() => setIsLeftPanelOpen((prev) => !prev)}
            onOpenLocationSearch={() => setIsLocationSearchOpen(true)}
            weatherData={weatherData}
            farmConfig={farmConfig}
            onOpenFarmConfig={() => setIsFarmConfigOpen(true)}
            selectedScenario={selectedScenario}
            onSelectScenario={(scenId) => {
              setSelectedScenario(scenId);
              setSimStepHours(0);
              if (scenId === 'live') {
                setWeatherMode('live');
                loadLiveWeatherData(selectedLocation.latitude, selectedLocation.longitude);
              } else {
                setWeatherMode(scenId === 'heavy-rain' ? 'rainy' : scenId);
                setActiveSecondaryTab('scenarios');
              }
            }}
          />

          {/* Four Concise Primary Metric Cards: Temperature, Rainfall, Soil Moisture, Crop Health */}
          <div className="cockpit-summary-metrics" aria-label="Key Field Telemetry Overview">
            <div className="metric-pill-card">
              <div className="metric-pill-header">
                <span className="metric-pill-label">Temperature</span>
                <Thermometer size={14} className="metric-pill-icon text-amber" />
              </div>
              <div className="metric-pill-main">
                <span className="metric-pill-val">
                  {weatherData?.tempC !== null && weatherData?.tempC !== undefined
                    ? `${weatherData.tempC.toFixed(1)}°C`
                    : '--'}
                </span>
                <span className="metric-pill-sub">
                  {weatherData?.tempF !== null && weatherData?.tempF !== undefined
                    ? `${weatherData.tempF.toFixed(1)}°F`
                    : ''}
                </span>
              </div>
              <div className="metric-pill-badge">
                <span className="badge-dot-live"></span>
                <span>{weatherData?.condition || 'Live Sync'}</span>
              </div>
            </div>

            <div className="metric-pill-card">
              <div className="metric-pill-header">
                <span className="metric-pill-label">Rainfall</span>
                <CloudRain size={14} className="metric-pill-icon text-sky" />
              </div>
              <div className="metric-pill-main">
                <span className="metric-pill-val">
                  {weatherData?.precipitationRateMmH !== undefined
                    ? `${weatherData.precipitationRateMmH.toFixed(1)} mm/h`
                    : '0.0 mm/h'}
                </span>
                <span className="metric-pill-sub">Precipitation</span>
              </div>
              <div className="metric-pill-badge">
                <span>{comparisonResult?.comparison?.isRainInsideWindow ? 'Rain in 6h Window' : 'Dry 6h Window'}</span>
              </div>
            </div>

            <div className="metric-pill-card">
              <div className="metric-pill-header">
                <span className="metric-pill-label">Soil Moisture</span>
                <Droplets size={14} className="metric-pill-icon text-lime" />
              </div>
              <div className="metric-pill-main">
                <span className="metric-pill-val text-lime">
                  {typeof currentSoilMoisture === 'number'
                    ? currentSoilMoisture.toFixed(2)
                    : 'N/A'}%
                </span>
                <span className="metric-pill-sub">Simulated moisture</span>
              </div>
              <div className="metric-pill-badge">
                <span>{weatherData?.simulation?.soilMoistureStatus || 'Optimal Range'}</span>
              </div>
            </div>

            <div className="metric-pill-card">
              <div className="metric-pill-header">
                <span className="metric-pill-label">Crop Health</span>
                <Sprout size={14} className="metric-pill-icon text-lime" />
              </div>
              <div className="metric-pill-main">
                <span className="metric-pill-val text-lime">
                  {weatherData?.simulation?.cropHealthScore ?? 95}%
                </span>
                <span className="metric-pill-sub">Canopy Index</span>
              </div>
              <div className="metric-pill-badge">
                <span>{weatherData?.simulation?.cropHealthStatus || 'Vigorous Growth'}</span>
              </div>
            </div>
          </div>

          {/* 2, 3, 4, 5. Main 3D Cockpit Workspace (Slim Left Panel, Wide 3D Viewport, Right Contextual Inspector) */}
          <div className="farm-cockpit-workspace">
            {/* 3. Slim Collapsible Left Panel for Current Weather & Furrow Controls */}
            <aside
              className={`farm-left-panel ${isLeftPanelOpen ? 'open' : 'collapsed'}`}
              aria-label="Current Weather & Farm Furrows"
            >
              {/* Compact Current Weather Panel */}
              <div className="left-panel-weather-card">
                <div className="weather-card-top-row">
                  <button
                    type="button"
                    className="weather-card-location"
                    onClick={() => setIsLocationSearchOpen(true)}
                    title="Click to search or change location"
                  >
                    <MapPin size={13} className="text-muted-sage" />
                    <span className="weather-loc-label">{selectedLocation.name}</span>
                  </button>
                  <span className="weather-live-chip">Live Sync</span>
                </div>

                <div className="weather-card-main-row">
                  <div className="weather-icon-badge">
                    {weatherData.id === 'sunny' ? (
                      <Sun size={28} className="text-amber" />
                    ) : weatherData.id === 'rainy' ? (
                      <CloudRain size={28} className="text-sky" />
                    ) : (
                      <Cloud size={28} className="text-muted-sage" />
                    )}
                  </div>
                  <div className="weather-temp-info">
                    <div className="weather-temp-value">
                      <span className="temp-num">
                        {weatherData.tempC !== null && weatherData.tempC !== undefined
                          ? weatherData.tempC.toFixed(1)
                          : '--'}
                      </span>
                      <span className="temp-deg">°C</span>
                      <span className="temp-sub">
                        ({weatherData.tempF !== null && weatherData.tempF !== undefined
                          ? `${weatherData.tempF.toFixed(0)}°F`
                          : '--'})
                      </span>
                    </div>
                    <span className="weather-cond-text">{weatherData.condition || 'Clear Sky'}</span>
                  </div>
                </div>

                <div className="weather-card-details-grid">
                  <div className="weather-detail-item">
                    <span className="detail-label">
                      <CloudRain size={11} /> Rainfall
                    </span>
                    <span className="detail-val">
                      {weatherData.precipitationRateMmH !== undefined
                        ? `${weatherData.precipitationRateMmH.toFixed(1)} mm/h`
                        : '0.0 mm/h'}
                    </span>
                  </div>
                  <div className="weather-detail-item">
                    <span className="detail-label">
                      <Wind size={11} /> Wind
                    </span>
                    <span className="detail-val">
                      {weatherData.windSpeedKmH !== undefined
                        ? `${weatherData.windSpeedKmH.toFixed(1)} km/h`
                        : '10 km/h'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="left-panel-header">
                <div className="left-panel-title-wrap">
                  <Sprout size={16} className="text-forest" />
                  <h2 className="left-panel-title">Cultivated Furrows</h2>
                </div>
                <button
                  type="button"
                  className="left-panel-close-btn"
                  onClick={() => setIsLeftPanelOpen(false)}
                  title="Collapse side panel"
                  aria-label="Collapse side panel"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>

              <div className="left-panel-furrows-list">
                {['row-1', 'row-2', 'row-3', 'row-4'].map((rowId, idx) => {
                  const plot = farmConfig.plots?.find((p) => p.rowId === rowId);
                  const crop = plot && SUPPORTED_CROPS[plot.cropType];
                  const stage = plot && GROWTH_STAGES[plot.growthStage];
                  const isSelected = selectedRowId === rowId;

                  return (
                    <button
                      key={rowId}
                      type="button"
                      className={`furrow-card-item ${isSelected ? 'selected' : ''} ${plot ? 'active-crop' : 'fallow'}`}
                      onClick={() => setSelectedRowId(isSelected ? null : rowId)}
                      aria-pressed={isSelected}
                    >
                      <div className="furrow-card-top">
                        <span className="furrow-tag">Furrow 0{idx + 1}</span>
                        <span className="furrow-zone-tag">Zone 0{idx + 1}</span>
                      </div>
                      <div className="furrow-card-main">
                        <span className="furrow-crop-name">{plot?.name || 'Fallow Soil Berm'}</span>
                        <span className="furrow-crop-stage">
                          {plot ? `${stage?.label || 'Active'} • ${crop?.category || 'Crop'}` : 'Unplanted / Conservation'}
                        </span>
                      </div>
                      <div className="furrow-card-footer">
                        <span className="furrow-soil-hint">
                          {plot ? `Target: ${crop?.baseWaterNeedMmDay || 3.5} mm/d` : 'Moisture Retention'}
                        </span>
                        <span className={`furrow-status-dot ${plot ? 'active' : 'idle'}`}></span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Quick Farm Actions at bottom of Left Panel */}
              <div className="left-panel-actions">
                <button
                  type="button"
                  className="btn-left-panel-add-crop"
                  onClick={() => setIsAddCropOpen(true)}
                  title="Add or assign crop to farm furrows"
                >
                  <Plus size={14} />
                  <span>+ Add Crop</span>
                </button>

                <button
                  type="button"
                  className={`btn-drip-pulse ${manualIrrigationTriggered ? 'irrigating' : ''}`}
                  onClick={handleManualIrrigation}
                  disabled={manualIrrigationTriggered || weatherData.id === 'rainy'}
                  title={
                    weatherData.id === 'rainy'
                      ? 'Automated Lock: Rain override suppresses irrigation'
                      : 'Pulse test micro-drip solenoid valves across all cultivated zones'
                  }
                >
                  <Droplet size={14} />
                  <span>
                    {manualIrrigationTriggered
                      ? 'Valves Pulsing...'
                      : weatherData.id === 'rainy'
                      ? 'Rain Active'
                      : 'Test Valve Pulse'}
                  </span>
                </button>

                <button
                  type="button"
                  className="btn-configure-crops"
                  onClick={() => setIsFarmConfigOpen(true)}
                  title="Configure Farm Parcel & Crop Management"
                >
                  <SlidersHorizontal size={14} />
                  <span>Farm Settings</span>
                </button>
              </div>
            </aside>

            {/* Reopen Left Panel Button if collapsed */}
            {!isLeftPanelOpen && (
              <button
                type="button"
                className="btn-reopen-left-panel"
                onClick={() => setIsLeftPanelOpen(true)}
                title="Expand Cultivated Furrows Panel"
                aria-label="Expand Furrows Panel"
              >
                <ChevronRight size={16} />
                <span>Furrows</span>
              </button>
            )}

            {/* 2. Wide, Landscape-Oriented 3D Virtual Farm Viewport */}
            <main className="farm-viewport-main">
              {/* Farm Workspace Toolbar: Prominent Actions & Crop Context */}
              <div className="farm-workspace-toolbar">
                <div className="farm-toolbar-left">
                  <div className="farm-parcel-title-cluster">
                    <span className="farm-parcel-label">PARCEL WORKSPACE</span>
                    <h2 className="farm-parcel-title">{farmConfig.name || 'TerraPulse Digital Twin Farm'}</h2>
                  </div>
                  <span className="farm-parcel-sub">
                    {farmConfig.areaHectares} ha • {farmConfig.soilType ? farmConfig.soilType.split(' ')[0] : 'Loam'} Soil • {farmConfig.plots.length}/4 Furrows Planted
                  </span>
                  {selectedRowId && (
                    <div className="toolbar-furrow-chip">
                      <span className="toolbar-furrow-dot"></span>
                      <span className="toolbar-furrow-text">
                        {selectedPlotInfo ? `${selectedPlotInfo.plot.name} (${selectedPlotInfo.crop?.shortName || selectedPlotInfo.crop?.name})` : `Furrow 0${selectedRowId.replace('row-', '')} (Fallow)`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="farm-toolbar-actions">
                  <button
                    type="button"
                    className="btn-toolbar-add-crop"
                    onClick={() => setIsAddCropOpen(true)}
                    title="Add a crop or assign to furrow"
                  >
                    <Plus size={15} />
                    <span>+ Add Crop</span>
                  </button>

                  <button
                    type="button"
                    className="btn-toolbar-settings"
                    onClick={() => setIsFarmConfigOpen(true)}
                    title="Configure farm area, soil type, and plots"
                  >
                    <SlidersHorizontal size={14} />
                    <span>Farm Settings</span>
                  </button>

                  <button
                    type="button"
                    className={`btn-toolbar-drip ${manualIrrigationTriggered ? 'irrigating' : ''}`}
                    onClick={handleManualIrrigation}
                    disabled={manualIrrigationTriggered || weatherData.id === 'rainy'}
                    title={
                      weatherData.id === 'rainy'
                        ? 'Automated Lock: Rain override suppresses irrigation'
                        : 'Pulse test micro-drip solenoid valves across all cultivated zones'
                    }
                  >
                    <Droplet size={14} />
                    <span>{manualIrrigationTriggered ? 'Valves Pulsing...' : 'Test Drip Pulse'}</span>
                  </button>
                </div>
              </div>

              <div className="farm-canvas-card">
                <FarmCanvas
                  weatherData={weatherData}
                  selectedRowId={selectedRowId}
                  onSelectRow={setSelectedRowId}
                  isIrrigating={manualIrrigationTriggered}
                  isFullscreen={isFullscreen}
                  onToggleFullscreen={handleToggleFullscreen}
                  farmConfig={farmConfig}
                  onOpenFarmConfig={() => setIsFarmConfigOpen(true)}
                />

                {/* 5. One Consolidated Bottom Simulation Control Bar */}
                <div className="farm-bottom-controls-bar">
                  <SimulationControls
                    isPlaying={isPlaying}
                    onTogglePlay={() => setIsPlaying((p) => !p)}
                    simSpeed={simSpeed}
                    onChangeSpeed={(s) => setSimSpeed(s)}
                    simStepHours={simStepHours}
                    maxHours={24}
                    onSeek={(h) => setSimStepHours(h)}
                    onStepForward={() => setSimStepHours((h) => Math.min(24, h + 1))}
                    onReset={() => {
                      setIsPlaying(false);
                      setSimStepHours(0);
                    }}
                    currentSimDate={activeSimTimestamp}
                    isForecastAvailable={
                      selectedScenario === 'live' ? simStepHours < hourlyForecast.length : true
                    }
                  />
                </div>
              </div>
            </main>

            {/* 4. Compact Contextual Inspector on the Right (Visible when a plot is selected) */}
            {selectedRowId && (
              <aside className="farm-right-inspector" role="dialog" aria-label="Selected Crop Furrow Inspector">
                <div className="inspector-panel-header">
                  <div className="inspector-title-cluster">
                    <span className="inspector-badge">INSPECTION</span>
                    <h3 className="inspector-title">
                      {selectedPlotInfo ? selectedPlotInfo.plot.name : `Furrow 0${selectedRowId.replace('row-', '')}`}
                    </h3>
                  </div>
                  <button
                    type="button"
                    className="inspector-close-btn"
                    onClick={() => setSelectedRowId(null)}
                    title="Close plot inspector"
                    aria-label="Close plot inspector"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="inspector-panel-body">
                  <div className="inspector-metric-row">
                    <span className="inspector-label">Crop & Variety</span>
                    <span className="inspector-val text-lime">
                      {selectedPlotInfo ? selectedPlotInfo.crop?.name : 'Fallow Soil Berm'}
                    </span>
                  </div>

                  <div className="inspector-metric-row">
                    <span className="inspector-label">Growth Stage</span>
                    <span className="inspector-val">
                      {selectedPlotInfo?.stage?.label || 'Standby'}
                    </span>
                  </div>

                  <div className="inspector-metric-row">
                    <span className="inspector-label">Canopy Health Score</span>
                    <span className="inspector-val text-emerald font-semibold">
                      {weatherData.simulation?.cropHealthScore || 95}% ({weatherData.simulation?.cropHealthStatus || 'Active Growth'})
                    </span>
                  </div>

                  <div className="inspector-metric-row">
                    <span className="inspector-label">Hydration Target</span>
                    <span className="inspector-val text-sky">
                      {selectedPlotInfo ? `${selectedPlotInfo.crop?.baseWaterNeedMmDay || 3.5} mm/day` : 'Conservation'}
                    </span>
                  </div>

                  <div className="inspector-metric-row">
                    <span className="inspector-label">Assigned Manifold</span>
                    <span className="inspector-val">Zone 0{selectedRowId.replace('row-', '')}</span>
                  </div>

                  <div className="inspector-metric-row">
                    <span className="inspector-label">Planting Date</span>
                    <span className="inspector-val">
                      {selectedPlotInfo?.plot?.plantingDate || 'Active Planting'}
                    </span>
                  </div>
                </div>

                <div className="inspector-panel-footer">
                  <button
                    type="button"
                    className="btn-inspector-edit"
                    onClick={() => setIsFarmConfigOpen(true)}
                  >
                    <SlidersHorizontal size={13} />
                    <span>Configure in Settings</span>
                  </button>
                </div>
              </aside>
            )}
          </div>

          {/* 6. Secondary Intelligence in Clean Tabbed Architecture (Warm Ivory + Deep Pine) */}
          <section className="farm-intelligence-section" aria-label="Agronomic Intelligence & Irrigation Strategy">
            <div className="intelligence-section-header">
              <div className="section-header-left">
                <h2 className="intelligence-title">Agronomic Insights & Environmental Strategy</h2>
                <p className="intelligence-sub">
                  Explore comparative irrigation metrics, meteorological forecasts, and what-if simulation models.
                </p>
              </div>

              {/* Clean Secondary Navigation Tabs */}
              <div className="intelligence-tabs-nav" role="tablist" aria-label="Secondary Intelligence Views">
                <button
                  type="button"
                  role="tab"
                  className={`intel-tab-btn ${activeSecondaryTab === 'irrigation' ? 'active' : ''}`}
                  onClick={() => setActiveSecondaryTab('irrigation')}
                  aria-selected={activeSecondaryTab === 'irrigation'}
                >
                  <Droplets size={14} />
                  <span>Irrigation Comparison</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`intel-tab-btn ${activeSecondaryTab === 'weather' ? 'active' : ''}`}
                  onClick={() => setActiveSecondaryTab('weather')}
                  aria-selected={activeSecondaryTab === 'weather'}
                >
                  <CloudRain size={14} />
                  <span>Weather & Forecast</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`intel-tab-btn ${activeSecondaryTab === 'scenarios' ? 'active' : ''}`}
                  onClick={() => setActiveSecondaryTab('scenarios')}
                  aria-selected={activeSecondaryTab === 'scenarios'}
                >
                  <Sprout size={14} />
                  <span>What-If Scenarios</span>
                </button>
              </div>
            </div>

            {/* Genuine Water Savings Milestone Notification */}
            {comparisonResult?.comparison?.waterSavedMm > 0 && (
              <div className="milestone-water-saved-strip" role="status">
                <span className="milestone-badge-icon">💧</span>
                <span className="milestone-badge-text">
                  <strong>Predictive Water Conservation:</strong> Deferring irrigation ahead of natural rain will conserve ~{Math.round(comparisonResult.comparison.waterSavedMm * farmAreaSqm)} Litres on this parcel today.
                </span>
              </div>
            )}

            <div className="intelligence-tab-content">
              {activeSecondaryTab === 'irrigation' && (
                <div className="intel-panel-grid single-col">
                  <ComparisonPanel
                    comparisonResult={comparisonResult}
                    scenarioLabel={
                      selectedScenario === 'live'
                        ? 'Live Open-Meteo Forecast (Next 6h Window)'
                        : `What-If: ${
                            selectedScenario === 'sunny'
                              ? 'Sunny Day (0 mm rain)'
                              : selectedScenario === 'rainy'
                              ? 'Rain Expected (8 mm rain)'
                              : 'Heavy Rain (24 mm rain)'
                          }`
                    }
                    farmAreaSqm={farmAreaSqm}
                  />
                  <FarmStatus simulation={weatherData.simulation} />
                </div>
              )}

              {activeSecondaryTab === 'weather' && (
                <div className="intel-panel-grid single-col">
                  <WeatherMetrics weatherData={weatherData} location={selectedLocation} />
                  <WeatherSelector
                    currentWeather={weatherMode}
                    onSelectWeather={(mode) => {
                      setWeatherMode(mode);
                      if (mode === 'live') {
                        setSelectedScenario('live');
                      } else if (mode === 'sunny' || mode === 'cloudy') {
                        setSelectedScenario('sunny');
                      } else if (mode === 'rainy') {
                        setSelectedScenario('rainy');
                      }
                    }}
                    liveWeather={liveWeather}
                    hourlyForecast={hourlyForecast}
                    isWeatherLoading={isWeatherLoading}
                    weatherError={weatherError}
                    onRetryWeather={() =>
                      loadLiveWeatherData(selectedLocation.latitude, selectedLocation.longitude)
                    }
                    location={selectedLocation}
                  />
                </div>
              )}

              {activeSecondaryTab === 'scenarios' && (
                <div className="intel-panel-grid single-col">
                  <ScenarioSelector
                    selectedScenario={selectedScenario}
                    onScenarioChange={(scenId) => {
                      setSelectedScenario(scenId);
                      setSimStepHours(0);
                    }}
                  />
                </div>
              )}
            </div>
          </section>

          {/* Clean Agricultural Product Footer */}
          <footer className="farm-view-footer">
            <div className="footer-left">
              <span className="footer-brand-text">TerraPulse Agriculture</span>
              <span className="footer-dot">•</span>
              <span className="footer-tagline-text">
                “Grow with the land. Think ahead of the weather.”
              </span>
            </div>
            <div className="footer-right-info">
              <span className="footer-info-pill">Open-Meteo Live API</span>
              <span className="footer-info-pill">FAO-56 Soil Physics</span>
              <span className="footer-info-pill">Forecast-Aware Irrigation</span>
            </div>
          </footer>
        </div>
      )}

      {/* Worldwide Location Search Modal */}
      <LocationSearchModal
        isOpen={isLocationSearchOpen}
        onClose={() => setIsLocationSearchOpen(false)}
        onSelectLocation={(newLocation) => {
          setSelectedLocation(newLocation);
          setSelectedScenario('live');
          setWeatherMode('live');
          setSimStepHours(0);
        }}
        currentLocation={selectedLocation}
      />

      {/* Farm Configuration & Crop Management Modal */}
      {isFarmConfigOpen && (
        <FarmConfigModal
          isOpen={isFarmConfigOpen}
          onClose={() => setIsFarmConfigOpen(false)}
          farmConfig={farmConfig}
          onSaveConfig={(newConfig) => setFarmConfig(newConfig)}
        />
      )}

      {/* Add Crop / Plant Crop Selection Dialog */}
      {isAddCropOpen && (
        <AddCropModal
          isOpen={isAddCropOpen}
          onClose={() => setIsAddCropOpen(false)}
          farmConfig={farmConfig}
          onSaveConfig={(newConfig) => setFarmConfig(newConfig)}
          selectedRowId={selectedRowId}
        />
      )}
    </div>
  );
}

export default App;
