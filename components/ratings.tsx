import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import snapshot from "@/lib/ratings-snapshot.json";
import { ratingColor } from "@/lib/rating-colors.mjs";
import { profiles } from "@/lib/content";
import RatingHistory, { type RatingsData } from "@/components/rating-history";

const initial: RatingsData = { codeforces: { ...snapshot.codeforces, stale: true }, atcoder: { ...snapshot.atcoder, stale: true } };

export default function Ratings({ lang }: { lang: "zh" | "en" }) {
    const [data, setData] = useState(initial);
    const [loading, setLoading] = useState(true);
    const t = (zh: string, en: string) => lang === "zh" ? zh : en;
    useEffect(() => {
        let stopped = false;
        const controller = new AbortController();
        async function load() {
            try {
                const response = await fetch("/api/ratings", { cache: "no-store", signal: controller.signal });
                if (!response.ok) throw Error();
                const result: RatingsData = await response.json();
                if (!stopped) setData(result);
            } catch {
                if (!stopped) setData(value => ({ codeforces: { ...value.codeforces, stale: true }, atcoder: { ...value.atcoder, stale: true } }));
            } finally { if (!stopped) setLoading(false); }
        }
        load();
        const timer = setInterval(load, 15 * 60 * 1000);
        return () => { stopped = true; controller.abort(); clearInterval(timer); };
    }, []);
    return <section className="contest-ratings" aria-label={t("竞赛 Rating", "Contest ratings")}>
        {(["codeforces", "atcoder"] as const).map(platform => {
            const value = data[platform], label = platform === "codeforces" ? "Codeforces" : "AtCoder";
            const updated = new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-GB", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value.fetchedAt));
            return <a className="rating-card" href={profiles[platform]} key={platform} target="_blank" rel="noopener noreferrer">
                <span className="rating-platform"><img src={platform === "codeforces" ? "/brands/codeforces.ico" : "/brands/atcoder.png"} width="20" height="20" alt="" />{label}<ArrowUpRight size={15} /></span>
                <span className="rating-values"><strong style={{ color: ratingColor(platform, value.rating) }}>{value.rating ?? t("未定级", "Unrated")}</strong><span>Rating</span><small>{t("历史最高", "Peak")} <b style={{ color: ratingColor(platform, value.maxRating) }}>{value.maxRating ?? "—"}</b></small></span>
                <span className="rating-updated">{loading ? t("正在更新…", "Updating…") : value.stale ? t("上次数据", "Last known") : t("更新于", "Updated")} <time dateTime={value.fetchedAt}>{updated}</time> UTC+8</span>
            </a>;
        })}<RatingHistory data={data} lang={lang} />
    </section>;
}
