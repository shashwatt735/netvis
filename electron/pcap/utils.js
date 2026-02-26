/**
 * utils.js - Utility Functions
 * 
 * Provides helper functions for packet parsing and formatting.
 */

/**
 * Format timestamp to readable string
 * 
 * @param {number} timestamp - Timestamp in milliseconds
 * @returns {string} Formatted timestamp
 */
export function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

/**
 * Format MAC address
 * 
 * @param {Buffer|Array} mac - MAC address bytes
 * @returns {string} Formatted MAC address
 */
export function formatMacAddress(mac) {
  if (!mac) return '00:00:00:00:00:00';
  
  if (Array.isArray(mac)) {
    return mac.map(b => b.toString(16).padStart(2, '0')).join(':');
  }
  
  return mac;
}

/**
 * Format IP address
 * 
 * @param {Buffer|Array|string} ip - IP address
 * @returns {string} Formatted IP address
 */
export function formatIPAddress(ip) {
  if (!ip) return '0.0.0.0';
  
  if (Array.isArray(ip) || Buffer.isBuffer(ip)) {
    return ip.join('.');
  }
  
  if (typeof ip === 'string') {
    return ip;
  }
  
  return '0.0.0.0';
}

/**
 * Get protocol name from ether type
 * 
 * @param {number} etherType - EtherType value
 * @returns {string} Protocol name
 */
export function getProtocolName(etherType) {
  const protocols = {
    0x0800: 'IPv4',
    0x0806: 'ARP',
    0x86DD: 'IPv6',
    0x8100: 'VLAN'
  };
  
  return protocols[etherType] || `0x${etherType.toString(16)}`;
}

/**
 * Get TCP flag names
 * 
 * @param {number} flags - Flag byte
 * @returns {Array} Array of flag names
 */
export function getTCPFlags(flags) {
  const flagNames = [];
  
  if (flags & 0x01) flagNames.push('FIN');
  if (flags & 0x02) flagNames.push('SYN');
  if (flags & 0x04) flagNames.push('RST');
  if (flags & 0x08) flagNames.push('PSH');
  if (flags & 0x10) flagNames.push('ACK');
  if (flags & 0x20) flagNames.push('URG');
  
  return flagNames;
}

/**
 * Calculate byte statistics
 * 
 * @param {Array} packets - Array of packets
 * @returns {Object} Byte statistics
 */
export function calculateByteStats(packets) {
  let totalBytes = 0;
  let minBytes = Infinity;
  let maxBytes = 0;
  
  packets.forEach(packet => {
    const len = packet.capturedLength || packet.length || 0;
    totalBytes += len;
    minBytes = Math.min(minBytes, len);
    maxBytes = Math.max(maxBytes, len);
  });
  
  return {
    total: totalBytes,
    average: packets.length > 0 ? totalBytes / packets.length : 0,
    min: minBytes === Infinity ? 0 : minBytes,
    max: maxBytes
  };
}

/**
 * Format bytes to human readable
 * 
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
