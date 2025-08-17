// POPUP REACT APP: User interface for controlling audio capture
// This shows when user clicks the extension icon

import React, { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import type { CaptureState, PerformanceMetrics } from "../shared/audio-types";

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
    } catch (error: any) {
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
