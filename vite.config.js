import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    react(),
    // CORREÇÃO: Adicionando o plugin para copiar o manifest
    viteStaticCopy({
      targets: [
        {
          src: 'manifest.json', // Caminho do arquivo na raiz do projeto
          dest: '.'             // Destino na pasta 'dist'
        }
      ]
    })
  ],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        sidepanel: 'sidepanel.html',
        background: 'src/background.js'
      },
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    },
    target: 'es2022',
  },
});