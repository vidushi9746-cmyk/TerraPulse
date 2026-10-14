import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  compareIrrigation,
  evaluateConventionalStrategy,
  evaluateForecastAwareStrategy,
  filterForecastWindow,
} from './irrigationEngine.js';

describe('Irrigation Engine Test Suite', () => {
  const baseEnvironmentState = {
    location: 'Green Valley Farm, Field 4',
    latitude: 37.7749,
    longitude: -122.4194,
    temperature: 22.4,
    humidity: 50,
    windSpeed: 10.5,
    precipitation: 0.0,
    weatherCode: 1000,
    weatherState: 'Clear',
    updatedAt: '2026-10-14T12:00:00.000Z',
    source: 'open-meteo',
    dataMode: 'live',
  };

  it('TC-1: 6-Hour Heavy Rain (Deferral & Water Savings)', () => {
    // Initial moisture is dry (26%), below dryThreshold (35%)
    // Upcoming 6h forecast has 20 mm rain (worth +10% moisture -> 36%, exceeds dryThreshold)
    const forecast = [
      { timestamp: '2026-10-14T13:00:00.000Z', precipitation: 5.0 },
      { timestamp: '2026-10-14T14:00:00.000Z', precipitation: 5.0 },
      { timestamp: '2026-10-14T15:00:00.000Z', precipitation: 5.0 },
      { timestamp: '2026-10-14T16:00:00.000Z', precipitation: 5.0 },
      { timestamp: '2026-10-14T17:00:00.000Z', precipitation: 0.0 },
      { timestamp: '2026-10-14T18:00:00.000Z', precipitation: 0.0 },
      // Beyond 6h window: should NOT be included in 6h window sum
      { timestamp: '2026-10-14T22:00:00.000Z', precipitation: 50.0 },
    ];

    const env = { ...baseEnvironmentState, forecast };
    const result = compareIrrigation(env, 26.0, { forecastWindowHours: 6 });

    // Conventional irrigates full deficit: (60 - 26) / 0.5 = 68 mm
    assert.strictEqual(result.conventional.decision, 'IRRIGATE');
    assert.strictEqual(result.conventional.waterAppliedMm, 68.0);
    assert.strictEqual(result.conventional.projectedMoisture, 60.0);

    // Forecast-aware defers irrigation (0 mm) and advises re-evaluation
    assert.strictEqual(result.forecastAware.decision, 'DEFER');
    assert.strictEqual(result.forecastAware.waterAppliedMm, 0.0);
    assert.strictEqual(result.forecastAware.projectedMoisture, 36.0);
    assert.strictEqual(result.forecastAware.fallbackApplied, false);
    assert.ok(result.forecastAware.reason.includes('deferred until after the rain event'));

    // Comparison summary
    assert.strictEqual(result.comparison.waterSavedMm, 68.0);
    assert.strictEqual(result.comparison.waterSavedPercent, 100.0);
    assert.strictEqual(result.comparison.recommendation, 'FORECAST_AWARE');
  });

  it('TC-2: Window Boundary Respect (Ignores rain past 6h window)', () => {
    // 0 mm rain in first 6 hours, 30 mm rain at hour 8
    const forecast = [
      { timestamp: '2026-10-14T13:00:00.000Z', precipitation: 0.0 },
      { timestamp: '2026-10-14T14:00:00.000Z', precipitation: 0.0 },
      { timestamp: '2026-10-14T15:00:00.000Z', precipitation: 0.0 },
      { timestamp: '2026-10-14T16:00:00.000Z', precipitation: 0.0 },
      { timestamp: '2026-10-14T17:00:00.000Z', precipitation: 0.0 },
      { timestamp: '2026-10-14T18:00:00.000Z', precipitation: 0.0 },
      { timestamp: '2026-10-14T20:00:00.000Z', precipitation: 30.0 }, // Hour 8: out of 6h window
    ];

    const env = { ...baseEnvironmentState, forecast };
    const result = compareIrrigation(env, 26.0, { forecastWindowHours: 6 });

    // Both should irrigate full deficit since 6h window has 0 rain
    assert.strictEqual(result.conventional.decision, 'IRRIGATE');
    assert.strictEqual(result.conventional.waterAppliedMm, 68.0);

    assert.strictEqual(result.forecastAware.decision, 'IRRIGATE');
    assert.strictEqual(result.forecastAware.waterAppliedMm, 68.0);
    assert.strictEqual(result.comparison.waterSavedMm, 0.0);
    assert.strictEqual(result.comparison.recommendation, 'CONVENTIONAL');
  });

  it('TC-3: Missing/Null Forecast Precipitation (Safe Conventional Fallback)', () => {
    // Interval 3 has null precipitation: must NOT assume 0 mm rain
    const forecast = [
      { timestamp: '2026-10-14T13:00:00.000Z', precipitation: 0.0 },
      { timestamp: '2026-10-14T14:00:00.000Z', precipitation: 5.0 },
      { timestamp: '2026-10-14T15:00:00.000Z', precipitation: null }, // Missing/null
      { timestamp: '2026-10-14T16:00:00.000Z', precipitation: 5.0 },
      { timestamp: '2026-10-14T17:00:00.000Z', precipitation: 0.0 },
      { timestamp: '2026-10-14T18:00:00.000Z', precipitation: 0.0 },
    ];

    const env = { ...baseEnvironmentState, forecast };
    const result = compareIrrigation(env, 25.0, { forecastWindowHours: 6 });

    assert.strictEqual(result.forecastAware.forecastStatus, 'INSUFFICIENT');
    assert.strictEqual(result.forecastAware.fallbackApplied, true);
    assert.strictEqual(result.forecastAware.decision, 'IRRIGATE');
    assert.strictEqual(result.forecastAware.waterAppliedMm, 70.0);
    assert.ok(result.warnings.length > 0);
    assert.ok(result.warnings[0].includes('missing, null, or invalid precipitation'));
  });

  it('TC-4: Completely Missing Forecast Array (Graceful Degradation)', () => {
    const env = { ...baseEnvironmentState, forecast: null };
    const result = compareIrrigation(env, 25.0);

    assert.strictEqual(result.forecastAware.forecastStatus, 'UNAVAILABLE');
    assert.strictEqual(result.forecastAware.fallbackApplied, true);
    assert.strictEqual(result.forecastAware.decision, 'IRRIGATE');
    assert.strictEqual(result.forecastAware.waterAppliedMm, 70.0);
    assert.ok(result.warnings.length > 0);
    assert.ok(result.warnings[0].includes('absent, null, or empty'));
  });

  it('TC-5: Partial Rain (Reduced Irrigation)', () => {
    // Initial moisture: 20%. Target: 60%. Absorption: 0.5.
    // 6h rain: 10 mm -> +5% moisture gain (soil reaches 25%, still below dryThreshold 35%)
    // Deficit to target: 60 - (20 + 5) = 35% -> 35 / 0.5 = 70 mm water applied
    // Conventional applies: (60 - 20) / 0.5 = 80 mm water
    const forecast = [
      { timestamp: '2026-10-14T13:00:00.000Z', precipitation: 2.0 },
      { timestamp: '2026-10-14T14:00:00.000Z', precipitation: 3.0 },
      { timestamp: '2026-10-14T15:00:00.000Z', precipitation: 5.0 },
      { timestamp: '2026-10-14T16:00:00.000Z', precipitation: 0.0 },
      { timestamp: '2026-10-14T17:00:00.000Z', precipitation: 0.0 },
      { timestamp: '2026-10-14T18:00:00.000Z', precipitation: 0.0 },
    ];

    const env = { ...baseEnvironmentState, forecast };
    const result = compareIrrigation(env, 20.0, { forecastWindowHours: 6 });

    assert.strictEqual(result.conventional.decision, 'IRRIGATE');
    assert.strictEqual(result.conventional.waterAppliedMm, 80.0);

    assert.strictEqual(result.forecastAware.decision, 'REDUCE');
    assert.strictEqual(result.forecastAware.waterAppliedMm, 70.0);
    assert.strictEqual(result.forecastAware.projectedMoisture, 60.0);
    assert.strictEqual(result.comparison.waterSavedMm, 10.0);
    assert.strictEqual(result.comparison.waterSavedPercent, 12.5);
  });

  it('TC-6: Adequate Soil Moisture (No Irrigation Needed)', () => {
    const forecast = [
      { timestamp: '2026-10-14T13:00:00.000Z', precipitation: 0.0 },
      { timestamp: '2026-10-14T14:00:00.000Z', precipitation: 0.0 },
      { timestamp: '2026-10-14T15:00:00.000Z', precipitation: 0.0 },
      { timestamp: '2026-10-14T16:00:00.000Z', precipitation: 0.0 },
      { timestamp: '2026-10-14T17:00:00.000Z', precipitation: 0.0 },
      { timestamp: '2026-10-14T18:00:00.000Z', precipitation: 0.0 },
    ];

    const env = { ...baseEnvironmentState, forecast };
    const result = compareIrrigation(env, 65.0, { forecastWindowHours: 6 });

    assert.strictEqual(result.conventional.decision, 'SKIP');
    assert.strictEqual(result.conventional.waterAppliedMm, 0.0);

    assert.strictEqual(result.forecastAware.decision, 'SKIP');
    assert.strictEqual(result.forecastAware.waterAppliedMm, 0.0);

    assert.strictEqual(result.comparison.waterSavedMm, 0.0);
    assert.strictEqual(result.comparison.recommendation, 'NONE_NEEDED');
  });

  it('TC-7: Separate Starting Moisture Handling', () => {
    // environmentState has no soilMoisture field, starting moisture passed as 2nd arg
    const env = { ...baseEnvironmentState };
    delete env.soilMoisture;

    const result = compareIrrigation(env, 28.0);
    assert.strictEqual(result.scenario.initialSoilMoisture, 28.0);
    assert.strictEqual(result.conventional.waterAppliedMm, 64.0);
  });

  it('TC-8: Object Immutability Guarantee', () => {
    const forecast = [
      { timestamp: '2026-10-14T13:00:00.000Z', precipitation: 10.0 },
      { timestamp: '2026-10-14T14:00:00.000Z', precipitation: 10.0 },
      { timestamp: '2026-10-14T15:00:00.000Z', precipitation: 0.0 },
      { timestamp: '2026-10-14T16:00:00.000Z', precipitation: 0.0 },
      { timestamp: '2026-10-14T17:00:00.000Z', precipitation: 0.0 },
      { timestamp: '2026-10-14T18:00:00.000Z', precipitation: 0.0 },
    ];
    const env = { ...baseEnvironmentState, forecast };
    const snapshotBefore = JSON.stringify(env);

    compareIrrigation(env, 25.0);

    const snapshotAfter = JSON.stringify(env);
    assert.strictEqual(snapshotBefore, snapshotAfter, 'Input environmentState was mutated!');
  });

  it('TC-9: Configuration Validations & Clamping', () => {
    // 1. targetMoisture <= dryThreshold should throw
    assert.throws(
      () => compareIrrigation(baseEnvironmentState, 20.0, { dryThreshold: 50, targetMoisture: 40 }),
      /targetMoisture .* must be greater than dryThreshold/
    );

    // 2. Negative absorptionFactor should throw
    assert.throws(
      () => compareIrrigation(baseEnvironmentState, 20.0, { absorptionFactor: -0.5 }),
      /Invalid absorptionFactor/
    );

    // 3. Negative forecastWindowHours should throw
    assert.throws(
      () => compareIrrigation(baseEnvironmentState, 20.0, { forecastWindowHours: 0 }),
      /Invalid forecastWindowHours/
    );

    // 4. Invalid initial soil moisture should throw
    assert.throws(
      () => compareIrrigation(baseEnvironmentState, -5.0),
      /Invalid initialSoilMoisture/
    );
    assert.throws(
      () => compareIrrigation(baseEnvironmentState, 105.0),
      /Invalid initialSoilMoisture/
    );

    // 5. Clamping: waterAppliedMm is never negative and projected moisture bounded [0, 100]
    const conv = evaluateConventionalStrategy(10.0, { dryThreshold: 35, targetMoisture: 60, absorptionFactor: 0.5 });
    assert.ok(conv.waterAppliedMm >= 0);
    assert.ok(conv.projectedMoisture <= 100 && conv.projectedMoisture >= 0);
  });

  it('TC-10: filterForecastWindow helper functionality', () => {
    const forecast = [
      { timestamp: '2026-10-14T13:00:00.000Z', precipitation: 2.0 },
      { timestamp: '2026-10-14T14:00:00.000Z', precipitation: 4.0 },
      { timestamp: '2026-10-14T15:00:00.000Z', precipitation: 6.0 },
      { timestamp: '2026-10-14T16:00:00.000Z', precipitation: 1.0 },
      { timestamp: '2026-10-14T17:00:00.000Z', precipitation: 0.0 },
      { timestamp: '2026-10-14T18:00:00.000Z', precipitation: 0.0 },
    ];

    const res = filterForecastWindow(forecast, '2026-10-14T12:00:00.000Z', 6);
    assert.strictEqual(res.status, 'VALID');
    assert.strictEqual(res.intervals.length, 6);
    assert.strictEqual(res.totalRainMm, 13.0);
    assert.strictEqual(res.warnings.length, 0);
  });

  it('TC-11: evaluateForecastAwareStrategy direct evaluation', () => {
    const forecast = [
      { timestamp: '2026-10-14T13:00:00.000Z', precipitation: 15.0 },
      { timestamp: '2026-10-14T14:00:00.000Z', precipitation: 5.0 },
      { timestamp: '2026-10-14T15:00:00.000Z', precipitation: 0.0 },
      { timestamp: '2026-10-14T16:00:00.000Z', precipitation: 0.0 },
      { timestamp: '2026-10-14T17:00:00.000Z', precipitation: 0.0 },
      { timestamp: '2026-10-14T18:00:00.000Z', precipitation: 0.0 },
    ];

    const result = evaluateForecastAwareStrategy(28.0, forecast, {}, '2026-10-14T12:00:00.000Z');
    assert.strictEqual(result.decision, 'DEFER');
    assert.strictEqual(result.waterAppliedMm, 0.0);
    assert.strictEqual(result.fallbackApplied, false);
    assert.ok(result.reason.includes('deferred until after the rain event'));
  });
});
