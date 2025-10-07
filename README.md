# 🔸 Network Visualization Learning Tool

A **cross-platform desktop application** for learning and visualizing network traffic.
It simulates or captures real packets, encrypts sensitive data, stores it securely, and visualizes network interactions.

---

## 🚀 Features

- **Packet Capture**
  - Simulated packets (default)
  - Real packet capture support (via `node-pcap` or `cap`)

- **Secure Storage**
  - AES encryption using `crypto-js`
  - Encrypted `.enc` files stored in `/captures/`

- **Interactive Visualization**
  - 2D/3D network graphs using `react-force-graph-3d`

- **Cross-Platform**
  - Works on **Windows**, **macOS**, and **Linux**

- **Modular Design**
  - Separate modules for capture, parsing, visualization, and security

- **Developer-Friendly**
  - Built with **Electron**, **Vite**, and **React**
  - ESLint + Prettier for code quality

---

## 🧩 Project Structure

```
src/
├─ main/           # Electron main process
│  ├─ index.js     # Electron entry point
│  └─ preload.js   # Secure bridge between Electron and React
│
├─ renderer/       # React + Vite frontend
│  ├─ index.html
│  ├─ index.jsx
│  └─ App.jsx
│
├─ capture/        # Packet capture logic
│  └─ network.js
│
├─ parser/         # Protocol parsing modules
├─ storage/        # Database (Better SQLite3)
├─ security/       # Encryption and key management
├─ visualization/  # D3 / Three.js visualization components
├─ components/     # React UI components
└─ native/         # Optional C++ native modules

build/ or dist/    # Output after build
captures/          # Encrypted packet files (.enc)
resources/         # Icons, images
test/              # Unit tests (Jest)
```

---

## ⚙️ Installation

### 1️⃣ Prerequisites

- [Node.js (LTS)](https://nodejs.org/)
- [Git](https://git-scm.com/)
- (Windows only) [Npcap](https://npcap.com/) if you plan to capture real packets

---

### 2️⃣ Clone and install

```bash
git clone https://github.com/yourusername/network-visualizer.git
cd network-visualizer
npm install
```

---

## 🧬 Development

To start both Electron and Vite in development mode:

```bash
npm run dev
```

This runs:

- Vite frontend on `http://localhost:5173`
- Electron main process with live reload

---

## 🏷️ Building for Production

```bash
npm run build
```

This will:

- Bundle your React app using Vite
- Package your Electron app using `electron-builder`
- Create executables under `dist/`

---

## 🤪 Testing

To run tests:

```bash
npm test
```

You can place your Jest test files in `/test/`.

---

## 🔐 Security and Privacy

⚠️ **Important Notice**

This application may handle or simulate **real network data**, which can contain **sensitive information** such as IP addresses or payloads.

Best practices:

- Capture packets only on your own or authorized networks.
- Do **not** distribute captured data without anonymization.
- Use encryption (`crypto-js` AES) when storing or transmitting any packet data.

---

## 🧮 Scripts

| Command           | Description                         |
| ----------------- | ----------------------------------- |
| `npm run dev`     | Run Vite + Electron in development  |
| `npm run build`   | Build app for production            |
| `npm run rebuild` | Rebuild native modules for Electron |
| `npm run lint`    | Run ESLint checks                   |
| `npm run test`    | Run test suite                      |

---

## 📦 Dependencies

**Core**

- `electron`, `electron-builder`, `vite`, `react`, `react-dom`

**Capture & Parsing**

- `node-pcap` _(optional, real capture)_
- `better-sqlite3` _(for storage)_

**Visualization**

- `d3`, `react-force-graph-3d`, `three`

**Security**

- `crypto-js`

**Developer Tools**

- `eslint`, `prettier`, `concurrently`, `nodemon`, `@types/*`

---

## 💿 Example Encrypted Output

When you stop capture, packets are saved as:

```
captures/packets_1691234567890.enc
```

You can later decrypt using your `crypto-js` key to view or visualize.

---

## 🖯️ Roadmap

- [ ] Add real-time packet capture via `node-pcap`
- [ ] Integrate database-backed storage
- [ ] Decrypt and visualize packets
- [ ] Add protocol parsers (TCP, UDP, HTTP)
- [ ] Build an educational mode for learning network layers

---

## 🧑‍💻 Author

**Your Name**

<!--📧 [your.email@example.com](mailto:your.email@example.com)
🌐 [yourwebsite.dev](https://yourwebsite.dev) -->

---

## 📜 License

MIT License © 2025 Your Name
