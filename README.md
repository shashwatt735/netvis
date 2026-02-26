# NetVis Legacy

A **cross-platform desktop application** for learning and visualizing network traffic.
It simulates or captures real packets, encrypts sensitive data, stores it securely, and visualizes network interactions.
---
⚠️ This is the legacy version. See `NetVis` for the active project.
---

## Features

- **Packet Capture**
  - Simulated packets (default)

- **Secure Storage**
  - AES encryption using `crypto-js`

- **Cross-Platform**
  - Works on **Windows**, **macOS**, and **Linux**

- **Modular Design**
  - Separate modules for capture, parsing, visualization, and security

- **Developer-Friendly**
  - Built with **Electron**, **Vite**, and **React**
  - ESLint + Prettier for code quality

---

## Project Structure

```
netvis
    └── backup
    └── electron
        └── pcap
            ├── packetParser.js
            ├── packetProcessor.js
            ├── pcapReader.js
            ├── simulatedCapture.js
            ├── utils.js
        ├── main.js
        ├── preload.cjs
        ├── simluatedCapture
    └── src
        └── components
            ├── FileLoader.tsx
            ├── LiveCaptureView.tsx
            ├── PacketDetail.tsx
            ├── PacketList.tsx
            ├── ProtocolChart.tsx
        └── parser
        └── renderer
        └── types
            ├── electron.d.ts
            ├── packet.types.ts
        ├── App.tsx
        ├── main.tsx
    └── test
        └── fixtures
            ├── simple.json
        └── utils
    ├── .gitignore
    ├── index.html
    ├── nul
    ├── package-lock.json
    ├── package.json
    ├── README.md
    ├── todo.md
    ├── tsconfig.json
    ├── tsconfig.node.json
    └── vite.config.ts

```

---

## Installation

### Prerequisites

- [Node.js (LTS)](https://nodejs.org/)
- [Git](https://git-scm.com/)
- (Windows only) [Npcap](https://npcap.com/) if you plan to capture real packets

---

### Clone and install

```bash
git clone https://github.com/shashwatt735/netvis-legacy.git
cd netvis
npm install
```

---

## Development

To start both Electron and Vite in development mode:

```bash
npm run dev
```

This runs:

- Vite frontend on `http://localhost:5173`
- Electron main process with live reload

---

## Building for Production

```bash
npm run build
```

This will:

- Bundle your React app using Vite
- Package your Electron app using `electron-builder`
- Create executables under `dist/`

---

## Testing

To run tests:

```bash
npm test
```

You can place your Jest test files in `/test/`.

---

## Security and Privacy

**Important**

This application may handle or simulate **real network data**, which can contain **sensitive information** such as IP addresses or payloads.

Best practices:

- Capture packets only on your own or authorized networks.
- Do **not** distribute captured data without anonymization.
- Use encryption (`crypto-js` AES) when storing or transmitting any packet data.

---

## Scripts

| Command           | Description                         |
| ----------------- | ----------------------------------- |
| `npm run dev`     | Run Vite + Electron in development  |
| `npm run build`   | Build app for production            |
| `npm run rebuild` | Rebuild native modules for Electron |
| `npm run lint`    | Run ESLint checks                   |
| `npm run test`    | Run test suite                      |

---

## Dependencies

**Core**

- `electron`, `electron-builder`, `vite`, `react`, `react-dom`

**Capture & Parsing**

- `node-pcap` _(optional, real capture)_
- `better-sqlite3` _(for storage)_

**Security**

- `crypto-js`

**Developer Tools**

- `eslint`, `prettier`, `concurrently`, `nodemon`, `@types/*`

---

## Example Encrypted Output

When you stop capture, packets are saved as:

```
captures/packets_1691234567890.enc
```

You can later decrypt using your `crypto-js` key to view or visualize.

---

---
-->

## License

MIT License © 2025
