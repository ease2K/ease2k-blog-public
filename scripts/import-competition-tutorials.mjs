import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// 原稿保持原样；日期采用已核对的本地原稿更新时间。
const sources = [
    { id: 'cpp-sort-introduction', file: 'sort_tutorial.md', date: '2026-10-09T10:03:21+08:00', tags: ['C++', 'STL', 'sort', 'vector'], summary: '从冒泡、选择和插入排序开始，整理 sort、自定义比较与 vector 排序。' },
    { id: 'cpp-stack-queue-introduction', file: 'stack_queue_tutorial.md', date: '2026-10-11T09:16:39+08:00', tags: ['C++', 'STL', 'stack', 'queue'], summary: '理解后进先出和先进先出，掌握标准库操作与数组、vector 模拟。' },
    { id: 'cpp-priority-queue-introduction', file: 'priority_queue_tutorial.md', date: '2026-10-11T22:04:25+08:00', tags: ['C++', 'STL', 'priority_queue'], summary: '从大小根堆到结构体比较，整理优先队列的常用操作、应用与易错点。' },
];
const entries = sources.map(({ file, ...source }, index) => {
    const body = readFileSync(new URL('../content/competitions/' + file, import.meta.url), 'utf8');
    return { ...source, series: { id: 'cpp-stl-introduction', title: 'C++ STL 入门', enTitle: 'Getting started with C++ STL', description: '从排序、栈和队列到优先队列，循序整理常用 STL 工具的原理、操作和练习。', enDescription: 'Learn sorting, stacks, queues, and priority queues through explanations and practice.', order: index + 1 }, kind: 'article', section: 'competitions', title: body.split('\n')[0].replace(/^# /, ''), enTitle: '', enSummary: '', body, enBody: '', read: Math.max(1, Math.ceil(body.length / 400)) };
});
writeFileSync(fileURLToPath(new URL('../lib/tutorials.json', import.meta.url)), JSON.stringify(entries, null, 4) + '\n');
console.log('Imported ' + entries.length + ' original C++ tutorials.');
