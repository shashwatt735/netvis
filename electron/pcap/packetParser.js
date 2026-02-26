/**
 * packetParser.js - Packet Parser Module
 * 
 * Parses raw packet data into structured packet objects.
 * Handles Ethernet, IP, TCP, UDP, and ICMP protocols.
 */

import { formatTimestamp } from './utils.js';

// Store endianness globally (set by pcapReader)
let globalEndianness = false;

/**
 * Set global endianness for packet parsing
 * 
 * @param {boolean} isLittleEndian - True for little endian
 */
export function setEndianness(isLittleEndian) {
  globalEndianness = isLittleEndian;
}

/**
 * Parse raw packet data into a structured packet object
 * 
 * @param {Buffer} packetData - Raw packet data
 * @param {number} packetNumber - Sequential packet number
 * @param {number} timestamp - Packet timestamp (ms since epoch)
 * @param {number} capturedLength - Actual captured length
 * @param {number} linkType - Data link type (1 = Ethernet)
 * @returns {Object} Structured packet object
 */
export function parsePacket(packetData, packetNumber, timestamp, capturedLength, linkType = 1) {
  if (!packetData || packetData.length === 0) {
    return null;
  }
  
  // Initialize packet object - add frameNumber for UI compatibility
  const packet = {
    number: packetNumber,
    frameNumber: packetNumber,  // Add frameNumber alias for UI components
    timestamp: timestamp,
    length: capturedLength,
    capturedLength: capturedLength,
    protocols: [],
    src: null,
    dst: null,
    info: '',
    raw: null
  };
  
  try {
    let offset = 0;
    
    // Parse Layer 2 (Data Link Layer)
    if (linkType === 1 && packetData.length >= 14) {
      // Ethernet II (14 bytes)
      const ethernet = parseEthernet(packetData.slice(0, 14));
      packet.src = ethernet.src;
      packet.dst = ethernet.dst;
      packet.protocols.push('Ethernet');
      packet.etherType = ethernet.etherType;
      offset = 14;
    }
    
    // Parse Layer 3 (Network Layer)
    if (packetData.length > offset) {
      const ipResult = parseIP(packetData.slice(offset));
      if (ipResult) {
        packet.protocols.push('IP');
        packet.src = ipResult.src;
        packet.dst = ipResult.dst;
        packet.info = ipResult.info;
        packet.ip = ipResult.ipData;
        offset += ipResult.headerLength;
      }
    }
    
    // Parse Layer 4 (Transport Layer)
    if (packetData.length > offset) {
      const protocol = packet.ip ? packet.ip.protocol : null;
      
      if (protocol === 6 && packetData.length > offset + 20) {
        // TCP
        const tcpResult = parseTCP(packetData.slice(offset));
        if (tcpResult) {
          packet.protocols.push('TCP');
          packet.info = tcpResult.info;
          packet.tcp = tcpResult.tcpData;
          offset += tcpResult.headerLength;
        }
      } else if (protocol === 17 && packetData.length > offset + 8) {
        // UDP
        const udpResult = parseUDP(packetData.slice(offset));
        if (udpResult) {
          packet.protocols.push('UDP');
          packet.info = udpResult.info;
          packet.udp = udpResult.udpData;
          offset += 8;
        }
      } else if (protocol === 1) {
        // ICMP
        const icmpResult = parseICMP(packetData.slice(offset));
        if (icmpResult) {
          packet.protocols.push('ICMP');
          packet.info = icmpResult.info;
          packet.icmp = icmpResult.icmpData;
        }
      }
    }
    
    // Set default info if not set
    if (!packet.info) {
      packet.info = packet.protocols.join(' / ') || 'Unknown';
    }
    
    // Add raw data reference (truncated for performance)
    if (capturedLength > 0) {
      packet.raw = {
        length: capturedLength,
        preview: Array.from(packetData.slice(0, Math.min(64, packetData.length)))
      };
    }
    
    return packet;
    
  } catch (error) {
    console.error(`Error parsing packet ${packetNumber}:`, error.message);
    return packet;
  }
}

/**
 * Parse Ethernet II header
 */
function parseEthernet(buffer) {
  if (buffer.length < 14) return null;
  
  const src = Array.from(buffer.slice(6, 12))
    .map(b => b.toString(16).padStart(2, '0'))
    .join(':');
  const dst = Array.from(buffer.slice(0, 6))
    .map(b => b.toString(16).padStart(2, '0'))
    .join(':');
  
  const etherType = buffer.readUInt16BE(12);
  
  let etherTypeName = '0x' + etherType.toString(16).padStart(4, '0');
  if (etherType === 0x0800) etherTypeName = 'IPv4';
  else if (etherType === 0x0806) etherTypeName = 'ARP';
  else if (etherType === 0x86DD) etherTypeName = 'IPv6';
  
  return { src, dst, etherType, etherTypeName };
}

/**
 * Parse IP header
 */
function parseIP(buffer) {
  if (buffer.length < 20) return null;
  
  const version = (buffer[0] >> 4) & 0x0F;
  const headerLength = (buffer[0] & 0x0F) * 4;
  
  if (version !== 4 || headerLength < 20 || buffer.length < headerLength) {
    return null;
  }
  
  const totalLength = buffer.readUInt16BE(2);
  const protocol = buffer[9];
  const srcIP = `${buffer[12]}.${buffer[13]}.${buffer[14]}.${buffer[15]}`;
  const dstIP = `${buffer[16]}.${buffer[17]}.${buffer[18]}.${buffer[19]}`;
  
  let protocolName = 'Unknown';
  if (protocol === 1) protocolName = 'ICMP';
  else if (protocol === 6) protocolName = 'TCP';
  else if (protocol === 17) protocolName = 'UDP';
  
  const info = `${protocolName} ${srcIP} → ${dstIP} Len=${totalLength}`;
  
  return {
    src: srcIP,
    dst: dstIP,
    info,
    headerLength,
    protocol,
    ipData: {
      version,
      headerLength,
      totalLength,
      protocol,
      src: srcIP,
      dst: dstIP,
      ttl: buffer[8]
    }
  };
}

/**
 * Parse TCP header
 */
function parseTCP(buffer) {
  if (buffer.length < 20) return null;
  
  const srcPort = buffer.readUInt16BE(0);
  const dstPort = buffer.readUInt16BE(2);
  const dataOffset = (buffer[12] >> 4) * 4;
  
  const flags = [];
  if (buffer[13] & 0x01) flags.push('FIN');
  if (buffer[13] & 0x02) flags.push('SYN');
  if (buffer[13] & 0x04) flags.push('RST');
  if (buffer[13] & 0x08) flags.push('PSH');
  if (buffer[13] & 0x10) flags.push('ACK');
  if (buffer[13] & 0x20) flags.push('URG');
  
  const info = `${srcPort} → ${dstPort} [${flags.join(', ')}] Seq=0 Ack=0`;
  
  return {
    info,
    headerLength: dataOffset,
    tcpData: {
      srcPort,
      dstPort,
      flags: flags.join(', '),
      seqNumber: buffer.readUInt32BE(4),
      ackNumber: buffer.readUInt32BE(8),
      dataOffset
    }
  };
}

/**
 * Parse UDP header
 */
function parseUDP(buffer) {
  if (buffer.length < 8) return null;
  
  const srcPort = buffer.readUInt16BE(0);
  const dstPort = buffer.readUInt16BE(2);
  const length = buffer.readUInt16BE(4);
  
  const info = `${srcPort} → ${dstPort} Len=${length}`;
  
  return {
    info,
    udpData: {
      srcPort,
      dstPort,
      length
    }
  };
}

/**
 * Parse ICMP header
 */
function parseICMP(buffer) {
  if (buffer.length < 8) return null;
  
  const type = buffer[0];
  const code = buffer[1];
  
  const typeNames = {
    0: 'Echo Reply',
    3: 'Destination Unreachable',
    8: 'Echo Request',
    11: 'Time Exceeded'
  };
  
  const typeName = typeNames[type] || `Type ${type}`;
  const info = `${typeName} (code ${code})`;
  
  return {
    info,
    icmpData: {
      type,
      code,
      typeName
    }
  };
}

/**
 * Process multiple packets
 * 
 * @param {Array} packets - Array of raw packet data
 * @returns {Array} Array of parsed packets
 */
export function processPackets(packets) {
  return packets.map(p => parsePacket(
    p.data,
    p.number,
    p.timestamp,
    p.capturedLength,
    p.linkType
  )).filter(p => p !== null);
}
