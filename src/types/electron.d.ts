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
  }

  interface Window {
    /** Secure API exposed by the Electron preload script. */
    electron: ElectronAPI;
  }
}