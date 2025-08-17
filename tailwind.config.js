// TAILWIND CSS CONFIGURATION
// Configures Tailwind CSS for the Chrome extension

/** @type {import('tailwindcss').Config} */
module.exports = {
  // CONTENT: Files to scan for Tailwind classes
  content: [
    "./src/**/*.{html,js,ts,jsx,tsx}", // All source files
    "./src/popup/index.html", // Popup HTML
    "./src/offscreen/index.html", // Offscreen HTML
  ],

  // THEME: Custom design tokens
  theme: {
    extend: {
      // COLORS: Extension-specific colors
      colors: {
        "extension-blue": "#4F46E5", // Primary blue
        "extension-green": "#10B981", // Success green
        "extension-red": "#EF4444", // Error red
        "extension-gray": "#6B7280", // Neutral gray
      },

      // FONT FAMILY: Monospace for technical displays
      fontFamily: {
        mono: ["Monaco", "Menlo", "Ubuntu Mono", "monospace"],
      },

      // ANIMATIONS: Custom animations for audio visualization
      keyframes: {
        "audio-pulse": {
          "0%, 100%": { transform: "scaleY(1)" },
          "50%": { transform: "scaleY(1.5)" },
        },
      },

      animation: {
        "audio-pulse": "audio-pulse 0.5s ease-in-out infinite",
      },
    },
  },

  // PLUGINS: Additional Tailwind functionality
  plugins: [],

  // DARK MODE: Disable dark mode for consistency
  darkMode: false,
};
