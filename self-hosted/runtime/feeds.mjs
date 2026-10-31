import { seriesCatalog } from './series.mjs';
import { excerpt } from './writing.mjs';

const xml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
export function feed(entries, path, origin) {
    let title = 'ease2k · 全部内容', selected = entries;
    if (path === '/feed/technical.xml') { title = 'ease2k · 技术文章'; selected = entries.filter(entry => entry.kind !== 'daily'); }
    else if (path.startsWith('/feed/series/')) {
        const id = path.slice('/feed/series/'.length, -4), group = seriesCatalog(entries).find(group => group.id === id);
        if (!group) return null;
        title = 'ease2k · ' + group.title; selected = group.chapters;
    }
    const items = selected.filter(entry => entry.visibility !== 'private' && !entry.sample && entry.body.trim()).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50);
    return '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>' + xml(title) + '</title><link>' + xml(origin) + '</link><description>记录日常，分享学习与实践。</description><language>zh-CN</language><atom:link href="' + xml(origin + path) + '" rel="self" type="application/rss+xml"/>' + items.map(entry => '<item><title>' + xml(entry.title) + '</title><link>' + xml(origin + '/entry/' + entry.id) + '</link><guid isPermaLink="true">' + xml(origin + '/entry/' + entry.id) + '</guid><pubDate>' + new Date(entry.date).toUTCString() + '</pubDate><description>' + xml(entry.summary?.trim() && !['-', '—'].includes(entry.summary.trim()) ? entry.summary : excerpt(entry.body)) + '</description>' + entry.tags.map(tag => '<category>' + xml(tag) + '</category>').join('') + '</item>').join('') + '</channel></rss>';
}
