import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { MOCK_WEATHER_DATA } from './data/mockWeather';
import { fetchCurrentWeather, degreesToCompass } from './services/weatherService';
import { fetchHourlyForecast } from './services/forecastService';
import { fetchSoilMoisture } from './services/soilMoistureService';
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
import {
  Droplet,
  SlidersHorizontal,
  Sprout,
  ChevronLeft,
  ChevronRight,
  X,
  Thermometer,
  CloudRain,
  Droplets,
  Plus,
  Sun,
  Cloud,
  Wind,
  MapPin,
  Maximize2,
  Minimize2,
  Camera,
  Home,
  Compass,
  RotateCcw,
} from 'lucide-react';
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

// Simulation baseline soil moisture percentage
const BASELINE_SOIL_MOISTURE = 34.0;


export function App() {
  // Navigation View State: 'landing' or 'farm'
  const [currentView, setCurrentView] = useState('landing');
  const [transitionPhase, setTransitionPhase] = useState('idle');

  // Selected Location (Defaults to Willamette Valley, updated via LocationSearchModal)
  const [selectedLocation, setSelectedLocation] = useState(DEFAULT_LOCATION);
  const [isLocationSearchOpen, setIsLocationSearchOpen] = useState(false);

  // Live Open-Meteo Weather State
  const [liveWeather, setLiveWeather] = useState(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);

  // Live Open-Meteo 72-Hour Hourly Forecast State
  const [hourlyForecast, setHourlyForecast] = useState([]);
  const [liveSoilMoisture, setLiveSoilMoisture] = useState([]);

  // Weather Mode: 'live' (Open-Meteo) or 'sunny', 'cloudy', 'rainy' (What-if presets)
  const [weatherMode, setWeatherMode] = useState('live');
  const [selectedScenario, setSelectedScenario] = useState('live');

  // Farm parcel and crop configuration
  const [farmConfig, setFarmConfig] = useState(DEFAULT_FARM_CONFIG);
  const [isFarmConfigOpen, setIsFarmConfigOpen] = useState(false);
  const [isAddCropOpen, setIsAddCropOpen] = useState(false);

  // Simulation Timeline State (0 to 24 hours into the future)
  const [isPlaying, setIsPlaying] = useState(false);
  const [simStepHours, setSimStepHours] = useState(0); // 0 to 24h
  const [simSpeed, setSimSpeed] = useState(1); // 1, 2, 5

  // Farm Viewport & Immersive Controls
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [manualIrrigationTriggered, setManualIrrigationTriggered] = useState(false);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeSecondaryTab, setActiveSecondaryTab] = useState('irrigation');
  const [cameraPreset, setCameraPreset] = useState('overview');

  const farmViewportRef = useRef(null);

  // Keyboard shortcuts: 'Escape' to exit fullscreen / deselect row, 'F' to toggle fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
        } else {
          setSelectedRowId(null);
        }
      } else if (e.key === 'f' || e.key === 'F') {
        setIsFullscreen((prev) => {
          const next = !prev;
          if (!next && document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Synchronize state when user exits or enters fullscreen via browser native controls
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNative = Boolean(document.fullscreenElement);
      if (!isNative && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isFullscreen]);

  // Notify R3F / Three.js Canvas to recalculate viewport bounding rect and projection matrix
  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });
    return () => cancelAnimationFrame(rafId);
  }, [isFullscreen]);

  // Derived farm area in square metres (for depth-to-volume conversions: litres = mm × areaSqm)
  const farmAreaSqm = useMemo(
    () => convertAreaToSqm(farmConfig.areaValue, farmConfig.areaUnit),
    [farmConfig.areaValue, farmConfig.areaUnit]
  );

  // Selected plot information lookup for dashboard inspector
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

  // Derived crop-specific irrigation threshold adjustments
  const cropThresholds = useMemo(
    () => deriveCropIrrigationThresholds(farmConfig.plots),
    [farmConfig.plots]
  );

  // Load Live Open-Meteo Weather & Forecast for Current Coordinates
  const loadLiveWeatherData = useCallback(async (lat, lon) => {
    setIsWeatherLoading(true);
    setWeatherError(null);

    try {
      const [currentData, forecastData] = await Promise.all([
        fetchCurrentWeather(lat, lon),
        fetchHourlyForecast(lat, lon, 3),
      ]);

      setLiveWeather(currentData);
      setHourlyForecast(forecastData);

      // Soil moisture is independent: its failure must not block weather data.
      try {
        const soilMoisture = await fetchSoilMoisture(lat, lon);
        setLiveSoilMoisture(soilMoisture);
        console.info('GEM soil-moisture estimates loaded:', soilMoisture.length);
      } catch (soilError) {
        console.error('Failed to fetch GEM soil-moisture estimates:', soilError);
        setLiveSoilMoisture([]);
      }
    } catch (err) {
      console.warn('Weather service failure; preserving current telemetry:', err.message);
      setWeatherError(err.message || 'Unable to connect to live Open-Meteo telemetry');
      // Preserve existing live weather state if available rather than clearing to clear-sky
      setLiveWeather((prev) => prev || {
        temperature: 22.4,
        humidity: 48,
        windSpeed: 11.2,
        windDirection: 'NW',
        precipitation: null,
        weatherCode: 1,
        weatherState: 'Mainly clear',
        solarIrradianceWm2: 650,
        uvIndex: 5,
        atmosphericPressureHpa: 1013,
        updatedAt: null,
      });
    } finally {
      setIsWeatherLoading(false);
    }
  }, []);

  // Fetch weather on initial mount or when location coordinates change
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        loadLiveWeatherData(selectedLocation.latitude, selectedLocation.longitude);
      }
    });
    return () => {
      active = false;
    };
  }, [selectedLocation.latitude, selectedLocation.longitude, loadLiveWeatherData]);

  // Periodic background refresh for live weather (every 60s for continuous sync)
  useEffect(() => {
    if (selectedScenario !== 'live') return;
    const refreshTimer = setInterval(() => {
      loadLiveWeatherData(selectedLocation.latitude, selectedLocation.longitude);
    }, 60000);
    return () => clearInterval(refreshTimer);
  }, [selectedScenario, selectedLocation.latitude, selectedLocation.longitude, loadLiveWeatherData]);

  // Simulation Playback Timer Loop (Advances hours with speed multiplier)
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = Math.max(300, 1600 / simSpeed);
    const timer = setInterval(() => {
      setSimStepHours((prev) => {
        if (prev >= 24) {
          setIsPlaying(false);
          return 24;
        }
        return prev + 1;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, simSpeed]);

  // Find index in hourlyForecast corresponding to current time / live update baseDate
  const currentForecastBaseIndex = useMemo(() => {
    if (!hourlyForecast || hourlyForecast.length === 0 || !liveWeather?.updatedAt) return 0;
    const baseTime = new Date(liveWeather.updatedAt).getTime();
    let bestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < hourlyForecast.length; i++) {
      if (!hourlyForecast[i]?.timestamp) continue;
      const itemTime = new Date(hourlyForecast[i].timestamp).getTime();
      const diff = Math.abs(itemTime - baseTime);
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = i;
      }
    }
    return bestIdx;
  }, [hourlyForecast, liveWeather]);

  // Resolve hourly weather sequence for simulation timeline
  const getTimelineWeather = useCallback(
    (hourOffset) => {
      if (selectedScenario === 'sunny') {
        return {
          tempC: 26.5 + Math.sin(hourOffset * 0.26) * 4,
          humidity: 38,
          windSpeed: 8.5,
          windDirection: 315, // NW
          pressure: 1018.0,
          solarRadiation: 840.0,
          soilTemperature: 22.0,
          precipitation: 0.0,
          weatherCode: 0,
          weatherState: 'Clear sky',
        };
      }
      if (selectedScenario === 'cloudy') {
        return {
          tempC: 19.4 + Math.sin(hourOffset * 0.26) * 1.5,
          humidity: 64,
          windSpeed: 12.0,
          windDirection: 300,
          pressure: 1014.0,
          solarRadiation: 220.0,
          soilTemperature: 18.0,
          precipitation: 0.0,
          weatherCode: 3,
          weatherState: 'Overcast',
        };
      }
      if (selectedScenario === 'rainy') {
        return {
          tempC: 16.0 + Math.sin(hourOffset * 0.26) * 2,
          humidity: 86,
          windSpeed: 14.0,
          windDirection: 225, // SW
          pressure: 1008.0,
          solarRadiation: 95.0,
          soilTemperature: 15.0,
          precipitation: 2.4,
          weatherCode: 63,
          weatherState: 'Moderate rain',
        };
      }
      if (selectedScenario === 'heavy-rain') {
        return {
          tempC: 14.5 + Math.sin(hourOffset * 0.26) * 2,
          humidity: 94,
          windSpeed: 24.0,
          windDirection: 200, // SSW
          pressure: 998.0,
          solarRadiation: 35.0,
          soilTemperature: 14.0,
          precipitation: 5.2,
          weatherCode: 65,
          weatherState: 'Heavy rain',
        };
      }

      // Default: 'live' Open-Meteo telemetry & hourly forecast
      const baseMs = liveWeather?.updatedAt
        ? new Date(liveWeather.updatedAt).getTime()
        : null;
      const targetMs = baseMs !== null ? baseMs + hourOffset * 60 * 60 * 1000 : null;

      if (hourOffset === 0 && liveWeather) {
        return {
          tempC: typeof liveWeather.temperature === 'number' ? liveWeather.temperature : null,
          humidity: typeof liveWeather.humidity === 'number' ? liveWeather.humidity : null,
          windSpeed: typeof liveWeather.windSpeed === 'number' ? liveWeather.windSpeed : null,
          windDirection: liveWeather.windDirection ?? hourlyForecast[0]?.windDirection ?? null,
          pressure: liveWeather.pressure ?? hourlyForecast[0]?.pressure ?? null,
          solarRadiation: liveWeather.solarRadiation ?? hourlyForecast[0]?.solarRadiation ?? null,
          soilTemperature: liveWeather.soilTemperature ?? hourlyForecast[0]?.soilTemperature ?? null,
          precipitation:
            typeof liveWeather.precipitation === 'number' && Number.isFinite(liveWeather.precipitation)
              ? liveWeather.precipitation
              : null,
          weatherCode: liveWeather.weatherCode ?? null,
          weatherState: liveWeather.weatherState || 'Normal',
          timestamp: liveWeather.updatedAt,
        };
      }

      const forecastIdx = currentForecastBaseIndex + hourOffset;
      let item = hourlyForecast && hourlyForecast[forecastIdx];
      if (!item && Array.isArray(hourlyForecast) && targetMs !== null) {
        item = hourlyForecast.find((h) => {
          if (!h?.timestamp) return false;
          const t = new Date(h.timestamp).getTime();
          return !Number.isNaN(t) && Math.abs(t - targetMs) <= 30 * 60 * 1000;
        });
      }

      if (item) {
        return {
          tempC: typeof item.temperature === 'number' ? item.temperature : null,
          humidity: typeof item.humidity === 'number' ? item.humidity : null,
          windSpeed: typeof item.windSpeed === 'number' ? item.windSpeed : null,
          windDirection: item.windDirection ?? null,
          pressure: item.pressure ?? null,
          solarRadiation: item.solarRadiation ?? null,
          soilTemperature: item.soilTemperature ?? null,
          precipitation:
            typeof item.precipitation === 'number' && Number.isFinite(item.precipitation)
              ? item.precipitation
              : null,
          weatherCode: item.weatherCode ?? null,
          weatherState: item.weatherState || 'Normal',
          timestamp: item.timestamp,
        };
      }

      // Beyond available forecast horizon or forecast unavailable:
      // Preserve unknown values as null; never invent zero rainfall.
      return {
        tempC: null,
        humidity: null,
        windSpeed: null,
        windDirection: null,
        pressure: null,
        solarRadiation: null,
        soilTemperature: null,
        precipitation: null,
        weatherCode: null,
        weatherState: selectedScenario === 'live' ? 'Data Unavailable' : 'Mainly clear',
        timestamp: targetMs !== null ? new Date(targetMs).toISOString() : null,
      };
    },
    [selectedScenario, liveWeather, hourlyForecast, currentForecastBaseIndex]
  );

  // Deterministic multi-step soil moisture accumulation over simulation time
  const currentSoilMoisture = useMemo(() => {
    let moisture = BASELINE_SOIL_MOISTURE;
    for (let i = 0; i < simStepHours; i++) {
      const hWeather = getTimelineWeather(i);
      try {
        const res = estimateSoilMoisture(
          moisture,
          hWeather.tempC,
          hWeather.humidity,
          hWeather.windSpeed,
          hWeather.precipitation
        );
        if (typeof res?.soilMoisture === 'number' && Number.isFinite(res.soilMoisture)) {
          moisture = res.soilMoisture;
        }
      } catch (err) {
        console.warn('Soil moisture step simulation error:', err);
      }
    }
    return typeof moisture === 'number' && Number.isFinite(moisture)
      ? Math.round(moisture * 100) / 100
      : BASELINE_SOIL_MOISTURE;
  }, [simStepHours, getTimelineWeather]);



  // First valid hourly soil-moisture estimate from the GEM model.
  // This is separate from the simulation used by irrigation logic.
  const liveSoilMoistureCurrent = liveSoilMoisture.find(
    (item) => item.moisturePercent != null
  ) ?? null;




  // Current simulation timestamp
  const activeSimTimestamp = useMemo(() => {
    const baseDate = liveWeather?.updatedAt ? new Date(liveWeather.updatedAt) : new Date();
    return new Date(baseDate.getTime() + simStepHours * 60 * 60 * 1000).toISOString();
  }, [liveWeather, simStepHours]);

  // 6-hour future forecast slice from active simulation point
  const activeForecastSlice = useMemo(() => {
    // If in live mode and hourly forecast is not loaded/available, pass empty array
    // so irrigation engine correctly flags UNAVAILABLE rather than hallucinating intervals
    if (selectedScenario === 'live' && (!Array.isArray(hourlyForecast) || hourlyForecast.length === 0)) {
      return [];
    }

    const intervals = [];
    const baseDate = new Date(activeSimTimestamp);

    for (let f = 1; f <= 6; f++) {
      const forecastOffset = simStepHours + f;
      const forecastDate = new Date(baseDate.getTime() + f * 60 * 60 * 1000).toISOString();
      const hWeather = getTimelineWeather(forecastOffset);
      intervals.push({
        timestamp: hWeather.timestamp || forecastDate,
        temperature: hWeather.tempC,
        humidity: hWeather.humidity,
        windSpeed: hWeather.windSpeed,
        precipitation: hWeather.precipitation,
        weatherCode: hWeather.weatherCode,
      });
    }
    return intervals;
  }, [simStepHours, activeSimTimestamp, getTimelineWeather, selectedScenario, hourlyForecast]);

  // Run Irrigation Comparison Engine (Conventional vs. Forecast-Aware)
  const comparisonResult = useMemo(() => {
    const validMoisture =
      typeof currentSoilMoisture === 'number' && Number.isFinite(currentSoilMoisture)
        ? Math.min(100, Math.max(0, currentSoilMoisture))
        : BASELINE_SOIL_MOISTURE;

    const envState = {
      location: selectedLocation.name,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      temperature: liveWeather?.temperature ?? 22.0,
      humidity: liveWeather?.humidity ?? 50,
      windSpeed: liveWeather?.windSpeed ?? 10.0,
      precipitation: liveWeather?.precipitation ?? 0.0,
      weatherCode: liveWeather?.weatherCode ?? 1,
      weatherState: liveWeather?.weatherState ?? 'Clear',
      updatedAt: activeSimTimestamp,
      source: selectedScenario === 'live' ? 'open-meteo' : 'what-if',
      dataMode: selectedScenario === 'live' ? 'live' : 'what-if',
      forecast: activeForecastSlice,
    };

    return compareIrrigation(envState, validMoisture, {
      decisionTime: activeSimTimestamp,
      forecastWindowHours: 6,
      cropThresholds,
      dryThreshold: cropThresholds.dryThreshold,
      targetMoisture: cropThresholds.targetMoisture,
    });
  }, [
    currentSoilMoisture,
    activeForecastSlice,
    activeSimTimestamp,
    cropThresholds,
    selectedLocation,
    liveWeather,
    selectedScenario,
  ]);

  // Build Integrated Weather & Simulation State Object for Components & 3D Canvas
  const weatherData = useMemo(() => {
    const activeHourWeather = getTimelineWeather(simStepHours);
    const tempC = activeHourWeather.tempC;
    const tempF = tempC !== null && tempC !== undefined ? Number(((tempC * 9) / 5 + 32).toFixed(1)) : null;
    const humidity = activeHourWeather.humidity;
    const windSpeed = activeHourWeather.windSpeed;
    const windDirectionDeg = activeHourWeather.windDirection;
    const windDirectionCompass = degreesToCompass(windDirectionDeg);
    const pressureHpa = activeHourWeather.pressure;
    const precipitation = activeHourWeather.precipitation;
    const weatherCode = activeHourWeather.weatherCode;
    const weatherState = activeHourWeather.weatherState || 'Normal';

    const isThunderstorm =
      weatherCode === 95 ||
      weatherCode === 96 ||
      weatherCode === 99 ||
      weatherState.toLowerCase().includes('thunder');

    const isHeavyRain =
      !isThunderstorm &&
      (weatherCode === 65 ||
        weatherCode === 67 ||
        weatherCode === 82 ||
        (typeof precipitation === 'number' && precipitation >= 4.0) ||
        selectedScenario === 'heavy-rain');

    const isDrizzle =
      !isThunderstorm &&
      !isHeavyRain &&
      ((weatherCode >= 51 && weatherCode <= 57) ||
        (typeof precipitation === 'number' && precipitation > 0 && precipitation < 1.0) ||
        weatherState.toLowerCase().includes('drizzle'));

    const isModerateRain =
      !isThunderstorm &&
      !isHeavyRain &&
      !isDrizzle &&
      ((weatherCode >= 61 && weatherCode <= 64) ||
        weatherCode === 66 ||
        weatherCode === 80 ||
        weatherCode === 81 ||
        (typeof precipitation === 'number' && precipitation >= 1.0) ||
        selectedScenario === 'rainy');

    const hasPrecipitation = isThunderstorm || isHeavyRain || isDrizzle || isModerateRain;

    const precipitationType = isThunderstorm
      ? 'thunderstorm'
      : isHeavyRain
      ? 'heavy_rain'
      : isDrizzle
      ? 'drizzle'
      : isModerateRain
      ? 'rain'
      : 'none';

    const isCloudy =
      !hasPrecipitation &&
      (weatherCode === 2 ||
        weatherCode === 3 ||
        weatherCode === 45 ||
        weatherCode === 48 ||
        selectedScenario === 'cloudy' ||
        weatherState.toLowerCase().includes('cloud') ||
        weatherState.toLowerCase().includes('overcast') ||
        weatherState.toLowerCase().includes('fog'));

    const isSunny = !hasPrecipitation && !isCloudy;

    const baseScene =
      (hasPrecipitation
        ? MOCK_WEATHER_DATA.rainy?.scene
        : isCloudy
        ? MOCK_WEATHER_DATA.cloudy?.scene
        : MOCK_WEATHER_DATA.sunny?.scene) || MOCK_WEATHER_DATA.sunny.scene;

    const dewPointC = Number((tempC - (100 - humidity) / 5).toFixed(1));

    // Dynamic agronomic indicators derived from simulated soil moisture
    const isLowMoisture = currentSoilMoisture < 30;
    const isHighMoisture = currentSoilMoisture > 75;

    // Solar radiation: live API data in W/m² (shortwave_radiation) or what-if scenario baseline
    const isLive = selectedScenario === 'live';
    const rawSolar = activeHourWeather.solarRadiation;
    const solarIrradiance = isLive
      ? (rawSolar !== null && rawSolar !== undefined ? Math.round(rawSolar) : null)
      : (rawSolar ?? (hasPrecipitation ? Math.max(30, Math.round(95 - precipitation * 4)) : isCloudy ? (weatherCode === 3 ? 220 : 360) : 840));

    const uvIndex = solarIrradiance !== null
      ? Math.max(0, Math.round(solarIrradiance / 120))
      : (hasPrecipitation ? 1 : isCloudy ? 3 : 7);

    const uvRating = uvIndex <= 2 ? 'Low' : uvIndex <= 5 ? 'Moderate' : uvIndex <= 7 ? 'High' : 'Very High';

    // Crop Health Score Curve (Bell curve centered around optimal 45% moisture)
    const optimalMoisture = 45;
    const moistureDist = Math.abs(currentSoilMoisture - optimalMoisture);
    const cropHealthScore = Math.max(30, Math.min(99, Math.round(98 - Math.pow(moistureDist / 5.2, 1.6))));

    const cropHealthStatus =
      cropHealthScore > 90
        ? 'Optimal Canopy Health'
        : cropHealthScore > 75
        ? 'Stable Growth'
        : cropHealthScore > 50
        ? 'Hydration Stress'
        : 'Severe Drought Wilting';

    const cropHealthColor =
      cropHealthScore > 85 ? '#B8D6A0' : cropHealthScore > 65 ? '#E0A94F' : '#D96B5B';

    // Evapotranspiration Rate Estimation (FAO-56 heuristic)
    const etRate = Number((0.8 + (tempC / 20) * (windSpeed / 12) * (1 - humidity / 140)).toFixed(1));

    // Irrigation action and rationale from comparison engine
    const engineDecision = comparisonResult?.forecastAware?.decision;
    const isRainInWindow =
      engineDecision === 'DEFER' ||
      (comparisonResult?.comparison?.waterSavedMm ?? 0) > 0;
    const irrigationAction = isRainInWindow
      ? 'SUPPRESSED'
      : engineDecision === 'IRRIGATE' || engineDecision === 'REDUCE' || isLowMoisture
      ? 'SCHEDULED'
      : 'STANDBY';

    const irrigationActionColor =
      irrigationAction === 'SUPPRESSED'
        ? '#D96B5B'
        : irrigationAction === 'SCHEDULED'
        ? '#89C2D9'
        : '#B8D6A0';

    const irrigationRecommendation =
      comparisonResult?.forecastAware?.reason ||
      (isRainInWindow
        ? 'Rainfall forecast inside 6h window: Irrigation suppressed to prevent over-saturation.'
        : isLowMoisture
        ? 'Soil moisture below crop threshold: Irrigation scheduled.'
        : 'Soil moisture adequate: Irrigation on standby to conserve water.');

    // Litres conserved over configured farm parcel area: litres = mm × farmAreaSqm
    const waterSavedMm = comparisonResult?.comparison?.waterSavedMm || 0;
    const waterSavedLitres = Math.round(waterSavedMm * farmAreaSqm);
    const waterPreservedTodayGal = Math.round(waterSavedLitres * 0.264172);

    return {
      id: hasPrecipitation ? 'rainy' : isCloudy ? 'cloudy' : 'sunny',
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
      windDirection: windDirectionCompass,
      windDirectionDeg,
      precipitationRateMmH: precipitation,
      solarIrradianceWm2: solarIrradiance,
      uvIndex,
      uvRating,
      atmosphericPressureHpa: pressureHpa,
      dewPointC,
      dataMode: selectedScenario === 'live' ? 'live' : 'what-if',
      source: selectedScenario === 'live' ? 'Open-Meteo' : 'What-If Simulation',
      updatedAt: activeSimTimestamp,

      // Deterministic simulation estimates based on live model equations
      simulation: {
        soilMoisturePercent: typeof currentSoilMoisture === 'number' ? Number(currentSoilMoisture.toFixed(2)) : 34,
        soilMoistureStatus: isLowMoisture
          ? 'Drying (Depletion Phase)'
          : isHighMoisture
            ? 'Saturated (High Moisture)'
            : 'Optimal Moisture Range',
        soilMoistureColor: isLowMoisture ? '#E0A94F' : isHighMoisture ? '#89C2D9' : '#B8D6A0',
        cropHealthScore,
        cropHealthStatus,
        cropHealthColor,
        soilTemperatureC:
          activeHourWeather.soilTemperature !== null && activeHourWeather.soilTemperature !== undefined
            ? Number(activeHourWeather.soilTemperature.toFixed(1))
            : (tempC !== null && tempC !== undefined ? Number((tempC * 0.85).toFixed(1)) : 18.5),
        soilTemperatureMode:
          selectedScenario === 'live' && activeHourWeather.soilTemperature !== null
            ? 'model-estimate'
            : 'simulated',
        soilTemperatureSource:
          selectedScenario === 'live' && activeHourWeather.soilTemperature !== null
            ? 'Open-Meteo NWP (6 cm depth)'
            : 'Simplified crop model',
        evapotranspirationRateMmDay: etRate,
        irrigationAction,
        irrigationActionColor,
        irrigationRecommendation,
        waterSavedLitres,
        waterPreservedTodayGal,
        activeZones: `${farmConfig.plots.length} / 4 Furrows Cultivated`,
        isSimulatedModel: true,
      },

      // 3D Scene config with continuous multi-intensity precipitation synchronization
      scene: {
        ...baseScene,
        rainActive: hasPrecipitation,
        hasPrecipitation,
        precipitationType,
        precipitationRate: precipitation,
        weatherCode,
        weatherState,
        isCloudy,
        isSunny,
        isDrizzle,
        isHeavyRain,
        isThunderstorm,
        soilWetness: Math.min(0.95, Math.max(0.08, currentSoilMoisture / 100)),
        cloudCount: isThunderstorm ? 12 : isHeavyRain ? 11 : isModerateRain ? 9 : isDrizzle ? 8 : isCloudy ? 7 : 4,
        cloudColor: isThunderstorm ? '#64748b' : hasPrecipitation ? '#cbd5e1' : '#ffffff',
        skyColor: isThunderstorm ? '#334155' : hasPrecipitation ? '#64748b' : isCloudy ? '#8da4be' : '#5fa8e8',
        fogColor: isThunderstorm ? '#475569' : hasPrecipitation ? '#788e9f' : isCloudy ? '#9bb0c4' : '#b0d4f1',
        fogNear: hasPrecipitation ? 35 : isCloudy ? 45 : 60,
        fogFar: hasPrecipitation ? 190 : isCloudy ? 220 : 280,
        sunIntensity: isThunderstorm ? 0.7 : hasPrecipitation ? 1.4 : isCloudy ? 1.8 : 2.8,
        sunColor: hasPrecipitation ? '#e2e8f0' : isCloudy ? '#fef3c7' : '#fff7db',
        ambientIntensity: hasPrecipitation ? 0.65 : isCloudy ? 0.75 : 0.82,
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
  ]);

  // Selected Plot Details for Contextual Plot Inspector Card
  const selectedPlot = farmConfig?.plots?.find((p) => p.rowId === selectedRowId);
  const cropInfo = selectedPlot && SUPPORTED_CROPS[selectedPlot.cropType];
  const stageInfo = selectedPlot && GROWTH_STAGES[selectedPlot.growthStage];

  const selectedPlotDetails = useMemo(() => {
    if (!selectedRowId) return null;
    if (selectedPlot) {
      return {
        title: selectedPlot.name,
        density: cropInfo?.density || 'Standard Precision Furrow',
        health: `${weatherData?.simulation?.cropHealthScore || 96}% (${
          weatherData?.simulation?.cropHealthStatus || 'Active Growth'
        })`,
        moistureNeed: `${cropInfo?.category || 'Field Crop'} • Target ${cropThresholds.targetMoisture}%`,
        irrigationZone: `Zone ${selectedRowId.replace('row-', '0')}`,
        stage: `${cropInfo?.name || 'Crop'} • ${stageInfo?.label || 'Vegetative Growth'}`,
        isFallow: false,
      };
    }
    return {
      title: `Furrow ${selectedRowId.replace('row-', '0')} — Fallow / Uncultivated`,
      density: '0 Stalks (Tilled Soil Bed)',
      health: 'N/A (Fallow Soil)',
      moistureNeed: 'Conservation Standby',
      irrigationZone: `Zone ${selectedRowId.replace('row-', '0')}`,
      stage: 'Unplanted / Fallow Furrow',
      isFallow: true,
    };
  }, [selectedRowId, selectedPlot, cropInfo, stageInfo, weatherData, cropThresholds]);

  // Transition Handlers
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

  // Toggle fullscreen mode
  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => {
      const next = !prev;
      if (!next && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      return next;
    });
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
          VIEW 2: Agricultural Digital Twin Dashboard + Fullscreen on Demand
          ------------------------------------------------------------------ */}
      {currentView === 'farm' && (
        <div className={`farm-view-wrapper ${isFullscreen ? 'fullscreen-mode' : ''}`} ref={farmViewportRef}>
          {/* 1. Header (visible in normal mode) */}
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

          {/* 2. Cockpit Summary Metrics (visible in normal mode) */}
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
                <span className={selectedScenario === 'live' ? 'badge-dot-live' : 'badge-dot-whatif'}></span>
                <span>{selectedScenario === 'live' ? (weatherData?.condition || 'Live Sync') : `What-If: ${weatherData?.condition || selectedScenario}`}</span>
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
                <span>
                  {comparisonResult?.scenario?.forecastStatus === 'UNAVAILABLE'
                    ? 'Forecast N/A'
                    : comparisonResult?.scenario?.forecastStatus === 'INSUFFICIENT'
                    ? 'Sparse Rain Data'
                    : comparisonResult?.comparison?.isRainInsideWindow
                    ? 'Rain in 6h Window'
                    : 'Dry 6h Window'}
                </span>
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
                <span>
                  {liveSoilMoistureCurrent
                    ? 'Model estimate · not sensor data'
                    : 'Live model data unavailable'}
                </span>
              </div>
              <div className="metric-pill-sub">
                Simulation: {weatherData?.simulation?.soilMoisturePercent ?? 34}%
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

          {/* 3. Main Cockpit Workspace */}
          <div className="farm-cockpit-workspace">
            {/* Left Panel: Collapsible Weather & Furrow Controls */}
            <aside
              className={`farm-left-panel ${isLeftPanelOpen ? 'open' : 'collapsed'}`}
              aria-label="Current Weather & Farm Furrows"
            >
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
                  {selectedScenario === 'live' ? (
                    <span className="weather-live-chip">Live Sync</span>
                  ) : (
                    <span className="weather-whatif-chip">What-If: {selectedScenario.toUpperCase()}</span>
                  )}
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
                      {weatherData.precipitationRateMmH !== undefined && weatherData.precipitationRateMmH !== null
                        ? `${weatherData.precipitationRateMmH.toFixed(1)} mm/h`
                        : '0.0 mm/h'}
                    </span>
                  </div>
                  <div className="weather-detail-item">
                    <span className="detail-label">
                      <Wind size={11} /> Wind
                    </span>
                    <span className="detail-val">
                      {weatherData.windSpeedKmH !== null && weatherData.windSpeedKmH !== undefined
                        ? `${weatherData.windSpeedKmH.toFixed(1)} km/h${weatherData.windDirection ? ` • ${weatherData.windDirection}` : ''}`
                        : '--'}
                    </span>
                  </div>
                  <div className="weather-detail-item">
                    <span className="detail-label">
                      Pressure
                    </span>
                    <span className="detail-val">
                      {weatherData.atmosphericPressureHpa !== null && weatherData.atmosphericPressureHpa !== undefined
                        ? `${Math.round(weatherData.atmosphericPressureHpa)} hPa`
                        : 'Unavailable'}
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

            {/* Center Viewport Main */}
            <main className={`farm-viewport-main ${isFullscreen ? 'is-fullscreen' : ''}`}>
              {/* NORMAL VIEWPORT TOOLBAR (Shown when NOT fullscreen) */}
              {!isFullscreen && (
                <div className="farm-workspace-toolbar">
                  {/* Top Row: Dedicated Parcel Workspace Context & Title */}
                  <div className="farm-workspace-header-row">
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
                  </div>

                  {/* Bottom Row: Dedicated Camera & Farm Action Controls */}
                  <div className="farm-workspace-controls-row">
                    {/* Camera Presets Segmented Capsule */}
                    <div className="hud-camera-presets" role="toolbar" aria-label="Camera Presets">
                      <button
                        type="button"
                        className={`hud-cam-btn ${cameraPreset === 'overview' ? 'active' : ''}`}
                        onClick={() => setCameraPreset('overview')}
                        title="Overview Panoramic View"
                      >
                        <Camera size={13} />
                        <span>Overview</span>
                      </button>
                      <button
                        type="button"
                        className={`hud-cam-btn ${cameraPreset === 'crops' ? 'active' : ''}`}
                        onClick={() => setCameraPreset('crops')}
                        title="Close-Up Crop Furrows"
                      >
                        <Sprout size={13} />
                        <span>Crops</span>
                      </button>
                      <button
                        type="button"
                        className={`hud-cam-btn ${cameraPreset === 'farmhouse' ? 'active' : ''}`}
                        onClick={() => setCameraPreset('farmhouse')}
                        title="Farmstead & Tractor View"
                      >
                        <Home size={13} />
                        <span>Farmstead</span>
                      </button>
                      <button
                        type="button"
                        className={`hud-cam-btn ${cameraPreset === 'top' ? 'active' : ''}`}
                        onClick={() => setCameraPreset('top')}
                        title="Top-Down Satellite View"
                      >
                        <Compass size={13} />
                        <span>Top</span>
                      </button>
                      <button
                        type="button"
                        className="hud-cam-btn reset-cam"
                        onClick={() => setCameraPreset('overview')}
                        title="Reset Camera to Overview"
                        aria-label="Reset Camera"
                      >
                        <RotateCcw size={13} />
                      </button>
                    </div>

                    <div className="farm-toolbar-actions">
                      <button
                        type="button"
                        className="btn-toolbar-add-crop"
                        onClick={() => setIsAddCropOpen(true)}
                        title="Add a crop or assign to furrow"
                      >
                        <Plus size={14} />
                        <span>+ Add Crop</span>
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

                      {/* FULLSCREEN EXPAND BUTTON */}
                      <button
                        type="button"
                        className="btn-toolbar-fullscreen"
                        onClick={handleToggleFullscreen}
                        title="Expand 3D Farm to Fullscreen (F)"
                        aria-label="Expand 3D Farm to Fullscreen"
                      >
                        <Maximize2 size={14} />
                        <span>Fullscreen</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* FULLSCREEN FLOATING TOP HUD (Shown ONLY when isFullscreen) */}
              {isFullscreen && (
                <header className="fullscreen-hud-top" role="banner" aria-label="Fullscreen Farm Navigation & Telemetry">
                  {/* TOP-LEFT: WEATHER & SOIL STATUS PANEL */}
                  <div className="hud-status-panel">
                    <div className="hud-status-header">
                      <div className="hud-brand-pill">
                        <span className="brand-dot" />
                        <span className="brand-text">Terra<strong>Pulse</strong></span>
                      </div>
                      <button
                        type="button"
                        className="hud-location-chip"
                        onClick={() => setIsLocationSearchOpen(true)}
                        title="Click to search worldwide agricultural location"
                      >
                        <MapPin size={12} className="text-muted-sage" />
                        <span className="hud-loc-name">{selectedLocation.name}</span>
                      </button>
                    </div>

                    <div className="hud-status-grid">
                      {/* Measured Weather Data */}
                      <div className="hud-status-section measured-section" title="Direct live meteorological observation">
                        <div className="hud-section-header">
                          <span className="hud-section-badge badge-measured">MEASURED</span>
                        </div>
                        <div className="hud-stat-line">
                          <Thermometer size={14} className="text-amber" />
                          <span className="hud-stat-value">
                            {weatherData?.tempC !== null && weatherData?.tempC !== undefined
                              ? `${weatherData.tempC.toFixed(1)}°C`
                              : '--'}
                          </span>
                          <span className="hud-stat-label">{weatherData?.condition || 'Clear'}</span>
                        </div>
                      </div>

                      <div className="hud-status-divider" />

                      {/* Modeled Digital Twin Telemetry */}
                      <div className="hud-status-section modeled-section" title="Soil-crop physics simulation estimate">
                        <div className="hud-section-header">
                          <span className="hud-section-badge badge-modeled">DIGITAL TWIN</span>
                        </div>
                        <div className="hud-stat-row-dual">
                          <div className="hud-stat-mini" title="Volumetric Soil Moisture Content">
                            <Droplets size={12} className="text-lime" />
                            <span className="hud-stat-val text-lime">
                              {weatherData?.simulation?.soilMoisturePercent ?? 34}%
                            </span>
                            <span className="hud-stat-sub">Soil</span>
                          </div>
                          <div className="hud-stat-mini" title="Crop Health Canopy Index">
                            <Sprout size={12} className="text-emerald" />
                            <span className="hud-stat-val text-emerald">
                              {weatherData?.simulation?.cropHealthScore ?? 95}%
                            </span>
                            <span className="hud-stat-sub">Canopy</span>
                          </div>
                          <div className="hud-stat-mini" title="Irrigation Advisory Recommendation">
                            <CloudRain size={12} className="text-sky" />
                            <span className="hud-stat-val text-sky">
                              {comparisonResult?.forecastAware?.decision === 'DEFER' || (comparisonResult?.comparison?.waterSavedMm ?? 0) > 0 ? 'Defer' : 'Optimal'}
                            </span>
                            <span className="hud-stat-sub">
                              {comparisonResult?.forecastAware?.decision === 'DEFER' || (comparisonResult?.comparison?.waterSavedMm ?? 0) > 0 ? 'Rain in 6h' : 'Irrigation'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TOP-RIGHT: CAMERA CONTROLS & FARM ACTIONS TOOLBAR */}
                  <div className="hud-toolbar-panel">
                    {/* Camera Presets Segmented Capsule */}
                    <div className="hud-camera-presets" role="toolbar" aria-label="Camera Presets">
                      <button
                        type="button"
                        className={`hud-cam-btn ${cameraPreset === 'overview' ? 'active' : ''}`}
                        onClick={() => setCameraPreset('overview')}
                        title="Overview Panoramic View"
                      >
                        <Camera size={13} />
                        <span>Overview</span>
                      </button>
                      <button
                        type="button"
                        className={`hud-cam-btn ${cameraPreset === 'crops' ? 'active' : ''}`}
                        onClick={() => setCameraPreset('crops')}
                        title="Close-Up Crop Furrows"
                      >
                        <Sprout size={13} />
                        <span>Crops</span>
                      </button>
                      <button
                        type="button"
                        className={`hud-cam-btn ${cameraPreset === 'farmhouse' ? 'active' : ''}`}
                        onClick={() => setCameraPreset('farmhouse')}
                        title="Farmstead & Tractor View"
                      >
                        <Home size={13} />
                        <span>Farmstead</span>
                      </button>
                      <button
                        type="button"
                        className={`hud-cam-btn ${cameraPreset === 'top' ? 'active' : ''}`}
                        onClick={() => setCameraPreset('top')}
                        title="Top-Down Satellite View"
                      >
                        <Compass size={13} />
                        <span>Top</span>
                      </button>
                      <button
                        type="button"
                        className="hud-cam-btn reset-cam"
                        onClick={() => setCameraPreset('overview')}
                        title="Reset Camera to Overview"
                        aria-label="Reset Camera"
                      >
                        <RotateCcw size={13} />
                      </button>
                    </div>

                    {/* Farm Action Buttons */}
                    <div className="hud-actions-group">
                      <button
                        type="button"
                        className="hud-action-btn btn-add-crop"
                        onClick={() => setIsAddCropOpen(true)}
                        title="Plant crop in furrow plot"
                      >
                        <Plus size={13} />
                        <span>+ Crop</span>
                      </button>

                      <button
                        type="button"
                        className={`hud-action-btn btn-drip-pulse ${manualIrrigationTriggered ? 'irrigating' : ''}`}
                        onClick={handleManualIrrigation}
                        disabled={manualIrrigationTriggered || weatherData.id === 'rainy'}
                        title="Pulse test micro-drip valves"
                      >
                        <Droplet size={13} />
                        <span>{manualIrrigationTriggered ? 'Pulsing...' : 'Drip Pulse'}</span>
                      </button>

                      <button
                        type="button"
                        className="hud-action-btn btn-farm-config"
                        onClick={() => setIsFarmConfigOpen(true)}
                        title="Configure Farm Parcels & Plot Area"
                      >
                        <SlidersHorizontal size={13} />
                        <span>Config</span>
                      </button>

                      {/* Exit Fullscreen Button */}
                      <button
                        type="button"
                        className="hud-exit-fullscreen-btn"
                        onClick={handleToggleFullscreen}
                        title="Exit Fullscreen Mode (Press Esc)"
                        aria-label="Exit Fullscreen Mode"
                      >
                        <Minimize2 size={13} />
                        <span>Exit</span>
                      </button>
                    </div>
                  </div>
                </header>
              )}

              {/* FULLSCREEN CONTEXTUAL PLOT INSPECTOR (Shown ONLY when fullscreen and furrow is selected) */}
              {isFullscreen && selectedRowId && selectedPlotDetails && (
                <aside className="farm-plot-inspector-card" role="dialog" aria-label="Selected Crop Plot Details">
                  <div className="inspector-card-header">
                    <div className="inspector-title-cluster">
                      <span className="inspector-furrow-badge">Furrow {selectedRowId.replace('row-', '0')}</span>
                      <h4 className="inspector-crop-name">{selectedPlotDetails.title}</h4>
                    </div>
                    <button
                      type="button"
                      className="inspector-close-btn"
                      onClick={() => setSelectedRowId(null)}
                      title="Close Plot Inspector"
                      aria-label="Close plot details"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <div className="inspector-card-body">
                    <div className="inspector-stat-row">
                      <span className="stat-label">Crop & Stage</span>
                      <span className="stat-value">{selectedPlotDetails.stage}</span>
                    </div>
                    <div className="inspector-stat-row">
                      <span className="stat-label">Canopy Health</span>
                      <span className="stat-value text-emerald font-bold">{selectedPlotDetails.health}</span>
                    </div>
                    <div className="inspector-stat-row">
                      <span className="stat-label">Target Moisture</span>
                      <span className="stat-value text-sky">{selectedPlotDetails.moistureNeed}</span>
                    </div>
                    <div className="inspector-stat-row">
                      <span className="stat-label">Irrigation Manifold</span>
                      <span className="stat-value">{selectedPlotDetails.irrigationZone}</span>
                    </div>
                  </div>

                  <div className="inspector-card-actions">
                    <button
                      type="button"
                      className="inspector-action-btn primary"
                      onClick={() => setIsAddCropOpen(true)}
                      title="Assign or re-plant crop in this furrow"
                    >
                      <Plus size={13} />
                      <span>Plant Crop</span>
                    </button>
                    <button
                      type="button"
                      className="inspector-action-btn secondary"
                      onClick={() => setIsFarmConfigOpen(true)}
                      title="Open Farm Plot Configurations"
                    >
                      <SlidersHorizontal size={13} />
                      <span>Configure</span>
                    </button>
                  </div>
                </aside>
              )}

              {/* FARM CANVAS CARD */}
              <div className="farm-canvas-card">
                <FarmCanvas
                  weatherData={weatherData}
                  selectedRowId={selectedRowId}
                  onSelectRow={setSelectedRowId}
                  isIrrigating={manualIrrigationTriggered}
                  farmConfig={farmConfig}
                  cameraPreset={cameraPreset}
                  onPresetChange={setCameraPreset}
                />

                {/* EMBEDDED BOTTOM CONTROLS BAR (Shown when NOT fullscreen) */}
                {!isFullscreen && (
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
                )}
              </div>

              {/* FULLSCREEN FLOATING BOTTOM TIMELINE (Shown ONLY when fullscreen) */}
              {isFullscreen && (
                <div className="floating-sim-timeline-bar" role="region" aria-label="Simulation Timeline Controls">
                  <div className="sim-timeline-inner-capsule">
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

                    {/* Quick Weather Scenario Pills */}
                    <div className="hud-scenarios-strip" role="radiogroup" aria-label="Weather Scenarios">
                      {[
                        { id: 'live', label: 'Live' },
                        { id: 'sunny', label: 'Sunny' },
                        { id: 'cloudy', label: 'Cloudy' },
                        { id: 'rainy', label: 'Rainy' },
                      ].map((scen) => (
                        <button
                          key={scen.id}
                          type="button"
                          className={`scenario-chip ${selectedScenario === scen.id ? 'active-scenario' : ''}`}
                          onClick={() => {
                            setSelectedScenario(scen.id);
                            setSimStepHours(0);
                            if (scen.id === 'live') {
                              setWeatherMode('live');
                              loadLiveWeatherData(selectedLocation.latitude, selectedLocation.longitude);
                            } else {
                              setWeatherMode(scen.id);
                            }
                          }}
                        >
                          {scen.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </main>

            {/* Right Contextual Inspector in Dashboard (when NOT fullscreen) */}
            {!isFullscreen && selectedRowId && (
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

          {/* 4. Secondary Intelligence Section (visible in normal mode) */}
          <section className="farm-intelligence-section" aria-label="Agronomic Intelligence & Irrigation Strategy">
            <div className="intelligence-section-header">
              <div className="section-header-left">
                <h2 className="intelligence-title">Agronomic Insights & Environmental Strategy</h2>
                <p className="intelligence-sub">
                  Explore comparative irrigation metrics, meteorological forecasts, and what-if simulation models.
                </p>
              </div>

              {/* Secondary Navigation Tabs */}
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
                    expectedRainMm={
                      comparisonResult?.scenario?.totalRainMm ??
                      (selectedScenario === 'sunny'
                        ? 0
                        : selectedScenario === 'rainy'
                        ? 8.0
                        : selectedScenario === 'heavy-rain'
                        ? 24.0
                        : null)
                    }
                    scenarioLabel={
                      selectedScenario === 'live'
                        ? 'Live Open-Meteo Forecast (Next 6h Window)'
                        : `What-If: ${
                            selectedScenario === 'sunny'
                              ? 'Sunny Day (0 mm rain)'
                              : selectedScenario === 'cloudy'
                              ? 'Cloudy / Overcast (0 mm rain)'
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
                      } else if (mode === 'sunny') {
                        setSelectedScenario('sunny');
                      } else if (mode === 'cloudy') {
                        setSelectedScenario('cloudy');
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
                      if (scenId === 'live') {
                        setWeatherMode('live');
                        loadLiveWeatherData(selectedLocation.latitude, selectedLocation.longitude);
                      } else {
                        setWeatherMode(scenId === 'heavy-rain' ? 'rainy' : scenId);
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </section>

          {/* 5. Product Footer (visible in normal mode) */}
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
          setLiveWeather(null);
          setHourlyForecast([]);
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
