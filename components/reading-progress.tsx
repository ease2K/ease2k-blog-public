import { BookOpen, ChevronRight } from "lucide-react";
import type { Entry } from "@/lib/content";
import type { ReadingData } from "@/lib/reading";

type Group = { id: string; title: string; enTitle?: string; chapters: Entry[] };
export function RecentReading({ entries, groups, records, lang, open, available }: { entries: Entry[]; groups: Group[]; records: ReadingData; lang: "zh" | "en"; open: (path: string) => void; available: boolean }) {
    const last = entries.filter(entry => records[entry.id]?.seriesId === (entry.series?.id || "") && (!records[entry.id].completed || !!entry.series)).sort((a, b) => records[b.id].visitedAt - records[a.id].visitedAt)[0];
    if (!last) return null;
    const group = groups.find(group => group.id === last.series?.id);
    if (group) return <ContinueReading group={group} records={records} lang={lang} open={open} available={available} compact />;
    const href = "/entry/" + last.id + "?resume=1", percent = Math.round((records[last.id].progress || 0) * 100);
    return <section className="reading-progress reading-progress-compact">
        <div className="reading-progress-heading"><BookOpen size={18} /><div><h2>{lang === "zh" ? "继续上次阅读" : "Pick up where you left off"}</h2><p>{lang === "en" && last.enTitle ? last.enTitle : last.title} · {percent}%</p></div></div>
        <progress value={percent} max={100} aria-label={lang === "zh" ? "文章阅读进度" : "Article reading progress"} />
        <a className="primary-button" href={href} onClick={event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); open(href); }}>{lang === "zh" ? "继续阅读" : "Resume"}<ChevronRight size={15} /></a>
        {!available && <small>{lang === "zh" ? "浏览器无法保存，当前进度仅在本页会话中保留。" : "Storage is unavailable. Progress lasts for this page session."}</small>}
    </section>;
}

export function ContinueReading({ group, records, lang, open, available, compact = false }: { group: Group; records: ReadingData; lang: "zh" | "en"; open: (path: string) => void; available: boolean; compact?: boolean }) {
    const t = (zh: string, en: string) => lang === "zh" ? zh : en;
    const visited = group.chapters.filter(entry => records[entry.id]?.seriesId === group.id).sort((a, b) => records[b.id].visitedAt - records[a.id].visitedAt);
    const last = visited[0];
    const completed = group.chapters.filter(entry => records[entry.id]?.completed && records[entry.id].seriesId === group.id).length;
    const completedChapter = (entry: Entry) => records[entry.id]?.seriesId === group.id && records[entry.id]?.completed;
    const target = last && !completedChapter(last) ? last : group.chapters.find(entry => !completedChapter(entry)) || last || group.chapters[0];
    if (!target) return null;
    const href = "/entry/" + target.id + ((records[target.id]?.heading || records[target.id]?.position) && !completedChapter(target) ? "?resume=1" : "");
    const targetTitle = lang === "en" && target.enTitle ? target.enTitle : target.title;
    const progressLabel = completed + " / " + group.chapters.length + " " + t("章已读", "chapters completed");
    return <section className={"reading-progress" + (compact ? " reading-progress-compact" : "")}>
        <div className="reading-progress-heading">
            <BookOpen size={18} />
            <div><h2>{lang === "en" && group.enTitle ? group.enTitle : group.title}</h2><p>{compact ? targetTitle : progressLabel}</p></div>
        </div>
        <progress value={completed} max={group.chapters.length} aria-label={t("专栏已读章节", "Completed chapters")} aria-valuetext={progressLabel} />
        <a className="primary-button" href={href} onClick={event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); open(href); }}>{last ? completed === group.chapters.length ? t("重新阅读", "Read again") : t("继续阅读", compact ? "Resume" : "Continue reading") : t("开始阅读", "Start reading")}<ChevronRight size={15} /></a>
        {!compact && <p>{targetTitle}</p>}
        {(!compact || !available) && <small>{available ? t("自动记录阅读位置，读到末尾并停留后标记已读；仅保存在当前浏览器。", "Position and completion are recorded automatically in this browser.") : t("浏览器未允许保存，当前进度只在本页会话中保留。", "Storage is unavailable. Progress lasts for this page session.")}</small>}
    </section>;
}
