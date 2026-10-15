import './ComparisonPanel.css';

export function ComparisonPanel({
    comparisonResult,
    reactiveLitres,
    forecastAwareLitres,
    expectedRainMm,
    scenarioLabel = '6-Hour Forecast Decision Window',
    farmAreaSqm = 1000,
}) {
    // Extract values either from real irrigation engine comparisonResult or fallback props
    const hasEngineResult = Boolean(comparisonResult && comparisonResult.conventional);

    const conventional = comparisonResult?.conventional;
    const forecastAware = comparisonResult?.forecastAware;
    const comparison = comparisonResult?.comparison;
    const scenario = comparisonResult?.scenario;
    const warnings = comparisonResult?.warnings || [];

    // Depth in mm from engine
    const reactiveMm = hasEngineResult ? conventional.waterAppliedMm : null;
    const forecastAwareMm = hasEngineResult ? forecastAware.waterAppliedMm : null;
    const waterSavedMm = hasEngineResult ? comparison.waterSavedMm : null;

    // Convert mm to litres: litres = mm * farmAreaSqm (1 mm over 1 m² = 1 L)
    const reactive = hasEngineResult
        ? Math.round(reactiveMm * farmAreaSqm)
        : Math.max(0, Number(reactiveLitres) || 0);

    const forecastAwareVal = hasEngineResult
        ? Math.round(forecastAwareMm * farmAreaSqm)
        : Math.max(0, Number(forecastAwareLitres) || 0);

    const savedLitres = hasEngineResult
        ? Math.round(waterSavedMm * farmAreaSqm)
        : reactive - forecastAwareVal;

    const isZeroBaseline = hasEngineResult ? conventional?.waterAppliedMm === 0 : reactive === 0;

    const savingsPercent = hasEngineResult
        ? comparison.waterSavedPercent
        : reactive > 0
            ? (savedLitres / reactive) * 100
            : null;

    const rainMm = hasEngineResult
        ? typeof scenario?.totalRainMm === 'number'
            ? scenario.totalRainMm
            : typeof forecastAware?.totalRainMm === 'number'
                ? forecastAware.totalRainMm
                : null
        : typeof expectedRainMm === 'number'
            ? expectedRainMm
            : null;

    const recommendation = comparison?.recommendation || (savedLitres > 0 ? 'FORECAST_AWARE' : 'CONVENTIONAL');
    const fallbackApplied = forecastAware?.fallbackApplied;
    const forecastStatus = scenario?.forecastStatus;

    return (
        <section className="comparison-panel" aria-label="Irrigation Strategy Comparison">
            <div className="comparison-header">
                <div className="comparison-title-wrap">
                    <h3 className="comparison-title">Irrigation Strategy Comparison</h3>
                    <span className="comparison-scenario-tag">{scenarioLabel}</span>
                </div>
                <span className="badge-tag">SIMULATED ESTIMATE</span>
            </div>

            {/* Primary Comparison Highlight Card */}
            <div className="comparison-delta-card">
                <div className="delta-stat-column">
                    <span className="delta-label">
                        {savedLitres > 0
                            ? 'ESTIMATED WATER SAVED'
                            : savedLitres < 0
                                ? 'ESTIMATED ADDITIONAL WATER USED'
                                : 'NO DIFFERENCE IN WATER USE'}
                    </span>
                    <div className="delta-value-row">
                        <span className="delta-number">
                            {waterSavedMm !== null ? `${Math.abs(waterSavedMm).toFixed(1)} mm` : `${Math.abs(savedLitres).toLocaleString()} L`}
                        </span>
                        <span className="delta-volume">
                            ({Math.abs(savedLitres).toLocaleString()} L / {farmAreaSqm.toLocaleString()} m²)
                        </span>
                    </div>
                </div>

                <div className="delta-meta-column">
                    <div className="delta-pill-wrap">
                        <span
                            className={`recommendation-pill ${recommendation === 'FORECAST_AWARE'
                                ? 'badge-favorable'
                                : recommendation === 'NONE_NEEDED'
                                    ? 'badge-neutral'
                                    : 'badge-conventional'
                                }`}
                        >
                            {recommendation === 'FORECAST_AWARE'
                                ? 'Forecast-Aware Recommended'
                                : recommendation === 'NONE_NEEDED'
                                    ? 'Soil Adequate (Standby)'
                                    : 'Conventional Recommended'}
                        </span>
                    </div>
                    <span className="delta-percent-sub">
                        {isZeroBaseline
                            ? 'Savings: N/A (baseline water requirement is 0 L)'
                            : savingsPercent !== null && typeof savingsPercent === 'number'
                                ? savingsPercent > 0
                                    ? `${savingsPercent.toFixed(1)}% water saved by timing irrigation`
                                    : savingsPercent < 0
                                        ? `${Math.abs(savingsPercent).toFixed(1)}% more water used`
                                        : 'No net difference in water use'
                                : 'Savings: N/A'}
                    </span>
                </div>
            </div>

            {/* Strategies Side-by-Side Cards */}
            <div className="strategies-grid">
                {/* Conventional Reactive Strategy */}
                <div className="strategy-card conventional-card">
                    <div className="strategy-card-header">
                        <span className="strategy-name">Conventional (Reactive)</span>
                        <span
                            className={`decision-badge ${conventional?.decision === 'IRRIGATE' ? 'badge-irrigate' : 'badge-skip'
                                }`}
                        >
                            {conventional?.decision || (reactive > 0 ? 'IRRIGATE' : 'SKIP')}
                        </span>
                    </div>

                    <div className="strategy-metrics-row">
                        <div className="strategy-metric">
                            <span className="strat-metric-label">Water Applied:</span>
                            <span className="strat-metric-val font-semibold">
                                {reactiveMm !== null ? `${reactiveMm.toFixed(1)} mm` : `${reactive.toLocaleString()} L`}
                            </span>
                        </div>
                        {reactiveMm !== null && (
                            <div className="strategy-metric">
                                <span className="strat-metric-label">Volume:</span>
                                <span className="strat-metric-val">{reactive.toLocaleString()} L</span>
                            </div>
                        )}
                    </div>

                    <p className="strategy-reason">
                        {conventional?.reason ||
                            (reactive > 0
                                ? 'Restores depleted root zone to target moisture based solely on current threshold deficit.'
                                : 'Current soil moisture is above the dry threshold; no irrigation is required.')}
                    </p>
                </div>

                {/* Forecast-Aware Predictive Strategy */}
                <div className="strategy-card forecast-card">
                    <div className="strategy-card-header">
                        <span className="strategy-name">Forecast-Aware (Predictive)</span>
                        <span
                            className={`decision-badge ${forecastAware?.decision === 'DEFER'
                                ? 'badge-defer'
                                : forecastAware?.decision === 'REDUCE'
                                    ? 'badge-reduce'
                                    : forecastAware?.decision === 'IRRIGATE'
                                        ? 'badge-irrigate'
                                        : 'badge-skip'
                                }`}
                        >
                            {forecastAware?.decision || (forecastAwareVal < reactive ? 'DEFER' : 'IRRIGATE')}
                        </span>
                    </div>

                    <div className="strategy-metrics-row">
                        <div className="strategy-metric">
                            <span className="strat-metric-label">Water Applied:</span>
                            <span className="strat-metric-val font-semibold">
                                {forecastAwareMm !== null ? `${forecastAwareMm.toFixed(1)} mm` : `${forecastAwareVal.toLocaleString()} L`}
                            </span>
                        </div>
                        {forecastAwareMm !== null && (
                            <div className="strategy-metric">
                                <span className="strat-metric-label">Volume:</span>
                                <span className="strat-metric-val">{forecastAwareVal.toLocaleString()} L</span>
                            </div>
                        )}
                    </div>

                    <p className="strategy-reason">
                        {forecastAware?.reason ||
                            'Considers upcoming rainfall within the 6-hour decision window before committing irrigation resources.'}
                    </p>

                    {fallbackApplied && (
                        <div className="fallback-notice">
                            <span>Fallback applied: Forecast data was {forecastStatus || 'incomplete'}. Used conventional rules.</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Environmental Context Strip */}
            <div className="comparison-context-row">
                <div className="context-item">
                    <span className="context-label">Forecast Window:</span>
                    <span className="context-value">
                        {scenario?.forecastWindowHours || 6} Hours
                    </span>
                </div>
                <div className="context-item">
                    <span className="context-label">Rainfall Considered:</span>
                    <span className="context-value font-semibold">
                        {rainMm !== null ? `${rainMm.toFixed(1)} mm` : 'Data Unavailable'}
                    </span>
                </div>
                <div className="context-item">
                    <span className="context-label">Parcel Reference:</span>
                    <span className="context-value">{farmAreaSqm.toLocaleString()} m² (0.1 ha)</span>
                </div>
            </div>

            {/* Engine Warnings (if any) */}
            {warnings.length > 0 && (
                <div className="engine-warnings-box" role="alert">
                    <span className="warning-heading">Forecast & Sensor Integrity Notes:</span>
                    <ul className="warning-list">
                        {warnings.map((w, idx) => (
                            <li key={idx}>{w}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Truthful Agronomic & Conversion Notice */}
            <div className="comparison-note">
                <p>
                    <strong>MODELLED DIGITAL TWIN:</strong> Water volume is calculated from depth across the parcel area (litres = mm × {farmAreaSqm.toLocaleString()} m²).
                    Decisions are generated by deterministic algorithmic simulation rules, NOT actual physical on-farm soil probes or certified commercial agronomic prescriptions.
                </p>
            </div>
        </section>
    );
}

export default ComparisonPanel;
