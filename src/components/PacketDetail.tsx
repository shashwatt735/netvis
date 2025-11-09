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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Packet } from "../types/packet.types";

// ===== Helper component for consistent field rendering =====
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

  const handleAccordionChange = useCallback(
    (panel: string) => {
      setExpanded((prev) =>
        prev.includes(panel) ? prev.filter((p) => p !== panel) : [...prev, panel]
      );
    },
    [setExpanded]
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

      {/* ===== FRAME INFORMATION ===== */}
      <Accordion
        expanded={expanded.includes("frame")}
        onChange={() => handleAccordionChange("frame")}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
            📦 Frame {packet.frameNumber ?? "?"}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Field label="Frame Number" value={packet.frameNumber ?? "—"} />
          <Field label="Timestamp" value={packet.timestampString ?? "—"} />
          <Field label="Length" value={`${packet.length ?? 0} bytes`} />
          <Field label="Protocol" value={packet.protocol ?? "Unknown"} />
        </AccordionDetails>
      </Accordion>

      {/* ===== ETHERNET LAYER ===== */}
      {packet.layers?.ethernet && (
        <Accordion
          expanded={expanded.includes("ethernet")}
          onChange={() => handleAccordionChange("ethernet")}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
              🔗 Ethernet II
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Field label="Destination MAC" value={packet.layers.ethernet.destinationMAC ?? "—"} />
            <Field label="Source MAC" value={packet.layers.ethernet.sourceMAC ?? "—"} />
            <Field label="Type" value={packet.layers.ethernet.etherTypeName ?? "—"} />
            <Field
              label="EtherType Value"
              value={
                packet.layers.ethernet.etherType
                  ? `0x${packet.layers.ethernet.etherType.toString(16).toUpperCase()}`
                  : "—"
              }
            />
          </AccordionDetails>
        </Accordion>
      )}

      {/* ===== IP LAYER ===== */}
      {packet.layers?.ip && (
        <Accordion
          expanded={expanded.includes("ip")}
          onChange={() => handleAccordionChange("ip")}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
              🌐 Internet Protocol v{packet.layers.ip.version ?? "?"}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Field label="Version" value={packet.layers.ip.version ?? "—"} />
            <Field
              label="Header Length"
              value={`${packet.layers.ip.headerLength ?? 0} bytes`}
            />
            <Field label="Source IP" value={packet.layers.ip.sourceIP ?? "—"} />
            <Field label="Destination IP" value={packet.layers.ip.destinationIP ?? "—"} />
            <Field label="Protocol" value={packet.layers.ip.protocolName ?? "—"} />
            <Field label="TTL" value={packet.layers.ip.ttl ?? "—"} />
            <Field label="Total Length" value={`${packet.layers.ip.length ?? 0} bytes`} />
            <Field label="Identification" value={packet.layers.ip.identification ?? "—"} />
          </AccordionDetails>
        </Accordion>
      )}

      {/* ===== TCP LAYER ===== */}
      {packet.layers?.tcp && (
        <Accordion
          expanded={expanded.includes("tcp")}
          onChange={() => handleAccordionChange("tcp")}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
              🚀 Transmission Control Protocol (TCP)
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Field label="Source Port" value={packet.layers.tcp.sourcePort ?? "—"} />
            <Field label="Destination Port" value={packet.layers.tcp.destinationPort ?? "—"} />
            <Field label="Sequence Number" value={packet.layers.tcp.sequenceNumber ?? "—"} />
            <Field label="Acknowledgment" value={packet.layers.tcp.acknowledgmentNumber ?? "—"} />
            <Field label="Window Size" value={packet.layers.tcp.windowSize ?? "—"} />

            {/* TCP Flags */}
            {packet.layers.tcp.flags && (
              <Box sx={{ py: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                  Flags:
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
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
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      )}

      {/* ===== UDP LAYER ===== */}
      {packet.layers?.udp && (
        <Accordion
          expanded={expanded.includes("udp")}
          onChange={() => handleAccordionChange("udp")}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
              📡 User Datagram Protocol (UDP)
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Field label="Source Port" value={packet.layers.udp.sourcePort ?? "—"} />
            <Field label="Destination Port" value={packet.layers.udp.destinationPort ?? "—"} />
            <Field label="Length" value={`${packet.layers.udp.length ?? 0} bytes`} />
            <Field
              label="Checksum"
              value={
                packet.layers.udp.checksum
                  ? `0x${packet.layers.udp.checksum.toString(16).toUpperCase()}`
                  : "—"
              }
            />
          </AccordionDetails>
        </Accordion>
      )}

      {/* ===== ICMP LAYER ===== */}
      {packet.layers?.icmp && (
        <Accordion
          expanded={expanded.includes("icmp")}
          onChange={() => handleAccordionChange("icmp")}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
              📨 Internet Control Message Protocol (ICMP)
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Field label="Type" value={packet.layers.icmp.typeName ?? "—"} />
            <Field label="Type Code" value={packet.layers.icmp.type ?? "—"} />
            <Field label="Code" value={packet.layers.icmp.code ?? "—"} />
            <Field
              label="Checksum"
              value={
                packet.layers.icmp.checksum
                  ? `0x${packet.layers.icmp.checksum.toString(16).toUpperCase()}`
                  : "—"
              }
            />
          </AccordionDetails>
        </Accordion>
      )}

      {/* ===== ARP LAYER ===== */}
      {packet.layers?.arp && (
        <Accordion
          expanded={expanded.includes("arp")}
          onChange={() => handleAccordionChange("arp")}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
              🔍 Address Resolution Protocol (ARP)
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Field label="Operation" value={packet.layers.arp.operationName ?? "—"} />
            <Field label="Sender MAC" value={packet.layers.arp.senderMAC ?? "—"} />
            <Field label="Sender IP" value={packet.layers.arp.senderIP ?? "—"} />
            <Field label="Target MAC" value={packet.layers.arp.targetMAC ?? "—"} />
            <Field label="Target IP" value={packet.layers.arp.targetIP ?? "—"} />
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
};

export default PacketDetail;