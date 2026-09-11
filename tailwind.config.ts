import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0f172a",
        secondary: "#475569",
      },
    },
  },
  plugins: [],
};
export default config;
