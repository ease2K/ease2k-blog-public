import { renderToPipeableStream } from "react-dom/server";
import { Writable } from "node:stream";
import Blog, { type View } from "../components/blog";
import type { Entry } from "../lib/content";
export function render(initialPath: string, initialData: View, initialEntry: Entry | undefined, initialLang: "zh" | "en"): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        const destination = new Writable({ write(chunk, encoding, done) { chunks.push(Buffer.from(chunk)); done(); } });
        const timer = setTimeout(() => stream.abort(), 5000);
        destination.on("finish", () => { clearTimeout(timer); resolve(Buffer.concat(chunks).toString("utf8")); });
        destination.on("error", error => { clearTimeout(timer); reject(error); });
        const stream = renderToPipeableStream(<Blog initialPath={initialPath} initialData={initialData} initialEntry={initialEntry} initialLang={initialLang} />, {
            onAllReady() { stream.pipe(destination); },
            onShellError(error) { clearTimeout(timer); reject(error); },
            onError() {},
        });
    });
}
