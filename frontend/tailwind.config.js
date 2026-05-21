// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'oxblood': '#721c15',
        'mahogany': '#4a2511', // A deep wood tone
        'parchment': '#f4e8d3',
      },
      fontFamily: {
        // You might want to define a serif font here later for the Candela aesthetic
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      }
    },
  },
  plugins: [],
}
