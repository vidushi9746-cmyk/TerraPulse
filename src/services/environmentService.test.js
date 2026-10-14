import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { loadEnvironment } from './environmentService.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = originalFetch;
});

function mockFetch(responses) {
    let callIndex = 0;

    globalThis.fetch = async () => {
        const response = responses[callIndex++];

        if (response instanceof Error) {
            throw response;
        }

        return {
            ok: true,
            status: 200,
            json: async () => response,
        };
    };
}

const currentWeatherResponse = {
    current: {
        temperature_2m: 28,
        relative_humidity_2m: 65,
        wind_speed_10m: 12,
        precipitation: 2,
        weather_code: 61,
    },
};

const forecastResponse = {
    hourly: {
        time: ['2026-10-14T10:00'],
        temperature_2m: [28],
        relative_humidity_2m: [65],
        wind_speed_10m: [12],
        precipitation: [2],
        weather_code: [61],
    },
};

test('loads current weather, forecast, and soil moisture estimate', async () => {
    mockFetch([currentWeatherResponse, forecastResponse]);

    const result = await loadEnvironment({
        location: 'Bengaluru',
        latitude: 12.97,
        longitude: 77.59,
    });

    assert.equal(result.environment.location, 'Bengaluru');
    assert.equal(result.environment.temperature, 28);
    assert.equal(result.environment.humidity, 65);
    assert.equal(result.environment.weatherState, 'Slight rain');
    assert.equal(result.environment.dataMode, 'live');
    assert.equal(result.environment.forecast.length, 1);
    assert.equal(result.simulation.weatherDataAvailable, true);
    assert.equal(result.warnings.length, 0);
});

test('keeps current weather when forecast request fails', async () => {
    mockFetch([
        currentWeatherResponse,
        new Error('Forecast network unavailable'),
    ]);

    const result = await loadEnvironment({
        location: 'Bengaluru',
        latitude: 12.97,
        longitude: 77.59,
    });

    assert.equal(result.environment.temperature, 28);
    assert.equal(result.environment.forecast.length, 0);
    assert.ok(result.warnings.some((warning) =>
        warning.includes('Forecast network unavailable')
    ));
});

test('rejects invalid coordinates before making an API request', async () => {
    let fetchCalled = false;

    globalThis.fetch = async () => {
        fetchCalled = true;
        throw new Error('Fetch should not be called');
    };

    await assert.rejects(
        loadEnvironment({
            location: 'Invalid location',
            latitude: 200,
            longitude: 77.59,
        }),
        /valid latitude and longitude/
    );

    assert.equal(fetchCalled, false);
});
