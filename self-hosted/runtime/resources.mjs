import { readdirSync, openSync, readSync, closeSync, statSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { failure } from './owner-store.mjs';
import { dimensions } from './media.mjs';

const valid = /^[a-f0-9-]{36}\.webp$/;
export function resourceStore(store, directory) {
    const db = store.db;
    function register(name, label = '') {
        if (!valid.test(name) || !existsSync(resolve(directory, 'media', name))) throw failure('图片不存在。', 404);
        if (typeof label !== 'string' || label.length > 200) throw failure('图片名称过长。');
        db.prepare('INSERT OR IGNORE INTO media_assets VALUES (?,?,0,1,?)').run(name, label.trim() || name, new Date().toISOString());
        if (label.trim()) db.prepare('UPDATE media_assets SET label=? WHERE name=?').run(label.trim(), name);
    }
    function referenceMap() {
        const refs = new Map();
        function collect(entry, kind, history = false) {
            const text = (entry.body || '') + '\n' + (entry.enBody || '') + JSON.stringify(entry.playground || {});
            for (const name of new Set([...text.matchAll(/\/media\/([a-f0-9-]{36}\.webp)/g)].map(match => match[1]))) {
                const values = refs.get(name) || [];
                const previous = history && values.find(value => value.kind === 'history' && value.id === entry.id);
                if (previous) previous.count++;
                else values.push({ kind, id: entry.id, title: entry.title || entry.id, ...(history ? { count: 1 } : {}) });
                refs.set(name, values);
            }
        }
        for (const entry of store.all()) collect(entry, entry.visibility === 'private' ? 'draft' : 'published');
        for (const entry of store.trash()) collect(entry, 'trash');
        for (const draft of store.drafts()) collect(draft.entry, 'working');
        for (const row of db.prepare('SELECT payload FROM history').all()) collect(JSON.parse(row.payload), 'history', true);
        for (const row of db.prepare('SELECT id,payload FROM series').all()) {
            const group = JSON.parse(row.payload);
            if (group.cover) { const name = group.cover.split('/').at(-1), values = refs.get(name) || []; values.push({ kind: 'cover', id: row.id, title: group.title }); refs.set(name, values); }
        }
        return refs;
    }
    function references(name) { return referenceMap().get(name) || []; }
    function list() {
        const folder = resolve(directory, 'media');
        if (existsSync(folder)) for (const name of readdirSync(folder)) if (valid.test(name)) register(name);
        const refs = referenceMap();
        return db.prepare('SELECT * FROM media_assets ORDER BY created_at DESC').all().map(row => {
            const file = resolve(directory, 'media', row.name), available = existsSync(file);
            let image = {};
            if (available) { const handle = openSync(file, 'r'); try { const header = Buffer.alloc(32); readSync(handle, header, 0, 32, 0); image = dimensions(header, statSync(file).size); } catch {} finally { closeSync(handle); } }
            return { name: row.name, label: row.label, deleted: !!row.deleted, revision: row.revision, createdAt: row.created_at, bytes: available ? statSync(file).size : 0, ...image, url: '/media/' + row.name, references: refs.get(row.name) || [] };
        });
    }
    function edit(name, value) {
        if (!valid.test(name) || !value || !Number.isInteger(value.revision)) throw failure('图片请求不正确。');
        db.exec('BEGIN IMMEDIATE');
        try {
            const row = db.prepare('SELECT * FROM media_assets WHERE name=?').get(name);
            if (!row || row.revision !== value.revision) throw failure('图片已更新，请重新加载。', 409);
            let deleted = row.deleted, label = row.label;
            if (value.action === 'rename') { if (typeof value.label !== 'string' || !value.label.trim() || value.label.length > 200) throw failure('请填写 1～200 字符的图片名称。'); label = value.label.trim(); }
            else if (value.action === 'trash' || value.action === 'restore') {
                const restoring = value.action === 'restore';
                if (restoring ? !deleted : deleted) throw failure('图片状态已改变。', 409);
                if (!restoring && references(name).length) throw failure('图片仍被文章、草稿、历史或封面引用，不能移入回收区。', 409);
                deleted = Number(!restoring);
            } else throw failure('图片操作不正确。');
            db.prepare('UPDATE media_assets SET label=?,deleted=?,revision=revision+1 WHERE name=?').run(label, deleted, name);
            db.exec('COMMIT'); return { ok: true };
        } catch (error) { db.exec('ROLLBACK'); throw error; }
    }
    function replace(name, next, revision) {
        if (!valid.test(name) || !valid.test(next) || name === next) throw failure('替换图片不正确。');
        register(next);
        if (db.prepare('SELECT deleted FROM media_assets WHERE name=?').get(next)?.deleted) throw failure('替换图片已在回收区，请先恢复。');
        db.exec('BEGIN IMMEDIATE');
        try {
            const row = db.prepare('SELECT * FROM media_assets WHERE name=?').get(name);
            if (!row || row.deleted || row.revision !== revision) throw failure('原图片已改变，请重新加载。', 409);
            const from = '/media/' + name, to = '/media/' + next;
            const rewrite = entry => JSON.parse(JSON.stringify(entry).split(from).join(to));
            const copies = store.drafts(); let changed = 0;
            for (const entry of store.all()) {
                if (!(entry.body + entry.enBody + JSON.stringify(entry.playground || {})).includes(from)) continue;
                store.write(entry.id, rewrite(entry), entry.revision, false, false, false, true); changed++;
            }
            for (const row of db.prepare('SELECT * FROM series').all()) {
                const metadata = JSON.parse(row.payload);
                if (metadata.cover === from) { metadata.cover = to; db.prepare('UPDATE series SET payload=?,revision=revision+1,updated_at=? WHERE id=?').run(JSON.stringify(metadata), new Date().toISOString(), row.id); changed++; }
            }
            for (const draft of copies) {
                const payload = rewrite(draft.entry), base = store.all().find(entry => entry.id === payload.id)?.revision || 0;
                if (JSON.stringify(payload) !== JSON.stringify(draft.entry) || base !== draft.baseRevision) db.prepare('INSERT OR REPLACE INTO working_copies VALUES (?,?,?,?,?,?)').run(payload.id, JSON.stringify(payload), base, Number(draft.creating), draft.revision + 1, new Date().toISOString());
            }
            db.exec('COMMIT'); return { changed };
        } catch (error) { db.exec('ROLLBACK'); throw error; }
    }
    return { register, list, edit, replace };
}
