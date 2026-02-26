/**
 * simulatedCapture.js - Simulated Live Capture Module
 * 
 * Provides simulated live packet capture by replaying packets
 * from a loaded PCAP file at configurable speeds.
 */

import fs from 'fs';
import { parsePacket, setEndianness } from './packetParser.js';

/**
 * Create a new simulated capture instance
 */
function createSimulatedCapture() {
  return new SimulatedCapture();
}

/**
 * Simulated Capture class
 */
class SimulatedCapture {
  constructor() {
    this.packets = [];
    this.currentIndex = 0;
    this.isCapturing = false;
    this.isPaused = false;
    this.speed = 1.0;
    this.timer = null;
    this.packetCallback = null;
    this.statsCallback = null;
    this.startTime = null;
    this.lastPacketTime = null;
  }

  /**
   * Load a PCAP file for simulated capture
   */
  async loadFile(filepath) {
    console.log('📂 Loading file for simulated capture:', filepath);
    
    try {
      if (!fs.existsSync(filepath)) {
        return { success: false, error: 'File not found' };
      }

      // Read the entire file
      const buffer = fs.readFileSync(filepath);
      
      // Parse global header
      if (buffer.length < 24) {
        return { success: false, error: 'Invalid PCAP file' };
      }
      
      const magicNumber = buffer.readUInt32BE(0);
      let isLittleEndian = false;
      
      if (magicNumber === 0xa1b2c3d4) {
        isLittleEndian = false;
      } else if (magicNumber === 0xd4c3b2a1) {
        isLittleEndian = true;
      } else {
        return { success: false, error: 'Invalid PCAP magic number' };
      }
      
      // Set endianness for packet parser
      setEndianness(isLittleEndian);
      
      const linkType = isLittleEndian 
        ? buffer.readUInt32LE(20) 
        : buffer.readUInt32BE(20);
      
      // Parse packets
      this.packets = [];
      let offset = 24; // Skip global header
      
      while (offset + 16 <= buffer.length) {
        const readFunc = isLittleEndian ? 'readUInt32LE' : 'readUInt32BE';
        const timestampSec = buffer[readFunc](offset);
        const timestampUsec = buffer[readFunc](offset + 4);
        const timestamp = timestampSec * 1000 + timestampUsec / 1000;
        const capturedLength = buffer[readFunc](offset + 8);
        const originalLength = buffer[readFunc](offset + 12);
        
        if (offset + 16 + capturedLength > buffer.length) {
          break; // Incomplete packet
        }
        
        const packetData = buffer.slice(offset + 16, offset + 16 + capturedLength);
        
        const packet = parsePacket(
          packetData,
          this.packets.length + 1,
          timestamp,
          capturedLength,
          linkType
        );
        
        if (packet) {
          this.packets.push(packet);
        }
        
        offset += 16 + capturedLength;
      }
      
      this.currentIndex = 0;
      // FIXED: Don't call reset() here as it clears packets!
      // Just reset the state flags
      this.isCapturing = false;
      this.isPaused = false;
      
      console.log(`✅ Loaded ${this.packets.length} packets for simulated capture`);
      
      return { 
        success: true, 
        packetCount: this.packets.length,
        filename: filepath.split(/[\\/]/).pop()
      };
      
    } catch (error) {
      console.error('❌ Error loading file:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Start simulated capture
   */
  start(packetCallback, statsCallback, options = {}) {
    if (this.packets.length === 0) {
      throw new Error('No packets loaded');
    }
    
    this.packetCallback = packetCallback;
    this.statsCallback = statsCallback;
    this.speed = options.speed || 1.0;
    this.isCapturing = true;
    this.isPaused = false;
    this.startTime = Date.now();
    
    // Calculate timing between packets based on original timestamps
    if (this.packets.length > 1) {
      const firstTime = this.packets[0].timestamp;
      const lastTime = this.packets[this.packets.length - 1].timestamp;
      this.timeScale = (lastTime - firstTime) / (this.packets.length * 10); // Speed up for replay
    } else {
      this.timeScale = 100; // Default 100ms between packets
    }
    
    this.sendPacket();
  }

  /**
   * Send next packet
   */
  sendPacket() {
    if (!this.isCapturing || this.isPaused || this.currentIndex >= this.packets.length) {
      if (this.currentIndex >= this.packets.length) {
        this.isCapturing = false;
      }
      return;
    }
    
    const packet = this.packets[this.currentIndex];
    
    if (this.packetCallback) {
      this.packetCallback(packet);
    }
    
    if (this.statsCallback) {
      this.statsCallback({
        isCapturing: this.isCapturing,
        isPaused: this.isPaused,
        currentIndex: this.currentIndex,
        totalPackets: this.packets.length,
        progress: (this.currentIndex / this.packets.length) * 100
      });
    }
    
    this.currentIndex++;
    
    // Schedule next packet
    const delay = this.timeScale / this.speed;
    this.timer = setTimeout(() => this.sendPacket(), delay);
  }

  /**
   * Pause simulated capture
   */
  pause() {
    if (this.isCapturing && !this.isPaused) {
      this.isPaused = true;
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
    }
  }

  /**
   * Resume simulated capture
   */
  resume() {
    if (this.isCapturing && this.isPaused) {
      this.isPaused = false;
      this.sendPacket();
    }
  }

  /**
   * Stop simulated capture
   */
  stop() {
    this.isCapturing = false;
    this.isPaused = false;
    this.currentIndex = 0;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Reset state
   */
  reset() {
    this.stop();
    this.packets = [];
    this.packetCallback = null;
    this.statsCallback = null;
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isCapturing: this.isCapturing,
      isPaused: this.isPaused,
      currentIndex: this.currentIndex,
      totalPackets: this.packets.length,
      processedPackets: this.currentIndex,
      progress: this.packets.length > 0 
        ? (this.currentIndex / this.packets.length) * 100 
        : 0
    };
  }

  /**
   * Set playback speed
   */
  setSpeed(speed) {
    this.speed = Math.max(0.5, Math.min(10, speed));
  }
}

export { createSimulatedCapture };
