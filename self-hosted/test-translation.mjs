import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
const folder = resolve('self-hosted/generated'); mkdirSync(folder, { recursive: true });
const file = resolve(folder, 'translation-' + randomUUID() + '.mjs');
writeFileSync(file, ts.transpileModule(readFileSync('lib/translation.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText);
const parse = unified().use(remarkParse).use(remarkGfm).use(remarkMath);
function protectedContent(markdown) {
    const result = [];
    function visit(node) {
        if (['code', 'inlineCode', 'math', 'inlineMath', 'html', 'image', 'imageReference', 'definition'].includes(node.type) || node.type === 'linkReference' && node.referenceType !== 'full') { result.push(markdown.slice(node.position.start.offset, node.position.end.offset)); return; }
        if (node.type === 'link') result.push(node.url);
        for (const child of node.children || []) visit(child);
    }
    visit(parse.parse(markdown)); return result;
}
try {
    const { translateMarkdown, translateArticle } = await import(file);
    const source = '# 中文标题\n\n这是 **强调文字** 和 `priority_queue<int>`，公式 $x_i^2$，以及 [中文链接](https://example.test/a?q=1&x=2 "原始标题")。\n\n- 列表中文\n- ![图片中文](/media/c00b5022-7734-4cb6-bd99-e641a5e05cb6.webp)\n\n> 引用中文\n>\n> ```cpp {2}\n> // 中文注释\n> cout << "中文字符串";\n> ```\n\n| 中文表头 | 数值 |\n| --- | --- |\n| 中文单元格 | 42 |\n\n$$\nf(x) = \\sum_{i=1}^n i\n$$\n\n[隐式中文][] 与 [快捷中文]。\n\n[隐式中文]: https://example.test/one\n[快捷中文]: https://example.test/two\n\n<div>原样 HTML</div>\n';
    const translated = await translateMarkdown(source, async value => value.replace(/[\u3400-\u9fff]+/g, 'translated'), 'zh-en');
    assert.deepEqual(protectedContent(translated), protectedContent(source));
    assert(translated.startsWith('# translated')); assert(translated.includes('**translated**')); assert(translated.includes('translated|') || translated.includes('translated |'));
    const spaced = await translateMarkdown('这是 **强调文字** 和 *斜体* 与 ~~删除~~、[链接](https://example.test)。', async value => ' ' + value.replace(/[\u3400-\u9fff]+/g, 'word').replace(/ZXQEZKEEP\d+QXZ/g, ' $& ') + ' ', 'zh-en');
    const formats = value => { const names = []; function visit(node) { if (['strong', 'emphasis', 'delete', 'link'].includes(node.type)) names.push(node.type); for (const child of node.children || []) visit(child); } visit(parse.parse(value)); return names; };
    assert.deepEqual(formats(spaced), ['strong', 'emphasis', 'delete', 'link']);
    const damagedMarkers = await translateMarkdown('这是 **强调** 与 `x` 后面的文字。', async value => value.replace(/ZXQEZKEEP\d+QXZ/g, '').replace(/[\u3400-\u9fff]+/g, 'word'), 'zh-en');
    assert.deepEqual(protectedContent(damagedMarkers), ['`x`']); assert(damagedMarkers.includes('**')); assert(!damagedMarkers.includes('ZXQ'));
    const missingLeaf = await translateMarkdown('中文 **强调** 完整', async value => value.includes('ZXQ') ? value.replace('强调', '').replace(/[\u3400-\u9fff]+/g, 'word') : value.replace(/[\u3400-\u9fff]+/g, 'word'), 'zh-en');
    assert(missingLeaf.includes('**word**')); assert.deepEqual(formats(missingLeaf), ['strong']);
    const collision = await translateMarkdown('中文包含 EZKEEP 与 **格式**。', async value => value.replace(/[\u3400-\u9fff]+/g, 'word'), 'zh-en'); assert(collision.includes('EZKEEP')); assert(collision.includes('**word**'));
    const malicious = await translateMarkdown('普通中文', async () => '<script>alert(1)</script> *injected* | cell', 'zh-en'); assert(!parse.parse(malicious).children.some(node => node.type === 'html')); assert(malicious.includes('\\|'));
    const long = '# 长标题\n\n' + '这是一段很长的文字。'.repeat(600) + '\n\n```js\nconsole.log("保持中文");\n```';
    let longest = 0;
    const output = await translateMarkdown(long, async value => { longest = Math.max(longest, [...value].length); return value.replace(/[\u3400-\u9fff]+/g, 'text'); }, 'zh-en');
    assert(longest <= 1400); assert.deepEqual(protectedContent(output), protectedContent(long));
    let called = 0;
    const codeOnly = '```cpp\n// 中文注释\nint x = 1;\n```\n\n$$x_i$$\n';
    assert.equal(await translateMarkdown(codeOnly, async value => { called++; return value; }, 'zh-en'), codeOnly); assert.equal(called, 0);
    const reverse = await translateArticle({ title: 'Hello', summary: 'Summary', body: '# Hello\n\nUse `sort()` with [docs](https://example.test).' }, async value => value.replace(/Hello|Summary|Use|with|docs/g, '译文'), 'en-zh');
    assert.equal(reverse.title, '译文'); assert.deepEqual(protectedContent(reverse.body), ['`sort()`', 'https://example.test']);
    const controller = new AbortController(); controller.abort(); await assert.rejects(translateMarkdown('中文', async value => value, 'zh-en', { signal: controller.signal }), { name: 'AbortError' });
    await assert.rejects(translateMarkdown('中文', async () => '', 'zh-en'), /为空/);
    console.log('PASS: bidirectional article fields, exact code/math/link/image/HTML preservation, reference links, broken-marker fallback, generated Markdown escaping, long paragraphs, cancellation and empty-result protection.');
} finally { rmSync(file, { force: true }); }
