import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#030712",
        panel: "#0b1329",
        "accent-cyan": "#06b6d4",
        "accent-cyan-light": "#22d3ee",
        "accent-violet": "#8b5cf6",
        "text-muted": "#94a3b8",
        alert: "#f59e0b",
        critical: "#ef4444",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Consolas", "monospace"],
      },
      animation: {
        glitch: "glitch 300ms ease-in-out",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.5s ease-in",
      },
      keyframes: {
        glitch: {
          "0%, 100%": { transform: "translateX(0)", opacity: "1" },
          "25%": { transform: "translateX(-2px)", opacity: "0.8" },
          "75%": { transform: "translateX(2px)", opacity: "0.9" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      boxShadow: {
        cyan: "0 0 15px rgba(6,182,212,0.5)",
        violet: "0 0 10px rgba(139,92,246,0.4)",
        "cyan-sm": "0 0 6px rgba(6,182,212,0.4)",
      },
    },
  },
  plugins: [],
};

export default config;
