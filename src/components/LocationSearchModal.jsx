import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, X, Loader2, Compass, AlertCircle, Check, Navigation } from 'lucide-react';
import { searchLocations } from '../services/geocodingService';

// Popular agricultural presets for instant exploration
const POPULAR_AGRICULTURAL_REGIONS = [
  {
    id: 'or-willamette',
    name: 'Willamette Valley Field 04',
    region: 'Oregon, USA',
    latitude: 45.1248,
    longitude: -123.0872,
    soilType: 'Willakenzie Loamy Silt',
    cropType: 'Winter Wheat & Mixed Veg',
  },
  {
    id: 'ca-salinas',
    name: 'Salinas Valley Parcel 12',
    region: 'California, USA',
    latitude: 36.6777,
    longitude: -121.6555,
    soilType: 'Salinas Clay Loam',
    cropType: 'Cool-Season Greens & Brassicas',
  },
  {
    id: 'ca-fresno',
    name: 'San Joaquin Central Basin',
    region: 'California, USA',
    latitude: 36.7468,
    longitude: -119.7726,
    soilType: 'San Joaquin Sandy Loam',
    cropType: 'Maize & Stone Fruit',
  },
  {
    id: 'in-bengaluru',
    name: 'Deccan Plateau Ag-Station',
    region: 'Karnataka, India',
    latitude: 12.9716,
    longitude: 77.5946,
    soilType: 'Red Sandy Loam',
    cropType: 'Millets & Tropical Pulses',
  },
  {
    id: 'fr-paris',
    name: 'Île-de-France Arable Basin',
    region: 'Île-de-France, France',
    latitude: 48.8534,
    longitude: 2.3488,
    soilType: 'Limestone Silt Loam',
    cropType: 'Soft Wheat & Rapeseed',
  },
];

export function LocationSearchModal({ isOpen, onClose, onSelectLocation, currentLocation }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const searchRequestIdRef = useRef(0);
  const inputRef = useRef(null);

  const handleClose = useCallback(() => {
    setQuery('');
    setResults([]);
    setErrorMessage(null);
    setHasSearched(false);
    onClose();
  }, [onClose]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Check if input looks like coordinates (e.g. "45.12, -123.08")
  const parseCoordinates = useCallback((str) => {
    const parts = str.split(',').map((p) => p.trim());
    if (parts.length === 2) {
      const lat = parseFloat(parts[0]);
      const lon = parseFloat(parts[1]);
      if (
        !Number.isNaN(lat) &&
        !Number.isNaN(lon) &&
        lat >= -90 &&
        lat <= 90 &&
        lon >= -180 &&
        lon <= 180
      ) {
        return { lat, lon };
      }
    }
    return null;
  }, []);

  const coordinateMatch = parseCoordinates(query);

  // Debounced live geocoding search with stale request cancellation
  useEffect(() => {
    const trimmed = query.trim();

    if (coordinateMatch || trimmed.length < 2) {
      return undefined;
    }

    const timer = setTimeout(async () => {
      const currentRequestId = ++searchRequestIdRef.current;
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const locations = await searchLocations(trimmed);
        // Only update if this is still the active search request
        if (searchRequestIdRef.current === currentRequestId) {
          setResults(locations);
          setHasSearched(true);
          setIsLoading(false);
        }
      } catch (err) {
        if (searchRequestIdRef.current === currentRequestId) {
          console.error('Location search failed:', err);
          setErrorMessage(err.message || 'Unable to connect to Open-Meteo geocoding API');
          setIsLoading(false);
          setHasSearched(true);
        }
      }
    }, 320);

    return () => {
      clearTimeout(timer);
    };
  }, [query, coordinateMatch]);

  const displayedResults = coordinateMatch || query.trim().length < 2 ? [] : results;
  const showHasSearched = coordinateMatch || query.trim().length < 2 ? false : hasSearched;

  const handleSelectCoordinate = () => {
    if (!coordinateMatch) return;
    const { lat, lon } = coordinateMatch;
    onSelectLocation({
      id: `coord-${lat.toFixed(4)}-${lon.toFixed(4)}`,
      name: `Custom Plot (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
      region: `Coordinates: ${lat >= 0 ? lat.toFixed(2) + '°N' : Math.abs(lat).toFixed(2) + '°S'}, ${lon >= 0 ? lon.toFixed(2) + '°E' : Math.abs(lon).toFixed(2) + '°W'}`,
      latitude: lat,
      longitude: lon,
      soilType: 'Local Agricultural Soil',
      cropType: 'Field Crops',
    });
    handleClose();
  };

  const handleSelectGeocodedResult = (item) => {
    const regionText = [item.admin1, item.country].filter(Boolean).join(', ');
    onSelectLocation({
      id: `loc-${item.id}`,
      name: item.name,
      region: regionText || 'Global Region',
      latitude: item.latitude,
      longitude: item.longitude,
      timezone: item.timezone,
      soilType: 'Regional Loam Silt',
      cropType: 'Arable Field Crops',
    });
    handleClose();
  };

  const handleSelectPreset = (preset) => {
    onSelectLocation(preset);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="location-modal-backdrop"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Location Selection Modal"
    >
      <div className="location-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="location-modal-header">
          <div className="modal-title-wrap">
            <Compass size={20} className="text-emerald" />
            <div>
              <h3 className="modal-title">Select Farm Location</h3>
              <p className="modal-subtitle">
                Search cities worldwide or enter coordinates via Open-Meteo
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={handleClose}
            aria-label="Close location search"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar Input */}
        <div className="location-search-input-wrap">
          <Search size={18} className="search-icon-adornment" />
          <input
            ref={inputRef}
            type="text"
            className="location-search-input"
            placeholder="Type city (e.g. Salinas, Paris, Kyoto) or lat, lon..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setQuery('')}
              aria-label="Clear input"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Modal Body / Results Area */}
        <div className="location-results-area">
          {/* Direct Coordinate Match Option */}
          {coordinateMatch && (
            <div className="coordinate-match-card">
              <div className="coord-info">
                <Navigation size={18} className="text-sky" />
                <div>
                  <span className="coord-title">Valid Coordinate Pair Detected</span>
                  <span className="coord-subtitle">
                    Latitude: {coordinateMatch.lat.toFixed(4)}°, Longitude: {coordinateMatch.lon.toFixed(4)}°
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn-select-coord"
                onClick={handleSelectCoordinate}
              >
                <span>Use Coordinates</span>
                <Check size={14} />
              </button>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="search-status-box">
              <Loader2 size={20} className="animate-spin text-forest" />
              <span>Querying Open-Meteo Geocoding API...</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="search-error-box">
              <AlertCircle size={18} className="text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Search Results List */}
          {!isLoading && !coordinateMatch && displayedResults.length > 0 && (
            <div className="search-results-list">
              <span className="results-group-label">Matching Locations ({displayedResults.length})</span>
              {displayedResults.map((item) => {
                const isSelected =
                  currentLocation?.latitude === item.latitude &&
                  currentLocation?.longitude === item.longitude;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`location-result-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectGeocodedResult(item)}
                  >
                    <div className="item-icon-box">
                      <MapPin size={16} className="text-forest" />
                    </div>
                    <div className="item-text-box">
                      <span className="item-name">{item.name}</span>
                      <span className="item-region">
                        {[item.admin1, item.country].filter(Boolean).join(', ') || 'Global'}
                      </span>
                    </div>
                    <div className="item-coords-box">
                      <span>
                        {typeof item.latitude === 'number' && typeof item.longitude === 'number'
                          ? `${item.latitude.toFixed(2)}°, ${item.longitude.toFixed(2)}°`
                          : '—'}
                      </span>
                      {isSelected && <Check size={16} className="text-emerald" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Empty / No Results Message */}
          {!isLoading && !coordinateMatch && showHasSearched && displayedResults.length === 0 && !errorMessage && (
            <div className="search-empty-box">
              <p>No matching agricultural locations found for &ldquo;{query}&rdquo;.</p>
              <span>Try checking the spelling or entering coordinates directly (e.g. 36.68, -121.66).</span>
            </div>
          )}

          {/* Default State: Popular Agricultural Regions */}
          {!query && (
            <div className="popular-presets-section">
              <span className="results-group-label">Major Agricultural Regions</span>
              <div className="presets-grid">
                {POPULAR_AGRICULTURAL_REGIONS.map((p) => {
                  const isSelected =
                    currentLocation?.latitude === p.latitude &&
                    currentLocation?.longitude === p.longitude;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`preset-card-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectPreset(p)}
                    >
                      <div className="preset-top-row">
                        <span className="preset-name">{p.name}</span>
                        {isSelected && <Check size={14} className="text-emerald" />}
                      </div>
                      <span className="preset-region">{p.region}</span>
                      <span className="preset-coords">
                        {p.latitude.toFixed(2)}° N, {Math.abs(p.longitude).toFixed(2)}° W
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Data Source Notice */}
        <div className="location-modal-footer">
          <span className="footer-disclaimer">
            Data Source: Open-Meteo Geocoding Service • Free Public Meteorological Service
          </span>
        </div>
      </div>
    </div>
  );
}
