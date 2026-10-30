import { Children, isValidElement, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ArticleToc, { type Heading, type OutlineHandler } from "@/components/article-toc";
import { copyText } from "@/lib/clipboard";

type Lang = "zh" | "en";
type MathPlugins = typeof import("@/lib/math-plugins");
let mathRequest: Promise<MathPlugins> | undefined;
function loadMath() { return mathRequest ||= import("@/lib/math-plugins").catch(error => { mathRequest = undefined; throw error; }); }
function CodeBlock({ code, language, lang }: { code: string; language: string; lang: Lang }) {
    const [copied, setCopied] = useState(false), [failed, setFailed] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
    return <div className="code-block"><div className="code-header"><span>{language}</span><button aria-label={lang === "zh" ? "复制代码" : "Copy code"} onClick={async () => {
        try { await copyText(code); setCopied(true); setFailed(false); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setCopied(false), 1600); }
        catch { setCopied(false); setFailed(true); }
    }}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? (lang === "zh" ? "已复制" : "Copied") : (lang === "zh" ? "复制" : "Copy")}</button></div>{failed && <p className="copy-feedback" role="status">{lang === "zh" ? "复制未成功，请选中代码手动复制。" : "Copy failed. Select the code and copy it manually."}</p>}<pre tabIndex={0} aria-label={lang === "zh" ? "代码" : "Code"}><code>{code}</code></pre></div>;
}

export default function MarkdownBody({ text, lang, onOutline }: { text: string; lang: Lang; onOutline?: OutlineHandler }) {
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
    const markdown = useMemo(() => <Markdown skipHtml remarkPlugins={needsMath && math ? [remarkGfm, math.remarkMath] : [remarkGfm]} rehypePlugins={needsMath && math ? [[math.rehypeKatex, { trust: false, strict: "ignore" }]] : []} components={{
        h1: ({ children }) => <h2>{children}</h2>,
        a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
        table: ({ children }) => <div className="prose-table" role="region" aria-label={lang === "zh" ? "操作与用法表格" : "Reference table"} tabIndex={0}><table>{children}</table></div>,
        pre: ({ children }) => {
            const child = Children.toArray(children)[0];
            if (!isValidElement<{ children?: ReactNode; className?: string }>(child)) return <pre>{children}</pre>;
            const language = /language-([^\s]+)/.exec(child.props.className || "")?.[1] || "text";
            return <CodeBlock code={String(child.props.children || "").replace(/\n$/, "")} language={language} lang={lang} />;
        },
    }}>{text.replace(/^# [^\n]+\r?\n/, "")}</Markdown>, [text, lang, needsMath, math]);
    return <>{mathFailed && <p className="language-note" role="status">{lang === "zh" ? "公式排版暂未加载，已显示原始公式。" : "Math formatting could not load; the source formula is shown."}</p>}<ArticleToc headings={headings} activeId={activeId} lang={lang} compact /><div className="prose" ref={content}>{markdown}</div></>;
}
