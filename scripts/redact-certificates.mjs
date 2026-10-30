import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

// Originals stay outside public/ and outside the deployment package.
const source = resolve('work/certificate-originals');
const target = resolve('public/awards');
const certificates = [
    { file: 'ccpc-qinhuangdao-2026.jpg', width: 1745, height: 1237, masks: [[252, 457, 920, 88], [192, 850, 265, 260]] },
    { file: 'gplt-hubei-2026.jpg', width: 1260, height: 1641, masks: [[535, 602, 158, 55]] },
    { file: 'hzau-freshman-2025.jpg', width: 1440, height: 1080, masks: [[355, 415, 125, 60]] },
    { file: 'hzau-programming-2026.jpg', width: 1706, height: 1279, masks: [[545, 486, 140, 56]] },
    { file: 'nowcoder-summer-2026.png', width: 1190, height: 1684, masks: [[455, 550, 267, 94]] },
    { file: 'nowcoder-winter-2026.jpg', width: 1171, height: 1699, masks: [[455, 559, 255, 95]] },
];

for (const certificate of certificates) {
    const original = await readFile(resolve(source, certificate.file));
    const metadata = await sharp(original).metadata();
    if (metadata.width !== certificate.width || metadata.height !== certificate.height) throw new Error('证书尺寸与遮挡范围不匹配：' + certificate.file);
    const masks = await Promise.all(certificate.masks.map(async ([left, top, width, height]) => ({
        left, top,
        input: await sharp({ create: { width, height, channels: 3, background: '#000000' } }).png().toBuffer(),
    })));
    const image = sharp(original).composite(masks);
    const result = certificate.file.endsWith('.png') ? await image.png().toBuffer() : await image.jpeg({ quality: 100, chromaSubsampling: '4:4:4' }).toBuffer();
    // Re-encode without source metadata or embedded thumbnails.
    const output = sharp(result);
    const info = await output.metadata();
    if (info.exif || info.xmp || info.iptc) throw new Error('发布图片仍包含源元数据：' + certificate.file);
    for (const [left, top, width, height] of certificate.masks) {
        const { data } = await sharp(result).extract({ left: left + 8, top: top + 8, width: width - 16, height: height - 16 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
        if (data.some(value => value > 4)) throw new Error('遮挡块不完全不透明：' + certificate.file);
    }
    await writeFile(resolve(target, certificate.file), result, { mode: 0o644 });
    console.log('已遮挡并核验：' + certificate.file);
}
