import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { copyText } from "@/lib/clipboard";
import { emphasisLines, highlightLines } from "@/lib/highlight";
export default function CodeBlock({ code, language, meta = "", lang, searchQuery = "" }: { code: string; language: string; meta?: string; searchQuery?: string; lang: "zh" | "en" }) {
    const [copied, setCopied] = useState(false), [failed, setFailed] = useState(false), [numbers, setNumbers] = useState(false), [expanded, setExpanded] = useState(false);
    const [highlighted, setHighlighted] = useState<string[] | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null), lines = code.split("\n"), emphasis = emphasisLines(meta, lines.length);
    const folded = lines.length > 24 && !expanded, visible = folded ? lines.slice(0, 12) : lines;
    const t = (zh: string, en: string) => lang === "zh" ? zh : en;
    useEffect(() => { if (searchQuery && code.toLowerCase().includes(searchQuery.toLowerCase())) setExpanded(true); }, [searchQuery, code]);
    useEffect(() => {
        let active = true; setHighlighted(null);
        highlightLines(code, language).then(value => { if (active) setHighlighted(value); }).catch(() => {});
        return () => { active = false; };
    }, [code, language]);
    useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
    return <div className={"code-block enhanced-code" + (numbers ? " with-numbers" : "")}><div className="code-header"><span>{language}<small>{lines.length} {t("行", "lines")}</small></span><div className="code-tools"><button aria-pressed={numbers} onClick={() => setNumbers(value => !value)}>{t("行号", "Line numbers")}</button><button aria-label={t("复制代码", "Copy code")} onClick={async () => {
        try { await copyText(code); setCopied(true); setFailed(false); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setCopied(false), 1600); }
        catch { setCopied(false); setFailed(true); }
    }}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? t("已复制", "Copied") : t("复制", "Copy")}</button></div></div>{failed && <p className="copy-feedback" role="status">{t("复制未成功，请选中代码手动复制。", "Copy failed. Select the code and copy it manually.")}</p>}<pre tabIndex={0} aria-label={t("代码", "Code")}><code>{visible.map((line, index) => <span className={"code-line" + (emphasis.has(index + 1) ? " emphasized-line" : "")} data-line={index + 1} key={index}>{highlighted ? <span dangerouslySetInnerHTML={{ __html: highlighted[index] || " " }} /> : line || " "}</span>)}</code></pre>{lines.length > 24 && <button className="code-expand" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{folded ? t(`展开剩余 ${lines.length - 12} 行`, `Show ${lines.length - 12} more lines`) : t("折叠代码", "Collapse code")}</button>}</div>;
}
