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

  it('Regression 1: Exclude interval at decisionTime, include future intervals inside window, exclude beyond window (with end-to-end comparison)', () => {
    // decisionTime = '2026-10-14T12:00:00.000Z', 6-hour window (12:00 to 18:00)
    // 12:00 has 50 mm (deliberately large past rain) -> MUST BE EXCLUDED
    // 13:00 to 18:00 have 2 mm each (6 intervals * 2 mm = 12 mm future rain) -> MUST BE INCLUDED
    // 19:00 has 100 mm (deliberately large rain beyond window end) -> MUST BE EXCLUDED
    const forecast = [
      { timestamp: '2026-10-14T12:00:00.000Z', precipitation: 50.0 }, // exactly at decisionTime (past rain)
      { timestamp: '2026-10-14T13:00:00.000Z', precipitation: 2.0 },
      { timestamp: '2026-10-14T14:00:00.000Z', precipitation: 2.0 },
      { timestamp: '2026-10-14T15:00:00.000Z', precipitation: 2.0 },
      { timestamp: '2026-10-14T16:00:00.000Z', precipitation: 2.0 },
      { timestamp: '2026-10-14T17:00:00.000Z', precipitation: 2.0 },
      { timestamp: '2026-10-14T18:00:00.000Z', precipitation: 2.0 },
      { timestamp: '2026-10-14T19:00:00.000Z', precipitation: 100.0 }, // beyond window end
    ];

    // 1. Direct helper verification
    const res = filterForecastWindow(forecast, '2026-10-14T12:00:00.000Z', 6);
    assert.strictEqual(res.status, 'VALID');
    assert.strictEqual(res.intervals.length, 6);
    // Verifies 50 mm at 12:00 and 100 mm at 19:00 were excluded; exactly 12 mm future rain included
    assert.strictEqual(res.totalRainMm, 12.0);
    assert.strictEqual(res.intervals[0].timestamp, '2026-10-14T13:00:00.000Z');
    assert.strictEqual(res.intervals[5].timestamp, '2026-10-14T18:00:00.000Z');

    // 2. End-to-end irrigation comparison verification:
    // Derivation of expected decisions under starting moisture = 25.0%:
    // - dryThreshold = 35.0%, targetMoisture = 60.0%, absorptionFactor = 0.5
    // - Conventional strategy:
    //     moisture (25.0%) < dryThreshold (35.0%) -> triggers IRRIGATE
    //     deficit = 60.0 - 25.0 = 35.0%
    //     waterAppliedMm = 35.0 / 0.5 = 70.0 mm
    // - Forecast-aware strategy:
    //     future rain inside window = 12.0 mm (6 intervals * 2.0 mm)
    //     projected moisture from rain = 25.0 + (12.0 * 0.5) = 31.0%
    //     Since 31.0% < dryThreshold (35.0%) and rain (12.0 mm) >= minSignificantRainMm (5.0 mm),
    //     rule B2 applies: decision is REDUCE (NOT DEFER)
    //     netDeficit to target = 60.0 - 31.0 = 29.0%
    //     waterAppliedMm = 29.0 / 0.5 = 58.0 mm
    // - Sensitivity check (ensures test fails if excluded rain leaks in):
    //     If the 50 mm past rain at 12:00 leaked in:
    //       total rain = 62.0 mm -> projected moisture = 25.0 + 31.0 = 56.0% >= 35.0% -> falsely triggers DEFER (0.0 mm applied)
    //     If the 100 mm beyond-window rain at 19:00 leaked in:
    //       total rain = 112.0 mm -> projected moisture = 25.0 + 56.0 = 81.0% >= 35.0% -> falsely triggers DEFER (0.0 mm applied)
    const env = {
      ...baseEnvironmentState,
      updatedAt: '2026-10-14T12:00:00.000Z',
      forecast,
    };
    const compResult = compareIrrigation(env, 25.0, { forecastWindowHours: 6 });

    assert.strictEqual(compResult.conventional.decision, 'IRRIGATE');
    assert.strictEqual(compResult.conventional.waterAppliedMm, 70.0);
    assert.strictEqual(compResult.conventional.projectedMoisture, 60.0);

    assert.strictEqual(compResult.forecastAware.decision, 'REDUCE');
    assert.strictEqual(compResult.forecastAware.waterAppliedMm, 58.0);
    assert.strictEqual(compResult.forecastAware.projectedMoisture, 60.0);
    assert.strictEqual(compResult.forecastAware.fallbackApplied, false);

    assert.strictEqual(compResult.comparison.waterSavedMm, 12.0);
    assert.strictEqual(compResult.comparison.waterSavedPercent, 17.1);
    assert.strictEqual(compResult.comparison.recommendation, 'FORECAST_AWARE');
  });

  it('Regression 2: Missing middle intervals marked INSUFFICIENT and trigger conventional fallback', () => {
    // Only 2 intervals provided (13:00 and 18:00), missing 14:00, 15:00, 16:00, 17:00
    // Even though 18:00 reaches near the window end, intermediate hours are missing
    const sparseForecast = [
      { timestamp: '2026-10-14T13:00:00.000Z', precipitation: 10.0 },
      { timestamp: '2026-10-14T18:00:00.000Z', precipitation: 10.0 },
    ];

    // 1. Direct helper verification
    const windowRes = filterForecastWindow(sparseForecast, '2026-10-14T12:00:00.000Z', 6);
    assert.strictEqual(windowRes.status, 'INSUFFICIENT');
    assert.strictEqual(windowRes.totalRainMm, null); // never report sum on incomplete data
    assert.ok(windowRes.warnings.length > 0);
    assert.ok(
      windowRes.warnings.some((w) => w.includes('gap') || w.includes('incomplete'))
    );

    // 2. Full engine verification with fallback
    const env = {
      ...baseEnvironmentState,
      updatedAt: '2026-10-14T12:00:00.000Z',
      forecast: sparseForecast,
    };
    const result = compareIrrigation(env, 25.0, { forecastWindowHours: 6 });

    assert.strictEqual(result.forecastAware.forecastStatus, 'INSUFFICIENT');
    assert.strictEqual(result.forecastAware.fallbackApplied, true);
    assert.strictEqual(result.forecastAware.decision, 'IRRIGATE');
    assert.strictEqual(result.forecastAware.waterAppliedMm, 70.0); // (60 - 25) / 0.5
    assert.ok(result.forecastAware.reason.includes('falling back to conventional'));
  });

  it('Regression 3: Missing or null precipitation never becomes zero rainfall', () => {
    // 6 intervals present, but hour 3 has null and hour 5 has undefined precipitation
    const forecastWithNulls = [
      { timestamp: '2026-10-14T13:00:00.000Z', precipitation: 5.0 },
      { timestamp: '2026-10-14T14:00:00.000Z', precipitation: 5.0 },
      { timestamp: '2026-10-14T15:00:00.000Z', precipitation: null },
      { timestamp: '2026-10-14T16:00:00.000Z', precipitation: 5.0 },
      { timestamp: '2026-10-14T17:00:00.000Z', precipitation: undefined },
      { timestamp: '2026-10-14T18:00:00.000Z', precipitation: 5.0 },
    ];

    const res = filterForecastWindow(forecastWithNulls, '2026-10-14T12:00:00.000Z', 6);
    assert.strictEqual(res.status, 'INSUFFICIENT');
    assert.strictEqual(res.totalRainMm, null); // NOT 20.0 (does not treat null/undefined as 0)
    assert.ok(
      res.warnings.some((w) => w.includes('Never assuming zero rain'))
    );

    const env = {
      ...baseEnvironmentState,
      updatedAt: '2026-10-14T12:00:00.000Z',
      forecast: forecastWithNulls,
    };
    const result = compareIrrigation(env, 25.0, { forecastWindowHours: 6 });
    assert.strictEqual(result.forecastAware.fallbackApplied, true);
    assert.strictEqual(result.forecastAware.decision, 'IRRIGATE');
  });

  it('Regression 4: Fractional forecast window hours are rejected with a clear validation error', () => {
    // 1. A window shorter than one hour (e.g. 0.8) must be rejected
    assert.throws(
      () => compareIrrigation(baseEnvironmentState, 25.0, { forecastWindowHours: 0.8 }),
      /Invalid forecastWindowHours: must be a positive integer representing whole hours/
    );

    assert.throws(
      () => filterForecastWindow([], '2026-10-14T12:00:00.000Z', 0.8),
      /Invalid windowHours: must be a positive integer representing whole hours/
    );

    // 2. Fractional window greater than one hour (e.g. 2.5) must also be rejected
    assert.throws(
      () => compareIrrigation(baseEnvironmentState, 25.0, { forecastWindowHours: 2.5 }),
      /Invalid forecastWindowHours: must be a positive integer representing whole hours/
    );

    assert.throws(
      () => filterForecastWindow([], '2026-10-14T12:00:00.000Z', 2.5),
      /Invalid windowHours: must be a positive integer representing whole hours/
    );
  });

  it('Regression 5: Flat options object and currentSoilMoisture alias handling', () => {
    const forecast = [
      { timestamp: '2026-10-14T13:00:00.000Z', precipitation: 5.0 },
      { timestamp: '2026-10-14T14:00:00.000Z', precipitation: 5.0 },
      { timestamp: '2026-10-14T15:00:00.000Z', precipitation: 5.0 },
      { timestamp: '2026-10-14T16:00:00.000Z', precipitation: 5.0 },
      { timestamp: '2026-10-14T17:00:00.000Z', precipitation: 0.0 },
      { timestamp: '2026-10-14T18:00:00.000Z', precipitation: 0.0 },
    ];

    // Flat options object with currentSoilMoisture and hourlyForecast alias
    const flatResult = compareIrrigation({
      ...baseEnvironmentState,
      currentSoilMoisture: 26.0,
      hourlyForecast: forecast,
      forecastWindowHours: 6,
    });
    assert.strictEqual(flatResult.scenario.initialSoilMoisture, 26.0);
    assert.strictEqual(flatResult.forecastAware.decision, 'DEFER');

    // Missing initialSoilMoisture must still throw validation error
    assert.throws(
      () => compareIrrigation({ ...baseEnvironmentState }),
      /Invalid initialSoilMoisture: must be a finite number between 0 and 100/
    );
  });

  describe('Rainfall Considered Data Flow & Boundary Conditions', () => {
    it('RAIN-1: Non-zero rainfall is accurately accumulated and exposed on scenario and forecastAware', () => {
      const forecast = [
        { timestamp: '2026-10-14T13:00:00.000Z', precipitation: 2.0 },
        { timestamp: '2026-10-14T14:00:00.000Z', precipitation: 3.5 },
        { timestamp: '2026-10-14T15:00:00.000Z', precipitation: 1.5 },
        { timestamp: '2026-10-14T16:00:00.000Z', precipitation: 0.0 },
        { timestamp: '2026-10-14T17:00:00.000Z', precipitation: 2.5 },
        { timestamp: '2026-10-14T18:00:00.000Z', precipitation: 1.0 },
      ];
      const env = {
        ...baseEnvironmentState,
        updatedAt: '2026-10-14T12:00:00.000Z',
        forecast,
      };

      const result = compareIrrigation(env, 25.0, { forecastWindowHours: 6 });
      assert.strictEqual(result.scenario.forecastStatus, 'VALID');
      assert.strictEqual(result.scenario.totalRainMm, 10.5);
      assert.strictEqual(result.forecastAware.totalRainMm, 10.5);
      assert.strictEqual(result.comparison.totalRainMm, 10.5);
      assert.strictEqual(typeof result.scenario.totalRainMm, 'number');
    });

    it('RAIN-2: Valid zero rainfall (0.0 mm) is strictly distinguished from missing/unavailable data', () => {
      const zeroRainForecast = [
        { timestamp: '2026-10-14T13:00:00.000Z', precipitation: 0.0 },
        { timestamp: '2026-10-14T14:00:00.000Z', precipitation: 0.0 },
        { timestamp: '2026-10-14T15:00:00.000Z', precipitation: 0.0 },
        { timestamp: '2026-10-14T16:00:00.000Z', precipitation: 0.0 },
        { timestamp: '2026-10-14T17:00:00.000Z', precipitation: 0.0 },
        { timestamp: '2026-10-14T18:00:00.000Z', precipitation: 0.0 },
      ];
      const env = {
        ...baseEnvironmentState,
        updatedAt: '2026-10-14T12:00:00.000Z',
        forecast: zeroRainForecast,
      };

      const result = compareIrrigation(env, 25.0, { forecastWindowHours: 6 });
      assert.strictEqual(result.scenario.forecastStatus, 'VALID');
      assert.strictEqual(result.scenario.totalRainMm, 0);
      assert.strictEqual(result.forecastAware.totalRainMm, 0);
      assert.strictEqual(result.comparison.totalRainMm, 0);
      assert.strictEqual(typeof result.scenario.totalRainMm, 'number');
      assert.notStrictEqual(result.scenario.totalRainMm, null);
      assert.strictEqual(result.forecastAware.fallbackApplied, false);
    });

    it('RAIN-3: Missing/null precipitation fields evaluate to null totalRainMm and trigger fallback with warning', () => {
      const missingFieldForecast = [
        { timestamp: '2026-10-14T13:00:00.000Z', precipitation: 0.0 },
        { timestamp: '2026-10-14T14:00:00.000Z', precipitation: null }, // missing field
        { timestamp: '2026-10-14T15:00:00.000Z', precipitation: 0.0 },
        { timestamp: '2026-10-14T16:00:00.000Z', precipitation: undefined }, // missing field
        { timestamp: '2026-10-14T17:00:00.000Z', precipitation: 0.0 },
        { timestamp: '2026-10-14T18:00:00.000Z', precipitation: 0.0 },
      ];
      const env = {
        ...baseEnvironmentState,
        updatedAt: '2026-10-14T12:00:00.000Z',
        forecast: missingFieldForecast,
      };

      const result = compareIrrigation(env, 25.0, { forecastWindowHours: 6 });
      assert.strictEqual(result.scenario.forecastStatus, 'INSUFFICIENT');
      assert.strictEqual(result.scenario.totalRainMm, null);
      assert.strictEqual(result.forecastAware.totalRainMm, null);
      assert.strictEqual(result.comparison.totalRainMm, null);
      assert.strictEqual(result.forecastAware.fallbackApplied, true);
      assert.ok(result.warnings.some((w) => w.includes('Never assuming zero rain')));
    });

    it('RAIN-4: Incomplete forecast data (empty array or missing intervals) sets totalRainMm to null', () => {
      // Case 4A: Empty forecast array (UNAVAILABLE)
      const emptyEnv = {
        ...baseEnvironmentState,
        updatedAt: '2026-10-14T12:00:00.000Z',
        forecast: [],
      };
      const emptyResult = compareIrrigation(emptyEnv, 25.0, { forecastWindowHours: 6 });
      assert.strictEqual(emptyResult.scenario.forecastStatus, 'UNAVAILABLE');
      assert.strictEqual(emptyResult.scenario.totalRainMm, null);
      assert.strictEqual(emptyResult.forecastAware.totalRainMm, null);
      assert.strictEqual(emptyResult.comparison.totalRainMm, null);
      assert.strictEqual(emptyResult.forecastAware.fallbackApplied, true);

      // Case 4B: Incomplete coverage (only 3 of 6 hours provided) (INSUFFICIENT)
      const shortForecast = [
        { timestamp: '2026-10-14T13:00:00.000Z', precipitation: 1.0 },
        { timestamp: '2026-10-14T14:00:00.000Z', precipitation: 1.0 },
        { timestamp: '2026-10-14T15:00:00.000Z', precipitation: 1.0 },
      ];
      const shortEnv = {
        ...baseEnvironmentState,
        updatedAt: '2026-10-14T12:00:00.000Z',
        forecast: shortForecast,
      };
      const shortResult = compareIrrigation(shortEnv, 25.0, { forecastWindowHours: 6 });
      assert.strictEqual(shortResult.scenario.forecastStatus, 'INSUFFICIENT');
      assert.strictEqual(shortResult.scenario.totalRainMm, null);
      assert.strictEqual(shortResult.forecastAware.totalRainMm, null);
      assert.strictEqual(shortResult.comparison.totalRainMm, null);
      assert.strictEqual(shortResult.forecastAware.fallbackApplied, true);
    });
  });

  it('Regression 7: Safe handling of zero baseline volume (Vc = 0) and negative savings', () => {
    // When initial moisture is already optimal (e.g. 50%), conventional Vc is 0
    const env = { ...baseEnvironmentState, forecast: [] };
    const resZeroBaseline = compareIrrigation(env, 50.0);
    assert.strictEqual(resZeroBaseline.conventional.waterAppliedMm, 0);
    assert.strictEqual(resZeroBaseline.comparison.waterSavedMm, 0);
    assert.strictEqual(resZeroBaseline.comparison.waterSavedPercent, null);
    assert.strictEqual(resZeroBaseline.comparison.waterSavedPercentDisplay, 'N/A');
    assert.strictEqual(resZeroBaseline.comparison.recommendation, 'NONE_NEEDED');

    // Test comparison math directly with mock strategies where Vf > Vc
    const mockConventional = { waterAppliedMm: 20.0, decision: 'IRRIGATE' };
    const mockForecastAware = { waterAppliedMm: 30.0, decision: 'IRRIGATE' };
    const rawSaved = mockConventional.waterAppliedMm - mockForecastAware.waterAppliedMm; // -10.0
    const savedMm = Math.round(rawSaved * 100) / 100;
    const savedPercent = Math.round((rawSaved / mockConventional.waterAppliedMm) * 1000) / 10; // -50.0%

    assert.strictEqual(savedMm, -10.0);
    assert.strictEqual(savedPercent, -50.0);
  });
});
