"use client";

import { List } from "lucide-react";

export type Heading = { id: string; text: string; level: number };
export type OutlineHandler = (headings: Heading[], activeId: string) => void;

export default function ArticleToc({ headings, activeId, lang, compact = false }: { headings: Heading[]; activeId: string; lang: "zh" | "en"; compact?: boolean }) {
    if (headings.length < 2) return null;
    const label = lang === "zh" ? "文章目录" : "On this page";
    const links = <ol>{headings.map(heading => <li key={heading.id} className={"toc-level-" + heading.level}>
        <a href={"#" + heading.id} aria-current={activeId === heading.id ? "location" : undefined} onClick={event => {
            event.preventDefault();
            const target = document.getElementById(heading.id);
            if (!target) return;
            window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search + "#" + heading.id);
            target.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
            target.focus({ preventScroll: true });
        }}>{heading.text}</a>
    </li>)}</ol>;
    return compact ? <details className="article-toc-mobile"><summary><List size={17} />{label}<span>{headings.length} {lang === "zh" ? "节" : "sections"}</span></summary><nav aria-label={label}>{links}</nav></details> : <nav className="article-toc" aria-label={label}><h3><List size={17} />{label}</h3>{links}</nav>;
}
