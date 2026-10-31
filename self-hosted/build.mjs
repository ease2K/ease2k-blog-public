import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, readdirSync, chmodSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { build } from 'vite';
import ts from 'typescript';
import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
const here = fileURLToPath(new URL('.', import.meta.url));
execFileSync(process.execPath, [resolve(here, '../scripts/build-award-thumbnails.mjs')], { cwd: resolve(here, '..'), stdio: 'inherit' });
rmSync(resolve(here, 'build'), { recursive: true, force: true });
await build({ configFile: resolve(here, 'vite.config.mjs') });
await sharp(resolve(here, '../public/share-card.svg')).png().toFile(resolve(here, 'build/client/share-card.png'));
await build({ configFile: false, publicDir: false, plugins: [], resolve: { alias: { '@': resolve(here, '..') } }, ssr: { noExternal: true }, build: { ssr: resolve(here, 'render.tsx'), outDir: resolve(here, 'build/ssr'), emptyOutDir: true, rolldownOptions: { output: { entryFileNames: 'render.mjs', chunkFileNames: 'assets/[name]-[hash].mjs' } } } });
for (const name of ['server.mjs', 'owner-store.mjs', 'owner-http.mjs', 'setup-owner.mjs', 'media.mjs', 'public-pages.mjs', 'backup.mjs', 'backup-cli.mjs', 'series-store.mjs', 'resources.mjs', 'feeds.mjs', 'offsite-export.mjs']) cpSync(resolve(here, 'runtime', name), resolve(here, 'build', name));
for (const name of ['writing', 'tags', 'series']) writeFileSync(resolve(here, 'build/' + name + '.mjs'), ts.transpileModule(readFileSync(resolve(here, '../lib/' + name + '.ts'), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText);
writeFileSync(resolve(here, 'build/content.mjs'), ts.transpileModule(readFileSync(resolve(here, '../lib/content.ts'), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText);
cpSync(resolve(here, '../lib/ratings.mjs'), resolve(here, 'build/ratings.mjs'));
cpSync(resolve(here, '../lib/ratings-snapshot.json'), resolve(here, 'build/ratings-snapshot.json'));
cpSync(resolve(here, '../lib/tutorials.json'), resolve(here, 'build/tutorials.json'));
cpSync(resolve(here, '../lib/journal.json'), resolve(here, 'build/journal.json'));
const { entries } = await import(new URL('./build/content.mjs', import.meta.url).href + '?check=' + Date.now());
if (entries.some(entry => entry.visibility === 'private')) throw new Error('静态内容包仅可包含公开内容。');
cpSync(resolve(here, 'deploy/configure-ip-preview.sh'), resolve(here, 'build/configure-ip-preview.sh'));
for (const name of ['owner-nginx.mjs', 'issue-owner-certificate.sh']) cpSync(resolve(here, 'deploy', name), resolve(here, 'build', name));
cpSync(resolve(here, 'deploy/install-backup-channel.sh'), resolve(here, 'build/install-backup-channel.sh'));
cpSync(resolve(here, 'deploy/install.sh'), resolve(here, 'build/install.sh'));
cpSync(resolve(here, 'README.md'), resolve(here, 'build/README.md'));
cpSync(resolve(here, 'OWNER.md'), resolve(here, 'build/OWNER.md'));
cpSync(resolve(here, 'BACKUP.md'), resolve(here, 'build/BACKUP.md'));
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
