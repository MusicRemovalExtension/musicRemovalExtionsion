import type {
  CaptureConfig,
  ProcessingConfig,
  SystemConfig,
} from "./config-types";

/**
 * Audio processing constants
 */
export const AUDIO_CONSTANTS = {
  // Standard audio parameters
  SAMPLE_RATE: 48000, // Standard sample rate for web audio
  CHUNK_SIZE: 2048, // Standard chunk size (42.7ms at 48kHz)
  MAX_CHANNELS: 2, // Maximum supported channels

  // Frequency ranges
  SPEECH_FREQ_LOW: 300, // Speech frequency range lower bound (Hz)
  SPEECH_FREQ_HIGH: 3400, // Speech frequency range upper bound (Hz)
  MUSIC_FREQ_LOW: 20, // Music frequency range lower bound (Hz)
  MUSIC_FREQ_HIGH: 20000, // Music frequency range upper bound (Hz)

  // Audio levels
  SILENCE_THRESHOLD: 0.001, // RMS threshold for silence detection
  PEAK_THRESHOLD: 0.95, // Peak threshold for clipping detection

  // Processing timing
  TARGET_LATENCY: 20, // Target processing latency (ms)
  MAX_LATENCY: 50, // Maximum acceptable latency (ms)
  CHUNK_RATE: 23.4, // Expected chunks per second

  // Buffer sizes
  MIN_BUFFER_SIZE: 1024, // Minimum buffer size
  MAX_BUFFER_SIZE: 16384, // Maximum buffer size
  DEFAULT_BUFFER_SIZE: 8192, // Default buffer size
} as const;

/**
 * Performance targets
 */
export const PERFORMANCE_TARGETS = {
  // Phase 1 targets
  PHASE1_CHUNK_RATE: 23.4, // chunks per second (±0.5)
  PHASE1_LATENCY: 10, // max capture latency (ms)
  PHASE1_CONSISTENCY: 90, // min timing consistency (%)
  PHASE1_MEMORY: 50, // max memory usage (MB)

  // Phase 2 targets
  PHASE2_PROCESSING_TIME: 15, // max processing time per chunk (ms)
  PHASE2_BUFFER_HEALTH: 0.3, // min buffer health (0-1)
  PHASE2_QUALITY_SCORE: 0.8, // min quality score (0-1)
  PHASE2_CPU_USAGE: 80, // max CPU usage (%)

  // System targets
  SYSTEM_END_TO_END_LATENCY: 40, // max total latency (ms)
  SYSTEM_ERROR_RATE: 1, // max errors per minute
  SYSTEM_UPTIME: 99.5, // min uptime percentage
} as const;

/**
 * Message type constants
 */
export const MESSAGE_TYPES = {
  // Audio processing
  AUDIO_CHUNK: "audioChunk",
  PROCESSING_RESULT: "processingResult",

  // Stream control
  STREAM_START: "streamStart",
  STREAM_STOP: "streamStop",
  STREAM_ERROR: "streamError",
  STREAM_RESTART: "streamRestart",

  // System communication
  PERFORMANCE_STATS: "performanceStats",
  CONFIG_UPDATE: "configUpdate",
  SYSTEM_STATUS: "systemStatus",

  // Error handling
  ERROR_REPORT: "errorReport",
  WARNING_REPORT: "warningReport",
} as const;

/**
 * Default configurations
 */
export const DEFAULT_CAPTURE_CONFIG: CaptureConfig = {
  chunkSize: AUDIO_CONSTANTS.CHUNK_SIZE,
  sampleRate: AUDIO_CONSTANTS.SAMPLE_RATE,
  channels: 2,
  bufferSize: AUDIO_CONSTANTS.DEFAULT_BUFFER_SIZE,
  maxLatency: AUDIO_CONSTANTS.TARGET_LATENCY,
  enableMetrics: true,
  enableValidation: true,
  autoRestart: true,
  maxRestartAttempts: 5,
  verboseLogging: false,
  performanceMonitoring: true,
};

export const DEFAULT_PROCESSING_CONFIG: ProcessingConfig = {
  defaultMode: "auto",
  dspConfig: {
    speechBandLow: AUDIO_CONSTANTS.SPEECH_FREQ_LOW,
    speechBandHigh: AUDIO_CONSTANTS.SPEECH_FREQ_HIGH,
    speechBoost: 1.2,
    musicSuppression: 0.3,
    noiseGateThreshold: AUDIO_CONSTANTS.SILENCE_THRESHOLD,
  },
  mlConfig: {
    modelPath: "/models/speech-isolation.onnx",
    inputSize: 16384,
    batchSize: 1,
    useGpu: false,
  },
  adaptiveConfig: {
    enableAdaptive: true,
    cpuThreshold: 80,
    qualityThreshold: 0.7,
    switchingDelay: 1000,
  },
  maxProcessingTime: PERFORMANCE_TARGETS.PHASE2_PROCESSING_TIME,
  maxBufferSize: 10,
  wetDryMix: 1.0,
  outputGain: 1.0,
};

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  messageQueueSize: 100,
  messageTimeout: 1000,
  statsUpdateInterval: 1000,
  performanceHistorySize: 100,
  errorReportingEnabled: true,
  maxErrorRate: PERFORMANCE_TARGETS.SYSTEM_ERROR_RATE,
  debugMode: false,
  simulationMode: false,
};
