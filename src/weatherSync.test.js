import assert from 'node:assert';
import { describe, it } from 'node:test';

/**
 * Pure helper mirroring the weather categorization logic in App.jsx
 */
export function classifyWeatherCondition(weatherCode, precipitation = 0.0, weatherState = '', scenario = 'live') {
  const stateStr = (weatherState || '').toLowerCase();

  const isThunderstorm =
    weatherCode === 95 ||
    weatherCode === 96 ||
    weatherCode === 99 ||
    stateStr.includes('thunder');

  const isHeavyRain =
    !isThunderstorm &&
    (weatherCode === 65 ||
      weatherCode === 67 ||
      weatherCode === 82 ||
      (typeof precipitation === 'number' && precipitation >= 4.0) ||
      scenario === 'heavy-rain');

  const isDrizzle =
    !isThunderstorm &&
    !isHeavyRain &&
    ((weatherCode >= 51 && weatherCode <= 57) ||
      (typeof precipitation === 'number' && precipitation > 0 && precipitation < 1.0) ||
      stateStr.includes('drizzle'));

  const isModerateRain =
    !isThunderstorm &&
    !isHeavyRain &&
    !isDrizzle &&
    ((weatherCode >= 61 && weatherCode <= 64) ||
      weatherCode === 66 ||
      weatherCode === 80 ||
      weatherCode === 81 ||
      (typeof precipitation === 'number' && precipitation >= 1.0) ||
      scenario === 'rainy');

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
      scenario === 'cloudy' ||
      stateStr.includes('cloud') ||
      stateStr.includes('overcast') ||
      stateStr.includes('fog'));

  const isSunny = !hasPrecipitation && !isCloudy;

  return {
    hasPrecipitation,
    precipitationType,
    isDrizzle,
    isModerateRain,
    isHeavyRain,
    isThunderstorm,
    isCloudy,
    isSunny,
  };
}

/**
 * Pure helper mirroring resilient fallback state reducer in loadLiveWeatherData
 */
export function reduceWeatherOnFailure(previousState, fallbackDefault) {
  // If valid telemetry already exists, preserve it! Do not overwrite with clear-sky dummy.
  return previousState || fallbackDefault;
}

describe('Weather Synchronization & Farm Twin State Machine Test Suite', () => {
  it('WS-1: Moderate drizzle / drizzle classification (codes 51-57 or light precipitation)', () => {
    // WMO 51: Light drizzle, 0.4 mm/h
    const res1 = classifyWeatherCondition(51, 0.4, 'Light drizzle');
    assert.strictEqual(res1.hasPrecipitation, true);
    assert.strictEqual(res1.precipitationType, 'drizzle');
    assert.strictEqual(res1.isDrizzle, true);
    assert.strictEqual(res1.isHeavyRain, false);

    // WMO 53: Moderate drizzle, 0.0 mm/h reported
    const res2 = classifyWeatherCondition(53, 0.0, 'Moderate drizzle');
    assert.strictEqual(res2.hasPrecipitation, true);
    assert.strictEqual(res2.precipitationType, 'drizzle');
  });

  it('WS-2: Moderate rain & rain shower classification (codes 61-63, 80-81, 1.0-4.0mm)', () => {
    // WMO 61: Slight rain
    const res1 = classifyWeatherCondition(61, 1.8, 'Slight rain');
    assert.strictEqual(res1.hasPrecipitation, true);
    assert.strictEqual(res1.precipitationType, 'rain');

    // WMO 80: Slight rain showers
    const res2 = classifyWeatherCondition(80, 2.2, 'Slight rain showers');
    assert.strictEqual(res2.hasPrecipitation, true);
    assert.strictEqual(res2.precipitationType, 'rain');
  });

  it('WS-3: Heavy rain & violent showers (codes 65, 82, >=4.0mm)', () => {
    // WMO 65: Heavy rain
    const res1 = classifyWeatherCondition(65, 6.0, 'Heavy rain');
    assert.strictEqual(res1.hasPrecipitation, true);
    assert.strictEqual(res1.precipitationType, 'heavy_rain');
    assert.strictEqual(res1.isHeavyRain, true);

    // WMO 82: Violent rain showers
    const res2 = classifyWeatherCondition(82, 7.5, 'Violent rain showers');
    assert.strictEqual(res2.hasPrecipitation, true);
    assert.strictEqual(res2.precipitationType, 'heavy_rain');
  });

  it('WS-4: Thunderstorm classification (codes 95, 96, 99 or thunderstorm state)', () => {
    const res1 = classifyWeatherCondition(95, 3.5, 'Thunderstorm');
    assert.strictEqual(res1.hasPrecipitation, true);
    assert.strictEqual(res1.precipitationType, 'thunderstorm');
    assert.strictEqual(res1.isThunderstorm, true);
  });

  it('WS-5: Overcast & cloudy condition produces zero precipitation', () => {
    // WMO 3: Overcast, 0.0 precipitation
    const res = classifyWeatherCondition(3, 0.0, 'Overcast');
    assert.strictEqual(res.hasPrecipitation, false);
    assert.strictEqual(res.precipitationType, 'none');
    assert.strictEqual(res.isCloudy, true);
    assert.strictEqual(res.isSunny, false);
  });

  it('WS-6: Clear / sunny condition terminates precipitation and activates sunny sky', () => {
    // WMO 0: Clear sky
    const res = classifyWeatherCondition(0, 0.0, 'Clear sky');
    assert.strictEqual(res.hasPrecipitation, false);
    assert.strictEqual(res.precipitationType, 'none');
    assert.strictEqual(res.isCloudy, false);
    assert.strictEqual(res.isSunny, true);
  });

  it('WS-7: Resilient fallback preserves rainy weather across network errors', () => {
    const validRainyState = {
      temperature: 16.2,
      humidity: 88,
      windSpeed: 14.5,
      precipitation: 3.2,
      weatherCode: 63,
      weatherState: 'Moderate rain',
      updatedAt: '2026-10-15T14:00:00.000Z',
    };

    const dummyFallback = {
      temperature: 22.4,
      precipitation: 0.0,
      weatherCode: 1,
      weatherState: 'Mainly clear',
    };

    // When network fails while already on a valid rainy state, preserve rainy state!
    const preservedState = reduceWeatherOnFailure(validRainyState, dummyFallback);
    assert.strictEqual(preservedState.weatherCode, 63);
    assert.strictEqual(preservedState.weatherState, 'Moderate rain');
    assert.strictEqual(preservedState.precipitation, 3.2);

    // Only use default fallback if initial mount had no previous state
    const initialState = reduceWeatherOnFailure(null, dummyFallback);
    assert.strictEqual(initialState.weatherCode, 1);
  });
});
