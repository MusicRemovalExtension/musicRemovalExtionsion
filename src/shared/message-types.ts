import type { AudioChunkContract, ProcessingResult } from "./audio-types";
import type {
  CaptureConfig,
  ProcessingConfig,
  SystemConfig,
} from "./config-types";

/**
 * Base message structure for all inter-component communication
 */
export interface BaseMessage {
  type: string;
  timestamp: number;
  messageId?: string;
}

/**
 * Audio chunk delivery message
 * Sent from Phase 1 to Phase 2
 */
export interface AudioChunkMessage extends BaseMessage {
  type: "audioChunk";
  data: AudioChunkContract;
}

/**
 * Processing result message
 * Sent from Phase 2 back to Phase 1
 */
export interface ProcessingResultMessage extends BaseMessage {
  type: "processingResult";
  data: ProcessingResult;
}

/**
 * Stream control messages
 * For managing audio capture lifecycle
 */
export interface StreamControlMessage extends BaseMessage {
  type: "streamStart" | "streamStop" | "streamError" | "streamRestart";
  data?: {
    reason?: string;
    error?: string;
    streamId?: string;
  };
}

/**
 * Performance monitoring messages
 * For system health and optimization
 */
export interface PerformanceMessage extends BaseMessage {
  type: "performanceStats";
  data: {
    phase1Stats?: {
      chunksGenerated: number;
      averageChunkRate: number; // chunks per second
      captureLatency: number; // ms
      memoryUsage: number; // MB
    };
    phase2Stats?: {
      chunksProcessed: number;
      averageProcessingTime: number; // ms per chunk
      bufferHealth: number; // 0-1 buffer utilization
      cpuUsage: number; // 0-100 percentage
    };
    systemStats?: {
      totalLatency: number; // end-to-end latency
      qualityScore: number; // overall system quality 0-1
      errorRate: number; // errors per minute
    };
  };
}

/**
 * Configuration update messages
 * For dynamic parameter adjustment
 */
export interface ConfigUpdateMessage extends BaseMessage {
  type: "configUpdate";
  data: {
    component: "phase1" | "phase2" | "system";
    config:
      | Partial<CaptureConfig>
      | Partial<ProcessingConfig>
      | Partial<SystemConfig>;
  };
}

/**
 * Union type for all message types
 */
export type AudioMessage =
  | AudioChunkMessage
  | ProcessingResultMessage
  | StreamControlMessage
  | PerformanceMessage
  | ConfigUpdateMessage;
