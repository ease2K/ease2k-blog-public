import { resolve } from 'node:path';
import { createBackup, verifyBackup, restoreBackup } from './backup.mjs';

const [command, source, destination] = process.argv.slice(2);
try {
    if (!source || !['create', 'verify', 'restore'].includes(command) || command !== 'verify' && !destination) throw Error('用法：node backup-cli.mjs create 数据目录 备份目录 | verify 备份目录 | restore 备份目录 空目标目录');
    const result = command === 'create' ? createBackup(resolve(source), resolve(destination)) : command === 'verify' ? verifyBackup(resolve(source)) : restoreBackup(resolve(source), resolve(destination));
    console.log(JSON.stringify(result));
} catch (error) { console.error(error.message); process.exitCode = 1; }
