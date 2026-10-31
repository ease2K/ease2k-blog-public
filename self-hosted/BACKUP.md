# 内容备份与恢复

安装脚本会建立 `ease2k-blog-backup.timer`，按北京时间每天 04:15 启动，随机延迟最多 15 分钟；错过的任务会在服务器恢复后补执行。备份保存到 `/var/backups/ease2k-blog/`，保留最近 14 份成功备份。

每份备份包含 SQLite 快照（文章、编辑草稿、历史、会话）、`owner.json` 及上传图片，目录权限为 0700，文件权限为 0600。创建时使用 SQLite 一致性快照，不直接复制正在变化的 WAL 数据库。新备份通过文件校验、SQLite 完整性检查及临时目录恢复验证后，才轮换旧备份。

这些是同服务器备份，可用于恢复误操作。需要防范整机或磁盘损坏时，应另行将备份复制到独立、受保护的位置。备份包含认证配置，不要上传公开仓库。

## 查看及立即备份

```bash
systemctl list-timers ease2k-blog-backup.timer
systemctl start ease2k-blog-backup.service
journalctl -u ease2k-blog-backup.service -n 20 --no-pager
```

也可以直接运行：

```bash
node /opt/ease2k-blog/current/backup-cli.mjs create /var/lib/ease2k-blog/editor /var/backups/ease2k-blog
```

成功结果包含 `verified: true`、`restorationTest: true` 和备份目录。失败任务会返回非零状态，日志可通过上述 journalctl 命令查看。

## 恢复

先替换下面的备份目录，校验通过后停止服务。原数据先移动保留，恢复命令拒绝覆盖非空目录：

```bash
blog_snapshot=/var/backups/ease2k-blog/REPLACE_WITH_SNAPSHOT
node /opt/ease2k-blog/current/backup-cli.mjs verify "$blog_snapshot"
systemctl stop ease2k-blog
mv /var/lib/ease2k-blog/editor "/var/lib/ease2k-blog/editor-before-restore-$(date +%Y%m%d%H%M%S)"
node /opt/ease2k-blog/current/backup-cli.mjs restore "$blog_snapshot" /var/lib/ease2k-blog/editor
chown -R easeblog:easeblog /var/lib/ease2k-blog/editor
systemctl start ease2k-blog
curl --fail http://localhost:3000/healthz
```

恢复会使用备份时的站主配置。若后来重置过密码，恢复后应使用备份对应的密码或再次运行密码重置命令。旧数据目录确认不再需要之前请保留。

## 公开网址与搜索收录

首次安装时使用公开站点地址配置 canonical、分享卡片和 sitemap：

```bash
BLOG_PUBLIC_ORIGIN=https://YOUR_DOMAIN bash install.sh
```

后续安装默认保留原有公开网址。站点内部的 `BLOG_ORIGIN` 与公开网址不同：前者保持与本机监听和反向代理 Host 一致。不要从不受信任的转发请求头推断 canonical 地址。站主入口始终通过本机或 SSH 隧道访问。


## Mac 异地副本与失败提醒

服务器每日 04:15（北京时间，最多延后 15 分钟）生成备份，本机拉取程序 `node self-hosted/pull-backup.mjs` 将经过校验的最新快照保存到 Mac 的 `~/Library/Application Support/ease2k-blog-backups/`，保留最近 30 份。目录权限 0700，文件权限 0600；此目录位于 Git 仓库外。备份含站主加盐密码哈希与会话密钥，应作为私有数据保存。它不是公开源码的一部分。

首次配置使用独立 Ed25519 密钥。通过已授权的管理员连接，将该密钥的**公钥**从标准输入交给服务器的 `install-backup-channel.sh`。安装器写入带 `restrict` 和强制命令的授权记录；专用密钥只能请求 `status`、`latest`（可指定现有快照编号），不能获得 Shell、SFTP、终端或端口转发。私钥留在 Mac，管理员原有登录密钥不变。停用时从服务器 `authorized_keys` 删除对应的 `ease2k-backup-read-only` 记录。

Mac 目录中的 `config.json` 格式：

```json
{
    "target": "root@your-server",
    "identity": "/absolute/path/to/backup-only-key"
}
```

拉取前检查服务器定时器、最近备份结果、36 小时内的新鲜度，以及两端剩余磁盘空间。服务器至少保留 1 GiB 或预计快照两倍的可用空间；Mac 至少保留 1 GiB 或快照三倍的空间。下载采用 SSH 主机密钥校验；解压前检查文件路径和类型，再校验 SHA-256、SQLite 完整性并实际恢复到临时目录。成功后才轮换旧副本。

`state.json` 保存最近检查结果和失败/恢复状态，不含私钥或站主凭据。配合 Codex 定时任务执行拉取，并仅在新失败、恢复或需要用户操作时提醒；相同故障不重复提醒。Mac 和 Codex 需要运行且能联网，关机期间无法执行本机拉取或即时提醒。服务器定时备份独立运行，不依赖 Mac 在线。

图片内容保持不变，回收区状态保存在 SQLite，因此快照同时保留回收区图片、专栏、资源名称与历史引用。恢复完整快照后，这些功能一起恢复。
