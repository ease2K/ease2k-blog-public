import { bodyFormat, prepareBody } from "@/components/article-body";
import { prepareChangelog, preparePlayground, prepareRatings } from "@/components/page-components";
import { changelogPath } from "@/lib/changelog-meta";
import { awards, type Entry } from "@/lib/content";

export function pageContent(path: string, entry: Entry | undefined, lang: "zh" | "en") {
    const award = path.startsWith("/award/") ? awards.find(item => "/award/" + item.id === path) : undefined;
    const text = entry ? (lang === "en" && entry.enBody || entry.body) : award ? (lang === "en" && award.enDescription || award.description) : "";
    const format = bodyFormat(text);
    return {
        format,
        ratings: path === "/about" || path === "/competitions",
        changelog: path === changelogPath,
        playground: !!entry?.playground,
    } as const;
}

export async function preparePage(content: ReturnType<typeof pageContent>) {
    await Promise.all([
        prepareBody(content.format),
        content.ratings && prepareRatings(),
        content.changelog && prepareChangelog(),
        content.playground && preparePlayground(),
    ]);
}
