import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
import sharp from 'sharp';
import { passwordHash } from './build/owner-store.mjs';
import { createBackup, restoreBackup } from './runtime/backup.mjs';

const directory = await mkdtemp(resolve(tmpdir(), 'ease2k-publishing-')), data = resolve(directory, 'editor'); await mkdir(data);
const password = randomBytes(24).toString('hex'), salt = randomBytes(16).toString('hex');
await writeFile(resolve(data, 'owner.json'), JSON.stringify({ version: 'publishing-test', salt, hash: await passwordHash(password, salt), secret: randomBytes(32).toString('hex') }), { mode: 0o600 });
const probe = createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening'); const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
const origin = `http://127.0.0.1:${port}`; let child, cookie = '', csrf = '';
function request(path, method = 'GET', value) { return fetch(origin + path, { method, headers: { 'Content-Type': 'application/json', 'Accept-Language': 'zh-CN', Origin: origin, Cookie: cookie, 'X-CSRF-Token': csrf }, ...(value !== undefined ? { body: JSON.stringify(value) } : {}) }); }
async function json(path) { const response = await request(path); assert.equal(response.status, 200); return response.json(); }
async function start() {
    child = spawn(process.execPath, ['self-hosted/build/server.mjs'], { env: { ...process.env, BLOG_ORIGIN: origin, BLOG_PUBLIC_ORIGIN: 'https://example.test', BLOG_EDITOR_DIR: data, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
    let errors = ''; child.stderr.on('data', value => errors += value);
    await Promise.race([new Promise(resolve => child.stdout.on('data', value => { if (value.toString().includes('Blog ready')) resolve(); })), new Promise((_, reject) => child.on('exit', code => reject(Error(`Server exited ${code}: ${errors}`))))]);
}
async function stop() { const exited = once(child, 'exit'); child.kill('SIGTERM'); await exited; }
async function upload(color, label) {
    const image = await sharp({ create: { width: 64, height: 40, channels: 3, background: color } }).webp().toBuffer();
    const response = await fetch(origin + '/api/owner/media', { method: 'POST', headers: { Origin: origin, Cookie: cookie, 'X-CSRF-Token': csrf, 'Content-Type': 'image/webp', 'X-Image-Name': encodeURIComponent(label) }, body: image }); assert.equal(response.status, 200); return (await response.json()).url;
}
async function group() { return (await json('/api/owner/series')).series.find(value => value.id === 'managed-series'); }
async function photo(url) { return (await json('/api/owner/media')).media.find(value => value.url === url); }
try {
    await start();
    assert.equal((await request('/api/owner/series')).status, 401); assert.equal((await request('/api/owner/media')).status, 401);
    const login = await request('/api/owner/login', 'POST', { password }); cookie = login.headers.get('set-cookie').split(';')[0]; csrf = (await json('/api/owner/session')).csrf;
    assert.equal((await fetch(origin + '/api/owner/media', { headers: { Cookie: cookie, 'X-Forwarded-For': '127.0.0.1' } })).status, 404);
    const source = (await json('/api/owner/series')).series.find(value => value.id === 'cpp-stl-introduction'); assert(source && source.chapterOrder.length === 3);
    const seed = { id: 'managed-series', title: '统一专栏 <&>', enTitle: 'Managed series', description: 'Central description', chapterOrder: [] };
    assert.equal((await request('/api/owner/series', 'PUT', { series: seed, revision: 0, create: true })).status, 200);
    assert.equal((await request('/series/managed-series')).status, 404); assert.equal((await request('/feed/series/managed-series.xml')).status, 404);
    assert.equal((await request('/api/owner/series', 'PUT', { series: seed, revision: 0, create: true })).status, 409);
    assert.equal((await request('/api/owner/series', 'PUT', { series: { ...seed, cover: 'https://tracker.test/pixel.png' }, revision: 1 })).status, 400);
    const a = await upload('#153ccb', '蓝色封面.webp'), b = await upload('#eeaa22', '编辑草稿.webp'), c = await upload('#dd4455', '替换图片.webp'), unused = await upload('#00aa99', '未使用图片.webp');
    assert.equal((await photo(a)).label, '蓝色封面.webp'); assert.equal((await request(a)).status, 404);
    assert.equal((await request('/api/owner/series', 'PUT', { series: { ...seed, cover: a }, revision: 1 })).status, 200); assert.equal((await request(a)).status, 404);
    const series = { ...seed, title: 'IGNORED_PER_ARTICLE_METADATA', order: 1 }, entry = { id: 'search-public', kind: 'article', title: '标题 <&> "RSS"', enTitle: '', summary: '摘要 & <safe>', enSummary: '', body: '## 正文\n\n' + '上下文。'.repeat(150) + ' Needle <&> ' + '后文。'.repeat(100) + '\n\n![图片](' + a + ')', enBody: '', date: '', read: 1, tags: ['JavaScript', '<tag>&'], visibility: 'public', series };
    assert.equal((await request('/api/owner/entries/' + entry.id, 'PUT', { entry, revision: 0, create: true })).status, 200);
    const second = { ...entry, id: 'other-public', title: '第二章', series: { ...series, order: 2 } };
    assert.equal((await request('/api/owner/entries/' + second.id, 'PUT', { entry: second, revision: 0, create: true })).status, 200);
    const hidden = { ...entry, id: 'private-hidden', title: 'PRIVATE_TITLE_ONLY', body: 'PRIVATE_BODY_ONLY', visibility: 'private', series: { ...series, order: 3 } };
    assert.equal((await request('/api/owner/entries/' + hidden.id, 'PUT', { entry: hidden, revision: 0, create: true })).status, 200);
    assert.equal((await request('/api/owner/entries/daily-feed', 'PUT', { entry: { ...entry, id: 'daily-feed', title: 'DAILY_FEED_ENTRY', kind: 'daily', series: undefined }, revision: 0, create: true })).status, 200);
    const original = (await json('/api/entries/search-public')).entry; assert.equal(original.series.title, seed.title); assert.equal((await request(a)).status, 200);
    const results = (await json('/api/search?q=Needle')).entries; assert(results.length); assert(results[0].searchSnippet.includes('Needle')); assert(results[0].searchSnippet.length < 250); assert(!('body' in results[0])); assert(!('enBody' in results[0]));
    assert.equal((await json('/api/search?q=PRIVATE_BODY_ONLY')).entries.length, 0);
    const context = (await json('/api/search?q=priority_queue')).entries.find(entry => entry.id === 'cpp-priority-queue-introduction'); assert(context.searchSnippet.includes('priority_queue')); assert.notEqual(context.searchSnippet, context.title);
    assert((await (await request('/subscribe')).text()).includes('<title>订阅更新'));
    let record = await group(); record.chapterOrder = [second.id, hidden.id, entry.id];
    assert.equal((await request('/api/owner/series', 'PUT', { series: record, revision: record.revision })).status, 200);
    assert.equal((await request('/api/owner/series', 'PUT', { series: record, revision: record.revision })).status, 409);
    const page = await (await request('/series/managed-series')).text(), chapters = page.match(/<ol class="series-chapters">([\s\S]*?)<\/ol>/)[1]; assert(chapters.indexOf(second.id) < chapters.indexOf(entry.id)); assert(!page.includes(hidden.title)); assert(!page.includes('IGNORED_PER_ARTICLE_METADATA')); assert(page.includes(a));
    for (const path of ['/feed.xml', '/feed/technical.xml', '/feed/series/managed-series.xml']) {
        const response = await request(path), xml = await response.text(); assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /rss\+xml/);
        assert(!xml.includes(hidden.title)); assert(!xml.includes(hidden.body)); assert(xml.includes('https://example.test/entry/search-public'));
        const parsed = JSON.parse(execFileSync('python3', ['-c', 'import sys,xml.etree.ElementTree as E,json; r=E.fromstring(sys.stdin.read()); print(json.dumps({"titles":[e.text for e in r.findall("./channel/item/title")],"dates":[e.text for e in r.findall("./channel/item/pubDate")]}))'], { input: xml, encoding: 'utf8' }));
        assert(parsed.titles.includes(entry.title)); assert(parsed.dates.every(date => date.endsWith('GMT'))); assert.equal(parsed.titles.includes('DAILY_FEED_ENTRY'), path === '/feed.xml');
    }
    assert.equal((await request('/feed/series/not-published.xml')).status, 404); assert.equal((await request('/subscribe')).status, 200);
    assert((await (await request('/entry/search-public')).text()).includes('application/rss+xml'));
    assert.equal((await request('/api/owner/drafts/search-public', 'PUT', { entry: { ...original, body: original.body + '\n\n![草稿](' + b + ')' }, baseRevision: original.revision || 1, revision: 0, creating: false })).status, 200);
    assert((await photo(b)).references.some(value => value.kind === 'working')); assert.equal((await request(b)).status, 404);
    assert.equal((await request('/api/owner/media/' + a.split('/').at(-1), 'PUT', { action: 'trash', revision: 1 })).status, 409);
    assert.equal((await request('/api/owner/media/' + a.split('/').at(-1) + '/replace', 'POST', { next: c.split('/').at(-1), revision: 1 })).status, 200);
    const changed = (await json('/api/entries/search-public')).entry; assert(changed.body.includes(c)); assert(!changed.body.includes(a)); assert.equal(changed.date, original.date); assert.equal(changed.summary, original.summary);
    const working = (await json('/api/owner/entries')).drafts.find(value => value.entry.id === 'search-public'); assert(working.entry.body.includes(c)); assert(working.entry.body.includes(b)); assert.equal(working.baseRevision, 2); assert.equal(working.revision, 2);
    assert.equal((await group()).cover, c); assert((await photo(a)).references.some(value => value.kind === 'history')); assert.equal((await request(c)).status, 200);
    assert.equal((await request('/api/owner/media/' + a.split('/').at(-1), 'PUT', { action: 'trash', revision: 1 })).status, 409);
    const name = unused.split('/').at(-1);
    assert.equal((await request('/api/owner/media/' + name, 'PUT', { action: 'rename', label: '暂存图', revision: 1 })).status, 200);
    assert.equal((await request('/api/owner/media/' + name, 'PUT', { action: 'trash', revision: 1 })).status, 409);
    assert.equal((await request('/api/owner/media/' + name, 'PUT', { action: 'trash', revision: 2 })).status, 200); assert.equal((await photo(unused)).deleted, true);
    assert.equal((await request('/api/owner/media/' + c.split('/').at(-1) + '/replace', 'POST', { next: name, revision: 1 })).status, 400);
    assert.equal((await request('/api/owner/entries/invalid-image', 'PUT', { entry: { ...entry, id: 'invalid-image', body: '![已删除](' + unused + ')' }, revision: 0, create: true })).status, 400);
    assert.equal((await request('/api/owner/media/' + name, 'PUT', { action: 'restore', revision: 3 })).status, 200);
    assert.equal((await request('/api/owner/media/' + name, 'PUT', { action: 'trash', revision: 4 })).status, 200);
    await stop(); await start(); assert.equal((await group()).cover, c); assert.equal((await photo(unused)).label, '暂存图');
    const backup = createBackup(data, resolve(directory, 'backups')), restored = resolve(directory, 'restored'); restoreBackup(backup.directory, restored);
    const db = new DatabaseSync(resolve(restored, 'content.sqlite'), { readOnly: true }); assert.equal(JSON.parse(db.prepare('SELECT payload FROM series WHERE id=?').get(seed.id).payload).cover, c); assert.equal(db.prepare('SELECT deleted FROM media_assets WHERE name=?').get(name).deleted, 1); db.close();
    assert((await readFile(resolve(restored, 'media', name))).length > 0);
    process.env.BLOG_BACKUP_MIN_FREE_BYTES = '9000000000000000000'; assert.throws(() => createBackup(data, resolve(directory, 'backups')), /空间不足/); delete process.env.BLOG_BACKUP_MIN_FREE_BYTES;
    const exported = await json('/api/owner/export'); assert.equal(exported.version, 2); assert(exported.series.length && exported.media.length);
    console.log('PASS: centralized series migration and persistence, private isolation, cover access, ordering conflicts, search snippets, parsed RSS feeds, resource references, image replacement and draft revisions, history protection, recoverable trash, complete backup restoration and low-disk guard.');
} finally { if (child?.exitCode === null) await stop(); await rm(directory, { recursive: true, force: true }); }
