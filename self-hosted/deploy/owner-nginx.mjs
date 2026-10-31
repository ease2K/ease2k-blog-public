import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const acmeLocation = '    location ^~ /.well-known/acme-challenge/ { root /var/lib/ease2k-acme; default_type text/plain; try_files $uri =404; }\n';
function ownerConfig({ ip, secret, certificate, key, port, backendPort = 3000, secure = true }) {
    port ??= secure ? 443 : 80;
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip) || ip.split('.').some(part => Number(part) > 255) || !/^[a-f0-9]{64}$/.test(secret)) throw Error('Invalid owner proxy configuration');
    if (![port, backendPort].every(value => Number.isInteger(value) && value > 0 && value < 65536)) throw Error('Invalid proxy port');
    if (secure && ![certificate, key].every(value => /^\/[A-Za-z0-9_./-]+$/.test(value))) throw Error('Invalid certificate path');
    const host = ip + (port === (secure ? 443 : 80) ? '' : ':' + port), protocol = secure ? 'https' : 'http';
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
    listen ${port}${secure ? ' ssl' : ''};
    server_name ${ip};
    if ($host != "${ip}") { return 421; }
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
            const config = ownerHTTPS({ ip, secret, certificate: '/etc/letsencrypt/live/' + ip + '/fullchain.pem', key: '/etc/letsencrypt/live/' + ip + '/privkey.pem' });
            const marker = '    location ^~ /_owner { return 404; }';
            if (source.includes(marker)) source = source.replace(marker, '    location ^~ /_owner { if ($request_method !~ ^(GET|HEAD)$) { return 404; } return 308 https://' + ip + '$request_uri; }');
            if (!source.includes('return 308 https://' + ip + '$request_uri;')) throw Error('Unrecognized owner redirect configuration');
            writeFileSync('/etc/nginx/conf.d/ease2k-owner-https.conf', config, { mode: 0o600 });
            chmodSync('/etc/nginx/conf.d/ease2k-owner-https.conf', 0o600);
        }
        writeFileSync(file, source);
    } else throw Error('Expected challenge, activate or http');
}
