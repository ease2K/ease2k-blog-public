import { mkdirSync, existsSync, writeFileSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emitKeypressEvents } from 'node:readline';
import { randomBytes, randomUUID } from 'node:crypto';
import { passwordHash } from './owner-store.mjs';

const directory = resolve(process.env.BLOG_EDITOR_DIR || fileURLToPath(new URL('../data/editor/', import.meta.url)));
const file = resolve(directory, 'owner.json');
if (!process.stdin.isTTY) throw Error('请在交互终端中设置密码。');
if (existsSync(file) && !process.argv.includes('--reset')) throw Error('站主密码已设置。重置时加 --reset，旧登录会失效，文章保持不变。');
function hidden(prompt) {
    process.stdout.write(prompt);
    emitKeypressEvents(process.stdin); process.stdin.setRawMode(true); process.stdin.resume();
    return new Promise(resolve => {
        let value = '';
        const listener = (text, key) => {
            if (key?.ctrl && key.name === 'c') { process.stdin.setRawMode(false); process.stdout.write('\n'); process.exit(1); }
            if (key?.name === 'return' || key?.name === 'enter') {
                process.stdin.off('keypress', listener); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n'); resolve(value);
            } else if (key?.name === 'backspace') value = [...value].slice(0, -1).join('');
            else if (text && !key?.ctrl && !key?.meta && !/[\x00-\x1f\x7f]/.test(text)) value += text;
        };
        process.stdin.on('keypress', listener);
    });
}
const password = await hidden('设置站主密码（12～512 位，输入不显示）：');
if (password.length < 12 || password.length > 512) throw Error('密码长度需要为 12～512 位。');
if (password !== await hidden('再次输入密码：')) throw Error('两次输入不一致。');
const salt = randomBytes(16).toString('hex');
const config = { version: randomUUID(), salt, hash: await passwordHash(password, salt), secret: randomBytes(32).toString('hex'), createdAt: new Date().toISOString() };
mkdirSync(directory, { recursive: true, mode: 0o700 });
const temporary = file + '.' + randomBytes(8).toString('hex');
writeFileSync(temporary, JSON.stringify(config), { mode: 0o600, flag: 'wx' });
renameSync(temporary, file);
console.log('站主密码已保存为加盐哈希。通过 SSH 隧道打开 http://localhost:3000/_owner 登录。');
