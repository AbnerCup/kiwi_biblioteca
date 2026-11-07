import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './', plugins: [tailwindcss()],
  build: { rollupOptions: { input: { main: 'index.html', admin: 'admin/index.html' } } },
  server: { proxy: { '/api': 'http://127.0.0.1:8081' } },
});
