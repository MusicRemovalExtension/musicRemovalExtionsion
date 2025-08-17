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
