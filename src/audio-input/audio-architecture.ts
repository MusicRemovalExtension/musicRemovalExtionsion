export interface Phase1Architecture {
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
