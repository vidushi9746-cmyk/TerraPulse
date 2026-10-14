/**
 * Irrigation Engine Module
 *
 * This module provides illustrative comparison logic between a conventional
 * threshold-based irrigation strategy and a forecast-aware predictive strategy.
 *
 * NOTE: All models and water quantities used here are simplified, deterministic
 * teaching formulas intended for simulation and educational digital twins.
 * They are NOT scientifically calibrated agronomic models (such as FAO-56
 * Penman-Monteith) and must not be used as commercial farming prescriptions.
 */

// =============================================================================
// Illustrative Simulation Defaults & Assumptions
// =============================================================================
//
// 1. DEFAULT_ABSORPTION_FACTOR = 0.5
//    Assumption: Each 1 mm of applied water (or rainfall) increases topsoil moisture
//    by 0.5 percentage points. In real soil physics, infiltration rates vary widely
//    with soil texture (clay, loam, sand), organic matter, compaction, and runoff.
//
// 2. DEFAULT_DRY_THRESHOLD = 35 (%)
//    Assumption: When soil moisture drops below 35%, crops enter water stress and
//    require replenishment.
//
// 3. DEFAULT_TARGET_MOISTURE = 60 (%)
//    Assumption: 60% soil moisture represents an optimal illustrative target level.
//
// 4. DEFAULT_FORECAST_WINDOW_HOURS = 6 (hours)
//    Assumption: Irrigation decisions only evaluate the near-term 6-hour forecast
//    window rather than summing unlimited future rainfall.
//
// 5. DEFER Meaning:
//    "DEFER" means postpone irrigation and re-evaluate soil moisture after the
//    forecast window or rain event. It does NOT imply that future irrigation
//    will never be necessary.
//
// 6. Missing Forecast Data:
//    Assumption: Missing, null, or invalid forecast data is NEVER treated as zero.
//    If forecast data is unavailable or insufficient within the decision window,
//    the engine adds diagnostic warnings and safely uses conventional fallback.
// =============================================================================

export const DEFAULT_CONFIG = Object.freeze({
  dryThreshold: 35,
  targetMoisture: 60,
  absorptionFactor: 0.5,
  forecastWindowHours: 6,
  minSignificantRainMm: 5.0,
});

/**
 * Validates configuration parameters.
 *
 * @param {Object} config - Configuration overrides to validate
 * @returns {Object} Validated configuration with defaults applied
 * @throws {Error} If any configuration parameter is invalid
 */
function validateConfig(config = {}) {
  const merged = { ...DEFAULT_CONFIG, ...config };

  // 1. dryThreshold must be a finite number between 0 and 100
  if (
    typeof merged.dryThreshold !== 'number' ||
    !Number.isFinite(merged.dryThreshold) ||
    merged.dryThreshold < 0 ||
    merged.dryThreshold > 100
  ) {
    throw new Error(
      `Invalid dryThreshold: must be a finite number between 0 and 100. Received: ${merged.dryThreshold}`
    );
  }

  // 2. targetMoisture must be a finite number between 0 and 100
  if (
    typeof merged.targetMoisture !== 'number' ||
    !Number.isFinite(merged.targetMoisture) ||
    merged.targetMoisture < 0 ||
    merged.targetMoisture > 100
  ) {
    throw new Error(
      `Invalid targetMoisture: must be a finite number between 0 and 100. Received: ${merged.targetMoisture}`
    );
  }

  // 3. targetMoisture must be strictly greater than dryThreshold
  if (merged.targetMoisture <= merged.dryThreshold) {
    throw new Error(
      `Invalid configuration: targetMoisture (${merged.targetMoisture}) must be greater than dryThreshold (${merged.dryThreshold}).`
    );
  }

  // 4. absorptionFactor must be a positive finite number (> 0)
  if (
    typeof merged.absorptionFactor !== 'number' ||
    !Number.isFinite(merged.absorptionFactor) ||
    merged.absorptionFactor <= 0
  ) {
    throw new Error(
      `Invalid absorptionFactor: must be a positive finite number (> 0). Received: ${merged.absorptionFactor}`
    );
  }

  // 5. forecastWindowHours must be a positive integer representing whole hours (> 0)
  if (
    typeof merged.forecastWindowHours !== 'number' ||
    !Number.isFinite(merged.forecastWindowHours) ||
    !Number.isInteger(merged.forecastWindowHours) ||
    merged.forecastWindowHours <= 0
  ) {
    throw new Error(
      `Invalid forecastWindowHours: must be a positive integer representing whole hours. Received: ${merged.forecastWindowHours}`
    );
  }

  // 6. minSignificantRainMm must be a non-negative finite number (>= 0)
  if (
    typeof merged.minSignificantRainMm !== 'number' ||
    !Number.isFinite(merged.minSignificantRainMm) ||
    merged.minSignificantRainMm < 0
  ) {
    throw new Error(
      `Invalid minSignificantRainMm: must be a non-negative finite number (>= 0). Received: ${merged.minSignificantRainMm}`
    );
  }

  return merged;
}

/**
 * Validates soil moisture percentage [0, 100].
 *
 * @param {number} moisture - Soil moisture percentage
 * @param {string} paramName - Name of parameter for error reporting
 * @returns {number} Validated soil moisture
 * @throws {Error} If moisture is not a finite number in [0, 100]
 */
function validateMoisture(moisture, paramName = 'soilMoisture') {
  if (
    typeof moisture !== 'number' ||
    !Number.isFinite(moisture) ||
    moisture < 0 ||
    moisture > 100
  ) {
    throw new Error(
      `Invalid ${paramName}: must be a finite number between 0 and 100. Received: ${moisture}`
    );
  }
  return moisture;
}

/**
 * Clamps water depth to non-negative value (>= 0).
 *
 * @param {number} mm - Water in mm
 * @returns {number} Clamped water in mm rounded to 2 decimal places
 */
function clampWater(mm) {
  if (typeof mm !== 'number' || !Number.isFinite(mm)) return 0;
  const clamped = Math.max(0, mm);
  return Math.round(clamped * 100) / 100;
}

/**
 * Clamps soil moisture to physical bounds [0, 100].
 *
 * @param {number} moisture - Moisture percentage
 * @returns {number} Clamped moisture percentage rounded to 2 decimal places
 */
function clampMoisture(moisture) {
  if (typeof moisture !== 'number' || !Number.isFinite(moisture)) return 0;
  const clamped = Math.min(100, Math.max(0, moisture));
  return Math.round(clamped * 100) / 100;
}

/**
 * Filters and validates forecast intervals within a specified time window.
 *
 * Inspects hourly forecast items from the decision time up to decisionTime + windowHours.
 * If the forecast array is absent, empty, incomplete, or contains missing/null/invalid
 * precipitation values, the window is marked as UNAVAILABLE or INSUFFICIENT.
 *
 * NOTE: Missing precipitation values are NEVER treated as zero.
 *
 * @param {Array<Object>|null|undefined} forecast - Array of hourly forecast intervals
 * @param {string|Date|number} [decisionTime] - ISO string, Date, or timestamp for decision point
 * @param {number} [windowHours=6] - Number of hours from decision point to evaluate
 * @returns {{
 *   intervals: Array<Object>,
 *   totalRainMm: number|null,
 *   status: 'VALID'|'INSUFFICIENT'|'UNAVAILABLE',
 *   warnings: string[],
 *   decisionTimeIso: string,
 *   windowEndTimeIso: string
 * }}
 */
export function filterForecastWindow(forecast, decisionTime, windowHours = 6) {
  // Validate windowHours: must be a positive integer representing whole hours
  if (
    typeof windowHours !== 'number' ||
    !Number.isFinite(windowHours) ||
    !Number.isInteger(windowHours) ||
    windowHours <= 0
  ) {
    throw new Error(
      `Invalid windowHours: must be a positive integer representing whole hours. Received: ${windowHours}`
    );
  }

  const warnings = [];

  // 1. Resolve decision time and window end time
  const startDate = decisionTime ? new Date(decisionTime) : new Date();
  if (Number.isNaN(startDate.getTime())) {
    throw new Error(`Invalid decisionTime: unable to parse "${decisionTime}" as a valid date.`);
  }
  const startMs = startDate.getTime();
  const windowEndMs = startMs + windowHours * 60 * 60 * 1000;
  const endDate = new Date(windowEndMs);

  const decisionTimeIso = startDate.toISOString();
  const windowEndTimeIso = endDate.toISOString();

  // 2. Check if forecast array is absent, null, or empty
  if (!forecast || !Array.isArray(forecast) || forecast.length === 0) {
    warnings.push(
      'Forecast data is absent, null, or empty. Predictive irrigation cannot be performed.'
    );
    return {
      intervals: [],
      totalRainMm: null,
      status: 'UNAVAILABLE',
      warnings,
      decisionTimeIso,
      windowEndTimeIso,
    };
  }

  // 3. Filter intervals that fall strictly AFTER decisionTime and up to windowEndMs
  // In Open-Meteo, an interval timestamped at decisionTime represents the preceding hour
  // (past rain). To evaluate future forecast rain, we exclude intervals at or before
  // decisionTime (itemMs <= startMs) and include intervals up to windowEndMs.
  const intervalsInWindow = [];
  for (let i = 0; i < forecast.length; i++) {
    const item = forecast[i];
    if (!item || typeof item !== 'object') continue;

    const itemDate = new Date(item.timestamp);
    const itemMs = itemDate.getTime();
    if (Number.isNaN(itemMs)) {
      continue;
    }

    // Include future intervals inside the window (strictly after startMs and up to windowEndMs)
    if (itemMs > startMs && itemMs <= windowEndMs) {
      intervalsInWindow.push(item);
    }
  }

  // Sort intervals chronologically to enable robust gap and coverage analysis
  intervalsInWindow.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // 4. Verify whether the window is adequately covered
  if (intervalsInWindow.length === 0) {
    warnings.push(
      `No forecast intervals found between ${decisionTimeIso} and ${windowEndTimeIso}.`
    );
    return {
      intervals: [],
      totalRainMm: null,
      status: 'INSUFFICIENT',
      warnings,
      decisionTimeIso,
      windowEndTimeIso,
    };
  }

  // Open-Meteo provides hourly forecast readings spaced 1 hour (3,600,000 ms) apart.
  // For a window of windowHours, we require:
  //   a) At least windowHours hourly intervals.
  //   b) Continuity: no gap > 1.5 hours between consecutive intervals (catches missing intermediate hours).
  //   c) Timely start: first interval must be within 1.5 hours of decisionTime.
  //   d) Full reach: latest interval must reach within 1.5 hours of windowEndMs.
  const expectedIntervals = windowHours;

  if (intervalsInWindow.length < expectedIntervals) {
    warnings.push(
      `Forecast coverage is incomplete: received ${intervalsInWindow.length} interval(s), but at least ${expectedIntervals} hourly interval(s) are required for a ${windowHours}-hour window.`
    );
  }

  // Check start timeliness
  const firstIntervalMs = new Date(intervalsInWindow[0].timestamp).getTime();
  if (firstIntervalMs - startMs > 1.5 * 60 * 60 * 1000) {
    warnings.push(
      `Forecast starts late: first available interval at ${intervalsInWindow[0].timestamp} is more than 1.5 hours after decision time (${decisionTimeIso}).`
    );
  }

  // Check continuity (gaps between consecutive intervals)
  for (let i = 1; i < intervalsInWindow.length; i++) {
    const prevMs = new Date(intervalsInWindow[i - 1].timestamp).getTime();
    const currMs = new Date(intervalsInWindow[i].timestamp).getTime();
    const gapMs = currMs - prevMs;
    if (gapMs > 1.5 * 60 * 60 * 1000) {
      const gapHours = (gapMs / (60 * 60 * 1000)).toFixed(1);
      warnings.push(
        `Missing forecast data: gap of ${gapHours} hours detected between ${intervalsInWindow[i - 1].timestamp} and ${intervalsInWindow[i].timestamp}.`
      );
    }
  }

  // Check end coverage reach
  const latestIntervalMs = new Date(
    intervalsInWindow[intervalsInWindow.length - 1].timestamp
  ).getTime();
  const missingEndCoverageMs = windowEndMs - latestIntervalMs;
  if (missingEndCoverageMs > 1.5 * 60 * 60 * 1000) {
    const missingHours = (missingEndCoverageMs / (60 * 60 * 1000)).toFixed(1);
    warnings.push(
      `Forecast ends prematurely: latest interval at ${intervalsInWindow[intervalsInWindow.length - 1].timestamp} is ${missingHours} hour(s) short of the requested ${windowHours}-hour window.`
    );
  }

  // 5. Inspect precipitation values. NEVER treat missing/null precipitation as zero.
  let totalRain = 0;
  let hasInvalidPrecipitation = false;

  for (let i = 0; i < intervalsInWindow.length; i++) {
    const item = intervalsInWindow[i];
    const precip = item.precipitation;

    if (
      precip === null ||
      precip === undefined ||
      typeof precip !== 'number' ||
      !Number.isFinite(precip) ||
      precip < 0
    ) {
      warnings.push(
        `Forecast interval at ${item.timestamp || `index ${i}`} has missing, null, or invalid precipitation (${precip}). Never assuming zero rain.`
      );
      hasInvalidPrecipitation = true;
    } else {
      totalRain += precip;
    }
  }

  // If any precipitation value in the window was invalid or coverage was incomplete
  if (hasInvalidPrecipitation || warnings.length > 0) {
    return {
      intervals: intervalsInWindow,
      totalRainMm: null, // Do not report misleading rain sum when data is incomplete
      status: 'INSUFFICIENT',
      warnings,
      decisionTimeIso,
      windowEndTimeIso,
    };
  }

  return {
    intervals: intervalsInWindow,
    totalRainMm: Math.round(totalRain * 100) / 100,
    status: 'VALID',
    warnings: [],
    decisionTimeIso,
    windowEndTimeIso,
  };
}

/**
 * Pure strategy: Evaluates conventional threshold-based irrigation.
 *
 * Decision Rules:
 * - If soil moisture < dryThreshold: Irrigates the exact deficit to restore soil to targetMoisture.
 * - If soil moisture >= dryThreshold: Skips irrigation (0 mm applied).
 *
 * @param {number} initialSoilMoisture - Starting soil moisture percentage (0-100)
 * @param {Object} [config] - Validated configuration options
 * @returns {{
 *   strategyName: string,
 *   decision: 'IRRIGATE'|'SKIP',
 *   waterAppliedMm: number,
 *   projectedMoisture: number,
 *   reason: string
 * }}
 */
export function evaluateConventionalStrategy(initialSoilMoisture, config = {}) {
  const validConfig = validateConfig(config);
  const moisture = validateMoisture(initialSoilMoisture, 'initialSoilMoisture');

  const { dryThreshold, targetMoisture, absorptionFactor } = validConfig;

  // Decision rule: Is soil below the dry threshold?
  if (moisture < dryThreshold) {
    const moistureDeficit = targetMoisture - moisture;
    // Water needed (mm) = deficit (%) / absorptionFactor (% per mm)
    const rawWaterNeeded = moistureDeficit / absorptionFactor;
    const waterAppliedMm = clampWater(rawWaterNeeded);
    const projectedMoisture = clampMoisture(moisture + waterAppliedMm * absorptionFactor);

    return {
      strategyName: 'Conventional Strategy',
      decision: 'IRRIGATE',
      waterAppliedMm,
      projectedMoisture,
      reason: `Current soil moisture (${moisture.toFixed(1)}%) is below dry threshold (${dryThreshold.toFixed(1)}%). Irrigating ${waterAppliedMm.toFixed(1)} mm to restore target moisture (${targetMoisture.toFixed(1)}%).`,
    };
  }

  // Soil moisture is adequate
  return {
    strategyName: 'Conventional Strategy',
    decision: 'SKIP',
    waterAppliedMm: 0,
    projectedMoisture: clampMoisture(moisture),
    reason: `Current soil moisture (${moisture.toFixed(1)}%) is at or above dry threshold (${dryThreshold.toFixed(1)}%). No irrigation required.`,
  };
}

/**
 * Pure strategy: Evaluates forecast-aware predictive irrigation.
 *
 * Decision Rules:
 * 1. Forecast Inspection:
 *    If forecast is missing, incomplete, or contains invalid precipitation,
 *    safely applies conventional fallback with a clear diagnostic explanation.
 * 2. If soil is already at or above dryThreshold:
 *    Decision is SKIP (0 mm).
 * 3. If soil is dry (< dryThreshold) and forecast is valid:
 *    - DEFER: If forecasted rain will lift soil moisture above dryThreshold (and rain >= minSignificantRainMm).
 *      DEFER explicitly means postpone and re-evaluate after rainfall; it does not mean future irrigation is unnecessary.
 *    - REDUCE: If forecasted rain helps but does not lift soil above dryThreshold (and rain >= minSignificantRainMm).
 *      Applies reduced top-up water to supplement natural rain.
 *    - IRRIGATE: If forecasted rain is negligible (< minSignificantRainMm).
 *      Applies full irrigation to protect crops.
 *
 * @param {number} initialSoilMoisture - Starting soil moisture percentage (0-100)
 * @param {Array<Object>|null|undefined} forecast - Hourly forecast array
 * @param {Object} [config] - Validated configuration options
 * @param {string|Date|number} [decisionTime] - Time reference for decision window
 * @returns {{
 *   strategyName: string,
 *   decision: 'IRRIGATE'|'SKIP'|'DEFER'|'REDUCE',
 *   waterAppliedMm: number,
 *   projectedMoisture: number,
 *   fallbackApplied: boolean,
 *   forecastStatus: 'VALID'|'INSUFFICIENT'|'UNAVAILABLE',
 *   reason: string,
 *   warnings: string[]
 * }}
 */
export function evaluateForecastAwareStrategy(
  initialSoilMoisture,
  forecast,
  config = {},
  decisionTime
) {
  const validConfig = validateConfig(config);
  const moisture = validateMoisture(initialSoilMoisture, 'initialSoilMoisture');

  const {
    dryThreshold,
    targetMoisture,
    absorptionFactor,
    forecastWindowHours,
    minSignificantRainMm,
  } = validConfig;

  // 1. Filter and validate forecast in the decision window
  const windowResult = filterForecastWindow(forecast, decisionTime, forecastWindowHours);
  const { status: forecastStatus, totalRainMm, warnings } = windowResult;

  // 2. Insufficient or unavailable forecast -> Conventional Fallback
  // NEVER assume missing rain is zero.
  if (forecastStatus !== 'VALID') {
    const fallback = evaluateConventionalStrategy(moisture, validConfig);
    const fallbackReason = `Forecast data is ${forecastStatus.toLowerCase()}; falling back to conventional threshold decision. ${fallback.reason}`;

    return {
      strategyName: 'Forecast-Aware Strategy',
      decision: fallback.decision,
      waterAppliedMm: fallback.waterAppliedMm,
      projectedMoisture: fallback.projectedMoisture,
      fallbackApplied: true,
      forecastStatus,
      reason: fallbackReason,
      warnings,
    };
  }

  // 3. Valid forecast: Evaluate predictive rules
  // Calculate projected moisture gain from forecasted rainfall
  const rainGain = totalRainMm * absorptionFactor;

  // Case A: Soil moisture is already adequate (>= dryThreshold)
  if (moisture >= dryThreshold) {
    const projectedMoisture = clampMoisture(moisture + rainGain);
    return {
      strategyName: 'Forecast-Aware Strategy',
      decision: 'SKIP',
      waterAppliedMm: 0,
      projectedMoisture,
      fallbackApplied: false,
      forecastStatus,
      reason: `Current soil moisture (${moisture.toFixed(1)}%) is at or above dry threshold (${dryThreshold.toFixed(1)}%). No irrigation required.`,
      warnings: [],
    };
  }

  // Case B: Soil moisture is dry (< dryThreshold)
  // Sub-case B1: Forecasted rain lifts moisture above dryThreshold (and is significant)
  if (totalRainMm >= minSignificantRainMm && moisture + rainGain >= dryThreshold) {
    const projectedMoisture = clampMoisture(moisture + rainGain);
    return {
      strategyName: 'Forecast-Aware Strategy',
      decision: 'DEFER',
      waterAppliedMm: 0,
      projectedMoisture,
      fallbackApplied: false,
      forecastStatus,
      // Clearly clarify that DEFER means postpone and re-evaluate, not permanently skip
      reason: `Soil moisture (${moisture.toFixed(1)}%) is dry, but upcoming forecast predicts ${totalRainMm.toFixed(1)} mm rain in the next ${forecastWindowHours} hours (projected +${rainGain.toFixed(1)}% moisture). Irrigation is deferred until after the rain event; re-evaluate soil moisture after rainfall.`,
      warnings: [],
    };
  }

  // Sub-case B2: Forecasted rain is significant but not enough to lift moisture above dryThreshold
  if (totalRainMm >= minSignificantRainMm && moisture + rainGain < dryThreshold) {
    // Top-up deficit: targetMoisture - (initialMoisture + rainGain)
    const netDeficit = targetMoisture - (moisture + rainGain);
    const rawWaterNeeded = netDeficit / absorptionFactor;
    const waterAppliedMm = clampWater(rawWaterNeeded);
    const projectedMoisture = clampMoisture(moisture + rainGain + waterAppliedMm * absorptionFactor);

    return {
      strategyName: 'Forecast-Aware Strategy',
      decision: 'REDUCE',
      waterAppliedMm,
      projectedMoisture,
      fallbackApplied: false,
      forecastStatus,
      reason: `Soil moisture is dry (${moisture.toFixed(1)}%). Upcoming rain will provide ${totalRainMm.toFixed(1)} mm (+${rainGain.toFixed(1)}% moisture). Reduced irrigation to ${waterAppliedMm.toFixed(1)} mm to supplement rain and reach target moisture (${targetMoisture.toFixed(1)}%).`,
      warnings: [],
    };
  }

  // Sub-case B3: Forecasted rain is negligible (< minSignificantRainMm)
  const fullDeficit = targetMoisture - moisture;
  const rawWaterNeeded = fullDeficit / absorptionFactor;
  const waterAppliedMm = clampWater(rawWaterNeeded);
  const projectedMoisture = clampMoisture(moisture + rainGain + waterAppliedMm * absorptionFactor);

  return {
    strategyName: 'Forecast-Aware Strategy',
    decision: 'IRRIGATE',
    waterAppliedMm,
    projectedMoisture,
    fallbackApplied: false,
    forecastStatus,
    reason: `Soil moisture (${moisture.toFixed(1)}%) is dry and forecasted rain within ${forecastWindowHours} hours is negligible (${totalRainMm.toFixed(1)} mm). Applying full irrigation (${waterAppliedMm.toFixed(1)} mm) to protect crops.`,
    warnings: [],
  };
}

/**
 * Compares conventional and forecast-aware irrigation strategies.
 *
 * Evaluates both strategies using the exact same starting soil moisture and scenario.
 * Returns results separately from the input environmentState without mutating any input objects.
 *
 * Supports both:
 *   compareIrrigation(environmentState, initialSoilMoisture, options)
 * and an options object:
 *   compareIrrigation({ environmentState, initialSoilMoisture, ...options })
 *
 * @param {Object} environmentState - Agreed environmentState snapshot containing current weather & forecast
 * @param {number} [initialSoilMoisture] - Starting soil moisture percentage (0-100)
 * @param {Object} [options] - Optional configuration overrides
 * @returns {Object} Structured comparison result for beginner-friendly consumption and UI rendering
 */
export function compareIrrigation(environmentState, initialSoilMoisture, options = {}) {
  // Support passing arguments as an options object
  let env = environmentState;
  let startMoisture = initialSoilMoisture;
  let opts = options;

  if (
    typeof environmentState === 'object' &&
    environmentState !== null &&
    !Array.isArray(environmentState) &&
    initialSoilMoisture === undefined &&
    environmentState.environmentState !== undefined
  ) {
    env = environmentState.environmentState;
    startMoisture = environmentState.initialSoilMoisture;
    opts = { ...environmentState };
    delete opts.environmentState;
    delete opts.initialSoilMoisture;
  }

  // Fallback: If initialSoilMoisture is not passed as 2nd arg, check env.soilMoisture
  if (startMoisture === undefined && env && typeof env.soilMoisture === 'number') {
    startMoisture = env.soilMoisture;
  }

  // 1. Validate starting moisture (Requirement: identical initial moisture for both)
  const moisture = validateMoisture(startMoisture, 'initialSoilMoisture');

  // 2. Validate configuration
  const validConfig = validateConfig(opts);

  // 3. Resolve decision time reference from options or environmentState.updatedAt
  const decisionTime = opts.decisionTime || (env && env.updatedAt) || new Date().toISOString();

  // 4. Safe access to forecast array (without mutating input)
  const forecastArray = env && Array.isArray(env.forecast) ? env.forecast : null;

  // 5. Evaluate both strategies on the exact same initial moisture
  const conventional = evaluateConventionalStrategy(moisture, validConfig);
  const forecastAware = evaluateForecastAwareStrategy(
    moisture,
    forecastArray,
    validConfig,
    decisionTime
  );

  // 6. Compute comparison metrics
  const waterSavedMm = clampWater(conventional.waterAppliedMm - forecastAware.waterAppliedMm);
  const waterSavedPercent =
    conventional.waterAppliedMm > 0
      ? Math.round((waterSavedMm / conventional.waterAppliedMm) * 1000) / 10
      : 0;

  let recommendation;
  let summary;

  if (waterSavedMm > 0) {
    recommendation = 'FORECAST_AWARE';
    summary = `Forecast-aware strategy conserves ${waterSavedMm.toFixed(1)} mm (${waterSavedPercent.toFixed(1)}%) of water by utilizing predicted rainfall.`;
  } else if (conventional.decision === 'SKIP' && forecastAware.decision === 'SKIP') {
    recommendation = 'NONE_NEEDED';
    summary = 'Soil moisture is currently adequate. Neither strategy requires irrigation at this time.';
  } else {
    recommendation = 'CONVENTIONAL';
    summary = 'No significant water savings from forecast; both strategies recommend irrigation for crop protection.';
  }

  // Collect any warnings emitted during evaluation
  const allWarnings = [...(forecastAware.warnings || [])];

  // 7. Assemble final immutable result
  return {
    scenario: {
      initialSoilMoisture: moisture,
      decisionTime,
      forecastWindowHours: validConfig.forecastWindowHours,
      forecastStatus: forecastAware.forecastStatus,
      location: env?.location || null,
    },
    conventional: {
      strategyName: conventional.strategyName,
      decision: conventional.decision,
      waterAppliedMm: conventional.waterAppliedMm,
      projectedMoisture: conventional.projectedMoisture,
      reason: conventional.reason,
    },
    forecastAware: {
      strategyName: forecastAware.strategyName,
      decision: forecastAware.decision,
      waterAppliedMm: forecastAware.waterAppliedMm,
      projectedMoisture: forecastAware.projectedMoisture,
      fallbackApplied: forecastAware.fallbackApplied,
      forecastStatus: forecastAware.forecastStatus,
      reason: forecastAware.reason,
    },
    comparison: {
      waterSavedMm,
      waterSavedPercent,
      recommendation,
      summary,
    },
    assumptions: [
      'SIMULATION ONLY: Simulated water quantities and soil moisture changes are simplified illustrative teaching formulas, NOT calibrated agronomic prescriptions (such as FAO-56 Penman-Monteith).',
      `Absorption factor (${validConfig.absorptionFactor}) assumes 1 mm of water increases topsoil moisture by ${validConfig.absorptionFactor} percentage points. In physical soils, infiltration varies by texture, structure, and slope.`,
      'Calculated soil moisture is clamped to the physical bounds of 0% to 100%.',
      'DEFER decisions postpone irrigation to avoid water waste; soil moisture must be re-evaluated after the forecast window or rain event.',
    ],
    warnings: allWarnings,
  };
}
