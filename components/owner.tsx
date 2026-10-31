import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, Download, FilePlus2, History, LockKeyhole, LogOut, RotateCcw, Save, Send, Trash2, ImagePlus } from "lucide-react";
import OwnerLibrary, { uploadResource, type SeriesRecord } from "@/components/owner-library";
import OwnerTranslation, { translationFingerprint } from "@/components/owner-translation";
import Playground from "@/components/playground";
import { starterPlayground } from "@/lib/playground";
import ArticleBody from "@/components/article-body";
import { technologyTopics, type Entry } from "@/lib/content";
import { readingMinutes } from "@/lib/writing";

type Item = Entry & { revision: number; updatedAt?: string; publishedAt?: string | null };
type Draft = { entry: Item; baseRevision: number; creating: boolean; revision: number; savedAt: string };
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
    const [translating, setTranslating] = useState(false);
    const [translationOpen, setTranslationOpen] = useState(false), [translationPending, setTranslationPending] = useState(false), [englishOpen, setEnglishOpen] = useState(false);
    const translationArea = useRef<HTMLDivElement>(null);
    const [workspace, setWorkspace] = useState("articles"), [panelDirty, setPanelDirty] = useState(false), [registered, setRegistered] = useState<SeriesRecord[]>([]);
    const [session, setSession] = useState<Session | null>(null), [password, setPassword] = useState("");
    const [entries, setEntries] = useState<Item[]>([]), [trash, setTrash] = useState<Item[]>([]);
    const [form, setForm] = useState<Item | null>(null), [creating, setCreating] = useState(false), [dirty, setDirty] = useState(false);
    const [tags, setTags] = useState(""), [query, setQuery] = useState(""), [view, setView] = useState("all");
    const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
    const [preview, setPreview] = useState(false), [versions, setVersions] = useState<Version[] | null>(null);
    const [draftSaved, setDraftSaved] = useState(false);
    const [drafts, setDrafts] = useState<Draft[]>([]), [localDrafts, setLocalDrafts] = useState<Draft[]>([]), [autoStatus, setAutoStatus] = useState("");
    const latestDraft = useRef("");
    const draftRevision = useRef(0), generation = useRef(0), autoPending = useRef<Promise<unknown> | null>(null);
    const bodyField = useRef<HTMLTextAreaElement>(null), fileField = useRef<HTMLInputElement>(null);
    function remember(draft: Draft) {
        try { localStorage.setItem("ease2k:working:" + draft.entry.id, JSON.stringify(draft)); }
        catch { setAutoStatus("浏览器暂不能保留恢复副本，请及时手动保存。"); }
    }
    function forget(id: string) {
        try { localStorage.removeItem("ease2k:working:" + id); } catch {}
        setLocalDrafts(current => current.filter(draft => draft.entry.id !== id));
    }
    useEffect(() => {
        if (!session?.authenticated) return;
        const recovered: Draft[] = [];
        try {
            for (let index = 0; index < localStorage.length; index++) {
                const key = localStorage.key(index);
                if (key?.startsWith("ease2k:working:")) {
                    try { const value = JSON.parse(localStorage.getItem(key) || "null"); if (value?.entry?.id && typeof value.entry.body === "string" && typeof value.entry.title === "string" && Array.isArray(value.entry.tags)) recovered.push(value); } catch {}
                }
            }
        } catch {}
        setLocalDrafts(recovered);
    }, [session?.authenticated]);
    useEffect(() => {
        if (!session?.authenticated || !form || !dirty || busy) return;
        const entry = { ...form, tags: tags.split(/[,，]/).map(tag => tag.trim()).filter(Boolean) };
        const current = generation.current, signature = JSON.stringify(entry); latestDraft.current = signature;
        remember({ entry, baseRevision: form.revision, creating, revision: draftRevision.current, savedAt: new Date().toISOString() });
        setAutoStatus("有修改，等待自动保存…");
        const timer = setTimeout(() => {
            const task = async () => {
                if (autoPending.current) await autoPending.current.catch(() => {});
                if (current !== generation.current) return;
                setAutoStatus("正在自动保存编辑草稿…");
                const result = await api("/drafts/" + form.id, "PUT", { entry, baseRevision: form.revision, creating, revision: draftRevision.current });
                if (current === generation.current) {
                    draftRevision.current = result.draft.revision;
                    setDrafts(values => [result.draft, ...values.filter(value => value.entry.id !== form.id)]);
                    if (latestDraft.current === signature) { setDraftSaved(true); setAutoStatus("编辑草稿已自动保存 · " + localDate(result.draft.savedAt).slice(11)); }
                }
            };
            const pending = task(); autoPending.current = pending;
            pending.catch(err => { if (current === generation.current) setAutoStatus("自动保存失败：" + err.message + " 浏览器已保留恢复副本。"); }).finally(() => { if (autoPending.current === pending) autoPending.current = null; });
        }, 1200);
        return () => clearTimeout(timer);
    }, [form, tags, dirty, busy, session?.authenticated]);
    function recover(draft: Draft) {
        if (!leave()) return;
        const original = entries.find(entry => entry.id === draft.entry.id);
        generation.current++;
        const saved = drafts.find(value => value.entry.id === draft.entry.id);
        draftRevision.current = saved?.revision || 0;
        setForm(normalise({ ...draft.entry, revision: original?.revision || 0, publishedAt: original?.publishedAt || null }));
        setTags(draft.entry.tags.join(", ")); setCreating(!original); setDirty(true); setDraftSaved(false); setPreview(false); setVersions(null); setError("");
        setMessage("已恢复编辑副本。已发布文章保持原样，点击发布或更新后才会公开修改。");
    }
    async function uploadImages(files: File[]) {
        if (!form || busy || !files.length) return;
        const id = form.id, before = form.body, start = bodyField.current?.selectionStart ?? before.length, end = bodyField.current?.selectionEnd ?? start;
        setBusy(true); setError("");
        try {
            const links: string[] = [];
            for (const file of files.slice(0, 6)) {
                const result = await uploadResource(file, session?.csrf || "");
                links.push("![图片说明](" + result.url + ")");
            }
            setForm(current => current?.id === id ? { ...current, body: current.body === before ? before.slice(0, start) + "\n\n" + links.join("\n\n") + "\n\n" + before.slice(end) : current.body + "\n\n" + links.join("\n\n") } : current);
            setDirty(true); setDraftSaved(false); setMessage("图片已压缩并插入正文。发布文章后，访客才能读取图片。");
        } catch (err) { setError((err as Error).message); }
        finally { setBusy(false); if (fileField.current) fileField.current.value = ""; }
    }
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
        setRegistered(data.series || []); setEntries(data.entries.map(normalise)); setTrash(data.trash.map(normalise)); setDrafts(data.drafts || []);
    }
    async function refresh() {
        const current: Session = await api("/session");
        setSession(current);
        if (current.authenticated) await load();
    }
    useEffect(() => { refresh().catch(err => setError(err.message)); }, []);
    useEffect(() => {
        const warn = (event: BeforeUnloadEvent) => { if ((dirty && !draftSaved) || panelDirty || translationPending) { event.preventDefault(); event.returnValue = ""; } };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty, draftSaved, panelDirty, translationPending]);
    const leave = () => (!translationPending && (!dirty || draftSaved)) || window.confirm("当前有尚未保存的修改或未应用的译文，继续后会放弃这些内容。是否继续？");
    function choose(entry: Item, fresh = false) {
        if (!leave()) return;
        generation.current++; draftRevision.current = drafts.find(value => value.entry.id === entry.id)?.revision || 0; setAutoStatus("");
        setTranslationOpen(false); setEnglishOpen(false); setForm(normalise(entry)); setTags(entry.tags.join(", ")); setCreating(fresh); setDirty(false); setDraftSaved(false); setVersions(null); setPreview(false); setMessage(""); setError("");
    }
    function create() {
        choose({ id: crypto.randomUUID(), kind: "article", title: "", enTitle: "", summary: "", enSummary: "", body: "", enBody: "", date: "", publishedAt: null, tags: [], read: 1, visibility: "private", revision: 0 }, true);
    }
    function change<K extends keyof Item>(key: K, value: Item[K]) {
        setForm(current => current ? { ...current, [key]: value } : current); setDirty(true); setDraftSaved(false); setMessage("");
    }
    async function login(event: FormEvent) {
        event.preventDefault(); setBusy(true); setError("");
        try { await api("/login", "POST", { password }); await refresh(); }
        catch (err) { setError((err as Error).message); }
        finally { setPassword(""); setBusy(false); }
    }
    async function save(visibility: "public" | "private") {
        if (!form) return;
        if (translationPending) { setError("请先应用或丢弃译文预览，再保存文章。"); return; }
        setBusy(true); setError(""); setMessage("");
        try {
            await autoPending.current?.catch(() => {});
            const entry = { ...form, visibility, tags: tags.split(/[,，]/).map(tag => tag.trim()).filter(Boolean) };
            const result = await api("/entries/" + form.id, "PUT", { entry, revision: form.revision, create: creating });
            generation.current++; forget(form.id); draftRevision.current = 0; setAutoStatus("");
            setForm(normalise(result.entry)); setCreating(false); setDirty(false); setDraftSaved(false); setVersions(null);
            await load(); setMessage(visibility === "public" ? "文章已发布，访客刷新页面即可看到。" : "草稿已保存，仅站主可见。");
        } catch (err) { setError((err as Error).message); }
        finally { setBusy(false); }
    }
    async function remove() {
        if (!form || !window.confirm("将这篇文章移入回收站？之后可以恢复为草稿。")) return;
        setBusy(true); setError("");
        try { await autoPending.current?.catch(() => {}); await api("/entries/" + form.id, "DELETE", { revision: form.revision }); generation.current++; forget(form.id); setForm(null); setDirty(false); await load(); setMessage("文章已移入回收站。"); }
        catch (err) { setError((err as Error).message); }
        finally { setBusy(false); }
    }
    async function restore(entry: Item) {
        if (!leave()) return;
        setBusy(true); setError("");
        try { await autoPending.current?.catch(() => {}); generation.current++; draftRevision.current = 0; setAutoStatus(""); const result = await api("/entries/" + entry.id + "/restore", "POST", { revision: entry.revision }); setForm(normalise(result.entry)); setTags(result.entry.tags.join(", ")); setCreating(false); setDirty(false); setView("draft"); setVersions(null); await load(); setMessage("文章已恢复为草稿，确认内容后可以重新发布。"); }
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
        try { await autoPending.current?.catch(() => {}); await api("/logout", "POST", {}); generation.current++; setSession(current => current ? { ...current, authenticated: false, csrf: undefined } : current); setForm(null); setDirty(false); setEntries([]); setTrash([]); }
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
    const catalog = registered.map(group => ({ ...group, chapters: entries.filter(entry => entry.series?.id === group.id) }));
    function chooseSeries(id: string) {
        if (!form) return;
        if (!id) { change("series", undefined); return; }
        if (id === "new") { setWorkspace("series"); return; }
        const group = catalog.find(series => series.id === id);
        if (group) { const { chapters, chapterOrder, revision, updatedAt, ...info } = group; change("series", { ...info, order: form.series?.id === id ? form.series.order : Math.max(0, ...chapters.map(entry => entry.series!.order)) + 1 }); }
    }
    const filtered = (view === "trash" ? trash : entries).filter(entry => (view === "all" || view === "trash" || (view === "draft" ? entry.visibility === "private" : entry.visibility === "public")) && (entry.title + " " + entry.id).toLowerCase().includes(query.toLowerCase())).sort((a, b) => (b.updatedAt || b.date).localeCompare(a.updatedAt || a.date));
    return <main className="owner-shell"><header className="owner-header"><a className="owner-brand" href="/">ease2k <span>站主工作台</span></a><div><button onClick={exportBackup}><Download size={16} />导出文章 JSON</button><button onClick={logout}><LogOut size={16} />退出登录</button></div></header><nav className="owner-workspaces" aria-label="工作台功能">{[["articles", "文章"], ["series", "专栏"], ["media", "图片库"]].map(([key, label]) => <button key={key} disabled={busy} aria-current={workspace === key ? "page" : undefined} onClick={() => { if (workspace !== key && (!(panelDirty || translationPending) || window.confirm("有尚未保存的管理修改或未应用的译文，放弃这些内容？"))) setWorkspace(key); }}>{label}</button>)}</nav>{workspace !== "articles" ? <OwnerLibrary key={workspace} active={workspace} api={api} csrf={session.csrf || ""} entries={entries} canReplace={!dirty} dirtyChanged={setPanelDirty} changed={async () => { await load(); const data = await api("/entries"); if (!dirty && form) { const fresh = data.entries.find((entry: Item) => entry.id === form.id); if (fresh) { generation.current++; setForm(normalise(fresh)); setTags(fresh.tags.join(", ")); } } }} insert={url => { if (!form) { setError("请先选择或新建文章，再从图片库插入图片。"); setWorkspace("articles"); return; } change("body", form.body + "\n\n![图片描述](" + url + ")\n"); setWorkspace("articles"); setMessage("图片已插入正文末尾。请修改图片描述后保存。"); }} /> : <div className="owner-layout"><aside className="owner-sidebar"><button className="owner-primary" onClick={create} disabled={busy}><FilePlus2 size={17} />新建文章</button><input aria-label="搜索文章" placeholder="搜索标题或 ID" value={query} onChange={e => setQuery(e.target.value)} /><div className="owner-filters">{[["all", "全部"], ["public", "已发布"], ["draft", "草稿"], ["trash", "回收站"]].map(([key, label]) => <button key={key} className={view === key ? "active" : ""} onClick={() => setView(key)}>{label}</button>)}</div><p className="owner-count">{filtered.length} 篇记录</p>{[...localDrafts, ...drafts.filter(draft => !localDrafts.some(local => local.entry.id === draft.entry.id))].filter(draft => (draft.entry.title + draft.entry.id).toLowerCase().includes(query.toLowerCase())).length > 0 && <section className="owner-recovery"><h2>可恢复的编辑草稿</h2>{[...localDrafts, ...drafts.filter(draft => !localDrafts.some(local => local.entry.id === draft.entry.id))].filter(draft => (draft.entry.title + draft.entry.id).toLowerCase().includes(query.toLowerCase())).map(draft => <button key={draft.entry.id} onClick={() => recover(draft)} disabled={busy}><RotateCcw size={14} /><span>{draft.entry.title || "未命名文章"}<small>{localDate(draft.savedAt).replace("T", " ")}</small></span></button>)}</section>}<div className="owner-entry-list">{filtered.map(entry => <div key={entry.id} className={"owner-entry " + (form?.id === entry.id ? "active" : "")}><button onClick={() => { if (view !== "trash") choose(entry); }} disabled={busy || view === "trash"}><strong>{entry.title}</strong><span>{view === "trash" ? "已删除" : entry.visibility === "private" ? "草稿" : "已发布"} · {localDate(entry.date).replace("T", " ")}</span></button>{view === "trash" && <button className="owner-restore" onClick={() => restore(entry)} disabled={busy}><RotateCcw size={14} />恢复为草稿</button>}</div>)}</div></aside><section className="owner-editor">{error && <p className="owner-error" role="alert">{error}</p>}{message && <p className="owner-success" role="status">{message}</p>}{!form ? <div className="owner-empty"><FilePlus2 size={34} /><h1>从一篇新记录开始</h1><p>选择左侧文章继续编辑，或新建一篇文章。草稿只对你可见。</p><button className="owner-primary" onClick={create}>新建文章</button></div> : <><div className="owner-editor-heading"><div><p>{creating ? "新文章" : "正在编辑"} · {draftSaved ? "编辑草稿已保存" : creating ? "尚未保存" : dirty ? "有修改" : "内容已保存"}</p><h1>{form.title || "未命名文章"}</h1></div>{!creating && <button onClick={history}><History size={16} />修改记录</button>}</div><label>标题<input disabled={busy} value={form.title} onChange={e => change("title", e.target.value)} maxLength={240} placeholder="给这篇文章起个标题" /></label><label>摘要<textarea disabled={busy} value={form.summary} onChange={e => change("summary", e.target.value)} maxLength={2000} rows={2} placeholder="可留空，保存时从正文自动生成" /></label><div className="owner-fields"><label>类型<select disabled={busy} value={form.kind} onChange={e => change("kind", e.target.value as Entry["kind"])}><option value="article">文章</option><option value="daily">日常</option><option value="project">项目</option></select></label><label>发布时间（北京时间）<input readOnly value={form.publishedAt ? localDate(form.publishedAt).replace("T", " ") : "首次发布时自动记录"} /></label><label>预计阅读分钟<input readOnly value={readingMinutes(form.body) + " 分钟（自动估算）"} /></label><label>分区<select disabled={busy} value={form.section || ""} onChange={e => change("section", e.target.value === "competitions" ? "competitions" : undefined)}><option value="">普通文章</option><option value="competitions">竞赛相关算法</option></select></label></div><label>标签（逗号分隔）<input disabled={busy} value={tags} onChange={e => { setTags(e.target.value); setDirty(true); setDraftSaved(false); }} placeholder={"例如：" + technologyTopics.join(", ")} /></label><details className="owner-extra owner-series"><summary>系列文章（可选）</summary><label>所属系列<select disabled={busy} value={form.series?.id || ""} onChange={event => chooseSeries(event.target.value)}><option value="">不加入系列</option>{catalog.map(series => <option key={series.id} value={series.id}>{series.title || "未命名系列"}</option>)}{form.series && !catalog.some(series => series.id === form.series!.id) && <option value={form.series.id}>{form.series.title || "正在创建的系列"}</option>}<option value="new">新建系列…</option></select></label>{form.series && <p className="owner-upload-hint">介绍、封面和章节顺序在专栏管理中统一维护。<button disabled={busy} onClick={() => setWorkspace("series")}>管理专栏</button></p>}</details><div className="owner-body-heading"><label htmlFor="owner-body">Markdown 正文</label><div><input ref={fileField} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/avif" multiple aria-label="选择文章图片" onChange={e => void uploadImages(Array.from(e.target.files || []))} /><button onClick={() => fileField.current?.click()} disabled={busy}><ImagePlus size={15} />添加图片</button><button disabled={busy} onClick={() => { setTranslationOpen(true); translationArea.current?.scrollIntoView({ block: "start" }); }}>中英翻译</button><button onClick={() => setPreview(value => !value)}>{preview ? "返回编辑" : "预览正文"}</button></div></div><p className="owner-upload-hint">支持粘贴截图或拖入图片；上传时自动压缩。</p>{preview ? <div className="owner-preview"><ArticleBody text={form.body} lang="zh" owner /></div> : <textarea disabled={busy} id="owner-body" ref={bodyField} onPaste={event => { const files = Array.from(event.clipboardData.files); if (files.length) { event.preventDefault(); void uploadImages(files); } }} onDragOver={event => { if (event.dataTransfer.types.includes("Files")) event.preventDefault(); }} onDrop={event => { const files = Array.from(event.dataTransfer.files); if (files.length) { event.preventDefault(); void uploadImages(files); } }} className="owner-body" value={form.body} onChange={e => change("body", e.target.value)} spellCheck={false} placeholder="在这里写正文，支持 Markdown、代码块和数学公式。" />}<details className="owner-extra"><summary>在线前端示例（可选）</summary><label className="owner-checkbox"><input disabled={busy} type="checkbox" checked={!!form.playground} onChange={event => change("playground", event.target.checked ? { ...starterPlayground } : undefined)} />为文章附加 HTML、CSS、JavaScript 示例</label>{form.playground && <><p className="owner-upload-hint">示例代码随文章和编辑草稿保存，发布后读者可以修改并运行自己的副本。</p><Playground disabled={busy} key={form.id} initial={form.playground} lang="zh" onChange={value => { if (!busy) change("playground", value); }} /></>}</details><div ref={translationArea}><OwnerTranslation key={form.id} entry={form} disabled={busy} open={translationOpen} toggle={setTranslationOpen} busyChanged={value => { setBusy(value); setTranslating(value); }} pendingChanged={setTranslationPending} apply={(value, direction, fingerprint) => { if (translationFingerprint(form) !== fingerprint) { setError("文章已改变，请重新生成译文。"); return false; } latestDraft.current = ""; setForm({ ...form, ...(direction === "zh-en" ? { enTitle: value.title, enSummary: value.summary, enBody: value.body } : value) }); setDirty(true); setDraftSaved(false); setMessage("译文已应用到编辑内容，检查后保存或发布即可。代码、公式和链接地址保持原样。"); if (direction === "zh-en") setEnglishOpen(true); return true; }} /></div><details className="owner-extra" open={englishOpen} onToggle={event => setEnglishOpen(event.currentTarget.open)}><summary>英文版本与文章地址</summary><label>文章 ID（保存后不可修改）<input value={form.id} disabled={busy || !creating || dirty} onChange={e => { if (form.id !== e.target.value) forget(form.id); change("id", e.target.value); }} /></label><label>英文标题<input disabled={busy} value={form.enTitle} onChange={e => change("enTitle", e.target.value)} /></label><label>英文摘要<textarea disabled={busy} value={form.enSummary} onChange={e => change("enSummary", e.target.value)} rows={2} /></label><label>英文正文<textarea disabled={busy} value={form.enBody} onChange={e => change("enBody", e.target.value)} rows={8} /></label></details>{versions && <section className="owner-history"><h2>最近修改记录</h2>{!versions.length && <p>还没有在线修改记录。</p>}{versions.map(version => <div key={version.revision}><span>版本 {version.revision} · {localDate(version.savedAt).replace("T", " ")}{version.deleted ? " · 已移入回收站" : ""}</span><button onClick={() => { if (!leave()) return; setForm(normalise({ ...version.entry, revision: form.revision, publishedAt: form.publishedAt })); setTags(version.entry.tags.join(", ")); setDirty(true); setDraftSaved(false); setMessage("已载入历史内容，保存后会生成一个新版本。"); }}>载入此版本</button></div>)}</section>}<p className="owner-auto-status" role="status">{autoStatus}</p><div className="owner-save-bar"><span>{form.visibility === "private" ? "当前为草稿" : "当前已发布"}{dirty ? draftSaved ? " · 编辑草稿已保存" : " · 有修改" : ""}</span><div>{!creating && <button className="owner-danger" onClick={remove} disabled={busy}><Trash2 size={15} />移入回收站</button>}<button onClick={() => save("private")} disabled={busy}><Save size={15} />{form.visibility === "public" ? "撤下并存为草稿" : "保存草稿"}</button><button className="owner-primary" onClick={() => save("public")} disabled={busy}><Send size={15} />{busy ? translating ? "正在翻译…" : "正在保存…" : form.visibility === "public" ? "保存并更新文章" : "发布文章"}</button></div></div>{!creating && form.visibility === "public" && !dirty && <a className="owner-public-link" href={"/entry/" + form.id} target="_blank" rel="noopener noreferrer">查看已发布文章<ArrowUpRight size={14} /></a>}</>}</section></div>}</main>;
}
