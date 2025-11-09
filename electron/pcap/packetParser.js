import { formatTimestamp } from "./utils.js";

export function parsePacket(data, number, timestamp, length, linkType) {
  try {
    let src = "";
    let dst = "";
    let protocol = "Unknown";
    let protocolType = "Unknown";
    let offset = 0;

    switch (linkType) {
      case 1: {
        // Ethernet
        const eth = parseEthernet(data, offset);
        offset += 14;
        if (eth.etherType === 0x0800) {
          // IPv4
          const ip = parseIPv4(data, offset);
          src = ip.sourceIP;
          dst = ip.destinationIP;
          offset += ip.headerLength;
          if (ip.protocol === 6) {
            protocol = "TCP";
            const tcp = parseTCP(data, offset);
            const sp = tcp.sourcePort,
              dp = tcp.destinationPort;
            if (sp === 80 || dp === 80 || sp === 8080 || dp === 8080) {
              protocolType = "HTTP";
            } else if (sp === 443 || dp === 443) {
              protocolType = "TLS";
            }
          } else if (ip.protocol === 17) {
            protocol = "UDP";
            const udp = parseUDP(data, offset);
            const sp = udp.sourcePort,
              dp = udp.destinationPort;
            if (sp === 53 || dp === 53) {
              protocolType = "DNS";
            }
          } else if (ip.protocol === 1) {
            protocol = "ICMP";
            protocolType = "ICMP";
          } else {
            protocol = `IP(${ip.protocol})`;
          }
        } else if (eth.etherType === 0x0806) {
          // ARP
          const arp = parseARP(data, offset);
          src = arp.senderIP;
          dst = arp.targetIP;
          protocol = "ARP";
          protocolType = "ARP";
        } else {
          console.warn(
            `Unsupported EtherType: 0x${eth.etherType.toString(16)}`,
          );
          return null;
        }
        break;
      }
      case 113: {
        // Linux Cooked (SLL) - 16-byte header
        const etherType = data.readUInt16BE(offset + 14);
        offset += 16;
        if (etherType === 0x0800) {
          const ip = parseIPv4(data, offset);
          src = ip.sourceIP;
          dst = ip.destinationIP;
          offset += ip.headerLength;
          if (ip.protocol === 6) {
            protocol = "TCP";
            const tcp = parseTCP(data, offset);
            const sp = tcp.sourcePort,
              dp = tcp.destinationPort;
            if (sp === 80 || dp === 80 || sp === 8080 || dp === 8080) {
              protocolType = "HTTP";
            } else if (sp === 443 || dp === 443) {
              protocolType = "TLS";
            }
          } else if (ip.protocol === 17) {
            protocol = "UDP";
            const udp = parseUDP(data, offset);
            const sp = udp.sourcePort,
              dp = udp.destinationPort;
            if (sp === 53 || dp === 53) {
              protocolType = "DNS";
            }
          } else if (ip.protocol === 1) {
            protocol = "ICMP";
            protocolType = "ICMP";
          } else {
            protocol = `IP(${ip.protocol})`;
          }
        } else {
          console.warn(
            `Unsupported Linux Cooked EtherType: 0x${etherType.toString(16)}`,
          );
          return null;
        }
        break;
      }
      case 12: {
        // Raw IP (e.g., direct IP packets)
        const ip = parseIPv4(data, offset);
        src = ip.sourceIP;
        dst = ip.destinationIP;
        offset += ip.headerLength;
        if (ip.protocol === 6) {
          protocol = "TCP";
          const tcp = parseTCP(data, offset);
          const sp = tcp.sourcePort,
            dp = tcp.destinationPort;
          if (sp === 80 || dp === 80 || sp === 8080 || dp === 8080) {
            protocolType = "HTTP";
          } else if (sp === 443 || dp === 443) {
            protocolType = "TLS";
          }
        } else if (ip.protocol === 17) {
          protocol = "UDP";
          const udp = parseUDP(data, offset);
          const sp = udp.sourcePort,
            dp = udp.destinationPort;
          if (sp === 53 || dp === 53) {
            protocolType = "DNS";
          }
        } else if (ip.protocol === 1) {
          protocol = "ICMP";
          protocolType = "ICMP";
        } else {
          protocol = `IP(${ip.protocol})`;
        }
        break;
      }
      case 0: {
        // Loopback (DLT_NULL) - skip 4-byte family header
        offset += 4;
        const ip = parseIPv4(data, offset);
        src = ip.sourceIP;
        dst = ip.destinationIP;
        offset += ip.headerLength;
        if (ip.protocol === 6) {
          protocol = "TCP";
          const tcp = parseTCP(data, offset);
          const sp = tcp.sourcePort,
            dp = tcp.destinationPort;
          if (sp === 80 || dp === 80 || sp === 8080 || dp === 8080) {
            protocolType = "HTTP";
          } else if (sp === 443 || dp === 443) {
            protocolType = "TLS";
          }
        } else if (ip.protocol === 17) {
          protocol = "UDP";
          const udp = parseUDP(data, offset);
          const sp = udp.sourcePort,
            dp = udp.destinationPort;
          if (sp === 53 || dp === 53) {
            protocolType = "DNS";
          }
        } else if (ip.protocol === 1) {
          protocol = "ICMP";
          protocolType = "ICMP";
        } else {
          protocol = `IP(${ip.protocol})`;
        }
        break;
      }
      default:
        console.warn(`Unsupported link type: ${linkType}`);
        return null;
    }

    return {
      number,
      timestamp,
      length,
      src,
      dst,
      protocol,
      protocolType: protocolType || "Unknown",
    };
  } catch (error) {
    console.error(`Error parsing packet ${number}:`, error.message);
    return null;
  }
}

function parseEthernet(data, offset) {
  const destMAC = formatMAC(data.slice(offset, offset + 6));
  const srcMAC = formatMAC(data.slice(offset + 6, offset + 12));
  const etherType = data.readUInt16BE(offset + 12);
  return { destMAC, srcMAC, etherType };
}

function parseIPv4(data, offset) {
  const versionIHL = data.readUInt8(offset);
  const ihl = versionIHL & 0x0f;
  const headerLength = ihl * 4;
  const sourceIP = formatIPv4(data.slice(offset + 12, offset + 16));
  const destinationIP = formatIPv4(data.slice(offset + 16, offset + 20));
  const protocol = data.readUInt8(offset + 9);
  return { headerLength, sourceIP, destinationIP, protocol };
}

function parseTCP(data, offset) {
  return {
    sourcePort: data.readUInt16BE(offset),
    destinationPort: data.readUInt16BE(offset + 2),
  };
}

function parseUDP(data, offset) {
  return {
    sourcePort: data.readUInt16BE(offset),
    destinationPort: data.readUInt16BE(offset + 2),
  };
}

function parseARP(data, offset) {
  const senderIP = formatIPv4(data.slice(offset + 14, offset + 18));
  const targetIP = formatIPv4(data.slice(offset + 24, offset + 28));
  return { senderIP, targetIP };
}

// Utility functions
function formatMAC(buffer) {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(":");
}

function formatIPv4(buffer) {
  return Array.from(buffer).join(".");
}
