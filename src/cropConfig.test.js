import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  convertAreaToSqm,
  convertDepthToLitres,
  deriveCropIrrigationThresholds,
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
});
