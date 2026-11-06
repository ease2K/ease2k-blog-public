import { ArrowUpRight, Folder, Code2 } from "lucide-react";
import type { Entry } from "@/lib/content";

export default function ProjectCard({ entry, lang, open, detail = false }: { entry: Entry; lang: "zh" | "en"; open?: (path: string) => void; detail?: boolean }) {
    const t = (zh: string, en: string) => lang === "zh" ? zh : en;
    const project = entry.project;
    const statuses = { active: t("持续开发", "In development"), complete: t("已完成", "Completed"), paused: t("已暂停", "Paused") };
    const link = "/entry/" + entry.id;
    return <section className={"project-card" + (detail ? " project-card-detail" : "")} data-entry={detail ? undefined : entry.id}>
        {project?.screenshot ? <a className="project-capture" href={project.screenshot} target="_blank" rel="noopener noreferrer"><img src={project.screenshot} alt={project.screenshotAlt || entry.title} loading="lazy" width="1440" height="1000" /><span>{t("查看实际截图", "View screenshot")}<ArrowUpRight size={13} /></span></a> : <div className="project-no-capture"><Folder size={28} /><span>{t("项目记录", "Project notes")}</span></div>}
        <div className="project-card-content"><span className="project-status">{project ? statuses[project.status] : t("项目记录", "Project notes")}</span>
            {!detail && <h2><a href={link} onClick={event => { if (!open || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); open(link); }}>{lang === "en" && entry.enTitle ? entry.enTitle : entry.title}</a></h2>}
            <p>{project ? lang === "en" && project.enProblem ? project.enProblem : project.problem : lang === "en" && entry.enSummary ? entry.enSummary : entry.summary}</p>
            {!!project?.stack.length && <div className="tags">{project.stack.map(value => <span key={value}>{value}</span>)}</div>}
            {!!project?.outcomes.length && <ul className="project-outcomes">{(lang === "en" && project.enOutcomes?.length ? project.enOutcomes : project.outcomes).map(value => <li key={value}>{value}</li>)}</ul>}
            <div className="project-links">{!detail && <a href={link} onClick={event => { if (!open || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); open(link); }}>{t("阅读项目记录", "Read project notes")}<ArrowUpRight size={14} /></a>}{project?.sourceUrl && <a href={project.sourceUrl} target="_blank" rel="noopener noreferrer"><Code2 size={14} />{t("项目源码", "Source")}</a>}{project?.demoUrl && <a href={project.demoUrl} target="_blank" rel="noopener noreferrer">{t("在线体验", "Open project")}<ArrowUpRight size={14} /></a>}</div>
        </div>
    </section>;
}
