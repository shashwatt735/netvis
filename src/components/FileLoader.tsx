/**
 * FileLoader.tsx - Handles PCAP file selection and loading
 *
 * This component encapsulates file dialog handling and progress tracking.
 * It communicates with Electron's preload bridge via `window.electron.openPcapDialog()`.
 */

import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  Alert,
  LinearProgress,
} from "@mui/material";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";

interface FileLoaderProps {
  onFileLoaded?: (result: any) => void;
  disabled?: boolean;
  loading?: boolean;
}

const FileLoader: React.FC<FileLoaderProps> = ({
  onFileLoaded,
  disabled = false,
  loading: externalLoading = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number; packets?: number }>({
    current: 0,
    total: 0,
  });

  // Sync external loading state (optional)
  useEffect(() => {
    setLoading(externalLoading);
  }, [externalLoading]);

  // Subscribe to progress updates
  useEffect(() => {
    if (!window.electron?.onLoadingProgress) return;

    const unsubscribe = window.electron.onLoadingProgress((p) => {
      setProgress((prev) => ({
        current: p.current ?? prev.current,
        total: p.total ?? prev.total,
        packets: p.packets ?? prev.packets,
      }));
    });

    return () => {
      try {
        unsubscribe?.();
      } catch {
        /* ignore cleanup errors */
      }
    };
  }, []);

  // Load PCAP via Electron bridge
  const handleLoad = async () => {
    if (!window.electron?.openPcapDialog) {
      setError("Electron API not available.");
      return;
    }

    try {
      setError(null);
      setLoading(true);
      setProgress({ current: 0, total: 0 });

      const result = await window.electron.openPcapDialog();

      if (!result || result.cancelled) {
        setLoading(false);
        return;
      }

      if (!result.success) {
        throw new Error(result.error || "Failed to load PCAP file.");
      }

      if (onFileLoaded) {
        onFileLoaded(result);
      }
    } catch (err: any) {
      console.error("Error loading PCAP:", err);
      setError(err?.message ?? "Unknown error during file load.");
    } finally {
      setLoading(false);
    }
  };

  const percent =
    progress.total > 0
      ? ((progress.current / progress.total) * 100).toFixed(1)
      : undefined;

  return (
    <Box
      sx={{
        p: 3,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        bgcolor: "background.paper",
        borderRadius: 2,
        boxShadow: 1,
      }}
    >
      <Button
        variant="contained"
        color="secondary"
        startIcon={<FolderOpenIcon />}
        onClick={handleLoad}
        disabled={disabled || loading}
        size="large"
      >
        {loading ? "Loading..." : "Load PCAP File"}
      </Button>

      {loading && (
        <Box sx={{ width: "100%", mt: 2 }}>
          <LinearProgress
            variant={percent ? "determinate" : "indeterminate"}
            value={percent ? parseFloat(percent) : undefined}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: "center" }}>
            {percent ? `${percent}% loaded (${progress.packets ?? 0} packets)` : "Loading packets..."}
          </Typography>
        </Box>
      )}

      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ width: "100%", mt: 2 }}
        >
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <Typography variant="body2" color="text.secondary">
          Choose a PCAP file to analyze.
        </Typography>
      )}
    </Box>
  );
};

export default FileLoader;
