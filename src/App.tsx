/**
 * NetVis - Main Application Component
 * 
 * This is the root component that manages the entire application state
 * and coordinates all child components.
 * 
 * State Management:
 * - packets: Array of parsed packets
 * - selectedPacket: Currently selected packet for detail view
 * - loading: Is a file being processed?
 * - error: Error message (if any)
 * - statistics: Protocol distribution and other stats
 * - filename: Currently loaded file
 * 
 * Location: src/App.tsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  LinearProgress,
  Alert,
  Container,
  Paper,
  Grid,
  Tabs,
  Tab
} from '@mui/material';
import { FolderOpen as FolderOpenIcon, PlayCircle as PlayCircleIcon } from '@mui/icons-material';

// Import types
import { Packet } from './types/packet.types';
import { ParseProgress, PacketStatistics } from './types/electron';

// Import child components
import PacketList from './components/PacketList';
import PacketDetail from './components/PacketDetail';
import ProtocolChart from './components/ProtocolChart';
import LiveCaptureView from './components/LiveCaptureView';

/**
 * Dark theme configuration
 * NetVis uses a dark theme for better contrast with network data
 */
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#2196F3', // Blue - matches TCP color
    },
    secondary: {
      main: '#4CAF50', // Green - matches UDP color
    },
    background: {
      default: '#1e1e1e',
      paper: '#2d2d2d',
    },
    text: {
      primary: '#ffffff',
      secondary: '#aaaaaa',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // Don't uppercase buttons
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

/**
 * Main Application Component
 */
function App() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  // Packet data
  const [packets, setPackets] = useState<Packet[]>([]);
  const [selectedPacket, setSelectedPacket] = useState<Packet | null>(null);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ParseProgress | null>(null);
  
  // File info
  const [filename, setFilename] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<PacketStatistics | null>(null);
  
  // View mode (File Analyzer vs Live Capture)
  const [viewMode, setViewMode] = useState<'file' | 'live'>('file');
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  /**
   * Setup progress listener
   * Listens for progress updates from main process during file parsing
   */
  useEffect(() => {
    if (!window.electron) {
      console.error('Electron API not available');
      return;
    }
    
    // Register progress listener
    const cleanup = window.electron.onParseProgress((progressData) => {
      console.log('Progress update:', progressData);
      setProgress(progressData);
    });
    
    // Cleanup on unmount
    return cleanup;
  }, []);
  
  /**
   * Auto-select first packet when packets load
   */
  useEffect(() => {
    if (packets.length > 0 && !selectedPacket) {
      setSelectedPacket(packets[0]);
    }
  }, [packets, selectedPacket]);
  
  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  /**
   * Handle file selection and parsing
   */
  const handleLoadFile = useCallback(async () => {
    try {
      // Clear previous state
      setError(null);
      setProgress(null);
      
      // Step 1: Open file dialog
      console.log('Opening file dialog...');
      const filepath = await window.electron.openPcapDialog();
      
      if (!filepath) {
        console.log('User cancelled file dialog');
        return;
      }
      
      console.log('Selected file:', filepath);
      
      // Step 2: Parse file
      setLoading(true);
      setFilename(filepath.split('/').pop() || filepath.split('\\').pop() || 'Unknown');
      
      console.log('Parsing PCAP file...');
      const result = await window.electron.parsePcapFile(filepath);
      
      // Step 3: Handle result
      if (result.success && result.packets) {
        console.log('Parse successful:', {
          packets: result.packets.length,
          processingTime: result.fileInfo?.processingTime
        });
        
        setPackets(result.packets);
        setStatistics(result.statistics || null);
        setError(null);
        
        // Show success message briefly
        console.log(`✅ Loaded ${result.packets.length} packets in ${result.fileInfo?.processingTime}s`);
      } else {
        console.error('Parse failed:', result.error);
        setError(result.error || 'Failed to parse PCAP file');
        setPackets([]);
        setStatistics(null);
      }
      
    } catch (err) {
      console.error('Error loading file:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setPackets([]);
      setStatistics(null);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, []);
  
  /**
   * Handle packet selection
   */
  const handlePacketSelect = useCallback((packet: Packet) => {
    console.log('Packet selected:', packet.frameNumber);
    setSelectedPacket(packet);
  }, []);
  
  /**
   * Handle clearing all data
   */
  const handleClear = useCallback(() => {
    console.log('Clearing all data');
    setPackets([]);
    setSelectedPacket(null);
    setStatistics(null);
    setFilename(null);
    setError(null);
    setProgress(null);
  }, []);
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* Top App Bar */}
        <AppBar position="static" elevation={0}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              NetVis
              {filename && viewMode === 'file' && (
                <Typography component="span" variant="body2" sx={{ ml: 2, color: 'rgba(255,255,255,0.7)' }}>
                  {filename}
                </Typography>
              )}
            </Typography>
            
            {/* Mode Tabs */}
            <Tabs
              value={viewMode}
              onChange={(_, newValue) => setViewMode(newValue)}
              sx={{ mr: 2 }}
              textColor="inherit"
              indicatorColor="secondary"
            >
              <Tab 
                icon={<FolderOpenIcon />} 
                iconPosition="start" 
                label="File Analyzer" 
                value="file"
              />
              <Tab 
                icon={<PlayCircleIcon />} 
                iconPosition="start" 
                label="Live Capture" 
                value="live"
              />
            </Tabs>
            
            {viewMode === 'file' && (
              <>
                <Button
                  variant="contained"
                  startIcon={<FolderOpenIcon />}
                  onClick={handleLoadFile}
                  disabled={loading}
                  sx={{ mr: 1 }}
                >
                  Load PCAP File
                </Button>
                
                {packets.length > 0 && (
                  <Button
                    variant="outlined"
                    onClick={handleClear}
                    disabled={loading}
                  >
                    Clear
                  </Button>
                )}
              </>
            )}
          </Toolbar>
          
          {/* Loading Progress Bar (File mode only) */}
          {loading && viewMode === 'file' && (
            <LinearProgress
              variant={progress?.percentage ? 'determinate' : 'indeterminate'}
              value={progress?.percentage || 0}
            />
          )}
        </AppBar>
        
        {/* Progress Message (File mode only) */}
        {loading && progress && viewMode === 'file' && (
          <Alert severity="info" sx={{ m: 2, mb: 0 }}>
            {progress.message}
            {progress.percentage && ` (${progress.percentage}%)`}
          </Alert>
        )}
        
        {/* Error Message (File mode only) */}
        {error && viewMode === 'file' && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ m: 2, mb: 0 }}>
            {error}
          </Alert>
        )}
        
        {/* Main Content - Conditional Rendering */}
        <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex' }}>
          {viewMode === 'live' ? (
            // Live Capture Mode
            <LiveCaptureView />
          ) : (
            // File Analyzer Mode
            packets.length === 0 ? (
              // Empty State
              <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <FolderOpenIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h4" gutterBottom>
                    Welcome to NetVis
                  </Typography>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    An educational tool for learning network protocols through packet visualization
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<FolderOpenIcon />}
                    onClick={handleLoadFile}
                    disabled={loading}
                    sx={{ mt: 2 }}
                  >
                    Load PCAP File
                  </Button>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Supported formats: .pcap, .pcapng
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Or try <strong>Live Capture</strong> mode to simulate real-time packet capture!
                  </Typography>
                </Box>
              </Container>
            ) : (
              // Packet View
              <Grid container spacing={0} sx={{ height: '100%' }}>
                {/* Left Column: Packet List + Detail */}
                <Grid item xs={12} md={8} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {/* Packet List */}
                  <Box sx={{ height: '50%', overflow: 'hidden', borderRight: 1, borderColor: 'divider' }}>
                    <PacketList
                      packets={packets}
                      selectedPacket={selectedPacket}
                      onPacketSelect={handlePacketSelect}
                    />
                  </Box>
                  
                  {/* Packet Detail */}
                  <Box sx={{ height: '50%', overflow: 'auto', borderRight: 1, borderTop: 1, borderColor: 'divider' }}>
                    {selectedPacket ? (
                      <PacketDetail packet={selectedPacket} />
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <Typography color="text.secondary">
                          Select a packet to view details
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Grid>
                
                {/* Right Column: Visualizations */}
                <Grid item xs={12} md={4} sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
                  <Box sx={{ p: 2 }}>
                    {/* Protocol Chart */}
                    {statistics && (
                      <Box sx={{ mt: 2 }}>
                        <ProtocolChart statistics={statistics} />
                      </Box>
                    )}
                  </Box>
                </Grid>
              </Grid>
            )
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;