import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export const token = () => randomBytes(32).toString('base64url');
export const digest = value => createHash('sha256').update(value).digest('hex');
export function equal(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const left = Buffer.from(a), right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
}
export async function hashPassword(password, salt = randomBytes(16).toString('hex')) {
    const result = await scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    return { salt, hash: result.toString('hex') };
}
export async function checkPassword(password, stored) {
    return equal((await hashPassword(password, stored.salt)).hash, stored.hash);
}
export function safeReturn(value) {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/daily';
    try { const u = new URL(value, 'https://local.invalid'); return u.origin === 'https://local.invalid' && !['/signin', '/signout'].includes(u.pathname) ? u.pathname + u.search + u.hash : '/daily'; } catch { return '/daily'; }
}
export function validateOrigin(value) {
    const u = new URL(value);
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.pathname !== '/' || u.search || u.hash) throw new Error('请输入不带路径的站点地址');
    if (u.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)) throw new Error('公网登录必须配置 HTTPS；初次部署可使用 http://localhost:3000，通过 SSH 隧道访问。');
    return u.origin;
}
