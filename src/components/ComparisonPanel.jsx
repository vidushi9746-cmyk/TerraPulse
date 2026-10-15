
import './ComparisonPanel.css'

function ComparisonPanel({
    reactiveLitres = 100,
    forecastAwareLitres = 65,
    expectedRainMm = 8,
    scenarioLabel = 'Demo scenario',
}) {
    const reactive = Math.max(0, Number(reactiveLitres) || 0)

    const forecastAware = Math.max(
        0,
        Number(forecastAwareLitres) || 0
    )
    const rainfall = Math.max(0, Number(expectedRainMm) || 0)
    const savedLitres = reactive - forecastAware

    const savingsPercent =
        reactive > 0 ? (savedLitres / reactive) * 100 : 0

    return (
        <section className="comparison-panel">
            <h2>Irrigation Comparison</h2>

            <p>{scenarioLabel}</p>

            <p>
                Reactive irrigation: {reactive.toLocaleString()} L
            </p>

            <p>
                Forecast-aware irrigation:{' '}
                {forecastAware.toLocaleString()} L
            </p>

            <p>
                {savedLitres >= 0
                    ? 'Estimated water saved: '
                    : 'Estimated additional water used: '}
                {Math.abs(savedLitres).toLocaleString()} L
            </p>

            <p>
                {savedLitres >= 0
                    ? 'Estimated water savings: '
                    : 'Estimated increase in water use: '}
                {Math.abs(savingsPercent).toFixed(1)}%
            </p>

            <p>Expected rainfall: {rainfall} mm</p>

            <p className="comparison-note">
                Demo estimates only. These values are not measured farm data.
            </p>
        </section>
    )
}

export default ComparisonPanel


