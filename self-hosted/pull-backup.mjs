import { mkdirSync, chmodSync, readFileSync, writeFileSync, existsSync, readdirSync, lstatSync, rmSync, renameSync, createWriteStream, statfsSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { verifyBackup, restoreBackup } from './runtime/backup.mjs';

process.umask(0o077);
const home = resolve(process.env.BLOG_BACKUP_HOME || resolve(homedir(), process.platform === 'darwin' ? 'Library/Application Support/ease2k-blog-backups' : '.local/state/ease2k-blog-backups'));
const configuration = resolve(process.env.BLOG_BACKUP_CONFIG || resolve(home, 'config.json'));
const stateFile = resolve(home, 'state.json');
let temporary;
try {
    mkdirSync(home, { recursive: true, mode: 0o700 }); chmodSync(home, 0o700);
    const config = JSON.parse(readFileSync(configuration, 'utf8'));
    if (!/^[a-z_][a-z0-9_-]*@[a-zA-Z0-9.-]+$/.test(config.target || '') || !isAbsolute(config.identity || '')) throw Error('备份配置不正确。');
    const options = ['-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=10', '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=3', '-i', config.identity, config.target];
    const remote = JSON.parse(execFileSync('/usr/bin/ssh', [...options, 'status'], { encoding: 'utf8', timeout: 30000, maxBuffer: 65536, stdio: ['ignore', 'pipe', 'pipe'] }));
    if (!/^\d{4}-\d\d-\d\dT[\dZ-]+-[a-f0-9]{8}$/.test(remote.name) || !Number.isFinite(remote.bytes) || remote.bytes <= 0 || !Number.isFinite(Date.parse(remote.createdAt))) throw Error('服务器返回的备份状态不正确。');
    if (remote.backupResult !== 'success' || remote.timerActive !== 'active') throw Error('服务器每日备份失败或定时器未运行，请检查备份服务。');
    if (Date.now() - Date.parse(remote.createdAt) > 36 * 3600000) throw Error('服务器最新备份已超过 36 小时。');
    if (remote.availableBytes < Math.max(remote.minimumFreeBytes || 1024 ** 3, remote.bytes * 2)) throw Error('服务器备份磁盘空间不足。');
    const disk = statfsSync(home); if (Number(disk.bavail) * Number(disk.bsize) < Math.max(1024 ** 3, remote.bytes * 3)) throw Error('Mac 备份磁盘空间不足。');
    const destination = resolve(home, remote.name);
    let downloaded = false;
    if (!existsSync(destination)) {
        temporary = resolve(home, '.incoming-' + randomUUID()); mkdirSync(temporary, { mode: 0o700 });
        const archive = resolve(temporary, 'snapshot.tar.gz'), child = spawn('/usr/bin/ssh', [...options, 'latest ' + remote.name], { stdio: ['ignore', 'pipe', 'pipe'] });
        let bytes = 0, error = '';
        child.stderr.on('data', value => { error = (error + value.toString()).slice(-2000); });
        const exited = new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', (code, signal) => code === 0 ? resolve() : reject(Error('备份下载失败：' + (error || signal || code)))); });
        const timeout = setTimeout(() => child.kill('SIGTERM'), 20 * 60000);
        try { await Promise.all([exited, pipeline(child.stdout, new Transform({ transform(chunk, encoding, callback) { bytes += chunk.length; if (bytes > remote.bytes * 1.2 + 1024 ** 2) callback(Error('备份压缩包超过预期大小。')); else callback(null, chunk); } }), createWriteStream(archive, { mode: 0o600, flags: 'wx' }))]); }
        finally { clearTimeout(timeout); if (child.exitCode === null) child.kill('SIGTERM'); }
        const names = execFileSync('/usr/bin/tar', ['-tzf', archive], { encoding: 'utf8', maxBuffer: 8 * 1024 ** 2 }).trim().split('\n');
        for (const name of names) {
            const relative = name.slice(remote.name.length + 1);
            if (!name.startsWith(remote.name + '/') || !/^(?:|content\.sqlite|owner\.json|manifest\.json|media\/?|media\/[a-f0-9-]{36}\.webp)$/.test(relative)) throw Error('备份压缩包包含不允许的路径。');
        }
        const listing = execFileSync('/usr/bin/tar', ['-tvzf', archive], { encoding: 'utf8', maxBuffer: 16 * 1024 ** 2 }).trim().split('\n');
        if (listing.some(line => !['d', '-'].includes(line[0]))) throw Error('备份压缩包不能包含链接或特殊文件。');
        execFileSync('/usr/bin/tar', ['-xzf', archive, '-C', temporary, '--no-same-owner', '--no-same-permissions']);
        const source = resolve(temporary, remote.name); verifyBackup(source);
        restoreBackup(source, resolve(temporary, 'restore-check')); renameSync(source, destination); downloaded = true;
    }
    const verified = verifyBackup(destination);
    const previous = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : {};
    const state = { checkedAt: new Date().toISOString(), ok: true, latest: remote.name, createdAt: remote.createdAt, downloaded, verified, restorationTest: downloaded || previous.latest === remote.name && previous.restorationTest === true, notify: previous.ok === false, event: previous.ok === false ? 'recovered' : 'healthy' };
    writeFileSync(stateFile, JSON.stringify(state, null, 4), { mode: 0o600 }); chmodSync(stateFile, 0o600);
    const snapshots = readdirSync(home).filter(name => /^\d{4}-\d\d-\d\dT[\dZ-]+-[a-f0-9]{8}$/.test(name) && lstatSync(resolve(home, name)).isDirectory() && existsSync(resolve(home, name, 'manifest.json'))).sort().reverse();
    for (const name of snapshots.slice(30)) rmSync(resolve(home, name), { recursive: true });
    console.log(JSON.stringify(state));
} catch (error) {
    const detail = error.code === 'ENOENT' ? '缺少本机备份配置或专用 SSH 密钥。' : String(error.message).replace(/\(node:\d+\)/g, '(node)').replace(/(?:-----BEGIN[^]*?-----END[^]*?-----)/g, '[redacted]').slice(0, 1000);
    let previous = {}; try { previous = JSON.parse(readFileSync(stateFile, 'utf8')); } catch {}
    const state = { ...previous, checkedAt: new Date().toISOString(), ok: false, error: detail, notify: previous.ok !== false || previous.error !== detail, event: 'failed' };
    try { writeFileSync(stateFile, JSON.stringify(state, null, 4), { mode: 0o600 }); chmodSync(stateFile, 0o600); } catch {}
    console.log(JSON.stringify(state)); process.exitCode = 1;
} finally { if (temporary) rmSync(temporary, { recursive: true, force: true }); }
