// DEBUG SCRIPT: Check API availability and provide guidance
export function debugAPIAvailability() {
  console.log("🔍 DEBUG: Chrome Extension API Check");
  console.log("=====================================");

  // Check if we're in extension context
  console.log("Extension Context:", {
    hasChromeRuntime: !!chrome.runtime,
    hasChromeTabs: !!chrome.tabs,
    hasChromeTabCapture: !!chrome.tabCapture,
    manifestVersion:
      chrome.runtime?.getManifest?.()?.manifest_version || "unknown",
  });

  // Detailed tabCapture check
  if (chrome.tabCapture) {
    console.log("✅ tabCapture API found");
    console.log("tabCapture.capture type:", typeof chrome.tabCapture.capture);
    console.log(
      "tabCapture methods:",
      Object.getOwnPropertyNames(chrome.tabCapture)
    );
  } else {
    console.log("❌ tabCapture API NOT found");
    console.log("This usually means:");
    console.log("1. Extension not loaded via chrome://extensions");
    console.log("2. Wrong manifest permissions");
    console.log("3. Testing in regular web page instead of extension");
  }

  // Check permissions
  chrome.permissions?.getAll?.((permissions) => {
    console.log("📋 Current permissions:", permissions);
  });

  // Check if service worker is active
  console.log("Service Worker Status:", {
    self: typeof self !== "undefined",
    serviceWorker:
      typeof navigator !== "undefined"
        ? "serviceWorker" in navigator
        : "unknown",
  });
}

// Run debug on startup
debugAPIAvailability();
