import { mkdtempSync, cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const here = fileURLToPath(new URL('.', import.meta.url));
await import('./build.mjs');
const output = resolve(here, '../outputs');
mkdirSync(output, { recursive: true });
const stage = mkdtempSync(resolve(tmpdir(), 'ease2k-package-'));
try {
    cpSync(resolve(here, 'build'), resolve(stage, 'ease2k-blog-linux'), { recursive: true });
    const archive = resolve(output, 'ease2k-blog-linux.tar.gz');
    const metadataOptions = process.platform === 'darwin' ? ['--no-xattrs', '--no-acls', '--no-mac-metadata'] : [];
    const result = spawnSync('tar', [...metadataOptions, '-czf', archive, '-C', stage, 'ease2k-blog-linux'], { env: { ...process.env, COPYFILE_DISABLE: '1' }, stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) throw Error('打包失败');
    const digest = createHash('sha256').update(readFileSync(archive)).digest('hex');
    writeFileSync(resolve(output, 'ease2k-blog-linux.sha256'), digest + '  ease2k-blog-linux.tar.gz\n');
    console.log('部署包已更新：' + archive);
} finally { rmSync(stage, { recursive: true, force: true }); }
