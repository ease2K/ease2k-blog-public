import { useEffect, useState, type FormEvent } from "react";
import { ArrowUpRight, Download, FilePlus2, History, LockKeyhole, LogOut, RotateCcw, Save, Send, Trash2 } from "lucide-react";
import ArticleBody from "@/components/article-body";
import type { Entry } from "@/lib/content";

type Item = Entry & { revision: number; updatedAt?: string };
type Session = { configured: boolean; authenticated: boolean; csrf?: string };
type Version = { entry: Entry; revision: number; deleted: boolean; savedAt: string };
function localDate(value: string) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "";
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
function normalise(entry: Item): Item { return { ...entry, visibility: entry.visibility === "private" ? "private" : "public" }; }
export default function Owner() {
    const [session, setSession] = useState<Session | null>(null), [password, setPassword] = useState("");
    const [entries, setEntries] = useState<Item[]>([]), [trash, setTrash] = useState<Item[]>([]);
    const [form, setForm] = useState<Item | null>(null), [creating, setCreating] = useState(false), [dirty, setDirty] = useState(false);
    const [tags, setTags] = useState(""), [query, setQuery] = useState(""), [view, setView] = useState("all");
    const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
    const [preview, setPreview] = useState(false), [versions, setVersions] = useState<Version[] | null>(null);
    async function api(path: string, method = "GET", value?: unknown) {
        const response = await fetch("/api/owner" + path, { method, credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json", ...(session?.csrf ? { "X-CSRF-Token": session.csrf } : {}) }, ...(value !== undefined ? { body: JSON.stringify(value) } : {}) });
        const result = await response.json();
        if (!response.ok) {
            if (response.status === 401 && path !== "/login") setSession(current => current ? { ...current, authenticated: false } : current);
            throw Error(result.error || "操作失败，请重试。");
        }
        return result;
    }
    async function load() {
        const data = await api("/entries");
        setEntries(data.entries.map(normalise)); setTrash(data.trash.map(normalise));
    }
    async function refresh() {
        const current: Session = await api("/session");
        setSession(current);
        if (current.authenticated) await load();
    }
    useEffect(() => { refresh().catch(err => setError(err.message)); }, []);
    useEffect(() => {
        const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);
    const leave = () => !dirty || window.confirm("当前修改还没有保存，继续后会放弃这些修改。是否继续？");
    function choose(entry: Item, fresh = false) {
        if (!leave()) return;
        setForm(normalise(entry)); setTags(entry.tags.join(", ")); setCreating(fresh); setDirty(false); setVersions(null); setPreview(false); setMessage(""); setError("");
    }
    function create() {
        choose({ id: crypto.randomUUID(), kind: "article", title: "", enTitle: "", summary: "", enSummary: "", body: "", enBody: "", date: new Date().toISOString(), tags: [], read: 1, visibility: "private", revision: 0 }, true);
    }
    function change<K extends keyof Item>(key: K, value: Item[K]) {
        setForm(current => current ? { ...current, [key]: value } : current); setDirty(true); setMessage("");
    }
    async function login(event: FormEvent) {
        event.preventDefault(); setBusy(true); setError("");
        try { await api("/login", "POST", { password }); await refresh(); }
        catch (err) { setError((err as Error).message); }
        finally { setPassword(""); setBusy(false); }
    }
    async function save(visibility: "public" | "private") {
        if (!form) return;
        setBusy(true); setError(""); setMessage("");
        try {
            const entry = { ...form, visibility, tags: tags.split(/[,，]/).map(tag => tag.trim()).filter(Boolean) };
            const result = await api("/entries/" + form.id, "PUT", { entry, revision: form.revision, create: creating });
            setForm(normalise(result.entry)); setCreating(false); setDirty(false); setVersions(null);
            await load(); setMessage(visibility === "public" ? "文章已发布，访客刷新页面即可看到。" : "草稿已保存，仅站主可见。");
        } catch (err) { setError((err as Error).message); }
        finally { setBusy(false); }
    }
    async function remove() {
        if (!form || !window.confirm("将这篇文章移入回收站？之后可以恢复为草稿。")) return;
        setBusy(true); setError("");
        try { await api("/entries/" + form.id, "DELETE", { revision: form.revision }); setForm(null); setDirty(false); await load(); setMessage("文章已移入回收站。"); }
        catch (err) { setError((err as Error).message); }
        finally { setBusy(false); }
    }
    async function restore(entry: Item) {
        if (!leave()) return;
        setBusy(true); setError("");
        try { const result = await api("/entries/" + entry.id + "/restore", "POST", { revision: entry.revision }); setForm(normalise(result.entry)); setTags(result.entry.tags.join(", ")); setCreating(false); setDirty(false); setView("draft"); setVersions(null); await load(); setMessage("文章已恢复为草稿，确认内容后可以重新发布。"); }
        catch (err) { setError((err as Error).message); }
        finally { setBusy(false); }
    }
    async function history() {
        if (!form) return;
        try { const result = await api("/entries/" + form.id + "/history"); setVersions(result.history); }
        catch (err) { setError((err as Error).message); }
    }
    async function logout() {
        if (!leave()) return;
        try { await api("/logout", "POST", {}); setSession(current => current ? { ...current, authenticated: false, csrf: undefined } : current); setForm(null); setDirty(false); setEntries([]); setTrash([]); }
        catch (err) { setError((err as Error).message); }
    }
    async function exportBackup() {
        try {
            const data = await api("/export");
            const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 4)], { type: "application/json" }));
            const link = document.createElement("a"); link.href = url; link.download = "ease2k-editor-backup-" + new Date().toISOString().slice(0, 10) + ".json"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) { setError((err as Error).message); }
    }
    if (!session?.authenticated) return <main className="owner-login"><a className="owner-brand" href="/">ease2k <span>站主入口</span></a><section className="owner-login-card"><LockKeyhole size={26} /><h1>继续写下去。</h1><p>通过 SSH 隧道连接后，输入站主密码进入工作台。</p>{error && <p className="owner-error" role="alert">{error}</p>}{session && !session.configured ? <p className="owner-notice">尚未设置站主密码。请先在服务器终端运行密码设置命令，然后刷新此页。</p> : <form onSubmit={login}><label htmlFor="owner-password">站主密码</label><input id="owner-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} minLength={12} maxLength={512} required disabled={busy || !session} /><button className="owner-primary" disabled={busy || !session}>{busy ? "正在验证…" : "进入工作台"}</button></form>}</section></main>;
    const filtered = (view === "trash" ? trash : entries).filter(entry => (view === "all" || view === "trash" || (view === "draft" ? entry.visibility === "private" : entry.visibility === "public")) && (entry.title + " " + entry.id).toLowerCase().includes(query.toLowerCase())).sort((a, b) => (b.updatedAt || b.date).localeCompare(a.updatedAt || a.date));
    return <main className="owner-shell"><header className="owner-header"><a className="owner-brand" href="/">ease2k <span>站主工作台</span></a><div><button onClick={exportBackup}><Download size={16} />导出备份</button><button onClick={logout}><LogOut size={16} />退出登录</button></div></header><div className="owner-layout"><aside className="owner-sidebar"><button className="owner-primary" onClick={create} disabled={busy}><FilePlus2 size={17} />新建文章</button><input aria-label="搜索文章" placeholder="搜索标题或 ID" value={query} onChange={e => setQuery(e.target.value)} /><div className="owner-filters">{[["all", "全部"], ["public", "已发布"], ["draft", "草稿"], ["trash", "回收站"]].map(([key, label]) => <button key={key} className={view === key ? "active" : ""} onClick={() => setView(key)}>{label}</button>)}</div><p className="owner-count">{filtered.length} 篇记录</p><div className="owner-entry-list">{filtered.map(entry => <div key={entry.id} className={"owner-entry " + (form?.id === entry.id ? "active" : "")}><button onClick={() => { if (view !== "trash") choose(entry); }} disabled={busy || view === "trash"}><strong>{entry.title}</strong><span>{view === "trash" ? "已删除" : entry.visibility === "private" ? "草稿" : "已发布"} · {localDate(entry.date).replace("T", " ")}</span></button>{view === "trash" && <button className="owner-restore" onClick={() => restore(entry)} disabled={busy}><RotateCcw size={14} />恢复为草稿</button>}</div>)}</div></aside><section className="owner-editor">{error && <p className="owner-error" role="alert">{error}</p>}{message && <p className="owner-success" role="status">{message}</p>}{!form ? <div className="owner-empty"><FilePlus2 size={34} /><h1>从一篇新记录开始</h1><p>选择左侧文章继续编辑，或新建一篇文章。草稿只对你可见。</p><button className="owner-primary" onClick={create}>新建文章</button></div> : <><div className="owner-editor-heading"><div><p>{creating ? "新文章" : "正在编辑"} · {creating ? "尚未保存" : dirty ? "有未保存的修改" : "内容已保存"}</p><h1>{form.title || "未命名文章"}</h1></div>{!creating && <button onClick={history}><History size={16} />修改记录</button>}</div><label>标题<input value={form.title} onChange={e => change("title", e.target.value)} maxLength={240} placeholder="给这篇文章起个标题" /></label><label>摘要<textarea value={form.summary} onChange={e => change("summary", e.target.value)} maxLength={2000} rows={2} /></label><div className="owner-fields"><label>类型<select value={form.kind} onChange={e => change("kind", e.target.value as Entry["kind"])}><option value="article">文章</option><option value="daily">日常</option><option value="project">项目</option></select></label><label>发布时间（北京时间）<input type="datetime-local" value={localDate(form.date)} onChange={e => change("date", e.target.value ? e.target.value + ":00+08:00" : "")} /></label><label>预计阅读分钟<input type="number" min={1} max={10000} value={form.read} onChange={e => change("read", Number(e.target.value))} /></label><label>分区<select value={form.section || ""} onChange={e => change("section", e.target.value === "competitions" ? "competitions" : undefined)}><option value="">普通文章</option><option value="competitions">竞赛相关算法</option></select></label></div><label>标签（逗号分隔）<input value={tags} onChange={e => { setTags(e.target.value); setDirty(true); }} placeholder="例如：Java, MySQL" /></label><div className="owner-body-heading"><label htmlFor="owner-body">Markdown 正文</label><button onClick={() => setPreview(value => !value)}>{preview ? "返回编辑" : "预览正文"}</button></div>{preview ? <div className="owner-preview"><ArticleBody text={form.body} lang="zh" /></div> : <textarea id="owner-body" className="owner-body" value={form.body} onChange={e => change("body", e.target.value)} spellCheck={false} placeholder="在这里写正文，支持 Markdown、代码块和数学公式。" />}<details className="owner-extra"><summary>英文版本与文章地址</summary><label>文章 ID（保存后不可修改）<input value={form.id} disabled={!creating} onChange={e => change("id", e.target.value)} /></label><label>英文标题<input value={form.enTitle} onChange={e => change("enTitle", e.target.value)} /></label><label>英文摘要<textarea value={form.enSummary} onChange={e => change("enSummary", e.target.value)} rows={2} /></label><label>英文正文<textarea value={form.enBody} onChange={e => change("enBody", e.target.value)} rows={8} /></label></details>{versions && <section className="owner-history"><h2>最近修改记录</h2>{!versions.length && <p>还没有在线修改记录。</p>}{versions.map(version => <div key={version.revision}><span>版本 {version.revision} · {localDate(version.savedAt).replace("T", " ")}{version.deleted ? " · 已移入回收站" : ""}</span><button onClick={() => { if (!leave()) return; setForm(normalise({ ...version.entry, revision: form.revision })); setTags(version.entry.tags.join(", ")); setDirty(true); setMessage("已载入历史内容，保存后会生成一个新版本。"); }}>载入此版本</button></div>)}</section>}<div className="owner-save-bar"><span>{form.visibility === "private" ? "当前为草稿" : "当前已发布"}{dirty ? " · 未保存" : ""}</span><div>{!creating && <button className="owner-danger" onClick={remove} disabled={busy}><Trash2 size={15} />移入回收站</button>}<button onClick={() => save("private")} disabled={busy}><Save size={15} />{form.visibility === "public" ? "撤下并存为草稿" : "保存草稿"}</button><button className="owner-primary" onClick={() => save("public")} disabled={busy}><Send size={15} />{busy ? "正在保存…" : form.visibility === "public" ? "保存并更新文章" : "发布文章"}</button></div></div>{!creating && form.visibility === "public" && !dirty && <a className="owner-public-link" href={"/entry/" + form.id} target="_blank" rel="noopener noreferrer">查看已发布文章<ArrowUpRight size={14} /></a>}</>}</section></div></main>;
}
