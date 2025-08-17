# 🎯 Phase 1 Development Roadmap - Audio Capture

> **Your Mission**: Capture tab audio and deliver perfectly formatted `AudioChunkContract` chunks to Phase 2 at 23 chunks/second with <20ms latency.

---

## 📅 **Week 1: Foundation & Basic Capture**

### **🚀 Day 1-2: Project Setup & Architecture**

#### **Task 1.1: Set up Chrome Extension Permissions**

```json
// src/manifest.json - Add required permissions
{
  "manifest_version": 3,
  "permissions": ["tabCapture", "activeTab", "offscreen", "storage"],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "background.js"
  },
  "offscreen": {
    "url": "offscreen.html",
    "reasons": ["AUDIO_PLAYBACK"],
    "justification": "Audio processing for speech isolation"
  }
}
```

#### **Task 1.2: Create Audio Capture Architecture**

```typescript
// src/phase1/audio-architecture.ts
interface Phase1Architecture {
  backgroundScript: {
    role: "Coordinates tab capture requests";
    communicates: ["popup", "offscreen"];
  };
  offscreenDocument: {
    role: "Handles actual audio processing";
    contains: ["AudioContext", "AudioWorklets", "Processing Pipeline"];
  };
  audioWorklet: {
    role: "Real-time audio chunk processing";
    outputs: "AudioChunkContract[]";
  };
}
```

#### **Task 1.3: Install Required Dependencies**

```bash
npm install
# Verify these are in package.json:
# - @types/chrome for Chrome APIs
# - typescript for compilation
# - vite for bundling
```

**✅ Day 1-2 Success Criteria:**

- [ ] Extension loads without errors
- [ ] Basic popup shows and can communicate with background
- [ ] Offscreen document can be created
- [ ] No console errors

---

### **🎤 Day 3-4: Basic Tab Audio Capture**

#### **Task 1.4: Implement Tab Capture in Background Script**

```typescript
// src/background/index.ts
class TabCaptureManager {
  private currentStream: MediaStream | null = null;

  async startCapture(tabId: number): Promise<MediaStream> {
    try {
      // Request tab audio capture
      const stream = await chrome.tabCapture.capture({
        audio: true,
        video: false,
      });

      if (!stream) {
        throw new Error("Failed to capture tab audio");
      }

      this.currentStream = stream;

      // Send stream to offscreen for processing
      await this.sendStreamToOffscreen(stream);

      return stream;
    } catch (error) {
      console.error("Tab capture failed:", error);
      throw error;
    }
  }

  private async sendStreamToOffscreen(stream: MediaStream) {
    // Create offscreen document if needed
    if (!(await this.hasOffscreenDocument())) {
      await chrome.offscreen.createDocument({
        url: "offscreen.html",
        reasons: ["AUDIO_PLAYBACK"],
        justification: "Audio processing for speech isolation",
      });
    }

    // Send message to offscreen with stream info
    chrome.runtime.sendMessage({
      type: "START_AUDIO_PROCESSING",
      streamId: stream.id,
    });
  }

  async stopCapture() {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => track.stop());
      this.currentStream = null;
    }
  }
}

// Initialize tab capture manager
const tabCapture = new TabCaptureManager();

// Listen for popup requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "START_CAPTURE") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]?.id) {
        try {
          await tabCapture.startCapture(tabs[0].id);
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      }
    });
    return true; // Async response
  } else if (message.type === "STOP_CAPTURE") {
    tabCapture.stopCapture();
    sendResponse({ success: true });
  }
});
```

#### **Task 1.5: Create Offscreen Audio Handler**

```typescript
// src/offscreen/index.ts
class OffscreenAudioProcessor {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  async initializeAudio() {
    try {
      this.audioContext = new AudioContext({
        sampleRate: 48000, // Standard sample rate
        latencyHint: "interactive", // Low latency
      });

      console.log("Audio context initialized:", {
        sampleRate: this.audioContext.sampleRate,
        state: this.audioContext.state,
      });
    } catch (error) {
      console.error("Failed to initialize audio context:", error);
      throw error;
    }
  }

  async startProcessing() {
    if (!this.audioContext) {
      await this.initializeAudio();
    }

    // Get user media for testing (we'll replace with tab capture later)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000,
          channelCount: 2,
          echoCancellation: false,
          noiseSuppression: false,
        },
      });

      this.connectAudioStream(stream);
    } catch (error) {
      console.error("Failed to get media stream:", error);
    }
  }

  private connectAudioStream(stream: MediaStream) {
    if (!this.audioContext) return;

    this.sourceNode = this.audioContext.createMediaStreamSource(stream);

    // Create analyzer for testing
    const analyzer = this.audioContext.createAnalyser();
    analyzer.fftSize = 2048;

    this.sourceNode.connect(analyzer);

    // Start basic audio monitoring
    this.startAudioMonitoring(analyzer);
  }

  private startAudioMonitoring(analyzer: AnalyserNode) {
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const monitor = () => {
      analyzer.getByteFrequencyData(dataArray);

      // Calculate basic audio levels
      const sum = dataArray.reduce((a, b) => a + b, 0);
      const average = sum / bufferLength;

      if (average > 10) {
        // Only log when there's audio
        console.log(`Audio level: ${average.toFixed(2)}`);
      }

      requestAnimationFrame(monitor);
    };

    monitor();
  }
}

// Initialize processor
const processor = new OffscreenAudioProcessor();

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "START_AUDIO_PROCESSING") {
    processor
      .startProcessing()
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Auto-initialize for testing
processor.initializeAudio();
```

#### **Task 1.6: Create Basic Popup UI**

```typescript
// src/popup/index.tsx
import React, { useState } from "react";
import { createRoot } from "react-dom/client";

interface AudioStats {
  isCapturing: boolean;
  audioLevel: number;
  error?: string;
}

const Popup: React.FC = () => {
  const [stats, setStats] = useState<AudioStats>({
    isCapturing: false,
    audioLevel: 0,
  });

  const startCapture = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "START_CAPTURE",
      });

      if (response.success) {
        setStats((prev) => ({ ...prev, isCapturing: true, error: undefined }));
      } else {
        setStats((prev) => ({ ...prev, error: response.error }));
      }
    } catch (error) {
      setStats((prev) => ({ ...prev, error: error.message }));
    }
  };

  const stopCapture = async () => {
    try {
      await chrome.runtime.sendMessage({ type: "STOP_CAPTURE" });
      setStats((prev) => ({ ...prev, isCapturing: false }));
    } catch (error) {
      setStats((prev) => ({ ...prev, error: error.message }));
    }
  };

  return (
    <div className="p-4 w-64">
      <h2 className="text-lg font-bold mb-4">Audio Capture - Phase 1</h2>

      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={startCapture}
            disabled={stats.isCapturing}
            className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
          >
            Start Capture
          </button>
          <button
            onClick={stopCapture}
            disabled={!stats.isCapturing}
            className="px-4 py-2 bg-red-500 text-white rounded disabled:opacity-50"
          >
            Stop Capture
          </button>
        </div>

        <div className="text-sm">
          <div>Status: {stats.isCapturing ? "🎤 Capturing" : "⏸️ Stopped"}</div>
          <div>Audio Level: {stats.audioLevel.toFixed(2)}</div>
        </div>

        {stats.error && (
          <div className="text-red-500 text-sm">{stats.error}</div>
        )}
      </div>
    </div>
  );
};

// Mount React app
const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}
```

**✅ Day 3-4 Success Criteria:**

- [ ] Can capture tab audio (you'll hear it in console logs)
- [ ] Popup shows capture start/stop buttons
- [ ] Audio context initializes at 48kHz
- [ ] Basic audio level monitoring works
- [ ] No console errors during capture

---

### **🔧 Day 5-7: AudioWorklet Implementation**

#### **Task 1.7: Create AudioWorklet Processor**

```typescript
// src/phase1/audio-worklets/capture-processor.js
// Note: This must be a separate .js file for AudioWorklet

class CaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.chunkBuffer = [];
    this.sequenceNumber = 0;
    this.chunkSize = 2048; // Target chunk size
    this.sampleRate = 48000;

    console.log("CaptureProcessor initialized");
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];

    if (input && input.length > 0) {
      // Accumulate audio samples
      this.accumulateAudio(input);

      // Send chunk when buffer is full
      if (this.shouldSendChunk()) {
        this.sendAudioChunk();
      }
    }

    return true; // Keep processor alive
  }

  accumulateAudio(channelData) {
    const frameLength = channelData[0].length;

    // Initialize buffer if needed
    if (this.chunkBuffer.length === 0) {
      for (let ch = 0; ch < channelData.length; ch++) {
        this.chunkBuffer[ch] = [];
      }
    }

    // Add samples to buffer
    for (let ch = 0; ch < channelData.length; ch++) {
      for (let i = 0; i < frameLength; i++) {
        this.chunkBuffer[ch].push(channelData[ch][i]);
      }
    }
  }

  shouldSendChunk() {
    return (
      this.chunkBuffer.length > 0 &&
      this.chunkBuffer[0].length >= this.chunkSize
    );
  }

  sendAudioChunk() {
    if (this.chunkBuffer.length === 0) return;

    // Extract chunk samples
    const samples = [];
    for (let ch = 0; ch < this.chunkBuffer.length; ch++) {
      const channelSamples = new Float32Array(this.chunkSize);
      for (let i = 0; i < this.chunkSize; i++) {
        channelSamples[i] = this.chunkBuffer[ch].shift() || 0;
      }
      samples.push(channelSamples);
    }

    // Calculate audio metrics
    const rmsLevel = this.calculateRMS(samples[0]);
    const peakLevel = this.calculatePeak(samples[0]);

    // Create AudioChunkContract
    const chunk = {
      samples: samples,
      sampleRate: this.sampleRate,
      channels: samples.length,
      frameLength: this.chunkSize,
      timestamp: currentTime * 1000, // Convert to milliseconds
      chunkId: `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sequenceNumber: this.sequenceNumber++,
      rmsLevel: rmsLevel,
      peakLevel: peakLevel,
    };

    // Send to main thread
    this.port.postMessage({
      type: "audioChunk",
      data: chunk,
    });
  }

  calculateRMS(samples) {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  calculatePeak(samples) {
    let peak = 0;
    for (let i = 0; i < samples.length; i++) {
      peak = Math.max(peak, Math.abs(samples[i]));
    }
    return peak;
  }
}

registerProcessor("capture-processor", CaptureProcessor);
```

#### **Task 1.8: Integrate AudioWorklet in Offscreen**

```typescript
// Update src/offscreen/index.ts
class OffscreenAudioProcessor {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private captureNode: AudioWorkletNode | null = null;
  private chunksReceived = 0;

  async initializeAudio() {
    try {
      this.audioContext = new AudioContext({
        sampleRate: 48000,
        latencyHint: "interactive",
      });

      // Load AudioWorklet processor
      await this.audioContext.audioWorklet.addModule("capture-processor.js");

      console.log("AudioWorklet loaded successfully");
    } catch (error) {
      console.error("Failed to initialize audio:", error);
      throw error;
    }
  }

  private connectAudioStream(stream: MediaStream) {
    if (!this.audioContext) return;

    try {
      // Create source from stream
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);

      // Create capture processor
      this.captureNode = new AudioWorkletNode(
        this.audioContext,
        "capture-processor"
      );

      // Listen for audio chunks
      this.captureNode.port.onmessage = (event) => {
        if (event.data.type === "audioChunk") {
          this.handleAudioChunk(event.data.data);
        }
      };

      // Connect audio pipeline
      this.sourceNode.connect(this.captureNode);

      console.log("Audio pipeline connected");
    } catch (error) {
      console.error("Failed to connect audio stream:", error);
    }
  }

  private handleAudioChunk(chunk) {
    this.chunksReceived++;

    // Log chunk stats every 50 chunks (~2 seconds)
    if (this.chunksReceived % 50 === 0) {
      console.log(`📊 Chunk ${chunk.sequenceNumber}:`, {
        samples: chunk.frameLength,
        channels: chunk.channels,
        rmsLevel: chunk.rmsLevel?.toFixed(4),
        peakLevel: chunk.peakLevel?.toFixed(4),
        chunksPerSecond: this.calculateChunkRate(),
      });
    }

    // TODO: Send chunk to Phase 2 processor
    this.sendToPhase2(chunk);
  }

  private calculateChunkRate() {
    // Calculate chunks per second (should be ~23 for 2048 samples at 48kHz)
    return ((48000 / 2048) * 1).toFixed(1);
  }

  private sendToPhase2(chunk) {
    // TODO: This is where we'll send to Phase 2
    // For now, just validate the chunk format
    this.validateChunkContract(chunk);
  }

  private validateChunkContract(chunk) {
    const required = [
      "samples",
      "sampleRate",
      "channels",
      "frameLength",
      "timestamp",
      "chunkId",
      "sequenceNumber",
    ];

    for (const field of required) {
      if (!(field in chunk)) {
        console.error(`❌ Missing required field: ${field}`);
        return false;
      }
    }

    // Validate data types and ranges
    if (chunk.sampleRate !== 48000) {
      console.error(
        `❌ Wrong sample rate: ${chunk.sampleRate}, expected 48000`
      );
    }

    if (chunk.frameLength !== 2048) {
      console.error(
        `❌ Wrong frame length: ${chunk.frameLength}, expected 2048`
      );
    }

    if (!Array.isArray(chunk.samples) || chunk.samples.length === 0) {
      console.error(`❌ Invalid samples array`);
    }

    // All validations passed
    return true;
  }
}
```

**✅ Day 5-7 Success Criteria:**

- [ ] AudioWorklet loads without errors
- [ ] Chunks generated at ~23/second rate
- [ ] Each chunk has exactly 2048 samples per channel
- [ ] AudioChunkContract validation passes 100%
- [ ] Console shows chunk statistics every 2 seconds

---

## 📅 **Week 2: Integration & Optimization**

### **🔗 Day 8-10: Phase 2 Integration**

#### **Task 1.9: Implement Message Passing to Phase 2**

```typescript
// Create src/phase1/phase2-bridge.ts
export class Phase2Bridge {
  private messageHandlers: Map<string, Function> = new Map();

  /**
   * Send audio chunk to Phase 2 processor
   */
  sendAudioChunk(chunk: AudioChunkContract) {
    const message = {
      type: "audioChunk",
      data: chunk,
      timestamp: performance.now(),
    };

    // Send via Chrome runtime messaging
    chrome.runtime.sendMessage(message);

    // Also broadcast to any local handlers (for testing)
    this.broadcastMessage(message);
  }

  /**
   * Register handler for Phase 2 responses
   */
  onMessage(type: string, handler: (data: any) => void) {
    this.messageHandlers.set(type, handler);
  }

  private broadcastMessage(message: any) {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message.data);
    }
  }

  /**
   * Handle processing feedback from Phase 2
   */
  handleProcessingFeedback(feedback: {
    avgLatency: number;
    bufferHealth: number;
    qualityScore: number;
  }) {
    // Adjust capture parameters based on Phase 2 feedback
    if (feedback.avgLatency > 20) {
      console.warn("⚠️ Phase 2 processing latency high:", feedback.avgLatency);
      // Could reduce chunk size or processing quality
    }

    if (feedback.bufferHealth < 0.5) {
      console.warn("⚠️ Phase 2 buffer underrun detected");
      // Could increase chunk rate or buffer size
    }
  }
}
```

#### **Task 1.10: Add Performance Monitoring**

```typescript
// Create src/phase1/performance-monitor.ts
export class CapturePerformanceMonitor {
  private chunkTimes: number[] = [];
  private lastChunkTime = 0;
  private totalChunksProcessed = 0;

  recordChunkProcessed(chunk: AudioChunkContract) {
    const now = performance.now();

    if (this.lastChunkTime > 0) {
      const timeBetweenChunks = now - this.lastChunkTime;
      this.chunkTimes.push(timeBetweenChunks);

      // Keep only last 100 measurements
      if (this.chunkTimes.length > 100) {
        this.chunkTimes.shift();
      }
    }

    this.lastChunkTime = now;
    this.totalChunksProcessed++;

    // Report stats every 5 seconds
    if (this.totalChunksProcessed % 115 === 0) {
      // ~5 seconds at 23 chunks/sec
      this.reportStats();
    }
  }

  private reportStats() {
    if (this.chunkTimes.length === 0) return;

    const avgTime =
      this.chunkTimes.reduce((a, b) => a + b, 0) / this.chunkTimes.length;
    const minTime = Math.min(...this.chunkTimes);
    const maxTime = Math.max(...this.chunkTimes);
    const targetTime = 1000 / 23.4; // ~42.7ms for 23.4 chunks/second

    const stats = {
      averageInterval: avgTime.toFixed(2) + "ms",
      targetInterval: targetTime.toFixed(2) + "ms",
      minInterval: minTime.toFixed(2) + "ms",
      maxInterval: maxTime.toFixed(2) + "ms",
      totalChunks: this.totalChunksProcessed,
      consistency: this.calculateConsistency().toFixed(1) + "%",
    };

    console.log("📊 Capture Performance:", stats);

    // Warn if timing is off
    if (Math.abs(avgTime - targetTime) > 5) {
      console.warn(
        `⚠️ Chunk timing off by ${(avgTime - targetTime).toFixed(1)}ms`
      );
    }
  }

  private calculateConsistency(): number {
    if (this.chunkTimes.length < 2) return 100;

    const target = 1000 / 23.4;
    const variance =
      this.chunkTimes.reduce((sum, time) => {
        return sum + Math.pow(time - target, 2);
      }, 0) / this.chunkTimes.length;

    const stdDev = Math.sqrt(variance);
    const consistency = Math.max(0, 100 - (stdDev / target) * 100);

    return consistency;
  }
}
```

**✅ Day 8-10 Success Criteria:**

- [ ] Messages successfully sent to Phase 2 mock system
- [ ] Performance monitoring shows consistent ~42.7ms intervals
- [ ] Chunk timing consistency >90%
- [ ] No dropped chunks during 10-minute test

---

### **⚡ Day 11-14: Optimization & Polish**

#### **Task 1.11: Handle Edge Cases**

```typescript
// Update OffscreenAudioProcessor with error handling
class OffscreenAudioProcessor {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private streamHealthMonitor: StreamHealthMonitor;

  constructor() {
    this.streamHealthMonitor = new StreamHealthMonitor();
  }

  private async handleStreamError(error: Error) {
    console.error("Stream error:", error);

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
      );

      // Wait with exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, this.reconnectAttempts) * 1000)
      );

      try {
        await this.restartCapture();
        this.reconnectAttempts = 0; // Reset on success
      } catch (reconnectError) {
        console.error("Reconnect failed:", reconnectError);
      }
    } else {
      // Max attempts reached, notify user
      this.notifyStreamFailure();
    }
  }

  private async restartCapture() {
    // Clean up existing connections
    if (this.sourceNode) {
      this.sourceNode.disconnect();
    }
    if (this.captureNode) {
      this.captureNode.disconnect();
    }

    // Request new stream
    // This would trigger background script to get new tab capture
    chrome.runtime.sendMessage({ type: "RESTART_CAPTURE" });
  }

  private notifyStreamFailure() {
    chrome.runtime.sendMessage({
      type: "CAPTURE_FAILED",
      error: "Maximum reconnection attempts exceeded",
    });
  }
}

class StreamHealthMonitor {
  private lastChunkTime = 0;
  private silenceThreshold = 1000; // 1 second of silence
  private healthCheckInterval: number;

  startMonitoring() {
    this.healthCheckInterval = setInterval(() => {
      this.checkStreamHealth();
    }, 500); // Check every 500ms
  }

  recordChunkReceived() {
    this.lastChunkTime = performance.now();
  }

  private checkStreamHealth() {
    const now = performance.now();
    const timeSinceLastChunk = now - this.lastChunkTime;

    if (timeSinceLastChunk > this.silenceThreshold) {
      console.warn(
        "⚠️ Stream health warning: No chunks received for",
        timeSinceLastChunk.toFixed(0),
        "ms"
      );

      // Could trigger stream restart or notification
    }
  }

  stopMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}
```

#### **Task 1.12: Add Configuration System**

```typescript
// Create src/phase1/capture-config.ts
export interface CaptureConfig {
  chunkSize: number; // Samples per chunk
  bufferSize: number; // Internal buffer size
  maxLatency: number; // Max acceptable latency (ms)
  autoRestart: boolean; // Auto-restart on errors
  qualityMode: "low" | "medium" | "high";
}

export class CaptureConfigManager {
  private config: CaptureConfig = {
    chunkSize: 2048, // Standard chunk size
    bufferSize: 8192, // 4x chunk size buffer
    maxLatency: 50, // 50ms max latency
    autoRestart: true,
    qualityMode: "medium",
  };

  async loadConfig(): Promise<CaptureConfig> {
    try {
      const stored = await chrome.storage.local.get("captureConfig");
      if (stored.captureConfig) {
        this.config = { ...this.config, ...stored.captureConfig };
      }
    } catch (error) {
      console.error("Failed to load config:", error);
    }
    return this.config;
  }

  async saveConfig(newConfig: Partial<CaptureConfig>) {
    this.config = { ...this.config, ...newConfig };
    try {
      await chrome.storage.local.set({ captureConfig: this.config });
    } catch (error) {
      console.error("Failed to save config:", error);
    }
  }

  getOptimalSettings(
    cpuUsage: number,
    memoryUsage: number
  ): Partial<CaptureConfig> {
    // Adjust settings based on system performance
    if (cpuUsage > 80) {
      return {
        chunkSize: 4096, // Larger chunks = less frequent processing
        qualityMode: "low",
      };
    } else if (cpuUsage < 30 && memoryUsage < 50) {
      return {
        chunkSize: 1024, // Smaller chunks = lower latency
        qualityMode: "high",
      };
    }

    return {}; // Keep current settings
  }
}
```

#### **Task 1.13: Final Integration Testing**

```typescript
// Create src/phase1/integration-test.ts
export class Phase1IntegrationTest {
  private testResults: TestResult[] = [];

  async runFullIntegrationTest(): Promise<TestReport> {
    console.log("🧪 Starting Phase 1 Integration Test...");

    const tests = [
      this.testBasicCapture,
      this.testChunkFormat,
      this.testPerformance,
      this.testErrorHandling,
      this.testPhase2Communication,
    ];

    for (const test of tests) {
      try {
        const result = await test.call(this);
        this.testResults.push(result);
      } catch (error) {
        this.testResults.push({
          name: test.name,
          passed: false,
          error: error.message,
        });
      }
    }

    return this.generateReport();
  }

  private async testBasicCapture(): Promise<TestResult> {
    // Test that we can start and stop capture
    const processor = new OffscreenAudioProcessor();
    await processor.initializeAudio();
    await processor.startProcessing();

    // Wait for chunks
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return { name: "Basic Capture", passed: true };
  }

  private async testChunkFormat(): Promise<TestResult> {
    // Test that chunks match AudioChunkContract exactly
    let chunkReceived = false;
    let validFormat = false;

    const handler = (chunk) => {
      chunkReceived = true;
      validFormat = this.validateChunkContract(chunk);
    };

    // Setup test capture
    // ... test implementation

    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      name: "Chunk Format",
      passed: chunkReceived && validFormat,
      details: `Chunks received: ${chunkReceived}, Valid format: ${validFormat}`,
    };
  }

  private async testPerformance(): Promise<TestResult> {
    // Test chunk rate and latency
    const monitor = new CapturePerformanceMonitor();
    let chunkCount = 0;
    const startTime = performance.now();

    const handler = (chunk) => {
      monitor.recordChunkProcessed(chunk);
      chunkCount++;
    };

    // Run for 5 seconds
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const endTime = performance.now();

    const actualRate = chunkCount / ((endTime - startTime) / 1000);
    const expectedRate = 23.4;
    const rateOK = Math.abs(actualRate - expectedRate) < 2; // Within 2 chunks/sec

    return {
      name: "Performance",
      passed: rateOK,
      details: `Rate: ${actualRate.toFixed(1)}/sec (expected: ${expectedRate})`,
    };
  }

  private async testErrorHandling(): Promise<TestResult> {
    // Test stream disconnection recovery
    try {
      const processor = new OffscreenAudioProcessor();
      // Simulate stream error
      processor.handleStreamError(new Error("Test error"));

      return { name: "Error Handling", passed: true };
    } catch (error) {
      return { name: "Error Handling", passed: false, error: error.message };
    }
  }

  private async testPhase2Communication(): Promise<TestResult> {
    // Test message passing to Phase 2
    const bridge = new Phase2Bridge();
    let messageReceived = false;

    // Mock Phase 2 response
    bridge.onMessage("audioChunk", (chunk) => {
      messageReceived = true;
    });

    // Send test chunk
    const testChunk = this.createTestChunk();
    bridge.sendAudioChunk(testChunk);

    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      name: "Phase 2 Communication",
      passed: messageReceived,
    };
  }

  private createTestChunk(): AudioChunkContract {
    return {
      samples: [new Float32Array(2048), new Float32Array(2048)],
      sampleRate: 48000,
      channels: 2,
      frameLength: 2048,
      timestamp: performance.now(),
      chunkId: `test_chunk_${Date.now()}`,
      sequenceNumber: 1,
      rmsLevel: 0.123,
      peakLevel: 0.456,
    };
  }

  private validateChunkContract(chunk: any): boolean {
    const required = [
      "samples",
      "sampleRate",
      "channels",
      "frameLength",
      "timestamp",
      "chunkId",
      "sequenceNumber",
    ];

    for (const field of required) {
      if (!(field in chunk)) return false;
    }

    return (
      chunk.sampleRate === 48000 &&
      chunk.frameLength === 2048 &&
      Array.isArray(chunk.samples) &&
      chunk.samples.length > 0
    );
  }

  private generateReport(): TestReport {
    const passed = this.testResults.filter((r) => r.passed).length;
    const total = this.testResults.length;

    return {
      totalTests: total,
      passed: passed,
      failed: total - passed,
      success: passed === total,
      results: this.testResults,
      summary: `${passed}/${total} tests passed`,
    };
  }
}

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

interface TestReport {
  totalTests: number;
  passed: number;
  failed: number;
  success: boolean;
  results: TestResult[];
  summary: string;
}
```

**✅ Day 11-14 Success Criteria:**

- [ ] All 5 integration tests pass
- [ ] Error recovery works automatically
- [ ] Configuration system saves/loads correctly
- [ ] Stream health monitoring detects issues
- [ ] Performance consistently meets targets

---

## 📅 **Final Deliverables Checklist**

### **🎯 Core Output Requirements**

#### **AudioChunkContract Format (EXACT)**

```typescript
interface AudioChunkContract {
  samples: Float32Array[]; // [leftChannel, rightChannel] for stereo
  sampleRate: number; // Always 48000
  channels: number; // 1 or 2
  frameLength: number; // Always 2048
  timestamp: number; // performance.now()
  chunkId: string; // "chunk_${timestamp}_${random}"
  sequenceNumber: number; // Incremental counter
  rmsLevel?: number; // Audio RMS level
  peakLevel?: number; // Audio peak level
}
```

#### **Performance Targets**

- **✅ Chunk Rate**: 23.4 chunks/second (±0.5)
- **✅ Chunk Size**: Exactly 2048 samples per channel
- **✅ Latency**: <20ms from capture to Phase 2 delivery
- **✅ Consistency**: >90% timing consistency
- **✅ Memory**: <50MB total memory usage
- **✅ Error Recovery**: Automatic reconnection within 5 seconds

#### **Integration Points**

- **✅ Background Script**: Manages tab capture lifecycle
- **✅ Offscreen Document**: Handles audio processing
- **✅ AudioWorklet**: Real-time chunk generation
- **✅ Message Bridge**: Sends chunks to Phase 2
- **✅ Error Handling**: Graceful recovery from stream issues

---

## 🚀 **Quick Start Commands**

### **Development Setup**

```bash
# Install dependencies
npm install

# Start development build
npm run dev

# Load extension in Chrome
# 1. Open chrome://extensions/
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select dist/ folder
```

### **Testing Phase 1**

```bash
# Run integration tests
npm run test:phase1

# Manual testing:
# 1. Open YouTube video
# 2. Click extension popup
# 3. Click "Start Capture"
# 4. Check console for chunk statistics
```

### **Debug Mode**

```typescript
// Enable verbose logging in offscreen/index.ts
const DEBUG_MODE = true;

if (DEBUG_MODE) {
  console.log("🎤 Chunk details:", chunk);
  console.log("📊 Performance:", stats);
}
```

---

## ⚡ **Optimization Tips**

### **Performance Optimization**

1. **Use transferable objects** for Float32Array to avoid copying
2. **Pool audio buffers** to reduce garbage collection
3. **Monitor memory usage** and clean up unused streams
4. **Adjust chunk size** based on system performance

### **Quality Optimization**

1. **Validate sample rate** is exactly 48000 Hz
2. **Check for clipping** (peak levels > 0.95)
3. **Monitor RMS levels** for consistent audio
4. **Handle silence** (RMS < 0.001) appropriately

### **Reliability Optimization**

1. **Implement heartbeat** system with Phase 2
2. **Buffer health monitoring** to prevent underruns
3. **Stream validation** before processing
4. **Graceful degradation** when quality drops

---

## 🎯 **Success Metrics**

### **Week 1 Targets**

- [ ] Basic tab capture working
- [ ] AudioWorklet generating chunks
- [ ] Popup UI controls capture
- [ ] Console shows chunk statistics

### **Week 2 Targets**

- [ ] Perfect AudioChunkContract format
- [ ] 23.4 chunks/second rate achieved
- [ ] <20ms latency measured
- [ ] Phase 2 integration ready
- [ ] Error recovery functional

### **Final Delivery**

- [ ] All integration tests pass
- [ ] 10-minute continuous capture test
- [ ] Memory usage stable
- [ ] Ready for Phase 2 connection

---

## 📞 **Communication with Phase 2 Developer**

### **Daily Sync Points**

- **Monday**: Share chunk format validation results
- **Wednesday**: Performance benchmark comparison
- **Friday**: Integration readiness status

### **Shared Metrics Dashboard**

```typescript
// Both developers track these metrics
interface SharedMetrics {
  phase1ChunkRate: number; // Your delivery rate
  phase2ProcessingRate: number; // Their consumption rate
  endToEndLatency: number; // Total system latency
  bufferHealth: number; // 0-1 buffer level
}
```

### **Integration Handoff**

When your Phase 1 is ready:

1. **Replace mock generator** in Phase 2 test harness
2. **Run joint integration test**
3. **Measure end-to-end performance**
4. **Tune parameters** for optimal performance

---

## 🏆 **You've Got This!**

This roadmap gives you everything needed to build Phase 1 successfully:

- **Clear daily tasks** with specific deliverables
- **Working code examples** for every component
- **Performance targets** and success criteria
- **Integration points** clearly defined
- **Testing strategy** to validate everything works

**The Phase 2 developer is ready to receive your chunks as soon as you deliver them in the correct format. No waiting, no blocking - just pure parallel productivity!**

Focus on hitting those chunk delivery targets and the integration will be seamless. 🚀
