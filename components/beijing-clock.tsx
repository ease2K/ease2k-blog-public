import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";

const timeZone = "Asia/Shanghai";
const desktopTime = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
const mobileTime = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dates = {
    zh: new Intl.DateTimeFormat("zh-CN", { timeZone, year: "numeric", month: "short", day: "numeric" }),
    en: new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "short", day: "numeric" }),
};
const weekdays = {
    zh: new Intl.DateTimeFormat("zh-CN", { timeZone, weekday: "long" }),
    en: new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long" }),
};

export default function BeijingClock({ lang }: { lang: "zh" | "en" }) {
    const [now, setNow] = useState<Date | null>(null);
    const [mobile, setMobile] = useState(false);
    const label = lang === "zh" ? "北京时间" : "Beijing time";
    useEffect(() => {
        const media = matchMedia("(max-width: 540px)");
        let timer: ReturnType<typeof setTimeout>;
        function tick() {
            const current = new Date();
            const interval = media.matches ? 60000 : 1000;
            setNow(current);
            if (!document.hidden) timer = setTimeout(tick, interval - current.getTime() % interval);
        }
        function update() {
            clearTimeout(timer);
            setMobile(media.matches);
            tick();
        }
        update();
        media.addEventListener("change", update);
        document.addEventListener("visibilitychange", update);
        return () => {
            clearTimeout(timer);
            media.removeEventListener("change", update);
            document.removeEventListener("visibilitychange", update);
        };
    }, []);
    return <div className="wrap">
        <section className="clock-banner" aria-label={label}>
            <div className="clock-date">
                <span className="clock-label"><CalendarDays size={14} />{lang === "zh" ? "每一天，都值得记录" : "Every day has a story"}</span>
                <div>{now ? dates[lang].format(now) : "—"}<span className="clock-weekday">{now ? weekdays[lang].format(now) : ""}</span></div>
            </div>
            <div className="clock-time">
                <span className="clock-label"><span className="live-dot" />{label}<small>UTC+8</small></span>
                <time dateTime={now?.toISOString()}>{now ? (mobile ? mobileTime : desktopTime).format(now) : "—:—"}</time>
            </div>
        </section>
    </div>;
}
