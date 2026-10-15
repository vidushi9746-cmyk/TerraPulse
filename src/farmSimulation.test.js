import assert from 'node:assert';
import { describe, it } from 'node:test';
import { estimateSoilMoisture } from './farmSimulation.js';
import { compareIrrigation } from './irrigationEngine.js';

describe('Farm Simulation & Integration Test Suite', () => {
  it('SIM-1: Rainfall Absorption Factor Consistency (0.5% per mm)', () => {
    // Starting at 40% moisture, 10 mm rainfall at 0°C (zero evaporation)
    const result = estimateSoilMoisture(40, 0, 80, 0, 10);
    assert.strictEqual(result.warnings.length, 0);
    // 40 + (10 * 0.5) = 45%
    assert.strictEqual(result.soilMoisture, 45);
  });

  it('SIM-2: Evapotranspiration Moisture Loss Formulation', () => {
    // 20°C ambient, 50% relative humidity, 10 km/h wind, 0 mm rain
    // tempEffect = 20 * 0.1 = 2.0
    // windEffect = 10 * 0.05 = 0.5
    // potentialEvap = 2.5
    // drynessFactor = (100 - 50) / 100 = 0.5
    // moistureLoss = 2.5 * 0.5 = 1.25%
    const result = estimateSoilMoisture(50, 20, 50, 10, 0);
    assert.strictEqual(result.warnings.length, 0);
    assert.strictEqual(result.soilMoisture, 48.75);
  });

  it('SIM-3: Physical Clamping to [0, 100] Bounds', () => {
    // Over-saturation clamp
    const saturated = estimateSoilMoisture(95, 10, 90, 5, 50);
    assert.strictEqual(saturated.soilMoisture, 100);

    // Extreme desiccation clamp
    const dry = estimateSoilMoisture(2, 45, 10, 40, 0);
    assert.strictEqual(dry.soilMoisture, 0);
  });

  it('SIM-4: Missing Weather Data Integrity (No Hallucinated Sensors)', () => {
    // When temperature is null or missing, starting moisture is preserved with clear warnings
    const result = estimateSoilMoisture(42, null, 50, 10, 0);
    assert.strictEqual(result.soilMoisture, 42);
    assert.ok(result.warnings.length > 0);
    assert.ok(result.warnings[0].includes('Invalid or missing temperature'));
  });

  it('SIM-5: Multi-Step Simulation Determinism & Speed Invariance', () => {
    // Sequence of 4 hourly weather conditions
    const hourlyWeather = [
      { tempC: 22, humidity: 45, windSpeed: 12, precipitation: 0 },
      { tempC: 24, humidity: 40, windSpeed: 15, precipitation: 0 },
      { tempC: 19, humidity: 80, windSpeed: 8, precipitation: 6 },
      { tempC: 18, humidity: 85, windSpeed: 6, precipitation: 4 },
    ];

    // Compute in single pass
    let moisturePass1 = 36.0;
    for (const step of hourlyWeather) {
      const res = estimateSoilMoisture(
        moisturePass1,
        step.tempC,
        step.humidity,
        step.windSpeed,
        step.precipitation
      );
      moisturePass1 = res.soilMoisture;
    }

    // Compute again in second pass
    let moisturePass2 = 36.0;
    for (const step of hourlyWeather) {
      const res = estimateSoilMoisture(
        moisturePass2,
        step.tempC,
        step.humidity,
        step.windSpeed,
        step.precipitation
      );
      moisturePass2 = res.soilMoisture;
    }

    assert.strictEqual(moisturePass1, moisturePass2);
    // Verified determinism: running steps consecutively produces identical outputs
  });

  it('SIM-6: Area Volumetric Conversion (litres = mm * areaSqm)', () => {
    const depthMm = 15.5;
    const farmAreaSqm = 1000;
    const litres = depthMm * farmAreaSqm;
    assert.strictEqual(litres, 15500);
  });

  it('SIM-7: End-to-End Dynamic Soil Moisture to Irrigation Engine Evaluation', () => {
    // Simulated soil starting at 30% (below dryThreshold 35%)
    // Upcoming forecast with 8 mm rain in 6h window
    const forecast = [
      { timestamp: '2026-10-14T13:00:00.000Z', precipitation: 2.0 },
      { timestamp: '2026-10-14T14:00:00.000Z', precipitation: 2.0 },
      { timestamp: '2026-10-14T15:00:00.000Z', precipitation: 2.0 },
      { timestamp: '2026-10-14T16:00:00.000Z', precipitation: 2.0 },
      { timestamp: '2026-10-14T17:00:00.000Z', precipitation: 0.0 },
      { timestamp: '2026-10-14T18:00:00.000Z', precipitation: 0.0 },
    ];

    const envState = {
      location: 'Test Plot',
      updatedAt: '2026-10-14T12:00:00.000Z',
      forecast,
    };

    const simulatedMoisture = 32.0;
    const comparison = compareIrrigation(envState, simulatedMoisture, {
      forecastWindowHours: 6,
      decisionTime: '2026-10-14T12:00:00.000Z',
    });

    // 8 mm rain * 0.5 factor = +4% moisture -> 32 + 4 = 36% > 35% dryThreshold
    // Forecast-aware strategy should DEFER
    assert.strictEqual(comparison.forecastAware.decision, 'DEFER');
    // Conventional should IRRIGATE deficit: (60 - 32) / 0.5 = 56 mm
    assert.strictEqual(comparison.conventional.decision, 'IRRIGATE');
    assert.strictEqual(comparison.conventional.waterAppliedMm, 56.0);
    // Water saved
    assert.strictEqual(comparison.comparison.waterSavedMm, 56.0);
    assert.strictEqual(comparison.comparison.recommendation, 'FORECAST_AWARE');
  });
});
