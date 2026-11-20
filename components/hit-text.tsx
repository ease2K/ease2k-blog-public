export default function HitText({ text, query }: { text: string; query: string }) {
    const value = query.trim().toLowerCase().slice(0, 200), parts: React.ReactNode[] = [];
    if (!value) return <>{text}</>;
    let start = 0, index = text.toLowerCase().indexOf(value);
    while (index >= 0) { parts.push(text.slice(start, index), <mark key={index}>{text.slice(index, index + value.length)}</mark>); start = index + value.length; index = text.toLowerCase().indexOf(value, start); }
    parts.push(text.slice(start)); return <>{parts}</>;
}
