import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    outDir: 'public',
    emptyOutDir: false // Prevent deleting existing files in public dir (like ipv4.txt)
  },
  server: {
    proxy: {
      // Proxy all API calls to the Express server
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      // Proxy the ipv4.txt file to the Express server
      '/ipv4.txt': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  }
});