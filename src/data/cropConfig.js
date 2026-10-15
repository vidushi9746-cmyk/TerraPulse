/**
 * Farm Configuration & Supported Crops Definitions
 *
 * Provides crop archetypes, growth stages, area conversions, and validation logic
 * for TerraPulse configurable virtual farms.
 */

export const SUPPORTED_CROPS = Object.freeze({
  wheat: {
    id: 'wheat',
    name: 'Golden Winter Wheat',
    shortName: 'Wheat',
    icon: '🌾',
    category: 'Cereal Grain',
    description: 'Deep fibrous root system; moderate drought tolerance.',
    density: '24 Stalk Clusters / m²',
    baseDryThreshold: 35,
    baseTargetMoisture: 60,
  },
  corn: {
    id: 'corn',
    name: 'Sweet Maize / Corn',
    shortName: 'Corn',
    icon: '🌽',
    category: 'Broadleaf Cereal',
    description: 'Tall canopy with high peak transpiration demand during tasseling.',
    density: '14 Stalks / m²',
    baseDryThreshold: 38,
    baseTargetMoisture: 65,
  },
  lettuce: {
    id: 'lettuce',
    name: 'Hydro-Tolerant Greens',
    shortName: 'Lettuce',
    icon: '🥬',
    category: 'Leafy Vegetable',
    description: 'Shallow root system sensitive to topsoil moisture fluctuations.',
    density: '18 Rosettes / m²',
    baseDryThreshold: 40,
    baseTargetMoisture: 65,
  },
  carrots: {
    id: 'carrots',
    name: 'Deep-Root Carrots',
    shortName: 'Carrots',
    icon: '🥕',
    category: 'Root Vegetable',
    description: 'Taproot vegetable requiring deep sub-surface moisture retention.',
    density: '28 Fronds / m²',
    baseDryThreshold: 32,
    baseTargetMoisture: 55,
  },
});

export const GROWTH_STAGES = Object.freeze({
  seedling: {
    id: 'seedling',
    label: 'Seedling / Emergence',
    shortLabel: 'Seedling',
    waterAdjustment: -2,
    description: 'Early establishment phase with shallow root penetration.',
  },
  vegetative: {
    id: 'vegetative',
    label: 'Vegetative Growth',
    shortLabel: 'Vegetative',
    waterAdjustment: 0,
    description: 'Active canopy expansion and rapid biomass accumulation.',
  },
  flowering: {
    id: 'flowering',
    label: 'Flowering / Tasseling',
    shortLabel: 'Flowering',
    waterAdjustment: 4,
    description: 'Reproductive bloom phase with peak water deficit sensitivity.',
  },
  maturation: {
    id: 'maturation',
    label: 'Maturation / Ripening',
    shortLabel: 'Maturation',
    waterAdjustment: -3,
    description: 'Pre-harvest grain fill or root bulking with reduced irrigation needs.',
  },
});

export const SUPPORTED_SOIL_TYPES = Object.freeze([
  'Willakenzie Loamy Silt',
  'Clay Loam',
  'Sandy Loam',
  'Organic Peat Silt',
]);

export const SUPPORTED_IRRIGATION_METHODS = Object.freeze([
  'Drip Micro-Irrigation',
  'Overhead Micro-Sprinkler',
  'Subsurface Drip Irrigation',
]);

/**
 * Standard 4-row demonstration farm configuration.
 */
export const DEFAULT_FARM_CONFIG = Object.freeze({
  areaValue: 1000,
  areaUnit: 'sqm', // 'sqm' | 'ha'
  soilType: 'Willakenzie Loamy Silt',
  irrigationMethod: 'Drip Micro-Irrigation',
  plots: [
    {
      id: 'plot-1',
      rowId: 'row-1',
      name: 'Plot 01 — Golden Winter Wheat',
      cropType: 'wheat',
      plantingDate: '2026-09-15',
      growthStage: 'vegetative',
    },
    {
      id: 'plot-2',
      rowId: 'row-2',
      name: 'Plot 02 — Sweet Maize / Corn',
      cropType: 'corn',
      plantingDate: '2026-08-20',
      growthStage: 'flowering',
    },
    {
      id: 'plot-3',
      rowId: 'row-3',
      name: 'Plot 03 — Hydro-Tolerant Greens',
      cropType: 'lettuce',
      plantingDate: '2026-10-01',
      growthStage: 'vegetative',
    },
    {
      id: 'plot-4',
      rowId: 'row-4',
      name: 'Plot 04 — Deep-Root Carrots',
      cropType: 'carrots',
      plantingDate: '2026-09-01',
      growthStage: 'maturation',
    },
  ],
});

/**
 * Converts farm area to square metres (m²).
 *
 * @param {number} value - Area value
 * @param {'sqm'|'ha'} unit - Area unit
 * @returns {number} Area in square metres
 */
export function convertAreaToSqm(value, unit = 'sqm') {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return 1000;
  if (unit === 'ha') {
    return Math.round(num * 10000 * 100) / 100;
  }
  return Math.round(num * 100) / 100;
}

/**
 * Converts water depth in millimetres to total volume in Litres.
 * Formula: Litres = mm × area in m²
 *
 * @param {number} depthMm - Water depth in mm
 * @param {number} areaSqm - Area in square metres
 * @returns {number} Volume in Litres
 */
export function convertDepthToLitres(depthMm, areaSqm) {
  const depth = typeof depthMm === 'number' && Number.isFinite(depthMm) ? Math.max(0, depthMm) : 0;
  const area = typeof areaSqm === 'number' && Number.isFinite(areaSqm) ? Math.max(0, areaSqm) : 1000;
  return Math.round(depth * area);
}

/**
 * Resolves crop-specific irrigation thresholds for a single plot based on its crop configuration and growth stage.
 *
 * @param {Object} plot - Plot object containing cropType and growthStage
 * @returns {{
 *   crop: Object | null,
 *   stage: Object | null,
 *   dryThreshold: number | null,
 *   targetMoisture: number | null,
 *   isSupported: boolean,
 *   error?: string
 * }}
 */
export function calculatePlotThresholds(plot) {
  if (!plot || typeof plot !== 'object') {
    return {
      crop: null,
      stage: null,
      dryThreshold: null,
      targetMoisture: null,
      isSupported: false,
      error: 'Invalid or missing plot object.',
    };
  }

  const crop = SUPPORTED_CROPS[plot.cropType];
  if (!crop) {
    return {
      crop: null,
      stage: null,
      dryThreshold: null,
      targetMoisture: null,
      isSupported: false,
      error: `Unsupported crop type: "${plot.cropType}".`,
    };
  }

  const stage = GROWTH_STAGES[plot.growthStage];
  const waterAdjustment = stage ? stage.waterAdjustment : 0;

  const rawDry = crop.baseDryThreshold + waterAdjustment;
  const rawTarget = crop.baseTargetMoisture + waterAdjustment;

  const dryThreshold = Math.min(48, Math.max(25, rawDry));
  const targetMoisture = Math.min(75, Math.max(dryThreshold + 10, rawTarget));

  return {
    crop,
    stage: stage || null,
    dryThreshold,
    targetMoisture,
    isSupported: true,
  };
}

/**
 * Stage sensitivity multiplier for moisture deficit stress.
 * Reproductive/bloom phases (flowering) have peak water deficit sensitivity.
 */
const STAGE_STRESS_SENSITIVITY = Object.freeze({
  seedling: 1.1,
  vegetative: 1.0,
  flowering: 1.3,
  maturation: 0.85,
});

/**
 * Estimates canopy health score and status for a specific crop plot based on root-zone soil moisture.
 *
 * NOTE: This is a deterministic teaching digital twin estimate based on root-zone soil moisture relative
 * to crop-specific water deficit thresholds and growth stage sensitivity. It is NOT a physical
 * multispectral NDVI sensor probe.
 *
 * @param {Object} plot - Plot object containing cropType and growthStage
 * @param {number} soilMoisture - Current volumetric soil moisture percentage (0-100)
 * @returns {{
 *   score: number | null,
 *   status: string,
 *   color: string,
 *   isSupported: boolean,
 *   isEstimate: boolean,
 *   dryThreshold: number | null,
 *   targetMoisture: number | null,
 *   optimalMoisture: number | null,
 *   assumptionNote: string
 * }}
 */
export function estimateCropCanopyHealth(plot, soilMoisture) {
  if (!plot || typeof plot !== 'object') {
    return {
      score: null,
      status: 'N/A (Fallow Soil)',
      color: '#888888',
      isSupported: false,
      isEstimate: true,
      dryThreshold: null,
      targetMoisture: null,
      optimalMoisture: null,
      assumptionNote: 'No crop planted in this furrow (fallow soil).',
    };
  }

  const thresholds = calculatePlotThresholds(plot);
  if (!thresholds.isSupported) {
    return {
      score: null,
      status: 'N/A (Unsupported Crop)',
      color: '#888888',
      isSupported: false,
      isEstimate: true,
      dryThreshold: null,
      targetMoisture: null,
      optimalMoisture: null,
      assumptionNote: thresholds.error || 'Unsupported crop type.',
    };
  }

  const moisture =
    typeof soilMoisture === 'number' && Number.isFinite(soilMoisture)
      ? Math.min(100, Math.max(0, soilMoisture))
      : 34.0;

  const { dryThreshold, targetMoisture, stage } = thresholds;
  const optimalMoisture = Math.round(((dryThreshold + targetMoisture) / 2) * 10) / 10;
  const span = targetMoisture - dryThreshold;
  const sensitivity = (stage && STAGE_STRESS_SENSITIVITY[stage.id]) || 1.0;

  let rawScore;

  if (moisture >= dryThreshold && moisture <= targetMoisture + 8) {
    // Optimal / comfortable hydration range
    const distFromMid = Math.abs(moisture - optimalMoisture);
    const fraction = distFromMid / (span / 2 + 6);
    rawScore = Math.round(98 - Math.min(1, fraction) * 5); // 93 - 98
  } else if (moisture < dryThreshold) {
    // Moisture deficit stress
    const deficit = dryThreshold - moisture;
    const deficitRatio = deficit / Math.max(1, dryThreshold);
    const stressImpact = deficitRatio * 65 * sensitivity;
    rawScore = Math.round(93 - stressImpact);
  } else {
    // Moisture surplus / over-saturation (anoxia stress)
    const surplus = moisture - (targetMoisture + 8);
    rawScore = Math.round(93 - surplus * 0.85);
  }

  const score = Math.max(30, Math.min(99, rawScore));

  const status =
    score > 90
      ? 'Optimal Canopy Health'
      : score > 75
      ? 'Stable Growth'
      : score > 50
      ? 'Hydration Stress'
      : 'Severe Drought Wilting';

  const color =
    score > 85 ? '#B8D6A0' : score > 65 ? '#E0A94F' : '#D96B5B';

  return {
    score,
    status,
    color,
    isSupported: true,
    isEstimate: true,
    dryThreshold,
    targetMoisture,
    optimalMoisture,
    assumptionNote: 'Deterministic agronomic model based on root-zone soil moisture relative to crop-specific water deficit thresholds and growth stage sensitivity.',
  };
}

/**
 * Computes average irrigation threshold parameters based on configured crops.
 *
 * NOTE: These are conservative teaching rules intended for illustrative digital twins,
 * not scientific FAO-56 crop coefficients.
 *
 * @param {Array<Object>} plots - Configured crop plots
 * @returns {{ dryThreshold: number, targetMoisture: number, assumptionNote: string }}
 */
export function deriveCropIrrigationThresholds(plots = []) {
  if (!Array.isArray(plots) || plots.length === 0) {
    return {
      dryThreshold: 35,
      targetMoisture: 60,
      assumptionNote: 'Default baseline thresholds applied (no active crops configured).',
    };
  }

  // Handle missing or unsupported crop configurations explicitly rather than silently assigning an arbitrary crop
  const validPlots = plots.filter((p) => p && typeof p === 'object' && SUPPORTED_CROPS[p.cropType]);
  if (validPlots.length === 0) {
    return {
      dryThreshold: 35,
      targetMoisture: 60,
      assumptionNote: 'Default baseline thresholds applied (no supported active crops configured).',
    };
  }

  let totalDry = 0;
  let totalTarget = 0;

  for (const plot of validPlots) {
    const { dryThreshold, targetMoisture } = calculatePlotThresholds(plot);
    totalDry += dryThreshold;
    totalTarget += targetMoisture;
  }

  const dryThreshold = Math.round((totalDry / validPlots.length) * 10) / 10;
  const targetMoisture = Math.round((totalTarget / validPlots.length) * 10) / 10;

  return {
    dryThreshold: Math.min(48, Math.max(25, dryThreshold)),
    targetMoisture: Math.min(75, Math.max(dryThreshold + 10, targetMoisture)),
    assumptionNote: `Thresholds weighted across ${validPlots.length} active plot(s) based on crop sensitivity and vegetative growth stage.`,
  };
}

/**
 * Validates a farm configuration object.
 *
 * @param {Object} config - Farm configuration to validate
 * @returns {{ isValid: boolean, errors: string[] }} Validation result
 */
export function validateFarmConfig(config) {
  const errors = [];

  if (!config || typeof config !== 'object') {
    return { isValid: false, errors: ['Farm configuration must be an object.'] };
  }

  // Validate area
  const areaNum = Number(config.areaValue);
  if (!Number.isFinite(areaNum) || areaNum <= 0) {
    errors.push('Farm area must be a positive number greater than 0.');
  }

  if (config.areaUnit !== 'sqm' && config.areaUnit !== 'ha') {
    errors.push('Area unit must be either "sqm" or "ha".');
  }

  // Validate plots
  if (!Array.isArray(config.plots)) {
    errors.push('Plots must be an array.');
  } else {
    if (config.plots.length > 4) {
      errors.push('A maximum of 4 furrow plots can be configured for this field parcel.');
    }

    const seenRows = new Set();
    config.plots.forEach((plot, idx) => {
      if (!plot.id) {
        errors.push(`Plot at index ${idx} is missing an ID.`);
      }
      if (!plot.rowId || !['row-1', 'row-2', 'row-3', 'row-4'].includes(plot.rowId)) {
        errors.push(`Plot "${plot.name || idx}" must be assigned to row-1, row-2, row-3, or row-4.`);
      } else {
        if (seenRows.has(plot.rowId)) {
          errors.push(`Multiple plots are assigned to ${plot.rowId}. Each furrow row can host at most one crop.`);
        }
        seenRows.add(plot.rowId);
      }

      if (!plot.cropType || !SUPPORTED_CROPS[plot.cropType]) {
        errors.push(`Plot "${plot.name || idx}" has an unsupported crop type: "${plot.cropType}".`);
      }

      if (!plot.growthStage || !GROWTH_STAGES[plot.growthStage]) {
        errors.push(`Plot "${plot.name || idx}" has an invalid growth stage: "${plot.growthStage}".`);
      }

      if (plot.plantingDate) {
        const d = new Date(plot.plantingDate);
        if (Number.isNaN(d.getTime())) {
          errors.push(`Plot "${plot.name || idx}" has an invalid planting date: "${plot.plantingDate}".`);
        }
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
