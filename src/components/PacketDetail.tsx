/**
 * PacketDetail.tsx - Detailed packet information view
 *
 * Shows the protocol layers in a hierarchical, expandable tree.
 * This mimics Wireshark's packet detail pane but simplified for learning.
 *
 * Structure:
 * Frame
 * ├── Ethernet II
 * │   ├── Destination: ...
 * │   ├── Source: ...
 * │   └── Type: ...
 * ├── Internet Protocol
 * │   ├── Version: ...
 * │   ├── Source: ...
 * │   └── ...
 * └── TCP/UDP/ICMP
 *     └── ...
 */

import React, { useState, useCallback, memo } from "react";
import {
  Box,
  Typography,
  Chip,
} from "@mui/material";
import { TreeView, TreeItem } from "@mui/lab";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Packet } from "../types/packet.types";

// ===== Helper component for field rendering =====
const Field = memo(({ label, value }: { label: string; value: string | number }) => (
  <Box sx={{ display: "flex", py: 0.5 }}>
    <Typography
      variant="body2"
      sx={{ minWidth: "200px", fontWeight: 500, color: "text.secondary" }}
    >
      {label}:
    </Typography>
    <Typography
      variant="body2"
      sx={{ fontFamily: "monospace", color: "primary.main" }}
    >
      {value ?? "—"}
    </Typography>
  </Box>
));

Field.displayName = "Field";

interface PacketDetailProps {
  packet: Packet;
}

const PacketDetail: React.FC<PacketDetailProps> = ({ packet }) => {
  const [expanded, setExpanded] = useState<string[]>([
    "frame",
    "ethernet",
    "ip",
    "tcp",
    "udp",
    "icmp",
    "arp",
  ]);

  const handleToggle = useCallback(
    (_event: React.SyntheticEvent, nodeIds: string[]) => {
      setExpanded(nodeIds);
    },
    []
  );

  if (!packet) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6">No packet selected</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Packet Details #{packet.frameNumber ?? "?"}
      </Typography>

      <TreeView
        defaultCollapseIcon={<ExpandMoreIcon />}
        defaultExpandIcon={<ChevronRightIcon />}
        expanded={expanded}
        onNodeToggle={handleToggle}
        sx={{ flexGrow: 1, maxWidth: 400 }}
      >
        {/* ===== FRAME INFORMATION ===== */}
        <TreeItem nodeId="frame" label={`📦 Frame ${packet.frameNumber ?? "?"}`}>
          <TreeItem nodeId="frame-number" label={`Frame Number: ${packet.frameNumber ?? "—"}`} />
          <TreeItem nodeId="frame-timestamp" label={`Timestamp: ${packet.timestampString ?? "—"}`} />
          <TreeItem nodeId="frame-length" label={`Length: ${packet.length ?? 0} bytes`} />
          <TreeItem nodeId="frame-protocol" label={`Protocol: ${packet.protocol ?? "Unknown"}`} />
        </TreeItem>

        {/* ===== ETHERNET LAYER ===== */}
        {packet.layers?.ethernet && (
          <TreeItem nodeId="ethernet" label="🔗 Ethernet II">
            <TreeItem nodeId="eth-dest-mac" label={`Destination MAC: ${packet.layers.ethernet.destinationMAC ?? "—"}`} />
            <TreeItem nodeId="eth-src-mac" label={`Source MAC: ${packet.layers.ethernet.sourceMAC ?? "—"}`} />
            <TreeItem nodeId="eth-type" label={`Type: ${packet.layers.ethernet.etherTypeName ?? "—"}`} />
            <TreeItem nodeId="eth-ethertype" label={`EtherType Value: ${packet.layers.ethernet.etherType ? `0x${packet.layers.ethernet.etherType.toString(16).toUpperCase()}` : "—"}`} />
          </TreeItem>
        )}

        {/* ===== IP LAYER ===== */}
        {packet.layers?.ip && (
          <TreeItem nodeId="ip" label={`🌐 Internet Protocol v${packet.layers.ip.version ?? "?"}`}>
            <TreeItem nodeId="ip-version" label={`Version: ${packet.layers.ip.version ?? "—"}`} />
            <TreeItem nodeId="ip-header-len" label={`Header Length: ${packet.layers.ip.headerLength ?? 0} bytes`} />
            <TreeItem nodeId="ip-src-ip" label={`Source IP: ${packet.layers.ip.sourceIP ?? "—"}`} />
            <TreeItem nodeId="ip-dest-ip" label={`Destination IP: ${packet.layers.ip.destinationIP ?? "—"}`} />
            <TreeItem nodeId="ip-protocol" label={`Protocol: ${packet.layers.ip.protocolName ?? "—"}`} />
            <TreeItem nodeId="ip-ttl" label={`TTL: ${packet.layers.ip.ttl ?? "—"}`} />
            <TreeItem nodeId="ip-total-len" label={`Total Length: ${packet.layers.ip.length ?? 0} bytes`} />
            <TreeItem nodeId="ip-identification" label={`Identification: ${packet.layers.ip.identification ?? "—"}`} />
          </TreeItem>
        )}

        {/* ===== TCP LAYER ===== */}
        {packet.layers?.tcp && (
          <TreeItem nodeId="tcp" label="🚀 Transmission Control Protocol (TCP)">
            <TreeItem nodeId="tcp-src-port" label={`Source Port: ${packet.layers.tcp.sourcePort ?? "—"}`} />
            <TreeItem nodeId="tcp-dest-port" label={`Destination Port: ${packet.layers.tcp.destinationPort ?? "—"}`} />
            <TreeItem nodeId="tcp-seq-num" label={`Sequence Number: ${packet.layers.tcp.sequenceNumber ?? "—"}`} />
            <TreeItem nodeId="tcp-ack-num" label={`Acknowledgment: ${packet.layers.tcp.acknowledgmentNumber ?? "—"}`} />
            <TreeItem nodeId="tcp-window-size" label={`Window Size: ${packet.layers.tcp.windowSize ?? "—"}`} />
            {/* TCP Flags */}
            {packet.layers.tcp.flags && (
              <TreeItem nodeId="tcp-flags" label="Flags">
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", ml: 2 }}>
                  {Object.entries(packet.layers.tcp.flags ?? {}).map(([flag, value]) => (
                    <Chip
                      key={flag}
                      label={flag.toUpperCase()}
                      size="small"
                      color={value ? "primary" : "default"}
                      variant={value ? "filled" : "outlined"}
                    />
                  ))}
                </Box>
              </TreeItem>
            )}
          </TreeItem>
        )}

        {/* ===== UDP LAYER ===== */}
        {packet.layers?.udp && (
          <TreeItem nodeId="udp" label="📡 User Datagram Protocol (UDP)">
            <TreeItem nodeId="udp-src-port" label={`Source Port: ${packet.layers.udp.sourcePort ?? "—"}`} />
            <TreeItem nodeId="udp-dest-port" label={`Destination Port: ${packet.layers.udp.destinationPort ?? "—"}`} />
            <TreeItem nodeId="udp-length" label={`Length: ${packet.layers.udp.length ?? 0} bytes`} />
            <TreeItem nodeId="udp-checksum" label={`Checksum: ${packet.layers.udp.checksum ? `0x${packet.layers.udp.checksum.toString(16).toUpperCase()}` : "—"}`} />
          </TreeItem>
        )}

        {/* ===== ICMP LAYER ===== */}
        {packet.layers?.icmp && (
          <TreeItem nodeId="icmp" label="📨 Internet Control Message Protocol (ICMP)">
            <TreeItem nodeId="icmp-type" label={`Type: ${packet.layers.icmp.typeName ?? "—"}`} />
            <TreeItem nodeId="icmp-type-code" label={`Type Code: ${packet.layers.icmp.type ?? "—"}`} />
            <TreeItem nodeId="icmp-code" label={`Code: ${packet.layers.icmp.code ?? "—"}`} />
            <TreeItem nodeId="icmp-checksum" label={`Checksum: ${packet.layers.icmp.checksum ? `0x${packet.layers.icmp.checksum.toString(16).toUpperCase()}` : "—"}`} />
          </TreeItem>
        )}

        {/* ===== ARP LAYER ===== */}
        {packet.layers?.arp && (
          <TreeItem nodeId="arp" label="🔍 Address Resolution Protocol (ARP)">
            <TreeItem nodeId="arp-operation" label={`Operation: ${packet.layers.arp.operationName ?? "—"}`} />
            <TreeItem nodeId="arp-sender-mac" label={`Sender MAC: ${packet.layers.arp.senderMAC ?? "—"}`} />
            <TreeItem nodeId="arp-sender-ip" label={`Sender IP: ${packet.layers.arp.senderIP ?? "—"}`} />
            <TreeItem nodeId="arp-target-mac" label={`Target MAC: ${packet.layers.arp.targetMAC ?? "—"}`} />
            <TreeItem nodeId="arp-target-ip" label={`Target IP: ${packet.layers.arp.targetIP ?? "—"}`} />
          </TreeItem>
        )}
      </TreeView>
    </Box>
  );
};

export default PacketDetail;