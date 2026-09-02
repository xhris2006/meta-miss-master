/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Plus Jakarta Sans", "sans-serif"],
      },
      colors: {
        blue: { 500: "#2563EB", 600: "#1D4ED8", 100: "#EFF6FF", 200: "#DBEAFE" },
      },
    },
  },
  plugins: [],
};
