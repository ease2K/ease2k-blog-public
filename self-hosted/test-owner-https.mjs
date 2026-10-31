import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import { request as httpsRequest } from 'node:https';
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
import { passwordHash } from './build/owner-store.mjs';
import { ownerHTTPS } from './deploy/owner-nginx.mjs';

const folder = await mkdtemp(resolve(tmpdir(), 'ease2k-owner-https-'));
const password = randomBytes(24).toString('base64url'), secret = randomBytes(32).toString('hex');
const config = { version: randomUUID(), salt: randomBytes(16).toString('hex'), secret: randomBytes(32).toString('hex') };
config.hash = await passwordHash(password, config.salt);
await writeFile(resolve(folder, 'owner.json'), JSON.stringify(config), { mode: 0o600 });
async function availablePort() { const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening'); const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port; }
const backendPort = await availablePort(), port = await availablePort(), origin = 'https://127.0.0.1:' + port;
const certificate = resolve(folder, 'certificate.pem'), key = resolve(folder, 'key.pem');
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-noenc', '-keyout', key, '-out', certificate, '-days', '1', '-subj', '/CN=owner-https-test', '-addext', 'subjectAltName=IP:127.0.0.1'], { stdio: 'ignore' });
const ca = await readFile(certificate), nginxBin = process.env.NGINX_BIN || 'nginx';
let app, nginx, cookie = '', csrf = '';
async function start(enabled = true) {
    const env = { ...process.env, PORT: String(backendPort), BLOG_ORIGIN: 'http://localhost:' + backendPort, BLOG_EDITOR_DIR: folder, BLOG_OWNER_PUBLIC_ORIGIN: enabled ? origin : '', BLOG_OWNER_PROXY_SECRET: enabled ? secret : '' };
    app = spawn(process.execPath, ['self-hosted/build/server.mjs'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let errors = ''; app.stderr.on('data', value => errors += value);
    await Promise.race([new Promise(resolve => app.stdout.on('data', value => { if (String(value).includes('Blog ready')) resolve(); })), new Promise((_, reject) => app.on('exit', code => reject(Error('Application exited ' + code + ': ' + errors))))]);
}
async function stop() { const exit = once(app, 'exit'); app.kill('SIGTERM'); await exit; }
function direct(path, extra = {}) { return fetch('http://127.0.0.1:' + backendPort + path, { headers: { Host: 'localhost:' + backendPort, ...extra } }); }
function request(path, method = 'GET', value, extra = {}) {
    return new Promise((resolve, reject) => {
        const data = value === undefined ? undefined : JSON.stringify(value);
        const req = httpsRequest(origin + path, { ca, method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}), ...extra } }, res => {
            const chunks = []; res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text: Buffer.concat(chunks).toString() }));
        });
        req.on('error', reject); req.setTimeout(10000, () => req.destroy(Error('HTTPS request timeout'))); req.end(data);
    });
}
async function login(remember = false) {
    const response = await request('/api/owner/login', 'POST', { password, remember });
    assert.equal(response.status, 200, response.text);
    const header = response.headers['set-cookie'][0];
    assert.match(header, /^__Host-ease_owner=/); assert.match(header, /; Secure/); assert.match(header, /HttpOnly/); assert.match(header, /SameSite=Strict/); assert.match(header, /Path=\/;/);
    assert.match(header, new RegExp('Max-Age=' + (remember ? 2592000 : 28800) + '(?:;|$)'));
    cookie = header.split(';')[0];
    const state = JSON.parse((await request('/api/owner/session')).text); assert(state.authenticated); csrf = state.csrf;
    const db = new DatabaseSync(resolve(folder, 'content.sqlite'), { readOnly: true });
    const duration = db.prepare('SELECT max(expires) AS expiry FROM sessions').get().expiry - Date.now(); db.close();
    assert(duration <= (remember ? 2592000000 : 28800000) && duration > (remember ? 2592000000 : 28800000) - 30000);
}
try {
    await start();
    const nginxConfig = `pid ${folder}/nginx.pid; error_log ${folder}/error.log; events {} http { access_log off; client_body_temp_path ${folder}/body; proxy_temp_path ${folder}/proxy; ${ownerHTTPS({ ip: '127.0.0.1', secret, certificate, key, port, backendPort })} }`;
    await writeFile(resolve(folder, 'nginx.conf'), nginxConfig, { mode: 0o600 });
    const check = spawnSync(nginxBin, ['-t', '-p', folder + '/', '-c', resolve(folder, 'nginx.conf')], { encoding: 'utf8' });
    assert.equal(check.status, 0, check.stderr);
    nginx = spawn(nginxBin, ['-p', folder + '/', '-c', resolve(folder, 'nginx.conf'), '-g', 'daemon off;'], { stdio: ['ignore', 'pipe', 'pipe'] });
    for (let index = 0; ; index++) {
        try { assert.equal((await request('/_owner')).status, 200); break; } catch (error) { if (index >= 30 || nginx.exitCode !== null) throw error; await new Promise(resolve => setTimeout(resolve, 40)); }
    }
    const page = await request('/'); assert.equal(page.status, 200); assert(page.text.includes('class="footer-owner" href="/_owner"'));
    assert.equal((await request('/owner.html')).status, 404);
    assert.equal((await request('/api/owner/entries')).status, 401);
    const proxy = { 'X-Ease2k-Owner-Proxy': secret, 'X-Forwarded-Proto': 'https', 'X-Forwarded-Host': '127.0.0.1:' + port };
    for (const headers of [{ 'X-Forwarded-Proto': 'https' }, { ...proxy, 'X-Ease2k-Owner-Proxy': 'wrong' }, { ...proxy, 'X-Forwarded-Proto': 'http' }, { ...proxy, 'X-Forwarded-Host': 'attacker.example' }, { ...proxy, Forwarded: 'proto=https' }]) assert.equal((await direct('/api/owner/session', headers)).status, 404);
    assert.equal((await direct('/api/owner/session')).status, 200, 'Existing SSH access must stay available');
    const state = JSON.parse((await request('/api/owner/session', 'GET', undefined, { ...proxy, 'X-Ease2k-Owner-Proxy': 'attacker', 'X-Forwarded-Host': 'attacker.example' })).text);
    assert.equal(state.authenticated, false, 'Nginx must replace client-supplied proxy credentials');
    await login();
    assert.equal((await request('/api/owner/logout', 'POST', {})).status, 200); cookie = ''; csrf = '';
    await login(true);
    const saved = cookie;
    const entry = { id: 'https-private-draft', kind: 'article', title: 'HTTPS private test', summary: 'Private', body: 'PRIVATE_HTTPS_MARKER', date: '', tags: [], visibility: 'private' };
    assert.equal((await request('/api/owner/entries/' + entry.id, 'PUT', { entry, revision: 0, create: true }, { Origin: 'https://attacker.example' })).status, 403);
    assert.equal((await request('/api/owner/entries/' + entry.id, 'PUT', { entry, revision: 0, create: true }, { 'X-CSRF-Token': 'wrong' })).status, 403);
    assert.equal((await request('/api/owner/entries/' + entry.id, 'PUT', { entry, revision: 0, create: true })).status, 200);
    const publicData = await request('/api/blog'); assert.equal(publicData.status, 200); assert(!publicData.text.includes('PRIVATE_HTTPS_MARKER')); assert.equal(publicData.headers['set-cookie'], undefined);
    assert.equal((await request('/api/blog', 'POST', {})).status, 403);
    await stop(); await start(); assert.equal(JSON.parse((await request('/api/owner/session')).text).authenticated, true);
    const logout = await request('/api/owner/logout', 'POST', {}); assert.equal(logout.status, 200); assert.match(logout.headers['set-cookie'][0], /Max-Age=0; Secure/);
    cookie = saved; assert.equal((await request('/api/owner/entries')).status, 401);
    assert.equal(await readFile(resolve(folder, 'owner.json'), 'utf8'), JSON.stringify(config));
    await stop(); await start(false); assert.equal((await request('/_owner')).status, 404, 'Public owner access stays disabled without explicit proxy configuration');
    console.log('PASS: real certificate-verified HTTPS/Nginx entry, footer link, spoofing rejection, secure host-only cookies, 8-hour and 30-day server expiry, CSRF, private publication isolation, restart persistence, logout revocation, unchanged password and SSH access.');
} finally {
    if (app?.exitCode === null) await stop();
    if (nginx?.exitCode === null) { const exit = once(nginx, 'exit'); nginx.kill('SIGTERM'); await exit; }
    await rm(folder, { recursive: true, force: true });
}
