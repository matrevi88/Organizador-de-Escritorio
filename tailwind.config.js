/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bone: '#FAFAF7',
        ink: '#0B1020',
        'df-muted': '#475569',
        deep: '#1E3A8A',
        accent: '#2563EB',
        coral: '#FB7185'
      },
      borderColor: {
        df: 'rgba(11, 16, 32, 0.1)'
      },
      backgroundColor: {
        'df-surface': 'rgba(11, 16, 32, 0.06)',
        'df-hover': 'rgba(11, 16, 32, 0.09)',
        'df-select': 'rgba(37, 99, 235, 0.14)'
      }
    }
  },
  plugins: []
}
