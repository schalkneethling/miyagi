/**
 * Human-friendly size parser for performance budgets.
 * Accepts either a bare number (bytes) or a string with a SI-ish unit suffix.
 * Recognised units (case-insensitive): B, kB, KB, MB, GB. The number may be
 * a decimal (e.g. "1.5 MB") and whitespace between number and unit is optional.
 * Uses the decimal convention (1 kB = 1000 B) because that is what web performance
 * budgets are traditionally expressed in — it matches the web.dev budget guidance
 * and the way transfer sizes are reported in browser devtools.
 * @module performance/parse-size
 */

const ONE_KILOBYTE = 1000;
const ONE_MEGABYTE = 1000 * 1000;
const ONE_GIGABYTE = 1000 * 1000 * 1000;

const UNIT_MULTIPLIERS = {
  b: 1,
  kb: ONE_KILOBYTE,
  mb: ONE_MEGABYTE,
  gb: ONE_GIGABYTE,
};

/**
 * Parse a size value into bytes.
 * @param {string|number|null|undefined} value
 * @returns {number|null} bytes, or null when value is null/undefined
 * @throws {TypeError} if value cannot be parsed
 */
export default function parseSize(value) {
  if (value == null) {
    return null;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      throw new TypeError(`Invalid size value: ${value}`);
    }

    return Math.round(value);
  }

  if (typeof value !== "string") {
    throw new TypeError(`Invalid size value: ${value}`);
  }

  const trimmed = value.trim();
  // Match a number (integer or decimal) optionally followed by a unit suffix.
  // Examples: "50", "1.5 kB", "200MB", "2048 B"
  //   Group 1: the numeric part (e.g. "1.5")
  //   Group 2: the unit part, may be empty (e.g. "kB", "MB", or "")
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]*)$/);

  if (!match) {
    throw new TypeError(`Invalid size value: ${value}`);
  }

  const amount = Number.parseFloat(match[1]);
  const unit = (match[2] || "b").toLowerCase();

  if (!(unit in UNIT_MULTIPLIERS)) {
    throw new TypeError(`Unknown size unit "${match[2]}" in "${value}"`);
  }

  return Math.round(amount * UNIT_MULTIPLIERS[unit]);
}

/**
 * Format a number of bytes as a human-friendly string (for display / reports).
 * @param {number|null} bytes
 * @returns {string}
 */
export function formatSize(bytes) {
  if (bytes == null) {
    return "—";
  }

  if (bytes < ONE_KILOBYTE) {
    return `${bytes} B`;
  }

  if (bytes < ONE_MEGABYTE) {
    return `${(bytes / ONE_KILOBYTE).toFixed(2)} kB`;
  }

  return `${(bytes / ONE_MEGABYTE).toFixed(2)} MB`;
}
