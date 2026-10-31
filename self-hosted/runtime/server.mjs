import { createServer } from 'node:http';
import { statSync, createReadStream } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { entries } from './content.mjs';
import { getRatings } from './ratings.mjs';
import { openStore } from './owner-store.mjs';
import { handleOwner } from './owner-http.mjs';
import { seriesStore } from './series-store.mjs';
import { resourceStore } from './resources.mjs';
import { feed } from './feeds.mjs';
import { serveMedia } from './media.mjs';
import { visible, indexEntry, searchEntries, sitemap, page } from './public-pages.mjs';

const root = resolve(fileURLToPath(new URL('./client/', import.meta.url)));
const origin = new URL(process.env.BLOG_ORIGIN || 'http://localhost:3000');
const publicOrigin = new URL(process.env.BLOG_PUBLIC_ORIGIN || origin).origin;
const port = Number(process.env.PORT || 3000);
const directory = resolve(process.env.BLOG_EDITOR_DIR || fileURLToPath(new URL('../data/editor/', import.meta.url)));
const store = openStore(directory, entries);
const registry = seriesStore(store), resources = resourceStore(store, directory);
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
    if (await handleOwner(req, res, pathname, store, root, json, directory, registry, resources)) return;
    if (removedRoutes.has(pathname.split('/')[1])) return json(res, { error: '页面不存在' }, 404);
    if (!['GET', 'HEAD'].includes(req.method)) {
        res.setHeader('Allow', 'GET, HEAD');
        return json(res, { error: '不支持此请求方法' }, 405);
    }
    if (pathname === '/healthz') return json(res, { ok: true });
    if (req.headers.host !== origin.host) return json(res, { error: '站点地址不匹配，请检查服务配置' }, 421);
    if (pathname === '/feed.xml' || pathname === '/feed/technical.xml' || /^\/feed\/series\/[a-z0-9-]+\.xml$/.test(pathname)) {
        const result = feed(visible(store), pathname, publicOrigin);
        res.writeHead(result ? 200 : 404, { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'no-cache' });
        return res.end(req.method === 'HEAD' ? undefined : result || 'Not found');
    }
    if (pathname === '/api/blog') return json(res, { entries: store.publicEntries(), ready: true });
    if (pathname === '/api/index') return json(res, { entries: visible(store).map(indexEntry), ready: true });
    if (pathname === '/api/search') return json(res, { entries: searchEntries(visible(store), url.searchParams.get('q') || '') });
    if (pathname.startsWith('/api/entries/')) {
        const entry = visible(store).find(entry => '/api/entries/' + entry.id === pathname);
        return entry ? json(res, { entry }) : json(res, { error: '记录暂不可见' }, 404);
    }
    if (pathname.startsWith('/media/')) {
        if (visible(store).some(entry => ((entry.body + '\n' + entry.enBody + JSON.stringify(entry.playground || {})).includes(pathname) || entry.series?.cover === pathname)) && serveMedia(req, res, pathname.slice(7), directory, false)) return;
        return json(res, { error: '图片不存在' }, 404);
    }
    if (pathname === '/sitemap.xml' || pathname === '/robots.txt') {
        res.writeHead(200, { 'Content-Type': pathname.endsWith('.xml') ? 'application/xml; charset=utf-8' : 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' });
        return res.end(req.method === 'HEAD' ? undefined : pathname.endsWith('.xml') ? sitemap(visible(store), publicOrigin) : 'User-agent: *\nDisallow: /_owner\nDisallow: /api/\nSitemap: ' + publicOrigin + '/sitemap.xml\n');
    }
    if (pathname === '/api/ratings') return json(res, await getRatings());
    if (pathname.includes('\0') || pathname.includes('\\') || pathname.split('/').some(part => part.startsWith('.'))) return json(res, { error: '页面不存在' }, 404);
    let file = resolve(root, '.' + pathname);
    if (!file.startsWith(root + sep) && file !== root) return json(res, { error: '页面不存在' }, 404);
    let stat;
    try { stat = statSync(file); } catch {}
    if (!stat?.isFile()) {
        if (extname(pathname) || pathname.startsWith('/api/')) return json(res, { error: '页面不存在' }, 404);
        const result = await page(req, pathname, store, root, publicOrigin);
        res.writeHead(result.status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', Vary: 'Accept-Language' });
        return res.end(req.method === 'HEAD' ? undefined : result.html);
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
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { store.db.close(); process.exit(0); }));
