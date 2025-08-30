/** @type {import('tailwindcss').Config} */
const plugin = require("tailwindcss/plugin");

module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./App.tsx", "./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  corePlugins: {
    space: false,
  },
  theme: {
    // NOTE to AI: You can extend the theme with custom colors or styles here.
    extend: {
      colors: {
        // iOS semantic colors for dark mode support
        primary: {
          DEFAULT: "#007AFF", // iOS blue
          50: "#E6F3FF",
          100: "#CCE7FF",
          500: "#007AFF",
          600: "#0056CC",
          700: "#003D99",
        },
        secondary: {
          DEFAULT: "#8E8E93", // iOS secondary label
          50: "#F2F2F7",
          100: "#E5E5EA",
          500: "#8E8E93",
          600: "#636366",
        },
        background: {
          DEFAULT: "#FFFFFF", // System background
          secondary: "#F2F2F7", // Secondary system background
        },
        surface: {
          DEFAULT: "#FFFFFF", // Card/surface background
          elevated: "#FFFFFF", // Elevated surface
        },
        label: {
          DEFAULT: "#000000", // Primary label
          secondary: "#3C3C43", // Secondary label
          tertiary: "#3C3C4399", // Tertiary label (60% opacity)
        },
      },
      fontSize: {
        xs: "10px",
        sm: "12px",
        base: "14px",
        lg: "18px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
        "4xl": "40px",
        "5xl": "48px",
        "6xl": "56px",
        "7xl": "64px",
        "8xl": "72px",
        "9xl": "80px",
      },
    },
  },
  darkMode: "class",
  plugins: [
    plugin(({ matchUtilities, theme }) => {
      const spacing = theme("spacing");

      // space-{n}  ->  gap: {n}
      matchUtilities(
        { space: (value) => ({ gap: value }) },
        { values: spacing, type: ["length", "number", "percentage"] }
      );

      // space-x-{n}  ->  column-gap: {n}
      matchUtilities(
        { "space-x": (value) => ({ columnGap: value }) },
        { values: spacing, type: ["length", "number", "percentage"] }
      );

      // space-y-{n}  ->  row-gap: {n}
      matchUtilities(
        { "space-y": (value) => ({ rowGap: value }) },
        { values: spacing, type: ["length", "number", "percentage"] }
      );
    }),
  ],
};
