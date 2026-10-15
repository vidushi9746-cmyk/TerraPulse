import { ArrowRight, CloudRain, Droplets, Sprout } from 'lucide-react';

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
              Home
            </button>
            <button
              type="button"
              className="nav-link-btn"
              onClick={() => scrollToSection('how-it-works')}
            >
              How It Works
            </button>
            <button
              type="button"
              className="nav-link-btn"
              onClick={() => scrollToSection('about')}
            >
              About
            </button>
          </nav>

          <div className="landing-nav-actions">
            <button
              type="button"
              className="btn-launch-nav"
              onClick={onEnterFarm}
              aria-label="Launch Farm Simulator"
            >
              <span>Launch Simulator</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Subtle Background Decorative Depth (4-8% Opacity Field Contours, Blurred Sage Glows & Botanical Silhouettes) */}
      <div className="landing-bg-decorations" aria-hidden="true">
        {/* Softly Blurred Sage/Cream Ambient Gradient Glow Shapes */}
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
          {/* Gentle undulating field elevation contour curves */}
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
          <path
            d="M-50,680 C340,630 710,730 1080,640 C1320,570 1420,660 1500,620"
            fill="none"
            stroke="var(--muted-sage)"
            strokeWidth="1.2"
          />
          {/* Terrace contour arcs resembling agricultural contour farming */}
          <ellipse cx="100" cy="760" rx="200" ry="80" fill="none" stroke="var(--muted-sage)" strokeWidth="1" />
          <ellipse cx="100" cy="760" rx="140" ry="55" fill="none" stroke="var(--muted-sage)" strokeWidth="1" strokeDasharray="4 4" />
          <ellipse cx="1340" cy="240" rx="180" ry="70" fill="none" stroke="var(--muted-sage)" strokeWidth="1" />
          <ellipse cx="1340" cy="240" rx="120" ry="45" fill="none" stroke="var(--muted-sage)" strokeWidth="1" strokeDasharray="4 4" />

          {/* Perspective field-row lines across the lower horizon */}
          <line x1="200" y1="900" x2="680" y2="600" stroke="var(--muted-sage)" strokeWidth="0.9" strokeDasharray="5 5" />
          <line x1="450" y1="900" x2="720" y2="600" stroke="var(--muted-sage)" strokeWidth="0.9" strokeDasharray="5 5" />
          <line x1="720" y1="900" x2="750" y2="600" stroke="var(--muted-sage)" strokeWidth="0.9" />
          <line x1="990" y1="900" x2="780" y2="600" stroke="var(--muted-sage)" strokeWidth="0.9" strokeDasharray="5 5" />
          <line x1="1240" y1="900" x2="820" y2="600" stroke="var(--muted-sage)" strokeWidth="0.9" strokeDasharray="5 5" />
        </svg>

        {/* Faint Botanical Leaf Silhouettes Near Outer Edges */}
        <div className="botanical-silhouette silhouette-left">
          <svg viewBox="0 0 120 320" width="110" height="300" fill="currentColor">
            <path d="M10,300 Q40,230 30,155 Q20,75 70,10 Q65,60 45,115 Q30,165 38,235 Z" opacity="0.65" />
            <path d="M30,155 Q68,135 92,108 Q68,132 30,155 Z" />
            <path d="M26,195 Q72,185 102,160 Q72,190 26,195 Z" />
            <path d="M34,115 Q64,90 84,60 Q58,90 34,115 Z" />
            <path d="M36,245 Q78,245 106,225 Q74,252 36,245 Z" />
          </svg>
        </div>

        <div className="botanical-silhouette silhouette-right">
          <svg viewBox="0 0 120 320" width="110" height="300" fill="currentColor">
            <path d="M110,300 Q80,230 90,155 Q100,75 50,10 Q55,60 75,115 Q90,165 82,235 Z" opacity="0.65" />
            <path d="M90,155 Q52,135 28,108 Q52,132 90,155 Z" />
            <path d="M94,195 Q48,185 18,160 Q48,190 94,195 Z" />
            <path d="M86,115 Q56,90 36,60 Q62,90 86,115 Z" />
            <path d="M84,245 Q42,245 14,225 Q46,252 84,245 Z" />
          </svg>
        </div>
      </div>

      {/* -------------------------------------------------------------
          2. Hero Section: Emotional Storytelling & Cinematic Illustration
          ------------------------------------------------------------- */}
      <section className="landing-hero-section">
        <div className="hero-content-col">
          <div className="hero-story-eyebrow">
            <span className="eyebrow-accent-leaf">🌱</span>
            <span>A Story of Land, Care & Science</span>
          </div>

          <h1 className="hero-headline">Every field has a story.</h1>

          <p className="hero-description">
            Understand your fields. Plan smarter irrigation. Build a healthier tomorrow.
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

            {onOpenLocationSearch && (
              <button
                type="button"
                className="btn-location-secondary"
                onClick={onOpenLocationSearch}
                title="Change farm coordinates or search worldwide locations"
              >
                <span>Active Field: {locationName}</span>
              </button>
            )}
          </div>
        </div>

        {/* Large, realistic cinematic illustration of Indian farmer overlooking farmland */}
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
                Harmony of tradition and atmospheric science • Golden Hour
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          3. Three Concise Supporting Feature Sections Below the Hero
          ------------------------------------------------------------- */}
      <section id="how-it-works" className="landing-features-section">
        <div className="features-intro">
          <span className="features-eyebrow">Practical Climate Technology</span>
          <h2 className="features-main-title">Grounded in the Reality of Agriculture</h2>
          <p className="features-sub-text">
            Three interconnected pillars connect atmospheric reality with day-to-day farming decisions.
          </p>
        </div>

        <div className="features-three-grid">
          {/* Feature 1: Weather Awareness */}
          <div className="story-feature-card">
            <div className="feature-icon-circle">
              <CloudRain size={22} className="text-pine" />
            </div>
            <h3 className="feature-title">Weather Awareness</h3>
            <p className="feature-desc">
              Connect to live Open-Meteo meteorological streams. Anticipate rainfall, solar radiation,
              and atmospheric vapor deficits before irrigating dry furrows.
            </p>
          </div>

          {/* Feature 2: Crop Monitoring */}
          <div className="story-feature-card">
            <div className="feature-icon-circle">
              <Sprout size={22} className="text-pine" />
            </div>
            <h3 className="feature-title">Crop Monitoring</h3>
            <p className="feature-desc">
              Track vegetative vigor, growth stages, and root-zone water demands across varied crop varieties
              with deterministic physical models.
            </p>
          </div>

          {/* Feature 3: Smarter Irrigation */}
          <div className="story-feature-card">
            <div className="feature-icon-circle">
              <Droplets size={22} className="text-pine" />
            </div>
            <h3 className="feature-title">Smarter Irrigation</h3>
            <p className="feature-desc">
              Evaluate imminent rain inside a 6-hour forecast window. Compare conventional fixed-schedule
              pumping with predictive rain deferral to conserve thousands of litres.
            </p>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          4. About Section & Storytelling Callout
          ------------------------------------------------------------- */}
      <section id="about" className="landing-about-section">
        <div className="about-card">
          <div className="about-text-content">
            <span className="about-tag">About TerraPulse</span>
            <h2 className="about-title">Empowering farmers to conserve water without risking crop health</h2>
            <p className="about-desc">
              TerraPulse was engineered to make climate data tangible. By uniting real-time meteorology,
              soil moisture physics, and interactive 3D visualization, farmers and agronomists can explore
              how weather changes their fields in real time.
            </p>
            <div className="about-cta-row">
              <button
                type="button"
                className="btn-about-launch"
                onClick={onEnterFarm}
              >
                <span>Launch Interactive Farm</span>
                <ArrowRight size={15} />
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
              <p className="footer-tagline">“Every field has a story. Farm for tomorrow.”</p>
            </div>
            <button
              type="button"
              className="btn-footer-launch"
              onClick={onEnterFarm}
            >
              <span>Launch Simulator</span>
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="footer-bottom-row">
            <p className="footer-copyright">
              © 2026 TerraPulse. Dedicated to sustainable land stewardship and smarter irrigation.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
