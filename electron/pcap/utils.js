/**
 * utils.js - Shared utility functions for PCAP processing
 */

/**
 * Format timestamp for display
 *
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Formatted time string (HH:MM:SS.mmm)
 */
export function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const ms = String(date.getMilliseconds()).padStart(3, "0");

  return `${hours}:${minutes}:${seconds}.${ms}`;
}
