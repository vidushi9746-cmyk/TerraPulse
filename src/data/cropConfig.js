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

  let totalDry = 0;
  let totalTarget = 0;

  for (const plot of plots) {
    const crop = SUPPORTED_CROPS[plot.cropType] || SUPPORTED_CROPS.wheat;
    const stage = GROWTH_STAGES[plot.growthStage] || GROWTH_STAGES.vegetative;

    const adjustedDry = crop.baseDryThreshold + stage.waterAdjustment;
    const adjustedTarget = crop.baseTargetMoisture + stage.waterAdjustment;

    totalDry += adjustedDry;
    totalTarget += adjustedTarget;
  }

  const dryThreshold = Math.round((totalDry / plots.length) * 10) / 10;
  const targetMoisture = Math.round((totalTarget / plots.length) * 10) / 10;

  return {
    dryThreshold: Math.min(48, Math.max(25, dryThreshold)),
    targetMoisture: Math.min(75, Math.max(dryThreshold + 10, targetMoisture)),
    assumptionNote: `Thresholds weighted across ${plots.length} active plot(s) based on crop sensitivity and vegetative growth stage.`,
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
