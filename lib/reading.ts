import { useCallback, useEffect, useRef, useState } from "react";

export type ReadingRecord = { seriesId: string; heading: string; headingText: string; completed: boolean; visitedAt: number };
export type ReadingData = Record<string, ReadingRecord>;
const key = "ease2k:reading:v1";
export function parseReading(text: string | null): ReadingData {
    try {
        const value = JSON.parse(text || "null");
        if (value?.version !== 1 || !value.entries || typeof value.entries !== "object" || Array.isArray(value.entries)) return {};
        const entries: ReadingData = {};
        for (const [id, record] of Object.entries(value.entries).slice(-500)) {
            const item = record as Partial<ReadingRecord> | null;
            if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(id) || !item || typeof item.seriesId !== "string" || item.seriesId.length > 80 || typeof item.heading !== "string" || !/^(?:section-\d+)?$/.test(item.heading) || typeof item.headingText !== "string" || item.headingText.length > 500 || typeof item.completed !== "boolean" || typeof item.visitedAt !== "number" || !Number.isFinite(item.visitedAt)) continue;
            entries[id] = item as ReadingRecord;
        }
        return entries;
    } catch { return {}; }
}
export function useReadingProgress() {
    const [records, setRecords] = useState<ReadingData>({}), [ready, setReady] = useState(false), [available, setAvailable] = useState(true);
    const latest = useRef<ReadingData>({});
    useEffect(() => {
        try { latest.current = parseReading(localStorage.getItem(key)); setRecords(latest.current); }
        catch { setAvailable(false); }
        setReady(true);
        const sync = (event: StorageEvent) => { if (event.key === key || event.key === null) { latest.current = parseReading(event.newValue); setRecords(latest.current); } };
        window.addEventListener("storage", sync);
        return () => window.removeEventListener("storage", sync);
    }, []);
    const remember = useCallback((id: string, seriesId: string, change: Partial<ReadingRecord> = {}) => {
        const previous = latest.current[id] as ReadingRecord | undefined;
        const next = { ...latest.current, [id]: { ...(previous?.seriesId === seriesId ? previous : { heading: "", headingText: "", completed: false }), ...change, seriesId, visitedAt: Date.now() } };
        latest.current = Object.fromEntries(Object.entries(next).sort((a, b) => b[1].visitedAt - a[1].visitedAt).slice(0, 500));
        setRecords(latest.current);
        try { localStorage.setItem(key, JSON.stringify({ version: 1, entries: latest.current })); }
        catch { setAvailable(false); }
    }, []);
    return { records, ready, available, remember };
}
