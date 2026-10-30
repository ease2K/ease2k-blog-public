import { readdir, mkdir, rm, stat } from 'node:fs/promises';
import { resolve, parse } from 'node:path';
import sharp from 'sharp';

// Only use the already-redacted public images; private originals are never inputs.
const root = resolve('public/awards'), target = resolve(root, 'thumbnails');
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
let originalBytes = 0, thumbnailBytes = 0, count = 0;
for (const file of await readdir(root)) {
    if (!/\.(?:jpg|png)$/i.test(file)) continue;
    const original = resolve(root, file);
    originalBytes += (await stat(original)).size;
    for (const width of [240, 480, 768]) {
        const output = resolve(target, parse(file).name + '-' + width + '.webp');
        await sharp(original).resize({ width, withoutEnlargement: true }).webp({ quality: 78, effort: 5 }).toFile(output);
        if (width === 480) thumbnailBytes += (await stat(output)).size;
    }
    count++;
}
console.log(`证书缩略图已生成：${count} 张 × 3 尺寸；480px 版本合计 ${Math.round(thumbnailBytes / 1024)} KiB，原图合计 ${Math.round(originalBytes / 1024)} KiB。`);
