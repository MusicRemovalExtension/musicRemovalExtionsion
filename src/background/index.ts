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
      const stream: any = await chrome.tabCapture.capture({
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
    } catch (error: any) {
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
    } catch (error: any) {
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
      } catch (error: any) {
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
