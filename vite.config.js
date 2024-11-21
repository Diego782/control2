import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist', // Especifica la carpeta de salida
  },
  server: {
    port: 3000, // Especifica el puerto del servidor de desarrollo
  },
  publicDir: 'public', // Especifica la carpeta de archivos estáticos
});