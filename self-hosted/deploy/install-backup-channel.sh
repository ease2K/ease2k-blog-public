#!/usr/bin/env bash
set -euo pipefail
if [[ "$(id -u)" != 0 ]]; then echo '需要 root 权限。' >&2; exit 1; fi
public_key=$(cat)
if [[ ! "$public_key" =~ ^ssh-ed25519\ [A-Za-z0-9+/=]{40,100}(\ [A-Za-z0-9_.@-]{1,100})?$ ]]; then echo '请从标准输入提供一条 Ed25519 公钥。' >&2; exit 1; fi
if [[ ! -f /opt/ease2k-blog/current/offsite-export.mjs ]]; then echo '请先部署支持异地备份的版本。' >&2; exit 1; fi
umask 077
mkdir -p /root/.ssh
chmod 700 /root/.ssh
touch /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
cat > /usr/local/sbin/ease2k-backup-export <<'SH'
#!/bin/sh
exec /usr/bin/env -i PATH=/usr/bin:/bin EASE_BACKUP_COMMAND="$SSH_ORIGINAL_COMMAND" /usr/bin/node /opt/ease2k-blog/current/offsite-export.mjs
SH
chmod 755 /usr/local/sbin/ease2k-backup-export
key_body=$(printf '%s' "$public_key" | cut -d ' ' -f 2)
entry="restrict,command=\"/usr/local/sbin/ease2k-backup-export\" $public_key"
if grep -Fq -- "$key_body" /root/.ssh/authorized_keys; then
    existing=$(grep -F -- "$key_body" /root/.ssh/authorized_keys)
    if [[ "$existing" != "$entry" ]]; then echo '此公钥已有其他授权，请使用独立备份密钥。' >&2; exit 1; fi
else
    cp -p /root/.ssh/authorized_keys "/root/.ssh/authorized_keys.before-backup-$(date +%Y%m%d%H%M%S)"
    printf '\n%s\n' "$entry" >> /root/.ssh/authorized_keys
fi
printf '只读备份通道已配置，仅允许 status 和 latest。\n'
