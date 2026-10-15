/**
 * Weather Service for TerraPulse
 *
 * Provides real-time current weather data using the Open-Meteo Forecast API.
 * Uses native browser fetch with no external dependencies or backend required.
 */

const WEATHER_API_BASE_URL = 'https://api.open-meteo.com/v1/forecast';

/**
 * Standard WMO Weather interpretation codes (WW) mapped to readable descriptions.
 * @see https://open-meteo.com/en/docs
 */
export const WMO_WEATHER_CODES = Object.freeze({
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
});

/**
 * Maps a WMO weather code to a human-readable weather condition.
 *
 * @param {number|null|undefined} code - The numeric WMO weather code.
 * @returns {string} The readable description, or "unknown" if missing or unrecognized.
 */
export function getWeatherState(code) {
  if (
    typeof code === 'number' &&
    Number.isFinite(code) &&
    Object.prototype.hasOwnProperty.call(WMO_WEATHER_CODES, code)
  ) {
    return WMO_WEATHER_CODES[code];
  }
  return 'unknown';
}

/**
 * Converts a wind direction in degrees (0-360) to a 16-wind compass point.
 *
 * @param {number|null|undefined} degrees - Wind direction in degrees (0° = North, 90° = East).
 * @returns {string|null} Compass direction code (e.g., 'N', 'NW', 'SSW') or null if invalid.
 */
export function degreesToCompass(degrees) {
  if (typeof degrees !== 'number' || !Number.isFinite(degrees)) {
    return null;
  }
  const normalized = ((degrees % 360) + 360) % 360;
  const sectors = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW',
  ];
  const index = Math.round(normalized / 22.5) % 16;
  return sectors[index];
}

/**
 * Validates geographic coordinates.
 *
 * @param {number} latitude - Latitude in degrees (-90 to 90).
 * @param {number} longitude - Longitude in degrees (-180 to 180).
 * @throws {Error} If coordinates are not finite numbers or exceed geographic boundaries.
 */
function validateCoordinates(latitude, longitude) {
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
}

/**
 * Fetches current weather data for the specified coordinates from Open-Meteo.
 *
 * @param {number} latitude - Latitude of the location (-90 to 90).
 * @param {number} longitude - Longitude of the location (-180 to 180).
 * @returns {Promise<{
 *   temperature: number|null,
 *   humidity: number|null,
 *   windSpeed: number|null,
 *   precipitation: number|null,
 *   weatherCode: number|null,
 *   weatherState: string,
 *   updatedAt: string,
 *   source: string,
 *   dataMode: string
 * }>} Normalized current weather object.
 * @throws {Error} If coordinates are invalid, network fails, or the API returns an error or malformed payload.
 */
export async function fetchCurrentWeather(latitude, longitude) {
  // Validate coordinates client-side before dispatching network request
  validateCoordinates(latitude, longitude);

  const url = new URL(WEATHER_API_BASE_URL);
  url.searchParams.set('latitude', latitude.toString());
  url.searchParams.set('longitude', longitude.toString());
  url.searchParams.set(
    'current',
    'temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,surface_pressure,precipitation,weather_code,shortwave_radiation,soil_temperature_6cm'
  );
  url.searchParams.set('timezone', 'auto');

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
    throw new Error(`Network error while connecting to weather service: ${message}`, {
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
      // Response was not JSON or could not be read; proceed with status code
    }

    throw new Error(
      `Weather service returned an HTTP ${response.status} error${errorDetail}`
    );
  }

  let data;
  try {
    data = await response.json();
  } catch (parseError) {
    throw new Error('Malformed response: Unable to parse JSON from weather service.', {
      cause: parseError,
    });
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Malformed response: Expected a JSON object from weather service.');
  }

  if (data.error) {
    const reason = typeof data.reason === 'string' ? data.reason : 'Unspecified API error';
    throw new Error(`Weather API error: ${reason}`);
  }

  if (!data.current || typeof data.current !== 'object') {
    throw new Error('Malformed response: Missing current weather data from weather service.');
  }

  const current = data.current;

  // Safely extract numeric fields without replacing missing or null values with zeroes or invented numbers
  const temperature =
    typeof current.temperature_2m === 'number' && Number.isFinite(current.temperature_2m)
      ? current.temperature_2m
      : null;

  const humidity =
    typeof current.relative_humidity_2m === 'number' && Number.isFinite(current.relative_humidity_2m)
      ? current.relative_humidity_2m
      : null;

  const windSpeed =
    typeof current.wind_speed_10m === 'number' && Number.isFinite(current.wind_speed_10m)
      ? current.wind_speed_10m
      : null;

  const windDirection =
    typeof current.wind_direction_10m === 'number' &&
      Number.isFinite(current.wind_direction_10m)
      ? current.wind_direction_10m
      : null;

  const pressure =
    typeof current.surface_pressure === 'number' &&
      Number.isFinite(current.surface_pressure)
      ? current.surface_pressure
      : null;

  const solarRadiation =
    typeof current.shortwave_radiation === 'number' &&
      Number.isFinite(current.shortwave_radiation)
      ? current.shortwave_radiation
      : null;

  const soilTemperature =
    typeof current.soil_temperature_6cm === 'number' &&
      Number.isFinite(current.soil_temperature_6cm)
      ? current.soil_temperature_6cm
      : null;

  const precipitation =
    typeof current.precipitation === 'number' && Number.isFinite(current.precipitation)
      ? current.precipitation
      : null;

  const weatherCode =
    typeof current.weather_code === 'number' && Number.isFinite(current.weather_code)
      ? current.weather_code
      : null;

  const weatherState = getWeatherState(weatherCode);

  return {
    temperature,
    humidity,
    windSpeed,
    windDirection,
    pressure,
    solarRadiation,
    soilTemperature,
    precipitation,
    weatherCode,
    weatherState,
    updatedAt: new Date().toISOString(),
    source: 'Open-Meteo',
    dataMode: 'live',
  };
}
