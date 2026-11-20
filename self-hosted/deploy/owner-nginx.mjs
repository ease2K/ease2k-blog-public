import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

export const acmeLocation = '    location ^~ /.well-known/acme-challenge/ { root /var/lib/ease2k-acme; default_type text/plain; try_files $uri =404; }\n';
export function http2Mode(details) {
    const version = /nginx version: nginx\/(\d+)\.(\d+)\.(\d+)/.exec(details);
    if (!version || !/(?:^|\s)--with-http_v2_module(?=\s|$)/.test(details)) return 'off';
    const [, major, minor, patch] = version.map(Number);
    return major > 1 || major === 1 && (minor > 25 || minor === 25 && patch >= 1) ? 'directive' : 'listen';
}

export function nginxHttp2Mode(binary = 'nginx') {
    const result = spawnSync(binary, ['-V'], { encoding: 'utf8' });
    if (result.error || result.status !== 0) return 'off';
    return http2Mode(result.stderr + '\n' + result.stdout);
}

export function enableDomainHttp2(source, domain, mode) {
    if (mode !== 'directive' && mode !== 'listen') throw Error('当前 Nginx 无法启用 HTTP/2。');
    const blocks = source.split(/(?=^server[ \t]*\{)/m);
    const listens = /^([ \t]*listen[ \t]+(?:[^;\s]+:)?443[ \t]+)([^;]*\bssl\b[^;]*);/gm;
    const matches = blocks.map((block, index) => {
        const names = /^[ \t]*server_name[ \t]+([^;]+);/m.exec(block)?.[1].trim().split(/\s+/) || [];
        return names.includes(domain) && [...block.matchAll(listens)].length > 0 ? index : -1;
    }).filter(index => index >= 0);
    if (matches.length !== 1) throw Error('无法唯一识别该域名的 HTTPS 配置。');
    const index = matches[0];
    let block = blocks[index], directive = /^[ \t]*http2[ \t]+(?:on|off);/m;
    if (mode === 'listen') {
        block = block.replace(listens, (_, prefix, options) => prefix + options.trimEnd().replace(/(?:^|[ \t]+)http2(?=[ \t]|$)/g, '') + ' http2;');
    } else {
        block = block.replace(listens, (_, prefix, options) => prefix + options.replace(/(?:^|[ \t]+)http2(?=[ \t]|$)/g, '') + ';');
        block = directive.test(block) ? block.replace(directive, '    http2 on;') : block.replace('{', '{\n    http2 on;');
    }
    blocks[index] = block;
    return blocks.join('');
}

function ownerConfig({ ip, domain, aliases = [], secret, certificate, key, port, backendPort = 3000, secure = true, http2 = 'directive' }) {
    port ??= secure ? 443 : 80;
    const validDomain = value => typeof value === 'string' && value.length <= 253 && value.includes('.') && value.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
    if (!Array.isArray(aliases) || aliases.some(value => !validDomain(value))) throw Error('Invalid owner aliases');
    if (domain ? !secure || !validDomain(domain) : !/^\d{1,3}(\.\d{1,3}){3}$/.test(ip) || ip.split('.').some(part => Number(part) > 255)) throw Error('Invalid owner address');
    if (!/^[a-f0-9]{64}$/.test(secret)) throw Error('Invalid owner proxy configuration');
    if (![port, backendPort].every(value => Number.isInteger(value) && value > 0 && value < 65536)) throw Error('Invalid proxy port');
    if (secure && ![certificate, key].every(value => /^\/[A-Za-z0-9_./-]+$/.test(value))) throw Error('Invalid certificate path');
    const hostname = domain || ip, host = hostname + (port === (secure ? 443 : 80) ? '' : ':' + port), protocol = secure ? 'https' : 'http';
    const http2Listen = secure && http2 === 'listen' ? ' http2' : '';
    const http2Directive = secure && http2 === 'directive' ? '    http2 on;\n' : '';
    const ownerProxy = `        proxy_pass http://127.0.0.1:${backendPort};
        proxy_http_version 1.1;
        proxy_set_header Host localhost:${backendPort};
        proxy_set_header X-Forwarded-Host ${host};
        proxy_set_header X-Forwarded-Proto ${protocol};
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Ease2k-Owner-Proxy ${secret};
        proxy_set_header Forwarded "";
        proxy_set_header Authorization "";
        proxy_set_header Connection "";
        proxy_read_timeout 60s;`;
    return `# Owner access; the proxy secret stays in this root-readable file.
limit_req_zone $binary_remote_addr zone=ease2k_owner_login:1m rate=5r/m;
server {
    listen ${port}${secure ? ' ssl' : ''}${http2Listen};
${http2Directive}    server_name ${[hostname, ...aliases].join(' ')};
    if ($host != "${hostname}") { ${domain ? 'return 308 https://' + host + '$request_uri;' : 'return 421;'} }
${secure ? '    ssl_certificate ' + certificate + ';\n    ssl_certificate_key ' + key + ';\n    ssl_protocols TLSv1.2 TLSv1.3;\n' : ''}
    server_tokens off;
    charset utf-8;
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/javascript image/svg+xml;
    client_max_body_size 25m;
${secure ? '    add_header Strict-Transport-Security "max-age=15552000" always;\n' : ''}

    location = /api/owner/login {
        limit_req zone=ease2k_owner_login burst=5 nodelay;
        limit_req_status 429;
        client_max_body_size 8k;
${ownerProxy}
    }
    location ^~ /api/owner {
${ownerProxy}
    }
    location ^~ /_owner {
${ownerProxy}
    }
    location = /owner.html { return 404; }
    location / {
        limit_except GET { deny all; }
        proxy_pass http://127.0.0.1:${backendPort};
        proxy_http_version 1.1;
        proxy_set_header Host localhost:${backendPort};
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto ${protocol};
        proxy_set_header X-Forwarded-Host "";
        proxy_set_header X-Ease2k-Owner-Proxy "";
        proxy_set_header Forwarded "";
        proxy_set_header Cookie "";
        proxy_set_header Authorization "";
        proxy_set_header Connection "";
        proxy_hide_header Set-Cookie;
        proxy_read_timeout 30s;
    }
}
`;
}
export function ownerHTTPS(options) { return ownerConfig({ ...options, secure: true }); }
export function ownerHTTP(options) { return ownerConfig({ ...options, secure: false }); }
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const [mode, ip] = process.argv.slice(2), file = '/etc/nginx/conf.d/ease2k-ip-preview.conf';
    let source = readFileSync(file, 'utf8');
    if (mode === 'http') {
        const env = readFileSync('/etc/ease2k-blog/owner-https.env', 'utf8');
        if (!env.split('\n').includes('BLOG_OWNER_PUBLIC_ORIGIN=http://' + ip) || !env.split('\n').includes('BLOG_OWNER_ALLOW_HTTP=1')) throw Error('Plain HTTP access requires explicit opt-in');
        const secret = /^BLOG_OWNER_PROXY_SECRET=([a-f0-9]{64})$/m.exec(env)?.[1];
        const config = ownerHTTP({ ip, secret });
        chmodSync(file, 0o600); writeFileSync(file, config);
    } else if (mode === 'challenge' || mode === 'activate') {
        if (!source.includes('location ^~ /.well-known/acme-challenge/')) source = source.replace('    location ^~ /_owner', acmeLocation + '\n    location ^~ /_owner');
        if (!source.includes('location ^~ /.well-known/acme-challenge/')) throw Error('Unrecognized HTTP server configuration');
        if (mode === 'activate') {
            const env = readFileSync('/etc/ease2k-blog/owner-https.env', 'utf8');
            if (!env.split('\n').includes('BLOG_OWNER_PUBLIC_ORIGIN=https://' + ip)) throw Error('Existing owner HTTPS origin does not match this address');
            const secret = /^BLOG_OWNER_PROXY_SECRET=([a-f0-9]{64})$/m.exec(env)?.[1];
            const config = ownerHTTPS({ ip, secret, http2: nginxHttp2Mode(), certificate: '/etc/letsencrypt/live/' + ip + '/fullchain.pem', key: '/etc/letsencrypt/live/' + ip + '/privkey.pem' });
            const marker = '    location ^~ /_owner { return 404; }';
            if (source.includes(marker)) source = source.replace(marker, '    location ^~ /_owner { if ($request_method !~ ^(GET|HEAD)$) { return 404; } return 308 https://' + ip + '$request_uri; }');
            if (!source.includes('return 308 https://' + ip + '$request_uri;')) throw Error('Unrecognized owner redirect configuration');
            writeFileSync('/etc/nginx/conf.d/ease2k-owner-https.conf', config, { mode: 0o600 });
            chmodSync('/etc/nginx/conf.d/ease2k-owner-https.conf', 0o600);
        }
        writeFileSync(file, source);
    } else throw Error('Expected challenge, activate or http');
}
