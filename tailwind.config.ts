import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/auth/**/*.{js,ts,jsx,tsx}",
    "./app/dashboard/**/*.{js,ts,jsx,tsx}",
  ],
theme: {
    extend: {
      keyframes: {
        slideDown: {
          '0%': { opacity: '0', transform: 'translateX(-50%) translateY(-20px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateX(-50%) translateY(0) scale(1)' },
        },
      },
      animation: {
        slideDown: 'slideDown 0.3s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
