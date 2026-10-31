import { mkdirSync, writeFileSync, createReadStream, statSync, existsSync, renameSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { failure } from './owner-store.mjs';

const fileName = /^[a-f0-9-]{36}\.webp$/;
export function dimensions(bytes, totalLength = bytes.length) {
    if (bytes.length < 30 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP' || bytes.readUInt32LE(4) + 8 !== totalLength) throw failure('图片需要先转换成 WebP 格式。');
    const type = bytes.toString('ascii', 12, 16);
    let width, height;
    if (type === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 1 && bytes[25] === 0x2a) { width = bytes.readUInt16LE(26) & 16383; height = bytes.readUInt16LE(28) & 16383; }
    else if (type === 'VP8L' && bytes[20] === 0x2f) { width = 1 + (((bytes[22] & 63) << 8) | bytes[21]); height = 1 + (((bytes[24] & 15) << 10) | (bytes[23] << 2) | (bytes[22] >> 6)); }
    else if (type === 'VP8X' && !(bytes[20] & 2)) { width = bytes.readUIntLE(24, 3) + 1; height = bytes.readUIntLE(27, 3) + 1; }
    if (!width || !height || width > 4096 || height > 4096) throw failure('请上传边长不超过 4096 像素的静态图片。');
    return { width, height };
}
export async function upload(req, directory) {
    if (req.headers['content-type'] !== 'image/webp') throw failure('仅接受已压缩的 WebP 图片。', 415);
    const chunks = []; let size = 0;
    for await (const chunk of req) { size += chunk.length; if (size > 3 * 1024 * 1024) throw failure('压缩后的图片不能超过 3 MiB。', 413); chunks.push(chunk); }
    const bytes = Buffer.concat(chunks), image = dimensions(bytes), name = randomUUID() + '.webp';
    const folder = resolve(directory, 'media');
    mkdirSync(folder, { recursive: true, mode: 0o700 });
    const temporary = resolve(directory, '.upload-' + name);
    try { writeFileSync(temporary, bytes, { flag: 'wx', mode: 0o600 }); renameSync(temporary, resolve(folder, name)); }
    finally { rmSync(temporary, { force: true }); }
    return { url: '/media/' + name, ...image, bytes: size };
}
export function serveMedia(req, res, name, directory, privatePreview = true) {
    if (!fileName.test(name)) return false;
    const file = resolve(directory, 'media', name);
    if (!existsSync(file)) return false;
    const stat = statSync(file), etag = '"' + stat.size.toString(16) + '-' + Math.floor(stat.mtimeMs).toString(16) + '"';
    if (!privatePreview && req.headers['if-none-match'] === etag) { res.writeHead(304, { ETag: etag, 'Cache-Control': 'public, max-age=0, must-revalidate' }); res.end(); return true; }
    res.writeHead(200, { 'Content-Type': 'image/webp', 'Content-Length': stat.size, 'Cache-Control': privatePreview ? 'no-store' : 'public, max-age=0, must-revalidate', ETag: etag, 'X-Content-Type-Options': 'nosniff' });
    if (req.method === 'HEAD') res.end(); else createReadStream(file).on('error', () => res.destroy()).pipe(res);
    return true;
}
