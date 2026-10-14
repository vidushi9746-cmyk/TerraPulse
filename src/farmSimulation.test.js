
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    estimateSoilMoisture,
    simulateSoilMoisture,
    getSaturationStatus,
    getIrrigationRecommendation,
} from './farmSimulation.js';

test('simulates soil moisture with valid weather data', () => {
    const result = simulateSoilMoisture({
        precipitationMm: 10,
        temperatureC: 25,
        relativeHumidityPct: 50,
        previousSoilMoisturePct: 30,
        elapsedHours: 1,
    });

    assert.equal(result.soilMoisturePct, 37.93);
    assert.equal(result.rainfallImpactPct, 8);
    assert.equal(result.saturationStatus, 'moist');
    assert.equal(result.irrigationRecommendation, 'monitor');
    assert.equal(result.weatherDataAvailable, true);
    assert.deepEqual(result.warnings, []);
});

test('preserves previous moisture when precipitation is missing', () => {
    const result = simulateSoilMoisture({
        precipitationMm: null,
        temperatureC: 25,
        relativeHumidityPct: 50,
        previousSoilMoisturePct: 30,
        elapsedHours: 1,
    });

    assert.equal(result.soilMoisturePct, 30);
    assert.equal(result.weatherDataAvailable, false);
    assert.ok(result.warnings.length > 0);
});

test('classifies soil saturation correctly', () => {
    assert.equal(getSaturationStatus(10), 'dry');
    assert.equal(getSaturationStatus(30), 'moist');
    assert.equal(getSaturationStatus(60), 'wet');
    assert.equal(getSaturationStatus(90), 'saturated');
});

test('recommends irrigation based on soil moisture', () => {
    assert.equal(getIrrigationRecommendation(10), 'irrigate');
    assert.equal(getIrrigationRecommendation(30), 'monitor');
    assert.equal(getIrrigationRecommendation(60), 'hold');
    assert.equal(getIrrigationRecommendation(90), 'hold');
});

test('rejects invalid starting soil moisture', () => {
    assert.throws(
        () =>
            simulateSoilMoisture({
                precipitationMm: 10,
                temperatureC: 25,
                relativeHumidityPct: 50,
                previousSoilMoisturePct: 110,
                elapsedHours: 1,
            }),
        RangeError
    );
});

test('preserves the existing estimateSoilMoisture function', () => {
    const result = estimateSoilMoisture(30, 25, 50, 0, 10);

    assert.equal(result.soilMoisture, 33.75);
    assert.deepEqual(result.warnings, []);
});
