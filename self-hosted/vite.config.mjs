import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig({
    root: here,
    publicDir: '../public',
    plugins: [react()],
    resolve: { alias: { '@': fileURLToPath(new URL('..', import.meta.url)) } },
    build: { outDir: 'build/client', emptyOutDir: true, sourcemap: false },
});
