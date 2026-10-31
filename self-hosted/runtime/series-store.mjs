import { failure } from './owner-store.mjs';
import { seriesCatalog } from './series.mjs';

export function seriesStore(store) {
    const db = store.db;
    db.exec('CREATE TABLE IF NOT EXISTS series (id TEXT PRIMARY KEY, payload TEXT NOT NULL, revision INTEGER NOT NULL, updated_at TEXT NOT NULL)');
    function list() { return db.prepare('SELECT * FROM series ORDER BY id').all().map(row => ({ ...JSON.parse(row.payload), revision: row.revision, updatedAt: row.updated_at })); }
    function normalize(value) {
        if (!value || typeof value !== 'object' || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(value.id || '')) throw failure('专栏地址不正确。');
        const result = { id: value.id };
        for (const [key, limit] of Object.entries({ title: 120, enTitle: 120, description: 2000, enDescription: 2000 })) {
            if (typeof (value[key] ?? '') !== 'string' || (value[key] || '').length > limit) throw failure('专栏字段不正确：' + key);
            result[key] = value[key] || '';
        }
        if (!result.title.trim()) throw failure('请填写专栏标题。');
        if (value.cover && !/^\/media\/[a-f0-9-]{36}\.webp$/.test(value.cover)) throw failure('请从图片库选择封面。');
        if (value.cover) result.cover = value.cover;
        if (!Array.isArray(value.chapterOrder || []) || value.chapterOrder?.length > 10000 || (value.chapterOrder || []).some(id => !/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(id))) throw failure('章节列表不正确。');
        result.chapterOrder = [...new Set(value.chapterOrder || [])];
        return result;
    }
    function save(value, revision, create = false) {
        const data = normalize(value);
        if (!Number.isInteger(revision) || revision < 0) throw failure('专栏版本号不正确。');
        db.exec('BEGIN IMMEDIATE');
        try {
            const previous = db.prepare('SELECT * FROM series WHERE id=?').get(data.id);
            if (create ? previous : !previous || previous.revision !== revision) throw failure('专栏已被其他窗口修改，请重新加载。', 409);
            const members = store.all().filter(entry => entry.series?.id === data.id).map(entry => entry.id);
            if (data.chapterOrder.some(id => !members.includes(id))) throw failure('章节不属于当前专栏。');
            data.chapterOrder.push(...members.filter(id => !data.chapterOrder.includes(id)));
            if (data.cover && (!db.prepare('SELECT name FROM media_assets WHERE name=? AND deleted=0').get(data.cover.split('/').at(-1)))) throw failure('封面图片已在回收区，请先恢复。');
            const next = (previous?.revision || 0) + 1, now = new Date().toISOString();
            db.prepare('INSERT OR REPLACE INTO series VALUES (?,?,?,?)').run(data.id, JSON.stringify(data), next, now);
            db.exec('COMMIT'); return { ...data, revision: next, updatedAt: now };
        } catch (error) { db.exec('ROLLBACK'); throw error; }
    }
    // Existing per-article metadata is imported once; later edits use this registry.
    for (const group of seriesCatalog(store.all(), true)) {
        if (!group.title.trim()) continue;
        const published = seriesCatalog(store.publicEntries()).find(value => value.id === group.id);
        const { chapters, order, ...info } = published || group;
        db.prepare('INSERT OR IGNORE INTO series VALUES (?,?,1,?)').run(group.id, JSON.stringify({ ...info, chapterOrder: group.chapters.map(entry => entry.id) }), new Date().toISOString());
    }
    return { list, save };
}
