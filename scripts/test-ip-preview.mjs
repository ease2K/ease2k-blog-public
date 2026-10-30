import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createServer as createProbe } from 'node:net';
import { once } from 'node:events';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const dir = await mkdtemp(resolve(tmpdir(), 'ease2k-nginx-test-'));
let privateResponse = false;
const upstream = createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Set-Cookie', 'ease-session=test; HttpOnly');
    res.end(JSON.stringify({ ready: true, owner: privateResponse, signedIn: privateResponse, entries: [], path: req.url, host: req.headers.host, cookie: req.headers.cookie || '', authorization: req.headers.authorization || '' }));
});
let nginx;
try {
    upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening');
    const probe = createProbe(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
    const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
    const source = await readFile('self-hosted/deploy/configure-ip-preview.sh', 'utf8');
    const server = source.match(/<<'NGINX'\n([\s\S]*?)\nNGINX/)[1]
        .replaceAll('__BLOG_PUBLIC_IP__', '192.0.2.1')
        .replace('listen 80;', `listen 127.0.0.1:${port};`)
        .replace('proxy_pass http://127.0.0.1:3000;', `proxy_pass http://127.0.0.1:${upstream.address().port};`);
    const config = `daemon off;\nmaster_process on;\npid ${dir}/nginx.pid;\nerror_log ${dir}/error.log;\nevents {}\nhttp { access_log off; client_body_temp_path ${dir}/body; proxy_temp_path ${dir}/proxy; ${server} }\n`;
    await writeFile(resolve(dir, 'nginx.conf'), config);
    const binary = process.env.NGINX_BIN || '/opt/homebrew/opt/nginx/bin/nginx';
    const syntax = spawnSync(binary, ['-p', dir, '-c', resolve(dir, 'nginx.conf'), '-t'], { encoding: 'utf8' });
    assert.equal(syntax.status, 0, syntax.stderr);
    nginx = spawn(binary, ['-p', dir, '-c', resolve(dir, 'nginx.conf')], { stdio: ['ignore', 'pipe', 'pipe'] });
    let errors = ''; nginx.stderr.on('data', chunk => errors += chunk);
    const request = (path, options = {}) => fetch(`http://127.0.0.1:${port}${path}`, { ...options, headers: { Host: '192.0.2.1', ...options.headers } });
    let page;
    for (let attempt = 0; attempt < 30; attempt++) {
        try { page = await request('/'); break; } catch { await new Promise(resolve => setTimeout(resolve, 25)); }
    }
    assert(page, errors);
    assert.equal(page.status, 200);
    for (const path of ['/', '/competitions/awards', '/awards/ccpc-qinhuangdao-2026.jpg', '/api/blog', '/api/ratings']) {
        const response = await request(path, { headers: { Cookie: 'ease-session=owner-session', Authorization: 'Bearer owner-token' } });
        assert.equal(response.status, 200, path);
        assert.equal(response.headers.get('x-ease2k-preview'), '1');
        assert.equal(response.headers.get('set-cookie'), null);
        const value = await response.json();
        assert.equal(value.host, 'localhost:3000');
        assert.equal(value.cookie, '');
        assert.equal(value.authorization, '');
        assert.equal(value.path, path);
    }
    assert.equal((await request('/api/blog', { method: 'HEAD' })).status, 200);
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) assert.equal((await request('/api/blog', { method })).status, 403, method);
    for (const path of ['/signin', '/signin?return_to=/daily', '/signout', '/_owner', '/_owner/', '/api/owner/session', '/api/owner/entries', '/owner.html']) assert.equal((await request(path)).status, 404, path);
    // Reproduce a reload window where the previous virtual host returns 404.
    const previous = config.replace(server, `server { listen 127.0.0.1:${port}; server_name 192.0.2.1; return 404; }`);
    await writeFile(resolve(dir, 'nginx.conf'), previous);
    nginx.kill('SIGHUP');
    let oldVisible = false;
    for (let attempt = 0; attempt < 30; attempt++) {
        if ((await request('/api/blog', { headers: { Connection: 'close' } })).status === 404) { oldVisible = true; break; }
        await new Promise(resolve => setTimeout(resolve, 25));
    }
    assert(oldVisible, 'Previous virtual host must be active before the probe');
    const probeScript = source.match(/# BEGIN_PUBLIC_PROBE\n([\s\S]*?)# END_PUBLIC_PROBE/)[1]
        .replace('http://127.0.0.1/api/blog', `http://127.0.0.1:${port}/api/blog`);
    async function runProbe(text) {
        const child = spawn('bash', ['-c', 'set -euo pipefail; backup_dir="$1"; blog_ip=192.0.2.1;\n' + text, 'probe', dir]);
        let output = '', errors = '';
        child.stdout.on('data', chunk => output += chunk); child.stderr.on('data', chunk => errors += chunk);
        const [code] = await once(child, 'exit');
        return { code, output, errors };
    }
    const probing = runProbe(probeScript);
    await new Promise(resolve => setTimeout(resolve, 600));
    await writeFile(resolve(dir, 'nginx.conf'), config);
    nginx.kill('SIGHUP');
    const passed = await probing;
    assert.equal(passed.code, 0, passed.output + passed.errors);
    assert.match(passed.output, /公网预览检查通过/);
    assert(!passed.errors.includes('SyntaxError'));
    privateResponse = true;
    const rejected = await runProbe(probeScript.replace('{1..20}', '{1..2}').replace('sleep 0.5', 'sleep 0.05'));
    assert.notEqual(rejected.code, 0, 'Owner data must never pass the public probe');
    assert(!rejected.errors.includes('SyntaxError'));
    console.log('PASS: real Nginx routing, credential filtering, reload recovery from 404, private-response rejection, and no empty-JSON crash.');
} finally {
    if (nginx && nginx.exitCode === null) { const exited = once(nginx, 'exit'); nginx.kill('SIGTERM'); await exited; }
    await new Promise(resolve => upstream.close(resolve));
    await rm(dir, { recursive: true, force: true });
}
