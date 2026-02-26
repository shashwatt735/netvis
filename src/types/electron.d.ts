// src/types/electron.d.ts
// ---------------------------------------------------------------------
// Global TypeScript declarations for the Electron preload bridge.
// This file lets the renderer (React) know that window.electron exists.
// ---------------------------------------------------------------------
import { Packet, CaptureSession, IPCResponse } from "./packet.types";

export {};

declare global {
  interface ElectronAPI {
    /** Open a file dialog to select a PCAP file. Returns its path. */
    openPcapDialog: () => Promise<string>;

    /** Parse a PCAP file and return packets */
    parsePcapFile: (filepath: string) => Promise<{
      success: boolean;
      packets?: Packet[];
      statistics?: any;
      fileInfo?: any;
      error?: string;
    }>;

    /** Get PCAP file info */
    getPcapInfo: (filepath: string) => Promise<{
      success: boolean;
      info?: any;
      error?: string;
    }>;

    /** Validate PCAP file */
    validatePcap: (filepath: string) => Promise<{
      valid: boolean;
      error?: string;
    }>;

    /** Get a list of network interfaces available for capture. */
    getNetworkInterfaces: () => Promise<
      { name: string; address: string; mac?: string }[]
    >;

    /** Begin capturing packets on a given interface name. */
    startCapture: (interfaceName: string) => Promise<void>;

    /** Stop the currently running capture session. */
    stopCapture: () => Promise<void>;

    /** Subscribe to progress updates during a long operation (e.g. file load). */
    onLoadingProgress: (callback: (progress: number) => void) => () => void;

    /** Subscribe to live-captured or parsed packets. */
    onPacketCaptured: (callback: (packet: import("./packet.types").Packet) => void) => () => void;

    /** Return current Electron runtime version. */
    getAppVersion: () => string;

    /** Return true if running in development mode. */
    isDevelopment: () => boolean;

    // ========== SIMULATED CAPTURE FUNCTIONS ==========

    /** Load file for simulated capture */
    simLoadFile: (filepath: string) => Promise<{
      success: boolean;
      packetCount?: number;
      filename?: string;
      error?: string;
    }>;

    /** Start simulated capture */
    simStart: (options?: { mode?: string; speed?: number }) => Promise<{
      success: boolean;
      error?: string;
    }>;

    /** Pause simulated capture */
    simPause: () => Promise<{ success: boolean; error?: string }>;

    /** Resume simulated capture */
    simResume: () => Promise<{ success: boolean; error?: string }>;

    /** Stop simulated capture */
    simStop: () => Promise<{ success: boolean; error?: string }>;

    /** Get simulated capture status */
    simStatus: () => Promise<{
      success: boolean;
      status?: {
        isCapturing: boolean;
        isPaused: boolean;
        currentIndex: number;
        totalPackets: number;
        processedPackets: number;
        progress: number;
      };
      error?: string;
    }>;

    /** Set simulated capture speed */
    simSetSpeed: (speed: number) => Promise<{ success: boolean; error?: string }>;

    /** Listen for new packets during simulated capture */
    onSimPacket: (callback: (packet: Packet) => void) => () => void;

    /** Listen for statistics updates during simulated capture */
    onSimStats: (callback: (stats: {
      isCapturing: boolean;
      isPaused: boolean;
      currentIndex: number;
      totalPackets: number;
      progress: number;
    }) => void) => () => void;

    /** Listen for parse progress updates */
    onParseProgress: (callback: (progress: { current: number; total: number; packets: number }) => void) => () => void;

    /** Get platform information */
    getPlatform: () => string;
  }

  interface Window {
    /** Secure API exposed by the Electron preload script. */
    electron: ElectronAPI;
  }
}
