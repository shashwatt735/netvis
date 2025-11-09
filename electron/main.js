import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { readPcapFile } from "./pcap/pcapReader.js";
import fs from "fs";

// Create __dirname since ESM doesn't provide it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
/**
 * Create the main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    title: "NetVis - Network Packet Visualizer",
    backgroundColor: "#1a1a1a",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, "preload.js"),
    },
    frame: true,
    titleBarStyle: "default",
    icon: path.join(__dirname, "../assets/icon.png"),
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    // Development: load from Vite dev server
    mainWindow.loadURL("http://localhost:5173").catch((err) => {
      console.error("Failed to load Dev server:", err);
      console.log("Ensure Vite dev server is running on port 5173");
    });
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load built files
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.on("did-finish-load", () => {
    console.log("NetVis window loaded");
  });
}

app.whenReady().then(() => {
  createWindow();
  // macOS: re-create window when dock icon is clicked
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// === IPC Handlers ===

// Open file dialog and load PCAP
ipcMain.handle("open-pcap-dialog", async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: "Select PCAP File",
      filters: [
        { name: "PCAP Files", extensions: ["pcap", "pcapng", "cap"] },
        { name: "All Files", extensions: ["*"] },
      ],
      properties: ["openFile"],
    });

    if (canceled || !filePaths.length) {
      return { success: false, cancelled: true };
    }

    const filepath = filePaths[0];
    console.log(`Loading PCAP file: ${filepath}`);
    const packets = await readPcapFile(filepath, (progress) => {
      mainWindow.webContents.send("loading-progress", progress);
    });

    console.log(`Loaded ${packets.length} packets`);
    return { success: true, filepath, packets, packetCount: packets.length };
  } catch (error) {
    console.error("Error loading PCAP:", error);
    return { success: false, error: error.message };
  }
});

// Get network interfaces (placeholder for live capture)
ipcMain.handle("get-network-interfaces", async () => {
  return { success: true, interfaces: [] };
});

// Start live capture (placeholder)
ipcMain.handle("start-capture", async (_event, interfaceName) => {
  console.log(`Live capture requested for: ${interfaceName}`);
  return { success: false, error: "Live capture not yet implemented" };
});

// Stop capture (placeholder)
ipcMain.handle("stop-capture", async () => {
  console.log("Stop capture requested");
  return { success: true };
});

// === Global Error Handling ===
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

// Log app versions
console.log(
  `NetVis v${app.getVersion()} - Electron ${process.versions.electron}`,
);
console.log(
  `Node ${process.versions.node} - Chrome ${process.versions.chrome}`,
);
