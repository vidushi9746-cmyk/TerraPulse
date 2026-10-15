import { ArrowRight, CloudRain, Droplets, Sprout, BarChart3, Compass, CheckCircle2, MapPin } from 'lucide-react';

export function LandingPage({
  onEnterFarm,
  location,
  selectedLocation,
  onOpenLocationSearch,
}) {
  const activeLocation = location || selectedLocation;
  const locationName = activeLocation?.name || 'Willamette Valley Field 04';

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-page">
      {/* -------------------------------------------------------------
          1. Minimal Navbar
          ------------------------------------------------------------- */}
      <header className="landing-header">
        <div className="landing-nav-container">
          <div className="landing-brand-wrap">
            <div className="landing-logo-box">
              <svg
                className="brand-icon-svg"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M16 3C16 3 8 9 8 18C8 22.4183 11.5817 26 16 26C20.4183 26 24 22.4183 24 18C24 9 16 3 16 3Z"
                  fill="url(#nav-leaf-grad)"
                />
                <path
                  d="M16 11V21M12 17L16 21L20 15"
                  stroke="#B8CBA8"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <defs>
                  <linearGradient id="nav-leaf-grad" x1="8" y1="3" x2="24" y2="26" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#243B2E" />
                    <stop offset="1" stopColor="#3A5D48" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="brand-text-cluster">
              <span className="landing-brand-name">TerraPulse</span>
              <span className="landing-brand-sub">Agricultural Intelligence</span>
            </div>
          </div>

          <nav className="landing-nav-links" aria-label="Main Navigation">
            <button
              type="button"
              className="nav-link-btn"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              Overview
            </button>
            <button
              type="button"
              className="nav-link-btn"
              onClick={() => scrollToSection('features')}
            >
              Features
            </button>
            <button
              type="button"
              className="nav-link-btn"
              onClick={() => scrollToSection('sustainability')}
            >
              Sustainability
            </button>
          </nav>

          <div className="landing-nav-actions">
            <button
              type="button"
              className="btn-launch-nav"
              onClick={onEnterFarm}
              aria-label="Explore Your Farm"
            >
              <span>Explore Your Farm</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Subtle Background Decorative Depth (Field Contours & Ambient Glows) */}
      <div className="landing-bg-decorations" aria-hidden="true">
        <div className="ambient-glow glow-top-left"></div>
        <div className="ambient-glow glow-mid-right"></div>
        <div className="ambient-glow glow-bottom-center"></div>

        {/* Agricultural Field Topographic Contour Lines Pattern (SVG) */}
        <svg
          className="ambient-contour-svg"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M-50,180 C280,120 540,240 850,160 C1120,90 1320,190 1500,140"
            fill="none"
            stroke="var(--muted-sage)"
            strokeWidth="1.2"
            strokeDasharray="4 6"
          />
          <path
            d="M-50,260 C240,210 580,310 900,220 C1180,150 1360,270 1500,210"
            fill="none"
            stroke="var(--muted-sage)"
            strokeWidth="1.2"
          />
          <path
            d="M-50,380 C320,330 620,440 960,340 C1220,260 1380,390 1500,320"
            fill="none"
            stroke="var(--muted-sage)"
            strokeWidth="1.2"
            strokeDasharray="8 6"
          />
          <path
            d="M-50,520 C290,470 650,580 1020,480 C1280,410 1410,510 1500,460"
            fill="none"
            stroke="var(--muted-sage)"
            strokeWidth="1.2"
          />
          <ellipse cx="100" cy="760" rx="200" ry="80" fill="none" stroke="var(--muted-sage)" strokeWidth="1" />
          <ellipse cx="1340" cy="240" rx="180" ry="70" fill="none" stroke="var(--muted-sage)" strokeWidth="1" />
          <line x1="200" y1="900" x2="680" y2="600" stroke="var(--muted-sage)" strokeWidth="0.9" strokeDasharray="5 5" />
          <line x1="720" y1="900" x2="750" y2="600" stroke="var(--muted-sage)" strokeWidth="0.9" />
          <line x1="1240" y1="900" x2="820" y2="600" stroke="var(--muted-sage)" strokeWidth="0.9" strokeDasharray="5 5" />
        </svg>
      </div>

      {/* -------------------------------------------------------------
          2. Hero Section: Cinematic Agricultural Farmland at Golden Hour
          ------------------------------------------------------------- */}
      <section className="landing-hero-section">
        <div className="hero-content-col">
          <div className="hero-story-eyebrow">
            <span className="eyebrow-accent-leaf">🌾</span>
            <span>Intelligent Agricultural Digital Twin</span>
          </div>

          <h1 className="hero-headline">See Your Farm. Grow Smarter.</h1>

          <p className="hero-description">
            Unite real-time Open-Meteo weather insights, intelligent micro-irrigation simulation, and
            crop health models in an immersive 3D living digital twin. Farm with science, foresight, and care.
          </p>

          <div className="hero-cta-wrap">
            <button
              type="button"
              className="btn-explore-farm"
              onClick={onEnterFarm}
              aria-label="Explore Your Farm"
            >
              <span>Explore Your Farm</span>
              <ArrowRight size={18} />
            </button>

            <button
              type="button"
              className="btn-discover-features"
              onClick={() => scrollToSection('features')}
              aria-label="Discover Features"
            >
              <span>Discover Features</span>
            </button>

            {onOpenLocationSearch && (
              <button
                type="button"
                className="btn-location-secondary"
                onClick={onOpenLocationSearch}
                title="Change farm coordinates or search worldwide locations"
              >
                <MapPin size={14} className="text-pine" />
                <span>Active Field: {locationName}</span>
              </button>
            )}
          </div>
        </div>

        {/* Cinematic illustration of farmer overlooking golden hour farmland */}
        <div className="hero-illustration-col">
          <div className="hero-artwork-frame">
            <img
              src="/indian_farmer_golden_hour.jpg"
              alt="An Indian farmer standing thoughtfully overlooking his terraced farmland at golden hour"
              className="hero-cinematic-img"
              loading="eager"
            />
            <div className="artwork-caption-strip">
              <span className="artwork-caption-dot"></span>
              <span className="artwork-caption-text">
                Living Agritech • Real-time Meteorological Sync & FAO-56 Physics
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          3. Four Visually Consistent Feature Cards
          ------------------------------------------------------------- */}
      <section id="features" className="landing-features-section">
        <div className="features-intro">
          <span className="features-eyebrow">Precision Agriculture Architecture</span>
          <h2 className="features-main-title">Grounded in the Science of Farmland</h2>
          <p className="features-sub-text">
            Four interconnected capabilities bring atmospheric reality and soil physics directly to your daily farming decisions.
          </p>
        </div>

        <div className="features-four-grid">
          {/* Card 1: Real-Time Weather Insights */}
          <div className="feature-card-item">
            <div className="feature-card-media">
              <img
                src="/weather_insights.jpg"
                alt="Agricultural weather station telemetry"
                className="feature-card-img"
                loading="lazy"
              />
              <div className="feature-card-badge">
                <CloudRain size={13} />
                <span>Open-Meteo Live API</span>
              </div>
            </div>
            <div className="feature-card-body">
              <h3 className="feature-card-title">Real-Time Weather Insights</h3>
              <p className="feature-card-text">
                Live meteorological telemetry synchronized hourly. Track solar irradiance, dew point, vapor pressure deficits, and localized rainfall before starting irrigation cycles.
              </p>
            </div>
          </div>

          {/* Card 2: 3D Farm Visualization */}
          <div className="feature-card-item">
            <div className="feature-card-media">
              <img
                src="/farm_3d_viz.jpg"
                alt="3D living agricultural farm digital twin"
                className="feature-card-img"
                loading="lazy"
              />
              <div className="feature-card-badge">
                <Compass size={13} />
                <span>Living Digital Twin</span>
              </div>
            </div>
            <div className="feature-card-body">
              <h3 className="feature-card-title">3D Farm Visualization</h3>
              <p className="feature-card-text">
                Inspect your property from immersive 3D and aerial top-down camera views. Observe waving wheat swaths, furrow ridges, irrigation risers, and crop growth stages.
              </p>
            </div>
          </div>

          {/* Card 3: Smart Irrigation Simulation */}
          <div className="feature-card-item">
            <div className="feature-card-media">
              <img
                src="/smart_irrigation.jpg"
                alt="Smart precision micro-drip irrigation"
                className="feature-card-img"
                loading="lazy"
              />
              <div className="feature-card-badge">
                <Droplets size={13} />
                <span>Micro-Drip Delivery</span>
              </div>
            </div>
            <div className="feature-card-body">
              <h3 className="feature-card-title">Smart Irrigation Simulation</h3>
              <p className="feature-card-text">
                Simulate soil moisture dynamics across root zones over time. Watch furrow beds react to natural infiltration, evapotranspiration loss, and active drip cycles.
              </p>
            </div>
          </div>

          {/* Card 4: Compare Farming Strategies */}
          <div className="feature-card-item">
            <div className="feature-card-media strategy-media-wrap">
              <div className="strategy-visual-card">
                <div className="strategy-chart-header">
                  <span className="strategy-tag">Predictive Optimization</span>
                  <span className="strategy-save-pill">~40% Water Saved</span>
                </div>
                <div className="strategy-bars-compare">
                  <div className="strategy-bar-row">
                    <span className="bar-label">Conventional:</span>
                    <div className="bar-track">
                      <div className="bar-fill fill-conventional" style={{ width: '85%' }}></div>
                    </div>
                    <span className="bar-val">12,000 L</span>
                  </div>
                  <div className="strategy-bar-row">
                    <span className="bar-label">TerraPulse:</span>
                    <div className="bar-track">
                      <div className="bar-fill fill-forecast" style={{ width: '45%' }}></div>
                    </div>
                    <span className="bar-val">6,500 L</span>
                  </div>
                </div>
                <div className="strategy-chart-footer">
                  <span className="strategy-sub">Forecast-Aware Deferral ahead of rain</span>
                </div>
              </div>
              <div className="feature-card-badge">
                <BarChart3 size={13} />
                <span>Decision Intelligence</span>
              </div>
            </div>
            <div className="feature-card-body">
              <h3 className="feature-card-title">Compare Farming Strategies</h3>
              <p className="feature-card-text">
                Benchmark conventional timer-based irrigation against forecast-aware strategies. Suppress unnecessary water pumping when natural rainfall is expected in the 6-hour window.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          4. Sustainability & Smarter Farm Stewardship Section
          ------------------------------------------------------------- */}
      <section id="sustainability" className="landing-sustainability-section">
        <div className="sustainability-card">
          <div className="sustainability-content">
            <div className="sustainability-eyebrow">
              <Sprout size={14} className="text-pine" />
              <span>Sustainable Land Stewardship</span>
            </div>
            <h2 className="sustainability-title">
              Smarter irrigation decisions for a water-resilient agricultural future
            </h2>
            <p className="sustainability-desc">
              Agriculture accounts for over 70% of global freshwater withdrawals. TerraPulse helps growers and agronomists make every drop count by uniting meteorological forecast models with verified soil physics equations.
            </p>

            <div className="sustainability-metrics-grid">
              <div className="sustain-metric-item">
                <div className="sustain-icon-wrap">
                  <Droplets size={18} className="text-pine" />
                </div>
                <div className="sustain-info">
                  <span className="sustain-num">Up to 40%</span>
                  <span className="sustain-sub">Water Conserved via Rain Deferral</span>
                </div>
              </div>

              <div className="sustain-metric-item">
                <div className="sustain-icon-wrap">
                  <CheckCircle2 size={18} className="text-pine" />
                </div>
                <div className="sustain-info">
                  <span className="sustain-num">Root Health</span>
                  <span className="sustain-sub">Prevents Saturation & Nutrient Leaching</span>
                </div>
              </div>

              <div className="sustain-metric-item">
                <div className="sustain-icon-wrap">
                  <Sprout size={18} className="text-pine" />
                </div>
                <div className="sustain-info">
                  <span className="sustain-num">100% Client-Side</span>
                  <span className="sustain-sub">Zero Cloud Overhead, Instant Simulation</span>
                </div>
              </div>
            </div>

            <div className="sustainability-cta-row">
              <button
                type="button"
                className="btn-explore-farm"
                onClick={onEnterFarm}
              >
                <span>Launch Virtual Farm</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          5. Minimal, Grounded Footer
          ------------------------------------------------------------- */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-top-row">
            <div className="footer-brand-info">
              <span className="footer-brand-title">TerraPulse Agriculture</span>
              <p className="footer-tagline">“See Your Farm. Grow Smarter.”</p>
            </div>
            <button
              type="button"
              className="btn-footer-launch"
              onClick={onEnterFarm}
            >
              <span>Explore Your Farm</span>
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="footer-bottom-row">
            <p className="footer-copyright">
              © 2026 TerraPulse. Built for agricultural stewardship and smart climate-tech simulation.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
