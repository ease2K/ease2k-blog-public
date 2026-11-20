import { useState } from "react";
import { changelogCopy, releases } from "@/lib/changelog";

const timeline = [...releases].sort((a, b) => b.date.localeCompare(a.date));
const chronological = [...timeline].reverse();

export default function Changelog({ lang }: { lang: "zh" | "en" }) {
    const [oldestFirst, setOldestFirst] = useState(false);
    const t = (zh: string, en: string) => lang === "zh" ? zh : en;
    const formatDate = new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", {
        timeZone: "Asia/Shanghai", year: "numeric", month: "short", day: "numeric",
    });

    return <div className="changelog-page">
        <div className="page-heading"><div><h1>{changelogCopy.title[lang]}</h1><p>{changelogCopy.description[lang]}</p></div></div>
        <div className="filter-bar">
            <div className="filter-chips" role="group" aria-label={t("日志排序", "Changelog order")}>
                <button className={oldestFirst ? "" : "selected"} aria-pressed={!oldestFirst} onClick={() => setOldestFirst(false)}>{t("最新在前", "Newest first")}</button>
                <button className={oldestFirst ? "selected" : ""} aria-pressed={oldestFirst} onClick={() => setOldestFirst(true)}>{t("最早在前", "Oldest first")}</button>
            </div>
        </div>
        <ol className="changelog-timeline" role="list">
            {(oldestFirst ? chronological : timeline).map(release => {
                const latest = release === timeline[0];
                return <li className={"changelog-release" + (latest ? " changelog-release-latest" : "")} key={release.date + release.title.zh}>
                    <time dateTime={release.date}>{formatDate.format(new Date(release.date))}</time>
                    <div className="changelog-release-content">
                        {latest && <span className="changelog-latest">{t("最新更新", "Latest update")}</span>}
                        <h2>{release.title[lang]}</h2>
                        <ul>{release.changes.map(change => <li key={change.zh}>{change[lang]}</li>)}</ul>
                    </div>
                </li>;
            })}
        </ol>
    </div>;
}
