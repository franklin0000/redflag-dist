const plugin = require('tailwindcss/plugin');

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#d411b4",
        "pink": {
          50: '#fdf2fa',
          100: '#fbe5f6',
          200: '#f8cced',
          300: '#f2a6de',
          400: '#ea72c9',
          500: '#d411b4',  // The exact primary color from the screenshots
          600: '#b80c98',
          700: '#98087b',
          800: '#7e0a66',
          900: '#680d55',
          950: '#410232',
        },
        "background-light": "#f8f6f8",
        "background-dark": "#22101f",
        "dating-bg": "#1a0d2e",
        "dating-mid": "#2d1b47",
        "dating-accent": "#ff3366",
        "dating-fire": "#ff4d4d",
        "dating-glow": "#d411b4", // Also match glow to primary
      },
      fontFamily: {
        "display": ["Inter", "sans-serif"]
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      animation: {
        'marquee': 'marquee 20s linear infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'heart-pulse': 'heart-pulse 1.2s ease-in-out infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 8px 2px rgba(255,51,102,0.4)' },
          '50%': { boxShadow: '0 0 24px 8px rgba(255,105,180,0.7)' },
        },
        'heart-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.18)' },
          '60%': { transform: 'scale(1.08)' },
        },
      }
    },
  },
  plugins: [
    plugin(function ({ addVariant }) {
      addVariant('dating', ['&[data-theme="dating"]', '[data-theme="dating"] &']);
    })
  ],
}
