import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        violet: {
          primary: "#7B2FBE",
          dark: "#1A0B2E",
          accent: "#A855F7",
          surface: "#2D1B4E",
          border: "rgba(123, 47, 190, 0.4)",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      boxShadow: {
        violet: "0 0 20px rgba(123, 47, 190, 0.3)",
        "violet-lg": "0 0 40px rgba(123, 47, 190, 0.4)",
      },
    },
  },
  plugins: [],
};

export default config;
