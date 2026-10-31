#!/usr/bin/env bash
set -euo pipefail
blog_ip=${1:-}
if [[ $(id -u) -ne 0 || ! "$blog_ip" =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}$ || ${2:-} != --accept-terms ]]; then
    echo '仅在站主已确认接受 Let’s Encrypt 用户协议后，以 root 运行：bash issue-owner-certificate.sh PUBLIC_IP --accept-terms'; exit 1
fi
IFS=. read -ra blog_octets <<< "$blog_ip"
for octet in "${blog_octets[@]}"; do if ((10#$octet > 255)); then echo 'IPv4 地址不合法。'; exit 1; fi; done
package_dir=$(cd -- "$(dirname -- "$0")" && pwd)
for command in nginx node python3 openssl curl systemctl; do command -v "$command" >/dev/null || { echo "缺少命令：$command"; exit 1; }; done
backup_dir=$(mktemp -d /var/backups/ease2k-owner-https.XXXXXX)
chmod 700 "$backup_dir"
cp -a /etc/nginx "$backup_dir/nginx"
for path in /etc/ease2k-blog /etc/systemd/system/ease2k-blog.service.d; do
    if [[ -d "$path" ]]; then cp -a "$path" "$backup_dir/$(basename "$path")"; fi
done
rollback() {
    cp -a "$backup_dir/nginx/conf.d/." /etc/nginx/conf.d/
    if [[ ! -e "$backup_dir/nginx/conf.d/ease2k-owner-https.conf" ]]; then rm -f /etc/nginx/conf.d/ease2k-owner-https.conf; fi
    if [[ -f "$backup_dir/ease2k-blog/owner-https.env" ]]; then cp -a "$backup_dir/ease2k-blog/owner-https.env" /etc/ease2k-blog/; else rm -f /etc/ease2k-blog/owner-https.env; fi
    if [[ -f "$backup_dir/ease2k-blog.service.d/20-owner-https.conf" ]]; then cp -a "$backup_dir/ease2k-blog.service.d/20-owner-https.conf" /etc/systemd/system/ease2k-blog.service.d/; else rm -f /etc/systemd/system/ease2k-blog.service.d/20-owner-https.conf; fi
    systemctl daemon-reload
    systemctl restart ease2k-blog
    nginx -t && systemctl reload nginx
    echo "HTTPS 配置已回退，记录保存在 $backup_dir"
}
trap rollback ERR
install -d -m 755 /var/lib/ease2k-acme
node "$package_dir/owner-nginx.mjs" challenge "$blog_ip"
nginx -t
systemctl reload nginx
if [[ ! -x /opt/ease2k-certbot/bin/certbot ]]; then
    if ! python3 -m venv /opt/ease2k-certbot; then
        apt-get update
        apt-get install -y python3-venv
        python3 -m venv /opt/ease2k-certbot
    fi
    /opt/ease2k-certbot/bin/pip install 'certbot>=5.4,<6'
fi
# This flag is passed only after the owner explicitly approves the subscriber agreement.
/opt/ease2k-certbot/bin/certbot certonly --non-interactive --agree-tos --register-unsafely-without-email --webroot --webroot-path /var/lib/ease2k-acme --preferred-profile shortlived --ip-address "$blog_ip" --cert-name "$blog_ip" --keep-until-expiring
openssl x509 -in "/etc/letsencrypt/live/$blog_ip/fullchain.pem" -noout -checkip "$blog_ip"
openssl x509 -in "/etc/letsencrypt/live/$blog_ip/fullchain.pem" -noout -checkend 172800
install -d -m 700 /etc/ease2k-blog
if [[ ! -f /etc/ease2k-blog/owner-https.env ]]; then
    umask 077
    printf 'BLOG_OWNER_PUBLIC_ORIGIN=https://%s\nBLOG_OWNER_PROXY_SECRET=%s\n' "$blog_ip" "$(node -e 'process.stdout.write(require("crypto").randomBytes(32).toString("hex"))')" > /etc/ease2k-blog/owner-https.env
fi
chmod 600 /etc/ease2k-blog/owner-https.env
install -d -m 755 /etc/systemd/system/ease2k-blog.service.d
printf '[Service]\nEnvironmentFile=/etc/ease2k-blog/owner-https.env\n' > /etc/systemd/system/ease2k-blog.service.d/20-owner-https.conf
node "$package_dir/owner-nginx.mjs" activate "$blog_ip"
systemctl daemon-reload
systemctl restart ease2k-blog
owner_ready=0
for attempt in {1..20}; do
    if curl --fail --silent --max-time 2 http://127.0.0.1:3000/healthz >/dev/null; then owner_ready=1; break; fi
    sleep 0.5
done
[[ "$owner_ready" == 1 ]]
nginx -t
systemctl reload nginx
curl --fail --silent --show-error --connect-timeout 8 --max-time 20 --resolve "$blog_ip:443:127.0.0.1" "https://$blog_ip/_owner" >/dev/null
# Let’s Encrypt IP certificates are short-lived; renew twice daily and reload after success.
install -d -m 755 /etc/letsencrypt/renewal-hooks/deploy
printf '#!/bin/sh\nset -eu\nnginx -t\nsystemctl reload nginx\n' > /etc/letsencrypt/renewal-hooks/deploy/ease2k-blog.sh
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/ease2k-blog.sh
cat > /etc/systemd/system/ease2k-blog-cert-renew.service <<UNIT
[Unit]
Description=Renew ease2k blog HTTPS certificate
[Service]
Type=oneshot
ExecStart=/opt/ease2k-certbot/bin/certbot renew --quiet --cert-name $blog_ip
UNIT
cat > /etc/systemd/system/ease2k-blog-cert-renew.timer <<'UNIT'
[Unit]
Description=Check blog HTTPS certificate twice daily
[Timer]
OnCalendar=*-*-* 00,12:00:00
RandomizedDelaySec=30m
Persistent=true
[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now ease2k-blog-cert-renew.timer
trap - ERR
echo "站主 HTTPS 入口已就绪：https://$blog_ip/_owner"
echo "原配置备份：$backup_dir"
