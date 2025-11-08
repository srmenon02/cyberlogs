/** @type {import('tailwindcss').Config} */

module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx,html}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        orbitron: ['Audiowide', 'sans-serif'],
      },
      colors: {
        charcoal: {
          900: "#1a202c",
          800: "#2d3748",
          700: "#4a5568",
          600: "#718096",
        },
        coral: {
          600: "#f56565",
          400: "#fc8181",
          100: "#fff5f5",
        },
        teal: {
          600: "#38b2ac",
          300: "#81e6d9",
          100: "#e6fffa",
        },
      },
    },
  },
  plugins: [],
};
