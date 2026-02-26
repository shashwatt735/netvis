/**
 * packetProcessor.js - Packet Processing Module
 * 
 * Provides functions to process packets and calculate statistics.
 */

/**
 * Process packets (placeholder for additional processing)
 * 
 * @param {Array} packets - Array of parsed packets
 * @param {Function} progressCallback - Progress callback
 * @returns {Array} Processed packets
 */
function processPackets(packets, progressCallback = null) {
  console.log(`🔍 Processing ${packets.length} packets...`);
  
  // Currently just returns packets as-is
  // Can be extended for additional processing like:
  // - Protocol detection
  // - Payload extraction
  // - Flow tracking
  
  if (progressCallback) {
    progressCallback({ current: packets.length, total: packets.length });
  }
  
  return packets;
}

/**
 * Calculate statistics from packets
 * 
 * @param {Array} packets - Array of parsed packets
 * @returns {Object} Statistics object
 */
function calculateStatistics(packets) {
  console.log('📊 Calculating statistics...');
  
  const stats = {
    totalPackets: packets.length,
    protocols: {},
    srcIPs: {},
    dstIPs: {},
    packetSizes: {
      min: Infinity,
      max: 0,
      total: 0
    },
    timestamps: {
      first: null,
      last: null
    }
  };
  
  packets.forEach((packet, index) => {
    // Count protocols - handle both array (protocols) and string (protocol)
    if (packet.protocols && Array.isArray(packet.protocols)) {
      // Count each protocol in the stack
      packet.protocols.forEach(proto => {
        stats.protocols[proto] = (stats.protocols[proto] || 0) + 1;
      });
    } else if (packet.protocol) {
      // Fallback for single protocol string
      stats.protocols[packet.protocol] = (stats.protocols[packet.protocol] || 0) + 1;
    } else {
      stats.protocols['Unknown'] = (stats.protocols['Unknown'] || 0) + 1;
    }
    
    // Count source IPs (handle both src and source fields)
    const srcIP = packet.src || packet.source;
    if (srcIP) {
      stats.srcIPs[srcIP] = (stats.srcIPs[srcIP] || 0) + 1;
    }
    
    // Count destination IPs (handle both dst and destination fields)
    const dstIP = packet.dst || packet.destination;
    if (dstIP) {
      stats.dstIPs[dstIP] = (stats.dstIPs[dstIP] || 0) + 1;
    }
    
    // Track packet sizes
    if (packet.length) {
      stats.packetSizes.min = Math.min(stats.packetSizes.min, packet.length);
      stats.packetSizes.max = Math.max(stats.packetSizes.max, packet.length);
      stats.packetSizes.total += packet.length;
    }
    
    // Track timestamps
    if (packet.timestamp) {
      if (!stats.timestamps.first || packet.timestamp < stats.timestamps.first) {
        stats.timestamps.first = packet.timestamp;
      }
      if (!stats.timestamps.last || packet.timestamp > stats.timestamps.last) {
        stats.timestamps.last = packet.timestamp;
      }
    }
  });
  
  // Calculate averages
  if (packets.length > 0) {
    stats.packetSizes.average = stats.packetSizes.total / packets.length;
  } else {
    stats.packetSizes.average = 0;
  }
  
  // Calculate duration
  if (stats.timestamps.first && stats.timestamps.last) {
    stats.duration = stats.timestamps.last - stats.timestamps.first;
  } else {
    stats.duration = 0;
  }
  
  console.log('✅ Statistics calculated');
  return stats;
}

export { processPackets, calculateStatistics };
