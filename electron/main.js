/**
 * NetVis - Electron Main Process
 * 
 * This is the main entry point for the Electron application.
 * It runs in Node.js and has full system access.
 * 
 * Responsibilities:
 * - Create and manage application window
 * - Handle IPC (Inter-Process Communication) requests from renderer
 * - Perform file operations (reading PCAP files)
 * - Process packets using our parsers
 * - Enforce security policies
 * 
 * Security Model:
 * - Renderer process is sandboxed (no Node.js access)
 * - All file operations go through this main process
 * - IPC requests are validated before execution
 */

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import our PCAP processing modules
import { readPcapFile, validatePcapFile, getPcapInfo } from './pcap/pcapReader.js';
import { processPackets, calculateStatistics } from './pcap/packetProcessor.js';
import { createSimulatedCapture } from './pcap/simulatedCapture.js';

// Global simulated capture instance
let simulatedCapture = null;

// Global reference to window (prevents garbage collection)
let mainWindow = null;

/**
 * Create the main application window
 * 
 * Window Configuration:
 * - Size: 1400x900 (good for displaying packet lists)
 * - Security: Context isolation, sandbox enabled
 * - Preload: Exposes safe API to renderer
 */
function createWindow() {
  console.log('🚀 Creating NetVis window...');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    
    // Window appearance
    title: 'NetVis - Network Packet Analyzer',
    backgroundColor: '#1e1e1e', // Dark background
    
    // macOS specific
    titleBarStyle: 'hiddenInset',
    
    // Security settings (CRITICAL)
    webPreferences: {
      // Disable Node.js in renderer process
      nodeIntegration: false,
      
      // Enable context isolation (renderer can't access Node.js)
      contextIsolation: true,
      
      // Enable sandbox (OS-level security)
      sandbox: true,
      
      // Preload script (security bridge)
      preload: path.join(__dirname, 'preload.cjs'),
      
      // Disable remote module (deprecated and insecure)
      enableRemoteModule: false,
      
      // Disable web security only in development (for HMR)
      webSecurity: !isDevelopment()
    }
  });
  
  // Load the app
  if (isDevelopment()) {
    // Development: Load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    
    // Open DevTools automatically in development
    mainWindow.webContents.openDevTools();
    
    console.log('📱 Loaded from Vite dev server (development mode)');
  } else {
    // Production: Load from built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    
    console.log('📱 Loaded from built files (production mode)');
  }
  
  // Window event listeners
  mainWindow.on('closed', () => {
    mainWindow = null;
    console.log('🔴 Main window closed');
  });
  
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ NetVis window loaded successfully');
  });
  
  // Handle errors
  mainWindow.webContents.on('crashed', (event) => {
    console.error('💥 Renderer process crashed:', event);
  });
}

/**
 * Check if running in development mode
 */
function isDevelopment() {
  return process.env.NODE_ENV === 'development' || 
         process.defaultApp ||
         /[\\/]electron-prebuilt[\\/]/.test(process.execPath) ||
         /[\\/]electron[\\/]/.test(process.execPath);
}

// ============================================================================
// APPLICATION LIFECYCLE
// ============================================================================

/**
 * App ready - Create window
 */
app.whenReady().then(() => {
  console.log('🎉 Electron app is ready');
  console.log('📂 App path:', app.getAppPath());
  console.log('🖥️  Platform:', process.platform);
  console.log('⚙️  Node version:', process.version);
  
  // Register IPC handlers
  registerIPCHandlers();
  
  // Create window
  createWindow();
  
  // macOS: Re-create window when dock icon clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * All windows closed - Quit app (except macOS)
 */
app.on('window-all-closed', () => {
  // On macOS, apps typically stay open until Cmd+Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Before quit - Cleanup
 */
app.on('before-quit', () => {
  console.log('👋 NetVis shutting down...');
});

// ============================================================================
// IPC HANDLERS - Communication with Renderer Process
// ============================================================================

/**
 * Register all IPC handlers
 * These handle requests from the React UI
 */
function registerIPCHandlers() {
  console.log('📡 Registering IPC handlers...');
  
  // Handler 1: Open file dialog
  ipcMain.handle('open-pcap-dialog', handleOpenDialog);
  
  // Handler 2: Parse PCAP file
  ipcMain.handle('parse-pcap', handleParsePcap);
  
  // Handler 3: Get file info (without parsing all packets)
  ipcMain.handle('get-pcap-info', handleGetInfo);
  
  // Handler 4: Validate PCAP file
  ipcMain.handle('validate-pcap', handleValidate);
  
  // === SIMULATED CAPTURE HANDLERS ===
  
  // Handler 5: Load file for simulated capture
  ipcMain.handle('sim-load-file', handleSimLoadFile);
  
  // Handler 6: Start simulated capture
  ipcMain.handle('sim-start', handleSimStart);
  
  // Handler 7: Pause simulated capture
  ipcMain.handle('sim-pause', handleSimPause);
  
  // Handler 8: Resume simulated capture
  ipcMain.handle('sim-resume', handleSimResume);
  
  // Handler 9: Stop simulated capture
  ipcMain.handle('sim-stop', handleSimStop);
  
  // Handler 10: Get capture status
  ipcMain.handle('sim-status', handleSimStatus);
  
  // Handler 11: Set playback speed
  ipcMain.handle('sim-set-speed', handleSimSetSpeed);
  
  console.log('✅ IPC handlers registered');
}

/**
 * Handler: Open file dialog
 * Allows user to select a PCAP file
 * 
 * Returns: filepath or null if cancelled
 */
async function handleOpenDialog() {
  console.log('📂 Opening file dialog...');
  
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select PCAP File',
      
      // File type filters
      filters: [
        { name: 'PCAP Files', extensions: ['pcap', 'pcapng'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      
      properties: [
        'openFile',           // Single file selection
        'showHiddenFiles'     // Show hidden files
      ],
      
      // Default to user's documents folder
      defaultPath: app.getPath('documents')
    });
    
    // User cancelled
    if (result.canceled) {
      console.log('❌ File dialog cancelled');
      return null;
    }
    
    const filepath = result.filePaths[0];
    console.log('✅ File selected:', filepath);
    
    return filepath;
    
  } catch (error) {
    console.error('❌ Error opening file dialog:', error);
    throw error;
  }
}

/**
 * Handler: Parse PCAP file
 * Reads and processes entire PCAP file
 * 
 * @param {Event} event - IPC event
 * @param {string} filepath - Path to PCAP file
 * Returns: { packets, statistics, fileInfo }
 */
async function handleParsePcap(event, filepath) {
  console.log('📦 Starting PCAP parsing:', filepath);
  
  try {
    // Step 1: Validate input
    if (!filepath || typeof filepath !== 'string') {
      throw new Error('Invalid filepath');
    }
    
    // Step 2: Validate file exists and is valid PCAP
    if (!fs.existsSync(filepath)) {
      throw new Error('File not found');
    }
    
    if (!validatePcapFile(filepath)) {
      throw new Error('Invalid PCAP file format');
    }
    
    console.log('✅ File validation passed');
    
    // Step 3: Read PCAP file
    const startTime = Date.now();
    
    // Progress callback - sends updates to renderer
    const progressCallback = (progress) => {
      // Send progress update to renderer
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('parse-progress', progress);
      }
    };
    
    const pcapData = await readPcapFile(filepath, progressCallback);
    
    console.log(`✅ PCAP file read: ${pcapData.packets.length} packets`);
    
    // Step 4: Process packets through protocol parsers
    console.log('🔍 Processing packets...');
    
    const processedPackets = processPackets(pcapData.packets, progressCallback);
    
    console.log(`✅ Packets processed`);
    
    // Step 5: Calculate statistics
    console.log('📊 Calculating statistics...');
    
    const statistics = calculateStatistics(processedPackets);
    
    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`✅ Processing complete in ${processingTime}s`);
    
    // Step 6: Return results
    return {
      success: true,
      packets: processedPackets,
      statistics: statistics,
      fileInfo: {
        filename: pcapData.filename,
        fileSize: pcapData.fileSize,
        globalHeader: pcapData.globalHeader,
        processingTime: parseFloat(processingTime)
      }
    };
    
  } catch (error) {
    console.error('❌ Error parsing PCAP:', error);
    
    // Return error to renderer
    return {
      success: false,
      error: error.message,
      stack: isDevelopment() ? error.stack : undefined
    };
  }
}

/**
 * Handler: Get PCAP file info
 * Quick metadata without parsing all packets
 * 
 * @param {Event} event - IPC event
 * @param {string} filepath - Path to PCAP file
 * Returns: File metadata
 */
async function handleGetInfo(event, filepath) {
  console.log('ℹ️  Getting file info:', filepath);
  
  try {
    if (!filepath || typeof filepath !== 'string') {
      throw new Error('Invalid filepath');
    }
    
    const info = getPcapInfo(filepath);
    
    console.log('✅ File info retrieved');
    
    return {
      success: true,
      info: info
    };
    
  } catch (error) {
    console.error('❌ Error getting file info:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handler: Validate PCAP file
 * Quick check if file is valid PCAP
 * 
 * @param {Event} event - IPC event
 * @param {string} filepath - Path to PCAP file
 * Returns: { valid: boolean, error?: string }
 */
async function handleValidate(event, filepath) {
  console.log('✔️  Validating file:', filepath);
  
  try {
    if (!filepath || typeof filepath !== 'string') {
      return { valid: false, error: 'Invalid filepath' };
    }
    
    if (!fs.existsSync(filepath)) {
      return { valid: false, error: 'File not found' };
    }
    
    const isValid = validatePcapFile(filepath);
    
    return {
      valid: isValid,
      error: isValid ? null : 'Invalid PCAP format'
    };
    
  } catch (error) {
    console.error('❌ Error validating file:', error);
    
    return {
      valid: false,
      error: error.message
    };
  }
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error);
  
  // Show error dialog in production
  if (!isDevelopment() && mainWindow) {
    dialog.showErrorBox(
      'NetVis Error',
      `An unexpected error occurred:\n\n${error.message}`
    );
  }
});

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled rejection:', reason);
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Send message to renderer (if window exists)
 * 
 * @param {string} channel - IPC channel
 * @param {any} data - Data to send
 */
function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

/**
 * Log system information
 */
function logSystemInfo() {
  console.log('\n📋 System Information:');
  console.log('  Platform:', process.platform);
  console.log('  Arch:', process.arch);
  console.log('  Node:', process.version);
  console.log('  Electron:', process.versions.electron);
  console.log('  Chrome:', process.versions.chrome);
  console.log('  V8:', process.versions.v8);
  console.log('');
}

// Log system info on startup
logSystemInfo();

// Export for testing
export {
  createWindow,
  isDevelopment
};

// ============================================================================
// SIMULATED CAPTURE HANDLERS
// ============================================================================

/**
 * Handler: Load file for simulated capture
 */
async function handleSimLoadFile(event, filepath) {
  console.log('📂 Loading file for simulated capture:', filepath);
  
  try {
    // Create new capture instance
    if (!simulatedCapture) {
      simulatedCapture = createSimulatedCapture();
    } else {
      simulatedCapture.reset();
    }
    
    const result = await simulatedCapture.loadFile(filepath);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error loading file:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handler: Start simulated capture
 */
async function handleSimStart(event, options) {
  console.log('▶️  Starting simulated capture with options:', options);
  
  try {
    if (!simulatedCapture) {
      throw new Error('No file loaded. Call sim-load-file first.');
    }
    
    // Callback for new packets
    const packetCallback = (packet) => {
      // Send packet to renderer
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('sim-packet', packet);
      }
    };
    
    // Callback for statistics
    const statsCallback = (stats) => {
      // Send stats to renderer
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('sim-stats', stats);
      }
    };
    
    simulatedCapture.start(packetCallback, statsCallback, options);
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error starting capture:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handler: Pause simulated capture
 */
async function handleSimPause(event) {
  console.log('⏸️  Pausing capture');
  
  try {
    if (simulatedCapture) {
      simulatedCapture.pause();
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Handler: Resume simulated capture
 */
async function handleSimResume(event) {
  console.log('▶️  Resuming capture');
  
  try {
    if (simulatedCapture) {
      simulatedCapture.resume();
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Handler: Stop simulated capture
 */
async function handleSimStop(event) {
  console.log('⏹️  Stopping capture');
  
  try {
    if (simulatedCapture) {
      simulatedCapture.stop();
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Handler: Get capture status
 */
async function handleSimStatus(event) {
  try {
    if (!simulatedCapture) {
      return {
        success: true,
        status: {
          isCapturing: false,
          isPaused: false,
          currentIndex: 0,
          totalPackets: 0,
          processedPackets: 0,
          progress: 0
        }
      };
    }
    
    return {
      success: true,
      status: simulatedCapture.getStatus()
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Handler: Set playback speed
 */
async function handleSimSetSpeed(event, speed) {
  console.log('⚙️  Setting playback speed:', speed);
  
  try {
    if (simulatedCapture) {
      simulatedCapture.setSpeed(speed);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
