/** @type {import('tailwindcss').Config} */
export default {
  // Tema escuro pela classe .dark no <html> (ThemeContext), não pela preferência do sistema.
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: {
          50: '#f4f9fc',
          100: '#eaf4fb',
          200: '#dfeef7',
          300: '#bdd8e9',
          400: '#7bbde8',
          500: '#6ea2b3',
          600: '#4e8ea2',
          700: '#49769f',
          800: '#0a4174',
          900: '#001d39',
          950: '#001524',
        },
        indigo: {
          50: '#edf7fc',
          100: '#dfeef7',
          200: '#d1e7f3',
          300: '#b8d8ea',
          400: '#7bbde8',
          500: '#6ea2b3',
          600: '#4e8ea2',
          700: '#49769f',
          800: '#0a4174',
          900: '#001d39',
        },
      },
    },
  },
  plugins: [],
};
