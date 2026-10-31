import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes, createHash, createHmac, timingSafeEqual, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import { excerpt, readingMinutes } from './writing.mjs';

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
        CREATE TABLE IF NOT EXISTS working_copies (id TEXT PRIMARY KEY, payload TEXT NOT NULL, base_revision INTEGER NOT NULL, creating INTEGER NOT NULL, revision INTEGER NOT NULL, saved_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS series (id TEXT PRIMARY KEY, payload TEXT NOT NULL, revision INTEGER NOT NULL, updated_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS media_assets (name TEXT PRIMARY KEY, label TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, revision INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS attempts (version TEXT PRIMARY KEY, started INTEGER NOT NULL, count INTEGER NOT NULL);`);
    const initial = new Map(bundled.map(entry => [entry.id, entry]));
    function owner() {
        try {
            const value = JSON.parse(readFileSync(resolve(directory, 'owner.json'), 'utf8'));
            if (!/^[a-f0-9]{32}$/.test(value.salt) || !/^[a-f0-9]{128}$/.test(value.hash) || !/^[a-f0-9]{64}$/.test(value.secret) || typeof value.version !== 'string') throw Error('Invalid owner configuration');
            return value;
        } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    }
    function publishedAt(entry) {
        if (!entry) return null;
        if (Object.hasOwn(entry, 'publishedAt')) return entry.publishedAt;
        if (entry.visibility !== 'private') return entry.date;
        const bundled = initial.get(entry.id);
        if (bundled && bundled.visibility !== 'private') return bundled.date;
        const version = db.prepare("SELECT payload FROM history WHERE id=? AND json_extract(payload, '$.visibility')='public' ORDER BY revision LIMIT 1").get(entry.id);
        return version ? JSON.parse(version.payload).date : null;
    }
    function all() {
        const values = new Map([...initial].map(([id, entry]) => [id, { ...entry, publishedAt: publishedAt(entry), revision: 0 }]));
        for (const row of db.prepare('SELECT * FROM entries').all()) {
            if (row.deleted) values.delete(row.id);
            else {
                const entry = JSON.parse(row.payload);
                values.set(row.id, { ...entry, publishedAt: publishedAt(entry), revision: row.revision, updatedAt: row.updated_at });
            }
        }
        const catalog = new Map(db.prepare('SELECT id,payload FROM series').all().map(row => [row.id, JSON.parse(row.payload)]));
        return [...values.values()].map(entry => {
            const metadata = entry.series && catalog.get(entry.series.id);
            if (!metadata) return entry;
            const { chapterOrder, ...info } = metadata;
            const index = chapterOrder?.indexOf(entry.id) ?? -1;
            return { ...entry, series: { ...info, order: index >= 0 ? index + 1 : entry.series.order } };
        });
    }
    function publicEntries() {
        return all().filter(entry => entry.visibility !== 'private').map(({ revision, updatedAt, publishedAt, ...entry }) => entry);
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
        if (value.series !== undefined) {
            const series = value.series;
            if (!series || typeof series !== 'object' || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(series.id || '') || !Number.isInteger(series.order) || series.order < 1 || series.order > 10000) throw failure('系列地址或章节顺序不正确。');
            const result = { id: series.id, order: series.order };
            for (const [key, limit] of Object.entries({ title: 120, enTitle: 120, description: 2000, enDescription: 2000 })) {
                if (typeof (series[key] ?? '') !== 'string' || (series[key] || '').length > limit) throw failure('系列字段格式不正确。');
                result[key] = series[key] || '';
            }
            if (value.visibility === 'public' && !result.title.trim()) throw failure('发布前请填写系列标题。');
            entry.series = result;
        }
        if (value.playground !== undefined) {
            const playground = value.playground;
            if (!playground || typeof playground !== 'object') throw failure('在线示例格式不正确。');
            entry.playground = {};
            for (const key of ['html', 'css', 'js']) {
                if (typeof (playground[key] ?? '') !== 'string' || (playground[key] || '').length > 50000) throw failure('在线示例每种语言不能超过 50000 字符。');
                entry.playground[key] = playground[key] || '';
            }
        }
        for (const match of JSON.stringify(entry).matchAll(/\/media\/([a-f0-9-]{36}\.webp)/g)) if (db.prepare('SELECT deleted FROM media_assets WHERE name=?').get(match[1])?.deleted) throw failure('图片已在回收区，请先恢复。');
        return { ...entry, kind: value.kind, visibility: value.visibility, tags: [...new Set(value.tags)], read: value.read, ...(value.section ? { section: value.section } : {}) };
    }
    function write(id, payload, revision, remove = false, create = false, restore = false, externalTransaction = false) {
        if (!Number.isInteger(revision) || revision < 0) throw failure('版本号不正确。');
        if (!externalTransaction) db.exec('BEGIN IMMEDIATE');
        try {
            const row = db.prepare('SELECT * FROM entries WHERE id=?').get(id);
            const old = row ? JSON.parse(row.payload) : initial.get(id);
            const current = row?.revision || 0;
            if (current !== revision || (create && old) || (restore ? !row?.deleted : (!create && (!old || row?.deleted)))) throw failure('文章已被其他窗口修改或删除，请重新加载后再保存。', 409);
            if (create && row?.deleted) throw failure('这个 ID 已用于删除过的文章，请换一个 ID。', 409);
            if (!old && !create) throw failure('文章不存在。', 404);
            const now = new Date().toISOString(), next = current + 1;
            const firstPublished = publishedAt(old) || (payload?.visibility === 'public' && !remove ? now : null);
            const entry = remove ? old : { ...validate({ ...payload, summary: payload?.summary?.trim() && !['-', '—'].includes(payload.summary.trim()) ? payload.summary : excerpt(payload?.body || ''), enSummary: payload?.enSummary?.trim() || excerpt(payload?.enBody || ''), read: readingMinutes(payload?.body || ''), date: firstPublished || old?.date || now }), publishedAt: firstPublished };
            if (externalTransaction && !remove) { entry.summary = old.summary; entry.enSummary = old.enSummary; entry.read = old.read; }
            if (entry.id !== id) throw failure('文章 ID 不可更改。');
            if (!remove && entry.series) {
                const row = db.prepare('SELECT payload FROM series WHERE id=?').get(entry.series.id);
                if (!row) {
                    const { order, ...info } = entry.series;
                    db.prepare('INSERT INTO series VALUES (?,?,1,?)').run(info.id, JSON.stringify({ ...info, chapterOrder: [entry.id] }), now);
                } else {
                    const metadata = JSON.parse(row.payload);
                    const before = all().find(value => value.id === entry.id)?.series;
                    if (!metadata.chapterOrder.includes(entry.id) || before?.order !== entry.series.order) {
                        metadata.chapterOrder = metadata.chapterOrder.filter(id => id !== entry.id);
                        metadata.chapterOrder.splice(Math.min(entry.series.order - 1, metadata.chapterOrder.length), 0, entry.id);
                        db.prepare('UPDATE series SET payload=?,revision=revision+1,updated_at=? WHERE id=?').run(JSON.stringify(metadata), now, entry.series.id);
                    }
                }
            }
            if (old && !row) db.prepare('INSERT OR IGNORE INTO history VALUES (?,?,?,?,?)').run(id, 0, JSON.stringify(old), 0, now);
            const text = JSON.stringify(entry);
            db.prepare('INSERT OR REPLACE INTO entries VALUES (?,?,?,?,?)').run(id, text, next, Number(remove), now);
            db.prepare('INSERT INTO history VALUES (?,?,?,?,?)').run(id, next, text, Number(remove), now);
            db.prepare('DELETE FROM history WHERE id=? AND revision<?').run(id, next - 29);
            db.prepare('DELETE FROM working_copies WHERE id=?').run(id);
            if (!externalTransaction) db.exec('COMMIT');
            return remove ? { ...entry, revision: next, updatedAt: now } : all().find(value => value.id === id);
        } catch (error) { if (!externalTransaction) db.exec('ROLLBACK'); throw error; }
    }
    function drafts() {
        return db.prepare('SELECT * FROM working_copies ORDER BY saved_at DESC').all().map(row => ({ entry: JSON.parse(row.payload), baseRevision: row.base_revision, creating: !!row.creating, revision: row.revision, savedAt: row.saved_at }));
    }
    function saveDraft(id, value) {
        if (!value || !Number.isInteger(value.baseRevision) || !Number.isInteger(value.revision) || value.revision < 0) throw failure('草稿版本号不正确。');
        const source = value.entry;
        const entry = validate({ ...source, title: source?.title || '未命名文章', date: new Date().toISOString(), read: readingMinutes(source?.body || ''), visibility: 'private' });
        if (entry.id !== id) throw failure('草稿 ID 不正确。');
        entry.title = source.title || '';
        db.exec('BEGIN IMMEDIATE');
        try {
            const old = db.prepare('SELECT * FROM entries WHERE id=?').get(id), bundled = initial.get(id);
            const current = old?.revision || 0;
            if (old?.deleted || current !== value.baseRevision || (value.creating ? old || bundled : !old && !bundled)) throw failure('原文章已更新，请重新载入后再保存编辑草稿。', 409);
            const previous = db.prepare('SELECT revision FROM working_copies WHERE id=?').get(id);
            if ((previous?.revision || 0) !== value.revision) throw failure('编辑草稿已在其他窗口更新，请重新加载。', 409);
            const now = new Date().toISOString(), revision = value.revision + 1;
            entry.visibility = (old ? JSON.parse(old.payload) : bundled)?.visibility === 'private' || value.creating ? 'private' : 'public';
            entry.date = (old ? JSON.parse(old.payload) : bundled)?.date || now;
            db.prepare('INSERT OR REPLACE INTO working_copies VALUES (?,?,?,?,?,?)').run(id, JSON.stringify(entry), current, Number(!!value.creating), revision, now);
            db.exec('COMMIT');
            return { entry, baseRevision: current, creating: !!value.creating, revision, savedAt: now };
        } catch (error) { db.exec('ROLLBACK'); throw error; }
    }
    return { db, owner, all, publicEntries, session, login, write, drafts, saveDraft,
        trash: () => db.prepare('SELECT * FROM entries WHERE deleted=1').all().map(row => { const entry = JSON.parse(row.payload); return { ...entry, publishedAt: publishedAt(entry), revision: row.revision, updatedAt: row.updated_at }; }),
        logout: session => db.prepare('DELETE FROM sessions WHERE hash=?').run(session.hash),
        history: id => db.prepare('SELECT revision, payload, deleted, saved_at FROM history WHERE id=? ORDER BY revision DESC').all(id).map(row => ({ entry: JSON.parse(row.payload), revision: row.revision, deleted: !!row.deleted, savedAt: row.saved_at })),
    };
}
