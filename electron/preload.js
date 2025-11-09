const { contextBridge, ipcRenderer } = require("electron");

/**
 * Securely expose limited Electron API to the renderer.
 * This bridge ensures that renderer code cannot access Node.js directly.
 */
contextBridge.exposeInMainWorld("electron", {
  /**
   * PCAP File Operations
   */
  openPcapDialog: async () => ipcRenderer.invoke("open-pcap-dialog"),

  /**
   * Network Interface Operations (for live capture - placeholder)
   */
  getNetworkInterfaces: async () =>
    ipcRenderer.invoke("get-network-interfaces"),
  startCapture: async (interfaceName) =>
    ipcRenderer.invoke("start-capture", interfaceName),
  stopCapture: async () => ipcRenderer.invoke("stop-capture"),

  /**
   * Event Listeners for real-time updates
   */
  onLoadingProgress: (callback) => {
    const subscription = (_event, progress) => callback(progress);
    ipcRenderer.on("loading-progress", subscription);
    return () => ipcRenderer.removeListener("loading-progress", subscription);
  },

  onPacketCaptured: (callback) => {
    const subscription = (_event, packet) => callback(packet);
    ipcRenderer.on("packet-captured", subscription);
    return () => ipcRenderer.removeListener("packet-captured", subscription);
  },

  /**
   * Application Info Helpers
   */
  getAppVersion: () => process.versions.electron,
  isDevelopment: () => process.env.NODE_ENV === "development",
});

console.log("Preload script initialized – secure IPC bridge ready");
