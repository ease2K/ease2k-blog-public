#!/usr/bin/env bash
set -euo pipefail
blog_domain=${1:-}
if [[ $(id -u) -ne 0 || ! "$blog_domain" =~ ^[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9]$ || "$blog_domain" != *.* ]]; then
    echo '用法：以 root 运行 bash configure-owner-domain.sh 已有HTTPS域名'; exit 1
fi
package_dir=$(cd -- "$(dirname -- "$0")" && pwd)
domain_config=/etc/nginx/conf.d/ease2k-domain.conf
ip_config=/etc/nginx/conf.d/ease2k-ip-preview.conf
owner_env=/etc/ease2k-blog/owner-https.env
public_override=/etc/systemd/system/ease2k-blog.service.d/30-public-origin.conf
nginx -t
curl --fail --silent --show-error --connect-timeout 5 --max-time 15 --resolve "$blog_domain:443:127.0.0.1" "https://$blog_domain/" >/dev/null
backup_dir=$(mktemp -d /var/backups/ease2k-owner-domain.XXXXXX)
chmod 700 "$backup_dir"
cp -a "$domain_config" "$backup_dir/domain.conf"
cp -a "$ip_config" "$backup_dir/ip.conf"
cp -a "$owner_env" "$backup_dir/owner.env"
if [[ -f "$public_override" ]]; then cp -a "$public_override" "$backup_dir/public-origin.conf"; fi
rollback() {
    trap - ERR
    cp -a "$backup_dir/domain.conf" "$domain_config"
    cp -a "$backup_dir/ip.conf" "$ip_config"
    cp -a "$backup_dir/owner.env" "$owner_env"
    if [[ -f "$backup_dir/public-origin.conf" ]]; then cp -a "$backup_dir/public-origin.conf" "$public_override"; else rm -f "$public_override"; fi
    systemctl daemon-reload
    systemctl restart ease2k-blog
    nginx -t && systemctl reload nginx
    echo "配置已回退，备份保存在 $backup_dir" >&2
}
trap rollback ERR
node --input-type=module - "$package_dir/owner-nginx.mjs" "$blog_domain" <<'JS'
import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
const { ownerHTTPS } = await import(pathToFileURL(process.argv[2]));
const domain = process.argv[3].toLowerCase(), file = '/etc/nginx/conf.d/ease2k-domain.conf';
const previous = readFileSync(file, 'utf8');
const names = /^\s*server_name\s+([^;]+);/m.exec(previous)?.[1].trim().split(/\s+/) || [];
if (!names.includes(domain)) throw Error('该域名不属于现有 HTTPS 配置。');
const certificate = /^\s*ssl_certificate\s+([^;\s]+);/m.exec(previous)?.[1];
const key = /^\s*ssl_certificate_key\s+([^;\s]+);/m.exec(previous)?.[1];
for (const name of names) execFileSync('openssl', ['x509', '-in', certificate, '-noout', '-checkhost', name], { stdio: 'pipe' });
const envFile = '/etc/ease2k-blog/owner-https.env', env = readFileSync(envFile, 'utf8');
const secret = /^BLOG_OWNER_PROXY_SECRET=([a-f0-9]{64})$/m.exec(env)?.[1];
let config = ownerHTTPS({ domain, aliases: names.filter(name => name !== domain), secret, certificate, key });
const tlsOptions = previous.split('\n').filter(line => /^\s*(?:include \/etc\/letsencrypt\/options-ssl-nginx\.conf;|ssl_dhparam \/[A-Za-z0-9_./-]+;)/.test(line));
if (tlsOptions.some(line => line.includes('include '))) config = config.replace('    ssl_protocols TLSv1.2 TLSv1.3;', tlsOptions.join('\n'));
config = config.replace('    server_tokens off;', '    server_tokens off;\n    add_header X-Ease2k-Domain "1" always;');
config += '\nserver {\n    listen 80;\n    server_name ' + names.join(' ') + ';\n    return 308 https://' + domain + '$request_uri;\n}\n';
const ipFile = '/etc/nginx/conf.d/ease2k-ip-preview.conf';
let ip = readFileSync(ipFile, 'utf8');
ip = ip.replace(/^limit_req_zone[^\n]*zone=ease2k_owner_login:[^\n]*\n/m, '');
for (const [location, body] of [['= /api/owner/login', 'return 404;'], ['^~ /api/owner', 'return 404;'], ['^~ /_owner', 'if ($request_method !~ ^(GET|HEAD)$) { return 404; } return 308 https://' + domain + '$request_uri;']]) {
    const escaped = location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const multiline = new RegExp('    location ' + escaped + ' \\{\\n[\\s\\S]*?\\n    \\}\\n');
    const inline = new RegExp('    location ' + escaped + ' \\{[^\\n]*\\}\\n');
    if (!multiline.test(ip) && !inline.test(ip)) throw Error('无法识别旧 IP 的站主路由：' + location);
    ip = ip.replace(multiline.test(ip) ? multiline : inline, '    location ' + location + ' { ' + body + ' }\n');
}
const updated = env.split('\n').filter(line => !/^BLOG_OWNER_(PUBLIC_ORIGIN|ALLOW_HTTP)=/.test(line) && line.trim()).join('\n') + '\nBLOG_OWNER_PUBLIC_ORIGIN=https://' + domain + '\n';
for (const [path, text] of [[file, config], [ipFile, ip], [envFile, updated]]) { writeFileSync(path, text, { mode: 0o600 }); chmodSync(path, 0o600); }
writeFileSync('/etc/systemd/system/ease2k-blog.service.d/30-public-origin.conf', '[Service]\nEnvironment=BLOG_PUBLIC_ORIGIN=https://' + domain + '\n', { mode: 0o644 });
JS
nginx -t
systemctl daemon-reload
systemctl restart ease2k-blog
for attempt in {1..20}; do
    if curl --fail --silent --max-time 2 http://127.0.0.1:3000/healthz >/dev/null; then break; fi
    sleep 0.5
done
curl --fail --silent --max-time 2 http://127.0.0.1:3000/healthz >/dev/null
systemctl reload nginx
owner_ready=0
for attempt in {1..20}; do
    if curl --fail --silent --connect-timeout 2 --max-time 3 --resolve "$blog_domain:443:127.0.0.1" "https://$blog_domain/_owner" >/dev/null &&
       curl --fail --silent --connect-timeout 2 --max-time 3 --resolve "$blog_domain:443:127.0.0.1" "https://$blog_domain/api/owner/session" | node -e 'let s="";process.stdin.on("data",v=>s+=v).on("end",()=>{try{const v=JSON.parse(s); if(!v.configured||v.authenticated||v.csrf)process.exit(1);}catch{process.exit(1);}})'; then
        owner_ready=1; break
    fi
    sleep 0.25
done
[[ "$owner_ready" == 1 ]]
trap - ERR
echo "HTTPS 站主入口：https://$blog_domain/_owner"
echo "原配置备份：$backup_dir"
