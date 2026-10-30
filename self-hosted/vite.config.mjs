import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig({
    root: here,
    publicDir: '../public',
    plugins: [react(), {
        name: 'owner-entry',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                if (req.url?.split('?')[0] === '/_owner') req.url = '/owner.html';
                next();
            });
        },
    }],
    resolve: { alias: { '@': fileURLToPath(new URL('..', import.meta.url)) } },
    build: { outDir: 'build/client', emptyOutDir: true, sourcemap: false, rolldownOptions: { input: { blog: here + 'index.html', owner: here + 'owner.html' } } },
});
