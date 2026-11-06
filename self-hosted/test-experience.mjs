import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import sharp from 'sharp';
import { passwordHash } from './build/owner-store.mjs';

const directory = await mkdtemp(resolve(tmpdir(), 'ease2k-experience-')), data = resolve(directory, 'editor');
await mkdir(data);
const password = randomBytes(24).toString('hex'), salt = randomBytes(16).toString('hex');
await writeFile(resolve(data, 'owner.json'), JSON.stringify({ version: 'experience-test', salt, hash: await passwordHash(password, salt), secret: randomBytes(32).toString('hex') }), { mode: 0o600 });
const probe = createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening'); const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
const origin = 'http://127.0.0.1:' + port;
const child = spawn(process.execPath, ['self-hosted/build/server.mjs'], { env: { ...process.env, PORT: String(port), BLOG_ORIGIN: origin, BLOG_EDITOR_DIR: data }, stdio: ['ignore', 'pipe', 'pipe'] });
let cookie = '', csrf = '', errors = '';
child.stderr.on('data', value => errors += value);
async function request(path, method = 'GET', body) {
    return fetch(origin + path, { method, headers: { 'Content-Type': 'application/json', 'Accept-Language': 'zh-CN', Origin: origin, Cookie: cookie, 'X-CSRF-Token': csrf }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function json(path) { const response = await request(path); assert.equal(response.status, 200); return response.json(); }
async function write(entry, revision, extra = {}, status = 200) {
    const response = await request('/api/owner/entries/' + entry.id, 'PUT', { entry, revision, ...extra });
    const value = await response.json(); assert.equal(response.status, status, JSON.stringify(value)); return value.entry;
}
async function upload(color) {
    const bytes = await sharp({ create: { width: 60, height: 40, channels: 3, background: color } }).webp().toBuffer();
    const response = await fetch(origin + '/api/owner/media', { method: 'POST', headers: { Origin: origin, Cookie: cookie, 'X-CSRF-Token': csrf, 'Content-Type': 'image/webp' }, body: bytes });
    assert.equal(response.status, 200); return (await response.json()).url;
}
try {
    await Promise.race([new Promise(resolve => child.stdout.on('data', value => { if (value.toString().includes('Blog ready')) resolve(); })), new Promise((_, reject) => child.on('exit', code => reject(Error('Server exited ' + code + ': ' + errors))))]);
    const login = await request('/api/owner/login', 'POST', { password }); assert.equal(login.status, 200); cookie = login.headers.get('set-cookie').split(';')[0]; csrf = (await json('/api/owner/session')).csrf;
    let html = await (await request('/')).text();
    const ids = [...html.matchAll(/data-entry="([^"]+)"/g)].map(match => match[1]);
    assert.equal(ids.length, new Set(ids).size, 'Homepage must not repeat entries across featured, recent and project cards');
    assert(html.includes('精选阅读')); assert(html.includes('最近更新')); assert(html.includes('正在做什么'));
    const first = await write({ id: 'experience-article', kind: 'article', title: '维护信息测试', enTitle: '', summary: '维护摘要', enSummary: '', body: '## 测试正文\n\n公开正文', enBody: '', tags: ['Java'], date: '1900-01-01T00:00:00Z', read: 1, visibility: 'public', featured: true, environment: 'Java 21', modifiedAt: '1900-01-01T00:00:00Z', updateNote: '未确认的说明' }, 0, { create: true });
    assert.notEqual(first.date, '1900-01-01T00:00:00Z'); assert(!first.modifiedAt); assert(!first.updateNote);
    const draft = { ...first, body: 'PRIVATE_EXPERIENCE_DRAFT', updateNote: 'PRIVATE_UPDATE_NOTE' };
    assert.equal((await request('/api/owner/drafts/' + first.id, 'PUT', { entry: draft, baseRevision: first.revision, revision: 0, creating: false })).status, 200);
    assert(!(await (await request('/')).text()).includes('PRIVATE_EXPERIENCE_DRAFT'));
    let entry = await write({ ...first, body: first.body + '。', modifiedAt: '2099-01-01T00:00:00Z' }, first.revision);
    assert(!entry.modifiedAt); assert.equal(entry.date, first.date);
    await write({ ...entry, updateNote: '' }, entry.revision, { recordUpdate: true }, 400);
    const start = Date.now();
    entry = await write({ ...entry, body: entry.body + '\n\n新增边界情况', updateNote: '补充边界情况', enUpdateNote: 'Add edge cases' }, entry.revision, { recordUpdate: true });
    assert(Date.parse(entry.modifiedAt) >= start && Date.parse(entry.modifiedAt) <= Date.now()); assert.equal(entry.date, first.date);
    const modified = entry.modifiedAt;
    entry = await write({ ...entry, updateNote: '不能替换已发布说明', modifiedAt: '2099-01-01T00:00:00Z' }, entry.revision);
    assert.equal(entry.modifiedAt, modified); assert.equal(entry.updateNote, '补充边界情况');
    html = await (await request('/entry/' + entry.id)).text(); assert(html.includes('实质更新于')); assert(html.includes('补充边界情况')); assert(html.includes('Java 21')); assert(html.includes('issues/new?title='));
    const structured = JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]); assert.equal(structured.dateModified, modified); assert.equal(structured.datePublished, first.date);
    assert((await (await request('/sitemap.xml')).text()).includes('<lastmod>' + modified + '</lastmod>'));
    entry = await write({ ...entry, visibility: 'private', updateNote: 'PRIVATE_UPDATE_NOTE' }, entry.revision, { recordUpdate: true });
    assert.equal(entry.modifiedAt, modified); assert.equal((await request('/entry/' + entry.id)).status, 404); assert(!(await (await request('/')).text()).includes('维护信息测试'));
    entry = await write({ ...entry, visibility: 'public' }, entry.revision); assert.equal(entry.date, first.date); assert.equal(entry.modifiedAt, modified);
    const image = await upload('#153ccb'), next = await upload('#214cc8');
    let project = await write({ ...first, id: 'experience-project', kind: 'project', title: '真实项目', visibility: 'private', project: { status: 'active', stack: ['React', 'React', ''], problem: '解决整理问题', outcomes: ['已完成编辑'], screenshot: image, sourceUrl: 'https://github.com/ease2K/ease2k-blog-public', demoUrl: '/' } }, 0, { create: true });
    assert.equal((await request(image)).status, 404); assert(!(await json('/api/index')).entries.some(entry => entry.id === project.id));
    project = await write({ ...project, visibility: 'public' }, project.revision); assert.equal((await request(image)).status, 200); assert.deepEqual(project.project.stack, ['React']);
    let asset = (await json('/api/owner/media')).media.find(value => value.url === image); assert(asset.references.some(value => value.kind === 'published' && value.id === project.id));
    assert.equal((await request('/api/owner/media/' + asset.name, 'PUT', { action: 'trash', revision: asset.revision })).status, 409);
    assert.equal((await request('/api/owner/media/' + asset.name + '/replace', 'POST', { next: next.split('/').at(-1), revision: asset.revision })).status, 200);
    const rewritten = (await json('/api/entries/' + project.id)).entry; assert.equal(rewritten.project.screenshot, next); assert.equal(rewritten.date, project.date); assert.equal(rewritten.modifiedAt, project.modifiedAt);
    assert.equal((await request(next)).status, 200); assert.equal((await request(image)).status, 404);
    await write({ ...rewritten, project: { ...rewritten.project, sourceUrl: 'javascript:alert(1)' } }, project.revision + 1, {}, 400);
    await write({ ...rewritten, project: { ...rewritten.project, screenshot: '/projects/../private.png' } }, project.revision + 1, {}, 400);
    const index = await json('/api/index'); assert(index.entries.every(entry => !Object.hasOwn(entry, 'body') && !Object.hasOwn(entry, 'enBody')));
    html = await (await request('/projects')).text(); assert(html.includes('解决整理问题')); assert(html.includes(next)); assert(html.includes('项目源码'));
    assert.equal((await request('/projects/personal-blog.webp')).status, 200);
    console.log('PASS: homepage deduplication, manual featured selection, deliberate server-owned modification times, draft isolation, preserved publication dates, SSR metadata, sitemap lastmod, project validation, publication-gated screenshots and protected image replacement.');
} finally {
    if (child.exitCode === null) { const exited = once(child, 'exit'); child.kill('SIGTERM'); await exited; }
    await rm(directory, { recursive: true, force: true });
}
