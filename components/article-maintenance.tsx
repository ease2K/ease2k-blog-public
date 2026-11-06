import { useEffect, useState } from "react";
import { ArrowUpRight, Copy, MessageSquare } from "lucide-react";
import type { Entry } from "@/lib/content";
import { copyText } from "@/lib/clipboard";

export default function ArticleMaintenance({ entry, lang }: { entry: Entry; lang: "zh" | "en" }) {
    const t = (zh: string, en: string) => lang === "zh" ? zh : en;
    const [status, setStatus] = useState("");
    const [origin, setOrigin] = useState("");
    useEffect(() => setOrigin(window.location.origin), []);
    const title = lang === "en" && entry.enTitle ? entry.enTitle : entry.title;
    const body = () => t("文章：", "Article: ") + title + "\n" + origin + "/entry/" + entry.id + "\n" + t("版本：", "Version: ") + (entry.modifiedAt || entry.date) + "\n\n" + t("问题位置：\n问题描述：\n建议修改：", "Location:\nIssue:\nSuggested correction:");
    async function copy() {
        try { await copyText(body()); setStatus(t("已复制，请补充问题描述。", "Copied. Add your description.")); }
        catch { setStatus(t("复制失败，请手动复制文章地址。", "Copy failed. Copy the article URL manually.")); }
    }
    return <section className="article-maintenance">{entry.modifiedAt && <p className="article-update"><strong>{t("更新说明", "Update note")}</strong>{lang === "en" && entry.enUpdateNote ? entry.enUpdateNote : entry.updateNote}</p>}{entry.environment && <p><strong>{t("示例环境", "Example environment")}</strong>{entry.environment}</p>}<details className="article-correction"><summary><MessageSquare size={16} />{t("发现错误或有补充？", "Found an issue or something to add?")}</summary><p>{t("请附上文章位置与问题描述，通过 GitHub 提交纠错。", "Include the article location and a description when reporting an issue on GitHub.")}</p><div><a href={"https://github.com/ease2K/ease2k-blog-public/issues/new?title=" + encodeURIComponent(t("文章纠错：", "Article correction: ") + title) + "&body=" + encodeURIComponent(body())} target="_blank" rel="noopener noreferrer">{t("前往 GitHub 纠错", "Report on GitHub")}<ArrowUpRight size={14} /></a><button onClick={copy}><Copy size={14} />{t("复制纠错信息", "Copy report details")}</button></div><p role="status">{status}</p></details></section>;
}
