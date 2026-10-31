import { createReadStream } from 'node:fs';
import { resolve } from 'node:path';
import { upload, serveMedia } from './media.mjs';
import { equal, failure } from './owner-store.mjs';

async function body(req) {
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) throw failure('请求需要使用 JSON 格式。', 415);
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
        size += chunk.length;
        if (size > 2 * 1024 * 1024) throw failure('文章内容过大。', 413);
        chunks.push(chunk);
    }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw failure('JSON 格式不正确。'); }
}
export function ownerRequest(req) {
    let host;
    try { host = new URL('http://' + req.headers.host).hostname; } catch { return false; }
    return ['localhost', '127.0.0.1', '[::1]'].includes(host)
        && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)
        && !['forwarded', 'x-forwarded-for', 'x-real-ip', 'x-forwarded-host', 'x-forwarded-proto'].some(name => req.headers[name]);
}
const cookie = (token, age = 8 * 60 * 60) => `ease_owner=${token}; HttpOnly; SameSite=Strict; Path=/api/owner; Max-Age=${age}`;
export async function handleOwner(req, res, pathname, store, root, json, directory, registry, resources) {
    const portal = pathname === '/_owner' || pathname.startsWith('/_owner/');
    const api = pathname === '/api/owner' || pathname.startsWith('/api/owner/');
    if (!portal && !api && pathname !== '/owner.html') return false;
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.setHeader('Cache-Control', 'no-store');
    if (!ownerRequest(req) || pathname === '/owner.html') { json(res, { error: '页面不存在' }, 404); return true; }
    if (portal) {
        if (!['GET', 'HEAD'].includes(req.method)) { json(res, { error: '不支持此请求方法' }, 405); return true; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        if (req.method === 'HEAD') res.end();
        else createReadStream(resolve(root, 'owner.html')).on('error', () => res.destroy()).pipe(res);
        return true;
    }
    try {
        const auth = store.session(req);
        if (!['GET', 'HEAD'].includes(req.method)) {
            const expected = process.env.BLOG_OWNER_ORIGIN || 'http://' + req.headers.host;
            if (req.headers.origin !== expected || req.headers['sec-fetch-site'] === 'cross-site') throw failure('请求来源不正确，请从站主入口重新打开。', 403);
            if (pathname !== '/api/owner/login' && (!auth || !equal(req.headers['x-csrf-token'], auth.csrf))) throw failure('登录已过期或请求校验失败，请重新登录。', auth ? 403 : 401);
        }
        if (pathname === '/api/owner/session' && req.method === 'GET') {
            json(res, { configured: !!store.owner(), authenticated: !!auth, ...(auth ? { csrf: auth.csrf } : {}) });
        } else if (pathname === '/api/owner/login' && req.method === 'POST') {
            const value = await body(req), token = await store.login(value.password);
            res.setHeader('Set-Cookie', cookie(token));
            json(res, { ok: true });
        } else {
            if (!auth) throw failure('请先登录。', 401);
            if (pathname === '/api/owner/logout' && req.method === 'POST') {
                store.logout(auth); res.setHeader('Set-Cookie', cookie('', 0)); json(res, { ok: true });
            } else if (pathname === '/api/owner/entries' && req.method === 'GET') {
                json(res, { entries: store.all(), trash: store.trash(), drafts: store.drafts(), series: registry.list() });
            } else if (pathname === '/api/owner/export' && req.method === 'GET') {
                res.setHeader('Content-Disposition', 'attachment; filename="ease2k-editor-backup.json"');
                json(res, { version: 2, series: registry.list(), media: resources.list(), exportedAt: new Date().toISOString(), entries: store.all(), trash: store.trash(), drafts: store.drafts() });
            } else if (pathname === '/api/owner/series' && req.method === 'GET') {
                json(res, { series: registry.list() });
            } else if (pathname === '/api/owner/series' && req.method === 'PUT') {
                const value = await body(req); json(res, { series: registry.save(value.series, value.revision, value.create === true) });
            } else if (pathname === '/api/owner/media' && req.method === 'GET') {
                json(res, { media: resources.list() });
            } else if (/^\/api\/owner\/media\/[a-f0-9-]{36}\.webp$/.test(pathname) && req.method === 'PUT') {
                json(res, resources.edit(pathname.split('/').at(-1), await body(req)));
            } else if (/^\/api\/owner\/media\/[a-f0-9-]{36}\.webp\/replace$/.test(pathname) && req.method === 'POST') {
                const value = await body(req); json(res, resources.replace(pathname.split('/').at(-2), value.next, value.revision));
            } else if (pathname === '/api/owner/media' && req.method === 'POST') {
                const image = await upload(req, directory);
                let label = ''; try { label = decodeURIComponent(req.headers['x-image-name'] || ''); } catch {}
                resources.register(image.url.split('/').at(-1), label.slice(0, 200)); json(res, image);
            } else if (pathname.startsWith('/api/owner/media/') && ['GET', 'HEAD'].includes(req.method)) {
                if (!serveMedia(req, res, pathname.slice('/api/owner/media/'.length), directory)) throw failure('图片不存在。', 404);
            } else if (/^\/api\/owner\/drafts\/[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(pathname) && req.method === 'PUT') {
                json(res, { draft: store.saveDraft(pathname.split('/').at(-1), await body(req)) });
            } else {
                const match = /^\/api\/owner\/entries\/([A-Za-z0-9][A-Za-z0-9_-]{0,99})(?:\/(history|restore))?$/.exec(pathname);
                if (!match) throw failure('接口不存在。', 404);
                const [, id, action] = match;
                if (action === 'history' && req.method === 'GET') json(res, { history: store.history(id) });
                else if (action === 'restore' && req.method === 'POST') {
                    const value = await body(req), old = store.trash().find(entry => entry.id === id);
                    if (!old) throw failure('回收站中没有这篇文章。', 404);
                    json(res, { entry: store.write(id, { ...old, visibility: 'private' }, value.revision, false, false, true) });
                } else if (!action && req.method === 'PUT') {
                    const value = await body(req);
                    json(res, { entry: store.write(id, value.entry, value.revision, false, value.create === true) });
                } else if (!action && req.method === 'DELETE') {
                    const value = await body(req);
                    store.write(id, null, value.revision, true);
                    json(res, { ok: true });
                } else throw failure('不支持此请求方法。', 405);
            }
        }
    } catch (error) {
        if (!error.status) console.error('Owner request failed:', error.message);
        if (error.status === 429) res.setHeader('Retry-After', '900');
        json(res, { error: error.status ? error.message : '操作失败，请稍后重试。' }, error.status || 500);
    }
    return true;
}
