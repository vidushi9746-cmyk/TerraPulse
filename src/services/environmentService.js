import { searchLocations } from './geocodingService.js';
import { fetchCurrentWeather } from './weatherService.js';
import { fetchHourlyForecast } from './forecastService.js';
import { simulateSoilMoisture } from '../utils/farmSimulation.js';
import { initialEnvironmentState } from '../state/environmentState.js';

/**
 * Fetch weather and forecast for a selected location, then estimate soil moisture.
 * Current weather can still be returned when the forecast request fails.
 *
 * Soil moisture is an illustrative simulation, not a real sensor measurement.
 */
export async function loadEnvironment({
    location,
    latitude,
    longitude,
    previousSoilMoisturePct = 40,
    elapsedHours = 1,
    forecastDays = 3,
}) {
    if (
        typeof latitude !== 'number' ||
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90 ||
        typeof longitude !== 'number' ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
    ) {
        throw new Error('Please provide valid latitude and longitude coordinates.');
    }

    const currentWeather = await fetchCurrentWeather(latitude, longitude);

    let forecast = [];
    let forecastWarning = null;

    try {
        forecast = await fetchHourlyForecast(latitude, longitude, forecastDays);
    } catch (error) {
        forecastWarning =
            error instanceof Error
                ? error.message
                : 'Forecast data is currently unavailable.';
    }

    const simulation = simulateSoilMoisture({
        precipitationMm: currentWeather.precipitation,
        temperatureC: currentWeather.temperature,
        relativeHumidityPct: currentWeather.humidity,
        previousSoilMoisturePct,
        elapsedHours,
    });

    return {
        environment: {
            ...initialEnvironmentState,
            location: location || initialEnvironmentState.location,
            latitude,
            longitude,
            temperature: currentWeather.temperature,
            humidity: currentWeather.humidity,
            windSpeed: currentWeather.windSpeed,
            precipitation: currentWeather.precipitation,
            weatherCode: currentWeather.weatherCode,
            weatherState: currentWeather.weatherState,
            forecast,
            updatedAt: currentWeather.updatedAt,
            source: currentWeather.source,
            dataMode: currentWeather.dataMode,
        },
        simulation,
        warnings: [
            ...(forecastWarning ? [forecastWarning] : []),
            ...simulation.warnings,
        ],
    };
}

/**
 * Search for locations using the Open-Meteo geocoding service.
 */
export async function findEnvironmentLocations(query) {
    return searchLocations(query);
}