import { useState, useRef, useEffect } from 'react';
import { TerraPulseLogo } from './TerraPulseLogo';
import {
  MapPin,
  ArrowLeft,
  Search,
  SlidersHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  Satellite,
  Sun,
  Cloud,
  CloudRain,
  Check,
  Sparkles,
} from 'lucide-react';

const SCENARIO_OPTIONS = [
  {
    id: 'live',
    name: 'Live Open-Meteo API',
    shortName: 'Live Open-Meteo',
    badge: 'Live Sync',
    badgeClass: 'badge-live',
    desc: 'Real-time meteorological telemetry & 7-day hourly forecast',
    icon: Satellite,
    isLive: true,
  },
  {
    id: 'sunny',
    name: 'What-If: Sunny Day',
    shortName: 'What-If: Sunny',
    badge: '0.0 mm Rain',
    badgeClass: 'badge-sunny',
    desc: 'Clear, hot skies; high evapotranspiration stress test',
    icon: Sun,
    isLive: false,
  },
  {
    id: 'cloudy',
    name: 'What-If: Cloudy Day',
    shortName: 'What-If: Cloudy',
    badge: 'Diffused Solar',
    badgeClass: 'badge-cloudy',
    desc: 'Overcast & diffused solar cover; stable soil moisture retention',
    icon: Cloud,
    isLive: false,
  },
  {
    id: 'rainy',
    name: 'What-If: Rain Expected',
    shortName: 'What-If: Rainy',
    badge: '14.4 mm Rain',
    badgeClass: 'badge-rainy',
    desc: '14.4 mm over 6 hours; triggers predictive irrigation deferral',
    icon: CloudRain,
    isLive: false,
  },
];

export function DashboardHeader({
  location,
  onBackToLanding,
  isLeftPanelOpen = true,
  onToggleLeftPanel,
  onOpenLocationSearch,
  farmConfig,
  onOpenFarmConfig,
  selectedScenario = 'live',
  onSelectScenario,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const isLive = selectedScenario === 'live';

  // Find active option details
  const activeScenario = SCENARIO_OPTIONS.find((s) => s.id === selectedScenario) || SCENARIO_OPTIONS[0];

  // Close dropdown menu on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleSelect = (scenarioId) => {
    onSelectScenario?.(scenarioId);
    setIsMenuOpen(false);
  };

  const handleQuickToggle = () => {
    if (isLive) {
      handleSelect('sunny');
    } else {
      handleSelect('live');
    }
  };

  return (
    <header className="dashboard-header">
      <div className="header-left-cluster">
        {/* Return to Landing Page Button */}
        <button
          type="button"
          className="btn-back-nav"
          onClick={onBackToLanding}
          title="Return to TerraPulse Overview Landing Page"
          aria-label="Back to Overview"
        >
          <ArrowLeft size={15} />
          <span>Overview</span>
        </button>

        <div className="header-brand-divider"></div>

        {/* Brand Logo & Title */}
        <div className="header-brand-block">
          <div className="brand-logo">
            <TerraPulseLogo variant="icon" size={32} theme="dark" />
          </div>
          <div className="brand-title-row">
            <h1 className="brand-title">TerraPulse</h1>
            <span className="version-pill">Digital Twin</span>
          </div>
        </div>
      </div>

      <div className="header-right-cluster">
        {/* Toggle Left Furrows Panel */}
        {onToggleLeftPanel && (
          <button
            type="button"
            className={`btn-panel-toggle ${isLeftPanelOpen ? 'active' : ''}`}
            onClick={onToggleLeftPanel}
            title={isLeftPanelOpen ? 'Collapse crop furrows sidebar' : 'Expand crop furrows sidebar'}
            aria-label="Toggle Furrows Sidebar"
          >
            {isLeftPanelOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
            <span className="toggle-btn-text">Furrows</span>
          </button>
        )}

        {/* Prominent Location Search Control with Pin Icon, Selected Location Display, Placeholder & Search Action */}
        <div
          className="header-location-search-bar"
          onClick={onOpenLocationSearch}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenLocationSearch();
            }
          }}
          role="button"
          tabIndex={0}
          title="Click to search worldwide cities, regions, or coordinates"
          aria-label="Location search control"
        >
          <div className="location-bar-icon-wrap">
            <MapPin size={14} className="location-bar-pin" />
          </div>
          <div className="location-bar-info">
            <span className="location-bar-selected">{location?.name || 'Willamette Valley Field 04'}</span>
            <span className="location-bar-placeholder">Search city or location...</span>
          </div>
          {location?.region && <span className="location-bar-region">{location.region}</span>}
          <div className="location-bar-action-btn">
            <Search size={12} />
            <span className="search-text">Search</span>
          </div>
        </div>

        {/* Farm Configuration & Crops Settings Button */}
        {onOpenFarmConfig && (
          <button
            type="button"
            className="header-pill-btn config-pill-btn"
            onClick={onOpenFarmConfig}
            title="Configure Farm Acreage, Supported Crops & Growth Stages"
            aria-label="Farm Settings"
          >
            <SlidersHorizontal size={13} className="text-sage" />
            <span className="pill-btn-label">Farm Settings</span>
            <span className="pill-btn-tag">{farmConfig?.plots?.length || 0} Plots</span>
          </button>
        )}

        {/* Interactive Mode & What-If Selector Control */}
        <div className="header-provenance-container" ref={menuRef}>
          <button
            type="button"
            className={`header-provenance-pill interactive ${isMenuOpen ? 'active' : ''} ${isLive ? 'is-live' : 'is-whatif'}`}
            onClick={() => setIsMenuOpen((prev) => !prev)}
            title={
              isLive
                ? 'Currently in Live Open-Meteo mode. Click to choose or test What-If simulation scenarios.'
                : `Currently in ${activeScenario.shortName}. Click to change scenario or return to Live Open-Meteo.`
            }
            aria-expanded={isMenuOpen}
            aria-haspopup="true"
            aria-label="Atmospheric mode selector"
          >
            <div className={`pulse-indicator ${isLive ? 'live-mode' : 'whatif-mode'}`}>
              <span className="ping-dot"></span>
              <span className="core-dot"></span>
            </div>
            <span className="provenance-label">
              {isLive ? 'Live Open-Meteo' : activeScenario.shortName}
            </span>
            <ChevronDown size={12} className={`provenance-chevron ${isMenuOpen ? 'open' : ''}`} />
          </button>

          {/* Mode & What-If Scenarios Floating Dropdown */}
          {isMenuOpen && (
            <div className="provenance-dropdown-menu" role="menu" aria-label="Select Atmospheric Mode">
              <div className="dropdown-menu-header">
                <div className="menu-header-text">
                  <span className="menu-title">Atmospheric Mode</span>
                  <span className="menu-subtitle">Telemetry source & simulation scenarios</span>
                </div>
                <button
                  type="button"
                  className="btn-quick-toggle"
                  onClick={handleQuickToggle}
                  title={isLive ? 'Switch to What-If simulation mode' : 'Return to Live Open-Meteo telemetry'}
                >
                  <Sparkles size={12} />
                  <span>{isLive ? 'Test What-If' : 'Return to Live'}</span>
                </button>
              </div>

              <div className="dropdown-menu-options" role="radiogroup" aria-label="Telemetry Scenarios">
                {SCENARIO_OPTIONS.map((item) => {
                  const isSelected = selectedScenario === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`menu-scenario-card ${isSelected ? 'selected' : ''} ${item.isLive ? 'live-card' : 'whatif-card'}`}
                      onClick={() => handleSelect(item.id)}
                    >
                      <div className="card-left-icon">
                        <Icon size={16} />
                      </div>
                      <div className="card-center-info">
                        <div className="card-title-row">
                          <span className="card-title">{item.name}</span>
                          <span className={`card-badge ${item.badgeClass}`}>{item.badge}</span>
                        </div>
                        <span className="card-desc">
                          {item.id === 'live' && location?.name
                            ? `Real-time forecast for ${location.name}`
                            : item.desc}
                        </span>
                      </div>
                      <div className="card-check-wrap">
                        {isSelected && <Check size={14} className="card-check-icon" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="dropdown-menu-footer">
                <span className="footer-hint">
                  {isLive
                    ? '💡 Switch to What-If mode to simulate soil moisture depletion and predictive irrigation deferral.'
                    : '💡 Live mode continuously syncs with the real-world Open-Meteo meteorological API.'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
