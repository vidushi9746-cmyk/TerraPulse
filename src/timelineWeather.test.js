import assert from 'node:assert';
import { describe, it } from 'node:test';

/**
 * Pure helper mirroring timeline forecast indexing logic implemented in App.jsx & WeatherSelector.jsx
 */
export function findForecastBaseIndex(hourlyForecast, updatedAt) {
  if (!hourlyForecast || hourlyForecast.length === 0 || !updatedAt) return 0;
  const baseTime = new Date(updatedAt).getTime();
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
}

export function sliceNext12Hours(hourlyForecast, updatedAt) {
  if (!Array.isArray(hourlyForecast) || hourlyForecast.length === 0) return [];
  const startIdx = findForecastBaseIndex(hourlyForecast, updatedAt);
  return hourlyForecast.slice(startIdx, startIdx + 12);
}

export function resolveTimelineWeather(hourlyForecast, baseIndex, hourOffset, fallbackWeather) {
  const targetIdx = baseIndex + hourOffset;
  if (hourlyForecast && hourlyForecast[targetIdx]) {
    return hourlyForecast[targetIdx];
  }
  if (hourlyForecast && hourlyForecast.length > 0) {
    return hourlyForecast[hourlyForecast.length - 1];
  }
  return fallbackWeather;
}

describe('Forecast Timeline & Real-Time Horizon Test Suite', () => {
  // Generate 72-hour mock forecast starting at 2026-10-15T00:00:00Z (midnight UTC)
  const baseMidnight = new Date('2026-10-15T00:00:00.000Z');
  const mock72hForecast = Array.from({ length: 72 }, (_, i) => {
    const t = new Date(baseMidnight.getTime() + i * 3600 * 1000).toISOString();
    return {
      timestamp: t,
      temperature: 20 + Math.sin(i * 0.2) * 5,
      humidity: 50,
      windSpeed: 10,
      precipitation: i >= 18 && i <= 21 ? 2.5 : 0.0,
      weatherCode: i >= 18 && i <= 21 ? 61 : 1,
    };
  });

  it('TL-1: Finds correct current-hour base index in 72h forecast starting at midnight', () => {
    // Current time is 14:15 UTC (2:15 PM)
    const currentTime = '2026-10-15T14:15:00.000Z';
    const baseIdx = findForecastBaseIndex(mock72hForecast, currentTime);
    // Index 14 corresponds to 14:00 UTC (closest to 14:15)
    assert.strictEqual(baseIdx, 14);
    assert.strictEqual(mock72hForecast[baseIdx].timestamp, '2026-10-15T14:00:00.000Z');
  });

  it('TL-2: Timesteps step into future hours, NOT past midnight hours', () => {
    const currentTime = '2026-10-15T14:15:00.000Z';
    const baseIdx = findForecastBaseIndex(mock72hForecast, currentTime);

    // Step 0 = 14:00
    const step0 = resolveTimelineWeather(mock72hForecast, baseIdx, 0, null);
    assert.strictEqual(step0.timestamp, '2026-10-15T14:00:00.000Z');

    // Step 1 = 15:00 (1 hour in future)
    const step1 = resolveTimelineWeather(mock72hForecast, baseIdx, 1, null);
    assert.strictEqual(step1.timestamp, '2026-10-15T15:00:00.000Z');

    // Step 5 = 19:00 (5 hours in future, encountering rain at index 19)
    const step5 = resolveTimelineWeather(mock72hForecast, baseIdx, 5, null);
    assert.strictEqual(step5.timestamp, '2026-10-15T19:00:00.000Z');
    assert.strictEqual(step5.precipitation, 2.5);
  });

  it('TL-3: Slices upcoming 12 hours from current time, not midnight past', () => {
    const currentTime = '2026-10-15T14:15:00.000Z';
    const next12 = sliceNext12Hours(mock72hForecast, currentTime);

    assert.strictEqual(next12.length, 12);
    assert.strictEqual(next12[0].timestamp, '2026-10-15T14:00:00.000Z');
    assert.strictEqual(next12[11].timestamp, '2026-10-15T01:00:00.000Z' > next12[0].timestamp ? next12[11].timestamp : next12[11].timestamp);
    // 14:00 + 11 hours = 2026-10-16T01:00:00.000Z
    assert.strictEqual(next12[11].timestamp, '2026-10-16T01:00:00.000Z');
  });

  it('TL-4: Beyond forecast range safely returns last forecast item without error', () => {
    const currentTime = '2026-10-15T14:15:00.000Z';
    const baseIdx = findForecastBaseIndex(mock72hForecast, currentTime);
    // Offset 100 is beyond 72h
    const farFuture = resolveTimelineWeather(mock72hForecast, baseIdx, 100, null);
    assert.strictEqual(farFuture.timestamp, mock72hForecast[mock72hForecast.length - 1].timestamp);
  });

  it('TL-5: Graceful fallback when forecast is empty or null', () => {
    const fallback = { tempC: 22, humidity: 50, windSpeed: 10, precipitation: 0 };
    const resEmpty = resolveTimelineWeather([], 0, 3, fallback);
    assert.deepStrictEqual(resEmpty, fallback);

    const resNull = resolveTimelineWeather(null, 0, 3, fallback);
    assert.deepStrictEqual(resNull, fallback);

    const baseEmpty = findForecastBaseIndex([], '2026-10-15T14:15:00.000Z');
    assert.strictEqual(baseEmpty, 0);

    const baseNullTime = findForecastBaseIndex(mock72hForecast, null);
    assert.strictEqual(baseNullTime, 0);
  });
});
