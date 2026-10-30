import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { emitKeypressEvents } from 'node:readline';
import { hashPassword, validateOrigin } from './auth.mjs';
const dataDir = resolve(process.env.BLOG_DATA_DIR || './data');
const origin = validateOrigin(process.argv[2] || 'http://localhost:3000');
if (!process.stdin.isTTY) throw new Error('请在交互终端中运行，密码不会回显。');
if (existsSync(resolve(dataDir, 'owner.json')) && !process.argv.includes('--replace')) throw new Error('站主已设置。如需修改密码或域名，请加 --replace；现有日常不会删除，旧登录会失效。');
function hidden(prompt) {
    process.stdout.write(prompt);
    emitKeypressEvents(process.stdin); process.stdin.setRawMode(true); process.stdin.resume();
    return new Promise(resolve => {
        let value = '';
        const listener = (str, key) => {
            if (key?.ctrl && key.name === 'c') { process.stdin.setRawMode(false); process.stdout.write('\n'); process.exit(1); }
            if (key?.name === 'return' || key?.name === 'enter') { process.stdin.off('keypress', listener); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n'); resolve(value); }
            else if (key?.name === 'backspace') value = [...value].slice(0, -1).join('');
            else if (str && !key?.ctrl && !key?.meta && !/[\x00-\x1f\x7f]/.test(str)) value += str;
        };
        process.stdin.on('keypress', listener);
    });
}
const first = await hidden('设置站主密码（12～512位，输入不显示）：');
if (first.length < 12 || first.length > 512) throw new Error('密码需要12～512位，请重新运行。');
if (first !== await hidden('再次输入站主密码：')) throw new Error('两次密码不一致，请重新运行。');
mkdirSync(dataDir, { recursive: true, mode: 0o700 });
writeFileSync(resolve(dataDir, 'owner.json'), JSON.stringify({ origin, password: await hashPassword(first) }), { mode: 0o600 });
console.log('站主已设置，密码仅保存为加盐哈希。站点地址：' + origin);
