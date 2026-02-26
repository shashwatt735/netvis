/**
 * pcapReader.js - PCAP File Parser (Stream-based)
 *
 * This module reads PCAP and PCAPNG files using a stream and converts raw
 * binary data into structured packet objects.
 * 
 * Supported formats:
 * - PCAP (libpcap format, big-endian and little-endian)
 * - PCAP-NG (pcap-ng format, typically little-endian)
 */

import fs from 'fs';
import { parsePacket, setEndianness } from './packetParser.js';

// Store endianness globally for use in parsePacketHeader
let globalEndianness = false; // false = big endian, true = little endian
let isPcapNg = false; // Track if we're reading PCAPNG format

/**
 * Read and parse a PCAP or PCAPNG file using streams for efficiency
 *
 * @param {string} filepath - Path to PCAP/PCAPNG file
 * @param {Function} progressCallback - Called with {current, total, packets} as file loads
 * @returns {Promise<Object>} Promise resolving to object with packets array and file info
 */
async function readPcapFile(filepath, progressCallback = null) {
  return new Promise((resolve, reject) => {
    console.log(`📖 Reading PCAP file: ${filepath}`);

    try {
      const stats = fs.statSync(filepath);
      const totalSize = stats.size;
      console.log(`📦 File size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

      // First, check if it's PCAP or PCAPNG
      const magicBuffer = Buffer.alloc(4);
      const fd = fs.openSync(filepath, "r");
      fs.readSync(fd, magicBuffer, 0, 4, 0);
      fs.closeSync(fd);
      
      const magicNumber = magicBuffer.readUInt32BE(0);
      isPcapNg = false;
      
      // Check for PCAPNG magic number (0x0a0d0d0a - Section Header Block)
      if (magicNumber === 0x0a0d0d0a) {
        console.log('📋 Detected PCAPNG format');
        isPcapNg = true;
        globalEndianness = true; // PCAPNG is typically little-endian
        setEndianness(true);
      }

      const stream = fs.createReadStream(filepath);
      stream.on("error", (error) => {
        console.error("❌ Error reading PCAP file:", error);
        reject(error);
      });

      if (isPcapNg) {
        // Parse PCAPNG format
        parsePcapNgStream(stream, filepath, totalSize, progressCallback, resolve, reject);
      } else {
        // Parse PCAP format (original code)
        parsePcapStream(stream, filepath, totalSize, progressCallback, resolve, reject);
      }
    } catch (error) {
      console.error("❌ Error initializing PCAP read:", error);
      reject(error);
    }
  });
}

/**
 * Parse PCAP format (original stream-based parsing)
 */
function parsePcapStream(stream, filepath, totalSize, progressCallback, resolve, reject) {
  let leftover = Buffer.alloc(0);
  const packets = [];
  let offset = 0;
  let packetNumber = 1;
  let globalHeaderParsed = false;
  let linkType = null;

  stream.on("data", (chunk) => {
    leftover = Buffer.concat([leftover, chunk]);

    // Parse global header (first 24 bytes)
    if (!globalHeaderParsed) {
      if (leftover.length < 24) {
        return;
      }
      const headerBuffer = leftover.slice(0, 24);
      try {
        const globalHeader = parseGlobalHeader(headerBuffer);
        linkType = globalHeader.linkType;
        globalEndianness = globalHeader.isLittleEndian;
        setEndianness(globalEndianness);
        globalHeaderParsed = true;
        offset = 24;
        console.log(`📋 PCAP Info:`, {
          version: `${globalHeader.versionMajor}.${globalHeader.versionMinor}`,
          linkType: globalHeader.linkType,
          snaplen: globalHeader.snaplen,
          endianness: globalHeader.isLittleEndian ? "little" : "big",
        });
        leftover = leftover.slice(24);
      } catch (error) {
        console.error("❌ Invalid PCAP file:", error.message);
        stream.destroy();
        reject(error);
        return;
      }
    }

    // Parse packets
    while (globalHeaderParsed && leftover.length >= 16) {
      let packetHeader;
      try {
        packetHeader = parsePacketHeader(leftover.slice(0, 16), globalEndianness);
      } catch (error) {
        console.error(`❌ Error parsing packet header at offset ${offset}:`, error.message);
        break;
      }

      const packetLength = packetHeader.capturedLength;
      if (leftover.length < 16 + packetLength) {
        break;
      }

      const packetData = leftover.slice(16, 16 + packetLength);
      leftover = leftover.slice(16 + packetLength);

      try {
        const packet = parsePacket(packetData, packetNumber, packetHeader.timestamp, packetLength, linkType);
        if (packet) {
          packets.push(packet);
        }
      } catch (error) {
        console.error(`❌ Error parsing packet ${packetNumber}:`, error.message);
      }

      offset += 16 + packetLength;
      if (progressCallback && packetNumber % 1000 === 0) {
        progressCallback({ current: offset, total: totalSize, packets: packetNumber });
      }
      packetNumber++;
    }
  });

  stream.on("end", () => {
    if (progressCallback) {
      progressCallback({ current: totalSize, total: totalSize, packets: packets.length });
    }
    console.log(`✅ Parsed ${packets.length} packets from PCAP`);
    resolve({
      packets: packets,
      filename: filepath.split(/[\\/]/).pop(),
      fileSize: totalSize
    });
  });
}

/**
 * Parse PCAPNG format
 * PCAPNG uses blocks: Section Header Block (SHB), Interface Description Block (IDB), Enhanced Packet Block (EPB)
 */
function parsePcapNgStream(stream, filepath, totalSize, progressCallback, resolve, reject) {
  let leftover = Buffer.alloc(0);
  const packets = [];
  let offset = 0;
  let packetNumber = 1;
  let linkType = 1; // Default to Ethernet
  
  // Block types
  const BLOCK_TYPE_IDB = 0x00000001;
  const BLOCK_TYPE_EPB = 0x00000006;
  const BLOCK_TYPE_SPB = 0x00000003;

  stream.on("data", (chunk) => {
    leftover = Buffer.concat([leftover, chunk]);
    
    // Parse blocks
    while (leftover.length >= 8) {
      // Read block type and length
      const blockType = leftover.readUInt32LE(4);
      const blockLength = leftover.readUInt32LE(0);
      
      // Check if we have the full block
      if (blockLength < 12 || leftover.length < blockLength) {
        break;
      }
      
      const blockData = leftover.slice(0, blockLength);
      leftover = leftover.slice(blockLength);
      offset += blockLength;
      
      switch (blockType) {
        case BLOCK_TYPE_IDB:
          // Interface Description Block
          if (blockData.length >= 20) {
            linkType = blockData.readUInt16LE(16);
            console.log(`📋 PCAPNG IDB: linkType=${linkType}`);
          }
          break;
          
        case BLOCK_TYPE_EPB:
        case BLOCK_TYPE_SPB:
          // Enhanced Packet Block or Simple Packet Block
          if (blockData.length >= 20) {
            const capturedLen = blockData.readUInt32LE(16);
            const originalLen = blockData.readUInt32LE(20);
            const timestampHigh = blockData.readUInt32LE(8);
            const timestampLow = blockData.readUInt32LE(12);
            
            // Combine high and low bits for timestamp (nanoseconds to ms)
            const timestamp = ((BigInt(timestampHigh) << 32n) | BigInt(timestampLow)) / 1000000n;
            
            if (blockData.length >= 24 + capturedLen) {
              const packetData = blockData.slice(24, 24 + capturedLen);
              
              try {
                const packet = parsePacket(
                  packetData,
                  packetNumber,
                  Number(timestamp),
                  capturedLen,
                  linkType
                );
                if (packet) {
                  packet.originalLength = originalLen;
                  packets.push(packet);
                }
              } catch (error) {
                console.error(`❌ Error parsing PCAPNG packet ${packetNumber}:`, error.message);
              }
              
              packetNumber++;
              
              if (progressCallback && packetNumber % 1000 === 0) {
                progressCallback({ current: offset, total: totalSize, packets: packetNumber });
              }
            }
          }
          break;
      }
    }
  });

  stream.on("end", () => {
    if (progressCallback) {
      progressCallback({ current: totalSize, total: totalSize, packets: packets.length });
    }
    console.log(`✅ Parsed ${packets.length} packets from PCAPNG`);
    resolve({
      packets: packets,
      filename: filepath.split(/[\\/]/).pop(),
      fileSize: totalSize
    });
  });
}

/**
 * Parse PCAP Global Header (24 bytes)
 *
 * @param {Buffer} buffer - Buffer containing the global header
 * @returns {Object} Parsed header fields
 */
function parseGlobalHeader(buffer) {
  const magicNumber = buffer.readUInt32BE(0);

  // Determine byte order
  let isLittleEndian;
  if (magicNumber === 0xa1b2c3d4) {
    isLittleEndian = false; // Big endian
  } else if (magicNumber === 0xd4c3b2a1) {
    isLittleEndian = true; // Little endian
  } else {
    throw new Error(`Invalid PCAP magic number: 0x${magicNumber.toString(16)}`);
  }

  // Read fields with correct endianness
  const versionMajor = isLittleEndian
    ? buffer.readUInt16LE(4)
    : buffer.readUInt16BE(4);
  const versionMinor = isLittleEndian
    ? buffer.readUInt16LE(6)
    : buffer.readUInt16BE(6);
  const timezone = isLittleEndian
    ? buffer.readUInt32LE(8)
    : buffer.readUInt32BE(8);
  const timestampAccuracy = isLittleEndian
    ? buffer.readUInt32LE(12)
    : buffer.readUInt32BE(12);
  const snaplen = isLittleEndian
    ? buffer.readUInt32LE(16)
    : buffer.readUInt32BE(16);
  const linkType = isLittleEndian
    ? buffer.readUInt32LE(20)
    : buffer.readUInt32BE(20);

  return {
    magicNumber,
    isLittleEndian,
    versionMajor,
    versionMinor,
    timezone,
    timestampAccuracy,
    snaplen,
    linkType,
  };
}

/**
 * Parse PCAP Packet Header (16 bytes)
 *
 * Structure:
 * - Timestamp seconds (4 bytes)
 * - Timestamp microseconds (4 bytes)
 * - Captured length (4 bytes)
 * - Original length (4 bytes)
 *
 * @param {Buffer} buffer - Buffer containing the packet header
 * @param {boolean} isLittleEndian - Whether to use little-endian byte order
 * @returns {Object} Parsed header fields including timestamp and capturedLength
 */
function parsePacketHeader(buffer, isLittleEndian = false) {
  const readFunc = isLittleEndian ? "readUInt32LE" : "readUInt32BE";
  const timestampSec = buffer[readFunc](0);
  const timestampUsec = buffer[readFunc](4);
  const timestamp = timestampSec * 1000 + timestampUsec / 1000;

  return {
    timestamp,
    timestampSec,
    timestampUsec,
    capturedLength: buffer[readFunc](8),
    originalLength: buffer[readFunc](12),
  };
}

/**
 * Validate PCAP file by checking magic number
 *
 * @param {string} filepath - Path to PCAP file
 * @returns {boolean} True if file has valid PCAP magic number
 */
function validatePcapFile(filepath) {
  try {
    const fd = fs.openSync(filepath, "r");
    const buffer = Buffer.alloc(4);
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);
    // Read as little-endian first
    const magicNumberLE = buffer.readUInt32LE(0);
    // Valid PCAP magic numbers (both endianness):
    // 0xa1b2c3d4 = standard pcap (big-endian/native)
    // 0xd4c3b2a1 = little-endian pcap
    if (magicNumberLE === 0xa1b2c3d4 || magicNumberLE === 0xd4c3b2a1) {
      return true;
    }
    // Also check as big-endian
    const magicNumberBE = buffer.readUInt32BE(0);
    return magicNumberBE === 0xa1b2c3d4 || magicNumberBE === 0xd4c3b2a1;
  } catch {
    return false;
  }
}

/**
 * Get PCAP file info
 *
 * @param {string} filepath - Path to PCAP file
 * @returns {Object} File info
 */
function getPcapInfo(filepath) {
  try {
    const fd = fs.openSync(filepath, "r");
    const buffer = Buffer.alloc(24);
    fs.readSync(fd, buffer, 0, 24, 0);
    fs.closeSync(fd);

    const magicNumber = buffer.readUInt32BE(0);
    let isLittleEndian;
    if (magicNumber === 0xa1b2c3d4) {
      isLittleEndian = false;
    } else if (magicNumber === 0xd4c3b2a1) {
      isLittleEndian = true;
    } else {
      return null;
    }

    const versionMajor = isLittleEndian
      ? buffer.readUInt16LE(4)
      : buffer.readUInt16BE(4);
    const versionMinor = isLittleEndian
      ? buffer.readUInt16LE(6)
      : buffer.readUInt16BE(6);
    const snaplen = isLittleEndian
      ? buffer.readUInt32LE(16)
      : buffer.readUInt16BE(16);
    const linkType = isLittleEndian
      ? buffer.readUInt32LE(20)
      : buffer.readUInt32BE(20);

    return {
      version: `${versionMajor}.${versionMinor}`,
      snaplen,
      linkType,
      isLittleEndian
    };
  } catch (error) {
    console.error('Error getting PCAP info:', error);
    return null;
  }
}

export { readPcapFile, validatePcapFile, getPcapInfo };
