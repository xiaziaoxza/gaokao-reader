import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    port: 5173,
    proxy: {
      '/tts': {
        target: 'https://dict.youdao.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tts\/(.+)/, '/dictvoice?audio=$1&type=0'),
      },
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/photo': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
