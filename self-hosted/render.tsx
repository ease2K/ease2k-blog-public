import { renderToString } from "react-dom/server";
import Blog, { type View } from "../components/blog";
import { pageContent, preparePage } from "./page-content";
import type { Entry } from "../lib/content";
export { pageContent };
export { changelogCopy, changelogPath } from "../lib/changelog-meta";

export async function render(initialPath: string, initialData: View, initialEntry: Entry | undefined, initialLang: "zh" | "en"): Promise<string> {
    await preparePage(pageContent(initialPath, initialEntry, initialLang));
    return renderToString(<Blog initialPath={initialPath} initialData={initialData} initialEntry={initialEntry} initialLang={initialLang} />);
}
