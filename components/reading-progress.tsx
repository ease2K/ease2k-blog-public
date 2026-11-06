import { useEffect, useRef, useState } from "react";
import { BookOpen, Check, ChevronRight } from "lucide-react";
import type { Entry } from "@/lib/content";
import type { ReadingData, ReadingRecord } from "@/lib/reading";

type Group = { id: string; title: string; enTitle?: string; chapters: Entry[] };
export function RecentReading({ entries, groups, records, lang, open, available }: { entries: Entry[]; groups: Group[]; records: ReadingData; lang: "zh" | "en"; open: (path: string) => void; available: boolean }) {
    const last = entries.filter(entry => records[entry.id]?.seriesId === (entry.series?.id || "") && (!records[entry.id].completed || !!entry.series)).sort((a, b) => records[b.id].visitedAt - records[a.id].visitedAt)[0];
    if (!last) return null;
    const group = groups.find(group => group.id === last.series?.id);
    if (group) return <ContinueReading group={group} records={records} lang={lang} open={open} available={available} />;
    const href = "/entry/" + last.id + "?resume=1", percent = Math.round((records[last.id].progress || 0) * 100);
    return <section className="reading-progress"><div className="reading-progress-heading"><BookOpen size={18} /><div><h2>{lang === "zh" ? "继续上次阅读" : "Pick up where you left off"}</h2><p>{lang === "en" && last.enTitle ? last.enTitle : last.title} · {percent}%</p></div></div><progress value={percent} max={100} aria-label={lang === "zh" ? "文章阅读进度" : "Article reading progress"} /><a className="primary-button" href={href} onClick={event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); open(href); }}>{lang === "zh" ? "继续阅读" : "Continue reading"}<ChevronRight size={15} /></a><small>{available ? lang === "zh" ? "阅读位置自动保存在当前浏览器。" : "Your position is saved automatically in this browser." : lang === "zh" ? "浏览器无法保存，当前进度仅在本页会话中保留。" : "Storage is unavailable. Progress lasts for this page session."}</small></section>;
}

export function ContinueReading({ group, records, lang, open, available }: { group: Group; records: ReadingData; lang: "zh" | "en"; open: (path: string) => void; available: boolean }) {
    const t = (zh: string, en: string) => lang === "zh" ? zh : en;
    const visited = group.chapters.filter(entry => records[entry.id]?.seriesId === group.id).sort((a, b) => records[b.id].visitedAt - records[a.id].visitedAt);
    const last = visited[0];
    const completed = group.chapters.filter(entry => records[entry.id]?.completed && records[entry.id].seriesId === group.id).length;
    const completedChapter = (entry: Entry) => records[entry.id]?.seriesId === group.id && records[entry.id]?.completed;
    const target = last && !completedChapter(last) ? last : group.chapters.find(entry => !completedChapter(entry)) || last || group.chapters[0];
    if (!target) return null;
    const href = "/entry/" + target.id + ((records[target.id]?.heading || records[target.id]?.position) && !completedChapter(target) ? "?resume=1" : "");
    return <section className="reading-progress"><div className="reading-progress-heading"><BookOpen size={18} /><div><h2>{lang === "en" && group.enTitle ? group.enTitle : group.title}</h2><p>{completed} / {group.chapters.length} {t("章已读", "chapters completed")}</p></div></div><progress value={completed} max={group.chapters.length} aria-label={t("专栏已读章节", "Completed chapters")} /><a className="primary-button" href={href} onClick={event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); open(href); }}>{last ? completed === group.chapters.length ? t("重新阅读", "Read again") : t("继续阅读", "Continue reading") : t("开始阅读", "Start reading")}<ChevronRight size={15} /></a><p>{lang === "en" && target.enTitle ? target.enTitle : target.title}</p><small>{available ? t("自动记录阅读位置，读到末尾并停留后标记已读；仅保存在当前浏览器。", "Position and completion are recorded automatically in this browser.") : t("浏览器未允许保存，当前进度只在本页会话中保留。", "Storage is unavailable. Progress lasts for this page session.")}</small></section>;
}

export default function ReadingTools({ entry, record, lang, available, remember }: { entry: Entry; record?: ReadingRecord; lang: "zh" | "en"; available: boolean; remember: (id: string, seriesId: string, change?: Partial<ReadingRecord>) => void }) {
    const t = (zh: string, en: string) => lang === "zh" ? zh : en;
    const initial = useRef(record?.seriesId === (entry.series?.id || "") ? record : undefined), actions = useRef<{ resume: () => boolean; restart: () => void }>({ resume: () => false, restart: () => {} });
    const [tracking, setTracking] = useState(false);
    useEffect(() => {
        const article = document.querySelector<HTMLElement>(".detail");
        if (!article) return;
        const seriesId = entry.series?.id || "", saved = initial.current;
        let body: HTMLElement | null = null, initialized = false, starting = false, disposed = false, interacted = false, completed = !!saved?.completed, frame = 0;
        const restoration = window.history.scrollRestoration;
        window.history.scrollRestoration = "manual";
        let timer: ReturnType<typeof setTimeout> | undefined, completion: ReturnType<typeof setTimeout> | undefined;
        let pending: Partial<ReadingRecord> | undefined, visible = 0, since = document.hidden ? 0 : performance.now();
        const clamp = (value: number) => Math.max(0, Math.min(1, value));
        const line = () => (document.querySelector(".site-header")?.getBoundingClientRect().height || 140) + 32;
        const blocks = () => Array.from(body?.children || []).filter((node): node is HTMLElement => node instanceof HTMLElement && node.getBoundingClientRect().height > 0);
        const text = (node: HTMLElement) => (node.textContent || "").trim().replace(/\s+/g, " ").slice(0, 160);
        const elapsed = () => visible + (since ? performance.now() - since : 0);
        const atEnd = () => {
            const end = article.querySelector(".article-end")?.getBoundingClientRect();
            return !!end && end.top >= line() && end.bottom <= window.innerHeight - 12;
        };
        function flush() {
            if (timer) clearTimeout(timer); timer = undefined;
            if (pending) { remember(entry.id, seriesId, pending); pending = undefined; }
        }
        function checkCompletion() {
            if (completion) clearTimeout(completion); completion = undefined;
            if (completed || document.hidden || !atEnd()) return;
            completion = setTimeout(() => {
                completion = undefined;
                if (!document.hidden && atEnd() && elapsed() >= 5000) {
                    completed = true; pending = { ...pending, completed: true, progress: 1 }; flush();
                }
            }, Math.max(1500, 5000 - elapsed()) + 30);
        }
        function sample() {
            if (!initialized || !body || document.hidden) return;
            const rect = body.getBoundingClientRect(), values = blocks(), top = line();
            if (!rect.height || !values.length) return;
            const block = Math.max(0, values.findLastIndex(node => node.getBoundingClientRect().top <= top));
            const node = values[block], box = node.getBoundingClientRect();
            const heading = Array.from(body.querySelectorAll<HTMLElement>("h2, h3, h4")).filter(node => node.getBoundingClientRect().top <= top).at(-1);
            pending = { position: clamp((top - rect.top) / rect.height), progress: clamp((window.innerHeight - rect.top) / rect.height), block, blockText: text(node), offset: clamp((top - box.top) / box.height), lang, heading: heading?.id || "", headingText: (heading?.textContent || "").slice(0, 500) };
            checkCompletion();
        }
        function schedule() {
            if (frame) return;
            frame = requestAnimationFrame(() => { frame = 0; sample(); if (timer) clearTimeout(timer); timer = setTimeout(flush, 300); });
        }
        function saveNow() {
            if (frame) cancelAnimationFrame(frame); frame = 0; sample(); flush();
        }
        function resume() {
            if (!body || !saved) return false;
            const rect = body.getBoundingClientRect(), values = blocks();
            let target: number | undefined;
            if (saved.lang === lang && saved.block !== undefined) {
                const node = values[saved.block] && text(values[saved.block]) === saved.blockText ? values[saved.block] : values.map((node, index) => ({ node, index })).filter(value => text(value.node) === saved.blockText).sort((a, b) => Math.abs(a.index - saved.block!) - Math.abs(b.index - saved.block!))[0]?.node || values[saved.block];
                if (node) { const box = node.getBoundingClientRect(); target = window.scrollY + box.top + (saved.offset || 0) * box.height - line(); }
            }
            if (target === undefined && saved.position !== undefined) target = window.scrollY + rect.top + saved.position * rect.height - line();
            if (target === undefined && saved.heading) {
                const node = Array.from(body.querySelectorAll<HTMLElement>("h2, h3, h4")).find(node => node.textContent === saved.headingText || node.id === saved.heading);
                if (node) target = window.scrollY + node.getBoundingClientRect().top - line();
            }
            if (target === undefined) return false;
            window.scrollTo({ top: Math.max(0, target), behavior: "instant" });
            const url = new URL(window.location.href); url.searchParams.delete("resume");
            window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
            return true;
        }
        actions.current = { resume, restart() {
            if (!body || !body.getBoundingClientRect().height) return;
            completed = false; visible = 0; since = document.hidden ? 0 : performance.now();
            initial.current = undefined;
            remember(entry.id, seriesId, { completed: false, position: 0, progress: 0, block: 0, blockText: "", offset: 0, heading: "", headingText: "", lang });
            window.scrollTo({ top: Math.max(0, window.scrollY + body.getBoundingClientRect().top - line()), behavior: "instant" });
            sample(); flush();
        } };
        const resize = new ResizeObserver(schedule);
        function initialize() {
            if (initialized || starting) return;
            body = article!.querySelector<HTMLElement>('.prose[data-reading-ready="true"]');
            if (!body || !body.getBoundingClientRect().height) return;
            starting = true;
            const query = new URLSearchParams(window.location.search);
            void document.fonts.ready.then(() => {
                if (disposed) return;
                initialFrame = requestAnimationFrame(() => {
                    initialized = true; visible = 0; since = document.hidden ? 0 : performance.now();
                    resize.observe(body!);
                    if (!interacted && !window.location.hash && !query.has("q") && (!saved?.completed || query.get("resume") === "1")) resume();
                    sample(); flush(); setTracking(true);
                });
            });
        }
        let initialFrame = 0;
        const observer = new MutationObserver(initialize);
        observer.observe(article, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-reading-ready"] });
        initialize();
        const visibility = () => {
            if (document.hidden) { if (since) visible += performance.now() - since; since = 0; if (completion) clearTimeout(completion); completion = undefined; flush(); }
            else { since = performance.now(); schedule(); }
        };
        const interact = () => { interacted = true; };
        for (const event of ["wheel", "touchstart", "keydown"]) window.addEventListener(event, interact, { passive: true });
        window.addEventListener("scroll", schedule, { passive: true });
        window.addEventListener("pagehide", saveNow);
        window.addEventListener("ease2k:reading-leave", saveNow);
        window.addEventListener("pointerdown", saveNow, { capture: true });
        document.addEventListener("visibilitychange", visibility);
        return () => {
            disposed = true; window.history.scrollRestoration = restoration;
            cancelAnimationFrame(frame); cancelAnimationFrame(initialFrame); if (completion) clearTimeout(completion); flush();
            observer.disconnect(); resize.disconnect();
            window.removeEventListener("scroll", schedule); window.removeEventListener("pagehide", saveNow); window.removeEventListener("ease2k:reading-leave", saveNow); window.removeEventListener("pointerdown", saveNow, { capture: true }); document.removeEventListener("visibilitychange", visibility);
            for (const event of ["wheel", "touchstart", "keydown"]) window.removeEventListener(event, interact);
        };
    }, [entry.id, entry.series?.id, lang, remember]);
    const percent = record?.completed ? 100 : Math.round((record?.progress || 0) * 100);
    return <section className="reading-tools" aria-busy={!tracking}><div><strong>{!tracking ? t("正在恢复阅读进度…", "Restoring reading position…") : record?.completed ? t("已读完，进度已自动保存", "Completed and saved automatically") : t("已读到 " + percent + "% · 正在自动记录", percent + "% read · Saved automatically")}</strong><small>{available ? t("再次打开会回到上次位置；读到末尾并停留后自动标记已读。仅保存在当前浏览器。", "Return to your last position next time. Reaching the end and pausing marks this as read. Saved only in this browser.") : t("浏览器无法保存进度，关闭页面后不会保留。", "Progress cannot be saved beyond this page session.")}</small></div><progress value={percent} max={100} aria-label={t("文章阅读进度", "Article reading progress")} /><div>{(initial.current?.position || initial.current?.heading) && <button onClick={() => actions.current.resume()}><BookOpen size={15} />{t("回到上次位置", "Resume position")}</button>}{record?.completed && <button onClick={() => actions.current.restart()}><Check size={15} />{t("重新阅读", "Read again")}</button>}</div></section>;
}
