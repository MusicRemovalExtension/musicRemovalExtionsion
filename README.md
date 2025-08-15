# 🎵 Speech‑Only Chrome Extension

> **Real-time music removal with speech preservation across all browser audio.**

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Development](#development)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

The **Speech‑Only Chrome Extension** mutes music and emphasizes speech in real-time from any browser tab. It leverages ML-based separation (ONNX Runtime Web) with a DSP fallback to ensure high-quality audio with minimal CPU usage.

**Key Benefits:**
- 🎧 **Settings persist** across sessions
- 🔒 **All processing occurs locally**—no audio leaves the device
- ⚡ **Real-time performance** with minimal latency

---

## ✨ Features

### 🎵 Audio Processing
- **Real-time speech isolation** from music
- **Machine Learning (ONNX)** with WebGPU/WebGL/WASM fallback
- **DSP fallback**: STFT, harmonic suppression, spectral gating

### 🎛️ Adjustable Controls
- **Start/Stop per tab**
- **Mode**: Auto / ML / DSP
- **Sensitivity** (0–100)
- **Speech Boost** (0–12 dB)
- **Wet/Dry mix**
- **Quality profiles**: Low / Medium / High

### 💾 Persistence & Monitoring
- **Persistent settings** via `chrome.storage.sync`
- **Live input/output meters** and CPU monitoring
- **Offscreen audio playback** for MV3 compliance

---

## 🚀 Installation

### 1️⃣ From Source (Developer Mode)

#### Clone the repository:
```bash
git clone https://github.com/your-org/speech-only-extension.git
cd speech-only-extension
```

#### Install dependencies:
```bash
npm install
```

#### Build the extension:
```bash
npm run build
```

#### Load in Chrome:
1. Go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist` folder

### 2️⃣ Production (Chrome Web Store)

Install from the Chrome Web Store once published: [Store link]

---

## 🎮 Usage

1. **Open a browser tab** with audio (e.g., YouTube, podcast)
2. **Click the Speech‑Only extension icon**
3. **Adjust controls**:
   - Mode
   - Sensitivity
   - Speech Boost
   - Wet/Dry
   - Quality
4. **Click Start** to process the tab's audio
5. **Original tab audio will be muted**; processed audio plays through the extension
6. **Click Stop** to revert audio to the original tab

---

## 🛠️ Development

### 🔄 Hot Reload

- **Popup and offscreen pages** auto-reload during development using Vite
- **Service worker** reloads automatically on rebuild

### 📜 Scripts

```json
{
  "scripts": {
    "dev": "vite --mode development",
    "build": "vite build",
    "zip": "vite build && node scripts/zip.js"
  }
}
```

---

## 📁 Project Structure

```
speech-only-extension/
├─ 📄 vite.config.ts
├─ 📦 package.json
├─ ⚙️ tsconfig.json
├─ 📁 public/
│  ├─ 🖼️ icons/
│  └─ 🤖 models/
├─ 📁 src/
│  ├─ 🔧 background/       # Service worker
│  ├─ 🎵 offscreen/        # ML/DSP engine & audio sink
│  ├─ 🔊 worklets/         # AudioWorklet processors
│  ├─ 🖱️ popup/            # React UI
│  ├─ 🔗 shared/           # Types, utils, messages
│  └─ 📝 types/            # Global type definitions
└─ 📖 README.md
```

---

## 🏗️ Tech Stack

- **🎨 Frontend**: React + TypeScript + Vite
- **🔌 Extension**: Chrome MV3 (Manifest v3)
- **🎵 Audio**: Web Audio API + AudioWorklet + Offscreen Document
- **🤖 ML**: ONNX Runtime Web (ML tier)
- **⚡ DSP**: DSP algorithms (STFT/iSTFT, harmonic suppression)
- **💾 Storage**: Persistent storage via `chrome.storage.sync`

---

## 🤝 Contributing

1. **Fork the repo** and create a branch for features/fixes
2. **Follow TypeScript and React best practices**
3. **Submit PRs** with descriptive titles and references to issues

---

## 📄 License

**MIT License** – see [LICENSE](LICENSE) file.

---

<div align="center">

**Made with ❤️ for better audio experiences**

</div>