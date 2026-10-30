import { createServer } from 'node:http';
import { statSync, createReadStream } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { entries } from './content.mjs';
import { getRatings } from './ratings.mjs';

const root = resolve(fileURLToPath(new URL('./client/', import.meta.url)));
const origin = new URL(process.env.BLOG_ORIGIN || 'http://localhost:3000');
const port = Number(process.env.PORT || 3000);
const publicEntries = entries.filter(entry => entry.visibility !== 'private');
const removedRoutes = new Set(['signin', 'signout', 'login', 'logout', 'admin', 'private', 'signin-with-chatgpt', 'signout-with-chatgpt']);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
function json(res, data, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(data));
}
async function handle(req, res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; form-action 'none'; base-uri 'self'; object-src 'none'");
    if (origin.protocol === 'https:') res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    const url = new URL(req.url, origin);
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); } catch { return json(res, { error: '无效地址' }, 400); }
    if (removedRoutes.has(pathname.split('/')[1])) return json(res, { error: '页面不存在' }, 404);
    if (!['GET', 'HEAD'].includes(req.method)) {
        res.setHeader('Allow', 'GET, HEAD');
        return json(res, { error: '不支持此请求方法' }, 405);
    }
    if (pathname === '/healthz') return json(res, { ok: true });
    if (req.headers.host !== origin.host) return json(res, { error: '站点地址不匹配，请检查服务配置' }, 421);
    if (pathname === '/api/blog') return json(res, { entries: publicEntries, ready: true });
    if (pathname === '/api/ratings') return json(res, await getRatings());
    if (pathname.includes('\0') || pathname.includes('\\') || pathname.split('/').some(part => part.startsWith('.'))) return json(res, { error: '页面不存在' }, 404);
    let file = resolve(root, '.' + pathname);
    if (!file.startsWith(root + sep) && file !== root) return json(res, { error: '页面不存在' }, 404);
    let stat;
    try { stat = statSync(file); } catch {}
    if (!stat?.isFile()) {
        if (extname(pathname) || pathname.startsWith('/api/')) return json(res, { error: '页面不存在' }, 404);
        file = resolve(root, 'index.html'); stat = statSync(file);
    }
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Content-Length': stat.size, 'Cache-Control': file.includes(sep + 'assets' + sep) ? 'public, max-age=31536000, immutable' : 'no-cache' });
    if (req.method === 'HEAD') return res.end();
    createReadStream(file).on('error', () => res.destroy()).pipe(res);
}
const server = createServer((req, res) => handle(req, res).catch(err => {
    console.error('Request failed:', err.message);
    if (!res.headersSent) json(res, { error: '操作失败，请重试' }, 500); else res.destroy();
}));
server.requestTimeout = 30000;
server.headersTimeout = 15000;
server.listen(port, '127.0.0.1', () => console.log(`Blog ready on 127.0.0.1:${server.address().port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
