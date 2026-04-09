import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./modules/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#f5f7fb",
        panel: "#ffffff",
        ink: "#0f172a",
        muted: "#64748b",
        line: "#dbe3ef",
        accent: "#2563eb",
        accentSoft: "#eff6ff",
        success: "#15803d",
        warning: "#b45309",
        danger: "#dc2626",
      },
      boxShadow: {
        panel: "0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 24px rgba(15, 23, 42, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
