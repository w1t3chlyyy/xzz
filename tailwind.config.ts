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
          primary: "#7C3AED",
          dark: "#F4F3FA",
          accent: "#8B5CF6",
          surface: "#FFFFFF",
          border: "#EDE9FE",
        },
        fiolet: {
          bg: "#F4F3FA",
          card: "#FFFFFF",
          primary: "#7C3AED",
          accent: "#8B5CF6",
          border: "#EDE9FE",
        }
      },
      boxShadow: {
        violet: "0 4px 14px rgba(124, 58, 237, 0.2)",
        "violet-lg": "0 10px 25px -3px rgba(124, 58, 237, 0.15)",
        card: "0 4px 20px -2px rgba(124, 58, 237, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)",
        floating: "0 12px 40px rgba(0, 0, 0, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;

