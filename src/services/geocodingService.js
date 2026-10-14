/**
 * Geocoding Service for TerraPulse
 *
 * Provides location search capabilities using the Open-Meteo Geocoding API.
 * Uses native browser fetch with no external dependencies or backend required.
 */

const GEOCODING_API_BASE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/**
 * Searches for geographic locations matching the given query string.
 *
 * @param {string} query - Location name or partial name to search for (e.g., "Paris", "Tokyo").
 * @returns {Promise<Array<{
 *   id: number|string,
 *   name: string,
 *   latitude: number,
 *   longitude: number,
 *   country: string|null,
 *   admin1: string|null,
 *   timezone: string|null
 * }>>} An array of matching location objects. Returns an empty array if the query is too short or no results are found.
 * @throws {Error} If a network error occurs, or the API returns an HTTP error or malformed payload.
 */
export async function searchLocations(query) {
  if (typeof query !== 'string') {
    return [];
  }

  const trimmedQuery = query.trim();

  // If query is empty or shorter than 2 characters, return early without making a network request
  if (trimmedQuery.length < 2) {
    return [];
  }

  const url = new URL(GEOCODING_API_BASE_URL);
  url.searchParams.set('name', trimmedQuery);
  url.searchParams.set('count', '5');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');

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
    throw new Error(`Network error while connecting to geocoding service: ${message}`, {
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
      `Geocoding service returned an HTTP ${response.status} error${errorDetail}`
    );
  }

  let data;
  try {
    data = await response.json();
  } catch (parseError) {
    throw new Error('Malformed response: Unable to parse JSON from geocoding service.', {
      cause: parseError,
    });
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Malformed response: Expected a JSON object from geocoding service.');
  }

  if (data.error) {
    const reason = typeof data.reason === 'string' ? data.reason : 'Unspecified API error';
    throw new Error(`Geocoding API error: ${reason}`);
  }

  // When no locations match the search query, Open-Meteo returns a 200 response without a results array
  if (!data.results) {
    return [];
  }

  if (!Array.isArray(data.results)) {
    throw new Error('Malformed response: "results" field is not an array.');
  }

  return data.results
    .filter((item) => (
      item &&
      item.id !== undefined &&
      item.id !== null &&
      typeof item.name === 'string' &&
      typeof item.latitude === 'number' &&
      !Number.isNaN(item.latitude) &&
      typeof item.longitude === 'number' &&
      !Number.isNaN(item.longitude)
    ))
    .map((item) => ({
      id: item.id,
      name: item.name,
      latitude: item.latitude,
      longitude: item.longitude,
      country: typeof item.country === 'string' ? item.country : null,
      admin1: typeof item.admin1 === 'string' ? item.admin1 : null,
      timezone: typeof item.timezone === 'string' ? item.timezone : null,
    }));
}
