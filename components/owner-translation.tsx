import { useEffect, useRef, useState } from "react";
import { Languages, Square, Check, X, ChevronDown } from "lucide-react";
import ArticleBody from "@/components/article-body";
import { excerpt } from "@/lib/writing";
import type { Entry } from "@/lib/content";
import type { TranslationDirection, TranslationFields } from "@/lib/translation";

type Translator = { translate: (text: string, options?: { signal?: AbortSignal }) => Promise<string>; destroy: () => void };
type TranslatorAPI = { availability: (options: { sourceLanguage: string; targetLanguage: string }) => Promise<string>; create: (options: { sourceLanguage: string; targetLanguage: string; signal?: AbortSignal; monitor: (monitor: EventTarget) => void }) => Promise<Translator> };
const browserAPI = () => {
    const api = (globalThis as unknown as { Translator?: TranslatorAPI }).Translator;
    return typeof api?.availability === "function" && typeof api.create === "function" ? api : undefined;
};
function untilCancelled<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
    return new Promise((resolve, reject) => {
        const abort = () => reject(new DOMException("翻译已取消", "AbortError"));
        if (signal.aborted) abort(); else signal.addEventListener("abort", abort, { once: true });
        promise.then(value => { signal.removeEventListener("abort", abort); resolve(value); }, error => { signal.removeEventListener("abort", abort); reject(error); });
    });
}
export function translationFingerprint(entry: Entry) { return JSON.stringify([entry.id, entry.title, entry.summary, entry.body, entry.enTitle, entry.enSummary, entry.enBody]); }
export default function OwnerTranslation({ entry, disabled, open, toggle, busyChanged, pendingChanged, apply }: { entry: Entry; disabled: boolean; open: boolean; toggle: (open: boolean) => void; busyChanged: (busy: boolean) => void; pendingChanged: (pending: boolean) => void; apply: (value: TranslationFields, direction: TranslationDirection, fingerprint: string) => boolean }) {
    const [direction, setDirection] = useState<TranslationDirection>("zh-en"), [availability, setAvailability] = useState("checking"), [running, setRunning] = useState(false);
    const [status, setStatus] = useState(""), [error, setError] = useState(""), [formatted, setFormatted] = useState(false);
    const [check, setCheck] = useState(0);
    const [result, setResult] = useState<{ fields: TranslationFields; direction: TranslationDirection; fingerprint: string } | null>(null);
    const task = useRef<AbortController | null>(null), current = useRef(true);
    const pair = direction === "zh-en" ? { sourceLanguage: "zh", targetLanguage: "en" } : { sourceLanguage: "en", targetLanguage: "zh" };
    useEffect(() => {
        current.current = true;
        return () => { current.current = false; const active = !!task.current; task.current?.abort(); if (active) busyChanged(false); pendingChanged(false); };
    }, []);
    useEffect(() => { pendingChanged(!!result); }, [result]);
    useEffect(() => {
        let active = true; setAvailability("checking");
        const api = browserAPI();
        if (!globalThis.isSecureContext) { setAvailability("insecure"); return; }
        if (!api) { setAvailability("unsupported"); return; }
        const timer = setTimeout(() => { if (active) { active = false; setAvailability("error"); } }, 10000);
        void Promise.resolve().then(() => api.availability(pair)).then(value => {
            if (active) setAvailability(["available", "downloadable", "downloading", "unavailable"].includes(value) ? value : "error");
        }).catch(() => { if (active) setAvailability("error"); }).finally(() => clearTimeout(timer));
        return () => { active = false; clearTimeout(timer); };
    }, [direction, open, check]);
    useEffect(() => {
        const refresh = () => { if (open && !running && !result) setCheck(value => value + 1); };
        window.addEventListener("focus", refresh);
        return () => window.removeEventListener("focus", refresh);
    }, [open, running, result]);
    function discard() { setResult(null); setError(""); setStatus(""); }
    async function start() {
        const api = browserAPI(); if (!api || running || disabled) return;
        const source = direction === "zh-en" ? { title: entry.title, summary: entry.summary || excerpt(entry.body), body: entry.body } : { title: entry.enTitle, summary: entry.enSummary || excerpt(entry.enBody), body: entry.enBody };
        if (!source.title.trim() || !source.body.trim()) { setError(direction === "zh-en" ? "请先填写中文标题和正文。" : "请先填写英文标题和正文。"); return; }
        const fingerprint = translationFingerprint(entry), controller = new AbortController(); task.current = controller;
        setRunning(true); busyChanged(true); setResult(null); setError(""); setStatus("正在准备本机语言包，首次使用可能需要下载…");
        let translator: Translator | undefined;
        try {
            // Start during the user's click; Chrome requires activation for language downloads.
            const pending = api.create({ ...pair, signal: controller.signal, monitor(monitor) { monitor.addEventListener("downloadprogress", event => { if (current.current && !controller.signal.aborted) setStatus("正在下载语言包 " + Math.round((event as Event & { loaded: number }).loaded * 100) + "%…"); }); } }).then(value => { translator = value; if (controller.signal.aborted || !current.current) value.destroy(); else setStatus("语言包已就绪，正在准备文章翻译…"); return value; });
            const [module] = await untilCancelled(Promise.all([import("@/lib/translation"), pending]), controller.signal);
            const fields = await untilCancelled(module.translateArticle(source, text => translator!.translate(text, { signal: controller.signal }), direction, { signal: controller.signal, progress: message => { if (current.current && !controller.signal.aborted) setStatus(message); } }), controller.signal);
            if (current.current && !controller.signal.aborted) { setResult({ fields, direction, fingerprint }); setFormatted(false); setStatus("译文已生成。请检查后应用到编辑草稿。"); }
        } catch (err) {
            if (!current.current) return;
            if (controller.signal.aborted || (err as Error).name === "AbortError") setStatus("翻译已取消，文章内容未改动。");
            else { setError("本机翻译未完成：" + (err as Error).message + "。可检查网络、语言包或 Chrome 设置后重试。"); setStatus(""); }
        } finally { controller.abort(); try { translator?.destroy(); } catch {} if (task.current === controller) task.current = null; if (current.current) { setRunning(false); busyChanged(false); } }
    }
    const ready = ["available", "downloadable", "downloading"].includes(availability);
    const notice = availability === "insecure" ? "请从网站的 HTTPS 地址打开工作台，再使用文章自动翻译。" : availability === "unsupported" ? "当前浏览器没有提供本机翻译。请使用桌面版 Chrome 打开此工作台。" : availability === "unavailable" ? "当前浏览器暂时无法使用中英文语言包，请检查 Chrome 的翻译设置后重新检测。" : availability === "error" ? "未能完成语言包检测，请重新检测后重试。" : availability === "downloadable" ? "中英文自动翻译可用，首次生成时会下载本机语言包。" : availability === "downloading" ? "语言包正在下载，可以继续生成译文并查看下载进度。" : availability === "available" ? "本机语言包已就绪，可以生成译文预览。" : "正在检测中英文语言包…";
    const stale = !!result && result.fingerprint !== translationFingerprint(entry);
    function edit(key: keyof TranslationFields, value: string) { setResult(result => result ? { ...result, fields: { ...result.fields, [key]: value } } : result); }
    return <details className="owner-extra owner-translation" open={open} onToggle={event => toggle(event.currentTarget.open)}><summary><Languages size={16} />中英文自动翻译<ChevronDown className="translation-chevron" size={15} aria-hidden="true" /></summary><p className="owner-upload-hint">在这台电脑的 Chrome 中处理标题、摘要和正文；代码及其中的注释、公式、图片和链接地址保持原样。首次使用需下载语言包。</p><p className="owner-translation-status" role="status">{notice}</p><div className="owner-translation-actions"><label>翻译方向<select value={direction} disabled={disabled || running || !!result} onChange={event => setDirection(event.target.value as TranslationDirection)}><option value="zh-en">中文 → 英文</option><option value="en-zh">英文 → 中文</option></select></label><button className="owner-primary" disabled={disabled || running || !ready || !!result} onClick={() => void start()}><Languages size={15} />{availability === "checking" ? "正在检查浏览器…" : "生成译文预览"}</button>{running && <button onClick={() => task.current?.abort()}><Square size={14} />取消翻译</button>}<button disabled={disabled || running || availability === "checking"} onClick={() => setCheck(value => value + 1)}>重新检测</button></div><p className="owner-auto-status" role="status">{status}</p>{error && <p className="owner-error" role="alert">{error}</p>}{result && <section className="owner-translation-preview"><h3>{result.direction === "zh-en" ? "英文译文预览" : "中文译文预览"}</h3><p className="owner-upload-hint">可以先修改译文。应用后会覆盖对应语言的编辑内容，公开文章在保存或发布前保持原样。</p>{stale && <p className="owner-error" role="alert">原文或目标语言内容已改变，请丢弃这份预览后重新翻译。</p>}<label>译文标题<input value={result.fields.title} onChange={event => edit("title", event.target.value)} /></label><label>译文摘要<textarea rows={3} value={result.fields.summary} onChange={event => edit("summary", event.target.value)} /></label><div className="owner-body-heading"><label htmlFor="translation-body">译文正文</label><button onClick={() => setFormatted(value => !value)}>{formatted ? "编辑译文" : "查看排版"}</button></div>{formatted ? <div className="owner-preview"><ArticleBody text={result.fields.body} lang={result.direction === "zh-en" ? "en" : "zh"} owner /></div> : <textarea id="translation-body" className="owner-translated-body" value={result.fields.body} onChange={event => edit("body", event.target.value)} spellCheck={false} />}<div className="owner-translation-confirm"><button onClick={discard}><X size={15} />丢弃预览</button><button className="owner-primary" disabled={disabled || stale} onClick={() => { if (result.fields.title.length > 240 || result.fields.summary.length > 2000 || result.fields.body.length > 700000 || !result.fields.title.trim() || !result.fields.body.trim()) { setError("请检查译文：标题 1～240 字符，摘要最多 2000 字符，正文 1～700000 字符。"); return; } if (!apply(result.fields, result.direction, result.fingerprint)) return; setResult(null); setStatus("译文已应用，请保存草稿或发布文章。"); }}><Check size={15} />应用到编辑草稿</button></div></section>}</details>;
}
