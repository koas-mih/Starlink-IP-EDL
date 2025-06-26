import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Simple plugin to configure build output
const buildConfigPlugin = () => {
  return {
    name: 'build-config-plugin',
    // Ensure build generates directly to public folder
    config(config) {
      return {
        ...config,
        build: {
          ...config.build,
          outDir: 'public'
        }
      };
    }
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    buildConfigPlugin()
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    outDir: 'public',
    emptyOutDir: false // Prevent deleting existing files in public dir (like ipv4.txt)
  },
  server: {
    https: true,
    // Proxy all API requests and IP-related routes to the Express server
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      '/ipv4.txt': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      '/ipv4': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    },
    watch: {
      // Add watcher for key directories to ensure updates trigger reloads
      ignored: ['!**/public/ipv4.txt']
    }
  }
});