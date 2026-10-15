import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  formatDecimal,
  formatPrecipitation,
  formatTemperature,
  formatSoilMoisture,
} from './utils/formatters.js';
import { estimateSoilMoisture } from './farmSimulation.js';
import { compareIrrigation } from './irrigationEngine.js';

describe('Formatting Utilities & Recovery Error Regression Test Suite', () => {
  it('FMT-1: Normal finite numeric values format correctly with expected precision', () => {
    assert.strictEqual(formatDecimal(2.456, 1), '2.5');
    assert.strictEqual(formatDecimal(2.456, 2), '2.46');
    assert.strictEqual(formatDecimal(0, 1), '0.0');
    assert.strictEqual(formatPrecipitation(4.5), '4.5 mm/h');
    assert.strictEqual(formatPrecipitation(0.0), '0.0 mm/h');
    assert.strictEqual(formatTemperature(22.5, '°C'), '22.5°C');
    assert.strictEqual(formatTemperature(72.4, '°F'), '72.4°F');
    assert.strictEqual(formatSoilMoisture(34.567, 2), '34.57%');
  });

  it('FMT-2: Null or undefined readings display the intended fallback without throwing TypeError', () => {
    // formatDecimal
    assert.strictEqual(formatDecimal(null, 1, '—'), '—');
    assert.strictEqual(formatDecimal(undefined, 1, '—'), '—');
    assert.strictEqual(formatDecimal(null, 2, 'N/A'), 'N/A');

    // formatPrecipitation
    assert.strictEqual(formatPrecipitation(null), '—');
    assert.strictEqual(formatPrecipitation(undefined), '—');
    assert.strictEqual(formatPrecipitation(null, 'N/A'), 'N/A');

    // formatTemperature
    assert.strictEqual(formatTemperature(null), '--');
    assert.strictEqual(formatTemperature(undefined), '--');

    // formatSoilMoisture
    assert.strictEqual(formatSoilMoisture(null), 'N/A%');
    assert.strictEqual(formatSoilMoisture(undefined), 'N/A%');
  });

  it('FMT-3: NaN and non-finite numbers do not crash or invoke .toFixed() unsafely', () => {
    assert.strictEqual(formatDecimal(NaN, 1, '—'), '—');
    assert.strictEqual(formatDecimal(Infinity, 1, '—'), '—');
    assert.strictEqual(formatDecimal(-Infinity, 1, '—'), '—');
    assert.strictEqual(formatPrecipitation(NaN), '—');
    assert.strictEqual(formatPrecipitation(Infinity), '—');
    assert.strictEqual(formatTemperature(NaN), '--');
    assert.strictEqual(formatSoilMoisture(NaN), 'N/A%');
  });

  it('FMT-4: Valid soil-moisture values retain their existing 2-decimal precision', () => {
    assert.strictEqual(formatSoilMoisture(34.0, 2), '34.00%');
    assert.strictEqual(formatSoilMoisture(29.58, 2), '29.58%');
    assert.strictEqual(formatSoilMoisture(60.123, 2), '60.12%');
  });

  it('FMT-5: Missing precipitation remains unknown and is never converted to 0.0 mm/h', () => {
    // A null rainfall value must strictly format as '—', NOT '0.0 mm/h'
    const nullRainFormatted = formatPrecipitation(null);
    assert.strictEqual(nullRainFormatted, '—');
    assert.notStrictEqual(nullRainFormatted, '0.0 mm/h');

    // Confirm that 0.0 mm/h is only returned when confirmed zero rain is passed
    const confirmedZeroFormatted = formatPrecipitation(0.0);
    assert.strictEqual(confirmedZeroFormatted, '0.0 mm/h');
  });

  it('FMT-6: Irrigation decisions and simulation behavior remain unchanged for valid inputs', () => {
    // Verify core simulation formula
    const simResult = estimateSoilMoisture(34.0, 25.0, 50, 10.0, 0.0);
    assert.strictEqual(typeof simResult.soilMoisture, 'number');
    assert.ok(simResult.soilMoisture < 34.0);

    // Verify irrigation engine contract
    const env = {
      location: 'Test Farm',
      latitude: 45.0,
      longitude: -122.0,
      updatedAt: '2026-10-15T12:00:00.000Z',
      forecast: [
        { timestamp: '2026-10-15T13:00:00.000Z', precipitation: 10.0 },
        { timestamp: '2026-10-15T14:00:00.000Z', precipitation: 0.0 },
        { timestamp: '2026-10-15T15:00:00.000Z', precipitation: 0.0 },
        { timestamp: '2026-10-15T16:00:00.000Z', precipitation: 0.0 },
        { timestamp: '2026-10-15T17:00:00.000Z', precipitation: 0.0 },
        { timestamp: '2026-10-15T18:00:00.000Z', precipitation: 0.0 },
      ],
    };

    const res = compareIrrigation(env, 32.0, { forecastWindowHours: 6 });
    assert.strictEqual(res.forecastAware.decision, 'DEFER');
    assert.strictEqual(res.comparison.waterSavedMm, 56.0);
    assert.strictEqual(res.scenario.totalRainMm, 10.0);
  });
});
