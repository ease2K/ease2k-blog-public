#!/usr/bin/env bash
set -euo pipefail
blog_ip=${1:-}
if [[ $(id -u) -ne 0 || ! "$blog_ip" =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}$ || ${2:-} != --allow-plaintext-login ]]; then
    echo '仅在站主明确接受 HTTP 明文登录后运行：bash configure-owner-http.sh PUBLIC_IP --allow-plaintext-login'; exit 1
fi
IFS=. read -ra blog_octets <<< "$blog_ip"
for octet in "${blog_octets[@]}"; do if ((10#$octet > 255)); then echo 'IPv4 地址不合法。'; exit 1; fi; done
package_dir=$(cd -- "$(dirname -- "$0")" && pwd)
backup_dir=$(mktemp -d /var/backups/ease2k-owner-http.XXXXXX)
chmod 700 "$backup_dir"
cp -a /etc/nginx "$backup_dir/nginx"
for path in /etc/ease2k-blog /etc/systemd/system/ease2k-blog.service.d; do
    if [[ -d "$path" ]]; then cp -a "$path" "$backup_dir/$(basename "$path")"; fi
done
if systemctl is-enabled --quiet ease2k-blog-cert-renew.timer 2>/dev/null; then touch "$backup_dir/renew-was-enabled"; fi
rollback() {
    cp -a "$backup_dir/nginx/conf.d/." /etc/nginx/conf.d/
    if [[ -f "$backup_dir/ease2k-blog/owner-https.env" ]]; then cp -a "$backup_dir/ease2k-blog/owner-https.env" /etc/ease2k-blog/; else rm -f /etc/ease2k-blog/owner-https.env; fi
    if [[ -f "$backup_dir/ease2k-blog.service.d/20-owner-https.conf" ]]; then cp -a "$backup_dir/ease2k-blog.service.d/20-owner-https.conf" /etc/systemd/system/ease2k-blog.service.d/; else rm -f /etc/systemd/system/ease2k-blog.service.d/20-owner-https.conf; fi
    systemctl daemon-reload; systemctl restart ease2k-blog
    nginx -t && systemctl reload nginx
    if [[ -f "$backup_dir/renew-was-enabled" ]]; then systemctl enable --now ease2k-blog-cert-renew.timer; fi
    echo "HTTP 入口配置已回退：$backup_dir"
}
trap rollback ERR
install -d -m 700 /etc/ease2k-blog
node --input-type=module - "$blog_ip" <<'JS'
import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
const file = '/etc/ease2k-blog/owner-https.env';
let previous = ''; try { previous = readFileSync(file, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const secret = /^BLOG_OWNER_PROXY_SECRET=([a-f0-9]{64})$/m.exec(previous)?.[1] || randomBytes(32).toString('hex');
writeFileSync(file, 'BLOG_OWNER_PUBLIC_ORIGIN=http://' + process.argv[2] + '\nBLOG_OWNER_PROXY_SECRET=' + secret + '\nBLOG_OWNER_ALLOW_HTTP=1\n', { mode: 0o600 });
chmodSync(file, 0o600);
JS
install -d -m 755 /etc/systemd/system/ease2k-blog.service.d
printf '[Service]\nEnvironmentFile=/etc/ease2k-blog/owner-https.env\n' > /etc/systemd/system/ease2k-blog.service.d/20-owner-https.conf
if [[ -f /etc/nginx/conf.d/ease2k-owner-https.conf ]]; then mv /etc/nginx/conf.d/ease2k-owner-https.conf "$backup_dir/disabled-https.conf"; fi
systemctl disable --now ease2k-blog-cert-renew.timer 2>/dev/null || true
node "$package_dir/owner-nginx.mjs" http "$blog_ip"
nginx -t
systemctl daemon-reload
systemctl restart ease2k-blog
owner_ready=0
for attempt in {1..20}; do
    if curl --fail --silent --max-time 2 http://127.0.0.1:3000/healthz >/dev/null; then owner_ready=1; break; fi
    sleep 0.5
done
[[ "$owner_ready" == 1 ]]
systemctl reload nginx
curl --fail --silent --show-error --max-time 10 -H "Host: $blog_ip" http://127.0.0.1/_owner >/dev/null
node --input-type=module - "$blog_ip" <<'JS'
import assert from 'node:assert/strict';
const response = await fetch('http://127.0.0.1/api/owner/session', { headers: { Host: process.argv[2] } });
assert.equal(response.status, 200);
const state = await response.json(); assert(state.configured && !state.authenticated && !state.csrf);
const entries = await fetch('http://127.0.0.1/api/owner/entries', { headers: { Host: process.argv[2] } });
assert.equal(entries.status, 401);
console.log('PASS: HTTP owner entry is online; private entries remain authenticated.');
JS
trap - ERR
echo "在线站主入口：http://$blog_ip/_owner"
echo "原配置备份：$backup_dir"
