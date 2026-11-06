import { useEffect, useRef } from "react";
import { BookOpen, Check, ChevronRight } from "lucide-react";
import type { Entry } from "@/lib/content";
import type { ReadingData, ReadingRecord } from "@/lib/reading";
import type { Heading } from "@/components/article-toc";

type Group = { id: string; title: string; enTitle?: string; chapters: Entry[] };
export function ContinueReading({ group, records, lang, open, available }: { group: Group; records: ReadingData; lang: "zh" | "en"; open: (path: string) => void; available: boolean }) {
    const t = (zh: string, en: string) => lang === "zh" ? zh : en;
    const visited = group.chapters.filter(entry => records[entry.id]?.seriesId === group.id).sort((a, b) => records[b.id].visitedAt - records[a.id].visitedAt);
    const last = visited[0];
    const completed = group.chapters.filter(entry => records[entry.id]?.completed && records[entry.id].seriesId === group.id).length;
    const completedChapter = (entry: Entry) => records[entry.id]?.seriesId === group.id && records[entry.id]?.completed;
    const target = last && !completedChapter(last) ? last : group.chapters.find(entry => !completedChapter(entry)) || last || group.chapters[0];
    if (!target) return null;
    const href = "/entry/" + target.id + (records[target.id]?.heading && !completedChapter(target) ? "?resume=1" : "");
    return <section className="reading-progress"><div className="reading-progress-heading"><BookOpen size={18} /><div><h2>{lang === "en" && group.enTitle ? group.enTitle : group.title}</h2><p>{completed} / {group.chapters.length} {t("章已读", "chapters completed")}</p></div></div><progress value={completed} max={group.chapters.length} aria-label={t("专栏已读章节", "Completed chapters")} /><a className="primary-button" href={href} onClick={event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); open(href); }}>{last ? completed === group.chapters.length ? t("重新阅读", "Read again") : t("继续阅读", "Continue reading") : t("开始阅读", "Start reading")}<ChevronRight size={15} /></a><p>{lang === "en" && target.enTitle ? target.enTitle : target.title}</p><small>{available ? t("进度仅保存在当前浏览器；章节由你手动标记已读。", "Progress stays in this browser. Mark chapters complete yourself.") : t("浏览器未允许保存，当前进度只在本页会话中保留。", "Storage is unavailable. Progress lasts for this page session.")}</small></section>;
}

export default function ReadingTools({ entry, record, headings, lang, available, remember }: { entry: Entry; record?: ReadingRecord; headings: Heading[]; lang: "zh" | "en"; available: boolean; remember: (id: string, seriesId: string, change?: Partial<ReadingRecord>) => void }) {
    const t = (zh: string, en: string) => lang === "zh" ? zh : en;
    const initial = useRef(record), resumed = useRef(false);
    useEffect(() => {
        if (!entry.series) return;
        remember(entry.id, entry.series.id);
        let timer: ReturnType<typeof setTimeout> | undefined;
        const save = () => {
            const top = (document.querySelector(".site-header")?.getBoundingClientRect().height || 140) + 40;
            const nodes = [...document.querySelectorAll<HTMLElement>(".detail .prose h2, .detail .prose h3, .detail .prose h4")];
            const node = nodes.filter(node => node.getBoundingClientRect().top <= top).at(-1);
            if (node?.id) remember(entry.id, entry.series!.id, { heading: node.id, headingText: (node.textContent || "").slice(0, 500) });
        };
        const scroll = () => { clearTimeout(timer); timer = setTimeout(save, 300); };
        const flush = () => { if (timer) { clearTimeout(timer); timer = undefined; save(); } };
        window.addEventListener("scroll", scroll, { passive: true });
        window.addEventListener("pagehide", flush);
        return () => { clearTimeout(timer); window.removeEventListener("scroll", scroll); window.removeEventListener("pagehide", flush); };
    }, [entry.id, entry.series?.id, remember]);
    function resume() {
        const saved = initial.current;
        const heading = headings.find(value => value.text === saved?.headingText) || headings.find(value => value.id === saved?.heading);
        const target = heading && document.getElementById(heading.id);
        if (!target) return false;
        target.scrollIntoView({ block: "start", behavior: "instant" });
        target.focus({ preventScroll: true });
        const url = new URL(window.location.href); url.searchParams.delete("resume"); url.hash = heading.id;
        window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
        return true;
    }
    useEffect(() => {
        if (resumed.current || !headings.length || new URLSearchParams(window.location.search).get("resume") !== "1" || window.location.hash || new URLSearchParams(window.location.search).has("q")) return;
        const frame = requestAnimationFrame(() => { if (resume()) resumed.current = true; });
        return () => cancelAnimationFrame(frame);
    }, [headings]);
    return <section className="reading-tools"><div><strong>{record?.completed ? t("本章已读", "Chapter completed") : t("读完这一章后，可以手动标记。", "Mark this chapter complete when you finish.")}</strong><small>{available ? t("阅读位置与已读状态仅保存在当前浏览器。", "Position and completion stay in this browser.") : t("浏览器无法保存进度，关闭页面后不会保留。", "Progress cannot be saved beyond this page session.")}</small></div><div>{initial.current?.heading && <button onClick={resume}>{t("回到上次位置", "Resume position")}</button>}<button aria-pressed={!!record?.completed} onClick={() => remember(entry.id, entry.series!.id, { completed: !record?.completed })}><Check size={15} />{record?.completed ? t("取消已读", "Mark unread") : t("标记本章已读", "Mark complete")}</button></div></section>;
}
