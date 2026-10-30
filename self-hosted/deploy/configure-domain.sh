#!/usr/bin/env bash
set -euo pipefail
if [[ $(id -u) -ne 0 ]]; then echo '请在服务器上以 root 执行。'; exit 1; fi
blog_domain=${1:-}
if [[ ! "$blog_domain" =~ ^[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9]$ || "$blog_domain" != *.* || "$blog_domain" == *..* ]]; then
    echo '用法：bash configure-domain.sh example.com（填写自己的根域名）'; exit 1
fi
for command in nginx node curl systemctl; do command -v "$command" >/dev/null || { echo "缺少命令：$command"; exit 1; }; done
curl --fail --silent --show-error --max-time 10 -H 'Host: localhost:3000' http://127.0.0.1:3000/healthz
nginx -t
domain_config=/etc/nginx/conf.d/ease2k-domain.conf
backup_dir=$(mktemp -d /var/backups/ease2k-domain.XXXXXX)
cp -a /etc/nginx "$backup_dir/nginx"
rollback() {
    if [[ -e "$backup_dir/nginx/conf.d/ease2k-domain.conf" ]]; then
        cp -a --remove-destination "$backup_dir/nginx/conf.d/ease2k-domain.conf" "$domain_config"
    else
        rm -f "$domain_config"
    fi
    nginx -t && systemctl reload nginx
}
trap 'echo "域名配置失败，正在恢复旧配置。"; rollback' ERR
cat > "$domain_config" <<'NGINX'
# Public domain entry. The existing IP entry remains available.
server {
    listen 80;
    server_name __BLOG_DOMAIN__ www.__BLOG_DOMAIN__;
    charset utf-8;
    server_tokens off;
    add_header X-Ease2k-Domain "1" always;

    location ^~ /_owner { return 404; }
    location ^~ /api/owner { return 404; }
    location = /owner.html { return 404; }
    location = /signin { return 404; }
    location = /signout { return 404; }
    location / {
        limit_except GET { deny all; }
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host localhost:3000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Cookie "";
        proxy_set_header Authorization "";
        proxy_set_header Connection "";
        proxy_hide_header Set-Cookie;
        proxy_read_timeout 15s;
    }
}
NGINX
sed -i "s/__BLOG_DOMAIN__/$blog_domain/g" "$domain_config"
chmod 644 "$domain_config"
nginx -t
systemctl reload nginx
for domain_name in "$blog_domain" "www.$blog_domain"; do
    probe_ready=0
    for attempt in {1..20}; do
        if curl --fail --silent --show-error --connect-timeout 1 --max-time 2 \
            -H "Host: $domain_name" -H 'Connection: close' \
            -D "$backup_dir/probe.headers" -o "$backup_dir/probe.body" \
            http://127.0.0.1/api/blog 2> "$backup_dir/probe.error" && \
            node - "$backup_dir/probe.headers" "$backup_dir/probe.body" <<'JS'
const { readFileSync } = require('node:fs');
try {
    const headers = readFileSync(process.argv[2], 'utf8');
    const data = JSON.parse(readFileSync(process.argv[3], 'utf8'));
    if (!/^x-ease2k-domain:\s*1\s*$/im.test(headers) || !data.ready || data.owner || data.signedIn || !Array.isArray(data.entries) || data.entries.some(entry => entry.visibility === 'private')) process.exit(1);
} catch { process.exit(1); }
JS
        then
            probe_ready=1
            break
        fi
        sleep 0.5
    done
    [[ "$probe_ready" == 1 ]] || { cat "$backup_dir/probe.error"; false; }
    echo "域名入口检查通过：http://$domain_name"
done
trap - ERR
echo "旧配置备份：$backup_dir"
