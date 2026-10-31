export function excerpt(text: string, limit = 140) {
    if (typeof text !== "string") return "";
    const plain = text.replace(/```[\s\S]*?```/g, " ").replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/<[^>]+>/g, " ").replace(/[#*_`~>|]/g, " ").replace(/\s+/g, " ").trim();
    const characters = Array.from(plain);
    return characters.length > limit ? characters.slice(0, limit).join("") + "…" : plain;
}
export function readingMinutes(text: string) {
    if (typeof text !== "string") return 1;
    const plain = text.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");
    const chinese = plain.match(/[\u3400-\u9fff]/g)?.length || 0;
    const words = plain.replace(/[\u3400-\u9fff]/g, " ").match(/[A-Za-z0-9_]+/g)?.length || 0;
    return Math.max(1, Math.min(10000, Math.ceil(chinese / 350 + words / 200)));
}
