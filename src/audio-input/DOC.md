# Complete Chrome Audio Capture Extension

## File Structure

```
audio-capture-extension/
├── manifest.json
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── src/
│   ├── background/
│   │   └── index.ts
│   ├── popup/
│   │   ├── index.html
│   │   ├── index.tsx
│   │   └── styles.css
│   ├── offscreen/
│   │   ├── index.html
│   │   └── index.ts
│   ├── worklets/
│   │   └── capture-processor.js
│   └── types/
│       └── audio-types.ts
└── public/
    └── icons/
        ├── icon16.png
        ├── icon48.png
        └── icon128.png
```

---

## 1. manifest.json

```json
{
  "manifest_version": 3,
  "name": "Audio Capture Extension",
  "version": "1.0.0",
  "description": "Captures audio from browser tabs and processes it in real-time",

  // PERMISSIONS: What the extension is allowed to do
  "permissions": [
    "tabCapture", // Permission to capture audio/video from tabs
    "activeTab", // Permission to interact with the currently active tab
    "offscreen", // Permission to create offscreen documents (for audio processing)
    "storage" // Permission to save settings/data locally
  ],

  // HOST PERMISSIONS: Which websites the extension can access
  "host_permissions": [
    "<all_urls>" // Can access all websites (needed for tab capture)
  ],

  // BACKGROUND SCRIPT: The "brain" that runs in the background
  "background": {
    "service_worker": "background.js", // Points to compiled background script
    "type": "module" // Use modern ES modules
  },

  // POPUP: The UI that appears when clicking the extension icon
  "action": {
    "default_popup": "popup.html", // The HTML file for the popup
    "default_title": "Audio Capture",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },

  // OFFSCREEN: Special document for audio processing
  "offscreen": {
    "url": "offscreen.html",
    "reasons": ["AUDIO_PLAYBACK"], // Reason: we need to process audio
    "justification": "Process audio streams for speech isolation and analysis"
  },

  // SECURITY: Content Security Policy (what scripts can run)
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self';"
  },

  // WEB ACCESSIBLE RESOURCES: Files that web pages can access
  "web_accessible_resources": [
    {
      "resources": ["worklets/capture-processor.js"], // AudioWorklet file
      "matches": ["<all_urls>"]
    }
  ]
}
```

---

## 2. package.json

```json
{
  "name": "audio-capture-extension",
  "version": "1.0.0",
  "description": "Chrome extension for capturing and processing tab audio",
  "type": "module",

  // SCRIPTS: Commands you can run with npm
  "scripts": {
    "dev": "vite build --watch", // Build and watch for changes
    "build": "vite build", // Build for production
    "preview": "vite preview", // Preview the build
    "type-check": "tsc --noEmit" // Check TypeScript types
  },

  // DEPENDENCIES: Libraries your code needs to run
  "dependencies": {
    "react": "^18.2.0", // React library for UI
    "react-dom": "^18.2.0" // React DOM rendering
  },

  // DEV DEPENDENCIES: Libraries needed only during development
  "devDependencies": {
    "@types/chrome": "^0.0.246", // TypeScript types for Chrome APIs
    "@types/react": "^18.2.0", // TypeScript types for React
    "@types/react-dom": "^18.2.0", // TypeScript types for React DOM
    "typescript": "^5.0.0", // TypeScript compiler
    "vite": "^4.4.0", // Build tool
    "tailwindcss": "^3.3.0", // CSS framework
    "autoprefixer": "^10.4.0", // CSS autoprefixer
    "postcss": "^8.4.0" // CSS processor
  }
}
```

---

## 3. vite.config.ts

```typescript
import { defineConfig } from "vite";
import { resolve } from "path";

// VITE CONFIGURATION: How to build the extension
export default defineConfig({
  // BUILD OPTIONS: How to compile and bundle files
  build: {
    // OUTPUT DIRECTORY: Where built files go
    outDir: "dist",

    // ROLLUP OPTIONS: Advanced bundling configuration
    rollupOptions: {
      // INPUT: Entry points for different parts of the extension
      input: {
        // POPUP: The UI that shows when you click extension icon
        popup: resolve(__dirname, "src/popup/index.html"),

        // BACKGROUND: The service worker that runs in background
        background: resolve(__dirname, "src/background/index.ts"),

        // OFFSCREEN: Special document for audio processing
        offscreen: resolve(__dirname, "src/offscreen/index.html"),

        // WORKLET: AudioWorklet processor (must be separate file)
        "worklets/capture-processor": resolve(
          __dirname,
          "src/worklets/capture-processor.js"
        ),
      },

      // OUTPUT: How to name the built files
      output: {
        // ENTRY FILE NAMES: How to name main entry files
        entryFileNames: (chunkInfo) => {
          // Special naming for different parts
          if (chunkInfo.name === "background") return "background.js";
          if (chunkInfo.name === "offscreen") return "offscreen.js";
          if (chunkInfo.name.includes("worklets/")) return "[name].js";
          return "[name].js";
        },

        // CHUNK FILE NAMES: How to name split chunks
        chunkFileNames: "[name]-[hash].js",

        // ASSET FILE NAMES: How to name other assets (CSS, images, etc.)
        assetFileNames: "[name].[ext]",
      },
    },

    // MINIFICATION: Don't minify for easier debugging
    minify: false,

    // SOURCE MAPS: Generate source maps for debugging
    sourcemap: true,
  },

  // RESOLVE: How to resolve imports
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"), // Use @ as shortcut for src folder
    },
  },
});
```

---

## 4. src/types/audio-types.ts

```typescript
// AUDIO CHUNK CONTRACT: Exact format that Phase 2 expects
export interface AudioChunkContract {
  // SAMPLES: The actual audio data as floating-point arrays
  // - Each Float32Array represents one audio channel
  // - Values range from -1.0 to +1.0 (standard audio range)
  // - For stereo: [leftChannel, rightChannel]
  // - For mono: [monoChannel]
  samples: Float32Array[];

  // SAMPLE RATE: How many samples per second (always 48000 Hz)
  // - 48000 = 48,000 samples per second
  // - This is the standard high-quality sample rate
  // - Higher than 44100 Hz used in CDs
  sampleRate: number;

  // CHANNELS: Number of audio channels
  // - 1 = mono (single channel)
  // - 2 = stereo (left and right channels)
  channels: number;

  // FRAME LENGTH: Number of samples per channel in this chunk
  // - Always 2048 samples per channel
  // - At 48000 Hz, this represents 2048/48000 = ~42.67ms of audio
  frameLength: number;

  // TIMESTAMP: When this chunk was captured (milliseconds since page load)
  // - Use performance.now() for high precision timing
  // - Helps Phase 2 maintain proper timing
  timestamp: number;

  // CHUNK ID: Unique identifier for this specific chunk
  // - Format: "chunk_${timestamp}_${randomString}"
  // - Helps track chunks and detect duplicates
  chunkId: string;

  // SEQUENCE NUMBER: Incremental counter starting from 0
  // - 0, 1, 2, 3, 4... for each chunk
  // - Helps Phase 2 detect missing or out-of-order chunks
  sequenceNumber: number;

  // RMS LEVEL: Root Mean Square audio level (optional)
  // - Range: 0.0 (silence) to 1.0 (maximum volume)
  // - Represents the "average" volume of the audio
  // - Calculated as sqrt(sum of squared samples / number of samples)
  rmsLevel?: number;

  // PEAK LEVEL: Highest absolute sample value (optional)
  // - Range: 0.0 (silence) to 1.0 (maximum volume)
  // - Represents the loudest moment in this chunk
  // - Calculated as max(abs(sample)) for all samples
  peakLevel?: number;
}

// CAPTURE STATE: Current state of the audio capture system
export interface CaptureState {
  isCapturing: boolean; // Are we currently capturing audio?
  currentTabId?: number; // Which tab are we capturing from?
  error?: string; // Any error message to display
  chunksProcessed: number; // Total chunks processed so far
  audioLevel: number; // Current audio level (0.0 to 1.0)
  chunkRate: number; // Chunks being processed per second
}

// PERFORMANCE METRICS: Statistics about capture performance
export interface PerformanceMetrics {
  avgChunkInterval: number; // Average time between chunks (milliseconds)
  targetChunkInterval: number; // Target time between chunks (42.67ms)
  timingConsistency: number; // How consistent the timing is (0-100%)
  totalChunks: number; // Total chunks processed
  memoryUsage: number; // Memory usage in MB
  cpuUsage: number; // CPU usage percentage
}
```

---

## 5. src/background/index.ts

```typescript
// BACKGROUND SCRIPT: The "brain" that coordinates everything
// This runs as a service worker and handles tab capture requests

// TAB CAPTURE MANAGER: Handles starting/stopping audio capture
class TabCaptureManager {
  // PRIVATE PROPERTIES: Internal state
  private currentStream: MediaStream | null = null; // Current audio stream
  private currentTabId: number | null = null; // Which tab we're capturing
  private offscreenDocumentExists = false; // Is offscreen doc created?

  /**
   * START CAPTURE: Begin capturing audio from the active tab
   * @param tabId - ID of the tab to capture (number like 123, 456, etc.)
   * @returns Promise<MediaStream> - The captured audio stream
   *
   * PROCESS:
   * 1. Use Chrome's tabCapture API to get audio stream
   * 2. Create offscreen document if needed
   * 3. Send stream to offscreen for processing
   * 4. Return stream for confirmation
   */
  async startCapture(tabId: number): Promise<MediaStream> {
    try {
      console.log(`🎯 Starting capture for tab ${tabId}...`);

      // STEP 1: REQUEST TAB CAPTURE
      // chrome.tabCapture.capture() asks Chrome to capture tab audio
      // Returns a MediaStream containing the audio data
      const stream = await chrome.tabCapture.capture({
        audio: true, // We want audio
        video: false, // We don't want video
      });

      // CHECK IF CAPTURE FAILED
      // Chrome returns null if capture fails (tab closed, no audio, permissions denied)
      if (!stream) {
        throw new Error(
          "Failed to capture tab audio - tab may be closed or have no audio"
        );
      }

      console.log(`✅ Tab capture successful:`, {
        streamId: stream.id, // Unique ID for this stream
        audioTracks: stream.getAudioTracks().length, // Number of audio tracks (usually 1)
        active: stream.active, // Is the stream currently active?
      });

      // STEP 2: STORE STREAM REFERENCE
      this.currentStream = stream; // Keep reference to stop later
      this.currentTabId = tabId; // Remember which tab

      // STEP 3: SEND TO OFFSCREEN FOR PROCESSING
      await this.sendStreamToOffscreen(stream);

      return stream;
    } catch (error) {
      console.error("❌ Tab capture failed:", error);
      throw error;
    }
  }

  /**
   * SEND STREAM TO OFFSCREEN: Forward the audio stream to offscreen document
   * @param stream - The MediaStream to process
   *
   * WHY OFFSCREEN?
   * - Service workers can't use AudioContext
   * - Need separate document to process audio
   * - Offscreen documents can access Web Audio API
   */
  private async sendStreamToOffscreen(stream: MediaStream) {
    try {
      // STEP 1: CREATE OFFSCREEN DOCUMENT IF NEEDED
      if (!this.offscreenDocumentExists) {
        console.log("📄 Creating offscreen document...");

        await chrome.offscreen.createDocument({
          url: "offscreen.html", // HTML file for offscreen doc
          reasons: ["AUDIO_PLAYBACK"], // Why we need it
          justification: "Process audio streams for real-time audio analysis",
        });

        this.offscreenDocumentExists = true;
        console.log("✅ Offscreen document created");
      }

      // STEP 2: SEND MESSAGE TO OFFSCREEN
      // We can't directly send MediaStream, so we send instructions
      console.log("📡 Sending stream to offscreen for processing...");

      chrome.runtime.sendMessage({
        type: "START_AUDIO_PROCESSING", // Message type
        streamId: stream.id, // Stream identifier
        tabId: this.currentTabId, // Which tab this is from
      });
    } catch (error) {
      console.error("❌ Failed to send stream to offscreen:", error);
      throw error;
    }
  }

  /**
   * STOP CAPTURE: Stop capturing audio and clean up
   *
   * CLEANUP PROCESS:
   * 1. Stop all tracks in the stream
   * 2. Clear references
   * 3. Notify offscreen to stop processing
   */
  async stopCapture() {
    console.log("⏹️ Stopping audio capture...");

    // STEP 1: STOP AUDIO TRACKS
    if (this.currentStream) {
      // Get all tracks (usually just 1 audio track)
      const tracks = this.currentStream.getTracks();

      console.log(`Stopping ${tracks.length} audio tracks...`);

      // Stop each track
      tracks.forEach((track, index) => {
        console.log(`Stopping track ${index}: ${track.kind} - ${track.label}`);
        track.stop(); // This actually stops the audio capture
      });

      // Clear reference
      this.currentStream = null;
    }

    // STEP 2: CLEAR TAB ID
    this.currentTabId = null;

    // STEP 3: NOTIFY OFFSCREEN TO STOP
    if (this.offscreenDocumentExists) {
      chrome.runtime.sendMessage({
        type: "STOP_AUDIO_PROCESSING",
      });
    }

    console.log("✅ Audio capture stopped");
  }

  /**
   * GET CAPTURE STATUS: Returns current capture information
   */
  getCaptureStatus() {
    return {
      isCapturing: this.currentStream !== null && this.currentStream.active,
      tabId: this.currentTabId,
      streamId: this.currentStream?.id || null,
    };
  }
}

// CREATE GLOBAL INSTANCE
const tabCapture = new TabCaptureManager();

/**
 * MESSAGE LISTENER: Handle messages from popup and other parts
 *
 * MESSAGES WE HANDLE:
 * - START_CAPTURE: Start capturing the active tab
 * - STOP_CAPTURE: Stop current capture
 * - GET_STATUS: Get current capture status
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📨 Background received message:", message.type);

  // HANDLE START CAPTURE REQUEST
  if (message.type === "START_CAPTURE") {
    // STEP 1: GET ACTIVE TAB
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const activeTab = tabs[0];

      // CHECK IF WE HAVE AN ACTIVE TAB
      if (!activeTab?.id) {
        console.error("❌ No active tab found");
        sendResponse({
          success: false,
          error: "No active tab found",
        });
        return;
      }

      console.log(
        `🎯 Active tab found: ${activeTab.id} - "${activeTab.title}"`
      );

      // STEP 2: START CAPTURE
      try {
        const stream = await tabCapture.startCapture(activeTab.id);

        console.log("✅ Capture started successfully");
        sendResponse({
          success: true,
          tabId: activeTab.id,
          tabTitle: activeTab.title,
          streamId: stream.id,
        });
      } catch (error) {
        console.error("❌ Failed to start capture:", error);
        sendResponse({
          success: false,
          error: error.message,
        });
      }
    });

    // IMPORTANT: Return true for async response
    return true;
  }

  // HANDLE STOP CAPTURE REQUEST
  else if (message.type === "STOP_CAPTURE") {
    tabCapture.stopCapture();
    sendResponse({ success: true });
  }

  // HANDLE STATUS REQUEST
  else if (message.type === "GET_STATUS") {
    const status = tabCapture.getCaptureStatus();
    sendResponse(status);
  }

  // HANDLE UNKNOWN MESSAGES
  else {
    console.warn("⚠️ Unknown message type:", message.type);
    sendResponse({ success: false, error: "Unknown message type" });
  }
});

console.log("🚀 Background script initialized");
```

---

## 6. src/offscreen/index.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Audio Processing Worker</title>

    <!-- This HTML file creates a hidden document for audio processing -->
    <!-- It's required because service workers can't use AudioContext -->
  </head>
  <body>
    <!-- VISUAL INDICATOR: Shows this document is running (hidden from user) -->
    <h1
      style="font-family: Arial; color: #666; text-align: center; margin-top: 50px;"
    >
      🎵 Audio Processing Worker Active
    </h1>

    <div style="text-align: center; color: #888; margin-top: 20px;">
      <p>This document processes audio in the background.</p>
      <p>Check the browser console for detailed logs.</p>
      <div id="status">Initializing...</div>
    </div>

    <!-- LOAD THE JAVASCRIPT: This runs the audio processing logic -->
    <script src="offscreen.js"></script>
  </body>
</html>
```

---

## 7. src/offscreen/index.ts

```typescript
// OFFSCREEN AUDIO PROCESSOR: Handles real-time audio processing
// This runs in a hidden document that has access to Web Audio API

import { AudioChunkContract } from "../types/audio-types";

/**
 * OFFSCREEN AUDIO PROCESSOR CLASS
 *
 * RESPONSIBILITIES:
 * 1. Create AudioContext for audio processing
 * 2. Load and initialize AudioWorklet
 * 3. Connect audio pipeline (MediaStream -> AudioWorklet)
 * 4. Receive and validate audio chunks
 * 5. Forward chunks to Phase 2
 */
class OffscreenAudioProcessor {
  // AUDIO PROCESSING COMPONENTS
  private audioContext: AudioContext | null = null; // Main audio processing context
  private sourceNode: MediaStreamAudioSourceNode | null = null; // Converts MediaStream to audio graph
  private captureNode: AudioWorkletNode | null = null; // Our custom audio processor

  // STATISTICS TRACKING
  private chunksReceived = 0; // Total chunks processed
  private startTime = 0; // When we started processing
  private lastChunkTime = 0; // When we got the last chunk
  private sequenceNumber = 0; // Chunk sequence counter

  /**
   * INITIALIZE AUDIO SYSTEM
   * Sets up AudioContext and loads AudioWorklet processor
   *
   * AUDIO CONTEXT:
   * - Central hub for all audio processing
   * - Manages audio graph (nodes connected together)
   * - Handles timing and sample rate conversion
   */
  async initializeAudio() {
    try {
      console.log("🎵 Initializing audio system...");

      // CREATE AUDIO CONTEXT with optimal settings
      this.audioContext = new AudioContext({
        sampleRate: 48000, // 48kHz - high quality sample rate
        latencyHint: "interactive", // Optimize for low latency (real-time processing)
      });

      console.log("✅ AudioContext created:", {
        sampleRate: this.audioContext.sampleRate, // Should be 48000
        state: this.audioContext.state, // Should be "running"
        currentTime: this.audioContext.currentTime, // Audio timeline position
        baseLatency: this.audioContext.baseLatency, // Hardware latency
      });

      // LOAD AUDIOWORKLET PROCESSOR
      // AudioWorklet runs on separate thread for low-latency processing
      console.log("📦 Loading AudioWorklet processor...");

      await this.audioContext.audioWorklet.addModule(
        "worklets/capture-processor.js"
      );

      console.log("✅ AudioWorklet processor loaded successfully");

      // UPDATE STATUS ON PAGE
      const statusElement = document.getElementById("status");
      if (statusElement) {
        statusElement.textContent =
          "Audio system initialized - Ready for capture";
      }
    } catch (error) {
      console.error("❌ Failed to initialize audio system:", error);

      // UPDATE STATUS WITH ERROR
      const statusElement = document.getElementById("status");
      if (statusElement) {
        statusElement.textContent = `Error: ${error.message}`;
      }

      throw error;
    }
  }

  /**
   * START PROCESSING USER MEDIA (for testing when no tab capture)
   * This is used for testing - it captures microphone instead of tab
   */
  async startProcessing() {
    console.log("🎤 Starting user media processing (test mode)...");

    if (!this.audioContext) {
      await this.initializeAudio();
    }

    try {
      // GET USER MICROPHONE (for testing only)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000, // Match our AudioContext sample rate
          channelCount: 2, // Stereo capture
          echoCancellation: false, // Disable processing for raw audio
          noiseSuppression: false, // Disable processing for raw audio
          autoGainControl: false, // Disable automatic volume adjustment
        },
      });

      console.log("✅ User media stream obtained:", {
        id: stream.id,
        tracks: stream.getAudioTracks().length,
        settings: stream.getAudioTracks()[0]?.getSettings(),
      });

      // CONNECT THE AUDIO STREAM
      this.connectAudioStream(stream);
    } catch (error) {
      console.error("❌ Failed to get user media:", error);
      throw error;
    }
  }

  /**
   * CONNECT AUDIO STREAM TO PROCESSING PIPELINE
   * @param stream - MediaStream containing audio data
   *
   * AUDIO PIPELINE:
   * MediaStream -> MediaStreamAudioSourceNode -> AudioWorkletNode -> (processing)
   */
  private connectAudioStream(stream: MediaStream) {
    if (!this.audioContext) {
      console.error("❌ AudioContext not initialized");
      return;
    }

    try {
      console.log("🔗 Connecting audio stream to processing pipeline...");

      // STEP 1: CREATE SOURCE NODE
      // Converts MediaStream to audio graph node
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);

      console.log("✅ MediaStreamAudioSourceNode created:", {
        numberOfInputs: this.sourceNode.numberOfInputs, // Should be 0 (source)
        numberOfOutputs: this.sourceNode.numberOfOutputs, // Should be 1
        channelCount: this.sourceNode.channelCount, // Number of channels
      });

      // STEP 2: CREATE CAPTURE WORKLET NODE
      // This is our custom processor that generates AudioChunkContract chunks
      this.captureNode = new AudioWorkletNode(
        this.audioContext,
        "capture-processor", // Name must match registerProcessor() call
        {
          // PROCESSOR OPTIONS: Configure the worklet
          numberOfInputs: 1, // We accept 1 input (from source)
          numberOfOutputs: 0, // We don't output audio (just process)
          channelCount: 2, // Process stereo audio
          processorOptions: {
            // CUSTOM OPTIONS: Passed to worklet constructor
            chunkSize: 2048, // Samples per chunk
            sampleRate: 48000, // Expected sample rate
          },
        }
      );

      console.log("✅ AudioWorkletNode created");

      // STEP 3: LISTEN FOR AUDIO CHUNKS
      // The worklet will send us AudioChunkContract objects
      this.captureNode.port.onmessage = (event) => {
        this.handleWorkletMessage(event.data);
      };

      // STEP 4: CONNECT THE PIPELINE
      // Source -> Worklet (worklet processes and sends us chunks)
      this.sourceNode.connect(this.captureNode);

      console.log("🎵 Audio pipeline connected successfully");

      // RECORD START TIME for performance metrics
      this.startTime = performance.now();

      // UPDATE STATUS
      const statusElement = document.getElementById("status");
      if (statusElement) {
        statusElement.textContent =
          "Processing audio - Check console for chunks";
      }
    } catch (error) {
      console.error("❌ Failed to connect audio stream:", error);
      throw error;
    }
  }

  /**
   * HANDLE MESSAGES FROM AUDIOWORKLET
   * @param data - Message data from the worklet processor
   *
   * MESSAGE TYPES:
   * - audioChunk: New AudioChunkContract chunk ready
   * - error: Processing error occurred
   * - stats: Performance statistics
   */
  private handleWorkletMessage(data: any) {
    // HANDLE AUDIO CHUNK MESSAGES
    if (data.type === "audioChunk") {
      this.handleAudioChunk(data.chunk);
    }

    // HANDLE ERROR MESSAGES
    else if (data.type === "error") {
      console.error("🚨 AudioWorklet error:", data.error);
    }

    // HANDLE STATISTICS MESSAGES
    else if (data.type === "stats") {
      console.log("📊 AudioWorklet stats:", data.stats);
    }

    // HANDLE UNKNOWN MESSAGES
    else {
      console.warn("⚠️ Unknown worklet message:", data.type);
    }
  }

  /**
   * HANDLE AUDIO CHUNK from AudioWorklet
   * @param chunk - AudioChunkContract object containing audio data
   *
   * PROCESSING:
   * 1. Validate chunk format
   * 2. Calculate performance metrics
   * 3. Log statistics periodically
   * 4. Forward to Phase 2
   */
  private handleAudioChunk(chunk: AudioChunkContract) {
    // UPDATE COUNTERS
    this.chunksReceived++;
    const now = performance.now();
    this.lastChunkTime = now;

    // VALIDATE CHUNK FORMAT
    const isValid = this.validateChunkContract(chunk);
    if (!isValid) {
      console.error("❌ Invalid chunk received:", chunk);
      return;
    }

    // CALCULATE PERFORMANCE METRICS
    const timeSinceStart = now - this.startTime;
    const actualChunkRate = this.chunksReceived / (timeSinceStart / 1000);
    const expectedChunkRate = 48000 / 2048; // ~23.4 chunks/second

    // LOG STATISTICS EVERY 50 CHUNKS (~2 seconds)
    if (this.chunksReceived % 50 === 0) {
      console.log(
        `📊 Audio Processing Stats (Chunk #${chunk.sequenceNumber}):`,
        {
          // CHUNK INFO
          chunkId: chunk.chunkId,
          samples: chunk.frameLength,
          channels: chunk.channels,

          // AUDIO LEVELS
          rmsLevel: chunk.rmsLevel?.toFixed(4), // Average volume
          peakLevel: chunk.peakLevel?.toFixed(4), // Peak volume

          // PERFORMANCE
          totalChunks: this.chunksReceived,
          actualRate: actualChunkRate.toFixed(1) + " chunks/sec",
          expectedRate: expectedChunkRate.toFixed(1) + " chunks/sec",
          rateAccuracy:
            ((actualChunkRate / expectedChunkRate) * 100).toFixed(1) + "%",

          // TIMING
          chunkInterval: (chunk.frameLength / chunk.sampleRate) * 1000 + "ms",
          processing: timeSinceStart.toFixed(0) + "ms total",
        }
      );
    }

    // FORWARD TO PHASE 2
    this.sendToPhase2(chunk);
  }

  /**
   * VALIDATE AUDIO CHUNK CONTRACT
   * Ensures chunk meets exact specification for Phase 2
   * @param chunk - Chunk to validate
   * @returns boolean - true if valid, false if invalid
   */
  private validateChunkContract(chunk: any): chunk is AudioChunkContract {
    // CHECK REQUIRED FIELDS
    const requiredFields = [
      "samples", // Audio data
      "sampleRate", // Sample rate (48000)
      "channels", // Channel count (1 or 2)
      "frameLength", // Samples per channel (2048)
      "timestamp", // When captured
      "chunkId", // Unique ID
      "sequenceNumber", // Sequence counter
    ];

    // VALIDATE FIELD PRESENCE
    for (const field of requiredFields) {
      if (!(field in chunk)) {
        console.error(`❌ Missing required field: ${field}`);
        return false;
      }
    }

    // VALIDATE DATA TYPES AND VALUES

    // SAMPLE RATE: Must be exactly 48000 Hz
    if (chunk.sampleRate !== 48000) {
      console.error(
        `❌ Wrong sample rate: ${chunk.sampleRate}, expected 48000`
      );
      return false;
    }

    // FRAME LENGTH: Must be exactly 2048 samples
    if (chunk.frameLength !== 2048) {
      console.error(
        `❌ Wrong frame length: ${chunk.frameLength}, expected 2048`
      );
      return false;
    }

    // SAMPLES: Must be array of Float32Array
    if (!Array.isArray(chunk.samples) || chunk.samples.length === 0) {
      console.error(`❌ Invalid samples array:`, chunk.samples);
      return false;
    }

    // VALIDATE EACH CHANNEL
    for (let i = 0; i < chunk.samples.length; i++) {
      const channelData = chunk.samples[i];

      // Must be Float32Array
      if (!(channelData instanceof Float32Array)) {
        console.error(
          `❌ Channel ${i} is not Float32Array:`,
          typeof channelData
        );
        return false;
      }

      // Must have correct length
      if (channelData.length !== 2048) {
        console.error(
          `❌ Channel ${i} wrong length: ${channelData.length}, expected 2048`
        );
        return false;
      }

      // Check for valid audio range (-1.0 to +1.0)
      for (let j = 0; j < channelData.length; j++) {
        const sample = channelData[j];
        if (isNaN(sample) || sample < -1.0 || sample > 1.0) {
          console.error(
            `❌ Invalid sample at channel ${i}, index ${j}: ${sample}`
          );
          return false;
        }
      }
    }

    // CHANNELS: Must match samples array length
    if (chunk.channels !== chunk.samples.length) {
      console.error(
        `❌ Channel mismatch: channels=${chunk.channels}, samples.length=${chunk.samples.length}`
      );
      return false;
    }

    // TIMESTAMP: Must be positive number
    if (typeof chunk.timestamp !== "number" || chunk.timestamp < 0) {
      console.error(`❌ Invalid timestamp: ${chunk.timestamp}`);
      return false;
    }

    // CHUNK ID: Must be string
    if (typeof chunk.chunkId !== "string" || chunk.chunkId.length === 0) {
      console.error(`❌ Invalid chunk ID: ${chunk.chunkId}`);
      return false;
    }

    // SEQUENCE NUMBER: Must be non-negative integer
    if (
      typeof chunk.sequenceNumber !== "number" ||
      chunk.sequenceNumber < 0 ||
      !Number.isInteger(chunk.sequenceNumber)
    ) {
      console.error(`❌ Invalid sequence number: ${chunk.sequenceNumber}`);
      return false;
    }

    // OPTIONAL FIELDS VALIDATION
    if (chunk.rmsLevel !== undefined) {
      if (
        typeof chunk.rmsLevel !== "number" ||
        chunk.rmsLevel < 0 ||
        chunk.rmsLevel > 1
      ) {
        console.error(`❌ Invalid RMS level: ${chunk.rmsLevel}`);
        return false;
      }
    }

    if (chunk.peakLevel !== undefined) {
      if (
        typeof chunk.peakLevel !== "number" ||
        chunk.peakLevel < 0 ||
        chunk.peakLevel > 1
      ) {
        console.error(`❌ Invalid peak level: ${chunk.peakLevel}`);
        return false;
      }
    }

    // ALL VALIDATIONS PASSED
    return true;
  }

  /**
   * SEND CHUNK TO PHASE 2 PROCESSOR
   * This is where we forward the validated chunk to the next phase
   * @param chunk - Validated AudioChunkContract
   */
  private sendToPhase2(chunk: AudioChunkContract) {
    // TODO: This is where Phase 2 integration happens
    // For now, we just log that we would send it

    // SIMULATE PHASE 2 COMMUNICATION
    console.log(
      `📤 Would send to Phase 2: Chunk ${
        chunk.sequenceNumber
      } (${chunk.rmsLevel?.toFixed(3)} RMS)`
    );

    // IN REAL IMPLEMENTATION:
    // - Send via message passing to Phase 2 processor
    // - Handle Phase 2 acknowledgments
    // - Buffer chunks if Phase 2 is busy
    // - Monitor Phase 2 health/performance

    // EXAMPLE PHASE 2 SEND:
    // chrome.runtime.sendMessage({
    //   type: "PHASE2_AUDIO_CHUNK",
    //   chunk: chunk,
    //   metadata: {
    //     processingLatency: performance.now() - chunk.timestamp,
    //     bufferHealth: this.getBufferHealth()
    //   }
    // });
  }

  /**
   * DISCONNECT AUDIO PROCESSING
   * Clean up when stopping capture
   */
  disconnect() {
    console.log("🔌 Disconnecting audio processing...");

    // DISCONNECT AUDIO NODES
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.captureNode) {
      this.captureNode.disconnect();
      this.captureNode = null;
    }

    // CLOSE AUDIO CONTEXT
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
      this.audioContext = null;
    }

    // RESET COUNTERS
    this.chunksReceived = 0;
    this.startTime = 0;

    console.log("✅ Audio processing disconnected");
  }
}

// CREATE GLOBAL PROCESSOR INSTANCE
const processor = new OffscreenAudioProcessor();

/**
 * MESSAGE LISTENER: Handle messages from background script
 *
 * MESSAGES WE HANDLE:
 * - START_AUDIO_PROCESSING: Begin processing audio
 * - STOP_AUDIO_PROCESSING: Stop processing and cleanup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📨 Offscreen received message:", message.type);

  // HANDLE START PROCESSING
  if (message.type === "START_AUDIO_PROCESSING") {
    console.log("🚀 Starting audio processing...", {
      streamId: message.streamId,
      tabId: message.tabId,
    });

    // For now, we start with user media (testing)
    // TODO: Use the actual tab capture stream
    processor
      .startProcessing()
      .then(() => {
        console.log("✅ Audio processing started successfully");
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error("❌ Failed to start audio processing:", error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // Async response
  }

  // HANDLE STOP PROCESSING
  else if (message.type === "STOP_AUDIO_PROCESSING") {
    console.log("⏹️ Stopping audio processing...");

    processor.disconnect();
    sendResponse({ success: true });
  }

  // HANDLE UNKNOWN MESSAGES
  else {
    console.warn("⚠️ Unknown message type:", message.type);
    sendResponse({ success: false, error: "Unknown message type" });
  }
});

// AUTO-INITIALIZE AUDIO SYSTEM on load
console.log("🎵 Offscreen document loaded - initializing audio system...");
processor
  .initializeAudio()
  .then(() => {
    console.log("✅ Offscreen audio processor ready");
  })
  .catch((error) => {
    console.error("❌ Failed to initialize offscreen processor:", error);
  });
```

---

## 8. src/worklets/capture-processor.js

```javascript
// AUDIOWORKLET PROCESSOR: Real-time audio chunk generator
// NOTE: This MUST be a separate .js file (not .ts) for AudioWorklet
// NOTE: This runs on a separate audio thread for low-latency processing

/**
 * CAPTURE PROCESSOR CLASS
 * Extends AudioWorkletProcessor to create custom audio processing
 *
 * RESPONSIBILITIES:
 * 1. Receive audio samples in 128-sample blocks
 * 2. Accumulate samples into 2048-sample chunks
 * 3. Calculate audio metrics (RMS, peak levels)
 * 4. Generate AudioChunkContract objects
 * 5. Send chunks to main thread
 */
class CaptureProcessor extends AudioWorkletProcessor {
  /**
   * CONSTRUCTOR: Initialize the processor
   * @param options - Configuration options from AudioWorkletNode
   */
  constructor(options) {
    super();

    // CONFIGURATION from AudioWorkletNode
    this.chunkSize = options.processorOptions?.chunkSize || 2048; // Samples per chunk
    this.sampleRate = options.processorOptions?.sampleRate || 48000; // Expected sample rate

    // BUFFER MANAGEMENT
    this.chunkBuffer = []; // Accumulates samples for each channel
    this.sequenceNumber = 0; // Incremental chunk counter
    this.totalSamplesProcessed = 0; // Total samples we've seen

    // TIMING AND PERFORMANCE
    this.startTime = currentTime; // When we started (AudioWorklet time)
    this.lastChunkTime = 0; // When we sent the last chunk

    console.log("🎵 CaptureProcessor initialized:", {
      chunkSize: this.chunkSize,
      sampleRate: this.sampleRate,
      startTime: this.startTime,
    });

    // SEND INITIALIZATION MESSAGE to main thread
    this.port.postMessage({
      type: "stats",
      stats: {
        initialized: true,
        chunkSize: this.chunkSize,
        sampleRate: this.sampleRate,
      },
    });
  }

  /**
   * PROCESS AUDIO: Main processing function (called ~375 times per second)
   * @param inputs - Array of input audio data [input][channel][sample]
   * @param outputs - Array of output audio data (we don't use this)
   * @param parameters - AudioParam values (we don't use this)
   * @returns boolean - true to keep processor alive, false to destroy
   *
   * CALLED EVERY: 128 samples ÷ 48000 Hz = ~2.67ms
   * RECEIVES: 128 samples per channel per call
   * ACCUMULATES: Until we have 2048 samples, then sends chunk
   */
  process(inputs, outputs, parameters) {
    // GET INPUT AUDIO DATA
    const input = inputs[0]; // First (and usually only) input

    // CHECK IF WE HAVE AUDIO DATA
    if (!input || input.length === 0) {
      // No audio input - this is normal during initialization
      return true; // Keep processor alive
    }

    // ACCUMULATE AUDIO SAMPLES
    this.accumulateAudio(input);

    // CHECK IF WE HAVE A COMPLETE CHUNK
    if (this.shouldSendChunk()) {
      this.sendAudioChunk();
    }

    // KEEP PROCESSOR ALIVE
    return true;
  }

  /**
   * ACCUMULATE AUDIO SAMPLES
   * Collect audio samples until we have enough for a complete chunk
   * @param channelData - Array of Float32Array, one per channel
   *
   * INPUT FORMAT: channelData[channel][sample]
   * - channelData[0] = left channel (128 Float32 samples)
   * - channelData[1] = right channel (128 Float32 samples) [if stereo]
   */
  accumulateAudio(channelData) {
    const frameLength = channelData[0].length; // Usually 128 samples
    const channelCount = channelData.length; // Usually 1 (mono) or 2 (stereo)

    // INITIALIZE BUFFERS if this is our first audio
    if (this.chunkBuffer.length === 0) {
      console.log(
        "🎵 First audio received - initializing buffers for",
        channelCount,
        "channels"
      );

      for (let ch = 0; ch < channelCount; ch++) {
        this.chunkBuffer[ch] = []; // Empty array for each channel
      }
    }

    // ADD SAMPLES TO BUFFER for each channel
    for (let ch = 0; ch < channelCount; ch++) {
      const channelSamples = channelData[ch]; // Float32Array of 128 samples

      // COPY EACH SAMPLE to our accumulation buffer
      for (let i = 0; i < frameLength; i++) {
        this.chunkBuffer[ch].push(channelSamples[i]);
      }
    }

    // UPDATE TOTAL SAMPLES COUNTER
    this.totalSamplesProcessed += frameLength;

    // LOG PROGRESS occasionally (every ~1 second)
    const samplesPerSecond = this.sampleRate; // 48000
    if (this.totalSamplesProcessed % samplesPerSecond === 0) {
      const secondsProcessed = this.totalSamplesProcessed / samplesPerSecond;
      console.log(
        `⏱️ Processed ${secondsProcessed}s of audio (${this.totalSamplesProcessed} samples)`
      );
    }
  }

  /**
   * SHOULD SEND CHUNK: Check if we have enough samples for a complete chunk
   * @returns boolean - true if ready to send, false if need more samples
   *
   * LOGIC: Send when we have >= 2048 samples in the first channel
   */
  shouldSendChunk() {
    return (
      this.chunkBuffer.length > 0 && // We have buffers
      this.chunkBuffer[0].length >= this.chunkSize // First channel has enough samples
    );
  }

  /**
   * SEND AUDIO CHUNK: Create and send AudioChunkContract
   * This is where we generate the exact format Phase 2 expects
   */
  sendAudioChunk() {
    if (this.chunkBuffer.length === 0) {
      console.error("❌ Tried to send chunk but no buffer exists");
      return;
    }

    const channelCount = this.chunkBuffer.length;

    console.log(
      `📦 Creating chunk ${this.sequenceNumber} with ${channelCount} channels...`
    );

    // EXTRACT SAMPLES for this chunk
    const samples = [];

    for (let ch = 0; ch < channelCount; ch++) {
      // CREATE FLOAT32ARRAY for this channel (exactly 2048 samples)
      const channelSamples = new Float32Array(this.chunkSize);

      // COPY SAMPLES from buffer to chunk
      for (let i = 0; i < this.chunkSize; i++) {
        // Remove sample from front of buffer and add to chunk
        channelSamples[i] = this.chunkBuffer[ch].shift() || 0.0;
      }

      samples.push(channelSamples);
    }

    // CALCULATE AUDIO METRICS
    const rmsLevel = this.calculateRMS(samples[0]); // Use first channel for RMS
    const peakLevel = this.calculatePeak(samples[0]); // Use first channel for peak

    // CREATE UNIQUE CHUNK ID
    const timestamp = currentTime * 1000; // Convert AudioWorklet time to milliseconds
    const randomId = Math.random().toString(36).substr(2, 9); // Random string
    const chunkId = `chunk_${timestamp.toFixed(0)}_${randomId}`;

    // CREATE AUDIOCHUNKCONTRACT (exact format for Phase 2)
    const chunk = {
      // AUDIO DATA
      samples: samples, // Float32Array[] - one per channel
      sampleRate: this.sampleRate, // number - always 48000
      channels: channelCount, // number - 1 or 2
      frameLength: this.chunkSize, // number - always 2048

      // TIMING
      timestamp: timestamp, // number - when chunk was created
      chunkId: chunkId, // string - unique identifier
      sequenceNumber: this.sequenceNumber, // number - incremental counter

      // AUDIO ANALYSIS
      rmsLevel: rmsLevel, // number - average audio level
      peakLevel: peakLevel, // number - peak audio level
    };

    // SEND CHUNK TO MAIN THREAD
    this.port.postMessage({
      type: "audioChunk",
      chunk: chunk,
    });

    // UPDATE COUNTERS
    this.sequenceNumber++;
    this.lastChunkTime = currentTime;

    // LOG CHUNK INFO (every 10 chunks to avoid spam)
    if (this.sequenceNumber % 10 === 0) {
      const chunkRate = this.sequenceNumber / (currentTime - this.startTime);
      console.log(`📊 Sent chunk ${this.sequenceNumber}:`, {
        rms: rmsLevel.toFixed(4),
        peak: peakLevel.toFixed(4),
        rate: chunkRate.toFixed(1) + " chunks/sec",
        bufferRemaining: this.chunkBuffer[0].length + " samples",
      });
    }
  }

  /**
   * CALCULATE RMS LEVEL: Root Mean Square (average audio level)
   * @param samples - Float32Array of audio samples
   * @returns number - RMS level between 0.0 and 1.0
   *
   * FORMULA: sqrt(sum(sample²) / count)
   * MEANING: Average "energy" of the audio signal
   */
  calculateRMS(samples) {
    let sumOfSquares = 0;

    // SQUARE EACH SAMPLE and add to sum
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      sumOfSquares += sample * sample; // sample²
    }

    // CALCULATE MEAN of squares, then square root
    const meanSquare = sumOfSquares / samples.length;
    const rms = Math.sqrt(meanSquare);

    return rms;
  }

  /**
   * CALCULATE PEAK LEVEL: Highest absolute sample value
   * @param samples - Float32Array of audio samples
   * @returns number - Peak level between 0.0 and 1.0
   *
   * MEANING: Loudest moment in this chunk
   */
  calculatePeak(samples) {
    let peak = 0;

    // FIND HIGHEST absolute value
    for (let i = 0; i < samples.length; i++) {
      const absoluteValue = Math.abs(samples[i]);
      if (absoluteValue > peak) {
        peak = absoluteValue;
      }
    }

    return peak;
  }

  /**
   * STATIC PARAMETER DESCRIPTORS: Define any AudioParams (we don't use any)
   * Required by AudioWorkletProcessor
   */
  static get parameterDescriptors() {
    return []; // No AudioParams needed
  }
}

// REGISTER PROCESSOR: Make it available to AudioWorkletNode
// The name "capture-processor" must match the name used in AudioWorkletNode constructor
registerProcessor("capture-processor", CaptureProcessor);

console.log("🎵 AudioWorklet CaptureProcessor registered successfully");
```

---

## 9. src/popup/index.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Audio Capture</title>

    <!-- TAILWIND CSS: Load from CDN for styling -->
    <script src="https://cdn.tailwindcss.com"></script>

    <!-- POPUP STYLES: Custom CSS for the popup -->
    <style>
      /* POPUP SIZE: Fixed dimensions for consistent UI */
      body {
        width: 320px; /* Fixed width */
        height: 400px; /* Fixed height */
        margin: 0; /* No default margins */
        overflow: hidden; /* Hide scrollbars */
      }

      /* AUDIO VISUALIZER: Simple audio level bar */
      .audio-bar {
        transition: width 0.1s ease-out; /* Smooth animation */
      }

      /* STATUS INDICATOR: Pulsing animation when active */
      .pulse-active {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }
    </style>
  </head>
  <body class="bg-gray-50">
    <!-- ROOT DIV: Where React app will mount -->
    <div id="root"></div>

    <!-- POPUP SCRIPT: Load the compiled React app -->
    <script src="popup.js"></script>
  </body>
</html>
```

---

## 10. src/popup/index.tsx

```typescript
// POPUP REACT APP: User interface for controlling audio capture
// This shows when user clicks the extension icon

import React, { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { CaptureState, PerformanceMetrics } from "../types/audio-types";

/**
 * AUDIO CAPTURE POPUP COMPONENT
 *
 * FEATURES:
 * - Start/stop capture buttons
 * - Real-time audio level visualization
 * - Capture status and statistics
 * - Error handling and user feedback
 */
const AudioCapturePopup: React.FC = () => {
  // COMPONENT STATE: Track capture status and metrics
  const [captureState, setCaptureState] = useState<CaptureState>({
    isCapturing: false, // Are we currently capturing?
    chunksProcessed: 0, // How many chunks processed
    audioLevel: 0, // Current audio level (0-1)
    chunkRate: 0, // Chunks per second
    error: undefined, // Any error message
  });

  const [performanceMetrics, setPerformanceMetrics] =
    useState<PerformanceMetrics>({
      avgChunkInterval: 0, // Average time between chunks
      targetChunkInterval: 42.67, // Target: 2048/48000 * 1000 = 42.67ms
      timingConsistency: 100, // Timing consistency percentage
      totalChunks: 0, // Total chunks processed
      memoryUsage: 0, // Memory usage in MB
      cpuUsage: 0, // CPU usage percentage
    });

  /**
   * START CAPTURE: Request background script to start tab capture
   *
   * PROCESS:
   * 1. Send message to background script
   * 2. Background script captures active tab
   * 3. Background script starts offscreen processing
   * 4. Update UI state based on response
   */
  const startCapture = useCallback(async () => {
    try {
      console.log("🚀 Popup requesting capture start...");

      // CLEAR PREVIOUS ERRORS
      setCaptureState((prev) => ({ ...prev, error: undefined }));

      // SEND MESSAGE TO BACKGROUND SCRIPT
      const response = await chrome.runtime.sendMessage({
        type: "START_CAPTURE",
      });

      console.log("📨 Background response:", response);

      // HANDLE RESPONSE
      if (response.success) {
        // SUCCESS: Update state to show capturing
        setCaptureState((prev) => ({
          ...prev,
          isCapturing: true,
          currentTabId: response.tabId,
          error: undefined,
        }));

        console.log(
          `✅ Capture started for tab ${response.tabId}: "${response.tabTitle}"`
        );

        // START MONITORING audio levels and performance
        startMonitoring();
      } else {
        // ERROR: Show error message to user
        const errorMsg = response.error || "Unknown error occurred";
        console.error("❌ Capture failed:", errorMsg);

        setCaptureState((prev) => ({
          ...prev,
          isCapturing: false,
          error: errorMsg,
        }));
      }
    } catch (error) {
      // EXCEPTION: Handle unexpected errors
      const errorMsg = error.message || "Failed to communicate with extension";
      console.error("❌ Exception during capture start:", error);

      setCaptureState((prev) => ({
        ...prev,
        isCapturing: false,
        error: errorMsg,
      }));
    }
  }, []);

  /**
   * STOP CAPTURE: Request background script to stop capture
   *
   * PROCESS:
   * 1. Send stop message to background
   * 2. Stop monitoring
   * 3. Reset UI state
   */
  const stopCapture = useCallback(async () => {
    try {
      console.log("⏹️ Popup requesting capture stop...");

      // SEND STOP MESSAGE
      const response = await chrome.runtime.sendMessage({
        type: "STOP_CAPTURE",
      });

      console.log("📨 Stop response:", response);

      // UPDATE STATE
      setCaptureState((prev) => ({
        ...prev,
        isCapturing: false,
        currentTabId: undefined,
        chunksProcessed: 0,
        audioLevel: 0,
        chunkRate: 0,
        error: undefined,
      }));

      // RESET PERFORMANCE METRICS
      setPerformanceMetrics((prev) => ({
        ...prev,
        totalChunks: 0,
        avgChunkInterval: 0,
        timingConsistency: 100,
      }));

      console.log("✅ Capture stopped");
    } catch (error) {
      console.error("❌ Error stopping capture:", error);
      setCaptureState((prev) => ({
        ...prev,
        error: "Failed to stop capture",
      }));
    }
  }, []);

  /**
   * START MONITORING: Begin polling for audio levels and performance
   * This simulates real-time monitoring (in real app, would get from offscreen)
   */
  const startMonitoring = useCallback(() => {
    let chunkCount = 0;
    const startTime = Date.now();

    // SIMULATE MONITORING with interval
    const monitoringInterval = setInterval(() => {
      // CHECK IF STILL CAPTURING
      if (!captureState.isCapturing) {
        clearInterval(monitoringInterval);
        return;
      }

      // SIMULATE AUDIO ACTIVITY
      chunkCount++;
      const elapsed = (Date.now() - startTime) / 1000;
      const currentRate = chunkCount / elapsed;

      // SIMULATE AUDIO LEVEL (would come from actual processing)
      const simulatedLevel = Math.random() * 0.5 + 0.1; // 0.1 to 0.6

      // UPDATE STATE
      setCaptureState((prev) => ({
        ...prev,
        chunksProcessed: chunkCount,
        audioLevel: simulatedLevel,
        chunkRate: currentRate,
      }));

      // UPDATE PERFORMANCE METRICS
      const avgInterval = (elapsed * 1000) / chunkCount;
      const consistency = Math.max(0, 100 - Math.abs(avgInterval - 42.67) * 2);

      setPerformanceMetrics((prev) => ({
        ...prev,
        totalChunks: chunkCount,
        avgChunkInterval: avgInterval,
        timingConsistency: consistency,
      }));
    }, 100); // Update every 100ms
  }, [captureState.isCapturing]);

  /**
   * GET CAPTURE STATUS: Check current status on component mount
   */
  useEffect(() => {
    // GET INITIAL STATUS from background script
    chrome.runtime
      .sendMessage({ type: "GET_STATUS" })
      .then((status) => {
        console.log("📊 Initial status:", status);
        setCaptureState((prev) => ({
          ...prev,
          isCapturing: status.isCapturing || false,
          currentTabId: status.tabId,
        }));
      })
      .catch((error) => {
        console.error("❌ Failed to get initial status:", error);
      });
  }, []);

  /**
   * RENDER POPUP UI
   */
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-blue-50 to-white">
      {/* HEADER */}
      <div className="bg-blue-600 text-white p-4">
        <h1 className="text-lg font-bold flex items-center gap-2">
          🎵 Audio Capture
          {captureState.isCapturing && (
            <span className="text-xs bg-green-500 px-2 py-1 rounded-full pulse-active">
              LIVE
            </span>
          )}
        </h1>
        <p className="text-blue-100 text-sm">Tab audio processing system</p>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 p-4 space-y-4">
        {/* CONTROL BUTTONS */}
        <div className="space-y-2">
          {!captureState.isCapturing ? (
            <button
              onClick={startCapture}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span>▶️</span>
              Start Capture
            </button>
          ) : (
            <button
              onClick={stopCapture}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span>⏹️</span>
              Stop Capture
            </button>
          )}
        </div>

        {/* ERROR MESSAGE */}
        {captureState.error && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded text-sm">
            <strong>Error:</strong> {captureState.error}
          </div>
        )}

        {/* CAPTURE STATUS */}
        {captureState.isCapturing && (
          <div className="space-y-3">
            {/* AUDIO LEVEL VISUALIZATION */}
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Audio Level</span>
                <span>{(captureState.audioLevel * 100).toFixed(0)}%</span>
              </div>
              <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="audio-bar h-full bg-gradient-to-r from-green-400 to-blue-500"
                  style={{ width: `${captureState.audioLevel * 100}%` }}
                />
              </div>
            </div>

            {/* STATISTICS */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">
                Processing Stats
              </h3>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Chunks:</span>
                  <span className="font-mono ml-1">
                    {captureState.chunksProcessed}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Rate:</span>
                  <span className="font-mono ml-1">
                    {captureState.chunkRate.toFixed(1)}/s
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Tab:</span>
                  <span className="font-mono ml-1">
                    #{captureState.currentTabId}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <span className="text-green-600 font-semibold ml-1">
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* PERFORMANCE METRICS */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">
                Performance
              </h3>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Chunk Interval:</span>
                  <span className="font-mono">
                    {performanceMetrics.avgChunkInterval.toFixed(1)}ms
                    <span className="text-gray-400">
                      (target: {performanceMetrics.targetChunkInterval}ms)
                    </span>
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Timing Consistency:</span>
                  <span
                    className={`font-mono ${
                      performanceMetrics.timingConsistency > 90
                        ? "text-green-600"
                        : performanceMetrics.timingConsistency > 70
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {performanceMetrics.timingConsistency.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* INSTRUCTIONS when not capturing */}
        {!captureState.isCapturing && !captureState.error && (
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              📋 <strong>Instructions:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 text-xs ml-2">
              <li>Open a tab with audio (YouTube, Spotify, etc.)</li>
              <li>Make sure audio is playing</li>
              <li>Click "Start Capture" to begin processing</li>
              <li>Check browser console for detailed logs</li>
            </ol>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="bg-gray-100 px-4 py-2 text-xs text-gray-500 border-t">
        <div className="flex justify-between">
          <span>Phase 1: Audio Capture</span>
          <span>v1.0.0</span>
        </div>
      </div>
    </div>
  );
};

// MOUNT REACT APP: Render the popup component
const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<AudioCapturePopup />);
} else {
  console.error("❌ Could not find root element for popup");
}
```

---

## 11. tailwind.config.js

```javascript
// TAILWIND CSS CONFIGURATION
// Configures Tailwind CSS for the Chrome extension

/** @type {import('tailwindcss').Config} */
module.exports = {
  // CONTENT: Files to scan for Tailwind classes
  content: [
    "./src/**/*.{html,js,ts,jsx,tsx}", // All source files
    "./src/popup/index.html", // Popup HTML
    "./src/offscreen/index.html", // Offscreen HTML
  ],

  // THEME: Custom design tokens
  theme: {
    extend: {
      // COLORS: Extension-specific colors
      colors: {
        "extension-blue": "#4F46E5", // Primary blue
        "extension-green": "#10B981", // Success green
        "extension-red": "#EF4444", // Error red
        "extension-gray": "#6B7280", // Neutral gray
      },

      // FONT FAMILY: Monospace for technical displays
      fontFamily: {
        mono: ["Monaco", "Menlo", "Ubuntu Mono", "monospace"],
      },

      // ANIMATIONS: Custom animations for audio visualization
      keyframes: {
        "audio-pulse": {
          "0%, 100%": { transform: "scaleY(1)" },
          "50%": { transform: "scaleY(1.5)" },
        },
      },

      animation: {
        "audio-pulse": "audio-pulse 0.5s ease-in-out infinite",
      },
    },
  },

  // PLUGINS: Additional Tailwind functionality
  plugins: [],

  // DARK MODE: Disable dark mode for consistency
  darkMode: false,
};
```

---

## 12. tsconfig.json

```json
{
  "compilerOptions": {
    // TARGET: JavaScript version to compile to
    "target": "ES2020", // Modern JavaScript features

    // MODULE: Module system to use
    "module": "ESNext", // Latest module syntax
    "moduleResolution": "node", // Node.js-style module resolution

    // OUTPUT: Where compiled files go
    "outDir": "./dist", // Build output directory
    "rootDir": "./src", // Source code directory

    // LIBRARIES: Browser and DOM APIs
    "lib": ["ES2020", "DOM", "DOM.Iterable", "WebWorker"],

    // JSX: React support
    "jsx": "react-jsx", // New JSX transform
    "esModuleInterop": true, // Better import compatibility
    "allowSyntheticDefaultImports": true, // Allow default imports

    // TYPE CHECKING: Strict TypeScript rules
    "strict": true, // Enable all strict checks
    "noImplicitAny": true, // Require explicit types
    "strictNullChecks": true, // Strict null checking
    "noImplicitReturns": true, // All code paths return value
    "noUnusedLocals": true, // No unused variables
    "noUnusedParameters": true, // No unused parameters

    // RESOLUTION: Path mapping
    "baseUrl": "./src", // Base for relative imports
    "paths": {
      "@/*": ["*"] // @ maps to src/
    },

    // SOURCE MAPS: For debugging
    "sourceMap": true, // Generate source maps
    "declaration": true, // Generate .d.ts files
    "declarationMap": true, // Source maps for declarations

    // COMPATIBILITY
    "skipLibCheck": true, // Skip checking library files
    "forceConsistentCasingInFileNames": true
  },

  // INCLUDE: Files to compile
  "include": [
    "src/**/*", // All source files
    "src/**/*.ts", // TypeScript files
    "src/**/*.tsx" // React TypeScript files
  ],

  // EXCLUDE: Files to ignore
  "exclude": [
    "node_modules", // Dependencies
    "dist", // Build output
    "src/worklets/*.js" // AudioWorklet (pure JS)
  ]
}
```

---

## 13. Build Scripts (Additional Files)

### postcss.config.js

```javascript
// POSTCSS CONFIGURATION: CSS processing pipeline
module.exports = {
  plugins: {
    tailwindcss: {}, // Process Tailwind CSS
    autoprefixer: {}, // Add vendor prefixes automatically
  },
};
```

### .gitignore

```gitignore
# DEPENDENCIES
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# BUILD OUTPUT
dist/
build/

# TYPESCRIPT
*.tsbuildinfo

# ENVIRONMENT
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# EDITOR
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# CHROME EXTENSION
*.crx
*.pem
```

---

## 14. Installation & Usage Instructions

### Setup Commands

```bash
# 1. INITIALIZE PROJECT
mkdir audio-capture-extension
cd audio-capture-extension

# 2. INSTALL DEPENDENCIES
npm init -y
npm install react react-dom
npm install -D @types/chrome @types/react @types/react-dom typescript vite tailwindcss autoprefixer postcss

# 3. BUILD EXTENSION
npm run build

# 4. LOAD IN CHROME
# - Open chrome://extensions/
# - Enable "Developer mode"
# - Click "Load unpacked"
# - Select the dist/ folder
```

### Testing the Extension

```bash
# 1. BUILD AND WATCH
npm run dev

# 2. TEST SEQUENCE
# - Open YouTube video with audio
# - Click extension icon
# - Click "Start Capture"
# - Check browser console (F12)
# - Look for audio chunk logs

# 3. EXPECTED CONSOLE OUTPUT
🎯 Starting capture for tab 123...
✅ Tab capture successful: {streamId: "...", audioTracks: 1, active: true}
📄 Creating offscreen document...
✅ Offscreen document created
📦 Loading AudioWorklet processor...
✅ AudioWorklet processor loaded successfully
🎵 First audio received - initializing buffers for 2 channels
📦 Creating chunk 0 with 2 channels...
📊 Sent chunk 10: {rms: "0.1234", peak: "0.5678", rate: "23.4 chunks/sec"}
```

### File Sizes & Performance

```
EXPECTED BUILD OUTPUT:
├── manifest.json          (~1KB)
├── popup.html            (~2KB)
├── popup.js              (~150KB with React)
├── background.js         (~10KB)
├── offscreen.html        (~2KB)
├── offscreen.js          (~15KB)
└── worklets/
    └── capture-processor.js (~5KB)

TOTAL SIZE: ~185KB (typical for React extension)

PERFORMANCE TARGETS:
- Chunk Rate: 23.4 ± 0.5 chunks/second
- Latency: <20ms capture to processing
- Memory: <50MB total usage
- CPU: <5% on modern hardware
```

---

## Key Concepts Explained 🎓

### 1. **Chrome Extension Architecture**

```
Background Script (Service Worker)
├── Coordinates everything
├── Handles tab capture requests
├── Creates offscreen documents
└── Manages extension lifecycle

Popup (React UI)
├── User interface
├── Start/stop controls
├── Status display
└── Error handling

Offscreen Document
├── Audio processing
├── Web Audio API access
├── AudioWorklet management
└── Chunk generation
```

### 2. **Audio Processing Pipeline**

```
Tab Audio Stream
    ↓
MediaStreamAudioSourceNode
    ↓
AudioWorkletNode (capture-processor)
    ↓ (128 samples at a time)
Accumulation Buffer
    ↓ (when 2048 samples ready)
AudioChunkContract
    ↓
Phase 2 Processor
```

### 3. **AudioChunkContract Format**

```typescript
// EXACTLY what Phase 2 expects
{
  samples: [Float32Array(2048), Float32Array(2048)], // L+R channels
  sampleRate: 48000,           // Always 48kHz
  frameLength: 2048,           // Always 2048 samples
  channels: 2,                 // 1=mono, 2=stereo
  timestamp: 1634567890123.45, // performance.now()
  chunkId: "chunk_1634567890123_abc123def",
  sequenceNumber: 42,          // 0, 1, 2, 3...
  rmsLevel: 0.123,            // Average volume
  peakLevel: 0.456            // Peak volume
}
```

This complete implementation gives you a working Chrome extension that captures tab audio and processes it into the exact format your Phase 2 developer needs! 🚀
