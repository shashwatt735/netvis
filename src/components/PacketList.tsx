/**
 * PacketList.tsx - Displays packets in a table
 *
 * Optimized version:
 * - Clean mapping and memoized rows
 * - Graceful handling of missing fields
 * - Ready for virtualization if needed
 */

import React, { memo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Box,
} from "@mui/material";
import { Packet } from "../types/packet.types";

interface PacketListProps {
  packets: Packet[];
  selectedPacket: Packet | null;
  onPacketSelect: (packet: Packet) => void;
}

// Protocol color mapping (graceful fallback)
const protocolColors: Record<string, string> = {
  TCP: "#2196f3",
  UDP: "#4caf50",
  ICMP: "#ff9800",
  ARP: "#9c27b0",
  DNS: "#00bcd4",
  HTTP: "#f44336",
  TLS: "#e91e63",
  HTTPS: "#e91e63",
  OTHER: "#757575",
  UNKNOWN: "#616161",
};

const PacketList: React.FC<PacketListProps> = memo(
  ({ packets, selectedPacket, onPacketSelect }) => {
    return (
      <TableContainer component={Paper} sx={{ height: "100%" }}>
        <Table stickyHeader size="small" aria-label="packet list table">
          {/* ===== TABLE HEADER ===== */}
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold", width: 80 }}>No.</TableCell>
              <TableCell sx={{ fontWeight: "bold", width: 140 }}>Time</TableCell>
              <TableCell sx={{ fontWeight: "bold", width: 160 }}>Source</TableCell>
              <TableCell sx={{ fontWeight: "bold", width: 160 }}>Destination</TableCell>
              <TableCell sx={{ fontWeight: "bold", width: 110 }}>Protocol</TableCell>
              <TableCell sx={{ fontWeight: "bold", width: 90 }}>Length</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Info</TableCell>
            </TableRow>
          </TableHead>

          {/* ===== TABLE BODY ===== */}
          <TableBody>
            {packets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ color: "text.secondary" }}>
                  No packets to display.
                </TableCell>
              </TableRow>
            ) : (
              packets.map((packet) => {
                const isSelected = selectedPacket?.frameNumber === packet.frameNumber;
                const proto =
                  packet.protocol?.toUpperCase?.() || "UNKNOWN";
                const color = protocolColors[proto] || protocolColors.UNKNOWN;

                return (
                  <TableRow
                    key={packet.frameNumber}
                    hover
                    selected={isSelected}
                    onClick={() => onPacketSelect(packet)}
                    sx={{
                      cursor: "pointer",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.05)" },
                      ...(isSelected && {
                        bgcolor: "rgba(63,81,181,0.15)",
                      }),
                    }}
                  >
                    <TableCell>
                      <Box sx={{ fontFamily: "monospace", color: "text.secondary" }}>
                        {packet.frameNumber ?? "-"}
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                        {packet.timestamp
                          ? new Date(packet.timestamp).toLocaleTimeString()
                          : "-"}
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box
                        sx={{
                          fontFamily: "monospace",
                          fontSize: "0.85rem",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {packet.src || "-"}
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box
                        sx={{
                          fontFamily: "monospace",
                          fontSize: "0.85rem",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {packet.dst || "-"}
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={proto}
                        size="small"
                        sx={{
                          bgcolor: color,
                          color: "white",
                          fontWeight: "bold",
                          fontSize: "0.75rem",
                          height: 22,
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <Box sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                        {packet.length ?? "-"}
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box
                        sx={{
                          fontSize: "0.85rem",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: "text.secondary",
                        }}
                      >
                        {packet.protocolType || packet.info || ""}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }
);

PacketList.displayName = "PacketList";

export default PacketList;
