import { useState } from 'react';
import {
  ArrowRight,
  CloudSun,
  Droplets,
  Compass,
  BarChart3,
  MapPin,
  Eye,
  SlidersHorizontal,
  Layers,
  CheckCircle2,
  Play,
  Sparkles,
} from 'lucide-react';
import { TerraPulseLogo } from './TerraPulseLogo';

/**
 * LandingPage — Cinematic Agricultural Digital Twin
 *
 * Full-screen hero background featuring the Indian farmer overlooking golden-hour terraced farmland,
 * paired with a deep-forest-green translucent navigation bar, left-aligned typography,
 * a 4-feature glassmorphic strip, 3-step "How TerraPulse Works" process, grounded product preview,
 * and sustainable stewardship overview.
 */
export function LandingPage({
  onEnterFarm,
  location,
  selectedLocation,
  weatherData,
  onOpenLocationSearch,
}) {
  const activeLocation = location || selectedLocation;
  // Use active location or default to Bengaluru
  const locationName = activeLocation?.name || 'Bengaluru';

  const [activeTab, setActiveTab] = useState('twin');

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Extract live weather telemetry if available
  const currentTemp = weatherData?.current?.temperature_2m;
  const currentHumidity = weatherData?.current?.relative_humidity_2m;
  const hasLiveWeather = currentTemp !== undefined && currentTemp !== null;

  return (
    <div className="landing-page-root">
      {/* =====================================================================
          1. FULL-SCREEN HERO SECTION (Edge-to-Edge Farmer Artwork Background)
          ===================================================================== */}
      <section className="cinematic-hero-section" aria-label="TerraPulse Hero Overview">
        {/* Top Floating Glassmorphic Navigation Bar */}
        <header className="cinematic-navbar">
          <div className="navbar-inner-container">
            {/* Left: Brand Identity */}
            <div
              className="navbar-brand-clickable"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <TerraPulseLogo variant="full" theme="dark" size={38} showSubtitle={true} />
            </div>

            {/* Center: Section Navigation */}
            <nav className="navbar-nav-links" aria-label="Page Navigation">
              <button
                type="button"
                className="nav-link-anchor"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                Overview
              </button>
              <button
                type="button"
                className="nav-link-anchor"
                onClick={() => scrollToSection('features')}
              >
                Features
              </button>
              <button
                type="button"
                className="nav-link-anchor"
                onClick={() => scrollToSection('how-it-works')}
              >
                How It Works
              </button>
              <button
                type="button"
                className="nav-link-anchor"
                onClick={() => scrollToSection('sustainability')}
              >
                Sustainability
              </button>
            </nav>

            {/* Right: Primary Call to Action */}
            <div className="navbar-actions">
              <button
                type="button"
                className="btn-navbar-cta"
                onClick={onEnterFarm}
                aria-label="Explore Your Farm Simulator"
              >
                <span>Explore Your Farm</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </header>

        {/* Hero Left Content Column */}
        <div className="hero-content-viewport">
          <div className="hero-story-block">
            {/* Eyebrow Pill */}
            <div className="hero-eyebrow-pill">
              <span className="eyebrow-icon-sprout">🌱</span>
              <span className="eyebrow-text">Intelligent Agricultural Digital Twin</span>
            </div>

            {/* Main Headline */}
            <h1 className="hero-main-title">
              See Your Farm.
              <br />
              Grow <span className="headline-lime-accent">Smarter.</span>
            </h1>

            {/* Narrative Description */}
            <p className="hero-body-paragraph">
              Unite real-time weather insights, intelligent irrigation simulation, and crop
              health models in an immersive 3D living digital twin. Farm with science, foresight,
              and care.
            </p>

            {/* CTA Button Row */}
            <div className="hero-button-row">
              <button
                type="button"
                className="btn-hero-primary"
                onClick={onEnterFarm}
                aria-label="Explore Your Farm"
              >
                <span>Explore Your Farm</span>
                <ArrowRight size={17} />
              </button>

              <button
                type="button"
                className="btn-hero-secondary"
                onClick={() => scrollToSection('how-it-works')}
                aria-label="Discover How It Works"
              >
                <Play size={14} className="icon-play-accent" />
                <span>Discover How It Works</span>
              </button>
            </div>

            {/* Active Field Location Pill */}
            <div className="hero-location-row">
              <button
                type="button"
                className="hero-location-pill"
                onClick={onOpenLocationSearch}
                title={onOpenLocationSearch ? 'Click to change active farm location' : undefined}
                aria-label={`Active Field: ${locationName}`}
              >
                <MapPin size={13} className="loc-pin-icon" />
                <span className="loc-text">Active Field: {locationName}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Compact 4-Feature Glass Strip (Hero Bottom) */}
        <div className="hero-feature-strip-wrap">
          <div className="hero-feature-strip-grid">
            {/* Feature 1: Live Weather Insights */}
            <div
              className="glass-strip-card"
              onClick={() => scrollToSection('features')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && scrollToSection('features')}
            >
              <div className="strip-card-icon-wrap icon-amber">
                <CloudSun size={18} />
              </div>
              <div className="strip-card-body">
                <div className="strip-card-title-row">
                  <h3 className="strip-card-title">Live Weather Insights</h3>
                  <ArrowRight size={13} className="strip-arrow" />
                </div>
                <p className="strip-card-desc">
                  Real-time meteorological data from Open-Meteo, localized to your field.
                </p>
                {hasLiveWeather && (
                  <div className="strip-live-badge">
                    <span className="live-pulse-dot"></span>
                    <span>{Math.round(currentTemp)}°C • {currentHumidity}% RH Live</span>
                  </div>
                )}
              </div>
            </div>

            {/* Feature 2: Smart Irrigation Simulation */}
            <div
              className="glass-strip-card"
              onClick={() => scrollToSection('features')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && scrollToSection('features')}
            >
              <div className="strip-card-icon-wrap icon-emerald">
                <Droplets size={18} />
              </div>
              <div className="strip-card-body">
                <div className="strip-card-title-row">
                  <h3 className="strip-card-title">Smart Irrigation Simulation</h3>
                  <ArrowRight size={13} className="strip-arrow" />
                </div>
                <p className="strip-card-desc">
                  See how your crops respond to weather, soil moisture, and irrigation decisions.
                </p>
              </div>
            </div>

            {/* Feature 3: Immersive 3D Farm Twin */}
            <div
              className="glass-strip-card"
              onClick={() => scrollToSection('features')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && scrollToSection('features')}
            >
              <div className="strip-card-icon-wrap icon-lime">
                <Compass size={18} />
              </div>
              <div className="strip-card-body">
                <div className="strip-card-title-row">
                  <h3 className="strip-card-title">Immersive 3D Farm Twin</h3>
                  <ArrowRight size={13} className="strip-arrow" />
                </div>
                <p className="strip-card-desc">
                  Explore your farm in a realistic 3D environment with interactive crop plots and scenarios.
                </p>
              </div>
            </div>

            {/* Feature 4: Crop & Field Insights */}
            <div
              className="glass-strip-card"
              onClick={() => scrollToSection('features')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && scrollToSection('features')}
            >
              <div className="strip-card-icon-wrap icon-gold">
                <BarChart3 size={18} />
              </div>
              <div className="strip-card-body">
                <div className="strip-card-title-row">
                  <h3 className="strip-card-title">Data-Driven Decisions</h3>
                  <ArrowRight size={13} className="strip-arrow" />
                </div>
                <p className="strip-card-desc">
                  Optimize water usage, reduce wastage, and improve crop productivity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. HOW TERRAPULSE WORKS (3-Step Grounded Agricultural Methodology)
          ===================================================================== */}
      <section id="how-it-works" className="how-it-works-section">
        <div className="section-container">
          <div className="section-header-centered">
            <span className="section-sub-tag">METHODOLOGY & WORKFLOW</span>
            <h2 className="section-primary-heading">How TerraPulse Works</h2>
            <p className="section-sub-description">
              Three connected steps to inspect your farmland, monitor micro-climatic shifts, and test irrigation strategies before turning on a single pump.
            </p>
          </div>

          <div className="workflow-steps-grid">
            {/* Step 01: Observe Your Farm */}
            <div className="step-card">
              <div className="step-card-top">
                <span className="step-number-pill">01</span>
                <div className="step-icon-bubble">
                  <Eye size={20} className="step-icon text-forest" />
                </div>
              </div>
              <h3 className="step-title">Observe Your Farm</h3>
              <p className="step-description">
                Understand the field through the existing 3D farm view and available field information.
                Walk crop rows, inspect parcel configurations, and survey spatial boundaries across your virtual land.
              </p>
              <div className="step-feature-bullet">
                <CheckCircle2 size={14} className="bullet-check" />
                <span>Dynamic Three.js WebGL terrain & crop parcels</span>
              </div>
              <div className="step-feature-bullet">
                <CheckCircle2 size={14} className="bullet-check" />
                <span>Multiple cinematic camera angles (Crops, Farmstead, Top-Down)</span>
              </div>
            </div>

            {/* Step 02: Understand Local Conditions */}
            <div className="step-card step-card-highlight">
              <div className="step-card-top">
                <span className="step-number-pill">02</span>
                <div className="step-icon-bubble">
                  <CloudSun size={20} className="step-icon text-forest" />
                </div>
              </div>
              <h3 className="step-title">Understand Local Conditions</h3>
              <p className="step-description">
                Use the available weather information and existing environmental indicators to understand the conditions affecting the farm.
                Track ambient temperatures, solar irradiance, vapor pressure deficits, and upcoming precipitation windows.
              </p>
              <div className="step-feature-bullet">
                <CheckCircle2 size={14} className="bullet-check" />
                <span>Live Open-Meteo meteorological telemetry</span>
              </div>
              <div className="step-feature-bullet">
                <CheckCircle2 size={14} className="bullet-check" />
                <span>Hourly forecasts with rain probability indicators</span>
              </div>
            </div>

            {/* Step 03: Explore Smarter Decisions */}
            <div className="step-card">
              <div className="step-card-top">
                <span className="step-number-pill">03</span>
                <div className="step-icon-bubble">
                  <SlidersHorizontal size={20} className="step-icon text-forest" />
                </div>
              </div>
              <h3 className="step-title">Explore Smarter Decisions</h3>
              <p className="step-description">
                Explore the irrigation and farm-simulation capabilities already implemented in the project.
                Simulate soil moisture responses, test sunny, cloudy, or rainy what-if scenarios, and compare forecast-aware water deferrals.
              </p>
              <div className="step-feature-bullet">
                <CheckCircle2 size={14} className="bullet-check" />
                <span>FAO-56 root zone evapotranspiration modeling</span>
              </div>
              <div className="step-feature-bullet">
                <CheckCircle2 size={14} className="bullet-check" />
                <span>What-If scenario controls (Sunny, Overcast, Rainy)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. GENUINE PRODUCT PREVIEW & CAPABILITIES
          ===================================================================== */}
      <section id="features" className="product-preview-section">
        <div className="section-container">
          <div className="section-header-centered">
            <span className="section-sub-tag">SYSTEM ARCHITECTURE</span>
            <h2 className="section-primary-heading">Inside the TerraPulse Engine</h2>
            <p className="section-sub-description">
              An honest architectural look at how 3D visual computing, meteorological sync, and soil physics unite in your browser.
            </p>
          </div>

          {/* Interactive Component Diagram Tabs */}
          <div className="preview-tabs-row" role="tablist">
            <button
              type="button"
              className={`preview-tab-btn ${activeTab === 'twin' ? 'active' : ''}`}
              onClick={() => setActiveTab('twin')}
              role="tab"
              aria-selected={activeTab === 'twin'}
            >
              <Compass size={15} />
              <span>3D Farm Twin</span>
            </button>
            <button
              type="button"
              className={`preview-tab-btn ${activeTab === 'weather' ? 'active' : ''}`}
              onClick={() => setActiveTab('weather')}
              role="tab"
              aria-selected={activeTab === 'weather'}
            >
              <CloudSun size={15} />
              <span>Weather Synchronization</span>
            </button>
            <button
              type="button"
              className={`preview-tab-btn ${activeTab === 'irrigation' ? 'active' : ''}`}
              onClick={() => setActiveTab('irrigation')}
              role="tab"
              aria-selected={activeTab === 'irrigation'}
            >
              <Droplets size={15} />
              <span>Soil & Irrigation Simulation</span>
            </button>
            <button
              type="button"
              className={`preview-tab-btn ${activeTab === 'decisions' ? 'active' : ''}`}
              onClick={() => setActiveTab('decisions')}
              role="tab"
              aria-selected={activeTab === 'decisions'}
            >
              <BarChart3 size={15} />
              <span>Decision Support</span>
            </button>
          </div>

          {/* Preview Card Display */}
          <div className="preview-display-card">
            {activeTab === 'twin' && (
              <div className="preview-tab-content">
                <div className="preview-media-col">
                  <img
                    src="/farm_3d_viz.jpg"
                    alt="TerraPulse 3D Agricultural Digital Twin with mountain horizon"
                    className="preview-tab-img"
                    loading="lazy"
                  />
                  <div className="preview-img-badge">
                    <Compass size={13} />
                    <span>WebGL Three.js Canvas</span>
                  </div>
                </div>
                <div className="preview-info-col">
                  <span className="preview-tagline">SPATIAL DIGITAL TWIN</span>
                  <h3 className="preview-title">Real-Time Interactive Farm Environment</h3>
                  <p className="preview-text">
                    The 3D canvas renders an authentic agrarian environment with layered mountain backdrops,
                    furrowed planting beds, animated vegetation, and a working farmstead.
                  </p>
                  <ul className="preview-spec-list">
                    <li>
                      <strong>Cinematic Camera Rig:</strong> Seamlessly toggle between Panoramic Overview, Crop Rows, Farmstead, and Orthographic Top-Down inspection modes.
                    </li>
                    <li>
                      <strong>Crop Parcel Management:</strong> Configure parcel bounds, assign crop species (Wheat, Corn, Soybeans, Vegetables), and visualize growth stages.
                    </li>
                    <li>
                      <strong>Environmental Synchrony:</strong> Visual weather effects (sunlight intensity, rain particles, mist) respond directly to active atmospheric parameters.
                    </li>
                  </ul>
                  <button type="button" className="btn-preview-launch" onClick={onEnterFarm}>
                    <span>Launch 3D Simulator</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'weather' && (
              <div className="preview-tab-content">
                <div className="preview-media-col">
                  <img
                    src="/weather_insights.jpg"
                    alt="TerraPulse Weather Telemetry Station"
                    className="preview-tab-img"
                    loading="lazy"
                  />
                  <div className="preview-img-badge">
                    <CloudSun size={13} />
                    <span>Open-Meteo Integration</span>
                  </div>
                </div>
                <div className="preview-info-col">
                  <span className="preview-tagline">METEOROLOGICAL TELEMETRY</span>
                  <h3 className="preview-title">Atmospheric Sync Localized to Farm Coordinates</h3>
                  <p className="preview-text">
                    Continuous weather ingestion feeds live temperature, humidity, precipitation rates,
                    and solar irradiance straight from Open-Meteo into the simulation loop.
                  </p>
                  <ul className="preview-spec-list">
                    <li>
                      <strong>Worldwide Geocoding:</strong> Search any geographic region or agricultural field coordinate to fetch localized forecasts.
                    </li>
                    <li>
                      <strong>What-If Scenarios:</strong> Stress-test your crops against controlled environmental presets including Clear Sky Drought, Diffuse Overcast, and Rainstorm events.
                    </li>
                    <li>
                      <strong>Hourly Infiltration Timeline:</strong> Forecast incoming rain hours ahead to dynamically adjust simulated water balances.
                    </li>
                  </ul>
                  <button type="button" className="btn-preview-launch" onClick={onEnterFarm}>
                    <span>Explore Weather Telemetry</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'irrigation' && (
              <div className="preview-tab-content">
                <div className="preview-media-col">
                  <img
                    src="/smart_irrigation.jpg"
                    alt="Precision irrigation drip simulation"
                    className="preview-tab-img"
                    loading="lazy"
                  />
                  <div className="preview-img-badge">
                    <Droplets size={13} />
                    <span>FAO-56 Soil Moisture Model</span>
                  </div>
                </div>
                <div className="preview-info-col">
                  <span className="preview-tagline">SOIL MOISTURE DYNAMICS</span>
                  <h3 className="preview-title">Predictive Infiltration & Evapotranspiration</h3>
                  <p className="preview-text">
                    Simulate how soil moisture levels react to atmospheric demand, drainage capacity,
                    and scheduled watering over 24-hour simulation timelines.
                  </p>
                  <ul className="preview-spec-list">
                    <li>
                      <strong>Root Zone Retention:</strong> Model soil holding capacity to maintain moisture safely within the optimal vegetative growth band.
                    </li>
                    <li>
                      <strong>Evapotranspiration (ET) Loss:</strong> Calculates water loss driven by solar irradiance and thermal vapor deficits.
                    </li>
                    <li>
                      <strong>Interactive Watering Cycles:</strong> Apply virtual irrigation pulses and immediately watch moisture percentage graphs respond.
                    </li>
                  </ul>
                  <button type="button" className="btn-preview-launch" onClick={onEnterFarm}>
                    <span>Simulate Irrigation</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'decisions' && (
              <div className="preview-tab-content">
                <div className="preview-media-col">
                  {/* Clean SVG Architectural Diagram of Data Flow */}
                  <div className="decision-diagram-card">
                    <div className="diagram-node node-weather">
                      <CloudSun size={18} />
                      <span>Weather Telemetry</span>
                    </div>
                    <div className="diagram-connector">
                      <span className="diagram-flow-arrow">↓</span>
                      <span className="diagram-flow-label">Forecast Horizon</span>
                    </div>
                    <div className="diagram-node node-engine">
                      <Layers size={18} />
                      <span>TerraPulse Physics Engine</span>
                    </div>
                    <div className="diagram-connector">
                      <span className="diagram-flow-arrow">↓</span>
                      <span className="diagram-flow-label">Optimized Schedule</span>
                    </div>
                    <div className="diagram-node node-decision">
                      <Droplets size={18} />
                      <span>Rain Deferral Decision</span>
                    </div>
                  </div>
                  <div className="preview-img-badge">
                    <BarChart3 size={13} />
                    <span>Decision Logic</span>
                  </div>
                </div>
                <div className="preview-info-col">
                  <span className="preview-tagline">DECISION SUPPORT</span>
                  <h3 className="preview-title">Benchmark Strategies Against the Weather</h3>
                  <p className="preview-text">
                    Compare conventional blind timer irrigation against forecast-aware strategies.
                    See the difference when water pumping is held ahead of anticipated natural rainfall.
                  </p>
                  <ul className="preview-spec-list">
                    <li>
                      <strong>Forecast-Aware Deferral:</strong> Automatically alerts when incoming rain within 6 hours can satisfy crop water needs.
                    </li>
                    <li>
                      <strong>Side-by-Side Comparison:</strong> Review simulated volumetric usage between rigid schedules and weather-aligned cycles.
                    </li>
                    <li>
                      <strong>Actionable Summary:</strong> Understand irrigation efficiency without relying on opaque black-box recommendations.
                    </li>
                  </ul>
                  <button type="button" className="btn-preview-launch" onClick={onEnterFarm}>
                    <span>Compare Strategies</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. SUSTAINABLE STEWARDSHIP SECTION (Grounded, Honest Copy)
          ===================================================================== */}
      <section id="sustainability" className="sustainability-section">
        <div className="section-container">
          <div className="sustainability-card-wrapper">
            <div className="sustainability-inner">
              <span className="sustain-eyebrow">AGRICULTURAL STEWARDSHIP</span>
              <h2 className="sustain-heading">
                Smarter irrigation decisions for a water-resilient future
              </h2>
              <p className="sustain-description">
                Freshwater is agriculture's most critical input. By uniting localized forecast telemetry
                with verified soil moisture calculations, TerraPulse helps growers test conservation
                scenarios and avoid unnecessary pumping before rain.
              </p>

              <div className="sustain-pillars-row">
                <div className="sustain-pillar-item">
                  <div className="pillar-icon-box">
                    <Droplets size={20} className="text-forest" />
                  </div>
                  <h4 className="pillar-title">Forecast-Aware Deferral</h4>
                  <p className="pillar-text">
                    Identifies approaching rain windows to avoid watering immediately before natural rainfall.
                  </p>
                </div>

                <div className="sustain-pillar-item">
                  <div className="pillar-icon-box">
                    <CheckCircle2 size={20} className="text-forest" />
                  </div>
                  <h4 className="pillar-title">Root Zone Protection</h4>
                  <p className="pillar-text">
                    Tracks saturation thresholds to prevent nutrient leaching, soil compaction, and root hypoxia.
                  </p>
                </div>

                <div className="sustain-pillar-item">
                  <div className="pillar-icon-box">
                    <Sparkles size={20} className="text-forest" />
                  </div>
                  <h4 className="pillar-title">100% Client-Side Physics</h4>
                  <p className="pillar-text">
                    Instant in-browser simulation runs anywhere with zero cloud server overhead.
                  </p>
                </div>
              </div>

              <div className="sustain-cta-row">
                <button
                  type="button"
                  className="btn-sustain-cta"
                  onClick={onEnterFarm}
                  aria-label="Explore Your Farm"
                >
                  <span>Explore Your Farm</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. FOOTER (Consistent Brand, Navigation & Credits)
          ===================================================================== */}
      <footer className="cinematic-footer">
        <div className="section-container">
          <div className="footer-top-grid">
            {/* Brand Column */}
            <div className="footer-brand-column">
              <TerraPulseLogo variant="full" theme="dark" size={36} showSubtitle={true} />
              <p className="footer-bio-text">
                Agricultural digital twin uniting real-time Open-Meteo telemetry,
                FAO-56 evapotranspiration models, and Three.js 3D visualization.
              </p>
            </div>

            {/* Quick Links */}
            <div className="footer-nav-column">
              <span className="footer-column-heading">Navigation</span>
              <ul className="footer-links-list">
                <li>
                  <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                    Overview
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection('features')}>
                    Features
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection('how-it-works')}>
                    How It Works
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection('sustainability')}>
                    Sustainability
                  </button>
                </li>
              </ul>
            </div>

            {/* Farm Launch CTA */}
            <div className="footer-launch-column">
              <span className="footer-column-heading">Agricultural Twin</span>
              <p className="footer-launch-desc">
                Ready to explore your field in 3D? Launch the simulator with live weather telemetry.
              </p>
              <button
                type="button"
                className="btn-footer-launch"
                onClick={onEnterFarm}
                aria-label="Launch Farm Simulator"
              >
                <span>Launch Farm Simulator</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          <div className="footer-bottom-divider"></div>

          <div className="footer-bottom-flex">
            <span className="footer-copyright">
              © 2026 TerraPulse Agricultural Intelligence. All rights reserved.
            </span>
            <div className="footer-badge-chips">
              <span className="footer-chip">Open-Meteo Telemetry</span>
              <span className="footer-chip">FAO-56 Soil Physics</span>
              <span className="footer-chip">Three.js WebGL</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
