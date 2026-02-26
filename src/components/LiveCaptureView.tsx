/**
 * NetVis - Live Capture View Component
 * 
 * Provides interface for simulated live packet capture.
 * Features:
 * - Load PCAP file for replay
 * - Start/Stop/Pause controls
 * - Real-time packet display
 * - Live statistics updates
 * - Playback speed control
 * 
 * Location: src/components/LiveCaptureView.tsx
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  ButtonGroup,
  Paper,
  Grid,
  LinearProgress,
  Alert,
  Slider,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  FolderOpen as FolderOpenIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';

import { Packet } from '../types/packet.types';
import PacketList from './PacketList';
import PacketDetail from './PacketDetail';

/**
 * Capture statistics interface
 */
interface CaptureStats {
  capturedPackets: number;
  totalPackets: number;
  totalBytes: number;
  duration: number;
  packetsPerSecond: number;
  protocols: Record<string, number>;
  isComplete: boolean;
  progress: number;
}

/**
 * Main LiveCaptureView Component
 */
const LiveCaptureView: React.FC = () => {
  // State
  const [packets, setPackets] = useState<Packet[]>([]);
  const [selectedPacket, setSelectedPacket] = useState<Packet | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<CaptureStats | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  
  // Capture options
  const [captureMode, setCaptureMode] = useState<'realtime' | 'fast'>('realtime');
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  
  // Refs for cleanup
  const packetListenerCleanup = useRef<(() => void) | null>(null);
  const statsListenerCleanup = useRef<(() => void) | null>(null);
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  /**
   * Setup listeners on mount, cleanup on unmount
   */
  useEffect(() => {
    // Register packet listener
    packetListenerCleanup.current = window.electron.onSimPacket((packet: Packet) => {
      setPackets(prev => [...prev, packet]);
    });
    
    // Register stats listener
    statsListenerCleanup.current = window.electron.onSimStats((newStats: CaptureStats) => {
      setStats(newStats);
      
      // Auto-stop when complete
      if (newStats.isComplete) {
        setIsCapturing(false);
        setIsPaused(false);
      }
    });
    
    // Cleanup on unmount
    return () => {
      if (packetListenerCleanup.current) packetListenerCleanup.current();
      if (statsListenerCleanup.current) statsListenerCleanup.current();
    };
  }, []);
  
  /**
   * Auto-select first packet
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
   * Load PCAP file for simulated capture
   */
  const handleLoadFile = useCallback(async () => {
    try {
      setError(null);
      
      // Open file dialog
      const filepath = await window.electron.openPcapDialog();
      if (!filepath) return;
      
      // Load file
      console.log('Loading file for simulated capture:', filepath);
      const result = await window.electron.simLoadFile(filepath);
      
      if (result.success) {
        setFilename(result.filename || 'Unknown');
        setPackets([]);
        setSelectedPacket(null);
        setStats(null);
        
        console.log(`✅ Loaded ${result.packetCount} packets for replay`);
      } else {
        setError(result.error || 'Failed to load file');
      }
      
    } catch (err) {
      console.error('Error loading file:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);
  
  /**
   * Start capture
   */
  const handleStart = useCallback(async () => {
    try {
      setError(null);
      
      const result = await window.electron.simStart({
        mode: captureMode,
        speed: playbackSpeed
      });
      
      if (result.success) {
        setIsCapturing(true);
        setIsPaused(false);
        setPackets([]);
        setStats(null);
        console.log('▶️  Capture started');
      } else {
        setError(result.error || 'Failed to start capture');
      }
      
    } catch (err) {
      console.error('Error starting capture:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [captureMode, playbackSpeed]);
  
  /**
   * Pause capture
   */
  const handlePause = useCallback(async () => {
    try {
      await window.electron.simPause();
      setIsPaused(true);
      console.log('⏸️  Capture paused');
    } catch (err) {
      console.error('Error pausing:', err);
    }
  }, []);
  
  /**
   * Resume capture
   */
  const handleResume = useCallback(async () => {
    try {
      await window.electron.simResume();
      setIsPaused(false);
      console.log('▶️  Capture resumed');
    } catch (err) {
      console.error('Error resuming:', err);
    }
  }, []);
  
  /**
   * Stop capture
   */
  const handleStop = useCallback(async () => {
    try {
      await window.electron.simStop();
      setIsCapturing(false);
      setIsPaused(false);
      console.log('⏹️  Capture stopped');
    } catch (err) {
      console.error('Error stopping:', err);
    }
  }, []);
  
  /**
   * Handle playback speed change
   */
  const handleSpeedChange = useCallback(async (newSpeed: number) => {
    try {
      await window.electron.simSetSpeed(newSpeed);
      setPlaybackSpeed(newSpeed);
      console.log(`⚙️  Speed set to ${newSpeed}x`);
    } catch (err) {
      console.error('Error setting speed:', err);
    }
  }, []);
  
  /**
   * Handle packet selection
   */
  const handlePacketSelect = useCallback((packet: Packet) => {
    setSelectedPacket(packet);
  }, []);
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Controls Panel */}
      <Paper sx={{ p: 2, borderRadius: 0 }}>
        <Grid container spacing={2} alignItems="center">
          {/* File Info */}
          <Grid item xs={12} md={3}>
            <Typography variant="h6" gutterBottom>
              Live Capture (Simulated)
            </Typography>
            {filename && (
              <Typography variant="body2" color="text.secondary">
                📁 {filename}
              </Typography>
            )}
          </Grid>
          
          {/* Capture Controls */}
          <Grid item xs={12} md={3}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<FolderOpenIcon />}
                onClick={handleLoadFile}
                disabled={isCapturing}
                size="small"
              >
                Load File
              </Button>
              
              <ButtonGroup size="small" disabled={!filename || (isCapturing && !isPaused)}>
                {!isCapturing ? (
                  <Button
                    startIcon={<PlayIcon />}
                    onClick={handleStart}
                    color="success"
                  >
                    Start
                  </Button>
                ) : (
                  <>
                    {!isPaused ? (
                      <Button
                        startIcon={<PauseIcon />}
                        onClick={handlePause}
                        color="warning"
                      >
                        Pause
                      </Button>
                    ) : (
                      <Button
                        startIcon={<PlayIcon />}
                        onClick={handleResume}
                        color="success"
                      >
                        Resume
                      </Button>
                    )}
                    <Button
                      startIcon={<StopIcon />}
                      onClick={handleStop}
                      color="error"
                    >
                      Stop
                    </Button>
                  </>
                )}
              </ButtonGroup>
            </Box>
          </Grid>
          
          {/* Capture Mode */}
          <Grid item xs={12} md={3}>
            <FormControl size="small" disabled={isCapturing}>
              <FormLabel sx={{ fontSize: '0.75rem' }}>Mode</FormLabel>
              <RadioGroup
                row
                value={captureMode}
                onChange={(e) => setCaptureMode(e.target.value as 'realtime' | 'fast')}
              >
                <FormControlLabel 
                  value="realtime" 
                  control={<Radio size="small" />} 
                  label={<Typography variant="body2">Real-time</Typography>}
                />
                <FormControlLabel 
                  value="fast" 
                  control={<Radio size="small" />} 
                  label={<Typography variant="body2">Fast</Typography>}
                />
              </RadioGroup>
            </FormControl>
          </Grid>
          
          {/* Playback Speed */}
          <Grid item xs={12} md={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SpeedIcon sx={{ fontSize: 20 }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2" gutterBottom>
                  Speed: {playbackSpeed}x
                </Typography>
                <Slider
                  size="small"
                  value={playbackSpeed}
                  onChange={(_, value) => handleSpeedChange(value as number)}
                  min={0.25}
                  max={5}
                  step={0.25}
                  disabled={isCapturing || captureMode === 'fast'}
                  marks={[
                    { value: 0.5, label: '0.5x' },
                    { value: 1, label: '1x' },
                    { value: 2, label: '2x' },
                    { value: 5, label: '5x' }
                  ]}
                />
              </Box>
            </Box>
          </Grid>
        </Grid>
        
        {/* Progress Bar */}
        {stats && stats.progress < 100 && (
          <LinearProgress
            variant="determinate"
            value={stats.progress}
            sx={{ mt: 2 }}
          />
        )}
      </Paper>
      
      {/* Error Message */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ m: 2, mb: 0 }}>
          {error}
        </Alert>
      )}
      
      {/* Statistics Cards */}
      {stats && (
        <Box sx={{ p: 2, pb: 0 }}>
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Captured</Typography>
                  <Typography variant="h6">{stats.capturedPackets.toLocaleString()}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    of {stats.totalPackets.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Bytes</Typography>
                  <Typography variant="h6">
                    {(stats.totalBytes / 1024).toFixed(1)} KB
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Rate</Typography>
                  <Typography variant="h6">{stats.packetsPerSecond} pkt/s</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Duration</Typography>
                  <Typography variant="h6">
                    {(stats.duration / 1000).toFixed(1)}s
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
      
      {/* Main Content */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex' }}>
        {packets.length === 0 ? (
          // Empty State
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                No packets captured yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {filename 
                  ? 'Click "Start" to begin simulated capture'
                  : 'Load a PCAP file to get started'}
              </Typography>
            </Box>
          </Box>
        ) : (
          // Packet View
          <Grid container spacing={0} sx={{ height: '100%' }}>
            {/* Packet List */}
            <Grid item xs={12} md={8} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
            
            {/* Protocol Distribution */}
            <Grid item xs={12} md={4} sx={{ height: '100%', overflow: 'auto', p: 2 }}>
              <Typography variant="h6" gutterBottom>Protocol Distribution</Typography>
              {stats && Object.keys(stats.protocols).length > 0 ? (
                Object.entries(stats.protocols).map(([protocol, count]) => (
                  <Box key={protocol} sx={{ mb: 1 }}>
                    <Typography variant="body2">
                      {protocol}: {count} packets
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(count / stats.capturedPackets) * 100}
                      sx={{ height: 8, borderRadius: 1 }}
                    />
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No data yet
                </Typography>
              )}
            </Grid>
          </Grid>
        )}
      </Box>
    </Box>
  );
};

export default LiveCaptureView;