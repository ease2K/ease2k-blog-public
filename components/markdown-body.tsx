import { Children, isValidElement, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ArticleToc, { type Heading, type OutlineHandler } from "@/components/article-toc";
import CodeBlock from "@/components/code-block";

type Lang = "zh" | "en";
type MathPlugins = typeof import("@/lib/math-plugins");
let mathRequest: Promise<MathPlugins> | undefined;
function loadMath() { return mathRequest ||= import("@/lib/math-plugins").catch(error => { mathRequest = undefined; throw error; }); }
function codeMetadata() {
    return (tree: { type?: string; meta?: string; data?: Record<string, unknown>; children?: unknown[] }) => {
        function visit(node: typeof tree) {
            if (node.type === "code" && node.meta) node.data = { ...node.data, hProperties: { "data-code-meta": node.meta } };
            for (const child of node.children || []) visit(child as typeof tree);
        }
        visit(tree);
    };
}

export default function MarkdownBody({ text, lang, onOutline, owner = false }: { text: string; lang: Lang; onOutline?: OutlineHandler; owner?: boolean }) {
    const content = useRef<HTMLDivElement>(null);
    const needsMath = /\$\$|(^|[^\\])\$(?=\S)[^\n]*[^\\]\$/.test(text);
    const [math, setMath] = useState<MathPlugins | null>(null), [mathFailed, setMathFailed] = useState(false);
    useEffect(() => {
        if (!needsMath || math) return;
        let active = true;
        setMathFailed(false);
        loadMath().then(value => { if (active) setMath(value); }).catch(() => { if (active) setMathFailed(true); });
        return () => { active = false; };
    }, [text, needsMath, math]);
    const [headings, setHeadings] = useState<Heading[]>([]), [activeId, setActiveId] = useState("");
    useEffect(() => {
        const nodes = Array.from(content.current?.querySelectorAll<HTMLElement>("h2, h3, h4") || []);
        const items = nodes.map((node, index) => {
            node.id = "section-" + (index + 1);
            node.tabIndex = -1;
            return { id: node.id, text: node.textContent || "", level: Number(node.tagName[1]) };
        });
        setHeadings(items);
        let current = "", frame = 0;
        function update() {
            frame = 0;
            const top = (document.querySelector(".site-header")?.getBoundingClientRect().height || 140) + 30;
            const active = nodes.filter(node => node.getBoundingClientRect().top <= top).at(-1)?.id || nodes[0]?.id || "";
            if (active !== current) { current = active; setActiveId(active); onOutline?.(items, active); }
        }
        function schedule() { if (!frame) frame = requestAnimationFrame(update); }
        const hash = window.location.hash.slice(1);
        if (nodes.some(node => node.id === hash)) document.getElementById(hash)?.scrollIntoView({ block: "start", behavior: "instant" });
        update();
        if (!nodes.length) { setActiveId(""); onOutline?.([], ""); }
        window.addEventListener("scroll", schedule, { passive: true });
        window.addEventListener("resize", schedule);
        return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
    }, [text, lang, onOutline, math]);
    const markdown = useMemo(() => <Markdown skipHtml remarkPlugins={needsMath && math ? [remarkGfm, codeMetadata, math.remarkMath] : [remarkGfm, codeMetadata]} rehypePlugins={needsMath && math ? [[math.rehypeKatex, { trust: false, strict: "ignore" }]] : []} components={{
        img: ({ src, alt }) => <img src={owner && src?.startsWith("/media/") ? "/api/owner" + src : src} alt={alt || ""} loading="lazy" decoding="async" />,
        h1: ({ children }) => <h2>{children}</h2>,
        a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
        table: ({ children }) => <div className="prose-table" role="region" aria-label={lang === "zh" ? "操作与用法表格" : "Reference table"} tabIndex={0}><table>{children}</table></div>,
        pre: ({ children }) => {
            const child = Children.toArray(children)[0];
            if (!isValidElement<{ children?: ReactNode; className?: string; "data-code-meta"?: string }>(child)) return <pre>{children}</pre>;
            const language = /language-([^\s]+)/.exec(child.props.className || "")?.[1] || "text";
            return <CodeBlock code={String(child.props.children || "").replace(/\n$/, "")} language={language} meta={child.props["data-code-meta"] || ""} lang={lang} />;
        },
    }}>{text.replace(/^# [^\n]+\r?\n/, "")}</Markdown>, [text, lang, needsMath, math, owner]);
    return <>{mathFailed && <p className="language-note" role="status">{lang === "zh" ? "公式排版暂未加载，已显示原始公式。" : "Math formatting could not load; the source formula is shown."}</p>}<ArticleToc headings={headings} activeId={activeId} lang={lang} compact /><div className="prose" ref={content}>{markdown}</div></>;
}
