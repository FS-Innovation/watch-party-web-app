import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Nocturne Cinematic Design System (from Stitch)
        background: "#131313",
        surface: "#131313",
        "surface-dim": "#131313",
        "surface-container": "#201f1f",
        "surface-container-low": "#1c1b1b",
        "surface-container-high": "#2a2a2a",
        "surface-container-highest": "#353534",
        "surface-container-lowest": "#0e0e0e",
        "surface-variant": "#353534",
        "surface-bright": "#3a3939",

        // Primary (Teal — blurred street lights)
        primary: "#8bd1e2",
        "primary-container": "#1a6b7a",
        "on-primary": "#00363f",
        "on-primary-container": "#a2e9fa",
        "primary-fixed": "#a7eeff",
        "primary-fixed-dim": "#8bd1e2",

        // Secondary (Warm sand — street light amber)
        secondary: "#efbd8a",
        "secondary-container": "#64421a",
        "on-secondary": "#472a03",
        "on-secondary-container": "#dfaf7e",
        "secondary-fixed": "#ffdcbc",
        "secondary-fixed-dim": "#efbd8a",

        // Tertiary (Crimson — urgency/live)
        tertiary: "#ffb3b5",
        "tertiary-container": "#b43041",
        "on-tertiary": "#680018",
        "on-tertiary-container": "#ffd4d5",

        // Text
        "on-surface": "#e5e2e1",
        "on-surface-variant": "#bfc8cb",
        "on-background": "#e5e2e1",
        foreground: "#e5e2e1",

        // Borders
        outline: "#899295",
        "outline-variant": "#3f484b",
        border: "#3f484b",

        // Error
        error: "#ffb4ab",
        "error-container": "#93000a",

        // Inverse
        "inverse-surface": "#e5e2e1",
        "inverse-on-surface": "#313030",
        "inverse-primary": "#146776",

        // Legacy compat
        card: "#1c1b1b",
        "card-hover": "#2a2a2a",
        pink: {
          DEFAULT: "#b43041",
          light: "#ffb3b5",
          dark: "#8e1029",
        },
      },
      fontFamily: {
        headline: ["Epilogue", "system-ui", "sans-serif"],
        body: ["Manrope", "system-ui", "sans-serif"],
        label: ["Inter", "system-ui", "sans-serif"],
        cursive: ["Reenie Beanie", "cursive"],
        serif: ["Epilogue", "system-ui", "sans-serif"],
        sans: ["Manrope", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        sm: "0.125rem",
        md: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};
export default config;
