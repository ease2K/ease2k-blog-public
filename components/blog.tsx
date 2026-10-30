import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Home, BookOpen, Folder, Trophy, UserRound, Search, Sun, Moon, ArrowUpRight, ChevronRight, ArrowLeft, Clock3, CalendarDays, Globe2, X, Code2, Database, Braces, NotebookPen, Coffee, ArrowUp, GraduationCap, Pin } from "lucide-react";
import Ratings from "@/components/ratings";
import ArticleToc, { type Heading, type OutlineHandler } from "@/components/article-toc";
import { entries as initialEntries, profiles, portals, authoredProblems, awards, orderedAwards, sections, inSection, type Entry } from "@/lib/content";

type Lang = "zh" | "en";
type View = { entries: Entry[]; ready: boolean };
const names: Record<string, [string, string]> = {
    home: ["首页", "Home"], daily: ["日常", "Journal"], articles: ["文章", "Writing"],
    projects: ["项目", "Projects"], competitions: ["竞赛", "Contests"], about: ["关于我", "About"],
    algorithms: ["算法", "Algorithms"], java: ["Java", "Java"], mysql: ["MySQL", "MySQL"], cpp: ["C++", "C++"],
};
const sourceRepository = "https://github.com/ease2K/ease2k-blog-public";
const nav = [["home", Home], ["daily", NotebookPen], ["articles", BookOpen], ["projects", Folder], ["competitions", Trophy], ["about", UserRound]] as const;
const sectionIcons = { daily: NotebookPen, articles: BookOpen, projects: Folder, algorithms: Braces, java: Coffee, mysql: Database };

function PlatformIcon({ platform }: { platform: "codeforces" | "atcoder" | "github" }) {
    return <span className={"platform-icon platform-icon-" + platform} aria-hidden="true">{platform === "github" ? <><img className="platform-day" src="/brands/github-black.svg" width="18" height="18" alt="" /><img className="platform-night" src="/brands/github-white.svg" width="18" height="18" alt="" /></> : <img src={platform === "codeforces" ? "/brands/codeforces.ico" : "/brands/atcoder.png"} width="18" height="18" alt="" />}</span>;
}

function BrandMark({ className }: { className: string }) {
    return <span className={"e-mark " + className} aria-hidden="true"><svg viewBox="0 0 64 64" focusable="false"><path d="M19 14H46V21H27V28H43V35H27V43H46V50H19Z" fill="currentColor" /></svg></span>;
}

function Nickname() {
    return <span className="nickname">eAs1nGG<span className="nickname-suffix">-_-</span></span>;
}

function IconLink({ href, children }: { href: string; children: ReactNode }) {
    return <a className="profile-link" href={href} target="_blank" rel="noopener noreferrer">{children}<ArrowUpRight size={15} /></a>;
}
const MarkdownBody = lazy(() => import("@/components/markdown-body"));
function Body({ text, lang, onOutline }: { text: string; lang: Lang; onOutline?: OutlineHandler }) {
    return <Suspense fallback={<p className="language-note" role="status">{lang === "zh" ? "正在加载正文…" : "Loading article…"}</p>}><MarkdownBody text={text} lang={lang} onOutline={onOutline} /></Suspense>;
}
function awardDate(value: string, lang: Lang) {
    const monthOnly = value.length === 7;
    return new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", { timeZone: "Asia/Shanghai", year: "numeric", month: "long", ...(monthOnly ? {} : { day: "numeric" as const }) }).format(new Date(value + (monthOnly ? "-01" : "") + "T00:00:00+08:00"));
}
function certificateUrl(value?: string) {
    return value ? value + "?v=redacted-20261029-v2" : undefined;
}
function certificateThumbnail(value?: string, width = 480) {
    return value ? certificateUrl(value.replace(/\/([^/]+)\.(?:jpg|png)$/i, "/thumbnails/$1-" + width + ".webp")) : undefined;
}

const tagNames: Record<string, string> = {
    "算法": "Algorithms", "二分": "Binary search", "图论": "Graphs", "语言基础": "Language basics",
    "站点说明": "Site notes", "个人网站": "Personal website", "生活": "Life",
};
function entryId(path: string) {
    try { return decodeURIComponent(path.split("/")[2] || ""); } catch { return ""; }
}

export default function Blog({ initialPath = "/" }: { initialPath?: string }) {
    const [lang, setLang] = useState<Lang>("zh"), [theme, setTheme] = useState("light"), [path, setPath] = useState(initialPath);
    const [now, setNow] = useState<Date | null>(null), [preferencesReady, setPreferencesReady] = useState(false);
    const [loading, setLoading] = useState(true), [returnPath, setReturnPath] = useState("");
    const [data, setData] = useState<View>({ entries: initialEntries, ready: true });
    const [search, setSearch] = useState(""), [tag, setTag] = useState("all"), [month, setMonth] = useState("all");
    const searchDialog = useRef<HTMLDialogElement>(null);
    const main = useRef<HTMLElement>(null), focusPage = useRef(false), requestId = useRef(0);
    const t = (zh: string, en: string) => lang === "zh" ? zh : en;
    const name = (key: string) => names[key]?.[lang === "zh" ? 0 : 1] || key;
    const tagName = (value: string) => lang === "en" ? tagNames[value] || value : value;
    const active = path === "/" ? "home" : path.split("/")[1];
    const selected = active === "entry" ? data.entries.find(e => e.id === entryId(path) && e.body.trim()) : null;
    const [outline, setOutline] = useState<{ entry: string; headings: Heading[]; activeId: string }>({ entry: "", headings: [], activeId: "" });
    const outlineEntry = selected?.id || "";
    const updateOutline = useCallback<OutlineHandler>((headings, activeId) => setOutline({ entry: outlineEntry, headings, activeId }), [outlineEntry]);
    const competitionGroup = active === "competitions" ? path.split("/")[2] || "" : "";
    const competitionGroups: Record<string, [string, string]> = { awards: ["竞赛奖项", "Competition awards"], problems: ["原创题目", "Problems I authored"], tutorials: ["竞赛相关算法", "Competition algorithms"] };
    const validCompetitionGroup = !competitionGroup || Object.hasOwn(competitionGroups, competitionGroup);
    const activeNav = active === "entry" && selected ? returnPath === "/articles" ? "articles" : selected.section === "competitions" ? "competitions" : selected.kind === "daily" ? "daily" : selected.kind === "project" ? "projects" : "articles" : active === "award" ? "competitions" : ["algorithms", "java", "mysql", "cpp"].includes(active) ? "articles" : active;
    const list = data.entries.filter(e => !e.sample && e.body.trim()).sort((a, b) => b.date.localeCompare(a.date));
    const title = (e: Entry) => lang === "en" && e.enTitle ? e.enTitle : e.title;
    const summary = (e: Entry) => lang === "en" && e.enSummary ? e.enSummary : e.summary;
    const date = (value: string, options?: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", ...options }).format(new Date(value));
    const link = (section: string) => section === "home" ? "/" : "/" + section;
    const load = useCallback(async () => {
        const id = ++requestId.current;
        setLoading(true);
        try {
            const response = await fetch("/api/blog", { cache: "no-store" });
            if (!response.ok) throw new Error();
            const value = await response.json() as View;
            if (!value.ready) throw new Error();
            if (id === requestId.current) setData({ entries: value.entries.filter(e => e.visibility !== "private"), ready: true });
        } catch {
            if (id === requestId.current) setData({ entries: initialEntries, ready: false });
        } finally { if (id === requestId.current) setLoading(false); }
    }, []);

    useEffect(() => {
        setPath(window.location.pathname);
        // 每次加载重新读取系统偏好；手动切换仅在当前页面会话生效。
        setLang(/^zh(?:-|$)/i.test(navigator.language) ? "zh" : "en");
        setTheme(matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
        setPreferencesReady(true);
        setReturnPath(window.history.state?.entryFrom || "");
        const pop = () => { focusPage.current = true; setPath(window.location.pathname); setReturnPath(window.history.state?.entryFrom || ""); setTag("all"); setMonth("all"); setSearch(""); searchDialog.current?.close(); };
        const keyboard = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;
            if (target.isContentEditable) return;
            if ((event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) { event.preventDefault(); searchDialog.current?.showModal(); }
        };
        window.addEventListener("popstate", pop); window.addEventListener("keydown", keyboard); load();
        return () => { requestId.current++; window.removeEventListener("popstate", pop); window.removeEventListener("keydown", keyboard); };
    }, [load]);
    useEffect(() => {
        if (active !== "home") return;
        setNow(new Date());
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, [active]);
    useEffect(() => { if (!preferencesReady) return; document.documentElement.dataset.theme = theme; }, [theme, preferencesReady]);
    useEffect(() => { if (!preferencesReady) return; document.documentElement.lang = lang === "zh" ? "zh-CN" : "en"; }, [lang, preferencesReady]);
    useEffect(() => { document.title = (active === "home" ? t("个人手记", "Personal notes") : active === "entry" ? (selected ? title(selected) : loading ? t("加载中", "Loading") : t("记录暂不可见", "Entry unavailable")) : active === "award" ? t("竞赛奖项", "Competition award") : active === "competitions" && Object.hasOwn(competitionGroups, competitionGroup) ? t(...competitionGroups[competitionGroup]) : name(active)) + " · eAs1nGG-_-"; }, [path, lang, data, loading]);
    useEffect(() => {
        if (focusPage.current) { main.current?.focus({ preventScroll: true }); focusPage.current = false; }
        const current = document.querySelector<HTMLAnchorElement>(".nav-link.active");
        const container = current?.parentElement;
        if (current && container) container.scrollTo({ left: current.offsetLeft - container.offsetLeft - (container.clientWidth - current.offsetWidth) / 2, behavior: "instant" });
    }, [path, activeNav, lang]);
    function go(to: string) {
        const from = (to.startsWith("/entry/") || to.startsWith("/award/")) ? (([...sections, "cpp", "competitions"] as string[]).includes(active) ? path : returnPath) : "";
        if (to !== path) window.history.pushState({ entryFrom: from }, "", to);
        setReturnPath(from); focusPage.current = true; setPath(to); setTag("all"); setMonth("all"); setSearch(""); searchDialog.current?.close(); window.scrollTo({ top: 0, behavior: "instant" });
        if (to === path) { main.current?.focus({ preventScroll: true }); focusPage.current = false; }
    }
    function internal(href: string, children: ReactNode, className = "") {
        return <a key={href + "|" + className} href={href} className={className} aria-label={className === "entry-open" ? t("查看详情", "Read entry") : undefined} aria-current={href === path || (className.startsWith("nav-link") && href === link(activeNav)) ? "page" : undefined} onClick={e => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; e.preventDefault(); go(href); }}>{children}</a>;
    }
    function tags(e: Entry) {
        return <div className="tags">{e.tags.map(v => <span key={v}>{tagName(v)}</span>)}{e.sample && <span className="sample">{t("示例文章", "Sample")}</span>}</div>;
    }
    function row(e: Entry) {
        return <article className={"entry-row " + (e.kind === "daily" ? "journal-row" : "")} key={e.id} data-entry={e.id}>
            {e.kind === "daily" && <div className="journal-date"><span>{new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Shanghai", day: "2-digit" }).format(new Date(e.date))}</span><small>{date(e.date, { month: "short", day: undefined })}</small></div>}
            <div className="entry-text"><div className="entry-meta"><span>{e.kind === "daily" ? <NotebookPen size={12} /> : e.kind === "project" ? <Folder size={12} /> : <BookOpen size={12} />}{tagName(e.tags[0])}</span><time dateTime={e.date}>{date(e.date, { year: "numeric" })}</time>{e.kind !== "daily" && <span>{e.read} {t("分钟", "min")}</span>}</div>
                {internal("/entry/" + e.id, <><h3>{title(e)}</h3><p>{summary(e)}</p></>, "entry-title-link")}{tags(e)}</div>{internal("/entry/" + e.id, <ChevronRight size={19} />, "entry-open")}
        </article>;
    }
    function section(key: typeof sections[number]) {
        const items = list.filter(e => inSection(e, key)).slice(0, 3);
        if (!items.length) return null;
        const Icon = sectionIcons[key];
        return <section className={"home-section section-" + key} id={key} key={key} data-section={key}>
            <div className="section-heading"><h2><Icon size={19} strokeWidth={1.7} />{name(key)}</h2>{internal("/" + key, <>{t("查看全部", "View all")}<ChevronRight size={14} /></>, "view-all")}</div>
            {key === "projects" ? items.map(e => <article className="project-feature" key={e.id}>
                <div className="project-art" aria-hidden="true"><div className="mini-browser"><div className="mini-top"><i /><i /><i /></div><div className="mini-brand"><Nickname /></div><div className="mini-blue"><span>ease2k</span><small>Make room for ideas.</small></div><div className="mini-lines"><i /><i /><i /></div></div><div className="project-orbit"><Code2 size={25} /></div></div>
                <div className="project-info"><span className="project-status"><span />{t("正在生长", "Growing")}</span>{internal("/entry/" + e.id, <h3>{title(e)}</h3>)}<p>{summary(e)}</p>{tags(e)}{internal("/entry/" + e.id, <>{t("了解项目", "Explore project")}<ArrowUpRight size={15} /></>, "text-action")}</div>
            </article>) : <div className="entry-list">{items.map(row)}</div>}
        </section>;
    }
    function profileButtons(kind: "contests" | "github" | "all") {
        return <div className="profile-buttons">{kind !== "github" && <><IconLink href={profiles.codeforces}><PlatformIcon platform="codeforces" />Codeforces</IconLink><IconLink href={profiles.atcoder}><PlatformIcon platform="atcoder" />AtCoder</IconLink></>}{kind !== "contests" && <IconLink href={profiles.github}><PlatformIcon platform="github" />GitHub</IconLink>}</div>;
    }
    function aside() {
        const showOutline = active === "entry" && outline.entry === selected?.id && outline.headings.length >= 2;
        return <aside className={"sidebar" + (showOutline ? " sidebar-with-toc" : "")}>{showOutline ? <ArticleToc headings={outline.headings} activeId={outline.activeId} lang={lang} /> : <div className="profile-card"><BrandMark className="avatar" /><h2><Nickname /></h2><span className="alias">ease2k</span><p>{t("把问题想明白，\n把过程记下来。", "Think it through.\nKeep a little record.")}</p>{profileButtons("all")}</div>}
            <div className="community-panel"><h3>{t("常用链接", "Useful links")}</h3><a className="community-link" href={portals.hzauacm} target="_blank" rel="noopener noreferrer"><GraduationCap size={19} aria-hidden="true" /><span><strong>HZAUOJ</strong><small>{t("华中农业大学程序设计竞赛门户", "Huazhong Agricultural University ACM portal")}</small></span><ArrowUpRight size={16} aria-hidden="true" /></a></div>
            <div className="side-note"><span className="tiny-blue-dot" /><p>{t("这里记录生活，也记录从不懂到想明白的过程。", "Notes on everyday life, and the journey from questions to understanding.")}</p></div>
        </aside>;
    }
    const searchResults = search.trim() ? list.filter(e => ([e.title, e.enTitle, e.summary, e.enSummary, e.body, e.enBody, ...e.tags, ...e.tags.map(tagName)].join(" ")).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) : [];

    return <div className={"site" + (active === "home" ? " site-home" : "")}>{active === "home" && <div className="home-wallpaper" aria-hidden="true" />}<a className="skip-link" href="#main">{t("跳到正文", "Skip to content")}</a>
        <header className="site-header"><div className="identity-bar wrap">
            {internal("/", <><BrandMark className="brand-icon" /><span className="brand-primary"><Nickname /></span><span className="brand-slash">/</span><span className="brand-alias">ease2k</span></>, "brand")}
            <div className="preferences"><div className="theme-switch" role="group" aria-label={t("外观", "Appearance")}><button className={theme === "light" ? "selected" : ""} aria-label={t("白天模式", "Light mode")} aria-pressed={theme === "light"} onClick={() => setTheme("light")}><Sun size={16} /></button><button className={theme === "dark" ? "selected" : ""} aria-label={t("黑夜模式", "Dark mode")} aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}><Moon size={15} /></button></div><button className="language-switch" onClick={() => setLang(lang === "zh" ? "en" : "zh")} aria-label={t("切换至英文", "Switch to Chinese")}><Globe2 size={15} /><span>{lang === "zh" ? "中 / EN" : "EN / 中"}</span></button></div>
        </div><nav className="main-nav wrap" aria-label={t("主导航", "Main navigation")}><div className="nav-items">{nav.map(([key, Icon]) => internal(link(key), <><Icon size={16} strokeWidth={1.7} />{name(key)}</>, "nav-link " + (activeNav === key ? "active" : "")))}</div><button className="search-trigger" aria-label={t("搜索", "Search")} onClick={() => searchDialog.current?.showModal()}><Search size={17} /><span>{t("搜索", "Search")}</span><kbd>⌘ K</kbd></button></nav></header>

        {active === "home" && <div className="wrap"><section className="clock-banner" aria-label={t("北京时间", "Beijing time")}><div className="clock-date"><span className="clock-label"><CalendarDays size={14} />{t("每一天，都值得记录", "Every day has a story")}</span><div>{now ? date(now.toISOString(), { year: "numeric", month: "long", day: "numeric" }) : "—"}<span className="clock-weekday">{now ? date(now.toISOString(), { weekday: "long", month: undefined, day: undefined }) : ""}</span></div></div><div className="clock-time"><span className="clock-label"><span className="live-dot" />{t("北京时间", "Beijing time")}<small>UTC+8</small></span><time>{now ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(now) : "—:—:—"}</time></div></section></div>}

        <main ref={main} tabIndex={-1} className="wrap main-layout" id="main"><div className="main-column">
            {!loading && !data.ready && <div className="load-notice" role="status"><span>{t("日常暂时未能加载，请重试。", "Journal could not load. Please try again.")}</span><button onClick={() => load()}>{t("重新加载", "Retry")}</button></div>}
            {active === "home" && <h1 className="sr-only">{t("eAs1nGG-_- 的个人手记", "Personal notes by eAs1nGG-_-")}</h1>}
            {active === "home" && <>{sections.map(section)}{!list.length && <div className="empty-state"><NotebookPen /><h2>{t("记录即将开始", "A fresh page")}</h2><p>{t("发布内容后，这里会按主题展示最新记录。", "Published entries will appear here, organized by topic.")}</p></div>}</>}

            {([...sections, "cpp"] as string[]).includes(active) && <>
                <div className="page-heading"><div><span className="page-kicker">{t("个人手记", "Personal notes")}</span><h1>{name(active)}</h1><p>{active === "daily" ? t("收集生活里的片段，也留住偶然的想法。", "Small moments, passing thoughts, and things worth keeping.") : active === "articles" ? t("汇总日常、学习与项目中的所有文章。", "All my writing, from everyday notes to learning and projects.") : t("从一个问题开始，慢慢整理成自己的理解。", "Questions, practice, and a growing understanding.")}</p></div></div>
                {active === "projects" && profileButtons("github")}
                <div className="filter-bar"><div className="filter-chips">{["all", ...new Set(list.filter(e => inSection(e, active)).flatMap(e => e.tags))].map(value => <button key={value} className={tag === value ? "selected" : ""} aria-pressed={tag === value} onClick={() => setTag(value)}>{value === "all" ? t("全部", "All") : tagName(value)}</button>)}</div>{active === "daily" && <select aria-label={t("按月份筛选", "Filter by month")} value={month} onChange={e => setMonth(e.target.value)}><option value="all">{t("所有月份", "All months")}</option>{[...new Set(list.filter(e => e.kind === "daily").map(e => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit" }).format(new Date(e.date))))].map(value => <option key={value}>{value}</option>)}</select>}</div>
                {(() => { const items = list.filter(e => inSection(e, active) && (tag === "all" || e.tags.includes(tag)) && (month === "all" || new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit" }).format(new Date(e.date)) === month)); return items.length ? <div className="entry-list full-list">{items.map(row)}</div> : <div className="empty-state"><NotebookPen /><h2>{t("这里还没有记录", "Nothing here yet")}</h2><p>{t("换个筛选条件，或稍后再来看看。", "Try another filter, or check back later.")}</p><button className="secondary-button" onClick={() => { setTag("all"); setMonth("all"); }}>{t("重置筛选", "Reset filters")}</button></div>; })()}
            </>}

            {active === "entry" && (selected ? <article className="detail"><button className="back-link" onClick={() => go(returnPath || (selected.section === "competitions" ? "/competitions" : "/" + (selected.kind === "daily" ? "daily" : selected.kind === "project" ? "projects" : "articles")))}><ArrowLeft size={15} />{returnPath?.startsWith("/competitions") || (!returnPath && selected.section === "competitions") ? t("返回竞赛", "Back to contests") : t("返回列表", "Back to entries")}</button>{tags(selected)}<h1>{title(selected)}</h1><p className="detail-summary">{summary(selected)}</p><div className="detail-meta"><CalendarDays size={14} /><time>{date(selected.date, { year: "numeric", month: "long", day: "numeric" })}</time><Clock3 size={14} /><span>{selected.read} {t("分钟阅读", "min read")}</span></div>{lang === "en" && !selected.enBody && <p className="language-note">This entry is available in Chinese.</p>}<Body text={lang === "en" && selected.enBody ? selected.enBody : selected.body} lang={lang} onOutline={updateOutline} />{selected.kind === "project" && profileButtons("github")}<div className="article-end"><span /><span>{t("感谢阅读", "Thanks for reading")}</span><span /></div></article> : loading ? <div className="empty-state loading-state" role="status" aria-busy="true"><h1>{t("正在加载记录…", "Loading your note…")}</h1></div> : !data.ready ? <div className="empty-state"><NotebookPen /><h1>{t("暂时无法加载这条记录", "Could not load this entry")}</h1><p>{t("请检查网络连接，再点击上方重新加载。", "Check your connection and use Retry above.")}</p></div> : <div className="empty-state"><BookOpen /><h1>{t("记录暂不可见", "Entry unavailable")}</h1><p>{t("记录可能已删除，或地址有误。", "The entry may have been removed, or the address may be incorrect.")}</p><button className="secondary-button" onClick={() => go("/")}>{t("回到首页", "Go home")}</button></div>)}

            {active === "competitions" && validCompetitionGroup && <div className="competitions-page">
                {competitionGroup && <button className="back-link" onClick={() => go("/competitions")}><ArrowLeft size={15} />{t("返回竞赛", "Back to contests")}</button>}
                <div className="page-heading"><div><span className="page-kicker">{t("比赛与成长", "Competing and learning")}</span><h1>{competitionGroup ? t(...competitionGroups[competitionGroup]) : t("竞赛", "Contests")}</h1><p>{competitionGroup === "tutorials" ? t("记录算法学习与教学中的思考，分享知识，也梳理自己的理解。", "Reflections on learning and teaching algorithms: sharing knowledge and deepening my understanding.") : t("记录比赛中的收获，也整理从基础开始的学习笔记。", "Competition awards and programming notes, starting with the fundamentals.")}</p></div></div>
                {!competitionGroup && <Ratings lang={lang} />}
                {(!competitionGroup || competitionGroup === "awards") && <section className="awards-section"><div className="section-heading"><h2><Trophy size={20} />{t("竞赛奖项", "Competition awards")}</h2>{!competitionGroup && internal("/competitions/awards", <>{t("查看更多", "View more")}<ChevronRight size={14} /></>, "view-all")}</div><div className="award-list">{(competitionGroup ? orderedAwards : orderedAwards.slice(0, 3)).map(a => internal("/award/" + a.id, <>
                    <span className="award-photo"><img src={certificateThumbnail(a.certificate)} srcSet={a.certificate ? [240, 480, 768].map(width => certificateThumbnail(a.certificate, width) + " " + width + "w").join(", ") : undefined} sizes={a.pinned ? "(max-width: 540px) calc(100vw - 76px), 220px" : "(max-width: 540px) 84px, 150px"} width="180" height="128" loading={a.pinned ? "eager" : "lazy"} decoding="async" alt={a.event + " · " + a.award + "获奖证书"} /></span>
                    <div className="award-copy"><div className="award-meta">{a.pinned && <span className="award-pinned"><Pin size={12} aria-hidden="true" />{t("置顶", "Pinned")}</span>}<time dateTime={a.date}>{awardDate(a.date, lang)}</time></div><h3>{lang === "en" && a.enEvent ? a.enEvent : a.event}</h3><p><strong className="award-badge">{lang === "en" && a.enAward ? a.enAward : a.award}</strong>{a.team && <span>{a.team}</span>}</p><span className="award-open">{t("查看获奖证书", "View certificate")}<ArrowUpRight size={14} aria-hidden="true" /></span></div>
                </>, "award-record" + (a.pinned ? " is-pinned" : "")))}</div></section>}
                {(!competitionGroup || competitionGroup === "problems") && <section className="authored-problems"><div className="section-heading"><h2><Braces size={20} />{t("原创题目", "Problems I authored")}</h2>{!competitionGroup && internal("/competitions/problems", <>{t("查看更多", "View more")}<ChevronRight size={14} /></>, "view-all")}</div><p>{t("我在 HZAU OJ 发布的题目，可以结合下方的入门笔记练习。", "My problems on HZAU OJ, paired with the introductory notes below.")}</p><div className="authored-problem-grid">{(competitionGroup ? authoredProblems : authoredProblems.slice(0, 3)).map(problem => <article className="authored-problem" key={problem.id}>
                    <div className="problem-meta"><span>{problem.id}</span><code>{problem.topic}</code></div>
                    <h3><a href={problem.href} target="_blank" rel="noopener noreferrer">{lang === "en" ? problem.enTitle : problem.title}</a></h3><p>{lang === "en" ? problem.enSummary : problem.summary}</p>
                    <div className="problem-actions"><a className="problem-open" href={problem.href} target="_blank" rel="noopener noreferrer">{t("原站做题", "Solve on HZAU OJ")}<ArrowUpRight size={14} aria-hidden="true" /></a>{internal("/entry/" + problem.tutorialId, <><BookOpen size={14} aria-hidden="true" />{t("配套教程", "Read tutorial")}</>, "problem-tutorial")}</div>
                </article>)}</div></section>}
                {(!competitionGroup || competitionGroup === "tutorials") && <section className="competition-tutorials"><div className="section-heading"><h2><Code2 size={20} />{t("竞赛相关算法", "Competition algorithms")}</h2>{!competitionGroup && internal("/competitions/tutorials", <>{t("查看更多", "View more")}<ChevronRight size={14} /></>, "view-all")}</div><p>{t("从基础概念到代码实现，整理算法讲解、学习笔记与练习心得。", "Algorithm explanations, study notes, and practice reflections, from core concepts to code.")}</p><div className="entry-list full-list">{list.filter(e => inSection(e, "competitions")).sort((a, b) => a.date.localeCompare(b.date)).slice(0, competitionGroup ? undefined : 3).map(row)}</div></section>}
                {!competitionGroup && <section className="campus-portal"><h2>HZAUOJ</h2><a className="campus-portal-link" href={portals.hzauacm} target="_blank" rel="noopener noreferrer"><span className="campus-portal-icon"><GraduationCap size={27} strokeWidth={1.6} aria-hidden="true" /></span><span className="campus-portal-copy"><strong>HZAUOJ</strong><span>{t("华中农业大学程序设计竞赛门户", "Huazhong Agricultural University ACM portal")}</span></span><span className="campus-portal-action">{t("访问门户", "Visit portal")}<ArrowUpRight size={17} aria-hidden="true" /></span></a></section>}
            </div>}

            {active === "award" && (() => {
                const award = awards.find(a => a.id === entryId(path));
                return award ? <article className="detail award-detail"><button className="back-link" onClick={() => go(returnPath || "/competitions")}><ArrowLeft size={15} />{t("返回竞赛", "Back to contests")}</button>{award.pinned && <span className="award-pinned"><Pin size={12} aria-hidden="true" />{t("置顶", "Pinned")}</span>}<h1>{lang === "en" && award.enEvent ? award.enEvent : award.event}</h1><p className="detail-summary">{lang === "en" && award.enAward ? award.enAward : award.award}</p><div className="detail-meta"><CalendarDays size={14} /><time dateTime={award.date}>{awardDate(award.date, lang)}</time>{award.team && " / " + award.team}</div><Body text={lang === "en" && award.enDescription ? award.enDescription : award.description} lang={lang} />{award.certificate && <a className="certificate-link" href={certificateUrl(award.certificate)} target="_blank" rel="noopener noreferrer"><img src={certificateUrl(award.certificate)} alt={award.event + " · " + award.award + "获奖证书"} /><span>{t("打开证书原图", "Open certificate")}<ArrowUpRight size={15} aria-hidden="true" /></span></a>}</article> : <div className="empty-state"><Trophy /><h1>{t("奖项记录不存在", "Award not found")}</h1><button className="secondary-button" onClick={() => go("/competitions")}>{t("返回竞赛", "Back to contests")}</button></div>;
            })()}

            {active === "about" && <div className="about-page"><div className="page-heading"><div><span className="page-kicker">{t("很高兴在这里遇见你", "Good to see you here")}</span><h1>{t("关于我", "About me")}</h1></div></div><div className="about-identity"><BrandMark className="avatar large" /><div><h2><Nickname /></h2><p>ease2k</p></div></div><p className="about-intro">{t("这里是我的个人空间。记录算法、C++、Java 和 MySQL 的学习，也收集日常生活里的片段。", "This is my personal space. Notes on algorithms, C++, Java, and MySQL, alongside little moments from everyday life.")}</p>{profileButtons("github")}<Ratings lang={lang} /><section className="about-section"><h2>{t("正在关注", "Things I care about")}</h2><div className="interest-tags">{[t("算法", "Algorithms"), "C++", "Java", "MySQL", t("日常记录", "Everyday notes")].map(v => <span key={v}>{tagName(v)}</span>)}</div></section><section className="about-section"><h2>{t("关于这个站点", "About this website")}</h2><p>{t("给学习与生活留一处可以回头看的地方。文章慢慢整理，日常随时记录，项目持续更新。", "A place to look back on what I learn and what I live. Writing, everyday notes, and projects, collected over time.")}</p><div className="about-actions">{internal("/entry/personal-blog", <>{t("查看站点项目", "Read about the site")}<ChevronRight size={15} /></>, "text-action")}<a className="text-action" href={sourceRepository} target="_blank" rel="noopener noreferrer"><PlatformIcon platform="github" />{t("查看 GitHub 源码", "View source on GitHub")}<ArrowUpRight size={15} aria-hidden="true" /></a></div></section></div>}
            {(!["home", ...sections, "cpp", "entry", "award", "competitions", "about"].includes(active) || (active === "competitions" && !validCompetitionGroup)) && <div className="empty-state"><Search /><h1>404</h1><p>{t("这个页面不存在。", "This page does not exist.")}</p><button className="secondary-button" onClick={() => go("/")}>{t("回到首页", "Go home")}</button></div>}
        </div>{aside()}</main>

        <footer className="site-footer wrap"><div><strong><Nickname /></strong><span> / ease2k</span><p>{t("记录当下，留给以后。", "Notes for now. Something to return to.")}</p></div><div className="footer-actions"><a href={sourceRepository} target="_blank" rel="noopener noreferrer"><PlatformIcon platform="github" />{t("本站源码", "Source code")}<ArrowUpRight size={13} aria-hidden="true" /></a><button onClick={() => window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })}><ArrowUp size={14} />{t("回到顶部", "Back to top")}</button></div></footer>

        <dialog ref={searchDialog} className="search-dialog" aria-label={t("搜索站内内容", "Search this site")} onClick={e => { if (e.target === e.currentTarget) searchDialog.current?.close(); }}><div className="dialog-top"><Search size={21} /><input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder={t("搜索文章、项目和日常…", "Search writing, projects, and notes…")} aria-label={t("搜索内容", "Search content")} /><button className="icon-button" aria-label={t("关闭搜索", "Close search")} onClick={() => searchDialog.current?.close()}><X size={18} /></button></div><div className="search-content"><p className="sr-only" role="status">{search.trim() ? t(`找到 ${searchResults.length} 条结果`, `${searchResults.length} results found`) : ""}</p>{search.trim() ? searchResults.length ? searchResults.map(e => internal("/entry/" + e.id, <><span className="search-kind">{name(e.section === "competitions" ? "competitions" : e.kind === "article" ? "articles" : e.kind === "project" ? "projects" : "daily")}</span><strong>{title(e)}</strong><p>{summary(e)}</p></>, "search-result")) : <div className="search-empty"><Search size={26} /><p>{t("没有找到相关内容，试试更短的关键词。", "No results. Try a shorter search.")}</p></div> : <><p className="search-help">{t("从感兴趣的主题开始", "Start with a topic")}</p><div className="suggestions">{["C++", "STL", "Java", "MySQL"].map(v => <button key={v} onClick={() => setSearch(v)}>{v}</button>)}</div></>}</div><div className="dialog-bottom"><span>{t("搜索本站内容", "Search this site")}</span><span>Esc {t("关闭", "to close")}</span></div></dialog>


    </div>;
}
