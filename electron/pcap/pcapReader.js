/**
 * pcapReader.js - PCAP File Parser (Stream-based)
 *
 * This module reads PCAP files using a stream and converts raw
 * binary data into structured packet objects.
 */
import fs from "fs";
import { parsePacket } from "./packetParser.js";

/**
 * Read and parse a PCAP file using streams for efficiency
 *
 * @param {string} filepath - Path to PCAP file
 * @param {Function} progressCallback - Called with {current, total, packets} as file loads
 * @returns {Promise<Array>} Promise resolving to array of parsed packet objects
 */
export async function readPcapFile(filepath, progressCallback = null) {
  return new Promise((resolve, reject) => {
    console.log(`📖 Reading PCAP file: ${filepath}`);
    let leftover = Buffer.alloc(0);
    const packets = [];
    let totalSize = 0;
    let offset = 0;
    let packetNumber = 1;
    let globalHeaderParsed = false;
    let linkType = null;
    let snaplen = null;

    try {
      const stats = fs.statSync(filepath);
      totalSize = stats.size;
      console.log(`📦 File size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

      const stream = fs.createReadStream(filepath);
      stream.on("error", (error) => {
        console.error("❌ Error reading PCAP file:", error);
        reject(error);
      });

      stream.on("data", (chunk) => {
        leftover = Buffer.concat([leftover, chunk]);

        // Parse global header (first 24 bytes)
        if (!globalHeaderParsed) {
          if (leftover.length < 24) {
            // Not enough data yet
            return;
          }
          const headerBuffer = leftover.slice(0, 24);
          try {
            const globalHeader = parseGlobalHeader(headerBuffer);
            linkType = globalHeader.linkType;
            snaplen = globalHeader.snaplen;
            globalHeaderParsed = true;
            offset = 24;
            console.log(`📋 PCAP Info:`, {
              version: `${globalHeader.versionMajor}.${globalHeader.versionMinor}`,
              linkType: globalHeader.linkType,
              snaplen: globalHeader.snaplen,
            });
            // Remove global header from leftover
            leftover = leftover.slice(24);
          } catch (error) {
            console.error("❌ Invalid PCAP file:", error.message);
            stream.destroy();
            reject(error);
            return;
          }
        }

        // Parse packets while we have enough data
        while (globalHeaderParsed && leftover.length >= 16) {
          // Read packet header (16 bytes)
          let packetHeader;
          try {
            packetHeader = parsePacketHeader(leftover.slice(0, 16));
          } catch (error) {
            console.error(
              `❌ Error parsing packet header at offset ${offset}:`,
              error.message,
            );
            // Skip this chunk of data
            break;
          }

          const packetLength = packetHeader.capturedLength;
          // Check if full packet data is available
          if (leftover.length < 16 + packetLength) {
            // Wait for more data
            break;
          }

          // Extract packet data
          const packetData = leftover.slice(16, 16 + packetLength);
          // Remove header and data from leftover
          leftover = leftover.slice(16 + packetLength);

          // Parse the packet content
          try {
            const packet = parsePacket(
              packetData,
              packetNumber,
              packetHeader.timestamp,
              packetLength,
              linkType,
            );
            if (packet) {
              packets.push(packet);
            }
          } catch (error) {
            console.error(
              `❌ Error parsing packet ${packetNumber}:`,
              error.message,
            );
            // Continue to next packet
          }

          // Update offset and progress
          offset += 16 + packetLength;
          if (progressCallback && packetNumber % 1000 === 0) {
            progressCallback({
              current: offset,
              total: totalSize,
              packets: packetNumber,
            });
          }
          packetNumber++;
        }
      });

      stream.on("end", () => {
        // Handle any leftover incomplete data
        if (globalHeaderParsed && leftover.length > 0) {
          if (leftover.length < 16) {
            console.warn("⚠️ Incomplete packet header at end of file");
          } else {
            try {
              const header = parsePacketHeader(leftover.slice(0, 16));
              console.warn(
                `⚠️ Incomplete packet data at offset ${offset}: expected ${header.capturedLength} bytes, got ${leftover.length - 16}`,
              );
            } catch (error) {
              console.warn(
                "⚠️ Incomplete or corrupt packet header at end of file",
              );
            }
          }
        } else if (!globalHeaderParsed) {
          console.warn(
            "⚠️ PCAP file ended before global header was fully read",
          );
        }

        // Final progress update
        if (progressCallback) {
          progressCallback({
            current: totalSize,
            total: totalSize,
            packets: packets.length,
          });
        }
        console.log(`✅ Parsed ${packets.length} packets`);
        resolve(packets);
      });
    } catch (error) {
      console.error("❌ Error initializing PCAP read:", error);
      reject(error);
    }
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
 * @returns {Object} Parsed header fields including timestamp and capturedLength
 */
function parsePacketHeader(buffer) {
  const timestampSec = buffer.readUInt32LE(0);
  const timestampUsec = buffer.readUInt32LE(4);
  const timestamp = timestampSec * 1000 + timestampUsec / 1000;

  return {
    timestamp,
    timestampSec,
    timestampUsec,
    capturedLength: buffer.readUInt32LE(8),
    originalLength: buffer.readUInt32LE(12),
  };
}

/**
 * Validate PCAP file by checking magic number
 *
 * @param {string} filepath - Path to PCAP file
 * @returns {boolean} True if file has valid PCAP magic number
 */
export function validatePcapFile(filepath) {
  try {
    const fd = fs.openSync(filepath, "r");
    const buffer = Buffer.alloc(4);
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);
    const magicNumber = buffer.readUInt32LE(0);
    return magicNumber === 0xa1b2c3d4 || magicNumber === 0xd4c3b2a1;
  } catch {
    return false;
  }
}
