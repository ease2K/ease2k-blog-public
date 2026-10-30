#!/usr/bin/env bash
set -euo pipefail
if [[ $(id -u) -ne 0 ]]; then echo '请以 root 运行安装脚本。'; exit 1; fi
node -e 'const [major,minor]=process.versions.node.split(".").map(Number); if(major<22||(major===22&&minor<13)) throw Error("需要 Node.js >=22.13")'
package_dir=$(cd -- "$(dirname -- "$0")" && pwd)
getent passwd easeblog >/dev/null || useradd --system --home-dir /var/lib/ease2k-blog --shell /usr/sbin/nologin easeblog
install -d -m 700 -o easeblog -g easeblog /var/lib/ease2k-blog
install -d -m 700 -o easeblog -g easeblog /var/lib/ease2k-blog/editor
release_dir="/opt/ease2k-blog/releases/$(date +%Y%m%d%H%M%S)"
install -d -m 755 "$release_dir"
cp -R "$package_dir/client" "$package_dir/server.mjs" "$package_dir/owner-store.mjs" "$package_dir/owner-http.mjs" "$package_dir/setup-owner.mjs" "$package_dir/content.mjs" "$package_dir/tutorials.json" "$package_dir/journal.json" "$package_dir/ratings.mjs" "$package_dir/ratings-snapshot.json" "$release_dir/"
chown -R root:root "$release_dir"
# Release files contain code and public assets only; private data stays in /var/lib.
find "$release_dir" -type d -exec chmod 755 {} +
find "$release_dir" -type f -exec chmod 644 {} +
ln -sfn "$release_dir" /opt/ease2k-blog/current
cat > /etc/systemd/system/ease2k-blog.service <<'UNIT'
[Unit]
Description=ease2k personal blog
After=network.target
[Service]
Type=simple
User=easeblog
Group=easeblog
WorkingDirectory=/opt/ease2k-blog/current
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=BLOG_EDITOR_DIR=/var/lib/ease2k-blog/editor
Environment=BLOG_ORIGIN=http://localhost:3000
ExecStart=/usr/bin/node /opt/ease2k-blog/current/server.mjs
Restart=on-failure
RestartSec=3
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadOnlyPaths=/var/lib/ease2k-blog
ReadWritePaths=/var/lib/ease2k-blog/editor
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable ease2k-blog >/dev/null
systemctl restart ease2k-blog
for attempt in {1..15}; do
    if curl --fail --silent http://127.0.0.1:3000/healthz; then
        echo
        echo '安装成功。服务仅监听服务器本机 127.0.0.1:3000，在线内容保存在 /var/lib/ease2k-blog/editor，更新部署包不会覆盖。'
        echo '本地预览：在自己的电脑建立 SSH 隧道 ssh -N -L 3000:127.0.0.1:3000 root@服务器公网IP，然后打开 http://localhost:3000'
        exit 0
    fi
    sleep 1
done
echo '服务未就绪，请查看：journalctl -u ease2k-blog -n 40 --no-pager'
exit 1
