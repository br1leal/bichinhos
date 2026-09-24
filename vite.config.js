import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5180,       // porta fixa do Bichinhos
    strictPort: true, // se estiver ocupada, avisa em vez de trocar sozinho
    host: true        // libera acesso pelo celular no mesmo Wi-Fi
  },
  preview: {
    port: 5181
  }
});