import { entries } from "@/lib/content";

export const dynamic = "force-dynamic";
export async function GET() {
    return Response.json({ entries: entries.filter(entry => entry.visibility !== "private"), ready: true }, {
        headers: { "Cache-Control": "no-store" },
    });
}
