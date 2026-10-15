# 🌱 TerraPulse — Smart Agriculture Through Real-Time Environmental Intelligence

**TerraPulse** is an interactive 3D agricultural simulation that connects real-world environmental data with virtual farm conditions to explore smarter irrigation decisions, crop health monitoring, and water conservation.

By integrating live weather data into a dynamic farm environment, TerraPulse demonstrates how environmental intelligence can help farmers make more informed, data-driven decisions.

## 🚀 Live Demo

**🌐 Try TerraPulse:** [Open Live Demo](https://terra-pulse-7ze30wutf-vidushi9746-cmyk.vercel.app/)


## ✨ Key Features

- **🌍 Interactive 3D Farm:** Explore a virtual agricultural environment with crop plots and visual environmental elements.
- **🌦️ Real-Time Weather Integration:** Retrieve weather and environmental data through the Open-Meteo API.
- **🌧️ Dynamic Weather Scenarios:** Explore different weather conditions and observe their effects on the simulated farm.
- **🌿 Crop Health Monitoring:** Visualize crop-specific health and canopy conditions.
- **💧 Smart Irrigation Simulation:** Evaluate irrigation requirements using soil moisture targets, rainfall information, and crop-specific thresholds.
- **📊 Irrigation Comparison:** Compare simulated irrigation strategies and their estimated water usage.
- **♻️ Water Conservation Insights:** Display estimated water savings or additional water use when comparing irrigation scenarios.
- **⚡ Optimized Loading:** Load the 3D farm asynchronously to improve the initial application loading experience.

## 🎯 Problem Statement

Agriculture depends heavily on changing environmental conditions, while irrigation decisions directly influence water consumption and crop health.

Making these decisions without considering current weather conditions can lead to inefficient water use.

TerraPulse explores how real-time environmental data, interactive visualization, and irrigation simulation can help users understand the relationship between weather, soil moisture, crop health, and agricultural water requirements.

## 💡 Our Solution

TerraPulse combines environmental data with a virtual farm simulation.

The application retrieves weather information, processes relevant environmental inputs, and uses simulation logic to represent farm conditions and irrigation requirements. Users can explore scenarios and compare estimated irrigation outcomes through an interactive interface.

The project demonstrates a potential approach to making agricultural data more accessible and irrigation decisions easier to understand.

## 🛠️ Technology Stack

- **Frontend:** React
- **Build Tool:** Vite
- **3D Visualization:** Three.js ecosystem
- **Programming Languages:** JavaScript, HTML, CSS
- **Environmental Data:** Open-Meteo API
- **Testing:** Project test suite and ESLint
- **Deployment:** Vercel
- **Version Control:** Git and GitHub

## 🏗️ How It Works

1. **Fetch environmental data:** Retrieve available weather information from Open-Meteo.
2. **Process environmental inputs:** Validate and normalize incoming data before using it in the application.
3. **Update the virtual farm:** Represent environmental conditions and scenario changes in the interactive 3D environment.
4. **Evaluate crop and moisture conditions:** Apply simulation logic and crop-specific moisture thresholds.
5. **Compare irrigation scenarios:** Estimate water requirements and compare simulated outcomes.
6. **Visualize results:** Present farm conditions, irrigation recommendations, and estimated water-use differences through the dashboard.

## 📦 Getting Started

### Prerequisites

- Node.js and npm
- Git
- A modern web browser

### Installation

Clone the repository:

```bash
git clone https://github.com/vidushi9746-cmyk/TerraPulse.git
```

Navigate into the project directory:

```bash
cd TerraPulse
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL printed in your terminal, usually:

```text
http://localhost:5173
```

## 🧪 Testing and Build

Run the project's test suite:

```bash
npm test
```

Run lint checks:

```bash
npm run lint
```

Create a production build:

```bash
npm run build
```

The production build is generated in the `dist/` directory.

## 🌦️ Data and Simulation Notes

TerraPulse combines external environmental data with simulated agricultural scenarios.

- Weather availability depends on the external API and network connectivity.
- Irrigation comparisons are simulation-based estimates, not guaranteed field measurements.
- Water savings depend on the scenario, baseline requirements, and simulation assumptions.
- Actual irrigation requirements vary with soil properties, crop variety, growth stage, local climate, and farm management practices.

TerraPulse is a prototype intended to demonstrate the potential of data-driven agricultural simulation. Its outputs should not be treated as a substitute for field measurements or professional agronomic advice.

## 🌍 Potential Impact

TerraPulse explores ways technology can support:

- More informed irrigation planning.
- Improved understanding of weather-driven agricultural decisions.
- Awareness of water conservation opportunities.
- Interactive visualization of agricultural environmental data.
- Future development of data-driven precision agriculture tools.

## 🔮 Future Improvements

Potential extensions include:

- Integration of field sensor measurements.
- More detailed soil and crop growth models.
- Historical weather analysis and forecasting.
- Farm-specific calibration and recommendations.
- Additional crops and environmental scenarios.
- Further performance optimization for mobile and low-powered devices.

## 👥 Team

**Developed as a hackathon project** focused on procedural environments, real-time API integration, and smarter agricultural decision support.

## 📄 License

Add a license file if you intend to distribute the project under an open-source license. Until then, no particular open-source license is implied.

---

**TerraPulse — Bringing environmental intelligence to the virtual farm. 🌱💧**
