
import './ScenarioSelector.css';

const scenarios = [
    {
        id: 'sunny',
        name: 'Sunny Day',
        description: 'Hot conditions with little or no expected rainfall.',
        icon: '\u2600\uFE0F',
    },
    {
        id: 'rainy',
        name: 'Rain Expected',
        description: 'Rain is expected, so irrigation may be reduced.',
        icon: '\uD83C\uDF27\uFE0F',
    },
    {
        id: 'heavy-rain',
        name: 'Heavy Rain',
        description: 'High rainfall may increase soil saturation.',
        icon: '\u26C8\uFE0F',
    },
];

function ScenarioSelector({ selectedScenario = 'sunny', onScenarioChange }) {
    return (
        <section className="scenario-selector">
            <div className="scenario-heading">
                <h2>Farm Weather Scenarios</h2>
                <p>Choose a scenario to explore how the farm responds.</p>
            </div>

            <div className="scenario-options">
                {scenarios.map((scenario) => (
                    <button
                        key={scenario.id}
                        type="button"
                        className={`scenario-card ${selectedScenario === scenario.id ? 'selected' : ''
                            }`}
                        onClick={() => onScenarioChange?.(scenario.id)}
                        aria-pressed={selectedScenario === scenario.id}
                    >
                        <span className="scenario-icon">{scenario.icon}</span>
                        <span className="scenario-name">{scenario.name}</span>
                        <span className="scenario-description">
                            {scenario.description}
                        </span>
                    </button>
                ))}
            </div>
        </section>
    );
}

export default ScenarioSelector;
