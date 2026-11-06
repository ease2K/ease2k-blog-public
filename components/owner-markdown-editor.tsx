import { useDeferredValue, useState, type ReactNode } from "react";
import ArticleBody from "@/components/article-body";

type Mode = "edit" | "split" | "preview";
export default function OwnerMarkdownEditor({ text, lang, children }: { text: string; lang: "zh" | "en"; children: ReactNode }) {
    const [mode, setMode] = useState<Mode>("split");
    const preview = useDeferredValue(text);
    return <section className="owner-markdown-editor" aria-label={lang === "zh" ? "中文正文编辑器" : "英文正文编辑器"}>
        <div className="owner-markdown-toolbar">
            <div role="group" aria-label="正文显示模式">{([["edit", "仅编辑"], ["split", "实时预览"], ["preview", "仅预览"]] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={mode === key} onClick={() => setMode(key)}>{label}</button>)}</div>
            <span>修改正文后自动更新预览</span>
        </div>
        <div className={"owner-markdown-panes owner-markdown-" + mode}>
            <div className="owner-markdown-source" hidden={mode === "preview"}><p className="owner-markdown-caption">Markdown 源码</p>{children}</div>
            {mode !== "edit" && <section className="owner-markdown-rendered" aria-label="正文实时预览" aria-busy={preview !== text}><p className="owner-markdown-caption">排版预览</p><div className="owner-preview">{preview.trim() ? <ArticleBody text={preview} lang={lang} owner /> : <p className="owner-markdown-empty">在编辑区输入 Markdown，标题、代码、公式和图片会显示在这里。</p>}</div></section>}
        </div>
    </section>;
}
