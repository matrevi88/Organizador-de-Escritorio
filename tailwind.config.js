/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#7c6af7',
        accent2: '#5eead4',
        accent3: '#f472b6',
        surface: 'rgba(255,255,255,0.05)',
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
      },
    }
  },
  plugins: []
}
