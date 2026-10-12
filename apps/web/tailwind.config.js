/**
 * Paleta da Kássia (LandingPage + styles.css), aplicada ao app inteiro.
 * As telas usam as classes indigo/emerald/red/amber do Tailwind; aqui elas viram os tons dela,
 * já pensados para o fundo escuro: 50–200 são fundos/bordas escuros com tinta da cor,
 * 400–900 são as cores de destaque e texto.
 */

// Laranja da marca: #ff8a4c (botões), #ffa06e (hover), #ff9a63/#ffb078/#ffb58d/#ffc39e (textos e detalhes)
const orange = {
  50: '#24150f',
  100: '#2e1a12',
  200: '#4a2a1b',
  300: '#7a4127',
  400: '#ffb078',
  500: '#ff9a63',
  600: '#ff8a4c',
  700: '#ffa06e',
  800: '#ffb58d',
  900: '#ffc39e',
  950: '#1b100b',
};

// Verde da paleta: #9ee6bd (modo contador e sucesso)
const green = {
  50: '#0f1f18',
  100: '#14291f',
  200: '#1f3d2e',
  300: '#2f5c45',
  400: '#7fd9a6',
  500: '#8fe0b2',
  600: '#9ee6bd',
  700: '#b3eccb',
  800: '#c6f1d8',
  900: '#daf6e5',
  950: '#0b1a12',
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        indigo: orange,
        emerald: green,
        // Alertas: fundos escuros com tinta da cor e textos claros
        red: { 50: '#2a1214', 100: '#341619', 200: '#5a2328', 700: '#fca5a5', 800: '#fecaca' },
        amber: { 50: '#2a1f0d', 100: '#33260f', 200: '#5a4316', 700: '#fcd34d', 800: '#fde68a', 900: '#fef3c7' },
      },
    },
  },
  plugins: [],
};
