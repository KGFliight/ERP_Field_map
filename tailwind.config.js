/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'field-dark': '#0f172a',
        'field-darker': '#020617',
        'field-accent': '#22d3ee',
        'field-success': '#22c55e',
        'field-warning': '#f59e0b',
        'field-danger': '#ef4444',
      },
      fontFamily: {
        field: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
