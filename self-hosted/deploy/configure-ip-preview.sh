#!/usr/bin/env bash
set -euo pipefail
if [[ $(id -u) -ne 0 ]]; then echo '请在服务器上以 root 执行。'; exit 1; fi
blog_ip=${1:-}
if [[ ! "$blog_ip" =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}$ ]]; then echo '用法：bash configure-ip-preview.sh 服务器公网IPv4'; exit 1; fi
IFS=. read -r -a blog_ip_parts <<< "$blog_ip"
for part in "${blog_ip_parts[@]}"; do
    if (( 10#$part > 255 )); then echo 'IPv4 地址不合法。'; exit 1; fi
done
echo '公网 IP 配置脚本：等待重载生效并验证响应标记。'
for command in nginx node curl systemctl; do command -v "$command" >/dev/null || { echo "缺少命令：$command"; exit 1; }; done
curl --fail --silent --show-error --max-time 10 -H 'Host: localhost:3000' http://127.0.0.1:3000/healthz
nginx -t
preview_config=/etc/nginx/conf.d/ease2k-ip-preview.conf
backup_dir=$(mktemp -d /var/backups/ease2k-ip-preview.XXXXXX)
if [[ -e "$preview_config" || -L "$preview_config" ]]; then cp -a "$preview_config" "$backup_dir/previous.conf"; fi
rollback() {
    if [[ -e "$backup_dir/previous.conf" || -L "$backup_dir/previous.conf" ]]; then
        cp -a --remove-destination "$backup_dir/previous.conf" "$preview_config"
    else
        rm -f "$preview_config"
    fi
    nginx -t && systemctl reload nginx
}
trap 'echo "配置失败，正在恢复旧配置。"; rollback' ERR
cat > "$preview_config" <<'NGINX'
# IP-only public website. Content is updated from deployment files.
server {
    listen 80;
    server_name __BLOG_PUBLIC_IP__;
    charset utf-8;
    server_tokens off;
    add_header X-Ease2k-Preview "1" always;

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
sed -i "s/__BLOG_PUBLIC_IP__/$blog_ip/g" "$preview_config"
chmod 644 "$preview_config"
nginx -t
systemctl reload nginx
# BEGIN_PUBLIC_PROBE
probe_ready=0
echo '等待 Nginx 新配置生效…'
for attempt in {1..20}; do
    if curl --fail --silent --show-error --connect-timeout 1 --max-time 2 \
        -H "Host: $blog_ip" -H 'Connection: close' \
        -D "$backup_dir/probe.headers" -o "$backup_dir/probe.body" \
        http://127.0.0.1/api/blog 2> "$backup_dir/probe.error" && \
        node - "$backup_dir/probe.headers" "$backup_dir/probe.body" <<'JS'
const { readFileSync } = require('node:fs');
try {
    const headers = readFileSync(process.argv[2], 'utf8');
    if (!/^x-ease2k-preview:\s*1\s*$/im.test(headers)) process.exit(1);
    const data = JSON.parse(readFileSync(process.argv[3], 'utf8'));
    if (!data.ready || data.owner || data.signedIn || !Array.isArray(data.entries) || data.entries.some(entry => entry.visibility === 'private')) process.exit(1);
} catch { process.exit(1); }
JS
    then
        probe_ready=1
        break
    fi
    sleep 0.5
done
if [[ "$probe_ready" != 1 ]]; then
    echo '未能确认新入口生效，检查记录保存在备份目录中。将恢复旧配置。'
    cat "$backup_dir/probe.error"
    if [[ -s "$backup_dir/probe.headers" ]]; then head -n 1 "$backup_dir/probe.headers"; fi
    false
fi
echo '公网预览检查通过，仅返回公开内容。'
# END_PUBLIC_PROBE
trap - ERR
echo "配置完成：浏览器打开 http://$blog_ip"
echo '内容更新：修改本地文件，重新打包上传安装。'
echo "旧配置备份：$backup_dir"
echo '备案及 HTTPS 就绪后，移除此 IP 预览配置，再配置域名入口。'
