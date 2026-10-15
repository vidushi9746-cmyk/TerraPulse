/**
 * Pure formatting helpers with robust validation against null, undefined, NaN, and non-finite values.
 * Prevents TypeError: Cannot read properties of null (reading 'toFixed').
 */

/**
 * Safely formats a numeric value to a fixed number of decimals.
 * Returns the fallback string if value is null, undefined, NaN, or non-finite.
 *
 * @param {number|null|undefined} val - The numeric value to format
 * @param {number} decimals - Number of decimal places (default: 1)
 * @param {string} fallback - Fallback string when value is non-numeric (default: '—')
 * @returns {string} Formatted decimal string or fallback
 */
export function formatDecimal(val, decimals = 1, fallback = '—') {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    return fallback;
  }
  return val.toFixed(decimals);
}

/**
 * Formats precipitation rate in mm/h.
 * Preserves missing or null readings as fallback, never converting unknown rain to 0.
 *
 * @param {number|null|undefined} rate - Precipitation rate in mm/h
 * @param {string} fallback - Fallback string (default: '—')
 * @returns {string} Formatted rate string (e.g. "2.4 mm/h") or fallback
 */
export function formatPrecipitation(rate, fallback = '—') {
  if (typeof rate !== 'number' || !Number.isFinite(rate)) {
    return fallback;
  }
  return `${rate.toFixed(1)} mm/h`;
}

/**
 * Formats temperature in °C or °F.
 *
 * @param {number|null|undefined} temp - Temperature value
 * @param {string} unit - '°C' or '°F'
 * @param {string} fallback - Fallback string (default: '--')
 * @returns {string} Formatted temperature string (e.g. "22.5°C") or fallback
 */
export function formatTemperature(temp, unit = '°C', fallback = '--') {
  if (typeof temp !== 'number' || !Number.isFinite(temp)) {
    return fallback;
  }
  return `${temp.toFixed(1)}${unit}`;
}

/**
 * Formats soil moisture percentage with consistent precision.
 *
 * @param {number|null|undefined} moisture - Soil moisture percentage (0-100)
 * @param {number} decimals - Decimal places (default: 2)
 * @param {string} fallback - Fallback string (default: 'N/A')
 * @returns {string} Formatted soil moisture (e.g. "34.50%") or fallback
 */
export function formatSoilMoisture(moisture, decimals = 2, fallback = 'N/A') {
  if (typeof moisture !== 'number' || !Number.isFinite(moisture)) {
    return `${fallback}%`;
  }
  return `${moisture.toFixed(decimals)}%`;
}
