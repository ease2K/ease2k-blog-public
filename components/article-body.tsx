import { Component, lazy, Suspense, useEffect } from "react";
import type { OutlineHandler } from "@/components/article-toc";

type Props = { text: string; lang: "zh" | "en"; onOutline?: OutlineHandler };
let pending: ReturnType<typeof importMarkdown> | undefined;
function importMarkdown() { return import("@/components/markdown-body"); }
function loadMarkdown() {
    return pending ||= importMarkdown().catch(error => { pending = undefined; throw error; });
}
const MarkdownBody = lazy(loadMarkdown);
export function preloadBody() { void loadMarkdown().catch(() => {}); }
function plainText(text: string) {
    return !/[`*_~\[\]<>#$|\\&@]/.test(text)
        && !/(^|\n)(?:\s*(?:[-+]\s|\d+[.)]\s|[-=]{3,}\s*$)| {4}|\t)|https?:\/\/|www\./im.test(text);
}
function PlainBody({ text, onOutline }: Props) {
    useEffect(() => { onOutline?.([], ""); }, [text, onOutline]);
    return <div className="prose">{text.split(/\n[ \t]*\n/).filter(part => part.trim()).map((part, index) => <p key={index} style={{ whiteSpace: "pre-wrap" }}>{part}</p>)}</div>;
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
    if (plainText(props.text)) return <PlainBody {...props} />;
    return <BodyBoundary {...props}><Suspense fallback={<PlainBody {...props} />}><MarkdownBody {...props} /></Suspense></BodyBoundary>;
}
