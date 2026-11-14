import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@greenpay/tokens': path.resolve(__dirname, '../../packages/tokens/index.ts'),
      '@greenpay/config': path.resolve(__dirname, '../../packages/config/business.config.ts'),
    },
  },
  server: {
    port: 5174,
    host: true,
  },
  define: {
    'process.env': {},
  },
});
