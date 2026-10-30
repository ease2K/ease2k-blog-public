import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes, createHash, createHmac, timingSafeEqual, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
export const digest = value => createHash('sha256').update(value).digest('hex');
export function equal(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const left = Buffer.from(a), right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
}
export async function passwordHash(password, salt) {
    return (await scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })).toString('hex');
}
export function failure(message, status = 400) { return Object.assign(new Error(message), { status }); }
export function openStore(directory, bundled) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const db = new DatabaseSync(resolve(directory, 'content.sqlite'));
    db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
        CREATE TABLE IF NOT EXISTS entries (id TEXT PRIMARY KEY, payload TEXT NOT NULL, revision INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS history (id TEXT NOT NULL, revision INTEGER NOT NULL, payload TEXT NOT NULL, deleted INTEGER NOT NULL, saved_at TEXT NOT NULL, PRIMARY KEY (id, revision));
        CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, version TEXT NOT NULL, expires INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS attempts (version TEXT PRIMARY KEY, started INTEGER NOT NULL, count INTEGER NOT NULL);`);
    const initial = new Map(bundled.map(entry => [entry.id, entry]));
    function owner() {
        try {
            const value = JSON.parse(readFileSync(resolve(directory, 'owner.json'), 'utf8'));
            if (!/^[a-f0-9]{32}$/.test(value.salt) || !/^[a-f0-9]{128}$/.test(value.hash) || !/^[a-f0-9]{64}$/.test(value.secret) || typeof value.version !== 'string') throw Error('Invalid owner configuration');
            return value;
        } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    }
    function all() {
        const values = new Map([...initial].map(([id, entry]) => [id, { ...entry, revision: 0 }]));
        for (const row of db.prepare('SELECT * FROM entries').all()) {
            if (row.deleted) values.delete(row.id);
            else values.set(row.id, { ...JSON.parse(row.payload), revision: row.revision, updatedAt: row.updated_at });
        }
        return [...values.values()];
    }
    function publicEntries() {
        return all().filter(entry => entry.visibility !== 'private').map(({ revision, updatedAt, ...entry }) => entry);
    }
    function session(req) {
        const config = owner();
        if (!config) return null;
        const cookie = /(?:^|;\s*)ease_owner=([A-Za-z0-9_-]{43})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
        if (!cookie) return null;
        const row = db.prepare('SELECT * FROM sessions WHERE hash=? AND version=? AND expires>?').get(digest(cookie), config.version, Date.now());
        return row ? { hash: row.hash, csrf: createHmac('sha256', config.secret).update(cookie).digest('base64url') } : null;
    }
    async function login(password) {
        const config = owner();
        if (!config) throw failure('请先在服务器终端设置站主密码。', 503);
        const now = Date.now(), window = 15 * 60 * 1000;
        let row = db.prepare('SELECT * FROM attempts WHERE version=?').get(config.version);
        if (!row || now - row.started >= window) {
            db.prepare('INSERT OR REPLACE INTO attempts VALUES (?,?,0)').run(config.version, now);
            row = { started: now, count: 0 };
        }
        if (row.count >= 8) throw failure('尝试次数过多，请在 15 分钟后重试。', 429);
        db.prepare('UPDATE attempts SET count=count+1 WHERE version=?').run(config.version);
        if (typeof password !== 'string' || password.length < 12 || password.length > 512 || !equal(await passwordHash(password, config.salt), config.hash)) throw failure('密码不正确。', 401);
        db.prepare('DELETE FROM attempts WHERE version=?').run(config.version);
        db.prepare('DELETE FROM sessions WHERE expires<=? OR version<>?').run(now, config.version);
        const token = randomBytes(32).toString('base64url');
        db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(digest(token), config.version, now + 8 * 60 * 60 * 1000);
        return token;
    }
    function validate(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw failure('文章数据不正确。');
        const entry = {};
        const limits = { id: 100, title: 240, enTitle: 240, summary: 2000, enSummary: 2000, body: 700000, enBody: 700000, date: 50 };
        for (const [key, max] of Object.entries(limits)) {
            const text = value[key] ?? '';
            if (typeof text !== 'string' || text.length > max) throw failure('文章字段长度或格式不正确：' + key);
            entry[key] = text;
        }
        if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(entry.id)) throw failure('文章 ID 只能使用字母、数字、短横线和下划线。');
        if (!entry.title.trim()) throw failure('请填写文章标题。');
        if (!['article', 'daily', 'project'].includes(value.kind)) throw failure('文章类型不正确。');
        if (!['public', 'private'].includes(value.visibility)) throw failure('发布状态不正确。');
        if (value.visibility === 'public' && !entry.body.trim()) throw failure('发布前请填写正文。');
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(entry.date) || !Number.isFinite(Date.parse(entry.date))) throw failure('发布时间需要包含时区。');
        if (!Array.isArray(value.tags) || value.tags.length > 20 || value.tags.some(tag => typeof tag !== 'string' || !tag.trim() || tag.length > 40)) throw failure('标签格式不正确。');
        if (!Number.isInteger(value.read) || value.read < 1 || value.read > 10000) throw failure('阅读时长需要是 1～10000 的整数。');
        if (value.section !== undefined && value.section !== 'competitions') throw failure('文章分区不正确。');
        return { ...entry, kind: value.kind, visibility: value.visibility, tags: [...new Set(value.tags)], read: value.read, ...(value.section ? { section: value.section } : {}) };
    }
    function write(id, payload, revision, remove = false, create = false, restore = false) {
        if (!Number.isInteger(revision) || revision < 0) throw failure('版本号不正确。');
        db.exec('BEGIN IMMEDIATE');
        try {
            const row = db.prepare('SELECT * FROM entries WHERE id=?').get(id);
            const old = row ? JSON.parse(row.payload) : initial.get(id);
            const current = row?.revision || 0;
            if (current !== revision || (create && old) || (restore ? !row?.deleted : (!create && (!old || row?.deleted)))) throw failure('文章已被其他窗口修改或删除，请重新加载后再保存。', 409);
            if (create && row?.deleted) throw failure('这个 ID 已用于删除过的文章，请换一个 ID。', 409);
            if (!old && !create) throw failure('文章不存在。', 404);
            const entry = remove ? old : validate(payload);
            if (entry.id !== id) throw failure('文章 ID 不可更改。');
            const now = new Date().toISOString(), next = current + 1;
            if (old && !row) db.prepare('INSERT OR IGNORE INTO history VALUES (?,?,?,?,?)').run(id, 0, JSON.stringify(old), 0, now);
            const text = JSON.stringify(entry);
            db.prepare('INSERT OR REPLACE INTO entries VALUES (?,?,?,?,?)').run(id, text, next, Number(remove), now);
            db.prepare('INSERT INTO history VALUES (?,?,?,?,?)').run(id, next, text, Number(remove), now);
            db.prepare('DELETE FROM history WHERE id=? AND revision<?').run(id, next - 29);
            db.exec('COMMIT');
            return { ...entry, revision: next, updatedAt: now };
        } catch (error) { db.exec('ROLLBACK'); throw error; }
    }
    return { db, owner, all, publicEntries, session, login, write,
        trash: () => db.prepare('SELECT * FROM entries WHERE deleted=1').all().map(row => ({ ...JSON.parse(row.payload), revision: row.revision, updatedAt: row.updated_at })),
        logout: session => db.prepare('DELETE FROM sessions WHERE hash=?').run(session.hash),
        history: id => db.prepare('SELECT revision, payload, deleted, saved_at FROM history WHERE id=? ORDER BY revision DESC').all(id).map(row => ({ entry: JSON.parse(row.payload), revision: row.revision, deleted: !!row.deleted, savedAt: row.saved_at })),
    };
}
