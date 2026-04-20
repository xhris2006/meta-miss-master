/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        gold: {
          50:  "#fffbeb", 100: "#fef3c7", 200: "#fde68a",
          300: "#fcd34d", 400: "#fbbf24", 500: "#f59e0b",
          600: "#d97706", 700: "#b45309", 800: "#92400e", 900: "#78350f"
        },
        rose: {
          950: "#1a0008"
        }
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"]
      },
      animation: {
        "pulse-gold": "pulse-gold 2s infinite",
        "float": "float 3s ease-in-out infinite",
        "slide-up": "slide-up 0.5s ease-out"
      },
      keyframes: {
        "pulse-gold": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(245, 158, 11, 0.4)" },
          "50%": { boxShadow: "0 0 0 12px rgba(245, 158, 11, 0)" }
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" }
        },
        "slide-up": {
          from: { opacity: 0, transform: "translateY(20px)" },
          to: { opacity: 1, transform: "translateY(0)" }
        }
      }
    }
  },
  plugins: []
};
