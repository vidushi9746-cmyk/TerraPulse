import test from 'node:test';
import assert from 'node:assert/strict';

import {
    simulateSoilMoisture,
    getSaturationStatus,
    getIrrigationRecommendation,
} from './farmSimulation.js';

const validInputs = {
    precipitationMm: 5,
    temperatureC: 25,
    relativeHumidityPct: 60,
    previousSoilMoisturePct: 40,
    elapsedHours: 1,
};

test('calculates soil moisture with valid weather data', () => {
    const result = simulateSoilMoisture(validInputs);

    assert.equal(result.soilMoisturePct, 43.94);
    assert.equal(result.weatherDataAvailable, true);
    assert.deepEqual(result.warnings, []);
    assert.deepEqual(result.irrigation, {
        action: 'monitor',
        reason: 'Moisture is moderate; continue monitoring.',
    });
});

test('preserves previous moisture when precipitation is missing', () => {
    const result = simulateSoilMoisture({
        ...validInputs,
        precipitationMm: null,
    });

    assert.equal(result.soilMoisturePct, 40);
    assert.equal(result.weatherDataAvailable, false);
    assert.ok(result.warnings.length > 0);
});

test('preserves previous moisture when temperature is missing', () => {
    const result = simulateSoilMoisture({
        ...validInputs,
        temperatureC: undefined,
    });

    assert.equal(result.soilMoisturePct, 40);
    assert.equal(result.weatherDataAvailable, false);
    assert.ok(result.warnings.length > 0);
});

test('rejects humidity outside the valid range as unavailable weather', () => {
    const result = simulateSoilMoisture({
        ...validInputs,
        relativeHumidityPct: 101,
    });

    assert.equal(result.soilMoisturePct, 40);
    assert.equal(result.weatherDataAvailable, false);
    assert.ok(result.warnings.length > 0);
});

test('classifies soil moisture correctly', () => {
    assert.equal(getSaturationStatus(20), 'dry');
    assert.equal(getSaturationStatus(40), 'moist');
    assert.equal(getSaturationStatus(60), 'wet');
    assert.equal(getSaturationStatus(80), 'saturated');
});

test('returns the expected irrigation actions', () => {
    assert.equal(
        getIrrigationRecommendation(20).action,
        'irrigate',
    );
    assert.equal(
        getIrrigationRecommendation(40).action,
        'monitor',
    );
    assert.equal(
        getIrrigationRecommendation(60).action,
        'hold',
    );
});

test('rejects invalid previous soil moisture', () => {
    assert.throws(
        () =>
            simulateSoilMoisture({
                ...validInputs,
                previousSoilMoisturePct: 120,
            }),
        RangeError,
    );
});
