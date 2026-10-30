import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { awards, entries } from './build/content.mjs';

const dataDir = await mkdtemp(resolve(tmpdir(), 'ease2k-public-test-'));
const database = resolve(dataDir, 'blog.sqlite');
const db = new DatabaseSync(database);
db.exec("CREATE TABLE diary (id TEXT PRIMARY KEY, title TEXT, body TEXT, visibility TEXT, tag TEXT, date TEXT); INSERT INTO diary VALUES ('legacy-private','old','PRIVATE_BODY_MARKER','private','life','2026-10-29');");
db.close();
const oldConfig = 'LEGACY_CONFIGURATION_MUST_NOT_CHANGE';
await writeFile(resolve(dataDir, 'owner.json'), oldConfig);
const originalDatabase = await readFile(database);
const probe = createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
const origin = `http://127.0.0.1:${port}`;
let child;
async function start() {
    child = spawn(process.execPath, ['self-hosted/build/server.mjs'], { env: { ...process.env, BLOG_DATA_DIR: dataDir, BLOG_EDITOR_DIR: resolve(dataDir, 'editor'), BLOG_ORIGIN: origin, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
    let errors = ''; child.stderr.on('data', chunk => errors += chunk);
    await Promise.race([new Promise(resolve => child.stdout.on('data', chunk => { if (chunk.toString().includes('Blog ready')) resolve(); })), new Promise((_, reject) => child.on('exit', code => reject(Error(`Server exited ${code}: ${errors}`))))]);
}
async function stop() { const exited = once(child, 'exit'); child.kill('SIGTERM'); await exited; }
const request = (path, options = {}) => fetch(origin + path, { redirect: 'manual', ...options });
try {
    await start();
    assert.equal((await request('/healthz')).status, 200);
    assert.equal((await request('/brands/github-black.svg')).status, 200);
    for (const award of awards) {
        const file = resolve('self-hosted/build/client', '.' + award.certificate);
        assert.equal((await stat(file)).mode & 0o444, 0o444);
        const image = await request(award.certificate);
        assert.equal(image.status, 200);
        assert.deepEqual(Buffer.from(await image.arrayBuffer()), await readFile(file));
        const thumbnail = award.certificate.replace(/\/([^/]+)\.(?:jpg|png)$/, '/thumbnails/$1-480.webp');
        const preview = await request(thumbnail);
        assert.equal(preview.status, 200);
        assert.equal(preview.headers.get('content-type'), 'image/webp');
        assert((await preview.arrayBuffer()).byteLength < (await stat(file)).size / 3);
    }
    for (const path of ['/signin', '/signin?return_to=/daily', '/signout', '/admin', '/private', '/s%69gnin', '/signin-with-chatgpt', '/api/private', '/api/admin', '/owner.json', '/blog.sqlite', '/.env', '/%2e%2e%2fowner.json']) assert.equal((await request(path)).status, 404, path);
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) assert.equal((await request('/api/blog', { method, headers: { origin, cookie: 'ease-session=old-owner-session', 'content-type': 'application/json' }, body: JSON.stringify({ body: 'attempted-write' }) })).status, 405, method);
    assert.equal(await new Promise((resolve, reject) => { const req = httpRequest(origin + '/', { headers: { host: 'attacker.example' } }, res => { res.resume(); resolve(res.statusCode); }); req.on('error', reject); req.end(); }), 421);
    for (const path of ['/api/blog', '/api/blog?visitor=0', '/api/blog?visibility=private']) {
        const response = await request(path, { headers: { cookie: 'ease-session=old-owner-session', 'oai-authenticated-user-id': 'owner', 'oai-authenticated-user-email': 'owner@example.test' } });
        assert.equal(response.headers.get('set-cookie'), null);
        const text = await response.text(), data = JSON.parse(text);
        assert.equal(data.ready, true);
        assert(!('owner' in data)); assert(!('signedIn' in data));
        assert(!text.includes('PRIVATE_BODY_MARKER'));
        assert.deepEqual(data.entries.map(entry => entry.id), entries.map(entry => entry.id));
    }
    assert.equal((await request('/api/blog', { method: 'HEAD' })).status, 200);
    assert(!(await (await request('/entry/legacy-private')).text()).includes('PRIVATE_BODY_MARKER'));
    await stop(); await start();
    assert.equal((await (await request('/api/blog')).json()).entries.length, entries.length);
    assert.deepEqual(await readFile(database), originalDatabase);
    assert.equal(await readFile(resolve(dataDir, 'owner.json'), 'utf8'), oldConfig);
    console.log('PASS: public file content, six certificates, removed auth routes, no write APIs, no private data or credentials, unchanged legacy files, restart persistence.');
} finally { if (child?.exitCode === null) await stop(); await rm(dataDir, { recursive: true, force: true }); }
