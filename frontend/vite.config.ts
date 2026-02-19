import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const auth = (req.headers as Record<string, string>).authorization;
            if (auth) {
              proxyReq.setHeader('Authorization', auth);
            }
          });
        },
      },
    },
  },
})
