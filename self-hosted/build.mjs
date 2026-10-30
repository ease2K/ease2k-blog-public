import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, readdirSync, chmodSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { build } from 'vite';
import ts from 'typescript';
import { execFileSync } from 'node:child_process';
const here = fileURLToPath(new URL('.', import.meta.url));
execFileSync(process.execPath, [resolve(here, '../scripts/build-award-thumbnails.mjs')], { cwd: resolve(here, '..'), stdio: 'inherit' });
mkdirSync(resolve(here, 'generated'), { recursive: true });
const source = readFileSync(resolve(here, '../components/blog.tsx'), 'utf8');
rmSync(resolve(here, 'build'), { recursive: true, force: true });
writeFileSync(resolve(here, 'generated/blog.tsx'), source);
await build({ configFile: resolve(here, 'vite.config.mjs') });
for (const name of ['server.mjs']) cpSync(resolve(here, 'runtime', name), resolve(here, 'build', name));
writeFileSync(resolve(here, 'build/content.mjs'), ts.transpileModule(readFileSync(resolve(here, '../lib/content.ts'), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText);
cpSync(resolve(here, '../lib/ratings.mjs'), resolve(here, 'build/ratings.mjs'));
cpSync(resolve(here, '../lib/ratings-snapshot.json'), resolve(here, 'build/ratings-snapshot.json'));
cpSync(resolve(here, '../lib/tutorials.json'), resolve(here, 'build/tutorials.json'));
cpSync(resolve(here, '../lib/journal.json'), resolve(here, 'build/journal.json'));
const { entries } = await import(new URL('./build/content.mjs', import.meta.url).href + '?check=' + Date.now());
if (entries.some(entry => entry.visibility === 'private')) throw new Error('静态内容包仅可包含公开内容。');
cpSync(resolve(here, 'deploy/configure-ip-preview.sh'), resolve(here, 'build/configure-ip-preview.sh'));
cpSync(resolve(here, 'deploy/install.sh'), resolve(here, 'build/install.sh'));
cpSync(resolve(here, 'README.md'), resolve(here, 'build/README.md'));
// Public assets can arrive with 0600 permissions from clipboard attachments.
function readableRelease(path) {
    chmodSync(path, 0o755);
    for (const item of readdirSync(path, { withFileTypes: true })) {
        const file = resolve(path, item.name);
        if (item.isDirectory()) readableRelease(file);
        else chmodSync(file, 0o644);
    }
}
readableRelease(resolve(here, 'build'));
console.log('Linux deployment prepared: self-hosted/build');
