import { readdirSync, statSync, statfsSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { verifyBackup } from './backup.mjs';

// This program is only reached through a restricted SSH forced command.
const directory = '/var/backups/ease2k-blog';
try {
    const command = process.env.EASE_BACKUP_COMMAND;
    const requested = command?.match(/^latest (\d{4}-\d\d-\d\dT[\dZ-]+-[a-f0-9]{8})$/)?.[1];
    if (!['status', 'latest'].includes(command) && !requested) throw Error('Only status and latest are allowed.');
    const snapshots = readdirSync(directory, { withFileTypes: true }).filter(item => item.isDirectory() && /^\d{4}-\d\d-\d\dT[\dZ-]+-[a-f0-9]{8}$/.test(item.name) && existsSync(resolve(directory, item.name, 'manifest.json'))).map(item => item.name).sort();
    const name = requested || snapshots.at(-1); if (!name || !snapshots.includes(name)) throw Error('没有经过校验的备份，请检查每日备份服务。');
    const folder = resolve(directory, name), manifest = JSON.parse(readFileSync(resolve(folder, 'manifest.json'), 'utf8'));
    function size(at) { return readdirSync(at, { withFileTypes: true }).reduce((sum, item) => { if (item.isSymbolicLink()) throw Error('备份中存在符号链接。'); const file = resolve(at, item.name); return sum + (item.isDirectory() ? size(file) : statSync(file).size); }, 0); }
    if (command === 'status') {
        const disk = statfsSync(directory);
        const property = (unit, property) => execFileSync('/bin/systemctl', ['show', unit, '-p', property, '--value'], { encoding: 'utf8', timeout: 5000 }).trim();
        console.log(JSON.stringify({ name, createdAt: manifest.createdAt, bytes: size(folder), availableBytes: Number(disk.bavail) * Number(disk.bsize), minimumFreeBytes: 1024 ** 3, backupResult: property('ease2k-blog-backup.service', 'Result'), timerActive: property('ease2k-blog-backup.timer', 'ActiveState') }));
    } else {
        verifyBackup(folder);
        const child = spawn('/bin/tar', ['-C', directory, '-czf', '-', name], { stdio: ['ignore', 'inherit', 'inherit'] });
        const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
        if (code !== 0) throw Error('备份打包失败。');
    }
} catch (error) { console.error(error.message); process.exitCode = 1; }
