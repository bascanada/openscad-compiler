// Utility functions for OpenSCAD version extraction

/**
 * Extracts the date-style version (e.g., 2021.01, 2024.05.12) from a version string.
 * @param {string} versionString - The full version string.
 * @returns {string|null} The date-style version, or null if not found.
 */
export function extractDateVersion(versionString) {
  const match = versionString.match(/\b(20\d{2}(?:\.\d{2}){1,2})\b/);
  return match ? match[1] : null;
}
