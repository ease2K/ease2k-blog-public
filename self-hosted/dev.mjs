import { createServer as createViteServer } from 'vite';
import { createServer as createProbe } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const here = fileURLToPath(new URL('.', import.meta.url));
await import('./build.mjs');
const probe = createProbe();
probe.listen(0, '127.0.0.1');
await once(probe, 'listening');
const apiPort = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const origin = `http://127.0.0.1:${apiPort}`;
const backend = spawn(process.execPath, [resolve(here, 'build/server.mjs')], {
    env: { ...process.env, PORT: String(apiPort), BLOG_ORIGIN: origin, BLOG_OWNER_ORIGIN: 'http://127.0.0.1:' + (process.env.VITE_PORT || 5173) },
    stdio: ['ignore', 'pipe', 'inherit'],
});
let server;
let closing = false;
async function close() {
    if (closing) return;
    closing = true;
    try { await server?.close(); } finally { backend.kill('SIGTERM'); }
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { void close(); });
backend.once('exit', code => {
    if (!closing) { process.exitCode = code || 1; void close(); }
});
try {
    await Promise.race([
        new Promise(resolve => backend.stdout.on('data', chunk => { if (chunk.toString().includes('Blog ready')) resolve(); })),
        new Promise((_, reject) => { backend.once('error', reject); backend.once('exit', code => reject(Error('API server exited: ' + code))); }),
    ]);
    server = await createViteServer({
        configFile: resolve(here, 'vite.config.mjs'),
        server: {
            host: '127.0.0.1',
            port: Number(process.env.VITE_PORT || 5173),
            strictPort: true,
            proxy: { '/api': { target: origin, changeOrigin: true } },
            watch: { usePolling: process.env.CODEX_SANDBOX === 'seatbelt' },
        },
    });
    await server.listen();
    server.printUrls();
} catch (error) {
    await close();
    throw error;
}
