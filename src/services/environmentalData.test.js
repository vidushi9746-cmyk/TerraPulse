import assert from 'node:assert';
import { describe, it } from 'node:test';
import { fetchCurrentWeather, degreesToCompass, formatPrecipitationRate } from './weatherService.js';
import { fetchHourlyForecast } from './forecastService.js';
import { compareIrrigation } from '../irrigationEngine.js';

describe('Environmental Data Integration & Normalization Test Suite', () => {
  // -------------------------------------------------------------
  // SUITE 1: degreesToCompass Helper Unit Tests
  // -------------------------------------------------------------
  describe('degreesToCompass Converter', () => {
    it('ENV-1: Maps 16-point cardinal and ordinal directions accurately', () => {
      assert.strictEqual(degreesToCompass(0), 'N');
      assert.strictEqual(degreesToCompass(22.5), 'NNE');
      assert.strictEqual(degreesToCompass(45), 'NE');
      assert.strictEqual(degreesToCompass(67.5), 'ENE');
      assert.strictEqual(degreesToCompass(90), 'E');
      assert.strictEqual(degreesToCompass(112.5), 'ESE');
      assert.strictEqual(degreesToCompass(135), 'SE');
      assert.strictEqual(degreesToCompass(157.5), 'SSE');
      assert.strictEqual(degreesToCompass(180), 'S');
      assert.strictEqual(degreesToCompass(202.5), 'SSW');
      assert.strictEqual(degreesToCompass(225), 'SW');
      assert.strictEqual(degreesToCompass(247.5), 'WSW');
      assert.strictEqual(degreesToCompass(270), 'W');
      assert.strictEqual(degreesToCompass(292.5), 'WNW');
      assert.strictEqual(degreesToCompass(315), 'NW');
      assert.strictEqual(degreesToCompass(337.5), 'NNW');
      assert.strictEqual(degreesToCompass(360), 'N');
    });

    it('ENV-2: Normalizes angles outside [0, 360) including negative values', () => {
      assert.strictEqual(degreesToCompass(360 + 45), 'NE');
      assert.strictEqual(degreesToCompass(-45), 'NW');
      assert.strictEqual(degreesToCompass(-90), 'W');
      assert.strictEqual(degreesToCompass(720), 'N');
    });

    it('ENV-3: Gracefully handles null, undefined, non-numbers, and NaN without crashing', () => {
      assert.strictEqual(degreesToCompass(null), null);
      assert.strictEqual(degreesToCompass(undefined), null);
      assert.strictEqual(degreesToCompass('315'), null);
      assert.strictEqual(degreesToCompass(NaN), null);
      assert.strictEqual(degreesToCompass(Infinity), null);
    });
  });

  // -------------------------------------------------------------
  // SUITE 1B: formatPrecipitationRate Formatting Tests
  // -------------------------------------------------------------
  describe('formatPrecipitationRate Formatter', () => {
    it('ENV-PRECIP-1: Formats valid positive numbers with one decimal place', () => {
      assert.strictEqual(formatPrecipitationRate(2.54), '2.5 mm/h');
      assert.strictEqual(formatPrecipitationRate(10), '10.0 mm/h');
      assert.strictEqual(formatPrecipitationRate(0.12), '0.1 mm/h');
    });

    it('ENV-PRECIP-2: Preserves valid zero reading as "0.0 mm/h" (not fallback)', () => {
      assert.strictEqual(formatPrecipitationRate(0), '0.0 mm/h');
      assert.strictEqual(formatPrecipitationRate(0.0), '0.0 mm/h');
    });

    it('ENV-PRECIP-3: Returns fallback for null and undefined without calling toFixed', () => {
      assert.strictEqual(formatPrecipitationRate(null), 'Unavailable');
      assert.strictEqual(formatPrecipitationRate(undefined), 'Unavailable');
    });

    it('ENV-PRECIP-4: Returns fallback for non-finite and invalid inputs safely', () => {
      assert.strictEqual(formatPrecipitationRate(NaN), 'Unavailable');
      assert.strictEqual(formatPrecipitationRate(Infinity), 'Unavailable');
      assert.strictEqual(formatPrecipitationRate(-Infinity), 'Unavailable');
      assert.strictEqual(formatPrecipitationRate('5.0'), 'Unavailable');
      assert.strictEqual(formatPrecipitationRate({}), 'Unavailable');
    });

    it('ENV-PRECIP-5: Supports custom fallback strings such as "N/A" and "--"', () => {
      assert.strictEqual(formatPrecipitationRate(null, 'N/A'), 'N/A');
      assert.strictEqual(formatPrecipitationRate(undefined, '--'), '--');
      assert.strictEqual(formatPrecipitationRate(NaN, 'Data Missing'), 'Data Missing');
    });
  });

  // -------------------------------------------------------------
  // SUITE 2: Current Weather Service Tests
  // -------------------------------------------------------------
  describe('Current Weather Normalization (weatherService.js)', () => {
    it('ENV-4: Correctly normalizes all new meteorological variables from Open-Meteo', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({
            current: {
              time: '2026-10-15T12:00',
              temperature_2m: 18.5,
              relative_humidity_2m: 64,
              wind_speed_10m: 12.3,
              wind_direction_10m: 316,
              surface_pressure: 1018.4,
              precipitation: 0.0,
              weather_code: 1,
              shortwave_radiation: 420.0,
              soil_temperature_6cm: 14.8,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      try {
        const result = await fetchCurrentWeather(45.12, -123.08);
        assert.strictEqual(result.temperature, 18.5);
        assert.strictEqual(result.humidity, 64);
        assert.strictEqual(result.windSpeed, 12.3);
        assert.strictEqual(result.windDirection, 316);
        assert.strictEqual(result.pressure, 1018.4);
        assert.strictEqual(result.solarRadiation, 420.0);
        assert.strictEqual(result.soilTemperature, 14.8);
        assert.strictEqual(result.precipitation, 0.0);
        assert.strictEqual(result.weatherCode, 1);
        assert.strictEqual(result.weatherState, 'Mainly clear');
        assert.strictEqual(result.source, 'Open-Meteo');
        assert.strictEqual(result.dataMode, 'live');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('ENV-5: Preserves missing/null readings without substituting zeroes or hardcoded fallbacks', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({
            current: {
              time: '2026-10-15T12:00',
              temperature_2m: null,
              relative_humidity_2m: null,
              wind_speed_10m: null,
              wind_direction_10m: null,
              surface_pressure: null,
              precipitation: null,
              weather_code: null,
              shortwave_radiation: null,
              soil_temperature_6cm: null,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      try {
        const result = await fetchCurrentWeather(45.12, -123.08);
        assert.strictEqual(result.temperature, null);
        assert.strictEqual(result.humidity, null);
        assert.strictEqual(result.windSpeed, null);
        assert.strictEqual(result.windDirection, null);
        assert.strictEqual(result.pressure, null);
        assert.strictEqual(result.solarRadiation, null);
        assert.strictEqual(result.soilTemperature, null);
        assert.strictEqual(result.precipitation, null);
        assert.strictEqual(result.weatherCode, null);
        assert.strictEqual(result.weatherState, 'unknown');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('ENV-6: Validates coordinate boundaries client-side before network dispatch', async () => {
      await assert.rejects(
        () => fetchCurrentWeather(95, 0),
        /Invalid coordinates: latitude must be a finite number between -90 and 90/
      );
      await assert.rejects(
        () => fetchCurrentWeather(0, 190),
        /Invalid coordinates: longitude must be a finite number between -180 and 180/
      );
    });
  });

  // -------------------------------------------------------------
  // SUITE 3: Hourly Forecast Service Tests
  // -------------------------------------------------------------
  describe('Hourly Forecast Normalization (forecastService.js)', () => {
    it('ENV-7: Normalizes 72-hour forecast including wind direction, pressure, radiation, and soil temp', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({
            hourly: {
              time: ['2026-10-15T00:00', '2026-10-15T01:00'],
              temperature_2m: [12.0, 11.5],
              relative_humidity_2m: [80, 82],
              wind_speed_10m: [10.0, 9.5],
              wind_direction_10m: [315, 320],
              surface_pressure: [1018.0, 1018.2],
              shortwave_radiation: [0.0, 0.0], // Night-time reading: 0 W/m² is valid
              soil_temperature_6cm: [14.2, 14.0],
              precipitation: [0.0, 0.2],
              weather_code: [0, 61],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      try {
        const forecast = await fetchHourlyForecast(45.12, -123.08, 1);
        assert.strictEqual(forecast.length, 2);

        const first = forecast[0];
        assert.strictEqual(first.timestamp, '2026-10-15T00:00:00.000Z');
        assert.strictEqual(first.temperature, 12.0);
        assert.strictEqual(first.windDirection, 315);
        assert.strictEqual(first.pressure, 1018.0);
        assert.strictEqual(first.solarRadiation, 0.0);
        assert.strictEqual(first.soilTemperature, 14.2);
        assert.strictEqual(first.precipitation, 0.0);
        assert.strictEqual(first.weatherCode, 0);
        assert.strictEqual(first.weatherState, 'Clear sky');

        const second = forecast[1];
        assert.strictEqual(second.windDirection, 320);
        assert.strictEqual(second.precipitation, 0.2);
        assert.strictEqual(second.weatherCode, 61);
        assert.strictEqual(second.weatherState, 'Slight rain');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('ENV-8: Detects and rejects mismatched array lengths across extended fields', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({
            hourly: {
              time: ['2026-10-15T00:00', '2026-10-15T01:00'],
              temperature_2m: [12.0, 11.5],
              relative_humidity_2m: [80, 82],
              wind_speed_10m: [10.0, 9.5],
              wind_direction_10m: [315], // Length 1 vs 2
              surface_pressure: [1018.0, 1018.2],
              shortwave_radiation: [0.0, 0.0],
              soil_temperature_6cm: [14.2, 14.0],
              precipitation: [0.0, 0.0],
              weather_code: [0, 0],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      try {
        await assert.rejects(
          () => fetchHourlyForecast(45.12, -123.08, 1),
          /Mismatched array length for hourly field "wind_direction_10m"/
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('ENV-9: Gracefully handles API network and HTTP failures', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        throw new Error('Connection refused');
      };

      try {
        await assert.rejects(
          () => fetchHourlyForecast(45.12, -123.08, 1),
          /Network error while connecting to forecast service: Connection refused/
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  // -------------------------------------------------------------
  // SUITE 4: Soil Moisture & Irrigation Independence Protection
  // -------------------------------------------------------------
  describe('Irrigation & Soil-Moisture Decoupling Protection', () => {
    it('ENV-10: Irrigation engine decisions remain deterministic with extended environmental forecast slices', () => {
      const envState = {
        location: 'Test Farm',
        temperature: 20.0,
        humidity: 60,
        windSpeed: 10,
        precipitation: 0,
        forecast: [
          {
            timestamp: '2026-10-15T01:00:00.000Z',
            temperature: 18,
            precipitation: 5.0,
            windDirection: 220,
            pressure: 1008,
            solarRadiation: 50,
            soilTemperature: 15,
          },
          {
            timestamp: '2026-10-15T02:00:00.000Z',
            temperature: 17,
            precipitation: 5.0,
            windDirection: 225,
            pressure: 1007,
            solarRadiation: 30,
            soilTemperature: 15,
          },
          {
            timestamp: '2026-10-15T03:00:00.000Z',
            temperature: 17,
            precipitation: 5.0,
            windDirection: 225,
            pressure: 1007,
            solarRadiation: 0,
            soilTemperature: 15,
          },
          {
            timestamp: '2026-10-15T04:00:00.000Z',
            temperature: 16,
            precipitation: 5.0,
            windDirection: 230,
            pressure: 1006,
            solarRadiation: 0,
            soilTemperature: 14,
          },
          {
            timestamp: '2026-10-15T05:00:00.000Z',
            temperature: 16,
            precipitation: 0.0,
            windDirection: 230,
            pressure: 1006,
            solarRadiation: 0,
            soilTemperature: 14,
          },
          {
            timestamp: '2026-10-15T06:00:00.000Z',
            temperature: 16,
            precipitation: 0.0,
            windDirection: 235,
            pressure: 1006,
            solarRadiation: 0,
            soilTemperature: 14,
          },
        ],
        updatedAt: '2026-10-15T00:00:00.000Z',
        dataMode: 'live',
      };

      // Starting moisture at 30% (below 35% dry threshold)
      const evaluation = compareIrrigation(envState, 30.0, {
        forecastWindowHours: 6,
        decisionTime: '2026-10-15T00:00:00.000Z',
      });

      // Conventional would irrigate, forecast-aware defers due to incoming rain
      assert.strictEqual(evaluation.conventional.decision, 'IRRIGATE');
      assert.strictEqual(evaluation.forecastAware.decision, 'DEFER');
      assert.strictEqual(evaluation.comparison.recommendation, 'FORECAST_AWARE');
      assert.ok(evaluation.comparison.waterSavedMm > 0);
    });
  });
});
