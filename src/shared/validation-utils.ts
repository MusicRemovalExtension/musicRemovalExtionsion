import type { AudioChunkContract } from "./audio-types";
import { AUDIO_CONSTANTS } from "./constants";

/**
 * Validates AudioChunkContract format
 * Used by both Phase 1 (before sending) and Phase 2 (after receiving)
 */
export class AudioChunkValidator {
  /**
   * Comprehensive chunk validation
   */
  static validate(chunk: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Type checking
    if (!chunk || typeof chunk !== "object") {
      errors.push("Chunk must be an object");
      return { isValid: false, errors };
    }

    // Required fields
    const requiredFields = [
      "samples",
      "sampleRate",
      "channels",
      "frameLength",
      "timestamp",
      "chunkId",
      "sequenceNumber",
    ];

    for (const field of requiredFields) {
      if (!(field in chunk)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Samples validation
    if (!Array.isArray(chunk.samples)) {
      errors.push("samples must be an array");
    } else {
      if (chunk.samples.length === 0) {
        errors.push("samples array cannot be empty");
      }

      for (let i = 0; i < chunk.samples.length; i++) {
        if (!(chunk.samples[i] instanceof Float32Array)) {
          errors.push(`samples[${i}] must be Float32Array`);
        } else if (chunk.samples[i].length !== chunk.frameLength) {
          errors.push(
            `samples[${i}] length (${chunk.samples[i].length}) doesn't match frameLength (${chunk.frameLength})`
          );
        }
      }
    }

    // Sample rate validation
    if (chunk.sampleRate !== AUDIO_CONSTANTS.SAMPLE_RATE) {
      errors.push(
        `sampleRate must be ${AUDIO_CONSTANTS.SAMPLE_RATE}, got ${chunk.sampleRate}`
      );
    }

    // Channels validation
    if (chunk.channels !== chunk.samples?.length) {
      errors.push(
        `channels (${chunk.channels}) doesn't match samples array length (${chunk.samples?.length})`
      );
    }

    if (chunk.channels < 1 || chunk.channels > AUDIO_CONSTANTS.MAX_CHANNELS) {
      errors.push(
        `channels must be between 1 and ${AUDIO_CONSTANTS.MAX_CHANNELS}`
      );
    }

    // Frame length validation
    if (chunk.frameLength !== AUDIO_CONSTANTS.CHUNK_SIZE) {
      errors.push(
        `frameLength must be ${AUDIO_CONSTANTS.CHUNK_SIZE}, got ${chunk.frameLength}`
      );
    }

    // Timestamp validation
    if (typeof chunk.timestamp !== "number" || chunk.timestamp <= 0) {
      errors.push("timestamp must be a positive number");
    }

    // Chunk ID validation
    if (typeof chunk.chunkId !== "string" || chunk.chunkId.length === 0) {
      errors.push("chunkId must be a non-empty string");
    }

    // Sequence number validation
    if (typeof chunk.sequenceNumber !== "number" || chunk.sequenceNumber < 0) {
      errors.push("sequenceNumber must be a non-negative number");
    }

    // Optional fields validation
    if (
      "rmsLevel" in chunk &&
      (typeof chunk.rmsLevel !== "number" ||
        chunk.rmsLevel < 0 ||
        chunk.rmsLevel > 1)
    ) {
      errors.push("rmsLevel must be a number between 0 and 1");
    }

    if (
      "peakLevel" in chunk &&
      (typeof chunk.peakLevel !== "number" ||
        chunk.peakLevel < 0 ||
        chunk.peakLevel > 1)
    ) {
      errors.push("peakLevel must be a number between 0 and 1");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Quick validation for performance-critical paths
   */
  static quickValidate(chunk: any): boolean {
    return (
      chunk &&
      Array.isArray(chunk.samples) &&
      chunk.samples.length > 0 &&
      chunk.sampleRate === AUDIO_CONSTANTS.SAMPLE_RATE &&
      chunk.frameLength === AUDIO_CONSTANTS.CHUNK_SIZE &&
      typeof chunk.chunkId === "string" &&
      typeof chunk.sequenceNumber === "number"
    );
  }

  /**
   * Calculate chunk statistics for monitoring
   */
  static calculateStats(chunk: AudioChunkContract): {
    rmsLevels: number[];
    peakLevels: number[];
    dynamicRange: number;
    hasClipping: boolean;
    isSilent: boolean;
  } {
    const rmsLevels: number[] = [];
    const peakLevels: number[] = [];

    for (const channelData of chunk.samples) {
      // Calculate RMS
      let sumSquares = 0;
      let peak = 0;

      for (let i = 0; i < channelData.length; i++) {
        const sample = channelData[i];
        sumSquares += sample * sample;
        peak = Math.max(peak, Math.abs(sample));
      }

      rmsLevels.push(Math.sqrt(sumSquares / channelData.length));
      peakLevels.push(peak);
    }

    const avgRms = rmsLevels.reduce((a, b) => a + b, 0) / rmsLevels.length;
    const maxPeak = Math.max(...peakLevels);

    return {
      rmsLevels,
      peakLevels,
      dynamicRange:
        maxPeak > 0 ? 20 * Math.log10(maxPeak / Math.max(avgRms, 0.001)) : 0,
      hasClipping: maxPeak > AUDIO_CONSTANTS.PEAK_THRESHOLD,
      isSilent: avgRms < AUDIO_CONSTANTS.SILENCE_THRESHOLD,
    };
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private measurements: Map<string, number[]> = new Map();

  /**
   * Record a performance measurement
   */
  record(metric: string, value: number): void {
    if (!this.measurements.has(metric)) {
      this.measurements.set(metric, []);
    }

    const values = this.measurements.get(metric)!;
    values.push(value);

    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
  }

  /**
   * Get statistics for a metric
   */
  getStats(metric: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    latest: number;
  } | null {
    const values = this.measurements.get(metric);
    if (!values || values.length === 0) return null;

    return {
      count: values.length,
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      latest: values[values.length - 1],
    };
  }

  /**
   * Clear all measurements
   */
  clear(): void {
    this.measurements.clear();
  }
}
