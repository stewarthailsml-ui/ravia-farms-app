import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Ravia brand tokens (mirror the prototype CSS variables)
        primary: {
          DEFAULT: "#4BAE4F", // vibrant green
          dark: "#3d8c40",
        },
        accent: {
          DEFAULT: "#F58220", // deep orange
          dark: "#d46f1a",
        },
        danger: "#f44336",
        body: "#000000",
        card: "#121212",
        sidebar: "#080808",
        muted: "#b0b0b0",
        hairline: "#2a2a2a",
      },
      fontFamily: {
        sans: ["Outfit", "system-ui", "sans-serif"],
        display: ["'Playfair Display'", "serif"],
        logo: ["Pacifico", "cursive"],
      },
      borderRadius: {
        ravia: "12px",
      },
      boxShadow: {
        card: "0 8px 30px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
