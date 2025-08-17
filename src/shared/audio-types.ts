/*
 * Primary data contract for audio chunks between phases
 * Phase 1 MUST output exactly this format
 * Phase 2 MUST accept exactly this format
 */
export interface AudioChunkContract {
  // Raw audio data (Float32Array per channel)
  samples: Float32Array[]; // [leftChannel, rightChannel] for stereo, [mono] for mono

  // Audio specifications
  sampleRate: number; // Always 48000 for tab capture
  channels: number; // 1 = mono, 2 = stereo
  frameLength: number; // Number of samples per channel (always 2048)

  // Timing and identification
  timestamp: number; // performance.now() when chunk was created
  chunkId: string; // Unique identifier: "chunk_${timestamp}_${randomId}"
  sequenceNumber: number; // Incremental counter for chunk ordering

  // Audio quality metrics (optional but recommended)
  rmsLevel?: number; // RMS loudness level (0.0 to 1.0)
  peakLevel?: number; // Peak amplitude level (0.0 to 1.0)

  // Stream control
  isLastChunk?: boolean; // true when audio stream ends

  // Processing hints (for adaptive algorithms)
  qualityHint?: "low" | "medium" | "high"; // Suggested processing quality
  speechConfidence?: number; // 0-1 confidence that chunk contains speech
}

/**
 * Result format for processed audio chunks
 * Phase 2 outputs this back to Phase 1 (or audio system)
 */
export interface ProcessingResult {
  // Processed audio output
  outputSamples: Float32Array[]; // Processed audio samples

  // Processing metadata
  processingMode: "dsp" | "ml" | "bypass"; // Which algorithm was used
  processingLatency: number; // Time taken to process (ms)
  qualityScore?: number; // 0-1 processing quality score

  // Reference to original chunk
  originalChunkId: string; // Links back to input chunk
  originalSequenceNumber: number; // Maintains sequence ordering

  // Processing statistics
  speechEnhancement?: number; // Amount of speech enhancement applied
  noiseReduction?: number; // Amount of noise reduction applied
}

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
