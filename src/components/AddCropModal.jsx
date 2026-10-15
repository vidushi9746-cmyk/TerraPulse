import { useState, useMemo } from 'react';
import { X, Sprout, Check, Layers, AlertCircle } from 'lucide-react';
import { SUPPORTED_CROPS, GROWTH_STAGES } from '../data/cropConfig';
import './AddCropModal.css';

function AddCropDialogContent({
  onClose,
  farmConfig,
  onSaveConfig,
  initialRowId = null,
}) {
  const currentPlots = useMemo(() => farmConfig?.plots || [], [farmConfig]);

  // Compute default row: user selected row if valid, or first fallow row, or 'row-1'
  const defaultRow = useMemo(() => {
    if (initialRowId) return initialRowId;
    const activeRows = new Set(currentPlots.map((p) => p.rowId));
    const allRows = ['row-1', 'row-2', 'row-3', 'row-4'];
    return allRows.find((r) => !activeRows.has(r)) || 'row-1';
  }, [initialRowId, currentPlots]);

  const [selectedCrop, setSelectedCrop] = useState('wheat');
  const [targetRowId, setTargetRowId] = useState(defaultRow);
  const [growthStage, setGrowthStage] = useState('vegetative');
  const [customPlotName, setCustomPlotName] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  const existingPlotOnRow = currentPlots.find((p) => p.rowId === targetRowId);
  const crop = SUPPORTED_CROPS[selectedCrop];
  const rowNum = targetRowId.replace('row-', '0');
  const defaultPlotName = crop ? `Plot ${rowNum} — ${crop.name}` : '';
  const effectivePlotName = customPlotName !== '' ? customPlotName : defaultPlotName;

  const handlePlantCrop = () => {
    if (!crop) {
      setErrorMessage('Please select a valid crop variety.');
      return;
    }

    const newPlot = {
      id: existingPlotOnRow?.id || `plot-${Date.now()}`,
      rowId: targetRowId,
      name: effectivePlotName.trim() || defaultPlotName,
      cropType: selectedCrop,
      plantingDate: new Date().toISOString().split('T')[0],
      growthStage,
    };

    let updatedPlots;
    if (existingPlotOnRow) {
      // Replant existing furrow
      updatedPlots = currentPlots.map((p) => (p.rowId === targetRowId ? newPlot : p));
    } else {
      // Plant in fallow furrow
      if (currentPlots.length >= 4) {
        setErrorMessage('All 4 furrow rows are currently planted. Select an existing furrow to replant.');
        return;
      }
      updatedPlots = [...currentPlots, newPlot];
    }

    const updatedConfig = {
      ...farmConfig,
      plots: updatedPlots,
    };

    onSaveConfig(updatedConfig);
    onClose();
  };

  return (
    <div className="add-crop-card" onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="add-crop-header">
        <div className="add-crop-title-wrap">
          <div className="add-crop-icon-box">
            <Sprout size={20} className="text-forest" />
          </div>
          <div>
            <h2 id="add-crop-modal-title" className="add-crop-title">
              Plant Crop in Furrow
            </h2>
            <p className="add-crop-subtitle">
              Select a crop variety and assign it to an agricultural furrow plot
            </p>
          </div>
        </div>
        <button
          type="button"
          className="add-crop-close-btn"
          onClick={onClose}
          aria-label="Close add crop dialog"
        >
          <X size={18} />
        </button>
      </div>

      {/* Error message if any */}
      {errorMessage && (
        <div className="add-crop-error-alert" role="alert">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Scrollable Body */}
      <div className="add-crop-body">
        {/* 1. Crop Selection Cards */}
        <div className="add-crop-section">
          <label className="section-label">1. Select Crop Variety</label>
          <div className="crop-cards-grid">
            {Object.values(SUPPORTED_CROPS).map((c) => {
              const isSelected = selectedCrop === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`crop-select-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedCrop(c.id);
                    setErrorMessage(null);
                  }}
                  aria-pressed={isSelected}
                >
                  <div className="crop-card-top">
                    <span className="crop-emoji">{c.icon}</span>
                    {isSelected && (
                      <span className="crop-selected-check">
                        <Check size={12} />
                      </span>
                    )}
                  </div>
                  <span className="crop-card-name">{c.name}</span>
                  <span className="crop-card-cat">{c.category}</span>
                  <p className="crop-card-desc">{c.description}</p>
                  <div className="crop-card-badges">
                    <span className="crop-chip">{c.density}</span>
                    <span className="crop-chip demand-chip">
                      Target: {c.baseTargetMoisture}% VWC
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Target Furrow Placement */}
        <div className="add-crop-section">
          <label className="section-label">
            <Layers size={14} className="text-forest" />
            <span>2. Target 3D Furrow Row</span>
          </label>
          <div className="furrow-select-grid">
            {['row-1', 'row-2', 'row-3', 'row-4'].map((rowId, idx) => {
              const isSelected = targetRowId === rowId;
              const plotOnRow = currentPlots.find((p) => p.rowId === rowId);
              const rowNames = [
                'Furrow 1 (North Berm)',
                'Furrow 2 (Mid-North)',
                'Furrow 3 (Mid-South)',
                'Furrow 4 (South Berm)',
              ];

              return (
                <button
                  key={rowId}
                  type="button"
                  className={`furrow-select-pill ${isSelected ? 'selected' : ''} ${
                    plotOnRow ? 'has-crop' : 'fallow'
                  }`}
                  onClick={() => {
                    setTargetRowId(rowId);
                    setErrorMessage(null);
                  }}
                >
                  <div className="furrow-pill-title">
                    <span className="furrow-num">0{idx + 1}</span>
                    <span className="furrow-name">{rowNames[idx]}</span>
                  </div>
                  <span className="furrow-status-text">
                    {plotOnRow
                      ? `Planted: ${SUPPORTED_CROPS[plotOnRow.cropType]?.shortName || 'Crop'}`
                      : 'Uncultivated / Fallow'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Growth Stage & Plot Name */}
        <div className="add-crop-section grid-2col">
          <div className="form-subgroup">
            <label htmlFor="crop-growth-stage" className="section-label">
              3. Initial Growth Stage
            </label>
            <select
              id="crop-growth-stage"
              value={growthStage}
              onChange={(e) => setGrowthStage(e.target.value)}
              className="add-crop-select"
            >
              {Object.values(GROWTH_STAGES).map((st) => (
                <option key={st.id} value={st.id}>
                  {st.label} ({st.waterAdjustment >= 0 ? `+${st.waterAdjustment}` : st.waterAdjustment}% water demand)
                </option>
              ))}
            </select>
            <span className="subgroup-helper">
              {GROWTH_STAGES[growthStage]?.description}
            </span>
          </div>

          <div className="form-subgroup">
            <label htmlFor="crop-plot-name" className="section-label">
              4. Plot Label (Optional)
            </label>
            <input
              id="crop-plot-name"
              type="text"
              value={customPlotName}
              onChange={(e) => setCustomPlotName(e.target.value)}
              className="add-crop-input"
              placeholder={defaultPlotName}
            />
            <span className="subgroup-helper">
              Custom descriptive label displayed in the 3D HUD & telemetry panels.
            </span>
          </div>
        </div>

        {/* Supported Model Note */}
        <div className="model-limitation-note">
          <span className="note-icon">🌱</span>
          <p className="note-text">
            <strong>Farm Architecture:</strong> The digital twin supports up to 4 cultivated furrow plots (Furrow Rows 1–4). Assigning a crop will immediately update the 3D field rows, soil moisture absorption model, and forecast-aware irrigation recommendations.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="add-crop-footer">
        <button type="button" className="btn-crop-cancel" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-crop-plant"
          onClick={handlePlantCrop}
        >
          <Sprout size={16} />
          <span>
            {existingPlotOnRow
              ? `Replant Furrow 0${targetRowId.replace('row-', '')}`
              : `Plant in Furrow 0${targetRowId.replace('row-', '')}`}
          </span>
        </button>
      </div>
    </div>
  );
}

export function AddCropModal({
  isOpen,
  onClose,
  farmConfig,
  onSaveConfig,
  selectedRowId = null,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="add-crop-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-crop-modal-title"
    >
      <AddCropDialogContent
        key={`${isOpen}-${selectedRowId || 'none'}`}
        onClose={onClose}
        farmConfig={farmConfig}
        onSaveConfig={onSaveConfig}
        initialRowId={selectedRowId}
      />
    </div>
  );
}

export default AddCropModal;
