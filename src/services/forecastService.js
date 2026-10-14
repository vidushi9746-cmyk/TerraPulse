/**
 * Forecast Service for TerraPulse
 *
 * Provides hourly weather forecast data using the Open-Meteo Forecast API.
 * Uses native browser fetch with no external dependencies or backend required.
 */

import { getWeatherState } from './weatherService.js';

const FORECAST_API_BASE_URL = 'https://api.open-meteo.com/v1/forecast';

/**
 * Validates geographic coordinates and forecast days.
 *
 * @param {number} latitude - Latitude in degrees (-90 to 90).
 * @param {number} longitude - Longitude in degrees (-180 to 180).
 * @param {number} days - Number of forecast days (integer from 1 to 7).
 * @throws {Error} If coordinates or days are invalid.
 */
function validateInputs(latitude, longitude, days) {
  if (
    typeof latitude !== 'number' ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new Error(
      `Invalid coordinates: latitude must be a finite number between -90 and 90. Received: ${latitude}`
    );
  }

  if (
    typeof longitude !== 'number' ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error(
      `Invalid coordinates: longitude must be a finite number between -180 and 180. Received: ${longitude}`
    );
  }

  if (
    typeof days !== 'number' ||
    !Number.isInteger(days) ||
    days < 1 ||
    days > 7
  ) {
    throw new Error(
      `Invalid forecast days: days must be an integer between 1 and 7. Received: ${days}`
    );
  }
}

/**
 * Converts an Open-Meteo UTC time string (e.g. "2026-10-14T00:00") into a standard ISO 8601 UTC timestamp ending in "Z".
 *
 * @param {string} timeStr - Time string from Open-Meteo returned in UTC.
 * @returns {string} Standard ISO 8601 timestamp ending in "Z".
 * @throws {Error} If the timestamp string cannot be parsed into a valid Date.
 */
function toIsoUtcTimestamp(timeStr) {
  if (typeof timeStr !== 'string' || !timeStr.trim()) {
    throw new Error(`Malformed timestamp: expected non-empty string, received ${timeStr}`);
  }
  const clean = timeStr.trim();
  const utcString = clean.endsWith('Z') ? clean : `${clean}Z`;
  const date = new Date(utcString);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Malformed timestamp: unable to parse "${timeStr}" as a valid UTC timestamp`);
  }
  return date.toISOString();
}

/**
 * Fetches hourly weather forecast data for the given coordinates and day range.
 *
 * @param {number} latitude - Latitude of the target location (-90 to 90).
 * @param {number} longitude - Longitude of the target location (-180 to 180).
 * @param {number} [days=3] - Number of forecast days (1 to 7).
 * @returns {Promise<Array<{
 *   timestamp: string,
 *   temperature: number|null,
 *   humidity: number|null,
 *   windSpeed: number|null,
 *   precipitation: number|null,
 *   weatherCode: number|null,
 *   weatherState: string|null
 * }>>} An array of normalized hourly forecast objects.
 * @throws {Error} If inputs are invalid, network fails, or the API returns an error or malformed payload.
 */
export async function fetchHourlyForecast(latitude, longitude, days = 3) {
  validateInputs(latitude, longitude, days);

  const url = new URL(FORECAST_API_BASE_URL);
  url.searchParams.set('latitude', latitude.toString());
  url.searchParams.set('longitude', longitude.toString());
  url.searchParams.set(
    'hourly',
    'temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code'
  );
  url.searchParams.set('forecast_days', days.toString());
  url.searchParams.set('timezone', 'UTC');

  let response;
  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });
  } catch (networkError) {
    const message = networkError instanceof Error ? networkError.message : 'Unknown network failure';
    throw new Error(`Network error while connecting to forecast service: ${message}`, {
      cause: networkError,
    });
  }

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errorJson = await response.json();
      if (errorJson && typeof errorJson.reason === 'string') {
        errorDetail = `: ${errorJson.reason}`;
      }
    } catch {
      // Body was not JSON or could not be read; proceed with status code
    }

    throw new Error(
      `Forecast service returned an HTTP ${response.status} error${errorDetail}`
    );
  }

  let data;
  try {
    data = await response.json();
  } catch (parseError) {
    throw new Error('Malformed response: Unable to parse JSON from forecast service.', {
      cause: parseError,
    });
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Malformed response: Expected a JSON object from forecast service.');
  }

  if (data.error) {
    const reason = typeof data.reason === 'string' ? data.reason : 'Unspecified API error';
    throw new Error(`Forecast API error: ${reason}`);
  }

  if (!data.hourly || typeof data.hourly !== 'object') {
    throw new Error('Malformed response: Missing hourly forecast data from forecast service.');
  }

  const hourly = data.hourly;
  const requiredFields = [
    'time',
    'temperature_2m',
    'relative_humidity_2m',
    'wind_speed_10m',
    'precipitation',
    'weather_code',
  ];

  for (const field of requiredFields) {
    if (!Array.isArray(hourly[field])) {
      throw new Error(`Malformed response: Missing or non-array hourly field "${field}".`);
    }
  }

  const entryCount = hourly.time.length;
  for (const field of requiredFields) {
    if (hourly[field].length !== entryCount) {
      throw new Error(
        `Malformed response: Mismatched array length for hourly field "${field}" (expected ${entryCount}, received ${hourly[field].length}).`
      );
    }
  }

  const results = [];
  for (let i = 0; i < entryCount; i += 1) {
    const timestamp = toIsoUtcTimestamp(hourly.time[i]);

    const temperature =
      typeof hourly.temperature_2m[i] === 'number' && Number.isFinite(hourly.temperature_2m[i])
        ? hourly.temperature_2m[i]
        : null;

    const humidity =
      typeof hourly.relative_humidity_2m[i] === 'number' && Number.isFinite(hourly.relative_humidity_2m[i])
        ? hourly.relative_humidity_2m[i]
        : null;

    const windSpeed =
      typeof hourly.wind_speed_10m[i] === 'number' && Number.isFinite(hourly.wind_speed_10m[i])
        ? hourly.wind_speed_10m[i]
        : null;

    const precipitation =
      typeof hourly.precipitation[i] === 'number' && Number.isFinite(hourly.precipitation[i])
        ? hourly.precipitation[i]
        : null;

    const weatherCode =
      typeof hourly.weather_code[i] === 'number' && Number.isFinite(hourly.weather_code[i])
        ? hourly.weather_code[i]
        : null;

    const weatherState = weatherCode !== null ? getWeatherState(weatherCode) : null;

    results.push({
      timestamp,
      temperature,
      humidity,
      windSpeed,
      precipitation,
      weatherCode,
      weatherState,
    });
  }

  return results;
}
