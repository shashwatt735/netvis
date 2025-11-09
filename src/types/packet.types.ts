/**
 * packet.types.ts
 *
 * Type definitions for all network packet data structures used across
 * the NetVis application — from Electron (backend) to React (frontend).
 */

// ============================================================
// ===============  PROTOCOL ENUMERATION  ======================
// ============================================================

export type Protocol =
  | "TCP" // Transmission Control Protocol
  | "UDP" // User Datagram Protocol
  | "ICMP" // Internet Control Message Protocol
  | "ARP" // Address Resolution Protocol
  | "DNS" // Domain Name System
  | "HTTP" // Hypertext Transfer Protocol
  | "TLS" // Transport Layer Security (HTTPS)
  | "HTTPS" // HTTPS (alias)
  | "OTHER"; // Fallback for unknown or unsupported protocols

// ============================================================
// ==================  ETHERNET LAYER  =========================
// ============================================================

export interface EthernetLayer {
  destinationMAC: string;
  sourceMAC: string;
  etherType: number; // e.g., 0x0800 = IPv4
  etherTypeName: string; // "IPv4", "ARP", etc.
  frameCheckSequence?: number; // Optional (future use)
}

// ============================================================
// ====================  IP LAYER  =============================
// ============================================================

export interface IPLayer {
  version: 4 | 6;
  headerLength: number;
  sourceIP: string;
  destinationIP: string;
  protocol: number; // 6=TCP, 17=UDP, 1=ICMP
  protocolName: string;
  ttl: number;
  length: number;
  identification: number;
  flags: number;
  fragmentOffset: number;
  checksum?: number;
}

// ============================================================
// ====================  TCP LAYER  ============================
// ============================================================

export interface TCPFlags {
  syn: boolean;
  ack: boolean;
  fin: boolean;
  rst: boolean;
  psh: boolean;
  urg: boolean;
}

export interface TCPLayer {
  sourcePort: number;
  destinationPort: number;
  sequenceNumber: number;
  acknowledgmentNumber: number;
  flags: TCPFlags;
  windowSize: number;
  checksum: number;
  urgentPointer: number;
  options?: number[];
  dataOffset?: number; // Optional, number of 32-bit words in TCP header
  reserved?: number; // Optional, reserved bits
}

// ============================================================
// ====================  UDP LAYER  ============================
// ============================================================

export interface UDPLayer {
  sourcePort: number;
  destinationPort: number;
  length: number;
  checksum: number;
}

// ============================================================
// ====================  ICMP LAYER  ===========================
// ============================================================

export interface ICMPLayer {
  type: number;
  code: number;
  checksum: number;
  identifier?: number;
  sequenceNumber?: number;
  typeName: string;
}

// ============================================================
// ====================  ARP LAYER  ============================
// ============================================================

export interface ARPLayer {
  hardwareType: number;
  protocolType: number;
  operation: number; // 1=request, 2=reply
  senderMAC: string;
  senderIP: string;
  targetMAC: string;
  targetIP: string;
  operationName: string;
}

// ============================================================
// ===============  COMBINED LAYER STRUCTURE  =================
// ============================================================

export interface PacketLayers {
  ethernet?: EthernetLayer;
  ip?: IPLayer;
  tcp?: TCPLayer;
  udp?: UDPLayer;
  icmp?: ICMPLayer;
  arp?: ARPLayer;
  // Extendable for future protocols (DNS, TLS, etc.)
  [key: string]: any;
}

// ============================================================
// ===================  PACKET STRUCTURE  ======================
// ============================================================

export interface Packet {
  frameNumber: number;
  timestamp: number;
  timestampString: string;

  // Consistent naming for source/destination (preferred)
  source: string;
  destination: string;

  // Backward-compatible aliases for parser
  src?: string;
  dst?: string;

  protocol: Protocol;          // Primary protocol (e.g., TCP)
  protocolType?: string;       // Application-level type (e.g., HTTP, TLS, DNS)
  length: number;
  info: string;
  layers: PacketLayers;

  // Raw binary data (optional, for deep analysis)
  rawData?: Buffer;
}

// ============================================================
// =================  STATISTICAL TYPES  =======================
// ============================================================

export interface ProtocolStats {
  protocol: Protocol;
  count: number;
  percentage: number;
  bytes: number;
}

// ============================================================
// ==================  CAPTURE SESSION  ========================
// ============================================================

export interface CaptureSession {
  filename?: string;
  startTime: number;
  endTime?: number;
  packetCount: number;
  totalBytes: number;
  isLive: boolean;
  interface?: string;
}

// ============================================================
// ===================  FILTER OPTIONS  ========================
// ============================================================

export interface FilterOptions {
  protocol?: Protocol;
  sourceIP?: string;
  destinationIP?: string;
  sourcePort?: number;
  destinationPort?: number;
  searchText?: string;
}

// ============================================================
// ====================  IPC MESSAGES  =========================
// ============================================================

// ---------- Frontend → Backend ----------
export type IPCRequest =
  | { type: "LOAD_PCAP"; filepath: string }
  | { type: "START_CAPTURE"; interface: string }
  | { type: "STOP_CAPTURE" }
  | { type: "GET_INTERFACES" };

// ---------- Backend → Frontend ----------
export type IPCResponse =
  | { type: "PACKET_CAPTURED"; packet: Packet }
  | { type: "CAPTURE_COMPLETE"; session: CaptureSession }
  | { type: "ERROR"; message: string }
  | { type: "INTERFACES_LIST"; interfaces: string[] }
  | { type: "LOADING_PROGRESS"; current: number; total: number };