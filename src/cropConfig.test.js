import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  convertAreaToSqm,
  convertDepthToLitres,
  deriveCropIrrigationThresholds,
  calculatePlotThresholds,
  estimateCropCanopyHealth,
  validateFarmConfig,
  DEFAULT_FARM_CONFIG,
  SUPPORTED_CROPS,
  GROWTH_STAGES,
} from './data/cropConfig.js';

describe('Farm Configuration & Crop Management Test Suite', () => {
  it('CFG-1: Parcel Area Unit Conversions (m² and hectares)', () => {
    // 1,000 m²
    assert.strictEqual(convertAreaToSqm(1000, 'sqm'), 1000);
    // 0.1 hectare = 1,000 m²
    assert.strictEqual(convertAreaToSqm(0.1, 'ha'), 1000);
    // 0.5 hectare = 5,000 m²
    assert.strictEqual(convertAreaToSqm(0.5, 'ha'), 5000);
    // 2.5 hectares = 25,000 m²
    assert.strictEqual(convertAreaToSqm(2.5, 'ha'), 25000);
    // Invalid / zero area defaults safely to 1,000 m²
    assert.strictEqual(convertAreaToSqm(-50, 'sqm'), 1000);
    assert.strictEqual(convertAreaToSqm(0, 'ha'), 1000);
    assert.strictEqual(convertAreaToSqm('invalid', 'sqm'), 1000);
  });

  it('CFG-2: Volumetric Water Conversion (litres = mm × areaSqm)', () => {
    // 1 mm over 1,000 m² = 1,000 L
    assert.strictEqual(convertDepthToLitres(1, 1000), 1000);
    // 56 mm over 1,000 m² = 56,000 L
    assert.strictEqual(convertDepthToLitres(56, 1000), 56000);
    // 56 mm over 2,500 m² (0.25 ha) = 140,000 L
    assert.strictEqual(convertDepthToLitres(56, 2500), 140000);
    // Negative depth clamped to 0 L
    assert.strictEqual(convertDepthToLitres(-5, 1000), 0);
  });

  it('CFG-3: Configuration Validation - Valid Default Config', () => {
    const result = validateFarmConfig(DEFAULT_FARM_CONFIG);
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('CFG-4: Configuration Validation - Invalid Area and Units', () => {
    const invalidConfig = {
      ...DEFAULT_FARM_CONFIG,
      areaValue: -200,
      areaUnit: 'acres', // unsupported
    };
    const result = validateFarmConfig(invalidConfig);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors.some((e) => e.includes('positive number')));
    assert.ok(result.errors.some((e) => e.includes('Area unit must be')));
  });

  it('CFG-5: Configuration Validation - Row Collision and Unsupported Crops', () => {
    const collisionConfig = {
      ...DEFAULT_FARM_CONFIG,
      plots: [
        {
          id: 'p1',
          rowId: 'row-1',
          name: 'Plot 1',
          cropType: 'wheat',
          plantingDate: '2026-09-01',
          growthStage: 'vegetative',
        },
        {
          id: 'p2',
          rowId: 'row-1', // Collision!
          name: 'Plot 2',
          cropType: 'unsupported_crop', // Unsupported!
          plantingDate: 'not-a-date',
          growthStage: 'invalid_stage',
        },
      ],
    };
    const result = validateFarmConfig(collisionConfig);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors.some((e) => e.includes('Multiple plots are assigned to row-1')));
    assert.ok(result.errors.some((e) => e.includes('unsupported crop type')));
    assert.ok(result.errors.some((e) => e.includes('invalid growth stage')));
  });

  it('CFG-6: Threshold Derivation - Crop & Growth Stage Sensitivity', () => {
    // 1. All flowering corn (high demand + reproductive sensitivity)
    const cornPlots = [
      { cropType: 'corn', growthStage: 'flowering' },
      { cropType: 'corn', growthStage: 'flowering' },
    ];
    const cornThresholds = deriveCropIrrigationThresholds(cornPlots);
    // Base corn dry = 38 + 4 (flowering) = 42
    assert.strictEqual(cornThresholds.dryThreshold, 42);
    // Base corn target = 65 + 4 = 69
    assert.strictEqual(cornThresholds.targetMoisture, 69);
    assert.ok(cornThresholds.targetMoisture > cornThresholds.dryThreshold);

    // 2. All maturation carrots (lower moisture need)
    const carrotPlots = [
      { cropType: 'carrots', growthStage: 'maturation' },
    ];
    const carrotThresholds = deriveCropIrrigationThresholds(carrotPlots);
    // Base carrot dry = 32 - 3 (maturation) = 29
    assert.strictEqual(carrotThresholds.dryThreshold, 29);
    // Base carrot target = 55 - 3 = 52
    assert.strictEqual(carrotThresholds.targetMoisture, 52);

    // 3. Empty plots fallback
    const emptyThresholds = deriveCropIrrigationThresholds([]);
    assert.strictEqual(emptyThresholds.dryThreshold, 35);
    assert.strictEqual(emptyThresholds.targetMoisture, 60);
  });

  it('CFG-7: Supported Crop Definitions Integrity', () => {
    const expectedCrops = ['wheat', 'corn', 'lettuce', 'carrots'];
    for (const key of expectedCrops) {
      assert.ok(SUPPORTED_CROPS[key], `Missing crop definition for ${key}`);
      assert.ok(SUPPORTED_CROPS[key].name);
      assert.ok(SUPPORTED_CROPS[key].baseDryThreshold > 0);
      assert.ok(SUPPORTED_CROPS[key].baseTargetMoisture > SUPPORTED_CROPS[key].baseDryThreshold);
    }

    const expectedStages = ['seedling', 'vegetative', 'flowering', 'maturation'];
    for (const stage of expectedStages) {
      assert.ok(GROWTH_STAGES[stage], `Missing growth stage for ${stage}`);
      assert.strictEqual(typeof GROWTH_STAGES[stage].waterAdjustment, 'number');
    }
  });

  it('CFG-8: Configuration Numeric Sanitization & Area Conversions', () => {
    // String area representation parses correctly
    assert.strictEqual(convertAreaToSqm('1000', 'sqm'), 1000);
    assert.strictEqual(convertAreaToSqm('0.25', 'ha'), 2500);

    // Volumetric calculation with string area
    const areaSqm = convertAreaToSqm('1000', 'sqm');
    const waterLitres = convertDepthToLitres(10, areaSqm);
    assert.strictEqual(waterLitres, 10000);
  });

  it('CFG-9: Individual Plot Resolves Correct Crop-Specific Configuration & Distinct Thresholds', () => {
    const plots = DEFAULT_FARM_CONFIG.plots;
    assert.strictEqual(plots.length, 4);

    // Plot 1: Golden Winter Wheat (vegetative: 35 dry, 60 target)
    const p1 = calculatePlotThresholds(plots[0]);
    assert.strictEqual(p1.isSupported, true);
    assert.strictEqual(p1.crop.id, 'wheat');
    assert.strictEqual(p1.dryThreshold, 35);
    assert.strictEqual(p1.targetMoisture, 60);

    // Plot 2: Sweet Maize / Corn (flowering: 38 + 4 = 42 dry, 65 + 4 = 69 target)
    const p2 = calculatePlotThresholds(plots[1]);
    assert.strictEqual(p2.isSupported, true);
    assert.strictEqual(p2.crop.id, 'corn');
    assert.strictEqual(p2.dryThreshold, 42);
    assert.strictEqual(p2.targetMoisture, 69);

    // Plot 3: Hydro-Tolerant Greens / Lettuce (vegetative: 40 dry, 65 target)
    const p3 = calculatePlotThresholds(plots[2]);
    assert.strictEqual(p3.isSupported, true);
    assert.strictEqual(p3.crop.id, 'lettuce');
    assert.strictEqual(p3.dryThreshold, 40);
    assert.strictEqual(p3.targetMoisture, 65);

    // Plot 4: Deep-Root Carrots (maturation: 32 - 3 = 29 dry, 55 - 3 = 52 target)
    const p4 = calculatePlotThresholds(plots[3]);
    assert.strictEqual(p4.isSupported, true);
    assert.strictEqual(p4.crop.id, 'carrots');
    assert.strictEqual(p4.dryThreshold, 29);
    assert.strictEqual(p4.targetMoisture, 52);

    // Verify all four plots have distinct target moistures in default configuration
    const targets = [p1.targetMoisture, p2.targetMoisture, p3.targetMoisture, p4.targetMoisture];
    assert.deepStrictEqual(targets, [60, 69, 65, 52]);
  });

  it('CFG-10: Target Moisture Obtains from Correct Configuration & Growth Stage Adjustments', () => {
    // Corn across all 4 stages: base target = 65, base dry = 38
    const seedlingCorn = calculatePlotThresholds({ cropType: 'corn', growthStage: 'seedling' });
    assert.strictEqual(seedlingCorn.targetMoisture, 63); // 65 - 2
    assert.strictEqual(seedlingCorn.dryThreshold, 36); // 38 - 2

    const vegCorn = calculatePlotThresholds({ cropType: 'corn', growthStage: 'vegetative' });
    assert.strictEqual(vegCorn.targetMoisture, 65); // 65 + 0
    assert.strictEqual(vegCorn.dryThreshold, 38); // 38 + 0

    const flowerCorn = calculatePlotThresholds({ cropType: 'corn', growthStage: 'flowering' });
    assert.strictEqual(flowerCorn.targetMoisture, 69); // 65 + 4
    assert.strictEqual(flowerCorn.dryThreshold, 42); // 38 + 4

    const matCorn = calculatePlotThresholds({ cropType: 'corn', growthStage: 'maturation' });
    assert.strictEqual(matCorn.targetMoisture, 62); // 65 - 3
    assert.strictEqual(matCorn.dryThreshold, 35); // 38 - 3
  });

  it('CFG-11: Changing Plot Crop Type Dynamically Updates Target Moisture Lookup', () => {
    const plot = {
      id: 'dynamic-plot',
      rowId: 'row-2',
      cropType: 'corn',
      growthStage: 'flowering',
    };
    const before = calculatePlotThresholds(plot);
    assert.strictEqual(before.targetMoisture, 69);

    // Change crop type to carrots (maturation)
    plot.cropType = 'carrots';
    plot.growthStage = 'maturation';
    const afterCarrots = calculatePlotThresholds(plot);
    assert.strictEqual(afterCarrots.targetMoisture, 52);
    assert.strictEqual(afterCarrots.crop.name, 'Deep-Root Carrots');

    // Change crop type to wheat (vegetative)
    plot.cropType = 'wheat';
    plot.growthStage = 'vegetative';
    const afterWheat = calculatePlotThresholds(plot);
    assert.strictEqual(afterWheat.targetMoisture, 60);
  });

  it('CFG-12: Canopy Health Values Are Crop-Specific and Derive from Intended Inputs', () => {
    const moisture = 34.0; // Baseline simulation soil moisture

    // Plot 4: Carrots (dry=29, target=52). At 34% moisture, it is comfortably in optimal zone (>= 29)
    const carrotsHealth = estimateCropCanopyHealth(
      { cropType: 'carrots', growthStage: 'maturation' },
      moisture
    );
    assert.strictEqual(carrotsHealth.isSupported, true);
    assert.strictEqual(carrotsHealth.isEstimate, true);
    assert.ok(carrotsHealth.score >= 90, `Expected carrots score >= 90, got ${carrotsHealth.score}`);
    assert.strictEqual(carrotsHealth.status, 'Optimal Canopy Health');

    // Plot 1: Wheat (dry=35, target=60). At 34% moisture, it is slightly below dry threshold
    const wheatHealth = estimateCropCanopyHealth(
      { cropType: 'wheat', growthStage: 'vegetative' },
      moisture
    );
    assert.strictEqual(wheatHealth.isSupported, true);
    assert.strictEqual(wheatHealth.score, 91);
    assert.strictEqual(wheatHealth.status, 'Optimal Canopy Health');

    // Plot 3: Lettuce (dry=40, target=65). At 34% moisture, it is 6% below dry threshold
    const lettuceHealth = estimateCropCanopyHealth(
      { cropType: 'lettuce', growthStage: 'vegetative' },
      moisture
    );
    assert.strictEqual(lettuceHealth.isSupported, true);
    assert.strictEqual(lettuceHealth.score, 83);
    assert.strictEqual(lettuceHealth.status, 'Stable Growth');

    // Plot 2: Corn (dry=42, target=69, flowering sensitivity 1.3). At 34% moisture, it is 8% below dry threshold
    const cornHealth = estimateCropCanopyHealth(
      { cropType: 'corn', growthStage: 'flowering' },
      moisture
    );
    assert.strictEqual(cornHealth.isSupported, true);
    assert.strictEqual(cornHealth.score, 77);
    assert.strictEqual(cornHealth.status, 'Stable Growth');

    // Verify all four crops produce different scores based on their specific agronomic parameters
    assert.notStrictEqual(carrotsHealth.score, cornHealth.score);
    assert.notStrictEqual(wheatHealth.score, cornHealth.score);
  });

  it('CFG-13: Identical Inputs Produce Deterministic Results (No Random Jitter)', () => {
    const plotA = { cropType: 'wheat', growthStage: 'vegetative' };
    const plotB = { cropType: 'wheat', growthStage: 'vegetative' };
    const moisture = 36.5;

    const resA1 = estimateCropCanopyHealth(plotA, moisture);
    const resA2 = estimateCropCanopyHealth(plotA, moisture);
    const resB = estimateCropCanopyHealth(plotB, moisture);

    // Repeated evaluations are identical
    assert.strictEqual(resA1.score, resA2.score);
    assert.strictEqual(resA1.status, resA2.status);
    assert.strictEqual(resA1.color, resA2.color);

    // Two distinct plot instances with identical configurations yield identical outputs
    assert.strictEqual(resA1.score, resB.score);
    assert.strictEqual(resA1.status, resB.status);
  });

  it('CFG-14: Missing or Unsupported Crop Configuration Handled Safely', () => {
    // 1. Null / undefined / invalid plot
    const nullPlot = calculatePlotThresholds(null);
    assert.strictEqual(nullPlot.isSupported, false);
    assert.strictEqual(nullPlot.targetMoisture, null);
    assert.strictEqual(nullPlot.dryThreshold, null);

    const nullHealth = estimateCropCanopyHealth(null, 35);
    assert.strictEqual(nullHealth.isSupported, false);
    assert.strictEqual(nullHealth.score, null);
    assert.strictEqual(nullHealth.status, 'N/A (Fallow Soil)');

    // 2. Unsupported crop type does not throw and is explicitly flagged
    const badCropPlot = { cropType: 'dragonfruit_unsupported', growthStage: 'vegetative' };
    const badThresholds = calculatePlotThresholds(badCropPlot);
    assert.strictEqual(badThresholds.isSupported, false);
    assert.strictEqual(badThresholds.targetMoisture, null);
    assert.ok(badThresholds.error.includes('Unsupported crop type'));

    const badHealth = estimateCropCanopyHealth(badCropPlot, 35);
    assert.strictEqual(badHealth.isSupported, false);
    assert.strictEqual(badHealth.score, null);
    assert.strictEqual(badHealth.status, 'N/A (Unsupported Crop)');

    // 3. deriveCropIrrigationThresholds does not silently convert unsupported crops to wheat
    const mixedPlots = [
      { cropType: 'wheat', growthStage: 'vegetative' }, // 35 dry, 60 target
      { cropType: 'unknown_crop', growthStage: 'vegetative' }, // unsupported
    ];
    const derived = deriveCropIrrigationThresholds(mixedPlots);
    // Only the valid wheat plot is considered
    assert.strictEqual(derived.dryThreshold, 35);
    assert.strictEqual(derived.targetMoisture, 60);
  });
});
