/**
 * NetVis - Preload Script (Security Bridge)
 * 
 * This script runs in a special context that has access to both:
 * 1. Node.js APIs (can use require, fs, etc.)
 * 2. Renderer process (can access window object)
 * 
 * Purpose:
 * - Expose ONLY safe, specific functions to the renderer
 * - Act as a security boundary
 * - Prevent renderer from directly accessing Node.js
 * 
 * Security Model:
 * ✅ Allowed: Specific, validated function calls
 * ❌ Forbidden: Direct access to require(), fs, process, etc.
 * 
 * Think of this as a firewall: renderer can only call functions
 * we explicitly expose here.
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose safe API to renderer process
 * 
 * This makes functions available as:
 * window.electron.openPcapDialog()
 * window.electron.parsePcapFile(filepath)
 * etc.
 * 
 * CRITICAL SECURITY RULES:
 * 1. Never expose require(), process, or any Node.js module directly
 * 2. Always validate inputs before passing to IPC
 * 3. Only expose specific, intentional functions
 * 4. Never expose the entire ipcRenderer
 */
contextBridge.exposeInMainWorld('electron', {
  /**
   * Open file dialog to select PCAP file
   * 
   * @returns {Promise<string|null>} - Filepath or null if cancelled
   * 
   * Usage in React:
   * const filepath = await window.electron.openPcapDialog()
   */
  openPcapDialog: async () => {
    console.log('[Preload] openPcapDialog called');
    
    try {
      const result = await ipcRenderer.invoke('open-pcap-dialog');
      return result;
    } catch (error) {
      console.error('[Preload] Error opening dialog:', error);
      throw error;
    }
  },
  
  /**
   * Parse PCAP file
   * 
   * @param {string} filepath - Path to PCAP file
   * @returns {Promise<Object>} - { success, packets, statistics, fileInfo }
   * 
   * Usage in React:
   * const result = await window.electron.parsePcapFile('/path/to/file.pcap')
   * if (result.success) {
   *   console.log(result.packets)
   * }
   */
  parsePcapFile: async (filepath) => {
    console.log('[Preload] parsePcapFile called:', filepath);
    
    // Validate input (security)
    if (typeof filepath !== 'string') {
      throw new Error('Filepath must be a string');
    }
    
    if (filepath.length === 0) {
      throw new Error('Filepath cannot be empty');
    }
    
    // Prevent path traversal attacks
    if (filepath.includes('..')) {
      throw new Error('Invalid filepath: path traversal not allowed');
    }
    
    try {
      const result = await ipcRenderer.invoke('parse-pcap', filepath);
      return result;
    } catch (error) {
      console.error('[Preload] Error parsing PCAP:', error);
      throw error;
    }
  },
  
  /**
   * Get PCAP file info
   * 
   * @param {string} filepath - Path to PCAP file
   * @returns {Promise<Object>} - { success, info }
   */
  getPcapInfo: async (filepath) => {
    console.log('[Preload] getPcapInfo called:', filepath);
    
    if (typeof filepath !== 'string') {
      throw new Error('Filepath must be a string');
    }
    
    try {
      const result = await ipcRenderer.invoke('get-pcap-info', filepath);
      return result;
    } catch (error) {
      console.error('[Preload] Error getting info:', error);
      throw error;
    }
  },
  
  /**
   * Validate PCAP file
   * 
   * @param {string} filepath - Path to PCAP file
   * @returns {Promise<Object>} - { valid, error? }
   */
  validatePcap: async (filepath) => {
    console.log('[Preload] validatePcap called:', filepath);
    
    if (typeof filepath !== 'string') {
      throw new Error('Filepath must be a string');
    }
    
    try {
      const result = await ipcRenderer.invoke('validate-pcap', filepath);
      return result;
    } catch (error) {
      console.error('[Preload] Error validating:', error);
      throw error;
    }
  },
  
  /**
   * Listen for parse progress updates
   * 
   * @param {Function} callback - Called with progress object
   * @returns {Function} - Cleanup function
   */
  onParseProgress: (callback) => {
    console.log('[Preload] onParseProgress listener registered');
    
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    const validatedCallback = (event, progress) => {
      if (progress && typeof progress === 'object') {
        callback(progress);
      }
    };
    
    ipcRenderer.on('parse-progress', validatedCallback);
    
    return () => {
      console.log('[Preload] onParseProgress listener removed');
      ipcRenderer.removeListener('parse-progress', validatedCallback);
    };
  },
  
  // ============================================
  // SIMULATED CAPTURE FUNCTIONS
  // ============================================
  
  /**
   * Load file for simulated capture
   * 
   * @param {string} filepath - Path to PCAP file
   * @returns {Promise<Object>} - { success, packetCount?, error? }
   */
  simLoadFile: async (filepath) => {
    console.log('[Preload] simLoadFile called:', filepath);
    
    if (typeof filepath !== 'string') {
      throw new Error('Filepath must be a string');
    }
    
    if (filepath.includes('..')) {
      throw new Error('Invalid filepath: path traversal not allowed');
    }
    
    try {
      const result = await ipcRenderer.invoke('sim-load-file', filepath);
      return result;
    } catch (error) {
      console.error('[Preload] Error loading file:', error);
      throw error;
    }
  },
  
  /**
   * Start simulated capture
   * 
   * @param {Object} options - Capture options (speed, etc.)
   * @returns {Promise<Object>} - { success, error? }
   */
  simStart: async (options = {}) => {
    console.log('[Preload] simStart called with options:', options);
    
    try {
      const result = await ipcRenderer.invoke('sim-start', options);
      return result;
    } catch (error) {
      console.error('[Preload] Error starting capture:', error);
      throw error;
    }
  },
  
  /**
   * Pause simulated capture
   * 
   * @returns {Promise<Object>} - { success, error? }
   */
  simPause: async () => {
    console.log('[Preload] simPause called');
    
    try {
      const result = await ipcRenderer.invoke('sim-pause');
      return result;
    } catch (error) {
      console.error('[Preload] Error pausing:', error);
      throw error;
    }
  },
  
  /**
   * Resume simulated capture
   * 
   * @returns {Promise<Object>} - { success, error? }
   */
  simResume: async () => {
    console.log('[Preload] simResume called');
    
    try {
      const result = await ipcRenderer.invoke('sim-resume');
      return result;
    } catch (error) {
      console.error('[Preload] Error resuming:', error);
      throw error;
    }
  },
  
  /**
   * Stop simulated capture
   * 
   * @returns {Promise<Object>} - { success, error? }
   */
  simStop: async () => {
    console.log('[Preload] simStop called');
    
    try {
      const result = await ipcRenderer.invoke('sim-stop');
      return result;
    } catch (error) {
      console.error('[Preload] Error stopping:', error);
      throw error;
    }
  },
  
  /**
   * Get simulated capture status
   * 
   * @returns {Promise<Object>} - { success, status }
   */
  simStatus: async () => {
    console.log('[Preload] simStatus called');
    
    try {
      const result = await ipcRenderer.invoke('sim-status');
      return result;
    } catch (error) {
      console.error('[Preload] Error getting status:', error);
      throw error;
    }
  },
  
  /**
   * Set simulated capture speed
   * 
   * @param {number} speed - Playback speed (0.5 - 10)
   * @returns {Promise<Object>} - { success, error? }
   */
  simSetSpeed: async (speed) => {
    console.log('[Preload] simSetSpeed called:', speed);
    
    if (typeof speed !== 'number' || speed < 0.1 || speed > 20) {
      throw new Error('Speed must be a number between 0.1 and 20');
    }
    
    try {
      const result = await ipcRenderer.invoke('sim-set-speed', speed);
      return result;
    } catch (error) {
      console.error('[Preload] Error setting speed:', error);
      throw error;
    }
  },
  
  /**
   * Listen for new packets during simulated capture
   * 
   * @param {Function} callback - Called with each new packet
   * @returns {Function} - Cleanup function
   */
  onSimPacket: (callback) => {
    console.log('[Preload] onSimPacket listener registered');
    
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    const validatedCallback = (event, packet) => {
      if (packet && typeof packet === 'object') {
        callback(packet);
      }
    };
    
    ipcRenderer.on('sim-packet', validatedCallback);
    
    return () => {
      console.log('[Preload] onSimPacket listener removed');
      ipcRenderer.removeListener('sim-packet', validatedCallback);
    };
  },
  
  /**
   * Listen for statistics updates during simulated capture
   * 
   * @param {Function} callback - Called with statistics
   * @returns {Function} - Cleanup function
   */
  onSimStats: (callback) => {
    console.log('[Preload] onSimStats listener registered');
    
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    const validatedCallback = (event, stats) => {
      if (stats && typeof stats === 'object') {
        callback(stats);
      }
    };
    
    ipcRenderer.on('sim-stats', validatedCallback);
    
    return () => {
      console.log('[Preload] onSimStats listener removed');
      ipcRenderer.removeListener('sim-stats', validatedCallback);
    };
  },
  
  /**
   * Get platform information
   * 
   * @returns {string} - Platform (win32, darwin, linux)
   */
  getPlatform: () => {
    return process.platform;
  }
});

/**
 * Log that preload script loaded successfully
 */
console.log('✅ [Preload] Security bridge initialized');
console.log('📡 [Preload] Exposed API:');
console.log('  File Operations: openPcapDialog, parsePcapFile, getPcapInfo, validatePcap');
console.log('  Simulated Capture: simLoadFile, simStart, simPause, simResume, simStop');
console.log('  Events: onParseProgress, onSimPacket, onSimStats');
console.log('  System: getPlatform');

/**
 * IMPORTANT SECURITY NOTES:
 * 
 * ❌ NEVER DO THIS (exposes everything):
 * contextBridge.exposeInMainWorld('electron', {
 *   ipcRenderer: ipcRenderer,
 *   require: require,
 *   process: process
 * })
 * 
 * ✅ ALWAYS DO THIS (expose specific functions):
 * contextBridge.exposeInMainWorld('electron', {
 *   specificFunction: () => ipcRenderer.invoke('channel')
 * })
 * 
 * WHY:
 * If you expose ipcRenderer directly, malicious code in renderer
 * can call ANY IPC channel, including ones you didn't intend to expose.
 * 
 * By exposing only specific functions, you create a whitelist of
 * allowed operations.
 */
