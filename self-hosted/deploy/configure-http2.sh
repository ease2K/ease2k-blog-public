#!/usr/bin/env bash
set -euo pipefail
blog_domain=${1:-}
if [[ $(id -u) -ne 0 || ! "$blog_domain" =~ ^[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9]$ || "$blog_domain" != *.* || "$blog_domain" == *..* ]]; then
    echo '用法：以 root 运行 bash configure-http2.sh 已有HTTPS域名' >&2
    exit 1
fi
for command in nginx node curl systemctl; do
    command -v "$command" >/dev/null || { echo "缺少命令：$command" >&2; exit 1; }
done
package_dir=$(cd -- "$(dirname -- "$0")" && pwd)
domain_config=/etc/nginx/conf.d/ease2k-domain.conf
nginx -t
backup_dir=$(mktemp -d /var/backups/ease2k-http2.XXXXXX)
cp -a "$domain_config" "$backup_dir/domain.conf"
rollback() {
    trap - ERR
    cp -a "$backup_dir/domain.conf" "$domain_config"
    nginx -t && systemctl reload nginx
    echo "配置已回退，备份保存在 $backup_dir" >&2
}
trap rollback ERR
node --input-type=module - "$package_dir/owner-nginx.mjs" "$blog_domain" "$domain_config" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const [, , modulePath, domain, config] = process.argv;
const { enableDomainHttp2, nginxHttp2Mode } = await import(pathToFileURL(modulePath));
const source = readFileSync(config, 'utf8');
const updated = enableDomainHttp2(source, domain.toLowerCase(), nginxHttp2Mode());
if (source !== updated) writeFileSync(config, updated);
JS
nginx -t
systemctl reload nginx
protocol=
for attempt in {1..10}; do
    protocol=$(curl --noproxy '*' --http2 --fail --silent --show-error --connect-timeout 2 --max-time 5 \
        --resolve "$blog_domain:443:127.0.0.1" -o /dev/null -w '%{http_version}' "https://$blog_domain/" || true)
    if [[ "$protocol" == 2 ]]; then break; fi
    sleep 0.5
done
[[ "$protocol" == 2 ]]
trap - ERR
echo "HTTPS 已协商 HTTP/2，原配置保存在 $backup_dir"
