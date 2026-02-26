# NetVis Bug Fixes TODO

## Issue 1: Does not read .pcapng files
- [ ] 1.1 Update `pcapReader.js`: Add PCAPNG format detection and parsing
- [ ] 1.2 Update `simulatedCapture.js`: Add PCAPNG format detection
- [ ] 1.3 Update `validatePcapFile()` in pcapReader.js to accept PCAPNG files

## Issue 2: Simulated capture loads but nothing is displayed
- [ ] 2.1 Update `simulatedCapture.js`: Fix stats structure to match LiveCaptureView expectations
- [ ] 2.2 Add `isComplete` flag when all packets are sent
- [ ] 2.3 Add `totalBytes`, `duration`, `packetsPerSecond`, and `protocols` to stats
