/**
 * Phase 1 (Audio Capture) Configuration
 */
export interface CaptureConfig {
  // Audio parameters
  chunkSize: number; // Samples per chunk (default: 2048)
  sampleRate: number; // Audio sample rate (default: 48000)
  channels: 1 | 2; // Mono or stereo (default: 2)

  // Performance settings
  bufferSize: number; // Internal buffer size (default: 8192)
  maxLatency: number; // Max acceptable latency ms (default: 20)

  // Quality settings
  enableMetrics: boolean; // Calculate RMS/peak levels (default: true)
  enableValidation: boolean; // Validate chunk format (default: true)

  // Error handling
  autoRestart: boolean; // Auto-restart on stream errors (default: true)
  maxRestartAttempts: number; // Max restart attempts (default: 5)

  // Development options
  verboseLogging: boolean; // Enable detailed console logs (default: false)
  performanceMonitoring: boolean; // Enable performance tracking (default: true)
}

/**
 * Phase 2 (Audio Processing) Configuration
 */
export interface ProcessingConfig {
  // Processing mode selection
  defaultMode: "auto" | "dsp" | "ml"; // Default processing algorithm

  // DSP processor settings
  dspConfig: {
    speechBandLow: number; // Low frequency cutoff (default: 300)
    speechBandHigh: number; // High frequency cutoff (default: 3400)
    speechBoost: number; // Speech enhancement factor (default: 1.2)
    musicSuppression: number; // Music suppression factor (default: 0.3)
    noiseGateThreshold: number; // Noise gate threshold (default: 0.01)
  };

  // ML processor settings
  mlConfig: {
    modelPath: string; // Path to ONNX model
    inputSize: number; // Model input size (default: 16384)
    batchSize: number; // Processing batch size (default: 1)
    useGpu: boolean; // Enable GPU acceleration (default: false)
  };

  // Adaptive processing
  adaptiveConfig: {
    enableAdaptive: boolean; // Enable auto mode switching (default: true)
    cpuThreshold: number; // CPU usage threshold for downgrade (default: 80)
    qualityThreshold: number; // Quality threshold for upgrade (default: 0.7)
    switchingDelay: number; // Delay before mode switch ms (default: 1000)
  };

  // Performance limits
  maxProcessingTime: number; // Max processing time per chunk ms (default: 15)
  maxBufferSize: number; // Max input buffer size (default: 10)

  // Output settings
  wetDryMix: number; // Processed/original mix 0-1 (default: 1.0)
  outputGain: number; // Output gain multiplier (default: 1.0)
}

/**
 * System-wide Configuration
 */
export interface SystemConfig {
  // Communication settings
  messageQueueSize: number; // Max messages in queue (default: 100)
  messageTimeout: number; // Message timeout ms (default: 1000)

  // Performance monitoring
  statsUpdateInterval: number; // Stats update interval ms (default: 1000)
  performanceHistorySize: number; // Performance samples to keep (default: 100)

  // Error handling
  errorReportingEnabled: boolean; // Enable error reporting (default: true)
  maxErrorRate: number; // Max errors per minute (default: 10)

  // Development settings
  debugMode: boolean; // Enable debug features (default: false)
  simulationMode: boolean; // Use mock data instead of real audio (default: false)
}

/**
 * Complete system configuration
 */
export interface SystemConfiguration {
  capture: CaptureConfig;
  processing: ProcessingConfig;
  system: SystemConfig;
  version: string; // Configuration version for compatibility
}
