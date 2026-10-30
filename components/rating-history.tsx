import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import { ratingColor, ratingLevels } from "@/lib/rating-colors.mjs";

export type RatingPoint = { id: string; name: string; enName?: string; date: string; oldRating: number; rating: number; rank: number; href: string };
export type Rating = { rating: number | null; maxRating: number | null; history: RatingPoint[]; fetchedAt: string; stale: boolean };
export type RatingsData = Record<"codeforces" | "atcoder", Rating>;

export default function RatingHistory({ data, lang }: { data: RatingsData; lang: "zh" | "en" }) {
    const [platform, setPlatform] = useState<"codeforces" | "atcoder">("codeforces"), [selectedId, setSelectedId] = useState("");
    const t = (zh: string, en: string) => lang === "zh" ? zh : en;
    const history = data[platform].history, selected = history.find(point => point.id === selectedId) || history.at(-1);
    const chart = useRef<SVGSVGElement>(null), [width, setWidth] = useState(680);
    const hasHistory = Boolean(selected);
    useEffect(() => {
        const node = chart.current;
        if (!node) return;
        const resize = () => setWidth(Math.max(260, Math.min(680, node.clientWidth)));
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(node);
        return () => observer.disconnect();
    }, [hasHistory]);
    const date = (value: string, full = false) => new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-GB", { timeZone: "Asia/Shanghai", year: full ? "numeric" : "2-digit", month: "2-digit", day: full ? "2-digit" : undefined }).format(new Date(value));
    const name = (point: RatingPoint) => lang === "en" && point.enName ? point.enName : point.name;
    const low = history.length ? Math.max(0, Math.floor((Math.min(...history.map(point => point.rating)) - 100) / 200) * 200) : 0;
    const maximum = history.length ? Math.max(...history.map(point => point.rating)) : 0;
    const nextLevel = ratingLevels[platform].find(level => level.min > maximum)?.min;
    const high = Math.max(low + 400, Math.ceil(Math.max(maximum + 100, nextLevel === undefined ? 0 : nextLevel + 60) / 200) * 200);
    const start = history.length ? Date.parse(history[0].date) : 0, end = history.length ? Date.parse(history.at(-1)!.date) : 1;
    const x = (point: RatingPoint) => end === start ? (width + 20) / 2 : 50 + (Date.parse(point.date) - start) / (end - start) * (width - 80);
    const y = (rating: number) => 192 - (rating - low) / (high - low) * 164;
    const levels = ratingLevels[platform].filter(level => level.min >= low && level.min <= high);
    const ticks = [low, high].filter(rating => !levels.some(level => Math.abs(y(level.min) - y(rating)) < 18));
    return <section className="rating-history" aria-label={t("Rating 历史曲线", "Rating history")}>
        <div className="rating-history-heading"><h3><TrendingUp size={18} />{t("Rating 历史", "Rating history")}</h3><div className="rating-history-tabs" role="group" aria-label={t("选择竞赛平台", "Select platform")}>
            {(["codeforces", "atcoder"] as const).map(key => <button key={key} aria-pressed={platform === key} className={platform === key ? "selected" : ""} onClick={() => { setPlatform(key); setSelectedId(""); }}>{key === "codeforces" ? "Codeforces" : "AtCoder"}</button>)}
        </div></div>
        {selected ? <>
            <svg ref={chart} className="rating-history-chart" viewBox={`0 0 ${width} 230`} role="img" aria-label={t(`${platform === "codeforces" ? "Codeforces" : "AtCoder"} 的 ${history.length} 场定级比赛，Rating 从 ${history[0].rating} 变化至 ${history.at(-1)!.rating}。下方可选择比赛查看详情。`, `${history.length} rated contests, from ${history[0].rating} to ${history.at(-1)!.rating}. Select a contest below for details.`)}>
                {ticks.map(rating => <g key={rating}><line x1="50" x2={width - 30} y1={y(rating)} y2={y(rating)} className="rating-grid" /><text x="39" y={y(rating) + 4} textAnchor="end">{rating}</text></g>)}
                {levels.map(level => <g key={level.min} className="rating-tier" data-rating={level.min}>
                    <title>{t(`${level.min} 分：颜色等级分界`, `${level.min}: rating color boundary`)}</title>
                    <line x1="50" x2={width - 30} y1={y(level.min)} y2={y(level.min)} stroke={level.color} className="rating-tier-line" />
                    <line x1="43" x2="48" y1={y(level.min)} y2={y(level.min)} stroke={level.color} strokeWidth="2" />
                    <text x="37" y={y(level.min) + 4} textAnchor="end">{level.min}</text>
                </g>)}
                <polyline points={history.map(point => x(point) + "," + y(point.rating)).join(" ")} fill="none" stroke="var(--blue-text)" strokeWidth="2" strokeLinejoin="round" />
                <line x1={x(selected)} x2={x(selected)} y1="23" y2="192" className="rating-cursor" />
                {history.map(point => <g key={point.id} onPointerEnter={() => setSelectedId(point.id)} onClick={() => setSelectedId(point.id)}>
                    <circle cx={x(point)} cy={y(point.rating)} r="12" fill="transparent" className="rating-hit" />
                    <circle cx={x(point)} cy={y(point.rating)} r={point.id === selected.id ? 5 : 3.5} fill={ratingColor(platform, point.rating)} className="rating-point" />
                </g>)}
                <text x="50" y="219">{date(history[0].date)}</text><text x={width - 30} y="219" textAnchor="end">{date(history.at(-1)!.date)}</text>
            </svg>
            <label className="rating-contest-select"><span>{t("选择比赛", "Select contest")}</span><select value={selected.id} onChange={event => setSelectedId(event.target.value)}>{[...history].reverse().map(point => <option key={point.id} value={point.id}>{date(point.date, true)} · {name(point)}</option>)}</select></label>
            <div className="rating-contest-detail" aria-live="polite"><a href={selected.href} target="_blank" rel="noopener noreferrer">{name(selected)}<ArrowUpRight size={14} /></a><div><time dateTime={selected.date}>{date(selected.date, true)}</time><span>{t("名次", "Rank")} {selected.rank}</span><span>{selected.oldRating} → <strong style={{ color: ratingColor(platform, selected.rating) }}>{selected.rating}</strong></span><b className={selected.rating >= selected.oldRating ? "rating-gain" : "rating-loss"}>{selected.rating >= selected.oldRating ? "+" : ""}{selected.rating - selected.oldRating}</b></div></div>
            <p className="rating-history-note">{t("彩色虚线为平台颜色等级分界。仅统计 Rated 比赛，时间为北京时间。", "Colored dashed lines mark rating color boundaries. Rated contests only. Dates use Beijing time.")}{data[platform].stale && " " + t("当前展示上次获取的数据。", "Showing last known data.")}</p>
        </> : <p className="rating-history-note">{t("暂时无法获取比赛历史，请稍后重试或查看平台主页。", "Contest history is unavailable. Try again later or visit the platform profile.")}</p>}
    </section>;
}
