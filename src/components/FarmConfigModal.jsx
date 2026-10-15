import { useState, useEffect, useRef } from 'react';
import {
  X,
  SlidersHorizontal,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  RotateCcw,
  Check,
  Sprout,
  Maximize2,
} from 'lucide-react';
import {
  SUPPORTED_CROPS,
  GROWTH_STAGES,
  SUPPORTED_SOIL_TYPES,
  SUPPORTED_IRRIGATION_METHODS,
  DEFAULT_FARM_CONFIG,
  convertAreaToSqm,
  validateFarmConfig,
} from '../data/cropConfig';
import './FarmConfigModal.css';

export function FarmConfigModal({
  isOpen,
  onClose,
  farmConfig,
  onSaveConfig,
}) {
  // Local form state
  const [formConfig, setFormConfig] = useState(farmConfig || DEFAULT_FARM_CONFIG);
  const [validationErrors, setValidationErrors] = useState([]);
  const modalCardRef = useRef(null);

  // Synchronize form state whenever parent farmConfig prop changes
  const [prevFarmConfig, setPrevFarmConfig] = useState(farmConfig);
  if (farmConfig !== prevFarmConfig) {
    setPrevFarmConfig(farmConfig);
    setFormConfig(farmConfig || DEFAULT_FARM_CONFIG);
    setValidationErrors([]);
  }

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Update parcel properties
  const handleAreaChange = (value) => {
    setFormConfig((prev) => ({ ...prev, areaValue: value }));
  };

  const handleUnitChange = (newUnit) => {
    setFormConfig((prev) => {
      if (prev.areaUnit === newUnit) return prev;
      const num = Number(prev.areaValue);
      if (!Number.isFinite(num) || num <= 0) {
        return { ...prev, areaUnit: newUnit };
      }
      let convertedValue;
      if (prev.areaUnit === 'sqm' && newUnit === 'ha') {
        convertedValue = Math.round((num / 10000) * 100) / 100;
        if (convertedValue === 0) convertedValue = 0.05;
      } else if (prev.areaUnit === 'ha' && newUnit === 'sqm') {
        convertedValue = Math.round(num * 10000);
      } else {
        convertedValue = num;
      }
      return { ...prev, areaUnit: newUnit, areaValue: convertedValue };
    });
  };

  const handleSoilChange = (soilType) => {
    setFormConfig((prev) => ({ ...prev, soilType }));
  };

  const handleIrrigationMethodChange = (irrigationMethod) => {
    setFormConfig((prev) => ({ ...prev, irrigationMethod }));
  };

  // Plot operations
  const handleUpdatePlot = (index, field, value) => {
    setFormConfig((prev) => {
      const updatedPlots = prev.plots.map((plot, i) => {
        if (i !== index) return plot;
        const updated = { ...plot, [field]: value };
        // Auto-update default title if cropType changed
        if (field === 'cropType' && SUPPORTED_CROPS[value]) {
          const rowNum = plot.rowId.replace('row-', '0');
          updated.name = `Plot ${rowNum} — ${SUPPORTED_CROPS[value].name}`;
        }
        return updated;
      });
      return { ...prev, plots: updatedPlots };
    });
  };

  const handleRemovePlot = (index) => {
    setFormConfig((prev) => ({
      ...prev,
      plots: prev.plots.filter((_, i) => i !== index),
    }));
  };

  const handleAddPlot = () => {
    setFormConfig((prev) => {
      if (prev.plots.length >= 4) return prev;

      // Find first unassigned row
      const assignedRows = new Set(prev.plots.map((p) => p.rowId));
      const allRows = ['row-1', 'row-2', 'row-3', 'row-4'];
      const availableRow = allRows.find((r) => !assignedRows.has(r)) || 'row-1';

      const cropKeys = Object.keys(SUPPORTED_CROPS);
      const nextCropKey = cropKeys[prev.plots.length % cropKeys.length];
      const crop = SUPPORTED_CROPS[nextCropKey];
      const rowNum = availableRow.replace('row-', '0');

      const newPlot = {
        id: `plot-${Date.now()}`,
        rowId: availableRow,
        name: `Plot ${rowNum} — ${crop.name}`,
        cropType: nextCropKey,
        plantingDate: new Date().toISOString().split('T')[0],
        growthStage: 'vegetative',
      };

      return {
        ...prev,
        plots: [...prev.plots, newPlot],
      };
    });
  };

  const handleResetDefaults = () => {
    setFormConfig(DEFAULT_FARM_CONFIG);
    setValidationErrors([]);
  };

  const handleSave = () => {
    const numArea = Number(formConfig.areaValue);
    const sanitizedConfig = {
      ...formConfig,
      areaValue: Number.isFinite(numArea) && numArea > 0 ? numArea : 1000,
    };

    const validation = validateFarmConfig(sanitizedConfig);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    onSaveConfig(sanitizedConfig);
    onClose();
  };

  if (!isOpen) return null;

  const currentAreaSqm = convertAreaToSqm(formConfig.areaValue, formConfig.areaUnit);
  const currentAreaHa = (currentAreaSqm / 10000).toFixed(2);
  const assignedRows = new Set(formConfig.plots.map((p) => p.rowId));

  return (
    <div
      className="farm-config-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Farm Configuration Modal"
    >
      <div
        className="farm-config-card"
        ref={modalCardRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="config-modal-header">
          <div className="config-title-wrap">
            <SlidersHorizontal size={22} className="text-forest" />
            <div>
              <h2 className="config-title">Farm Configuration & Crops</h2>
              <p className="config-subtitle">
                Configure parcel acreage, soil type, and cultivated furrow plots
              </p>
            </div>
          </div>
          <button
            type="button"
            className="config-close-btn"
            onClick={onClose}
            aria-label="Close configuration modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Validation Errors Alert */}
        {validationErrors.length > 0 && (
          <div className="config-errors-box" role="alert">
            <AlertCircle size={18} className="text-red-500" />
            <div className="errors-list">
              <span className="errors-heading">Please address the following items:</span>
              <ul>
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="config-modal-body">
          {/* SECTION 1: Parcel Acreage & Baseline Settings */}
          <div className="config-section">
            <h3 className="section-heading">Parcel Dimensions & Infrastructure</h3>
            <div className="config-grid-2col">
              {/* Farm Area Input + Unit Selector */}
              <div className="form-group">
                <label htmlFor="farm-area-input" className="form-label">
                  <Maximize2 size={14} className="text-forest" />
                  <span>Farm Parcel Area:</span>
                </label>
                <div className="area-input-composite">
                  <input
                    id="farm-area-input"
                    type="number"
                    min="10"
                    max="100000"
                    step={formConfig.areaUnit === 'ha' ? '0.05' : '50'}
                    value={formConfig.areaValue}
                    onChange={(e) => handleAreaChange(e.target.value)}
                    className="form-input area-number-input"
                    aria-label="Farm parcel area value"
                  />
                  <select
                    value={formConfig.areaUnit}
                    onChange={(e) => handleUnitChange(e.target.value)}
                    className="form-select area-unit-select"
                    aria-label="Area unit"
                  >
                    <option value="sqm">m² (Square Metres)</option>
                    <option value="ha">Hectares (ha)</option>
                  </select>
                </div>
                <span className="form-helper-text">
                  Equivalent to {currentAreaSqm.toLocaleString()} m² ({currentAreaHa} ha). Drives volume conversions: 1 mm = 1 L/m².
                </span>
              </div>

              {/* Soil Classification */}
              <div className="form-group">
                <label htmlFor="soil-type-select" className="form-label">
                  <Sprout size={14} className="text-forest" />
                  <span>Soil Classification:</span>
                </label>
                <select
                  id="soil-type-select"
                  value={formConfig.soilType}
                  onChange={(e) => handleSoilChange(e.target.value)}
                  className="form-select"
                >
                  {SUPPORTED_SOIL_TYPES.map((soil) => (
                    <option key={soil} value={soil}>
                      {soil}
                    </option>
                  ))}
                </select>
                <span className="form-helper-text">
                  Regional topsoil texture. Governs default illustrative infiltration retention.
                </span>
              </div>

              {/* Irrigation System Method */}
              <div className="form-group full-width-field">
                <label htmlFor="irrigation-method-select" className="form-label">
                  <span>Irrigation Delivery System:</span>
                </label>
                <select
                  id="irrigation-method-select"
                  value={formConfig.irrigationMethod}
                  onChange={(e) => handleIrrigationMethodChange(e.target.value)}
                  className="form-select"
                >
                  {SUPPORTED_IRRIGATION_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: Cultivated Crop Plots */}
          <div className="config-section">
            <div className="section-heading-row">
              <div>
                <h3 className="section-heading">Cultivated Furrow Plots ({formConfig.plots.length} / 4 Rows)</h3>
                <p className="section-subtext">
                  Each plot corresponds to a physical furrow row in the 3D living farm.
                </p>
              </div>
              {formConfig.plots.length < 4 && (
                <button
                  type="button"
                  className="btn-add-plot"
                  onClick={handleAddPlot}
                  title="Add another crop plot to an unassigned furrow"
                >
                  <Plus size={15} />
                  <span>Add Crop Plot</span>
                </button>
              )}
            </div>

            {/* Empty State */}
            {formConfig.plots.length === 0 && (
              <div className="plots-empty-state">
                <Sprout size={32} className="text-forest" />
                <p className="empty-title">All 4 Furrows are Currently Fallow</p>
                <p className="empty-desc">
                  No crops are planted. Add a crop plot to observe botanical growth and evaluate irrigation scheduling.
                </p>
                <button type="button" className="btn-add-plot" onClick={handleAddPlot}>
                  <Plus size={15} />
                  <span>Add First Crop Plot</span>
                </button>
              </div>
            )}

            {/* Plots List */}
            <div className="plots-list">
              {formConfig.plots.map((plot, index) => {
                const crop = SUPPORTED_CROPS[plot.cropType] || SUPPORTED_CROPS.wheat;
                const stage = GROWTH_STAGES[plot.growthStage] || GROWTH_STAGES.vegetative;

                return (
                  <div key={plot.id} className="plot-config-item">
                    <div className="plot-item-top">
                      <div className="plot-item-badge">
                        <span className="plot-icon">{crop.icon}</span>
                        <input
                          type="text"
                          value={plot.name}
                          onChange={(e) => handleUpdatePlot(index, 'name', e.target.value)}
                          className="plot-title-input"
                          placeholder="Plot Name"
                          aria-label={`Plot ${index + 1} Name`}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn-remove-plot"
                        onClick={() => handleRemovePlot(index)}
                        title="Remove crop from this furrow"
                        aria-label={`Remove plot ${plot.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="plot-fields-grid">
                      {/* Furrow Row Placement */}
                      <div className="plot-field">
                        <label className="field-label">Assigned 3D Furrow:</label>
                        <select
                          value={plot.rowId}
                          onChange={(e) => handleUpdatePlot(index, 'rowId', e.target.value)}
                          className="field-select"
                        >
                          {['row-1', 'row-2', 'row-3', 'row-4'].map((row) => {
                            const isTakenByOther = assignedRows.has(row) && row !== plot.rowId;
                            return (
                              <option key={row} value={row} disabled={isTakenByOther}>
                                {row === 'row-1'
                                  ? 'Furrow Row 1 (North Berm)'
                                  : row === 'row-2'
                                  ? 'Furrow Row 2 (Mid-North)'
                                  : row === 'row-3'
                                  ? 'Furrow Row 3 (Mid-South)'
                                  : 'Furrow Row 4 (South Berm)'}
                                {isTakenByOther ? ' (Assigned)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Crop Type Selection */}
                      <div className="plot-field">
                        <label className="field-label">Supported Crop Type:</label>
                        <select
                          value={plot.cropType}
                          onChange={(e) => handleUpdatePlot(index, 'cropType', e.target.value)}
                          className="field-select"
                        >
                          {Object.values(SUPPORTED_CROPS).map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.icon} {c.name} ({c.category})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Planting Date */}
                      <div className="plot-field">
                        <label className="field-label">
                          <Calendar size={13} />
                          <span>Planting Date:</span>
                        </label>
                        <input
                          type="date"
                          value={plot.plantingDate}
                          onChange={(e) => handleUpdatePlot(index, 'plantingDate', e.target.value)}
                          className="field-input date-input"
                        />
                      </div>

                      {/* Growth Stage */}
                      <div className="plot-field">
                        <label className="field-label">
                          <Sprout size={13} />
                          <span>Growth Stage:</span>
                        </label>
                        <select
                          value={plot.growthStage}
                          onChange={(e) => handleUpdatePlot(index, 'growthStage', e.target.value)}
                          className="field-select"
                        >
                          {Object.values(GROWTH_STAGES).map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="plot-item-footer">
                      <span className="plot-detail-chip">Density: {crop.density}</span>
                      <span className="plot-detail-chip stage-chip">{stage.description}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="config-modal-footer">
          <button
            type="button"
            className="btn-reset-config"
            onClick={handleResetDefaults}
            title="Reset configuration to 4 standard demo crop rows"
          >
            <RotateCcw size={14} />
            <span>Reset to Defaults</span>
          </button>

          <div className="footer-actions-right">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-apply-config"
              onClick={handleSave}
            >
              <Check size={16} />
              <span>Save & Apply Configuration</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FarmConfigModal;
