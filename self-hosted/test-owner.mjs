import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { randomBytes, randomUUID } from 'node:crypto';
import { passwordHash } from './runtime/owner-store.mjs';

const directory = await mkdtemp(resolve(tmpdir(), 'ease2k-owner-test-'));
const password = randomBytes(24).toString('base64url');
const salt = randomBytes(16).toString('hex');
const config = { version: randomUUID(), salt, hash: await passwordHash(password, salt), secret: randomBytes(32).toString('hex') };
await writeFile(resolve(directory, 'owner.json'), JSON.stringify(config), { mode: 0o600 });
const probe = createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
const origin = `http://127.0.0.1:${port}`;
let child, cookie = '', csrf = '';
async function start() {
    child = spawn(process.execPath, ['self-hosted/build/server.mjs'], { env: { ...process.env, BLOG_EDITOR_DIR: directory, BLOG_ORIGIN: origin, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
    let errors = ''; child.stderr.on('data', chunk => errors += chunk);
    await Promise.race([new Promise(resolve => child.stdout.on('data', chunk => { if (chunk.toString().includes('Blog ready')) resolve(); })), new Promise((_, reject) => child.on('exit', code => reject(Error(`Server exited ${code}: ${errors}`))))]);
}
async function stop() { const exited = once(child, 'exit'); child.kill('SIGTERM'); await exited; }
function request(path, method = 'GET', value, extra = {}) {
    return fetch(origin + path, { method, redirect: 'manual', headers: { 'Content-Type': 'application/json', Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...extra }, ...(value !== undefined ? { body: JSON.stringify(value) } : {}) });
}
async function login() {
    const response = await request('/api/owner/login', 'POST', { password });
    assert.equal(response.status, 200);
    const header = response.headers.get('set-cookie');
    assert.match(header, /HttpOnly/); assert.match(header, /SameSite=Strict/); assert.match(header, /Path=\/api\/owner/);
    cookie = header.split(';')[0];
    csrf = (await (await request('/api/owner/session')).json()).csrf;
    assert(csrf);
}
const entry = { id: 'owner-integration-test', kind: 'article', title: '测试文章', enTitle: '', summary: '测试摘要', enSummary: '', body: 'DRAFT_SHOULD_NEVER_LEAK_' + randomUUID(), enBody: '', date: '2026-10-30T19:30:00+08:00', tags: ['Java'], read: 1, visibility: 'private' };
try {
    await start();
    assert.equal((await request('/_owner')).status, 200);
    assert.equal((await request('/owner.html')).status, 404);
    for (const path of ['/_owner', '/api/owner/session', '/api/owner/entries', '/api/%6fwner/entries']) {
        assert.equal((await request(path, 'GET', undefined, { 'X-Forwarded-For': '203.0.113.50' })).status, 404, path);
    }
    assert.equal((await request('/api/owner/entries')).status, 401);
    assert.equal((await request('/api/owner/login', 'POST', { password }, { Origin: 'http://attacker.invalid' })).status, 403);
    assert.equal((await request('/api/owner/login', 'POST', { password: 'incorrect-test-password' })).status, 401);
    await login();
    const base = await (await request('/api/owner/entries')).json(); assert(base.entries.length);
    assert.equal((await request('/api/owner/entries/' + entry.id, 'PUT', { entry, revision: 0, create: true }, { 'X-CSRF-Token': 'bad' })).status, 403);
    assert.equal((await request('/api/owner/entries/' + entry.id, 'PUT', { entry, revision: 0, create: true })).status, 200);
    assert(!(await (await request('/api/blog')).text()).includes(entry.body));
    let saved = (await (await request('/api/owner/entries')).json()).entries.find(item => item.id === entry.id); assert.equal(saved.revision, 1);
    assert.equal((await request('/api/owner/entries/' + entry.id, 'PUT', { entry: { ...entry, visibility: 'public' }, revision: 1 })).status, 200);
    assert((await (await request('/api/blog')).text()).includes(entry.body));
    assert.equal((await request('/api/owner/entries/' + entry.id, 'PUT', { entry, revision: 1 })).status, 409);
    await stop(); await start();
    assert((await (await request('/api/owner/session')).json()).authenticated, 'Session must survive restart');
    saved = (await (await request('/api/owner/entries')).json()).entries.find(item => item.id === entry.id); assert.equal(saved.revision, 2);
    const bundled = base.entries[0];
    const altered = { ...bundled, title: '已在线修改', visibility: 'public' };
    assert.equal((await request('/api/owner/entries/' + bundled.id, 'PUT', { entry: altered, revision: 0 })).status, 200);
    assert.equal((await (await request('/api/blog')).json()).entries.find(item => item.id === bundled.id).title, '已在线修改');
    assert.equal((await request('/api/owner/entries/' + entry.id, 'DELETE', { revision: 2 })).status, 200);
    assert(!(await (await request('/api/blog')).text()).includes(entry.body));
    assert.equal((await request('/api/owner/entries/' + entry.id + '/restore', 'POST', { revision: 3 })).status, 200);
    assert(!(await (await request('/api/blog')).text()).includes(entry.body), 'Restored content must remain a draft');
    assert((await (await request('/api/owner/entries/' + entry.id + '/history')).json()).history.length >= 4);
    assert((await (await request('/api/owner/export')).json()).entries.some(item => item.id === entry.id));
    const original = await readFile(resolve(directory, 'owner.json'), 'utf8');
    assert(!original.includes(password));
    for (const file of await readdir('self-hosted/build/client/assets')) {
        if (file.endsWith('.js')) assert(!(await readFile('self-hosted/build/client/assets/' + file, 'utf8')).includes(entry.body));
    }
    const changed = { ...config, version: randomUUID(), secret: randomBytes(32).toString('hex') };
    await writeFile(resolve(directory, 'owner.json'), JSON.stringify(changed), { mode: 0o600 });
    assert.equal((await request('/api/owner/entries')).status, 401, 'Password reset must invalidate existing sessions');
    cookie = ''; csrf = ''; await login();
    assert.equal((await request('/api/owner/logout', 'POST', {})).status, 200);
    assert.equal((await request('/api/owner/entries')).status, 401);
    cookie = ''; csrf = '';
    for (let i = 0; i < 8; i++) assert.equal((await request('/api/owner/login', 'POST', { password: 'incorrect-test-password' })).status, 401);
    assert.equal((await request('/api/owner/login', 'POST', { password })).status, 429);
    console.log('PASS: SSH-only access, password hashing, sessions, CSRF, drafts, publication, revision conflicts, restart persistence, bundled overrides, trash recovery, history, export, logout and login throttling.');
} finally { if (child?.exitCode === null) await stop(); await rm(directory, { recursive: true, force: true }); }
