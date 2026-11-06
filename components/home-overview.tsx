import { ArrowUpRight, BookOpen, Clock3, Folder, Pin, Sprout } from "lucide-react";
import type { ReactNode } from "react";
import { inSection, type Entry } from "@/lib/content";
import ProjectCard from "@/components/project-card";

export default function HomeOverview({ entries, lang, row, open, continueReading }: { entries: Entry[]; lang: "zh" | "en"; row: (entry: Entry) => ReactNode; open: (path: string) => void; continueReading: ReactNode }) {
    const t = (zh: string, en: string) => lang === "zh" ? zh : en;
    const featured = entries.filter(entry => entry.featured && entry.kind !== "project").slice(0, 3);
    const recent = entries.filter(entry => entry.kind !== "project" && !featured.some(value => value.id === entry.id)).sort((a, b) => Date.parse(b.modifiedAt || b.date) - Date.parse(a.modifiedAt || a.date)).slice(0, 4);
    const projects = entries.filter(entry => entry.kind === "project").slice(0, 2);
    const current = entries.filter(entry => entry.kind === "project" && entry.project?.status === "active").slice(0, 2);
    const anchor = (href: string, children: ReactNode, className = "") => <a className={className} href={href} onClick={event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); open(href); }}>{children}</a>;
    return <div className="home-overview">{continueReading}
        {!!featured.length && <section className="home-section home-featured"><div className="section-heading"><h2><Pin size={18} />{t("精选阅读", "Selected reading")}</h2>{anchor("/articles", <>{t("全部文章", "All writing")}<ArrowUpRight size={14} /></>, "view-all")}</div><p className="section-intro">{t("从几篇整理过的笔记开始。", "A few notes to start with.")}</p><div className="entry-list">{featured.map(row)}</div></section>}
        {!!current.length && <section className="home-current"><h2><Sprout size={18} />{t("正在做什么", "In progress")}</h2>{current.map(entry => <div key={entry.id}>{anchor("/entry/" + entry.id, <>{lang === "en" && entry.enTitle ? entry.enTitle : entry.title}<ArrowUpRight size={14} /></>)}<p>{entry.project!.stack.join(" / ")}</p></div>)}</section>}
        {!!recent.length && <section className="home-section home-recent"><div className="section-heading"><h2><Clock3 size={18} />{t("最近更新", "Recent updates")}</h2>{anchor("/articles", <>{t("查看全部", "View all")}<ArrowUpRight size={14} /></>, "view-all")}</div><div className="entry-list">{recent.map(row)}</div></section>}
        {!!projects.length && <section className="home-section"><div className="section-heading"><h2><Folder size={18} />{t("项目", "Projects")}</h2>{anchor("/projects", <>{t("查看全部", "View all")}<ArrowUpRight size={14} /></>, "view-all")}</div><div className="project-grid">{projects.map(entry => <ProjectCard key={entry.id} entry={entry} lang={lang} open={open} />)}</div></section>}
        <section className="home-topics"><h2><BookOpen size={18} />{t("按主题探索", "Explore topics")}</h2><div>{[["algorithms", t("算法", "Algorithms")], ["cpp", "C++"], ["java", "Java"], ["mysql", "MySQL"], ["html", "HTML"], ["css", "CSS"], ["javascript", "JavaScript"], ["daily", t("日常", "Journal")]].map(([key, title]) => { const count = entries.filter(entry => inSection(entry, key)).length; return count ? <span key={key}>{anchor("/" + key, <>{title}<small>{count}</small></>, "topic-link")}</span> : null; })}{anchor("/series", <>{t("学习专栏", "Learning series")}<ArrowUpRight size={14} /></>, "topic-link")}</div></section>
    </div>;
}
