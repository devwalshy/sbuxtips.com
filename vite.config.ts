import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// For GitHub Pages: use environment variable or default to root
// If repo is username.github.io, base should be '/', otherwise '/repo-name/'
const base = process.env.VITE_BASE || '/';

export default defineConfig({
  plugins: [react()],
  base,
  envPrefix: ['VITE_', 'OCR_', 'AZURE_', 'SESSION_'],
  server: {
    port: 5173,
    host: '0.0.0.0'
  }
});
