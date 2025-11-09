import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Container,
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';

import PacketList from './components/PacketList';
import PacketDetail from './components/PacketDetail';
import ProtocolChart from './components/ProtocolChart';
import { Packet } from './types/packet.types';

/**
 * Ensure `window.electron` type safety for TS users.
 * If you're not using a global declaration file, you can add it there instead.
 */
declare global {
  interface Window {
    electron: {
      openPcapDialog: () => Promise<any>;
      onLoadingProgress: (cb: (progress: any) => void) => () => void;
    };
  }
}

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#3f51b5' },
    secondary: { main: '#f50057' },
    background: { default: '#1a1a1a', paper: '#242424' },
  },
  typography: { fontFamily: '"Roboto","Helvetica","Arial",sans-serif', fontSize: 14 },
});

const App: React.FC = () => {
  const [packets, setPackets] = useState<Packet[]>([]);
  const [selectedPacket, setSelectedPacket] = useState<Packet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<{ current: number; total: number; packets?: number }>({
    current: 0,
    total: 0,
  });

  // ===== IPC: load PCAP file =====
  const handleLoadPcap = useCallback(async () => {
    if (!window.electron || typeof window.electron.openPcapDialog !== 'function') {
      setError('Electron API not available.');
      return;
    }

    setLoading(true);
    setError(null);
    setPackets([]);
    setSelectedPacket(null);
    setFilename(null);
    setLoadingProgress({ current: 0, total: 0 });

    try {
      const result = await window.electron.openPcapDialog();

      // User cancelled
      if (!result) {
        setLoading(false);
        return;
      }
      if (result.cancelled) {
        setLoading(false);
        return;
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to load PCAP file');
      }

      // set packets & meta
      setPackets(Array.isArray(result.packets) ? result.packets : []);
      setFilename(result.filepath ?? null);

      // When new packets are loaded, auto-select the first packet (optional)
      if (Array.isArray(result.packets) && result.packets.length > 0) {
        setSelectedPacket(result.packets[0]);
      }
    } catch (err: any) {
      console.error('Error loading PCAP:', err);
      setError(err?.message ?? 'Unknown error loading PCAP');
    } finally {
      setLoading(false);
    }
  }, []);

  // ===== IPC: progress listener =====
  useEffect(() => {
    if (!window.electron || typeof window.electron.onLoadingProgress !== 'function') return;

    const cleanup = window.electron.onLoadingProgress((progress) => {
      // Defensive merging/structure handling
      setLoadingProgress((prev) => ({
        current: progress?.current ?? prev.current,
        total: progress?.total ?? prev.total,
        packets: progress?.packets ?? prev.packets,
      }));
    });

    return () => {
      try {
        cleanup && cleanup();
      } catch (e) {
        // ignore cleanup errors
      }
    };
  }, []);

  // ===== Selection handler =====
  const handlePacketSelect = useCallback((p: Packet) => {
    setSelectedPacket(p);
  }, []);

  // ===== Derived stats (memoized) =====
  const totalPackets = useMemo(() => packets.length, [packets]);

  const totalBytes = useMemo(() => {
    return packets.reduce((s, p) => s + (p.length ?? 0), 0);
  }, [packets]);

  // const protocolCounts = useMemo(() => {
  //   const counts = new Map<string, number>();
  //   for (const p of packets) {
  //     const key = p.protocol ?? 'OTHER';
  //     counts.set(key, (counts.get(key) ?? 0) + 1);
  //   }
  //   return counts;
  // }, [packets]);

  // ===== UI Rendering =====
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <AppBar position="static" elevation={2}>
          <Toolbar>
            <NetworkCheckIcon sx={{ mr: 2, fontSize: 32 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              NetVis - Network Packet Visualizer
            </Typography>

            <Button
              variant="contained"
              color="secondary"
              startIcon={<FolderOpenIcon />}
              onClick={handleLoadPcap}
              disabled={loading}
            >
              Load PCAP File
            </Button>
          </Toolbar>
        </AppBar>

        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* LEFT: Packet list */}
          <Box sx={{ width: '60%', borderRight: '1px solid rgba(255,255,255,0.12)', display: 'flex', flexDirection: 'column' }}>
            {loading && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
                <CircularProgress size={60} />
                <Typography variant="h6">Loading PCAP file…</Typography>
                {loadingProgress.total > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    {(loadingProgress.packets ?? 0).toLocaleString()} packets parsed • {((loadingProgress.current / Math.max(1, loadingProgress.total)) * 100).toFixed(1)}%
                  </Typography>
                )}
              </Box>
            )}

            {error && (
              <Container sx={{ mt: 4 }}>
                <Alert severity="error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              </Container>
            )}

            {!loading && !error && packets.length === 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2, color: 'text.secondary' }}>
                <FolderOpenIcon sx={{ fontSize: 80, opacity: 0.28 }} />
                <Typography variant="h5">No packets loaded</Typography>
                <Typography variant="body2">Click “Load PCAP File” to get started</Typography>
              </Box>
            )}

            {!loading && !error && packets.length > 0 && (
              <>
                <Box sx={{ p: 2, bgcolor: 'background.paper', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>{totalPackets.toLocaleString()}</strong> packets • <strong>{(totalBytes / 1024).toFixed(2)} KB</strong>
                    {filename && ` • ${filename.split(/[\\/]/).pop()}`}
                  </Typography>
                </Box>

                <Box sx={{ flex: 1, overflow: 'auto' }}>
                  <PacketList packets={packets} selectedPacket={selectedPacket} onPacketSelect={handlePacketSelect} />
                </Box>
              </>
            )}
          </Box>

          {/* RIGHT: Chart & details */}
          <Box sx={{ width: '40%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
            {packets.length > 0 && (
              <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
                <Typography variant="h6" gutterBottom>
                  Protocol Distribution
                </Typography>
                <ProtocolChart packets={packets} />
              </Box>
            )}

            {selectedPacket ? (
              <Box sx={{ flex: 1, overflow: 'auto' }}>
                <PacketDetail packet={selectedPacket} />
              </Box>
            ) : (
              packets.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.secondary' }}>
                  <Typography variant="body1">Select a packet to view details</Typography>
                </Box>
              )
            )}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App;
