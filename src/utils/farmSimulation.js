

const clamp = (value, min, max) =>
    Math.min(max, Math.max(min, value));

function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}

function validateEssentialInputs({
    previousSoilMoisturePct,
    elapsedHours,
}) {
    if (!isFiniteNumber(previousSoilMoisturePct)) {
        throw new TypeError(
            'previousSoilMoisturePct must be a finite number.',
        );
    }

    if (
        previousSoilMoisturePct < 0 ||
        previousSoilMoisturePct > 100
    ) {
        throw new RangeError(
            'previousSoilMoisturePct must be between 0 and 100.',
        );
    }

    if (!isFiniteNumber(elapsedHours)) {
        throw new TypeError(
            'elapsedHours must be a finite number.',
        );
    }

    if (elapsedHours < 0) {
        throw new RangeError(
            'elapsedHours cannot be negative.',
        );
    }
}

/**
 * Estimates soil moisture using a simplified teaching model.
 *
 * If weather data is missing or invalid, the previous soil
 * moisture is preserved and warnings are returned.
 *
 * This model is illustrative and is not scientifically calibrated.
 */
export function simulateSoilMoisture({
    precipitationMm,
    temperatureC,
    relativeHumidityPct,
    previousSoilMoisturePct,
    elapsedHours,
}) {
    validateEssentialInputs({
        previousSoilMoisturePct,
        elapsedHours,
    });

    const warnings = [];

    // Check weather data without crashing when values are missing.
    const weatherInputs = [
        {
            name: 'precipitationMm',
            value: precipitationMm,
            valid: (value) => value >= 0,
            message:
                'Precipitation data is missing or invalid.',
        },
        {
            name: 'temperatureC',
            value: temperatureC,
            valid: () => true,
            message:
                'Temperature data is missing or invalid.',
        },
        {
            name: 'relativeHumidityPct',
            value: relativeHumidityPct,
            valid: (value) => value >= 0 && value <= 100,
            message:
                'Relative humidity must be between 0 and 100%.',
        },
    ];

    for (const input of weatherInputs) {
        if (
            !isFiniteNumber(input.value) ||
            !input.valid(input.value)
        ) {
            warnings.push(input.message);
        }
    }

    // Do not invent a prediction when weather data is incomplete.
    if (warnings.length > 0) {
        return {
            soilMoisturePct: previousSoilMoisturePct,
            rainfallImpactPct: 0,
            dryingLossPct: 0,
            saturationStatus: getSaturationStatus(
                previousSoilMoisturePct,
            ),
            irrigation: getIrrigationRecommendation(
                previousSoilMoisturePct,
            ),
            dataMode: 'simulated',
            weatherDataAvailable: false,
            warnings,
        };
    }

    // Simplified assumption: each mm of rain adds
    // 0.8 soil-moisture percentage points.
    const rainfallImpactPct = precipitationMm * 0.8;

    // Approximate drying increases with warmth and decreases
    // with humidity. These are illustrative coefficients.
    const temperatureFactor = clamp(
        (temperatureC + 5) / 30,
        0,
        2,
    );

    const drynessFactor = 1 - relativeHumidityPct / 100;

    const dryingLossPct =
        temperatureFactor *
        drynessFactor *
        elapsedHours *
        0.15;

    const soilMoisturePct = clamp(
        previousSoilMoisturePct +
        rainfallImpactPct -
        dryingLossPct,
        0,
        100,
    );

    return {
        soilMoisturePct: Number(
            soilMoisturePct.toFixed(2),
        ),
        rainfallImpactPct: Number(
            rainfallImpactPct.toFixed(2),
        ),
        dryingLossPct: Number(
            dryingLossPct.toFixed(2),
        ),
        saturationStatus: getSaturationStatus(
            soilMoisturePct,
        ),
        irrigation: getIrrigationRecommendation(
            soilMoisturePct,
        ),
        dataMode: 'simulated',
        weatherDataAvailable: true,
        warnings: [],
    };
}

export function getSaturationStatus(soilMoisturePct) {
    if (
        !isFiniteNumber(soilMoisturePct) ||
        soilMoisturePct < 0 ||
        soilMoisturePct > 100
    ) {
        throw new RangeError(
            'soilMoisturePct must be between 0 and 100.',
        );
    }

    if (soilMoisturePct < 25) return 'dry';
    if (soilMoisturePct < 50) return 'moist';
    if (soilMoisturePct < 75) return 'wet';

    return 'saturated';
}

export function getIrrigationRecommendation(soilMoisturePct) {
    const saturationStatus =
        getSaturationStatus(soilMoisturePct);

    if (saturationStatus === 'dry') {
        return {
            action: 'irrigate',
            reason: 'Simulated soil moisture is low.',
        };
    }

    if (saturationStatus === 'moist') {
        return {
            action: 'monitor',
            reason:
                'Moisture is moderate; continue monitoring.',
        };
    }

    if (saturationStatus === 'wet') {
        return {
            action: 'hold',
            reason:
                'Soil is already wet; additional irrigation may be unnecessary.',
        };
    }

    return {
        action: 'hold',
        reason: 'Soil is simulated as highly saturated.',
    };
}
