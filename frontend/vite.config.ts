import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const proxy: Record<string, any> =
    mode === 'development'
      ? {
          '/api': {
            target: 'http://127.0.0.1:8000',
            changeOrigin: true,
            secure: false,
          },
        }
      : {};

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy,
    },
  };
});
