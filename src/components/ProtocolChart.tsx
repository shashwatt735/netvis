/**
 * ProtocolChart.tsx - Visual Protocol Distribution
 *
 * Enhanced for:
 * - Broader protocol coverage (TLS, UNKNOWN, etc.)
 * - Resilient data aggregation and labeling
 * - Clearer, more consistent dark theme visuals
 */

import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Box, Typography } from "@mui/material";
import { Packet } from "../types/packet.types";

interface ProtocolChartProps {
  packets: Packet[];
}

// Consistent protocol colors
const COLORS: Record<string, string> = {
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

const ProtocolChart: React.FC<ProtocolChartProps> = React.memo(({ packets }) => {
  // ===== Data aggregation =====
  const chartData = useMemo(() => {
    if (!packets || packets.length === 0) return [];

    const protocolCounts: Record<string, number> = {};
    const protocolBytes: Record<string, number> = {};

    for (const pkt of packets) {
      const proto = pkt.protocolType || pkt.protocol || "UNKNOWN";
      protocolCounts[proto] = (protocolCounts[proto] || 0) + 1;
      protocolBytes[proto] = (protocolBytes[proto] || 0) + (pkt.length || 0);
    }

    return Object.entries(protocolCounts)
      .map(([protocol, count]) => ({
        name: protocol,
        value: count,
        percentage: ((count / packets.length) * 100).toFixed(1),
        bytes: protocolBytes[protocol],
      }))
      .sort((a, b) => b.value - a.value);
  }, [packets]);

  // ===== Custom label =====
  const renderLabel = (entry: any) => `${entry.name} (${entry.percentage}%)`;

  // ===== Tooltip component =====
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    return (
      <Box
        sx={{
          bgcolor: "background.paper",
          p: 1.5,
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 1,
          boxShadow: 2,
          minWidth: 160,
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
          {data.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Packets: {data.value} ({data.percentage}%)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Bytes: {(data.bytes / 1024).toFixed(2)} KB
        </Typography>
      </Box>
    );
  };

  if (chartData.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
        <Typography variant="body2">No packet data available.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            outerRadius={90}
            labelLine={false}
            label={renderLabel}
            dataKey="value"
          >
            {chartData.map((entry, idx) => (
              <Cell
                key={`cell-${entry.name}-${idx}`}
                fill={COLORS[entry.name] || COLORS.UNKNOWN}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      {/* ===== Protocol Summary ===== */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Protocol Summary
        </Typography>
        {chartData.map((entry) => (
          <Box
            key={entry.name}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              py: 0.5,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  bgcolor: COLORS[entry.name] || COLORS.UNKNOWN,
                  borderRadius: "50%",
                }}
              />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {entry.name}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {entry.value} pkts ({entry.percentage}%)
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
});

ProtocolChart.displayName = "ProtocolChart";

export default ProtocolChart;
