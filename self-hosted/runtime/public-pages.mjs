import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sections, inSection, awards } from './content.mjs';
import { excerpt } from './writing.mjs';
import { tagKey, tagName } from './tags.mjs';
import { render } from './ssr/render.mjs';

export const visible = store => store.publicEntries().filter(entry => !entry.sample && entry.body.trim()).sort((a, b) => b.date.localeCompare(a.date));
export function indexEntry({ body, enBody, ...entry }) { return { ...entry, summary: ['-', '—', ''].includes(entry.summary.trim()) ? excerpt(body) : entry.summary, hasBody: !!body.trim() }; }
export function searchEntries(entries, query) {
    const value = query.trim().toLocaleLowerCase().slice(0, 200);
    return value ? entries.filter(entry => [entry.title, entry.enTitle, entry.summary, entry.enSummary, entry.body, entry.enBody, ...entry.tags, ...entry.tags.map(tagKey), ...entry.tags.map(value => tagName(value, 'en'))].join(' ').toLocaleLowerCase().includes(value)).slice(0, 30).map(indexEntry) : [];
}
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const safeJSON = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
export function sitemap(entries, origin) {
    const paths = ['/', '/about', '/competitions', ...sections.filter(section => entries.some(entry => inSection(entry, section))).map(section => '/' + section), ...entries.map(entry => '/entry/' + entry.id), ...awards.map(award => '/award/' + award.id)];
    return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + [...new Set(paths)].map(path => '<url><loc>' + escape(origin + path) + '</loc></url>').join('') + '</urlset>';
}
export async function page(req, pathname, store, root, origin) {
    const entries = visible(store), parts = pathname.split('/');
    const entry = parts[1] === 'entry' ? entries.find(entry => entry.id === parts[2] && parts.length === 3) : undefined;
    const award = parts[1] === 'award' ? awards.find(award => award.id === parts[2] && parts.length === 3) : undefined;
    const valid = pathname === '/' || pathname === '/about' || pathname === '/competitions' || ['/competitions/awards', '/competitions/problems', '/competitions/tutorials'].includes(pathname) || [...sections, 'cpp'].some(section => pathname === '/' + section) || !!entry || !!award;
    const lang = /^zh/i.test((req.headers['accept-language'] || 'zh').split(',')[0]) ? 'zh' : 'en';
    const summary = entry ? indexEntry(entry).summary : '记录日常，分享算法、C++、Java、MySQL、HTML、CSS 与 JavaScript 的学习和实践。';
    const description = entry && lang === 'en' ? entry.enSummary || excerpt(entry.enBody || entry.body) : summary;
    const title = (entry ? lang === 'en' && entry.enTitle ? entry.enTitle : entry.title : award ? award.event : valid ? pathname === '/' ? '个人手记' : pathname === '/about' ? '关于我' : parts.at(-1) : '页面不存在') + ' · eAs1nGG-_-';
    const canonical = origin + pathname;
    const initialData = { entries: entries.map(entry => ({ ...indexEntry(entry), body: '', enBody: '' })), ready: true };
    const initial = { initialData, ...(entry ? { initialEntry: entry } : {}), initialLang: lang };
    let source = readFileSync(resolve(root, 'index.html'), 'utf8').replace('<html lang="zh-CN">', '<html lang="' + (lang === 'zh' ? 'zh-CN' : 'en') + '">');
    source = source.replace(/<title>[\s\S]*?<\/title>/, '<title>' + escape(title) + '</title>').replace(/<meta name="description"[^>]*>/, '<meta name="description" content="' + escape(description) + '">');
    let head = '<link rel="canonical" href="' + escape(canonical) + '"><meta property="og:type" content="' + (entry ? 'article' : 'website') + '"><meta property="og:title" content="' + escape(title) + '"><meta property="og:description" content="' + escape(description) + '"><meta property="og:url" content="' + escape(canonical) + '"><meta property="og:image" content="' + escape(origin + '/share-card.png') + '"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image">';
    if (!valid) head += '<meta name="robots" content="noindex">';
    if (entry) head += '<script type="application/ld+json">' + safeJSON({ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: entry.title, description, datePublished: entry.date, author: { '@type': 'Person', name: 'ease2k', url: origin + '/about' }, mainEntityOfPage: canonical, inLanguage: lang === 'en' && entry.enBody ? 'en' : 'zh-CN' }) + '</script>';
    source = source.replace('</head>', head + '</head>').replace('<div id="root"></div>', '<div id="root">' + (await render(pathname, initialData, entry, lang)) + '</div><script id="blog-bootstrap" type="application/json">' + safeJSON(initial) + '</script>');
    return { html: source, status: valid ? 200 : 404 };
}
