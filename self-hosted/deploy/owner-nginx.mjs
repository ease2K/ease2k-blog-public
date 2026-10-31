import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const acmeLocation = '    location ^~ /.well-known/acme-challenge/ { root /var/lib/ease2k-acme; default_type text/plain; try_files $uri =404; }\n';
export function ownerHTTPS({ ip, secret, certificate, key, port = 443, backendPort = 3000 }) {
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip) || ip.split('.').some(part => Number(part) > 255) || !/^[a-f0-9]{64}$/.test(secret)) throw Error('Invalid owner proxy configuration');
    if (![port, backendPort].every(value => Number.isInteger(value) && value > 0 && value < 65536)) throw Error('Invalid proxy port');
    if (![certificate, key].every(value => /^\/[A-Za-z0-9_./-]+$/.test(value))) throw Error('Invalid certificate path');
    const host = ip + (port === 443 ? '' : ':' + port);
    const ownerProxy = `        proxy_pass http://127.0.0.1:${backendPort};
        proxy_http_version 1.1;
        proxy_set_header Host localhost:${backendPort};
        proxy_set_header X-Forwarded-Host ${host};
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Ease2k-Owner-Proxy ${secret};
        proxy_set_header Forwarded "";
        proxy_set_header Authorization "";
        proxy_set_header Connection "";
        proxy_read_timeout 60s;`;
    return `# HTTPS owner access; the proxy secret stays in this root-readable file.
limit_req_zone $binary_remote_addr zone=ease2k_owner_login:1m rate=5r/m;
server {
    listen ${port} ssl;
    server_name ${ip};
    if ($host != "${ip}") { return 421; }
    ssl_certificate ${certificate};
    ssl_certificate_key ${key};
    ssl_protocols TLSv1.2 TLSv1.3;
    server_tokens off;
    charset utf-8;
    client_max_body_size 25m;
    add_header Strict-Transport-Security "max-age=15552000" always;

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
        proxy_set_header X-Forwarded-Proto https;
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
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const [mode, ip] = process.argv.slice(2), file = '/etc/nginx/conf.d/ease2k-ip-preview.conf';
    let source = readFileSync(file, 'utf8');
    if (mode === 'challenge' || mode === 'activate') {
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
    } else throw Error('Expected challenge or activate');
}
