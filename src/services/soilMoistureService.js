/**
 * Soil Moisture Service for TerraPulse
 *
 * Fetches hourly soil-moisture estimates from Open-Meteo's GEM model.
 * Values are volumetric water content in m³/m³.
 * These are model estimates, not physical sensor measurements.
 */

const SOIL_MOISTURE_API_URL = 'https://api.open-meteo.com/v1/gem';

function validateCoordinates(latitude, longitude) {
    if (
        typeof latitude !== 'number' ||
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90
    ) {
        throw new Error('Invalid latitude for soil-moisture request.');
    }

    if (
        typeof longitude !== 'number' ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
    ) {
        throw new Error('Invalid longitude for soil-moisture request.');
    }
}

/**
 * Fetch hourly GEM soil-moisture estimates for a location.
 *
 * @returns {Promise<Array<{
 *   timestamp: string,
 *   volumetricWaterContent: number|null,
 *   moisturePercent: number|null,
 *   source: string,
 *   dataMode: string
 * }>>}
 */
export async function fetchSoilMoisture(latitude, longitude) {
    validateCoordinates(latitude, longitude);

    const url = new URL(SOIL_MOISTURE_API_URL);
    url.searchParams.set('latitude', latitude.toString());
    url.searchParams.set('longitude', longitude.toString());
    url.searchParams.set('hourly', 'soil_moisture_0_to_10cm');
    url.searchParams.set('forecast_days', '1');
    url.searchParams.set('timezone', 'UTC');

    let response;

    try {
        response = await fetch(url.toString(), {
            method: 'GET',
            headers: { Accept: 'application/json' },
        });
    } catch (error) {
        throw new Error(
            `Network error while fetching soil moisture: ${error instanceof Error ? error.message : 'Unknown network failure'
            }`,
            { cause: error }
        );
    }

    if (!response.ok) {
        throw new Error(`Soil-moisture service returned HTTP ${response.status}.`);
    }

    let data;

    try {
        data = await response.json();
    } catch (error) {
        throw new Error('Malformed JSON from soil-moisture service.', {
            cause: error,
        });
    }

    if (!data || typeof data !== 'object' || data.error) {
        throw new Error(
            `Soil-moisture API error: ${data?.reason || 'Invalid response.'}`
        );
    }

    const hourly = data.hourly;

    if (
        !hourly ||
        !Array.isArray(hourly.time) ||
        !Array.isArray(hourly.soil_moisture_0_to_10cm) ||
        hourly.time.length !== hourly.soil_moisture_0_to_10cm.length
    ) {
        throw new Error('Malformed response: soil-moisture hourly data is missing or mismatched.');
    }

    return hourly.time.map((timestamp, index) => {
        const value = hourly.soil_moisture_0_to_10cm[index];
        const validValue =
            typeof value === 'number' &&
            Number.isFinite(value) &&
            value >= 0 &&
            value <= 1;

        return {
            timestamp:
                typeof timestamp === 'string' ? `${timestamp}Z` : null,
            volumetricWaterContent: validValue ? value : null,
            moisturePercent: validValue ? Math.round(value * 1000) / 10 : null,
            source: 'Open-Meteo GEM',
            dataMode: 'live-model-estimate',
        };
    });
}
