import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

export type TranslationDirection = "zh-en" | "en-zh";
export type TranslationFields = { title: string; summary: string; body: string };
export type TranslateText = (text: string) => Promise<string>;
type Node = { type: string; value?: string; url?: string; referenceType?: string; children?: Node[]; position?: { start: { offset?: number }; end: { offset?: number } } };
type Leaf = { start: number; end: number; text: string; opening: boolean; closing: boolean };
type Unit = { start: number; end: number; leaves: Leaf[] };
const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath);
const containers = new Set(["paragraph", "heading", "tableCell"]);
const protectedNodes = new Set(["code", "inlineCode", "math", "inlineMath", "html", "image", "imageReference", "definition"]);
function cancelled(signal?: AbortSignal) { if (signal?.aborted) throw new DOMException("翻译已取消", "AbortError"); }
function translatable(text: string, direction: TranslationDirection) {
    return !/^(?:https?:\/\/|www\.|mailto:)\S+$/i.test(text.trim()) && (direction === "zh-en" ? /[\u3400-\u9fff]/ : /[A-Za-z]/).test(text);
}
function escapeText(text: string) {
    return text.replace(/[\\`*_[\]<>#|~]/g, "\\$&").replace(/(^|\n)([ \t]*)([-+]|\d+[.)])(?=\s)/g, "$1$2\\$3");
}
export function translationUnits(markdown: string): Unit[] {
    const units: Unit[] = [];
    function leaves(node: Node, parent?: Node, index = 0): Leaf[] {
        if (protectedNodes.has(node.type) || node.type === "linkReference" && node.referenceType !== "full") return [];
        if (node.type === "text" && node.value && node.position?.start.offset !== undefined && node.position.end.offset !== undefined) {
            if (parent?.type === "link" && node.value === parent.url) return [];
            const inline = ["strong", "emphasis", "delete", "link", "linkReference"].includes(parent?.type || "");
            return [{ start: node.position.start.offset, end: node.position.end.offset, text: node.value, opening: inline && index === 0, closing: inline && index === (parent?.children?.length || 0) - 1 }];
        }
        return (node.children || []).flatMap((child, index) => leaves(child, node, index));
    }
    function visit(node: Node) {
        if (protectedNodes.has(node.type)) return;
        if (containers.has(node.type)) {
            const values = leaves(node); if (values.length) units.push({ start: values[0].start, end: values.at(-1)!.end, leaves: values });
            return;
        }
        for (const child of node.children || []) visit(child);
    }
    visit(parser.parse(markdown) as Node); return units;
}
async function plain(text: string, translate: TranslateText, direction: TranslationDirection, signal?: AbortSignal) {
    if (!text.trim() || !translatable(text, direction)) return text;
    const prefix = text.match(/^\s*/)?.[0] || "", suffix = text.match(/\s*$/)?.[0] || "";
    const sentences = text.trim().match(/[^.!?。！？\n]+[.!?。！？\n]*|[.!?。！？\n]+/gu) || [text.trim()];
    const chunks: string[] = []; let current = "";
    for (const sentence of sentences) {
        for (const part of sentence.match(/[\s\S]{1,1200}/gu) || []) {
            if (current.length + part.length > 1400) { if (current) chunks.push(current); current = ""; }
            current += part;
        }
    }
    if (current) chunks.push(current);
    const result: string[] = [];
    for (const chunk of chunks) {
        cancelled(signal); const value = await translate(chunk.trim()); cancelled(signal);
        if (typeof value !== "string" || !value.trim()) throw Error("翻译结果为空，请重试。"); result.push(value.trim());
    }
    return prefix + result.join(direction === "zh-en" ? " " : "") + suffix;
}
export async function translateMarkdown(markdown: string, translate: TranslateText, direction: TranslationDirection, options: { signal?: AbortSignal; progress?: (done: number, total: number) => void } = {}) {
    const units = translationUnits(markdown).filter(unit => unit.leaves.some(leaf => translatable(leaf.text, direction)));
    let prefix = "EZKEEP"; while (markdown.includes(prefix)) prefix += "X";
    function renderLeaf(leaf: Leaf, value: string) {
        const leading = leaf.text.match(/^\s*/)?.[0] || "", trailing = leaf.text.match(/\s*$/)?.[0] || "", text = value.trim();
        const before = markdown.slice(Math.max(0, leaf.start - 1), leaf.start), after = markdown.slice(leaf.end, leaf.end + 1);
        const spaceBefore = direction === "zh-en" && !leading && !leaf.opening && /[`*_~)\]]/.test(before) && /^[A-Za-z0-9]/.test(text);
        const spaceAfter = direction === "zh-en" && !trailing && !leaf.closing && /[`*_~\[]/.test(after) && /[A-Za-z0-9.,;:!?]$/.test(text);
        return leading + (spaceBefore ? " " : "") + escapeText(text) + (spaceAfter ? " " : "") + trailing;
    }
    const replacements: { start: number; end: number; value: string }[] = [];
    for (let index = 0; index < units.length; index++) {
        cancelled(options.signal); const unit = units[index];
        const keep: string[] = [], markers: string[] = []; let input = "";
        unit.leaves.forEach((leaf, position) => {
            if (position) { const marker = "ZXQ" + prefix + position + "QXZ"; markers.push(marker); keep.push(markdown.slice(unit.leaves[position - 1].end, leaf.start)); input += marker; }
            input += leaf.text;
        });
        let output: string | null = null;
        if (input.length <= 1200) {
            const value = await plain(input, translate, direction, options.signal);
            const found = [...value.matchAll(new RegExp("ZXQ" + prefix + "\\d+QXZ", "g"))].map(match => match[0]);
            const pieces = value.split(new RegExp("ZXQ" + prefix + "\\d+QXZ", "g"));
            if (JSON.stringify(found) === JSON.stringify(markers) && pieces.every((piece, position) => !unit.leaves[position].text.trim() || piece.trim())) {
                output = pieces.map((piece, position) => renderLeaf(unit.leaves[position], piece) + (keep[position] || "")).join("");
            }
        }
        if (output === null) {
            output = "";
            for (let position = 0; position < unit.leaves.length; position++) {
                const leaf = unit.leaves[position], value = await plain(leaf.text, translate, direction, options.signal);
                if (position) output += markdown.slice(unit.leaves[position - 1].end, leaf.start);
                output += renderLeaf(leaf, value);
            }
        }
        replacements.push({ start: unit.start, end: unit.end, value: output }); options.progress?.(index + 1, units.length);
    }
    let result = markdown;
    for (const item of replacements.reverse()) result = result.slice(0, item.start) + item.value + result.slice(item.end);
    cancelled(options.signal); return result;
}
export async function translateArticle(source: TranslationFields, translate: TranslateText, direction: TranslationDirection, options: { signal?: AbortSignal; progress?: (message: string) => void } = {}): Promise<TranslationFields> {
    options.progress?.("正在翻译标题…"); const title = await plain(source.title, translate, direction, options.signal);
    options.progress?.("正在翻译摘要…"); const summary = await plain(source.summary, translate, direction, options.signal);
    options.progress?.("正在分析正文格式…"); const body = await translateMarkdown(source.body, translate, direction, { signal: options.signal, progress: (done, total) => options.progress?.(`正在翻译正文 ${done} / ${total}…`) });
    return { title, summary, body };
}
