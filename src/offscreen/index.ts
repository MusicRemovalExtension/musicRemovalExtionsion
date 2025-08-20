// OFFSCREEN AUDIO PROCESSOR: Handles real-time audio processing
// This runs in a hidden document that has access to Web Audio API

import type { AudioChunkContract } from "../shared/audio-types";

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
    } catch (error: any) {
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
  console.log("Sender:" + sender);

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
