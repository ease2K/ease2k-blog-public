import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, X } from "lucide-react";

export function HitText({ text, query }: { text: string; query: string }) {
    const value = query.trim().toLowerCase().slice(0, 200), parts: React.ReactNode[] = [];
    if (!value) return <>{text}</>;
    let start = 0, index = text.toLowerCase().indexOf(value);
    while (index >= 0) { parts.push(text.slice(start, index), <mark key={index}>{text.slice(index, index + value.length)}</mark>); start = index + value.length; index = text.toLowerCase().indexOf(value, start); }
    parts.push(text.slice(start)); return <>{parts}</>;
}
export default function ArticleSearch({ query, lang, clear, exampleMatch = false }: { query: string; lang: "zh" | "en"; clear: () => void; exampleMatch?: boolean }) {
    const root = useRef<HTMLElement>(null), ranges = useRef<Range[]>([]), position = useRef(0);
    const [count, setCount] = useState(0), [current, setCurrent] = useState(0);
    const t = (zh: string, en: string) => lang === "zh" ? zh : en;
    function locate(index: number) {
        const range = ranges.current[index]; if (!range) return;
        position.current = index; setCurrent(index + 1);
        const rectangle = range.getBoundingClientRect();
        window.scrollTo({ top: Math.max(0, rectangle.top + window.scrollY - (document.querySelector(".site-header")?.getBoundingClientRect().height || 142) - (root.current?.offsetHeight || 50) - 25), behavior: "instant" });
        const pre = range.startContainer.parentElement?.closest("pre");
        if (pre) { const bounds = pre.getBoundingClientRect(); if (rectangle.left < bounds.left || rectangle.right > bounds.right) pre.scrollLeft += rectangle.left - bounds.left - 24; }
        if (!CSS.highlights) { const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range); }
    }
    useEffect(() => {
        const article = root.current?.closest(".detail"), value = query.trim().toLowerCase(); if (!article || !value) return;
        let frame = 0, jumped = false;
        function scan() {
            const matches: Range[] = [];
            for (const unit of article!.querySelectorAll(".detail > .tags,h1,.detail-summary,.prose p,.prose li,.prose h2,.prose h3,.prose h4,.code-line")) {
                if (unit.matches("li") && unit.querySelector("p,li")) continue;
                const walker = document.createTreeWalker(unit, NodeFilter.SHOW_TEXT), nodes: Text[] = [];
                while (walker.nextNode()) if (!walker.currentNode.parentElement?.closest("button,textarea")) nodes.push(walker.currentNode as Text);
                const text = nodes.map(node => node.data).join("").toLowerCase();
                function at(offset: number): [Text, number] { for (const node of nodes) { if (offset <= node.length) return [node, offset]; offset -= node.length; } return [nodes.at(-1)!, nodes.at(-1)!.length]; }
                for (let index = text.indexOf(value); index >= 0 && matches.length < 500; index = text.indexOf(value, index + value.length)) {
                    const range = document.createRange(); range.setStart(...at(index)); range.setEnd(...at(index + value.length)); matches.push(range);
                }
                if (matches.length >= 500) break;
            }
            ranges.current = matches; setCount(matches.length);
            if (CSS.highlights && typeof Highlight !== "undefined") CSS.highlights.set("blog-search", new Highlight(...matches));
            if (matches.length) { setCurrent(Math.min(position.current + 1, matches.length)); if (!jumped) { jumped = true; locate(0); } } else setCurrent(0);
        }
        const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(scan); };
        const header = document.querySelector(".site-header");
        const resize = new ResizeObserver(() => { if (root.current && header) root.current.style.top = header.getBoundingClientRect().height + 8 + "px"; });
        if (header) resize.observe(header);
        const observer = new MutationObserver(schedule); observer.observe(article, { subtree: true, childList: true, characterData: true }); schedule();
        return () => { resize.disconnect(); observer.disconnect(); cancelAnimationFrame(frame); CSS.highlights?.delete("blog-search"); ranges.current = []; };
    }, [query, lang]);
    return <aside ref={root} className="article-search-bar" aria-label={t("文章内搜索", "Find in article")}><span>{t("搜索", "Find")}: <strong>{query}</strong></span><span role="status">{count ? `${current} / ${count}${count >= 500 ? "+" : ""}` : exampleMatch ? t("关键词位于在线示例", "Match in the interactive example") : t("匹配可能来自标签或另一语言版本", "Match may be in tags or the other language")}</span><div><button disabled={!count} aria-label={t("上一处匹配", "Previous match")} onClick={() => locate((position.current - 1 + count) % count)}><ArrowUp size={15} /></button><button disabled={!count} aria-label={t("下一处匹配", "Next match")} onClick={() => locate((position.current + 1) % count)}><ArrowDown size={15} /></button><button aria-label={t("清除搜索定位", "Clear search highlights")} onClick={clear}><X size={15} /></button></div></aside>;
}
