/**
 * Farm Simulation Module
 *
 * This module provides illustrative teaching functions for farm environmental simulations.
 *
 * NOTE: The models used here are simplified, deterministic teaching formulas intended
 * for educational and illustrative purposes. They are NOT scientifically calibrated
 * agronomic or hydrological models (such as the FAO-56 Penman-Monteith equation).
 */

// =============================================================================
// Illustrative Model Coefficients & Assumptions
// =============================================================================
//
// 1. RAIN_ABSORPTION_FACTOR = 0.5
//    Assumption: Each 1 mm of rainfall increases topsoil moisture by 0.5 percentage
//    points. In reality, water infiltration depends on soil texture (sand/silt/clay),
//    existing saturation, organic matter, and surface runoff.
//
// 2. TEMP_FACTOR = 0.1
//    Assumption: Each 1°C above freezing (0°C) contributes 0.1 percentage points
//    to the potential evaporation rate. At or below 0°C, total estimated evaporation
//    is assumed to cease (0) in this simplified model. In reality, vapor pressure
//    deficit is non-linear with temperature.
//
// 3. WIND_FACTOR = 0.05
//    Assumption: Each 1 km/h of wind speed contributes 0.05 percentage points to
//    potential evaporation by moving air and disrupting the humid boundary layer.
//
// 4. HUMIDITY_FACTOR = (100 - humidity) / 100
//    Assumption: Relative humidity scales evaporation linearly based on air dryness.
//    At 100% humidity, air is saturated so evaporation is 0.
//    At 0% humidity, air is completely dry, allowing full potential evaporation.
//
// 5. Clamping & Soil Moisture Bounds:
//    Assumption: Soil moisture is physically bounded between 0% (completely dry)
//    and 100% (fully saturated). Any rainfall that would push moisture above 100%
//    is assumed lost to runoff or deep drainage.
//
// 6. Missing Weather Data:
//    Assumption: When required weather data is missing, null, or invalid, the model
//    will never guess or invent data. It preserves the starting soil moisture and
//    returns clear diagnostic warnings.
// =============================================================================

const RAIN_ABSORPTION_FACTOR = 0.5;
const TEMP_FACTOR = 0.1;
const WIND_FACTOR = 0.05;

/**
 * Estimates the new soil moisture percentage after a weather interval.
 *
 * Supports both positional arguments:
 *   estimateSoilMoisture(initialMoisture, temperature, humidity, windSpeed, precipitation)
 * and an options object:
 *   estimateSoilMoisture({ initialMoisture, temperature, humidity, windSpeed, precipitation })
 *
 * @param {number|Object} initialMoisture - Starting soil moisture (0-100%) or options object
 * @param {number} [temperature] - Ambient temperature in °C
 * @param {number} [humidity] - Relative humidity percentage (0-100%)
 * @param {number} [windSpeed] - Wind speed in km/h (>= 0)
 * @param {number} [precipitation] - Rainfall in mm for the interval (>= 0)
 * @returns {{ soilMoisture: number, warnings: string[] }} Estimated soil moisture and warnings
 * @throws {Error} If initialMoisture is missing, not a number, or outside [0, 100]
 */
export function estimateSoilMoisture(
  initialMoisture,
  temperature,
  humidity,
  windSpeed,
  precipitation
) {
  // Support passing arguments as an options object
  if (
    typeof initialMoisture === 'object' &&
    initialMoisture !== null &&
    !Array.isArray(initialMoisture)
  ) {
    const params = initialMoisture;
    initialMoisture = params.initialMoisture;
    temperature = params.temperature;
    humidity = params.humidity;
    windSpeed = params.windSpeed;
    precipitation = params.precipitation;
  }

  // 1. Validate initialMoisture (Requirement 3: throw a clear error if invalid)
  if (
    typeof initialMoisture !== 'number' ||
    !Number.isFinite(initialMoisture) ||
    initialMoisture < 0 ||
    initialMoisture > 100
  ) {
    throw new Error(
      `Invalid initialMoisture: must be a finite number between 0 and 100. Received: ${initialMoisture}`
    );
  }

  // 2. Validate weather inputs (Requirement 4: return unchanged moisture with warnings, never invent values)
  const warnings = [];

  if (typeof temperature !== 'number' || !Number.isFinite(temperature)) {
    warnings.push(
      `Invalid or missing temperature: expected a finite number in °C, received ${temperature}.`
    );
  }

  if (
    typeof humidity !== 'number' ||
    !Number.isFinite(humidity) ||
    humidity < 0 ||
    humidity > 100
  ) {
    warnings.push(
      `Invalid or missing humidity: expected a number between 0 and 100, received ${humidity}.`
    );
  }

  if (
    typeof windSpeed !== 'number' ||
    !Number.isFinite(windSpeed) ||
    windSpeed < 0
  ) {
    warnings.push(
      `Invalid or missing windSpeed: expected a non-negative number in km/h, received ${windSpeed}.`
    );
  }

  if (
    typeof precipitation !== 'number' ||
    !Number.isFinite(precipitation) ||
    precipitation < 0
  ) {
    warnings.push(
      `Invalid or missing precipitation: expected a non-negative number in mm, received ${precipitation}.`
    );
  }

  // If any weather input is missing or invalid, do not estimate or invent values;
  // return starting moisture unchanged along with the warnings.
  if (warnings.length > 0) {
    return {
      soilMoisture: initialMoisture,
      warnings,
    };
  }

  // 3. Deterministic teaching formula (Requirement 5)
  //
  // A. Rainfall increases soil moisture:
  const moistureGain = precipitation * RAIN_ABSORPTION_FACTOR;

  // B. Evaporation (moisture loss):
  //    When temperature is at or below 0°C (freezing), total estimated evaporation
  //    is zero. Above 0°C, warmer temperatures and stronger winds increase potential
  //    evaporation, while higher humidity reduces it.
  let moistureLoss = 0;
  if (temperature > 0) {
    const tempEffect = temperature * TEMP_FACTOR;
    const windEffect = windSpeed * WIND_FACTOR;
    const potentialEvaporation = tempEffect + windEffect;
    const drynessFactor = (100 - humidity) / 100;
    moistureLoss = potentialEvaporation * drynessFactor;
  }

  // D. Calculate net soil moisture and keep it within physical bounds [0, 100] (Requirement 2)
  const rawMoisture = initialMoisture + moistureGain - moistureLoss;
  const soilMoisture = Math.min(100, Math.max(0, rawMoisture));

  return {
    soilMoisture,
    warnings: [],
  };
}



/**
 * Returns the soil saturation category.
 */
export function getSaturationStatus(soilMoisturePct) {
  if (
    typeof soilMoisturePct !== 'number' ||
    !Number.isFinite(soilMoisturePct) ||
    soilMoisturePct < 0 ||
    soilMoisturePct > 100
  ) {
    throw new RangeError(
      'Soil moisture must be a finite number between 0 and 100.'
    );
  }

  if (soilMoisturePct < 25) return 'dry';
  if (soilMoisturePct < 50) return 'moist';
  if (soilMoisturePct < 75) return 'wet';
  return 'saturated';
}

/**
 * Recommends irrigation based on the soil saturation category.
 */
export function getIrrigationRecommendation(soilMoisturePct) {
  const status = getSaturationStatus(soilMoisturePct);

  if (status === 'dry') return 'irrigate';
  if (status === 'moist') return 'monitor';
  return 'hold';
}

export function getIrrigationDetails(soilMoisturePct) {
  const status = getSaturationStatus(soilMoisturePct);

  if (status === 'dry') {
    return {
      action: 'irrigate',
      reason: 'Soil moisture is low.',
    };
  }

  if (status === 'moist') {
    return {
      action: 'monitor',
      reason: 'Soil moisture is moderate.',
    };
  }

  return {
    action: 'hold',
    reason: 'Soil is already wet or saturated.',
  };
}

/**
 * Simulates soil moisture changes over a weather interval.
 *
 * This is a simplified teaching model, not a calibrated
 * agricultural prediction.
 */
export function simulateSoilMoisture({
  precipitationMm,
  temperatureC,
  relativeHumidityPct,
  previousSoilMoisturePct,
  elapsedHours,
}) {
  const warnings = [];

  // Validate the starting soil moisture and elapsed time.
  if (
    typeof previousSoilMoisturePct !== 'number' ||
    !Number.isFinite(previousSoilMoisturePct) ||
    previousSoilMoisturePct < 0 ||
    previousSoilMoisturePct > 100
  ) {
    throw new RangeError(
      'Previous soil moisture must be a finite number between 0 and 100.'
    );
  }

  if (
    typeof elapsedHours !== 'number' ||
    !Number.isFinite(elapsedHours) ||
    elapsedHours < 0
  ) {
    throw new RangeError(
      'Elapsed hours must be a finite, non-negative number.'
    );
  }

  // Check the weather inputs. Never invent missing weather data.
  if (
    typeof precipitationMm !== 'number' ||
    !Number.isFinite(precipitationMm) ||
    precipitationMm < 0
  ) {
    warnings.push('Precipitation is missing or invalid.');
  }

  if (
    typeof temperatureC !== 'number' ||
    !Number.isFinite(temperatureC)
  ) {
    warnings.push('Temperature is missing or invalid.');
  }

  if (
    typeof relativeHumidityPct !== 'number' ||
    !Number.isFinite(relativeHumidityPct) ||
    relativeHumidityPct < 0 ||
    relativeHumidityPct > 100
  ) {
    warnings.push('Relative humidity is missing or invalid.');
  }

  // Preserve the previous moisture if any weather input is invalid.
  if (warnings.length > 0) {
    return {
      soilMoisturePct: previousSoilMoisturePct,
      rainfallImpactPct: 0,
      dryingLossPct: 0,
      saturationStatus: getSaturationStatus(previousSoilMoisturePct),
      irrigation: getIrrigationDetails(previousSoilMoisturePct),
      dataMode: 'simulated',
      weatherDataAvailable: false,
      warnings,
    };
  }

  // Illustrative coefficients; these are not scientifically calibrated.
  const rainfallImpactPct = precipitationMm * 0.8;
  const temperatureFactor = Math.min(
    2,
    Math.max(0, (temperatureC + 5) / 30)
  );
  const drynessFactor = 1 - relativeHumidityPct / 100;
  const dryingLossPct =
    temperatureFactor * drynessFactor * elapsedHours * 0.15;

  const rawMoisture =
    previousSoilMoisturePct + rainfallImpactPct - dryingLossPct;

  const soilMoisturePct =
    Math.round(
      (Math.min(100, Math.max(0, rawMoisture)) + 1e-10) * 100
    ) / 100;

  return {
    soilMoisturePct,
    rainfallImpactPct,
    dryingLossPct,
    saturationStatus: getSaturationStatus(soilMoisturePct),
    irrigation: getIrrigationDetails(soilMoisturePct),
    dataMode: 'simulated',
    weatherDataAvailable: true,
    warnings: [],
  };
}
