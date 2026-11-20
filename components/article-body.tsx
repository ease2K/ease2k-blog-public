import { Component, lazy, Suspense, useEffect, useRef } from "react";
import type { OutlineHandler } from "@/components/article-toc";

type Props = { text: string; lang: "zh" | "en"; onOutline?: OutlineHandler; owner?: boolean; searchQuery?: string };
type MarkdownModule = typeof import("@/components/markdown-body");
let pending: Promise<MarkdownModule> | undefined;
let loaded: MarkdownModule | undefined;
function loadMarkdown() {
    return pending ||= import("@/components/markdown-body").then(module => {
        loaded = module;
        return module;
    }).catch(error => { pending = undefined; throw error; });
}
const LazyMarkdown = lazy(loadMarkdown);

export function bodyFormat(text: string) {
    if (!/[`*_~\[\]<>#$|\\&@]/.test(text)
        && !/(^|\n)(?:\s*(?:[-+]\s|\d+[.)]\s|[-=]{3,}\s*$)| {4}|\t)|https?:\/\/|www\./im.test(text)) return "plain";
    return /\$\$|(^|[^\\])\$(?=\S)[^\n]*[^\\]\$/.test(text) ? "math" : "markdown";
}

export async function prepareBody(format: ReturnType<typeof bodyFormat>) {
    if (format === "plain") return;
    const markdown = await loadMarkdown();
    if (format === "math") await markdown.prepareMath();
}
export function preloadBody() { void loadMarkdown().catch(() => {}); }
function PlainBody({ text, onOutline }: Props) {
    useEffect(() => { onOutline?.([], ""); }, [text, onOutline]);
    return <div className="prose" data-reading-ready="true">{text.split(/\n[ \t]*\n/).filter(part => part.trim()).map((part, index) => <p key={index} style={{ whiteSpace: "pre-wrap" }}>{part}</p>)}</div>;
}
class BodyBoundary extends Component<Props & { children: React.ReactNode }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidUpdate(previous: Props) {
        if (this.state.failed && (previous.text !== this.props.text || previous.lang !== this.props.lang)) this.setState({ failed: false });
    }
    render() {
        if (!this.state.failed) return this.props.children;
        return <><PlainBody {...this.props} /><p className="language-note" role="status">{this.props.lang === "zh" ? "正文已显示，排版暂未加载。" : "The text is available; formatting could not load."}<button className="body-retry" onClick={() => window.location.reload()}>{this.props.lang === "zh" ? "刷新重试" : "Reload"}</button></p></>;
    }
}
export default function ArticleBody(props: Props) {
    const MarkdownBody = useRef(loaded?.default || LazyMarkdown).current;
    const format = bodyFormat(props.text);
    if (format === "plain") return <PlainBody {...props} />;
    return <BodyBoundary {...props}>
        <Suspense fallback={<p className="language-note" role="status">{props.lang === "zh" ? "正在排版正文…" : "Formatting article…"}</p>}>
            <MarkdownBody {...props} needsMath={format === "math"} />
        </Suspense>
    </BodyBoundary>;
}
