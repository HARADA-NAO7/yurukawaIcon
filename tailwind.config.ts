import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/pages/**/*.{js,ts,jsx,tsx,mdx}", "./src/components/**/*.{js,ts,jsx,tsx,mdx}", "./src/app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      borderRadius: {
        blob: "1.75rem"
      },
      boxShadow: {
        card: "0 14px 40px rgba(20, 22, 51, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
