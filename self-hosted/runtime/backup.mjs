import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync, statSync, chmodSync, rmSync, existsSync, mkdtempSync, statfsSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash, randomUUID } from 'node:crypto';

const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex');
function files(root, at = root) {
    return readdirSync(at, { withFileTypes: true }).flatMap(item => {
        const file = resolve(at, item.name);
        if (item.isSymbolicLink()) throw Error('备份中不允许符号链接。');
        return item.isDirectory() ? files(root, file) : [relative(root, file)];
    });
}
function copy(source, destination) {
    mkdirSync(destination, { recursive: true, mode: 0o700 });
    for (const name of files(source)) {
        const target = resolve(destination, name);
        mkdirSync(resolve(target, '..'), { recursive: true, mode: 0o700 });
        copyFileSync(resolve(source, name), target); chmodSync(target, 0o600);
    }
}
export function verifyBackup(directory) {
    const manifest = JSON.parse(readFileSync(resolve(directory, 'manifest.json'), 'utf8'));
    if (manifest.version !== 1 || !manifest.files?.['content.sqlite']) throw Error('备份清单无效。');
    const listed = Object.keys(manifest.files).sort(), actual = files(directory).filter(name => name !== 'manifest.json').sort();
    if (JSON.stringify(listed) !== JSON.stringify(actual)) throw Error('备份文件列表与清单不一致。');
    for (const [name, digest] of Object.entries(manifest.files)) {
        const file = resolve(directory, name);
        if (!file.startsWith(resolve(directory) + sep) || hash(file) !== digest) throw Error('备份校验失败：' + name);
    }
    const db = new DatabaseSync(resolve(directory, 'content.sqlite'), { readOnly: true });
    try {
        if (Object.values(db.prepare('PRAGMA quick_check').get())[0] !== 'ok') throw Error('SQLite 完整性校验失败。');
        return { entries: db.prepare('SELECT count(*) AS count FROM entries').get().count, drafts: db.prepare('SELECT count(*) AS count FROM working_copies').get().count, files: Object.keys(manifest.files).length };
    } finally { db.close(); }
}
export function restoreBackup(directory, destination) {
    verifyBackup(directory);
    if (existsSync(destination) && readdirSync(destination).length) throw Error('恢复目标必须为空目录；请先停止服务并保留原数据。');
    copy(directory, destination);
    return verifyBackup(destination);
}
export function createBackup(source, destination, keep = 14) {
    mkdirSync(destination, { recursive: true, mode: 0o700 }); chmodSync(destination, 0o700);
    const disk = statfsSync(destination), available = Number(disk.bavail) * Number(disk.bsize);
    const size = files(source).reduce((sum, name) => sum + statSync(resolve(source, name)).size, 0);
    if (available < Math.max(Number(process.env.BLOG_BACKUP_MIN_FREE_BYTES || 1024 ** 3), size * 2)) throw Error('备份空间不足，请清理备份磁盘后重试。');
    const name = new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 8);
    const target = resolve(destination, name);
    mkdirSync(target, { mode: 0o700 });
    const db = new DatabaseSync(resolve(source, 'content.sqlite'), { readOnly: true });
    try { db.exec("VACUUM INTO '" + resolve(target, 'content.sqlite').replace(/'/g, "''") + "'"); } finally { db.close(); }
    chmodSync(resolve(target, 'content.sqlite'), 0o600);
    if (existsSync(resolve(source, 'owner.json'))) { copyFileSync(resolve(source, 'owner.json'), resolve(target, 'owner.json')); chmodSync(resolve(target, 'owner.json'), 0o600); }
    if (existsSync(resolve(source, 'media'))) copy(resolve(source, 'media'), resolve(target, 'media'));
    const manifest = { version: 1, createdAt: new Date().toISOString(), files: Object.fromEntries(files(target).map(name => [name, hash(resolve(target, name))])) };
    writeFileSync(resolve(target, 'manifest.json'), JSON.stringify(manifest, null, 4), { mode: 0o600 });
    const verified = verifyBackup(target), temporary = mkdtempSync(resolve(tmpdir(), 'ease2k-restore-check-'));
    try { restoreBackup(target, temporary); } finally { rmSync(temporary, { recursive: true, force: true }); }
    // Only rotate verified backups after the new backup and restoration have succeeded.
    const old = readdirSync(destination).filter(name => /^\d{4}-\d\d-\d\dT/.test(name) && statSync(resolve(destination, name)).isDirectory() && existsSync(resolve(destination, name, 'manifest.json'))).sort().reverse();
    for (const name of old.slice(Math.max(1, keep))) rmSync(resolve(destination, name), { recursive: true });
    return { directory: target, verified: true, restorationTest: true, ...verified };
}
