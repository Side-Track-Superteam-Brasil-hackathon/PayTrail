import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// VITE_API_TARGET=http://localhost:4010 para usar o mock (npm run mock) no lugar da API real.
const target = process.env.VITE_API_TARGET ?? 'http://localhost:8080';
const useMock = /:401\d\b/.test(target); // Prism mock on ports 4010–4019

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target,
        changeOrigin: true,
        // O mock do Prism serve as rotas sem o prefixo /api.
        rewrite: useMock ? (path) => path.replace(/^\/api/, '') : undefined,
      },
    },
  },
});
