
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function validateInputs({
    precipitationMm,
    temperatureC,
    relativeHumidityPct,
    previousSoilMoisturePct,
    elapsedHours,
}) {
    const inputs = {
        precipitationMm,
        temperatureC,
        relativeHumidityPct,
        previousSoilMoisturePct,
        elapsedHours,
    };

    for (const [name, value] of Object.entries(inputs)) {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            throw new TypeError(`${name} must be a finite number.`);
        }
    }

    if (precipitationMm < 0) {
        throw new RangeError('precipitationMm cannot be negative.');
    }

    if (relativeHumidityPct < 0 || relativeHumidityPct > 100) {
        throw new RangeError('relativeHumidityPct must be between 0 and 100.');
    }

    if (
        previousSoilMoisturePct < 0 ||
        previousSoilMoisturePct > 100
    ) {
        throw new RangeError(
            'previousSoilMoisturePct must be between 0 and 100.',
        );
    }

    if (elapsedHours < 0) {
        throw new RangeError('elapsedHours cannot be negative.');
    }
}

/**
 * Estimates soil moisture change using a simplified demonstration model.
 *
 * Inputs:
 * - precipitationMm: rainfall during this interval, in mm
 * - temperatureC: air temperature, in °C
 * - relativeHumidityPct: relative humidity, from 0 to 100
 * - previousSoilMoisturePct: prior simulated soil moisture, from 0 to 100
 * - elapsedHours: duration of this interval, in hours
 *
 * This is a conceptual model, not a calibrated agricultural prediction.
 */
export function simulateSoilMoisture({
    precipitationMm,
    temperatureC,
    relativeHumidityPct,
    previousSoilMoisturePct,
    elapsedHours,
}) {
    validateInputs({
        precipitationMm,
        temperatureC,
        relativeHumidityPct,
        previousSoilMoisturePct,
        elapsedHours,
    });

    // Simplified assumption: each mm of rain adds 0.8 moisture percentage points.
    const rainfallImpactPct = precipitationMm * 0.8;

    // Approximate drying increases with warmth and decreases with humidity.
    const temperatureFactor = clamp((temperatureC + 5) / 30, 0, 2);
    const drynessFactor = 1 - relativeHumidityPct / 100;
    const dryingLossPct =
        temperatureFactor * drynessFactor * elapsedHours * 0.15;

    const soilMoisturePct = clamp(
        previousSoilMoisturePct + rainfallImpactPct - dryingLossPct,
        0,
        100,
    );

    return {
        soilMoisturePct: Number(soilMoisturePct.toFixed(2)),
        rainfallImpactPct: Number(rainfallImpactPct.toFixed(2)),
        dryingLossPct: Number(dryingLossPct.toFixed(2)),
        saturationStatus: getSaturationStatus(soilMoisturePct),
        irrigation: getIrrigationRecommendation(soilMoisturePct),
        dataMode: 'simulated',
    };
}

export function getSaturationStatus(soilMoisturePct) {
    if (
        typeof soilMoisturePct !== 'number' ||
        !Number.isFinite(soilMoisturePct) ||
        soilMoisturePct < 0 ||
        soilMoisturePct > 100
    ) {
        throw new RangeError('soilMoisturePct must be between 0 and 100.');
    }

    if (soilMoisturePct < 25) return 'dry';
    if (soilMoisturePct < 50) return 'moist';
    if (soilMoisturePct < 75) return 'wet';
    return 'saturated';
}

export function getIrrigationRecommendation(soilMoisturePct) {
    const saturationStatus = getSaturationStatus(soilMoisturePct);

    if (saturationStatus === 'dry') {
        return {
            action: 'irrigate',
            reason: 'Simulated soil moisture is low.',
        };
    }

    if (saturationStatus === 'moist') {
        return {
            action: 'monitor',
            reason: 'Moisture is moderate; continue monitoring.',
        };
    }

    if (saturationStatus === 'wet') {
        return {
            action: 'hold',
            reason: 'Soil is already wet; additional irrigation may be unnecessary.',
        };
    }

    return {
        action: 'hold',
        reason: 'Soil is simulated as highly saturated.',
    };
}
