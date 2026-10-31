const loaders = {
    cpp: () => import("highlight.js/lib/languages/cpp"), java: () => import("highlight.js/lib/languages/java"),
    javascript: () => import("highlight.js/lib/languages/javascript"), typescript: () => import("highlight.js/lib/languages/typescript"),
    css: () => import("highlight.js/lib/languages/css"), xml: () => import("highlight.js/lib/languages/xml"),
    sql: () => import("highlight.js/lib/languages/sql"), json: () => import("highlight.js/lib/languages/json"), bash: () => import("highlight.js/lib/languages/bash"),
};
const aliases: Record<string, string> = { "c++": "cpp", c: "cpp", cc: "cpp", js: "javascript", ts: "typescript", html: "xml", mysql: "sql", shell: "bash", sh: "bash" };
const pending = new Map<string, Promise<void>>();
export async function highlightLines(code: string, language: string) {
    const lower = language.toLowerCase(), name = Object.hasOwn(aliases, lower) ? aliases[lower] : lower;
    if (!Object.hasOwn(loaders, name) || code.length > 40000) return null;
    const { default: core } = await import("highlight.js/lib/core");
    if (!pending.has(name)) pending.set(name, loaders[name as keyof typeof loaders]().then(module => { core.registerLanguage(name, module.default); }).catch(error => { pending.delete(name); throw error; }));
    await pending.get(name);
    const value = core.highlight(code, { language: name, ignoreIllegals: true }).value;
    const lines: string[] = [], stack: string[] = [];
    let current = "";
    for (const token of value.split(/(<span class="[^"]*">|<\/span>|\n)/g)) {
        if (token === "\n") { lines.push(current + "</span>".repeat(stack.length)); current = stack.join(""); }
        else { current += token; if (token.startsWith('<span class="')) stack.push(token); else if (token === "</span>") stack.pop(); }
    }
    lines.push(current + "</span>".repeat(stack.length));
    return lines;
}
export function emphasisLines(meta: string, count: number) {
    const selected = new Set<number>();
    const body = /\{([\d,\s-]+)\}/.exec(meta)?.[1] || "";
    for (const range of body.split(",")) {
        const match = /^\s*(\d+)(?:\s*-\s*(\d+))?\s*$/.exec(range);
        if (!match) continue;
        const first = Number(match[1]), last = Math.min(Number(match[2] || match[1]), count);
        for (let line = Math.max(1, first); line <= last; line++) selected.add(line);
    }
    return selected;
}
