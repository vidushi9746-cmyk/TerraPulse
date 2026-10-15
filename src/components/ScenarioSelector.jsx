import { Satellite, Sun, Cloud, CloudRain } from 'lucide-react';
import './ScenarioSelector.css';

const scenarios = [
  {
    id: 'live',
    name: 'Live Open-Meteo',
    description: 'Live meteorological telemetry and hourly forecast from Open-Meteo.',
    icon: Satellite,
  },
  {
    id: 'sunny',
    name: 'Sunny Day',
    description: 'Hot conditions with little or no expected rainfall in window.',
    icon: Sun,
  },
  {
    id: 'cloudy',
    name: 'Cloudy Day',
    description: 'Overcast & diffused solar cover with stable soil moisture retention.',
    icon: Cloud,
  },
  {
    id: 'rainy',
    name: 'Rain Expected',
    description: 'Significant rain expected (14.4 mm over 6 hours); triggers predictive deferral.',
    icon: CloudRain,
  },
];

export function ScenarioSelector({ selectedScenario = 'live', onScenarioChange }) {
  return (
    <section className="scenario-selector" aria-label="Farm Weather Scenarios">
      <div className="scenario-heading">
        <h2>Atmospheric & What-If Scenarios</h2>
        <p>Choose live Open-Meteo telemetry or test what-if rainfall scenarios.</p>
      </div>

      <div className="scenario-options">
        {scenarios.map((scenario) => {
          const Icon = scenario.icon;
          return (
            <button
              key={scenario.id}
              type="button"
              className={`scenario-card ${
                selectedScenario === scenario.id ? 'selected' : ''
              }`}
              onClick={() => onScenarioChange?.(scenario.id)}
              aria-pressed={selectedScenario === scenario.id}
            >
              <span className="scenario-icon">
                <Icon size={16} />
              </span>
              <span className="scenario-name">{scenario.name}</span>
              <span className="scenario-description">
                {scenario.description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default ScenarioSelector;
