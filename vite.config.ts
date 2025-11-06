import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// For GitHub Pages: use environment variable or default to repo name
// If repo is username.github.io, base should be '/', otherwise '/repo-name/'
const base = process.env.VITE_BASE || '/sbuxtips.com/';

export default defineConfig({
  plugins: [react()],
  base,
  envPrefix: ['VITE_', 'OCR_', 'AZURE_', 'SESSION_'],
  server: {
    port: 5173,
    host: '0.0.0.0'
  }
});
